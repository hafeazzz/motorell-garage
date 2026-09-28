import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvestorPayout, Unit, UnitInvestor } from "@/types/database";

/**
 * Investor's cut of one unit — MotorellOps' rule: share% of net PROFIT
 * (sale − purchase − unit expenses), and nothing on a loss ("motor rugi
 * tidak dipotong investor"). Mirrors the generated payout_amount column
 * in schema-phase3.sql, for previews before a payout row exists.
 */
export function investorCut(profit: number, sharePercentage: number): number {
  return Math.round((Math.max(profit, 0) * sharePercentage) / 100);
}

/** What the investor is handed back in total: their capital plus their profit share. */
export function investorTotalReturn(modalTotal: number, cut: number): number {
  return modalTotal + cut;
}

type UnitForPayout = Pick<Unit, "id" | "nama" | "plat" | "status" | "harga_jual" | "modal_beli">;

/**
 * Brings investor_payouts in line with a unit's current state. Safe to call
 * after any change that can move the numbers (sale, price edit, expense
 * added/removed, investor added/removed):
 *  - sold with a price: create/refresh one PENDING payout per investor.
 *    Payouts already marked paid are history and are never rewritten.
 *  - not sold (or sold status reverted): drop payouts that haven't been paid.
 * Never throws — a failure here (e.g. the phase-3 migration hasn't been
 * run yet, or the caller isn't owner/admin so RLS blocks the write) is
 * logged and must not block saving the unit itself.
 */
export async function syncInvestorPayouts(supabase: SupabaseClient, unitId: number): Promise<void> {
  try {
    const { data: unit } = await supabase
      .from("units")
      .select("id, nama, plat, status, harga_jual, modal_beli")
      .eq("id", unitId)
      .single<UnitForPayout>();
    if (!unit) return;

    if (unit.status !== "sold" || !unit.harga_jual) {
      await supabase.from("investor_payouts").delete().eq("unit_id", unitId).eq("status", "pending");
      return;
    }

    const [investorsRes, expensesRes, existingRes] = await Promise.all([
      supabase.from("unit_investors").select("*").eq("unit_id", unitId).returns<UnitInvestor[]>(),
      supabase.from("unit_expenses").select("nominal").eq("unit_id", unitId).returns<{ nominal: number }[]>(),
      supabase.from("investor_payouts").select("*").eq("unit_id", unitId).returns<InvestorPayout[]>(),
    ]);
    if (investorsRes.error) throw investorsRes.error;
    if (existingRes.error) throw existingRes.error;

    const investors = investorsRes.data ?? [];
    const existing = existingRes.data ?? [];
    const modalTotal = unit.modal_beli + (expensesRes.data ?? []).reduce((s, e) => s + e.nominal, 0);

    for (const inv of investors) {
      const fields = {
        unit_nama: unit.nama,
        unit_plat: unit.plat,
        share_percentage: inv.share_percentage,
        sale_price: unit.harga_jual,
        modal_total: modalTotal,
      };
      const row = existing.find((e) => e.investor_name === inv.investor_name);
      if (!row) {
        const { error } = await supabase
          .from("investor_payouts")
          .insert({ unit_id: unitId, investor_name: inv.investor_name, ...fields });
        if (error) throw error;
      } else if (row.status === "pending") {
        const { error } = await supabase.from("investor_payouts").update(fields).eq("id", row.id);
        if (error) throw error;
      }
    }

    // An investor removed after their payout was created: drop it if unpaid.
    const names = new Set(investors.map((i) => i.investor_name));
    const stale = existing.filter((e) => e.status === "pending" && !names.has(e.investor_name));
    if (stale.length) {
      await supabase.from("investor_payouts").delete().in("id", stale.map((s) => s.id));
    }
  } catch (err) {
    console.error("syncInvestorPayouts failed for unit", unitId, err);
  }
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rupiah, formatDateStr, formatMonthYear, periodKey } from "@/lib/utils";
import { unitTotalModal, unitProfit } from "@/types/database";
import type { Profile, Unit, UnitExpense } from "@/types/database";

export default async function LaporanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();
  const isAdmin = profile?.role === "admin";

  const now = new Date();
  const thisMonth = periodKey(now);

  const { data: soldUnits } = await supabase
    .from("units")
    .select("*")
    .eq("status", "sold")
    .returns<Unit[]>();

  // Filter to units sold in the current calendar month (older sold units
  // stay in `units` here in the scaffold — port the monthly-reset cron's
  // archive step, see src/app/api/cron/monthly-reset, once you're ready
  // to move past months out of the live table).
  const thisMonthSold = (soldUnits ?? []).filter((u) => u.tanggal_jual?.startsWith(thisMonth));

  const { data: expenses } = thisMonthSold.length
    ? await supabase
        .from("unit_expenses")
        .select("*")
        .in("unit_id", thisMonthSold.map((u) => u.id))
        .returns<UnitExpense[]>()
    : { data: [] as UnitExpense[] };

  const withProfit = thisMonthSold
    .map((u) => {
      const unitExpenses = (expenses ?? []).filter((e) => e.unit_id === u.id);
      return { unit: u, profit: unitProfit(u, unitExpenses), totalModal: unitTotalModal(u, unitExpenses) };
    })
    .sort((a, b) => (b.unit.tanggal_jual ?? "").localeCompare(a.unit.tanggal_jual ?? ""));

  const best = withProfit.length
    ? [...withProfit].sort((a, b) => (b.unit.harga_jual ?? 0) - (a.unit.harga_jual ?? 0))[0]
    : null;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Monthly Report</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatMonthYear(now)}</div>
      </div>

      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 24,
          padding: "22px 20px",
          marginBottom: 14,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800 }}>{thisMonthSold.length}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>units sold</div>
        {withProfit.map(({ unit, profit }) => (
          <div
            key={unit.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "9px 0",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            <span>
              {unit.nama} {unit.tahun}
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: 11.5 }}>
              {isAdmin ? `${Math.round((profit / (unit.harga_jual || 1)) * 100)}% profit` : ""}
            </span>
          </div>
        ))}
      </div>

      {isAdmin && best && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 20,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 10 }}>
            🏆 Best-selling unit this month
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
            {best.unit.nama} {best.unit.tahun}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Sale price</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{rupiah(best.unit.harga_jual ?? 0)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Gross profit</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-green)" }}>
                {rupiah(best.profit)}
              </div>
            </div>
          </div>
        </div>
      )}

      {thisMonthSold.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", margin: "18px 0 12px" }}>
            Sold unit records
          </div>
          {withProfit.map(({ unit }) => (
            <Link
              key={unit.id}
              href={`/keuangan/${unit.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "var(--card-bg)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, flex: "none", background: "var(--cream-blue-bg)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{unit.nama}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {unit.plat} · {unit.tahun}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--cream-blue-fg)", fontWeight: 700, marginTop: 3 }}>
                  Sold: {formatDateStr(unit.tanggal_jual)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
        Tap a sold unit to keep editing it — it opens the same Finance detail
        page. Month-to-month archiving runs from the monthly-reset cron job.
      </p>
    </div>
  );
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireInventoryAccess } from "@/lib/auth-utils";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { syncInvestorPayouts } from "@/lib/investors";
import { todayIso } from "@/lib/utils";
import type { UnitStatus } from "@/types/database";

/**
 * Returns the new unit id — the client opens its page.
 *
 * client_token is a UUID the client generates once per form mount. A
 * double submit (double-tap, slow network + client-side retry) resends
 * the same token, which trips the unique index on units.client_token
 * (23505) instead of inserting a second unit — that case is resolved by
 * looking the existing unit up by its token and returning its id.
 */
export async function createUnit(formData: FormData): Promise<number> {
  await requireInventoryAccess();
  const supabase = await createClient();
  const clientToken = String(formData.get("client_token") || "") || null;

  const { data, error } = await supabase
    .from("units")
    .insert({
      nama: String(formData.get("nama")),
      tahun: Number(formData.get("tahun")) || new Date().getFullYear(),
      odometer: String(formData.get("odometer") || ""),
      plat: String(formData.get("plat") || "-"),
      status: String(formData.get("status") || "progress") as UnitStatus,
      modal_beli: Number(formData.get("modal_beli")) || 0,
      tgl_masuk: String(formData.get("tgl_masuk") || todayIso()),
      client_token: clientToken,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && clientToken) {
      const { data: existing, error: lookupError } = await supabase
        .from("units")
        .select("id")
        .eq("client_token", clientToken)
        .single();
      if (lookupError) throw new Error(lookupError.message);
      return existing.id as number;
    }
    throw new Error(error.message);
  }
  return data.id as number;
}

export async function updateUnit(unitId: number, formData: FormData) {
  await requireInventoryAccess();
  const supabase = await createClient();
  const status = String(formData.get("status")) as UnitStatus;

  const update: Record<string, unknown> = {
    nama: String(formData.get("nama") || "").trim(),
    tahun: Number(formData.get("tahun")),
    odometer: String(formData.get("odometer") || ""),
    plat: String(formData.get("plat") || "").trim(),
    status,
    modal_beli: Number(formData.get("modal_beli")) || 0,
    harga_jual: formData.get("harga_jual") ? Number(formData.get("harga_jual")) : null,
    finance_code: String(formData.get("finance_code") || "") || null,
    updated_at: new Date().toISOString(),
  };

  // Only touch photo_url if the form actually included the field — the
  // hidden input always carries the current value (existing URL, freshly
  // uploaded one, or empty if cleared), so this never silently wipes a
  // photo that wasn't part of a particular submission.
  const photoUrl = formData.get("photo_url");
  if (photoUrl !== null) update.photo_url = String(photoUrl) || null;

  if (status === "booked") {
    update.booking_nominal = Number(formData.get("booking_nominal")) || 0;
  }
  if (status === "sold") {
    update.tanggal_jual = String(formData.get("tanggal_jual") || todayIso());
  }

  const { error } = await supabase.from("units").update(update).eq("id", unitId);
  if (error) throw new Error(error.message);

  // Sale (or a price/status change) can create, refresh or drop investor payouts.
  // Service role: a mechanic can edit the unit but RLS keeps payouts
  // owner/admin-only, and the payouts must still follow the sale.
  await syncInvestorPayouts(createServiceRoleClient(), unitId);



}

export async function deleteUnit(unitId: number) {
  await requireInventoryAccess();
  const supabase = await createClient();

  // unit_expenses.unit_id has `on delete cascade` (see supabase/schema.sql),
  // so its rows for this unit are removed automatically — no manual cleanup.
  const { error } = await supabase.from("units").delete().eq("id", unitId);
  if (error) throw new Error(error.message);
}

export async function addExpense(unitId: number, formData: FormData) {
  await requireInventoryAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("unit_expenses").insert({
    unit_id: unitId,
    keterangan: String(formData.get("keterangan")),
    nominal: Number(formData.get("nominal")) || 0,
    tanggal: todayIso(),
  });
  if (error) throw new Error(error.message);

  await syncInvestorPayouts(createServiceRoleClient(), unitId);
}

export async function deleteExpense(unitId: number, expenseId: number) {
  await requireInventoryAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("unit_expenses").delete().eq("id", expenseId);
  if (error) throw new Error(error.message);

  await syncInvestorPayouts(createServiceRoleClient(), unitId);
}

export async function addInvestor(unitId: number, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("investor_name") || "").trim();
  const share = Number(formData.get("share_percentage"));
  if (!name) throw new Error("Investor name is required.");
  if (!(share > 0 && share <= 100)) throw new Error("Share must be between 0 and 100%.");

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("unit_investors")
    .select("share_percentage")
    .eq("unit_id", unitId);
  if (readError) throw new Error(readError.message);
  const allocated = (current ?? []).reduce((s, i) => s + Number(i.share_percentage), 0);
  if (allocated + share > 100) {
    throw new Error(`Only ${100 - allocated}% is left to allocate on this unit.`);
  }

  const { error } = await supabase
    .from("unit_investors")
    .insert({ unit_id: unitId, investor_name: name, share_percentage: share });
  if (error) {
    throw new Error(error.code === "23505" ? `${name} is already an investor on this unit.` : error.message);
  }

  await syncInvestorPayouts(supabase, unitId);
}

export async function removeInvestor(unitId: number, investorId: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("unit_investors").delete().eq("id", investorId);
  if (error) throw new Error(error.message);

  await syncInvestorPayouts(supabase, unitId);
}

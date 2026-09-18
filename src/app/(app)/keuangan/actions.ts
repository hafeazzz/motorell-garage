"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/utils";
import type { UnitStatus } from "@/types/database";

export async function createUnit(formData: FormData) {
  const supabase = await createClient();
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
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/keuangan");
  redirect(`/keuangan/${data.id}`);
}

export async function updateUnit(unitId: number, formData: FormData) {
  const supabase = await createClient();
  const status = String(formData.get("status")) as UnitStatus;

  const update: Record<string, unknown> = {
    tahun: Number(formData.get("tahun")),
    odometer: String(formData.get("odometer") || ""),
    plat: String(formData.get("plat") || ""),
    status,
    harga_jual: formData.get("harga_jual") ? Number(formData.get("harga_jual")) : null,
    finance_code: String(formData.get("finance_code") || "") || null,
    updated_at: new Date().toISOString(),
  };

  if (status === "booked") {
    update.booking_nominal = Number(formData.get("booking_nominal")) || 0;
  }
  if (status === "sold") {
    update.tanggal_jual = String(formData.get("tanggal_jual") || todayIso());
  }

  const { error } = await supabase.from("units").update(update).eq("id", unitId);
  if (error) throw new Error(error.message);

  revalidatePath("/keuangan");
  revalidatePath(`/keuangan/${unitId}`);
  revalidatePath("/laporan");
  revalidatePath("/");

  if (status === "sold") {
    redirect("/laporan");
  }
}

export async function addExpense(unitId: number, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("unit_expenses").insert({
    unit_id: unitId,
    keterangan: String(formData.get("keterangan")),
    nominal: Number(formData.get("nominal")) || 0,
    tanggal: todayIso(),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/keuangan/${unitId}`);
}

export async function deleteExpense(unitId: number, expenseId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("unit_expenses").delete().eq("id", expenseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/keuangan/${unitId}`);
}

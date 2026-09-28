"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth-utils";
import { isKnownItem } from "@/lib/inspection";
import { jakartaDateIso } from "@/lib/utils";
import type { Inspection, InspectionItemStatus } from "@/types/database";

// Pre-purchase inspection, modelled on MotorellOps. Who can do what is
// enforced twice: here, and by RLS in schema-phase3.sql (inspector edits
// only while 'draft'; owner/admin decide).

export async function createInspection(formData: FormData) {
  const profile = await getCurrentProfile();
  const nama = String(formData.get("nama") || "").trim();
  if (nama.length < 3) throw new Error("Model name must be at least 3 characters.");

  const tahun = Number(formData.get("tahun")) || null;
  const hargaBeli = Number(formData.get("harga_beli")) || null;
  const plat = String(formData.get("plat") || "").trim() || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .insert({ inspector_id: profile.id, nama, tahun, plat, harga_beli: hargaBeli })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/inspeksi");
  redirect(`/inspeksi/${data.id}`);
}

/** Saves one checklist item (called on every tap — this is the draft autosave). */
export async function setItem(
  inspectionId: number,
  section: string,
  item: string,
  patch: { status?: InspectionItemStatus | null; photo_url?: string | null }
) {
  await getCurrentProfile();
  if (!isKnownItem(section, item)) throw new Error("Unknown checklist item.");

  const row: Record<string, unknown> = {
    inspection_id: inspectionId,
    section,
    item_name: item,
    checked_at: new Date().toISOString(),
  };
  // Only send the fields being changed so a status tap never wipes a photo.
  if ("status" in patch) row.status = patch.status ?? null;
  if ("photo_url" in patch) row.photo_url = patch.photo_url ?? null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("inspection_items")
    .upsert(row, { onConflict: "inspection_id,section,item_name" });
  if (error) throw new Error(error.message);
}

export async function saveNotes(inspectionId: number, notes: string) {
  await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("inspections")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", inspectionId);
  if (error) throw new Error(error.message);
}

export async function finishInspection(inspectionId: number) {
  await getCurrentProfile();
  const supabase = await createClient();

  const { count } = await supabase
    .from("inspection_items")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", inspectionId)
    .not("status", "is", null);
  if (!count) throw new Error("Check at least one item before finishing.");

  const { error } = await supabase
    .from("inspections")
    .update({ status: "selesai", updated_at: new Date().toISOString() })
    .eq("id", inspectionId)
    .eq("status", "draft");
  if (error) throw new Error(error.message);

  revalidatePath("/inspeksi");
  revalidatePath(`/inspeksi/${inspectionId}`);
}

/** Owner/admin only. "beli" creates the unit in Inventori and links it. */
export async function decideInspection(inspectionId: number, decision: "beli" | "tidak") {
  await requireAdmin();
  const supabase = await createClient();

  const { data: ins } = await supabase
    .from("inspections")
    .select("*")
    .eq("id", inspectionId)
    .single<Inspection>();
  if (!ins) throw new Error("Inspection not found.");
  if (ins.status === "beli" || ins.status === "tidak") throw new Error("Already decided.");

  let unitId: number | null = null;
  if (decision === "beli") {
    const today = jakartaDateIso(new Date());
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .insert({
        nama: ins.nama,
        tahun: ins.tahun ?? Number(today.slice(0, 4)),
        plat: ins.plat ?? "-",
        modal_beli: ins.harga_beli ?? 0,
        status: "progress",
        tgl_masuk: today,
      })
      .select("id")
      .single();
    if (unitError) throw new Error(unitError.message);
    unitId = unit.id;
  }

  const { error } = await supabase
    .from("inspections")
    .update({
      status: decision,
      unit_id: unitId,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);
  if (error) throw new Error(error.message);

  revalidatePath("/inspeksi");
  revalidatePath("/inventori");
  redirect(unitId ? `/inventori/${unitId}` : "/inspeksi");
}

export async function deleteInspection(inspectionId: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("inspections").delete().eq("id", inspectionId);
  if (error) throw new Error(error.message);

  revalidatePath("/inspeksi");
  redirect("/inspeksi");
}

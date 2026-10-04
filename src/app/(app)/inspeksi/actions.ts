"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentProfile, requireInspectionManager } from "@/lib/auth-utils";
import { isKnownItem } from "@/lib/inspection";
import { jakartaDateIso } from "@/lib/utils";
import { canAccessInventory, canManageInspections } from "@/types/database";
import type {
  Inspection,
  InspectionHistoryAction,
  InspectionItemStatus,
  Profile,
} from "@/types/database";

// Pre-purchase inspection, modelled on MotorellOps. Flow:
//   draft (inspector fills the checklist; everyone can watch live)
//   -> selesai (inspector finishes)
//   -> beli (price entered, unit created in Inventori) | tidak.
// The purchase price is asked only at the "beli" step, not up front.

/**
 * Append-only audit trail. Written with the service role because the table
 * has no client write policies (entries can't be forged from the browser).
 * A failed log write is reported but never blocks the action itself.
 */
async function logHistory(entry: {
  inspection: Pick<Inspection, "id" | "nama">;
  action: InspectionHistoryAction;
  actor: Pick<Profile, "id" | "name">;
  decidedAction?: "beli" | "tidak";
  notes?: string;
}) {
  const { error } = await createServiceRoleClient().from("inspection_history").insert({
    inspection_id: entry.inspection.id,
    inspection_nama: entry.inspection.nama,
    action: entry.action,
    decided_action: entry.decidedAction ?? null,
    actor_id: entry.actor.id,
    actor_name: entry.actor.name,
    notes: entry.notes ?? null,
  });
  if (error) console.error("inspection_history insert failed", error);
}

/**
 * RLS lets a plain account write only its OWN draft. Owner/admin/mechanic
 * may edit any inspection, so for them (already authorized by the caller)
 * the write goes through the service role.
 */
async function dbFor(profile: Profile) {
  return canManageInspections(profile) ? createServiceRoleClient() : await createClient();
}

export async function createInspection(formData: FormData) {
  const profile = await getCurrentProfile();
  const nama = String(formData.get("nama") || "").trim();
  if (nama.length < 3) throw new Error("Model name must be at least 3 characters.");

  const tahun = Number(formData.get("tahun")) || null;
  const plat = String(formData.get("plat") || "").trim() || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .insert({ inspector_id: profile.id, nama, tahun, plat })
    .select("id, nama")
    .single();
  if (error) throw new Error(error.message);

  await logHistory({ inspection: data, action: "created", actor: profile });
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
  const profile = await getCurrentProfile();
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

  const supabase = await dbFor(profile);
  const { error } = await supabase
    .from("inspection_items")
    .upsert(row, { onConflict: "inspection_id,section,item_name" });
  if (error) throw new Error(error.message);
}

export async function saveNotes(inspectionId: number, notes: string) {
  const profile = await getCurrentProfile();
  const supabase = await dbFor(profile);
  const { error } = await supabase
    .from("inspections")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", inspectionId);
  if (error) throw new Error(error.message);
}

/**
 * draft -> selesai. Deliberately does NOT revalidate this inspection's own
 * page: the checklist opens the decision modal right after this returns, and
 * a server re-render would swap the page to the read-only view and unmount it.
 */
export async function finishInspection(inspectionId: number) {
  const profile = await getCurrentProfile();
  const supabase = await dbFor(profile);

  const { count } = await supabase
    .from("inspection_items")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", inspectionId)
    .not("status", "is", null);
  if (!count) throw new Error("Check at least one item before finishing.");

  const { data: ins, error } = await supabase
    .from("inspections")
    .update({ status: "selesai", updated_at: new Date().toISOString() })
    .eq("id", inspectionId)
    .eq("status", "draft")
    .select("id, nama")
    .single();
  if (error || !ins) throw new Error("This inspection was already finished.");

  await logHistory({ inspection: ins, action: "completed", actor: profile });
  revalidatePath("/inspeksi");
}

export type DecisionResult = { decision: "beli" | "tidak"; unitId: number | null; redirectTo: string };

/**
 * The inspector (or an owner/admin) decides. "beli" needs the purchase price
 * and creates the unit in Inventori from the inspection's own name/year/plate.
 *
 * Units are owner/admin-write-only in RLS (Phase 2), so the insert runs with
 * the service role — but only after checking here that the caller is this
 * inspection's inspector or an owner/admin, and that it's finished and
 * undecided. The decision is claimed first with a conditional update, so a
 * double-click can't create two units.
 */
export async function decideInspection(
  inspectionId: number,
  decision: "beli" | "tidak",
  price?: number
): Promise<DecisionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: ins } = await supabase
    .from("inspections")
    .select("*")
    .eq("id", inspectionId)
    .single<Inspection>();
  if (!ins || ins.is_deleted) throw new Error("Inspection not found.");
  if (ins.inspector_id !== profile.id && !canManageInspections(profile)) {
    throw new Error("Only the inspector, an owner/admin or a mechanic can decide this.");
  }
  if (ins.status !== "selesai") throw new Error("Finish the inspection first, or it was already decided.");

  if (decision === "beli" && !(Number.isFinite(price) && (price as number) > 0)) {
    throw new Error("Harga dibeli harus lebih dari 0.");
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: claimed } = await admin
    .from("inspections")
    .update({
      status: decision,
      harga_beli: decision === "beli" ? price : null,
      decided_at: now,
      updated_at: now,
    })
    .eq("id", inspectionId)
    .eq("status", "selesai")
    .select("id");
  if (!claimed?.length) throw new Error("Already decided.");

  let unitId: number | null = null;
  if (decision === "beli") {
    const today = jakartaDateIso(new Date());
    const { data: unit, error: unitError } = await admin
      .from("units")
      .insert({
        nama: ins.nama,
        tahun: ins.tahun ?? Number(today.slice(0, 4)),
        plat: ins.plat ?? "-",
        modal_beli: price,
        status: "progress",
        tgl_masuk: today,
      })
      .select("id")
      .single();
    if (unitError || !unit) {
      // Undo the claim so it can be retried instead of being stuck "beli" with no unit.
      await admin
        .from("inspections")
        .update({ status: "selesai", harga_beli: null, decided_at: null })
        .eq("id", inspectionId);
      throw new Error(unitError?.message ?? "Couldn't create the unit.");
    }
    unitId = unit.id;
    await admin.from("inspections").update({ unit_id: unitId }).eq("id", inspectionId);
  }

  await logHistory({
    inspection: ins,
    action: "decided",
    actor: profile,
    decidedAction: decision,
    notes: decision === "beli" ? `Harga dibeli Rp ${Math.round(price as number).toLocaleString("id-ID")}` : undefined,
  });

  revalidatePath("/inspeksi");
  revalidatePath(`/inspeksi/${inspectionId}`);
  if (unitId) revalidatePath("/inventori");

  // Staff can't open Inventori (proxy.ts gates it to owner/admin/manager),
  // so they go back to the inspection list instead of a page that would bounce them.
  const redirectTo = unitId && canAccessInventory(profile) ? `/inventori/${unitId}` : "/inspeksi";
  return { decision, unitId, redirectTo };
}

/** Owner/admin/mechanic. Soft delete: the row and its history are kept. */
export async function deleteInspection(inspectionId: number) {
  const profile = await requireInspectionManager();
  // RLS only lets owner/admin touch other people's or finished inspections,
  // so after the check above this runs with the service role.
  const supabase = createServiceRoleClient();

  const { data: ins, error } = await supabase
    .from("inspections")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", inspectionId)
    .eq("is_deleted", false)
    .select("id, nama")
    .single();
  if (error || !ins) throw new Error("Inspection not found or already deleted.");

  await logHistory({ inspection: ins, action: "deleted", actor: profile });
  revalidatePath("/inspeksi");
  revalidatePath(`/inspeksi/${inspectionId}`);
}

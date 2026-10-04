import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth-utils";
import { INSPECTION_STATUS_LABEL, INSPECTION_STATUS_STYLE } from "@/lib/inspection";
import { Badge } from "@/components/ui/badge";
import { cn, rupiah } from "@/lib/utils";
import { canAccessInventory, canManageInspections, isAdminOrAbove } from "@/types/database";
import { InspeksiChecklist, type ItemState } from "./InspeksiChecklist";
import { InspectionSummary } from "./InspectionSummary";
import { InspectionHistory } from "./InspectionHistory";
import { DecideButton } from "./DecideButton";
import { DeleteInspectionButton } from "../DeleteInspectionButton";
import type { Inspection, InspectionItem } from "@/types/database";

type Row = Inspection & { profiles: { name: string } | null };

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const admin = isAdminOrAbove(profile);
  const manager = canManageInspections(profile);

  const { data: ins } = await supabase
    .from("inspections")
    .select("*, profiles(name)")
    .eq("id", Number(id))
    .single<Row>();
  // Deleted inspections are only visible to owner/admin (for the history).
  if (!ins || (ins.is_deleted && !admin)) notFound();

  const { data: itemRows } = await supabase
    .from("inspection_items")
    .select("*")
    .eq("inspection_id", ins.id)
    .returns<InspectionItem[]>();

  const items: Record<string, ItemState> = {};
  for (const r of itemRows ?? []) {
    items[`${r.section}:${r.item_name}`] = { status: r.status, photo_url: r.photo_url };
  }

  const isInspector = ins.inspector_id === profile.id;
  const active = !ins.is_deleted;
  // The inspector fills the checklist in; owner/admin/mechanic may also
  // open and edit any draft. Everyone else watches it update live.
  const editable = active && ins.status === "draft" && (isInspector || manager);
  const live = active && ins.status === "draft";
  const canDecide = active && ins.status === "selesai" && (isInspector || manager);
  const inspectorName = ins.profiles?.name ?? "Inspektur tidak dikenal";

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/inspeksi" className="pressable flex size-9 shrink-0 items-center justify-center rounded-xl bg-card">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{ins.nama}</div>
          <div className="truncate text-xs text-muted-foreground">
            {[ins.tahun, ins.plat].filter(Boolean).join(" · ") || "—"} · {inspectorName}
          </div>
        </div>
        <Badge className={cn("shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold", INSPECTION_STATUS_STYLE[ins.status])}>
          {ins.status === "beli" && ins.harga_beli ? `Beli · ${rupiah(ins.harga_beli)}` : INSPECTION_STATUS_LABEL[ins.status]}
        </Badge>
      </div>

      {ins.is_deleted && (
        <p className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Inspeksi ini sudah dihapus dan disembunyikan dari daftar. Riwayatnya tetap tersimpan di bawah.
        </p>
      )}

      {editable ? (
        <InspeksiChecklist inspectionId={ins.id} nama={ins.nama} initialItems={items} initialNotes={ins.notes ?? ""} />
      ) : (
        <>
          {live && (
            <p className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Sedang diisi oleh {inspectorName}. Tampilan ini diperbarui langsung saat item dicek.
            </p>
          )}

          <InspectionSummary inspectionId={ins.id} live={live} initialItems={items} initialNotes={ins.notes} />

          {ins.unit_id && canAccessInventory(profile) && (
            <Link href={`/inventori/${ins.unit_id}`} className="mt-4 block text-sm font-semibold text-primary underline">
              Buka unit di Inventori
            </Link>
          )}

          {canDecide && <DecideButton inspectionId={ins.id} nama={ins.nama} />}
        </>
      )}

      <InspectionHistory inspectionId={ins.id} />

      {manager && active && (
        <div className="mt-4 flex justify-center">
          <DeleteInspectionButton inspectionId={ins.id} nama={ins.nama} redirectTo="/inspeksi" />
        </div>
      )}
    </div>
  );
}

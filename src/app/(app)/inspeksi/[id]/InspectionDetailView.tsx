"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGarage } from "@/lib/store";
import { SkeletonBlock, SkeletonRows } from "@/components/Skeleton";
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


export function InspectionDetailView() {
  const { id } = useParams<{ id: string }>();
  const inspectionId = Number(id);
  const { data } = useGarage();
  const { profile } = data;
  const admin = isAdminOrAbove(profile);
  const manager = canManageInspections(profile);

  // The row comes from the store (instant). Only a deleted inspection — which
  // owner/admin can still open from its history — is fetched on its own.
  const fromStore = data.inspections.find((i) => i.id === inspectionId);
  const [fetched, setFetched] = useState<Inspection | null | undefined>(undefined);
  useEffect(() => {
    if (fromStore || !admin) return;
    createClient()
      .from("inspections")
      .select("*")
      .eq("id", inspectionId)
      .maybeSingle<Inspection>()
      .then(({ data: row }) => setFetched(row ?? null));
  }, [fromStore, admin, inspectionId]);
  const ins: Inspection | null | undefined = fromStore ?? fetched;

  // Checklist answers are per inspection, loaded when the page opens and
  // re-read whenever the status moves on (draft -> selesai -> decided).
  const [items, setItems] = useState<Record<string, ItemState> | null>(null);
  const status = ins?.status;
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("inspection_items")
      .select("*")
      .eq("inspection_id", inspectionId)
      .returns<InspectionItem[]>()
      .then(({ data: rows }) => {
        if (cancelled) return;
        const next: Record<string, ItemState> = {};
        for (const r of rows ?? []) next[`${r.section}:${r.item_name}`] = { status: r.status, photo_url: r.photo_url };
        setItems(next);
      });
    return () => {
      cancelled = true;
    };
  }, [inspectionId, status]);

  if (ins === null || (!ins && !admin) || (ins?.is_deleted && !admin)) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-muted-foreground">Inspeksi tidak ditemukan — mungkin sudah dihapus.</p>
        <Link href="/inspeksi" className="text-sm font-semibold text-primary underline">
          Kembali ke Inspeksi
        </Link>
      </div>
    );
  }
  if (!ins || !items) return <DetailSkeleton />;

  const isInspector = ins.inspector_id === profile.id;
  const active = !ins.is_deleted;
  // The inspector fills the checklist in; owner/admin/mechanic may also
  // open and edit any draft. Everyone else watches it update live.
  const editable = active && ins.status === "draft" && (isInspector || manager);
  const live = active && ins.status === "draft";
  const canDecide = active && ins.status === "selesai" && (isInspector || manager);
  const inspectorName = data.profiles.find((p) => p.id === ins.inspector_id)?.name ?? "Inspektur tidak dikenal";

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/inspeksi" className="pressable flex size-10 shrink-0 items-center justify-center rounded-xl bg-card">
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

      <InspectionHistory inspectionId={ins.id} version={`${ins.status}-${ins.is_deleted}`} />

      {manager && active && (
        <div className="mt-4 flex justify-center">
          <DeleteInspectionButton inspectionId={ins.id} nama={ins.nama} redirectTo="/inspeksi" />
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <SkeletonBlock height={44} style={{ borderRadius: 14, marginBottom: 16 }} />
      <SkeletonBlock height={120} style={{ borderRadius: 20, marginBottom: 14 }} />
      <SkeletonRows count={3} />
    </div>
  );
}

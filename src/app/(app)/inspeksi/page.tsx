"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useGarage } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INS_TOTAL, INSPECTION_STATUS_LABEL as STATUS_LABEL, INSPECTION_STATUS_STYLE as STATUS_STYLE } from "@/lib/inspection";
import { cn, formatDateStr, rupiah } from "@/lib/utils";
import { canManageInspections } from "@/types/database";
import { DeleteInspectionButton } from "./DeleteInspectionButton";

export default function InspeksiPage() {
  const { data } = useGarage();
  const admin = canManageInspections(data.profile);
  const nameOf = (id: string | null) => data.profiles.find((p) => p.id === id)?.name;
  const rows = data.inspections;

  return (
    <div>
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="mb-1 text-xl font-extrabold sm:text-[22px] md:text-2xl">Inspeksi</h1>
        <p className="text-sm text-muted-foreground">Cek motor sebelum dibeli — semua tim bisa memantau langsung</p>
      </div>

      <Button
        variant="outline"
        className="mb-3.5 w-full gap-2 rounded-2xl border-primary bg-secondary py-6 text-[13.5px] font-bold text-primary hover:bg-secondary/80 md:mb-5 md:w-auto"
        nativeButton={false}
          render={<Link href="/inspeksi/new" />}
      >
        <Plus className="size-4" />
        Inspeksi baru
      </Button>

      {rows.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">Belum ada inspeksi.</p>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 rounded-[18px] border border-border bg-card p-3.5 transition-colors hover:bg-secondary/40"
          >
            <Link href={`/inspeksi/${r.id}`} className="pressable flex min-w-0 flex-1 items-center gap-3.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{r.nama}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[r.tahun, r.plat].filter(Boolean).join(" · ") || "—"} · {nameOf(r.inspector_id) ?? "Tidak dikenal"}
                </div>
                <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {r.item_count}/{INS_TOTAL} item · {formatDateStr(r.created_at.slice(0, 10))}
                </div>
              </div>
              <Badge className={cn("shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold", STATUS_STYLE[r.status])}>
                {r.status === "beli" && r.harga_beli ? `${STATUS_LABEL.beli} · ${rupiah(r.harga_beli)}` : STATUS_LABEL[r.status]}
              </Badge>
            </Link>
            {admin && <DeleteInspectionButton inspectionId={r.id} nama={r.nama} iconOnly />}
          </div>
        ))}
      </div>
    </div>
  );
}

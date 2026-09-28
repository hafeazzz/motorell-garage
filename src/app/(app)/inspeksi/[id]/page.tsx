import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth-utils";
import {
  INSPEKSI_SECTIONS,
  INS_STATUS,
  INSPECTION_STATUS_LABEL,
  INSPECTION_STATUS_STYLE,
} from "@/lib/inspection";
import { Badge } from "@/components/ui/badge";
import { cn, rupiah } from "@/lib/utils";
import { isAdminOrAbove } from "@/types/database";
import { InspeksiChecklist, type ItemState } from "./InspeksiChecklist";
import { DecisionActions } from "./DecisionActions";
import type { Inspection, InspectionItem } from "@/types/database";

type Row = Inspection & { profiles: { name: string } | null };

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: ins } = await supabase
    .from("inspections")
    .select("*, profiles(name)")
    .eq("id", Number(id))
    .single<Row>();
  if (!ins) notFound();

  const { data: itemRows } = await supabase
    .from("inspection_items")
    .select("*")
    .eq("inspection_id", ins.id)
    .returns<InspectionItem[]>();

  const items: Record<string, ItemState> = {};
  for (const r of itemRows ?? []) {
    items[`${r.section}:${r.item_name}`] = { status: r.status, photo_url: r.photo_url };
  }

  const admin = isAdminOrAbove(profile);
  const editable = ins.status === "draft" && (ins.inspector_id === profile.id || admin);
  const finished = ins.status !== "draft";
  const counts = INS_STATUS.map((s) => ({
    ...s,
    n: Object.values(items).filter((i) => i.status === s.k).length,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/inspeksi" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{ins.nama}</div>
          <div className="truncate text-xs text-muted-foreground">
            {[ins.tahun, ins.plat, ins.harga_beli ? rupiah(ins.harga_beli) : null].filter(Boolean).join(" · ") || "—"} ·{" "}
            {ins.profiles?.name ?? "Unknown inspector"}
          </div>
        </div>
        <Badge className={cn("shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold", INSPECTION_STATUS_STYLE[ins.status])}>
          {INSPECTION_STATUS_LABEL[ins.status]}
        </Badge>
      </div>

      {editable ? (
        <InspeksiChecklist inspectionId={ins.id} initialItems={items} initialNotes={ins.notes ?? ""} />
      ) : (
        <>
          {!finished && (
            <p className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Still in progress by {ins.profiles?.name ?? "the inspector"}. Progress below updates as they go.
            </p>
          )}

          <div className="mb-4 grid grid-cols-3 gap-2">
            {counts.map((c) => (
              <div key={c.k} className="rounded-2xl border border-border bg-card p-3 text-center">
                <div className="text-2xl font-extrabold" style={{ color: c.c }}>
                  {c.n}
                </div>
                <div className="text-[11px] text-muted-foreground">{c.l}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {INSPEKSI_SECTIONS.map((sec) => (
              <div key={sec.key} className="rounded-2xl border border-border bg-card p-3.5">
                <div className="mb-2 text-sm font-bold">
                  {sec.key} · {sec.title}
                </div>
                <div className="space-y-1.5">
                  {sec.items.map((name) => {
                    const st = items[`${sec.key}:${name}`];
                    const meta = INS_STATUS.find((s) => s.k === st?.status);
                    return (
                      <div key={name} className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ background: meta?.c ?? "var(--muted-foreground)", opacity: meta ? 1 : 0.35 }}
                          />
                          {name}
                          {st?.photo_url && (
                            <a href={st.photo_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">
                              photo
                            </a>
                          )}
                        </span>
                        <span className="shrink-0 text-[11px] font-bold" style={{ color: meta?.c ?? "var(--muted-foreground)" }}>
                          {meta?.l ?? "not checked"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {ins.notes && (
            <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm break-words">{ins.notes}</p>
          )}

          {ins.unit_id && (
            <Link href={`/inventori/${ins.unit_id}`} className="mt-4 block text-sm font-semibold text-primary underline">
              Open the unit created from this inspection
            </Link>
          )}

          {admin && (
            <DecisionActions inspectionId={ins.id} nama={ins.nama} canDecide={ins.status === "selesai"} />
          )}
        </>
      )}
    </div>
  );
}

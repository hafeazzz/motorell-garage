"use client";

import { useEffect, useState } from "react";
import { useGarage } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { INSPEKSI_SECTIONS, INS_STATUS } from "@/lib/inspection";
import { cn } from "@/lib/utils";
import type { ItemState } from "./InspeksiChecklist";
import type { InspectionItem, InspectionItemStatus } from "@/types/database";

type ItemRow = { section: string; item_name: string; status: InspectionItemStatus | null; photo_url: string | null };

const keyOf = (section: string, item: string) => `${section}:${item}`;

/**
 * Read-only checklist. While the inspection is still a draft (`live`) it
 * subscribes to Supabase Realtime, so anyone watching sees items tick over
 * as the inspector taps them. Needs the tables in the supabase_realtime
 * publication (schema-phase3b.sql); Realtime applies the viewer's own RLS.
 */
export function InspectionSummary({
  inspectionId,
  live,
  initialItems,
  initialNotes,
}: {
  inspectionId: number;
  live: boolean;
  initialItems: Record<string, ItemState>;
  initialNotes: string | null;
}) {
  const { reload } = useGarage();
  const [items, setItems] = useState(initialItems);
  const [notes, setNotes] = useState(initialNotes);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!live) return;
    const supabase = createClient();

    // Full re-read on (re)connect: covers anything that changed between the
    // server render and the subscription, and anything missed while offline.
    async function resync() {
      const { data } = await supabase
        .from("inspection_items")
        .select("*")
        .eq("inspection_id", inspectionId)
        .returns<InspectionItem[]>();
      if (!data) return;
      const next: Record<string, ItemState> = {};
      for (const r of data) next[keyOf(r.section, r.item_name)] = { status: r.status, photo_url: r.photo_url };
      setItems(next);
    }

    const channel = supabase
      .channel(`inspection-${inspectionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inspection_items", filter: `inspection_id=eq.${inspectionId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return; // the app never deletes items
          const r = payload.new as ItemRow;
          setItems((p) => ({ ...p, [keyOf(r.section, r.item_name)]: { status: r.status, photo_url: r.photo_url } }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "inspections", filter: `id=eq.${inspectionId}` },
        (payload) => {
          const r = payload.new as { status: string; notes: string | null; is_deleted: boolean };
          setNotes(r.notes);
          // Finished, decided or deleted: refresh the store so the page
          // switches to the decision / read-only view.
          if (r.status !== "draft" || r.is_deleted) void reload(["inspections"]);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") resync();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inspectionId, live, reload]);

  const counts = INS_STATUS.map((s) => ({
    ...s,
    n: Object.values(items).filter((i) => i.status === s.k).length,
  }));
  const checked = counts.reduce((a, c) => a + c.n, 0);

  return (
    <div>
      {live && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("size-2 rounded-full", connected ? "animate-pulse bg-primary" : "bg-muted-foreground/40")} />
          {connected ? `Live — ${checked} item sudah dicek` : "Menyambungkan ke pembaruan langsung…"}
        </div>
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
                const st = items[keyOf(sec.key, name)];
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
                          foto
                        </a>
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold" style={{ color: meta?.c ?? "var(--muted-foreground)" }}>
                      {meta?.l ?? "belum dicek"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {notes && <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm break-words">{notes}</p>}
    </div>
  );
}

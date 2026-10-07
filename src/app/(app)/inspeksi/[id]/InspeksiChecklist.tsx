"use client";

import { useRef, useState, useTransition } from "react";
import { useGarage } from "@/lib/store";
import { toast } from "sonner";
import { Camera, ChevronDown } from "lucide-react";
import { setItem, saveNotes, finishInspection } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { INSPEKSI_SECTIONS, INS_STATUS, INS_TOTAL } from "@/lib/inspection";
import { Button } from "@/components/ui/button";
import { DecisionModal } from "./DecisionModal";
import { cn } from "@/lib/utils";
import type { InspectionItemStatus } from "@/types/database";

export type ItemState = { status: InspectionItemStatus | null; photo_url: string | null };

// Same bucket as unit photos (see EditUnitDialog) — inspection photos sit
// under an inspections/ prefix so there's no second bucket to create.
const PHOTO_BUCKET = "unit-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const keyOf = (section: string, item: string) => `${section}:${item}`;

export function InspeksiChecklist({
  inspectionId,
  nama,
  initialItems,
  initialNotes,
}: {
  inspectionId: number;
  nama: string;
  initialItems: Record<string, ItemState>;
  initialNotes: string;
}) {
  const { reload } = useGarage();
  const [items, setItems] = useState(initialItems);
  const [notes, setNotes] = useState(initialNotes);
  const [openSec, setOpenSec] = useState("A");
  const [uploading, setUploading] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);
  const photoFor = useRef<{ section: string; item: string } | null>(null);

  const checked = Object.values(items).filter((i) => i.status).length;
  const pct = Math.round((checked / INS_TOTAL) * 100);

  // Optimistic: update the UI immediately, save in the background (this is
  // the draft autosave), roll back with a toast if the save fails.
  async function save(
    section: string,
    item: string,
    patch: Partial<ItemState>
  ) {
    const k = keyOf(section, item);
    const prev = items[k] ?? { status: null, photo_url: null };
    setItems((p) => ({ ...p, [k]: { ...prev, ...patch } }));
    try {
      await setItem(inspectionId, section, item, patch);
    } catch (err) {
      setItems((p) => ({ ...p, [k]: prev }));
      toast.error(err instanceof Error ? err.message : "Couldn't save that item.");
    }
  }

  function tapStatus(section: string, item: string, status: InspectionItemStatus) {
    const cur = items[keyOf(section, item)]?.status;
    save(section, item, { status: cur === status ? null : status });
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = photoFor.current;
    e.target.value = "";
    if (!file || !target) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be 5MB or smaller.");
      return;
    }
    const k = keyOf(target.section, target.item);
    setUploading(k);
    try {
      const supabase = createClient();
      const path = `inspections/${inspectionId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      await save(target.section, target.item, { photo_url: data.publicUrl });
    } catch (err) {
      toast.error(err instanceof Error ? `Photo upload failed: ${err.message}` : "Photo upload failed.");
    } finally {
      setUploading(null);
    }
  }

  // Finish, then go straight into the Beli / Tidak decision. The page is not
  // re-rendered here (that would swap in the read-only view and unmount this
  // modal); it only refreshes if the modal is dismissed without deciding,
  // which leaves the inspection "Pending" with a Putuskan button.
  function finish() {
    startTransition(async () => {
      try {
        await saveNotes(inspectionId, notes);
        await finishInspection(inspectionId);
        setFinished(true);
        setDecisionOpen(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyelesaikan inspeksi.");
      }
    });
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>
            {checked} of {INS_TOTAL} items checked
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Every tap saves automatically — you can leave and come back.</p>
      </div>

      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />

      <div className="space-y-2">
        {INSPEKSI_SECTIONS.map((sec) => {
          const open = openSec === sec.key;
          const done = sec.items.filter((n) => items[keyOf(sec.key, n)]?.status).length;
          return (
            <div key={sec.key} className="overflow-hidden rounded-2xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setOpenSec(open ? "" : sec.key)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-bold">
                  {sec.key} · {sec.title}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {done}/{sec.items.length}
                  <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
                </span>
              </button>
              {open && (
                <div className="space-y-2 border-t border-border p-3">
                  {sec.items.map((name) => {
                    const st = items[keyOf(sec.key, name)];
                    return (
                      <div key={name} className="rounded-xl bg-secondary p-2.5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold">{name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="rounded-lg bg-card"
                            disabled={uploading === keyOf(sec.key, name)}
                            onClick={() => {
                              photoFor.current = { section: sec.key, item: name };
                              photoRef.current?.click();
                            }}
                            aria-label={`Photo for ${name}`}
                          >
                            <Camera className="size-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {INS_STATUS.map((s) => {
                            const active = st?.status === s.k;
                            return (
                              <button
                                key={s.k}
                                type="button"
                                onClick={() => tapStatus(sec.key, name, s.k)}
                                className={cn(
                                  "rounded-lg border px-1 py-2 text-[11px] font-bold transition-colors",
                                  active ? "text-black" : "border-border text-muted-foreground"
                                )}
                                style={active ? { background: s.c, borderColor: s.c } : undefined}
                              >
                                {s.l}
                              </button>
                            );
                          })}
                        </div>
                        {st?.photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={st.photo_url} alt={name} className="mt-2 h-20 w-20 rounded-lg object-cover" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <label htmlFor="notes" className="mb-1.5 block text-xs text-muted-foreground">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => saveNotes(inspectionId, notes).catch(() => toast.error("Couldn't save notes."))}
          rows={3}
          placeholder="Anything else worth knowing about this motor…"
          className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <Button className="mt-4 w-full" disabled={isPending || finished || checked === 0} onClick={finish}>
        {isPending ? "Menyimpan…" : "Selesai Inspeksi"}
      </Button>

      <DecisionModal
        inspectionId={inspectionId}
        nama={nama}
        open={decisionOpen}
        onOpenChange={(o) => {
          setDecisionOpen(o);
          if (!o && finished) void reload(["inspections"]);
        }}
      />
    </div>
  );
}

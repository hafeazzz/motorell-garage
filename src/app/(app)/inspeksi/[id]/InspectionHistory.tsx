import { createClient } from "@/lib/supabase/server";
import { HISTORY_ACTION_LABEL } from "@/lib/inspection";
import { formatDateTimeJakarta } from "@/lib/utils";
import type { InspectionHistoryEntry } from "@/types/database";

// Audit trail for one inspection. Rows are written only by server actions
// (service role); this just reads them. If the phase-3b migration hasn't
// been run the query fails and the section shows nothing rather than
// breaking the page.
export async function InspectionHistory({ inspectionId }: { inspectionId: number }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inspection_history")
    .select("*")
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: true })
    .returns<InspectionHistoryEntry[]>();
  const entries = data ?? [];
  if (entries.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 text-[13px] font-bold text-muted-foreground">Riwayat</div>
      <ol className="space-y-4 border-l-2 border-border pl-4">
        {entries.map((e) => (
          <li key={e.id} className="relative">
            <span
              className={`absolute top-1.5 -left-[21px] size-2 rounded-full ${
                e.action === "deleted" ? "bg-destructive" : e.decided_action === "beli" ? "bg-primary" : "bg-[#E7B183]"
              }`}
            />
            <p className="text-sm font-medium">
              {HISTORY_ACTION_LABEL[e.action]}
              {e.action === "decided" && e.decided_action ? `: ${e.decided_action === "beli" ? "Beli" : "Tidak dibeli"}` : ""}
            </p>
            {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
            <p className="text-xs text-muted-foreground">
              {e.actor_name ?? "Pengguna dihapus"} · {formatDateTimeJakarta(e.created_at)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

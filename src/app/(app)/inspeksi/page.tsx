import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INS_TOTAL, INSPECTION_STATUS_LABEL as STATUS_LABEL, INSPECTION_STATUS_STYLE as STATUS_STYLE } from "@/lib/inspection";
import { cn, formatDateStr } from "@/lib/utils";
import type { Inspection } from "@/types/database";

type Row = Inspection & { profiles: { name: string } | null; inspection_items: { count: number }[] };

export default async function InspeksiPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inspections")
    .select("*, profiles(name), inspection_items(count)")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Row[]>();
  const rows = data ?? [];

  return (
    <div>
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="mb-1 text-xl font-extrabold sm:text-[22px] md:text-2xl">Inspeksi</h1>
        <p className="text-sm text-muted-foreground">Check a motor before buying it</p>
      </div>

      <Button
        variant="outline"
        className="mb-3.5 w-full gap-2 rounded-2xl border-primary bg-secondary py-6 text-[13.5px] font-bold text-primary hover:bg-secondary/80 md:mb-5 md:w-auto"
        render={<Link href="/inspeksi/new" />}
      >
        <Plus className="size-4" />
        New inspection
      </Button>

      {rows.length === 0 && (
        <p className="py-5 text-center text-sm text-muted-foreground">No inspections yet.</p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/inspeksi/${r.id}`}
            className="flex items-center gap-3.5 rounded-[18px] border border-border bg-card p-3.5 transition-colors hover:bg-secondary/40"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{r.nama}</div>
              <div className="text-xs text-muted-foreground">
                {[r.tahun, r.plat].filter(Boolean).join(" · ") || "—"} · {r.profiles?.name ?? "Unknown"}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                {r.inspection_items[0]?.count ?? 0}/{INS_TOTAL} items · {formatDateStr(r.created_at.slice(0, 10))}
              </div>
            </div>
            <Badge className={cn("shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold", STATUS_STYLE[r.status])}>
              {STATUS_LABEL[r.status]}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

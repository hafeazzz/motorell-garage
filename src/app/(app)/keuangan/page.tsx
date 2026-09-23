import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Unit, UnitStatus } from "@/types/database";

const STATUS_LABEL: Record<UnitStatus, string> = {
  progress: "In Progress",
  ready: "Ready",
  booked: "Booked",
  sold: "Sold",
};
// Pastel status gradients predate shadcn and don't map onto its semantic
// palette (primary/secondary/destructive) — kept as the same CSS custom
// properties, applied via Tailwind's arbitrary-value syntax.
const STATUS_BG: Record<UnitStatus, string> = {
  progress: "bg-[image:var(--cream-orange-bg)]",
  ready: "bg-[image:var(--cream-green-bg)]",
  booked: "bg-[image:var(--cream-purple-bg)]",
  sold: "bg-[image:var(--cream-blue-bg)]",
};
const STATUS_FG: Record<UnitStatus, string> = {
  progress: "text-[var(--cream-orange-fg)]",
  ready: "text-[var(--cream-green-fg)]",
  booked: "text-[var(--cream-purple-fg)]",
  sold: "text-[var(--cream-blue-fg)]",
};

// Only what this list view renders — trims the row payload versus select("*"),
// which also pulled odometer/finance_code/booking_nominal/photo_url/timestamps
// that never reach the page.
type KeuanganUnit = Pick<Unit, "id" | "nama" | "tahun" | "plat" | "status" | "harga_jual" | "tgl_masuk">;

export default async function KeuanganPage() {
  const supabase = await createClient();
  const { data: units } = await supabase
    .from("units")
    .select("id, nama, tahun, plat, status, harga_jual, tgl_masuk")
    .neq("status", "sold")
    .order("tgl_masuk", { ascending: false })
    .limit(200)
    .returns<KeuanganUnit[]>();

  const list = units ?? [];
  const ready = list.filter((u) => u.status === "ready").length;
  const progress = list.filter((u) => u.status === "progress").length;
  const booked = list.filter((u) => u.status === "booked").length;

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <h1 className="mb-1 text-xl font-extrabold md:text-2xl">Finance</h1>
        <p className="text-sm text-muted-foreground">
          {ready} ready · {progress} in progress · {booked} booked
        </p>
      </div>

      <Button
        variant="outline"
        className="mb-3.5 w-full gap-2 rounded-2xl border-primary bg-secondary py-6 text-[13.5px] font-bold text-primary hover:bg-secondary/80 md:mb-5 md:w-auto"
        render={<Link href="/keuangan/new" />}
      >
        <Plus className="size-4" />
        Add unit
      </Button>

      {list.length === 0 && (
        <p className="py-5 text-center text-sm text-muted-foreground">
          No units yet — add the first one above.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {list.map((unit) => (
          <Link
            key={unit.id}
            href={`/keuangan/${unit.id}`}
            prefetch
            className="flex items-center gap-3.5 rounded-[18px] border border-border bg-card p-3.5 transition-colors hover:bg-secondary/40"
          >
            <div className={cn("size-[52px] shrink-0 rounded-[14px]", STATUS_BG[unit.status])} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{unit.nama}</div>
              <div className="text-xs text-muted-foreground">
                {unit.plat} · {unit.tahun}
              </div>
              {unit.harga_jual && (
                <div className="mt-0.5 text-[11.5px] font-bold text-[var(--cream-green-fg)]">
                  Target: Rp {unit.harga_jual.toLocaleString("id-ID")}
                </div>
              )}
            </div>
            <Badge className={cn("shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold", STATUS_BG[unit.status], STATUS_FG[unit.status])}>
              {STATUS_LABEL[unit.status]}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

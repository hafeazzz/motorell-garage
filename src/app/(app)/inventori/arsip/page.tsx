"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGarage } from "@/lib/store";
import { INSPECTION_STATUS_LABEL, INSPECTION_STATUS_STYLE } from "@/lib/inspection";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateStr, formatPeriodLabel, rupiah } from "@/lib/utils";
import { isAdminOrAbove, unitProfit } from "@/types/database";
import type { SoldArchiveRow } from "@/types/database";

type ArchivedSale = Pick<
  SoldArchiveRow,
  "id" | "nama" | "tahun" | "plat" | "harga_jual" | "modal_beli" | "total_expenses" | "tanggal_jual" | "period"
>;

// One row in the Terjual tab, from either a live unit or the monthly archive.
type SaleRow = {
  key: string;
  nama: string;
  tahun: number | null;
  plat: string | null;
  harga_jual: number;
  profit: number;
  tanggal_jual: string | null;
  href: string | null; // archived rows have no unit page any more
};

export default function ArsipPage() {
  const { data } = useGarage();
  const [tab, setTab] = useState<"terjual" | "inspeksi">("terjual");
  const admin = isAdminOrAbove(data.profile);
  const nameOf = (id: string | null) => data.profiles.find((p) => p.id === id)?.name;

  // Past months moved out by the monthly cron — owner/admin-only in RLS,
  // fetched once when this page opens.
  const [archived, setArchived] = useState<ArchivedSale[]>([]);
  useEffect(() => {
    if (!admin) return;
    createClient()
      .from("sold_archive")
      .select("id, nama, tahun, plat, harga_jual, modal_beli, total_expenses, tanggal_jual, period")
      .order("tanggal_jual", { ascending: false })
      .limit(300)
      .returns<ArchivedSale[]>()
      .then(({ data: rows }) => setArchived(rows ?? []));
  }, [admin]);

  const live = data.units.filter((u) => u.status === "sold");
  const sales: SaleRow[] = [
    ...live.map((u) => ({
      key: `u${u.id}`,
      nama: u.nama,
      tahun: u.tahun,
      plat: u.plat,
      harga_jual: u.harga_jual ?? 0,
      profit: unitProfit(u, data.expenses.filter((e) => e.unit_id === u.id)),
      tanggal_jual: u.tanggal_jual,
      href: `/inventori/${u.id}`,
    })),
    ...archived.map((a) => ({
      key: `a${a.id}`,
      nama: a.nama,
      tahun: a.tahun,
      plat: a.plat,
      harga_jual: a.harga_jual ?? 0,
      profit: (a.harga_jual ?? 0) - (a.modal_beli ?? 0) - (a.total_expenses ?? 0),
      tanggal_jual: a.tanggal_jual,
      href: null,
    })),
  ].sort((a, b) => (b.tanggal_jual ?? "").localeCompare(a.tanggal_jual ?? ""));

  const inspections = data.inspections
    .filter((r) => r.status === "beli" || r.status === "tidak")
    .sort((a, b) => (b.decided_at ?? "").localeCompare(a.decided_at ?? ""));

  // Group sold rows by month (newest first) so a long history stays readable.
  const byMonth = new Map<string, SaleRow[]>();
  for (const s of sales) {
    const key = s.tanggal_jual?.slice(0, 7) ?? "unknown";
    byMonth.set(key, [...(byMonth.get(key) ?? []), s]);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 sm:mb-5">
        <Link href="/inventori" className="pressable flex size-9 shrink-0 items-center justify-center rounded-xl bg-card">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold sm:text-[22px]">Arsip</h1>
          <p className="text-xs text-muted-foreground">Motor yang sudah terjual dan yang sudah diinspeksi</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5">
        {[
          { key: "terjual", label: "Terjual" },
          { key: "inspeksi", label: "Sudah diinspeksi" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as "terjual" | "inspeksi")}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold",
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "terjual" ? (
        <>
          {sales.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">Belum ada motor terjual.</p>}

          {[...byMonth.entries()].map(([month, rows]) => (
            <div key={month} className="mb-4">
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-[13px] font-bold text-muted-foreground">
                  {month === "unknown" ? "Tanggal tidak diketahui" : formatPeriodLabel(month)}
                </div>
                <div className="text-[11px] text-muted-foreground">{rows.length} unit</div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {rows.map((r) => {
                  const body = (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{r.nama}</div>
                        <div className="text-xs text-muted-foreground">
                          {[r.plat, r.tahun].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                          Terjual {formatDateStr(r.tanggal_jual)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold">{rupiah(r.harga_jual)}</div>
                        <div className={cn("text-[11.5px] font-semibold", r.profit < 0 ? "text-destructive" : "text-primary")}>
                          Profit {rupiah(r.profit)}
                        </div>
                      </div>
                    </>
                  );
                  const cls = "flex items-center gap-3 rounded-[18px] border border-border bg-card p-3.5";
                  return r.href ? (
                    <Link key={r.key} href={r.href} className={cn(cls, "transition-colors hover:bg-secondary/40")}>
                      {body}
                    </Link>
                  ) : (
                    <div key={r.key} className={cls}>
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!admin && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Arsip bulan-bulan lalu hanya terlihat oleh owner/admin.
            </p>
          )}
        </>
      ) : (
        <>
          {inspections.length === 0 && (
            <p className="py-5 text-center text-sm text-muted-foreground">Belum ada inspeksi yang diputuskan.</p>
          )}
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {inspections.map((r) => (
              <Link
                key={r.id}
                href={`/inspeksi/${r.id}`}
                className="pressable flex items-center gap-3 rounded-[18px] border border-border bg-card p-3.5 hover:bg-secondary/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{r.nama}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[r.plat, r.tahun].filter(Boolean).join(" · ") || "—"} · {nameOf(r.inspector_id) ?? "Tidak dikenal"}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    Diputuskan {r.decided_at ? formatDateStr(r.decided_at.slice(0, 10)) : "—"}
                  </div>
                </div>
                <Badge className={cn("shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold", INSPECTION_STATUS_STYLE[r.status])}>
                  {r.status === "beli" && r.harga_beli ? `${INSPECTION_STATUS_LABEL.beli} · ${rupiah(r.harga_beli)}` : INSPECTION_STATUS_LABEL[r.status]}
                </Badge>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

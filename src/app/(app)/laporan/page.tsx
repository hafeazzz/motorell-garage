"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGarage } from "@/lib/store";
import { rupiah, formatDateStr, formatPeriodLabel, jakartaDateIso, jakartaPeriodKey } from "@/lib/utils";
import { monthToDateCashflow } from "@/lib/finance";
import { CashflowChartLazy } from "./CashflowChartLazy";
import { unitTotalModal, unitProfit, isAdminOrAbove, isOwner } from "@/types/database";

export default function LaporanPage() {
  const router = useRouter();
  const { data } = useGarage();
  const { profile, units, expenses } = data;
  // proxy.ts gates /laporan to owner/admin; this is the client-side backstop.
  const allowed = isAdminOrAbove(profile);
  useEffect(() => {
    if (!allowed) router.replace("/");
  }, [allowed, router]);
  const canSeeProfit = true;

  // Month boundaries in WIB, whatever the device clock zone.
  const now = new Date();
  const thisMonth = jakartaPeriodKey(now);
  const today = jakartaDateIso(now);
  const monthStart = `${thisMonth}-01`;

  const thisMonthSold = units.filter((u) => u.status === "sold" && u.tanggal_jual?.startsWith(thisMonth));

  // Cashflow: sales this month in; units bought this month and every
  // expense logged this month out.
  const cashflow = monthToDateCashflow({
    monthStart,
    today,
    sales: thisMonthSold.map((u) => ({ date: u.tanggal_jual!, amount: u.harga_jual ?? 0 })),
    purchases: units.filter((u) => u.tgl_masuk >= monthStart).map((u) => ({ date: u.tgl_masuk, amount: u.modal_beli })),
    expenses: expenses.filter((e) => e.tanggal >= monthStart).map((e) => ({ date: e.tanggal, amount: e.nominal })),
  });
  const cashIn = cashflow.at(-1)?.in ?? 0;
  const cashOut = cashflow.at(-1)?.out ?? 0;

  const withProfit = thisMonthSold
    .map((u) => {
      const unitExpenses = expenses.filter((e) => e.unit_id === u.id);
      return { unit: u, profit: unitProfit(u, unitExpenses), totalModal: unitTotalModal(u, unitExpenses) };
    })
    .sort((a, b) => (b.unit.tanggal_jual ?? "").localeCompare(a.unit.tanggal_jual ?? ""));

  const best = withProfit.length
    ? [...withProfit].sort((a, b) => (b.unit.harga_jual ?? 0) - (a.unit.harga_jual ?? 0))[0]
    : null;

  if (!allowed) return null;

  return (
    <div>
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="mb-1 text-xl font-extrabold sm:text-[22px] md:text-2xl">Monthly Report</h1>
        <p className="text-sm text-muted-foreground">{formatPeriodLabel(thisMonth)}</p>
      </div>

      <div className="mb-3.5 rounded-3xl border border-border bg-card px-5 py-5 text-center sm:px-6 sm:py-6 md:mb-5">
        <div className="text-4xl font-extrabold">{thisMonthSold.length}</div>
        <div className="mb-4 text-xs text-muted-foreground">units sold</div>
        {withProfit.map(({ unit, profit }) => (
          <div key={unit.id} className="flex justify-between border-t border-border py-2.5 text-left text-[13px]">
            <span>
              {unit.nama} {unit.tahun}
            </span>
            <span className="text-[11.5px] text-muted-foreground">
              {canSeeProfit ? `${Math.round((profit / (unit.harga_jual || 1)) * 100)}% profit` : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {canSeeProfit && best && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2.5 text-[12.5px] text-muted-foreground">🏆 Best-selling unit this month</div>
            <div className="mb-4.5 text-lg font-extrabold">
              {best.unit.nama} {best.unit.tahun}
            </div>
            <div className="flex justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Sale price</div>
                <div className="text-base font-extrabold">{rupiah(best.unit.harga_jual ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Gross profit</div>
                <div className="text-base font-extrabold text-primary">{rupiah(best.profit)}</div>
              </div>
            </div>
          </div>
        )}

        {thisMonthSold.length > 0 && (
          <div className={canSeeProfit && best ? "" : "lg:col-span-2"}>
            <div className="mt-4.5 mb-3 text-[13px] font-bold text-muted-foreground lg:mt-0">
              Sold unit records
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {withProfit.map(({ unit }) => (
                <Link
                  key={unit.id}
                  href={`/inventori/${unit.id}`}
                  prefetch
                  className="pressable flex items-center gap-3.5 rounded-[18px] border border-border bg-card p-3.5 hover:bg-secondary/40"
                >
                  <div className="size-[52px] shrink-0 rounded-[14px] bg-[image:var(--cream-blue-bg)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{unit.nama}</div>
                    <div className="text-xs text-muted-foreground">
                      {unit.plat} · {unit.tahun}
                    </div>
                    <div className="mt-0.5 text-[11.5px] font-bold text-[var(--cream-blue-fg)]">
                      Sold: {formatDateStr(unit.tanggal_jual)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3.5 rounded-2xl border border-border bg-card p-4 md:mt-5">
        <div className="mb-1 text-[13px] font-bold">Cashflow</div>
        <div className="mb-3 text-[11px] text-muted-foreground">
          Month to date · cumulative cash in vs out (actuals, not a forecast)
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-extrabold text-primary">{rupiah(cashIn)}</div>
            <div className="text-[11px] text-muted-foreground">In</div>
          </div>
          <div>
            <div className="text-sm font-extrabold text-[#E7B183]">{rupiah(cashOut)}</div>
            <div className="text-[11px] text-muted-foreground">Out</div>
          </div>
          <div>
            <div className={`text-sm font-extrabold ${cashIn - cashOut < 0 ? "text-destructive" : ""}`}>
              {rupiah(cashIn - cashOut)}
            </div>
            <div className="text-[11px] text-muted-foreground">Net</div>
          </div>
        </div>
        <CashflowChartLazy cashflow={cashflow} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          In = sale prices. Out = purchase costs (on the day a unit came in) plus unit expenses.
        </p>
      </div>

      {isOwner(profile) && (
        <Link href="/finance/investor-payouts" className="mt-3.5 block text-center text-xs font-semibold text-primary underline">
          Investor payouts
        </Link>
      )}

      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Tap a sold unit to keep editing it — it opens the same Inventori detail
        page. Month-to-month archiving runs from the monthly-reset cron job.
      </p>
    </div>
  );
}

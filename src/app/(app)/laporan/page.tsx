import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/session";
import { rupiah, formatDateStr, formatPeriodLabel, jakartaDateIso, jakartaPeriodKey } from "@/lib/utils";
import { monthToDateCashflow } from "@/lib/finance";
import { CashflowChartLazy } from "./CashflowChartLazy";
import { unitTotalModal, unitProfit, isAdminOrAbove, isOwner } from "@/types/database";
import type { Profile, Unit, UnitExpense } from "@/types/database";

// Narrowed row shapes — only the fields this page actually reads out of
// each table (see the select() calls below for why).
type LaporanProfile = Pick<Profile, "role" | "is_owner">;
type LaporanUnit = Pick<Unit, "id" | "nama" | "tahun" | "plat" | "harga_jual" | "modal_beli" | "tanggal_jual">;
type LaporanExpense = Pick<UnitExpense, "unit_id" | "nominal">;

export default async function LaporanPage() {
  const supabase = await createClient();

  // Profile is the layout's per-request cached copy; the sold-units query
  // runs alongside it.
  const [profile, { data: soldUnits }] = await Promise.all([
    getMyProfile() as Promise<LaporanProfile | null>,
    supabase
      .from("units")
      .select("id, nama, tahun, plat, harga_jual, modal_beli, tanggal_jual")
      .eq("status", "sold")
      .order("tanggal_jual", { ascending: false })
      .limit(200)
      .returns<LaporanUnit[]>(),
  ]);
  // proxy.ts already gates /laporan to owner/admin; this is the server-side backstop.
  if (!profile || !isAdminOrAbove(profile)) redirect("/");
  const canSeeProfit = true;

  // Month boundaries in WIB — the server runs in UTC, which would flip the
  // month 7 hours early.
  const now = new Date();
  const thisMonth = jakartaPeriodKey(now);
  const today = jakartaDateIso(now);
  const monthStart = `${thisMonth}-01`;

  // Filter to units sold in the current calendar month (older sold units
  // stay in `units` here in the scaffold — port the monthly-reset cron's
  // archive step, see src/app/api/cron/monthly-reset, once you're ready
  // to move past months out of the live table).
  const thisMonthSold = (soldUnits ?? []).filter((u) => u.tanggal_jual?.startsWith(thisMonth));

  const { data: expenses } = thisMonthSold.length
    ? await supabase
        .from("unit_expenses")
        .select("unit_id, nominal")
        .in("unit_id", thisMonthSold.map((u) => u.id))
        .returns<LaporanExpense[]>()
    : { data: [] as LaporanExpense[] };

  // Cashflow inputs: units bought this month (cash out) and every expense
  // logged this month, including on units not sold yet.
  const [{ data: purchases }, { data: monthExpenses }] = await Promise.all([
    supabase
      .from("units")
      .select("modal_beli, tgl_masuk")
      .gte("tgl_masuk", monthStart)
      .limit(500)
      .returns<{ modal_beli: number; tgl_masuk: string }[]>(),
    supabase
      .from("unit_expenses")
      .select("nominal, tanggal")
      .gte("tanggal", monthStart)
      .limit(1000)
      .returns<{ nominal: number; tanggal: string }[]>(),
  ]);
  const cashflow = monthToDateCashflow({
    monthStart,
    today,
    sales: thisMonthSold.map((u) => ({ date: u.tanggal_jual!, amount: u.harga_jual ?? 0 })),
    purchases: (purchases ?? []).map((p) => ({ date: p.tgl_masuk, amount: p.modal_beli })),
    expenses: (monthExpenses ?? []).map((e) => ({ date: e.tanggal, amount: e.nominal })),
  });
  const cashIn = cashflow.at(-1)?.in ?? 0;
  const cashOut = cashflow.at(-1)?.out ?? 0;

  const withProfit = thisMonthSold
    .map((u) => {
      const unitExpenses = (expenses ?? []).filter((e) => e.unit_id === u.id);
      return { unit: u, profit: unitProfit(u, unitExpenses), totalModal: unitTotalModal(u, unitExpenses) };
    })
    .sort((a, b) => (b.unit.tanggal_jual ?? "").localeCompare(a.unit.tanggal_jual ?? ""));

  const best = withProfit.length
    ? [...withProfit].sort((a, b) => (b.unit.harga_jual ?? 0) - (a.unit.harga_jual ?? 0))[0]
    : null;

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

      {profile && isOwner(profile) && (
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

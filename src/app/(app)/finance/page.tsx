import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinanceChartsLazy } from "./FinanceChartsLazy";
import { canAccessFinancials, isAdminOrAbove, isOwner } from "@/types/database";
import {
  monthToDateCashflow,
  previousPeriod,
  shiftIsoDate,
  summarizePL,
  topSlices,
  type PLInput,
  type PLSummary,
} from "@/lib/finance";
import { cn, formatDateStr, formatPeriodLabel, jakartaDateIso, jakartaPeriodKey, rupiah } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Profile, SoldArchiveRow, Unit } from "@/types/database";

type SoldUnit = Pick<Unit, "id" | "nama" | "harga_jual" | "modal_beli" | "tanggal_jual">;
type Purchase = Pick<Unit, "modal_beli" | "tgl_masuk">;
type ExpenseItem = {
  id: number;
  unit_id: number;
  keterangan: string;
  nominal: number;
  tanggal: string;
  units: { nama: string } | null;
};
type ArchiveRow = Pick<SoldArchiveRow, "modal_beli" | "harga_jual" | "total_expenses">;

const RANGES = [
  { key: "month", label: "This month" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
] as const;

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range)?.key ?? "month";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_owner")
    .eq("id", user!.id)
    .single<Pick<Profile, "role" | "is_owner">>();
  // proxy.ts already gates /finance; this is the server-side backstop.
  if (!profile || !canAccessFinancials(profile)) redirect("/");
  const admin = isAdminOrAbove(profile);
  const owner = isOwner(profile);

  // Month boundaries in WIB — the server runs in UTC, which would flip the
  // month 7 hours early.
  const now = new Date();
  const today = jakartaDateIso(now);
  const period = jakartaPeriodKey(now);
  const lastPeriod = previousPeriod(period);
  const monthStart = `${period}-01`;
  const rangeFrom = range === "30d" ? shiftIsoDate(today, -29) : range === "90d" ? shiftIsoDate(today, -89) : monthStart;
  const expenseSince = rangeFrom < monthStart ? rangeFrom : monthStart;

  const [soldRes, purchasesRes, expenseItemsRes, archiveRes, targetRes, payoutsRes] = await Promise.all([
    supabase
      .from("units")
      .select("id, nama, harga_jual, modal_beli, tanggal_jual")
      .eq("status", "sold")
      .gte("tanggal_jual", `${lastPeriod}-01`)
      .limit(500)
      .returns<SoldUnit[]>(),
    supabase
      .from("units")
      .select("modal_beli, tgl_masuk")
      .gte("tgl_masuk", monthStart)
      .limit(500)
      .returns<Purchase[]>(),
    supabase
      .from("unit_expenses")
      .select("id, unit_id, keterangan, nominal, tanggal, units(nama)")
      .gte("tanggal", expenseSince)
      .order("tanggal", { ascending: false })
      .limit(500)
      .returns<ExpenseItem[]>(),
    // sold_archive is readable by owner/admin only (RLS), so last month's
    // archived units are only available to them.
    admin
      ? supabase
          .from("sold_archive")
          .select("modal_beli, harga_jual, total_expenses")
          .eq("period", lastPeriod)
          .returns<ArchiveRow[]>()
      : Promise.resolve({ data: [] as ArchiveRow[] }),
    supabase.from("settings").select("value").eq("key", "monthly_target").single(),
    owner
      ? supabase.from("investor_payouts").select("payout_amount").eq("status", "pending").returns<{ payout_amount: number }[]>()
      : Promise.resolve({ data: null }),
  ]);

  const sold = soldRes.data ?? [];
  const purchases = purchasesRes.data ?? [];
  const expenseItems = expenseItemsRes.data ?? [];

  // Expenses per sold unit (for P&L). Sold units' line items are still in
  // unit_expenses until the monthly cron archives them.
  const soldIds = new Set(sold.map((u) => u.id));
  const expensesByUnit = new Map<number, number>();
  const soldExpenseRes = soldIds.size
    ? await supabase.from("unit_expenses").select("unit_id, nominal").in("unit_id", [...soldIds]).returns<{ unit_id: number; nominal: number }[]>()
    : { data: [] as { unit_id: number; nominal: number }[] };
  for (const e of soldExpenseRes.data ?? []) {
    expensesByUnit.set(e.unit_id, (expensesByUnit.get(e.unit_id) ?? 0) + e.nominal);
  }
  const toPL = (u: SoldUnit): PLInput => ({
    harga_jual: u.harga_jual ?? 0,
    modal_beli: u.modal_beli,
    expenses: expensesByUnit.get(u.id) ?? 0,
  });

  const thisMonth = summarizePL(sold.filter((u) => u.tanggal_jual?.startsWith(period)).map(toPL));
  // Last month = units the cron hasn't archived yet + the archive itself.
  const lastMonth = summarizePL([
    ...sold.filter((u) => u.tanggal_jual?.startsWith(lastPeriod)).map(toPL),
    ...(archiveRes.data ?? []).map((a) => ({
      harga_jual: a.harga_jual ?? 0,
      modal_beli: a.modal_beli ?? 0,
      expenses: a.total_expenses ?? 0,
    })),
  ]);

  const cashflow = monthToDateCashflow({
    monthStart,
    today,
    sales: sold.filter((u) => u.tanggal_jual?.startsWith(period)).map((u) => ({ date: u.tanggal_jual!, amount: u.harga_jual ?? 0 })),
    purchases: purchases.map((p) => ({ date: p.tgl_masuk, amount: p.modal_beli })),
    expenses: expenseItems.filter((e) => e.tanggal >= monthStart && e.tanggal <= today).map((e) => ({ date: e.tanggal, amount: e.nominal })),
  });

  const rangeExpenses = expenseItems.filter((e) => e.tanggal >= rangeFrom && e.tanggal <= today);
  const byUnit = new Map<string, number>();
  for (const e of rangeExpenses) {
    const name = e.units?.nama ?? "Unknown unit";
    byUnit.set(name, (byUnit.get(name) ?? 0) + e.nominal);
  }
  const pie = topSlices(byUnit);
  const rangeTotal = rangeExpenses.reduce((s, e) => s + e.nominal, 0);

  const target = Number(targetRes.data?.value ?? 0);
  const targetPct = target > 0 ? Math.round((thisMonth.netProfit / target) * 100) : 0;
  const pendingPayouts = payoutsRes.data ?? [];
  const pendingTotal = pendingPayouts.reduce((s, p) => s + p.payout_amount, 0);

  return (
    <div>
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="mb-1 text-xl font-extrabold sm:text-[22px] md:text-2xl">Finance</h1>
        <p className="text-sm text-muted-foreground">{formatPeriodLabel(period)} · all amounts in Rupiah</p>
      </div>

      {/* KPIs */}
      <div className={cn("mb-3.5 grid grid-cols-2 gap-3 md:mb-5", owner ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        <Kpi label="Net profit vs target" value={rupiah(thisMonth.netProfit)}>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, targetPct))}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {target > 0 ? `${targetPct}% of ${rupiah(target)}` : "No monthly target set"}
          </div>
        </Kpi>
        <Kpi label="Units sold" value={String(thisMonth.units)} />
        <Kpi label="Avg profit / unit" value={rupiah(thisMonth.avgProfitPerUnit)} />
        {owner && (
          <Link href="/finance/investor-payouts" className="block">
            <Kpi label="Investor payouts due" value={rupiah(pendingTotal)}>
              <div className="mt-1 text-[11px] text-muted-foreground">{pendingPayouts.length} pending · view →</div>
            </Kpi>
          </Link>
        )}
      </div>

      {/* P&L */}
      <div className={cn("mb-3.5 grid grid-cols-1 gap-3.5 md:mb-5", admin && "lg:grid-cols-2")}>
        <PLCard title={`P&L · ${formatPeriodLabel(period)}`} pl={thisMonth} />
        {admin && <PLCard title={`P&L · ${formatPeriodLabel(lastPeriod)}`} pl={lastMonth} muted />}
      </div>

      <div className="mb-3.5 md:mb-5">
        <FinanceChartsLazy cashflow={cashflow} pie={pie} />
      </div>

      {/* Expenses */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[13px] font-bold">Expenses</div>
            <div className="text-[11px] text-muted-foreground">
              {rupiah(rangeTotal)} across {rangeExpenses.length} items · line items exist only for units not yet archived
            </div>
          </div>
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/finance?range=${r.key}`}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-bold",
                  range === r.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        {rangeExpenses.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No expenses in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>What for</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rangeExpenses.slice(0, 40).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatDateStr(e.tanggal)}</TableCell>
                    <TableCell>{e.units?.nama ?? "—"}</TableCell>
                    <TableCell>{e.keterangan}</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">{rupiah(e.nominal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rangeExpenses.length > 40 && (
              <p className="pt-2 text-center text-[11px] text-muted-foreground">Showing the latest 40 of {rangeExpenses.length}.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="h-full rounded-[20px] border border-border bg-card p-4">
      <div className="mb-1.5 text-xl leading-none font-extrabold sm:text-2xl">{value}</div>
      <div className="text-[13px] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function PLCard({ title, pl, muted }: { title: string; pl: PLSummary; muted?: boolean }) {
  const rows: [string, number, boolean?][] = [
    ["Revenue", pl.revenue],
    ["Purchase cost (COGS)", -pl.cogs],
    ["Gross profit", pl.grossProfit, true],
    ["Unit expenses (repairs/prep)", -pl.expenses],
  ];
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", muted && "opacity-90")}>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[13px] font-bold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{pl.units} units sold</div>
      </div>
      <div className="space-y-2">
        {rows.map(([label, amount, strong]) => (
          <div key={label} className={cn("flex justify-between text-[13px]", strong && "border-t border-border pt-2 font-bold")}>
            <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
            <span>{amount < 0 ? `− ${rupiah(-amount)}` : rupiah(amount)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold">
          <span>Net profit</span>
          <span className={pl.netProfit < 0 ? "text-destructive" : "text-primary"}>{rupiah(pl.netProfit)}</span>
        </div>
      </div>
    </div>
  );
}

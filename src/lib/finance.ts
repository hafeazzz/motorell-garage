// Pure aggregation for the Finance dashboard — no I/O, so the numbers are
// easy to check by hand.
//
// Data limits worth knowing (they come from the schema, not from this file):
//  - There is no operating-expense data (rent, salaries…). "Expenses" are
//    unit_expenses — repair/prep costs logged per unit. So this is a
//    dealer's P&L: revenue − purchase cost (COGS) − unit expenses.
//  - The monthly cron moves last month's sold units into sold_archive and
//    deletes them (and their expense line items). Past months therefore
//    only have totals, and line-item breakdowns only cover live units.

export interface PLInput {
  harga_jual: number;
  modal_beli: number;
  expenses: number;
}

export interface PLSummary {
  units: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  avgProfitPerUnit: number;
}

export function summarizePL(rows: PLInput[]): PLSummary {
  const revenue = rows.reduce((s, r) => s + r.harga_jual, 0);
  const cogs = rows.reduce((s, r) => s + r.modal_beli, 0);
  const expenses = rows.reduce((s, r) => s + r.expenses, 0);
  const netProfit = revenue - cogs - expenses;
  return {
    units: rows.length,
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    expenses,
    netProfit,
    avgProfitPerUnit: rows.length ? Math.round(netProfit / rows.length) : 0,
  };
}

/** "2026-01" -> "2025-12" */
export function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** ISO date ("YYYY-MM-DD") shifted by `days` (negative = earlier). Calendar math only, no timezone. */
export function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface CashPoint {
  day: string;
  in: number;
  out: number;
}

/**
 * Month-to-date cumulative cash in vs out, one point per calendar day up to
 * today. In = sale prices; out = purchase costs (on the day the unit came
 * in) plus unit expenses. This is what actually happened — the schema has no
 * scheduled/recurring items, so it is deliberately not a forecast.
 */
export function monthToDateCashflow(args: {
  monthStart: string;
  today: string;
  sales: { date: string; amount: number }[];
  purchases: { date: string; amount: number }[];
  expenses: { date: string; amount: number }[];
}): CashPoint[] {
  const { monthStart, today, sales, purchases, expenses } = args;
  const days = Number(today.slice(8, 10));
  const points: CashPoint[] = [];
  let cumIn = 0;
  let cumOut = 0;
  for (let d = 1; d <= days; d++) {
    const iso = `${monthStart.slice(0, 8)}${String(d).padStart(2, "0")}`;
    cumIn += sales.filter((s) => s.date === iso).reduce((a, s) => a + s.amount, 0);
    cumOut +=
      purchases.filter((p) => p.date === iso).reduce((a, p) => a + p.amount, 0) +
      expenses.filter((e) => e.date === iso).reduce((a, e) => a + e.amount, 0);
    points.push({ day: String(d), in: cumIn, out: cumOut });
  }
  return points;
}

/** Top `limit` buckets by amount, the rest folded into "Others". */
export function topSlices(map: Map<string, number>, limit = 6): { name: string; value: number }[] {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, limit).map(([name, value]) => ({ name, value }));
  const rest = sorted.slice(limit).reduce((s, [, v]) => s + v, 0);
  return rest > 0 ? [...head, { name: "Others", value: rest }] : head;
}

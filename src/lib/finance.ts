// Pure aggregation for the cashflow chart on the Report page — no I/O, so
// the numbers are easy to check by hand.

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

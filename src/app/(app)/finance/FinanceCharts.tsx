"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rupiah } from "@/lib/utils";
import type { CashPoint } from "@/lib/finance";

const PIE_COLORS = ["#33d399", "#E7B183", "#7FD8FF", "#C7A8D9", "#F4B860", "#E4715A", "#9a9aa2"];

const tooltipStyle = {
  background: "#17171b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
};

// Loaded through next/dynamic (see FinanceChartsLazy) — recharts is by far
// the heaviest dependency in this app and only this page needs it.
export default function FinanceCharts({
  cashflow,
  pie,
}: {
  cashflow: CashPoint[];
  pie: { name: string; value: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-1 text-[13px] font-bold">Cashflow, month to date</div>
        <div className="mb-3 text-[11px] text-muted-foreground">Cumulative cash in vs out (actuals, not a forecast)</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashflow} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#9a9aa2", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fill: "#9a9aa2", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}jt`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => rupiah(Number(v))} labelFormatter={(d) => `Day ${d}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="in" name="Cash in" stroke="#33d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="out" name="Cash out" stroke="#E7B183" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-1 text-[13px] font-bold">Expenses by unit</div>
        <div className="mb-3 text-[11px] text-muted-foreground">Where repair/prep money went in the selected range</div>
        {pie.length === 0 ? (
          <p className="py-16 text-center text-xs text-muted-foreground">No expenses in this range.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" paddingAngle={2} stroke="none">
                  {pie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => rupiah(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

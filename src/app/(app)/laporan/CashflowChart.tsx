"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupiah } from "@/lib/utils";
import type { CashPoint } from "@/lib/finance";

const tooltipStyle = {
  background: "#17171b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
};

// Loaded through next/dynamic (see CashflowChartLazy) — recharts is the
// heaviest dependency in the app and only this section needs it.
export default function CashflowChart({ cashflow }: { cashflow: CashPoint[] }) {
  return (
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
  );
}

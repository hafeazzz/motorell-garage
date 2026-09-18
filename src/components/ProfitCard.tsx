"use client";

import { useState, useTransition } from "react";
import { setMonthlyTarget } from "@/app/(app)/actions";
import { rupiah } from "@/lib/utils";

export function ProfitCard({ netProfit, monthlyTarget }: { netProfit: number; monthlyTarget: number }) {
  const [isPending, startTransition] = useTransition();
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState(String(monthlyTarget));

  const pct = monthlyTarget > 0 ? Math.min(100, Math.round((netProfit / monthlyTarget) * 100)) : 0;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 20,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Profit</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>This month</div>
        </div>
        <div
          style={{
            background: "var(--cream-green-bg)",
            color: "var(--cream-green-fg)",
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: 20,
          }}
        >
          {pct}% of target
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: 12,
          borderRadius: 20,
          background: "rgba(255,255,255,0.07)",
          overflow: "hidden",
          marginTop: 18,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            borderRadius: 20,
            background: "linear-gradient(90deg,#1FAE7A,#33D399)",
            transition: "width 1.2s var(--ease-out-expo)",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: "var(--text-secondary)" }}>
        <span>Net</span>
        <span>Monthly target ({rupiah(monthlyTarget)})</span>
      </div>

      {showInput ? (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{
              flex: 1,
              background: "var(--card-bg-alt)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: "9px 12px",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          />
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await setMonthlyTarget(Number(value) || 0);
                setShowInput(false);
              })
            }
            style={{
              background: "var(--accent-green)",
              color: "#04241A",
              fontWeight: 700,
              fontSize: 12.5,
              padding: "0 14px",
              borderRadius: 12,
            }}
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          style={{
            display: "block",
            margin: "12px auto 0",
            color: "var(--text-tertiary)",
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          Set monthly target
        </button>
      )}
    </div>
  );
}

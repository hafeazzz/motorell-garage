"use client";

import { useState, useTransition } from "react";
import { setMonthlyTarget } from "@/app/(app)/actions";
import { rupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfitCard({ netProfit, monthlyTarget }: { netProfit: number; monthlyTarget: number }) {
  const [isPending, startTransition] = useTransition();
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState(String(monthlyTarget));

  const pct = monthlyTarget > 0 ? Math.min(100, Math.round((netProfit / monthlyTarget) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[15px] font-bold">Profit</div>
          <div className="text-xs text-muted-foreground">This month</div>
        </div>
        <Badge className="rounded-full bg-[image:var(--cream-green-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--cream-green-fg)]">
          {pct}% of target
        </Badge>
      </div>

      <div className="relative mt-4.5 h-3 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="absolute inset-0 rounded-full transition-[width] duration-1000 ease-[var(--ease-out-expo)]"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#1FAE7A,#33D399)" }}
        />
      </div>

      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span>Net</span>
        <span>Monthly target ({rupiah(monthlyTarget)})</span>
      </div>

      {showInput ? (
        <div className="mt-3.5 flex gap-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 flex-1 bg-secondary text-[13px]"
          />
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await setMonthlyTarget(Number(value) || 0);
                setShowInput(false);
              })
            }
          >
            Save
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="mx-auto mt-3 block text-[11.5px] font-semibold text-muted-foreground"
        >
          Set monthly target
        </button>
      )}
    </div>
  );
}

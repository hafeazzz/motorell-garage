"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addInvestor, removeInvestor } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, rupiah } from "@/lib/utils";
import type { InvestorPayout, UnitInvestor } from "@/types/database";

export function UnitInvestors({
  unitId,
  investors,
  payouts,
  sold,
}: {
  unitId: number;
  investors: UnitInvestor[];
  payouts: InvestorPayout[];
  sold: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [share, setShare] = useState("");

  const allocated = investors.reduce((s, i) => s + Number(i.share_percentage), 0);

  function add() {
    const fd = new FormData();
    fd.set("investor_name", name);
    fd.set("share_percentage", share);
    startTransition(async () => {
      try {
        await addInvestor(unitId, fd);
        setName("");
        setShare("");
        toast.success("Investor added.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add investor.");
      }
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      try {
        await removeInvestor(unitId, id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove investor.");
      }
    });
  }

  return (
    <div className="mb-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[13px] font-bold text-muted-foreground">Investors</div>
        <div className="text-[11px] text-muted-foreground">{allocated}% of 100% allocated</div>
      </div>

      {investors.length === 0 && (
        <p className="py-2 text-center text-xs text-muted-foreground">No investor on this unit.</p>
      )}

      {investors.map((inv) => {
        const payout = payouts.find((p) => p.investor_name === inv.investor_name);
        return (
          <div key={inv.id} className="mb-2.5 flex items-center justify-between gap-2.5 rounded-[14px] bg-secondary px-3.5 py-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">
                {inv.investor_name} · {Number(inv.share_percentage)}%
              </div>
              <div className="text-[11px] text-muted-foreground">
                {payout
                  ? `Payout ${rupiah(payout.payout_amount)}${payout.profit <= 0 ? " (no profit — nothing owed)" : ""}`
                  : sold
                    ? "Payout not created yet"
                    : "Payout is calculated when the unit is sold"}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {payout && (
                <Badge
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-bold",
                    payout.status === "paid"
                      ? "bg-[image:var(--cream-green-bg)] text-[var(--cream-green-fg)]"
                      : "bg-[image:var(--cream-orange-bg)] text-[var(--cream-orange-fg)]"
                  )}
                >
                  {payout.status === "paid" ? "Paid" : "Pending"}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-lg bg-card"
                disabled={isPending}
                onClick={() => remove(inv.id)}
                aria-label={`Remove ${inv.investor_name}`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        );
      })}

      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="col-span-2">
            <Label className="mb-1.5 text-xs text-muted-foreground">Investor</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name or code" className="bg-secondary text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">Share %</Label>
            <Input type="number" value={share} onChange={(e) => setShare(e.target.value)} placeholder="30" className="bg-secondary text-sm" />
          </div>
        </div>
        <Button className="mt-3 w-full" disabled={isPending || !name.trim() || !share} onClick={add}>
          Add investor
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          An investor gets their % of the unit&apos;s net profit (sale − purchase − expenses), and nothing if it sells at a loss.
        </p>
      </div>
    </div>
  );
}

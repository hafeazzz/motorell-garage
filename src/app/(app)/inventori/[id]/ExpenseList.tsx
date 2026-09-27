"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addExpense, deleteExpense } from "../actions";
import { rupiah, formatDateStr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UnitExpense } from "@/types/database";

export function ExpenseList({ unitId, expenses }: { unitId: number; expenses: UnitExpense[] }) {
  const [isPending, startTransition] = useTransition();
  const [keterangan, setKeterangan] = useState("");
  const [nominal, setNominal] = useState("");

  return (
    <div>
      <div className="mb-3 text-[13px] font-bold text-muted-foreground">Expense history</div>

      {expenses.length === 0 && (
        <p className="py-3.5 text-center text-xs text-muted-foreground">No expenses recorded yet.</p>
      )}

      {expenses.map((e) => (
        <div
          key={e.id}
          className="mb-2.5 flex items-center justify-between gap-2.5 rounded-[14px] bg-secondary px-3.5 py-3"
        >
          <div>
            <div className="text-[13px] font-semibold">{e.keterangan}</div>
            <div className="text-[11px] text-muted-foreground">{formatDateStr(e.tanggal)}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold whitespace-nowrap">{rupiah(e.nominal)}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-lg bg-card"
              disabled={isPending}
              onClick={() => startTransition(() => deleteExpense(unitId, e.id))}
              aria-label="Delete expense"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      ))}

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 text-[13px] font-bold">Add expense</div>
        <div className="mb-2.5">
          <Label className="mb-1.5 text-xs text-muted-foreground">What for</Label>
          <Input
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="e.g. brake service"
            className="bg-secondary text-sm"
          />
        </div>
        <div className="mb-2.5">
          <Label className="mb-1.5 text-xs text-muted-foreground">Amount (Rp)</Label>
          <Input
            type="number"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            placeholder="0"
            className="bg-secondary text-sm"
          />
        </div>
        <Button
          className="w-full"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              if (!keterangan.trim() || !nominal) return;
              const fd = new FormData();
              fd.set("keterangan", keterangan);
              fd.set("nominal", nominal);
              await addExpense(unitId, fd);
              setKeterangan("");
              setNominal("");
            })
          }
        >
          Add expense
        </Button>
      </div>
    </div>
  );
}

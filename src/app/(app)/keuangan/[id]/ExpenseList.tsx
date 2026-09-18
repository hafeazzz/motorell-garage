"use client";

import { useState, useTransition } from "react";
import { addExpense, deleteExpense } from "../actions";
import { rupiah, formatDateStr } from "@/lib/utils";
import type { UnitExpense } from "@/types/database";

export function ExpenseList({ unitId, expenses }: { unitId: number; expenses: UnitExpense[] }) {
  const [isPending, startTransition] = useTransition();
  const [keterangan, setKeterangan] = useState("");
  const [nominal, setNominal] = useState("");

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", margin: "4px 0 12px" }}>
        Expense history
      </div>

      {expenses.length === 0 && (
        <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", textAlign: "center", padding: "14px 0" }}>
          No expenses recorded yet.
        </p>
      )}

      {expenses.map((e) => (
        <div
          key={e.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--card-bg-alt)",
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 9,
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{e.keterangan}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{formatDateStr(e.tanggal)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{rupiah(e.nominal)}</span>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => deleteExpense(unitId, e.id))}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: "var(--card-bg)",
                flex: "none",
                fontSize: 12,
              }}
              aria-label="Delete expense"
            >
              🗑
            </button>
          </div>
        </div>
      ))}

      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          padding: 16,
          marginTop: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add expense</div>
        <div style={{ marginBottom: 10 }}>
          <label style={fieldLabel}>What for</label>
          <input
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="e.g. brake service"
            style={fieldInput}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={fieldLabel}>Amount (Rp)</label>
          <input
            type="number"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            placeholder="0"
            style={fieldInput}
          />
        </div>
        <button
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
          style={{
            width: "100%",
            background: "var(--accent-green)",
            color: "#04241A",
            fontWeight: 700,
            fontSize: 13,
            padding: 12,
            borderRadius: 12,
          }}
        >
          Add expense
        </button>
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "var(--text-secondary)",
  marginBottom: 5,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  background: "var(--card-bg-alt)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: "10px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
};

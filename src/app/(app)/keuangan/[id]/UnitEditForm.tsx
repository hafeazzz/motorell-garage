"use client";

import { useState, useTransition } from "react";
import { updateUnit } from "../actions";
import { todayIso } from "@/lib/utils";
import type { Unit, UnitStatus } from "@/types/database";

export function UnitEditForm({ unit }: { unit: Unit }) {
  const [status, setStatus] = useState<UnitStatus>(unit.status);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => updateUnit(unit.id, formData))}
      style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Year" name="tahun" type="number" defaultValue={String(unit.tahun)} />
        <Field label="Odometer" name="odometer" defaultValue={unit.odometer ?? ""} />
        <Field label="Plate number" name="plat" defaultValue={unit.plat} />
        <div>
          <label style={fieldLabel}>Status</label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as UnitStatus)}
            style={fieldInput}
          >
            <option value="progress">In Progress</option>
            <option value="ready">Ready</option>
            <option value="booked">Booked</option>
            <option value="sold">Sold</option>
          </select>
        </div>

        {status === "booked" && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label="Booking deposit (Rp)"
              name="booking_nominal"
              type="number"
              defaultValue={unit.booking_nominal ? String(unit.booking_nominal) : ""}
            />
          </div>
        )}
        {status === "sold" && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label="Date sold"
              name="tanggal_jual"
              type="date"
              defaultValue={unit.tanggal_jual ?? todayIso()}
            />
          </div>
        )}
      </div>

      <Field
        label="Target / sale price (Rp)"
        name="harga_jual"
        type="number"
        defaultValue={unit.harga_jual ? String(unit.harga_jual) : ""}
      />
      <Field label="Finance code" name="finance_code" defaultValue={unit.finance_code ?? ""} />

      <button
        type="submit"
        disabled={isPending}
        style={{
          background: "var(--accent-green)",
          color: "#04241A",
          fontWeight: 700,
          fontSize: 13,
          padding: 12,
          borderRadius: 12,
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} style={fieldInput} />
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

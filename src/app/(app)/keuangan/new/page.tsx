import { createUnit } from "../actions";
import { todayIso } from "@/lib/utils";

export default function NewUnitPage() {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Add unit</div>
      <form action={createUnit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Model name" name="nama" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Year" name="tahun" type="number" defaultValue={String(new Date().getFullYear())} />
          <Field label="Odometer" name="odometer" placeholder="e.g. 5,000 km" />
          <Field label="Plate number" name="plat" placeholder="e.g. B 1234 ABC" />
          <div>
            <label style={fieldLabel}>Status</label>
            <select name="status" defaultValue="progress" style={fieldInput}>
              <option value="progress">In Progress</option>
              <option value="ready">Ready</option>
              <option value="booked">Booked</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>
        <Field label="Purchase cost (Rp)" name="modal_beli" type="number" required />
        <Field label="Date acquired" name="tgl_masuk" type="date" defaultValue={todayIso()} />

        <button
          type="submit"
          style={{
            width: "100%",
            background: "var(--accent-green)",
            color: "#04241A",
            fontWeight: 700,
            fontSize: 13,
            padding: 12,
            borderRadius: 12,
            marginTop: 4,
          }}
        >
          Create unit
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={fieldInput}
      />
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

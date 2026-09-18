"use client";

import { useState, useTransition } from "react";
import { createAccount } from "./actions";

export function AddAccountForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          background: "var(--card-bg-alt)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          borderRadius: 16,
          padding: 13,
          fontSize: 13.5,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        + Add account
      </button>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          try {
            await createAccount(formData);
            setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
          }
        })
      }
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <input name="name" placeholder="Name" required style={inputStyle} />
      <input name="email" type="email" placeholder="Email" required style={inputStyle} />
      <input name="password" type="password" placeholder="Temporary password" required style={inputStyle} />
      <select name="position" defaultValue="Mechanic" style={inputStyle}>
        {["Freelancer", "Mechanic", "Field", "Finance", "Admin", "Master"].map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select name="role" defaultValue="staff" style={inputStyle}>
        <option value="staff">Staff access</option>
        <option value="admin">Admin access</option>
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
        <input type="checkbox" name="tracks_attendance" defaultChecked />
        Track attendance for this account
      </label>

      {error && <p style={{ color: "#E7B183", fontSize: 12.5, margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setOpen(false)} style={cancelBtn}>
          Cancel
        </button>
        <button type="submit" disabled={isPending} style={submitBtn}>
          {isPending ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--card-bg-alt)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: "10px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
};
const cancelBtn: React.CSSProperties = {
  flex: 1,
  background: "var(--card-bg-alt)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: 11,
  fontSize: 13,
  fontWeight: 700,
};
const submitBtn: React.CSSProperties = {
  flex: 1,
  background: "var(--accent-green)",
  color: "#04241A",
  borderRadius: 12,
  padding: 11,
  fontSize: 13,
  fontWeight: 700,
};

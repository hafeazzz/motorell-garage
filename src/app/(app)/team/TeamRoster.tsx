"use client";

import { useState, useTransition } from "react";
import {
  updatePosition,
  updateRole,
  updateTracksAttendance,
  renameProfile,
  deleteAccount,
} from "./actions";
import type { Profile, Role } from "@/types/database";

const POSITIONS = ["Freelancer", "Mechanic", "Field", "Finance", "Admin", "Master"];

export function TeamRoster({ profiles }: { profiles: Profile[] }) {
  return (
    <div>
      {profiles.map((p) =>
        p.is_owner ? <OwnerCard key={p.id} profile={p} /> : <MemberCard key={p.id} profile={p} />
      )}
    </div>
  );
}

function OwnerCard({ profile }: { profile: Profile }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(profile.name);
  const [isPending, startTransition] = useTransition();

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={profile.name} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{profile.name}</span>
            <span style={ownerTagStyle}>Owner</span>
            <button style={iconBtn} onClick={() => setRenaming((v) => !v)} aria-label="Rename">
              ✏️
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>Owner</div>
        </div>
      </div>
      {renaming && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <button
            disabled={isPending}
            style={saveBtn}
            onClick={() =>
              startTransition(async () => {
                if (name.trim()) await renameProfile(profile.id, name);
                setRenaming(false);
              })
            }
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function MemberCard({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(profile.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (confirmingDelete) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 12.5 }}>Remove {profile.name}&apos;s account?</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={miniBtn} onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
            <button
              style={{ ...miniBtn, background: "#E7B183", color: "#3A2410" }}
              disabled={isPending}
              onClick={() => startTransition(() => deleteAccount(profile.id))}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={profile.name} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{profile.name}</span>
            <button style={iconBtn} onClick={() => setRenaming((v) => !v)} aria-label="Rename">
              ✏️
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
            {profile.position} · {profile.role === "admin" ? "Admin access" : "Staff access"}
          </div>
        </div>
        <button style={iconBtn} onClick={() => setConfirmingDelete(true)} aria-label="Remove account">
          🗑
        </button>
      </div>

      {renaming && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <button
            disabled={isPending}
            style={saveBtn}
            onClick={() =>
              startTransition(async () => {
                if (name.trim()) await renameProfile(profile.id, name);
                setRenaming(false);
              })
            }
          >
            Save
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
        <select
          defaultValue={profile.position}
          onChange={(e) => startTransition(() => updatePosition(profile.id, e.target.value))}
          style={selectStyle}
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          defaultValue={profile.role}
          onChange={(e) => startTransition(() => updateRole(profile.id, e.target.value as Role))}
          style={selectStyle}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", fontSize: 11, color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            defaultChecked={profile.tracks_attendance}
            onChange={(e) => startTransition(() => updateTracksAttendance(profile.id, e.target.checked))}
          />
          Attendance
        </label>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 14,
        color: "#fff",
        background: "linear-gradient(135deg,#4A2A63,#E4715A)",
        flex: "none",
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 16,
  padding: "12px 14px",
  marginBottom: 10,
};
const ownerTagStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--cream-green-fg)",
  background: "var(--cream-green-bg)",
  padding: "2px 7px",
  borderRadius: 20,
};
const iconBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 8,
  background: "var(--card-bg-alt)",
  fontSize: 11,
  flex: "none",
};
const miniBtn: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  padding: "5px 12px",
  borderRadius: 20,
  background: "var(--card-bg-alt)",
  border: "1px solid var(--border-subtle)",
};
const saveBtn: React.CSSProperties = {
  background: "var(--accent-green)",
  color: "#04241A",
  fontWeight: 700,
  fontSize: 12,
  padding: "0 14px",
  borderRadius: 10,
};
const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--card-bg-alt)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  padding: "8px 10px",
  color: "var(--text-primary)",
  fontSize: 12.5,
};
const selectStyle: React.CSSProperties = {
  background: "var(--card-bg-alt)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  padding: "7px 9px",
  color: "var(--text-primary)",
  fontSize: 12,
};

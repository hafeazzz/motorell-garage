"use client";

import { useTransition } from "react";
import { checkIn } from "./actions";
import type { AttendanceStatus } from "@/types/database";

export function CheckInCard({ existingStatus }: { existingStatus: AttendanceStatus | null }) {
  const [isPending, startTransition] = useTransition();

  if (existingStatus) {
    return (
      <p style={{ fontSize: 14, fontWeight: 600 }}>
        You&apos;re marked{" "}
        <span style={{ color: existingStatus === "masuk" ? "var(--accent-green)" : "#E7B183" }}>
          {existingStatus === "masuk" ? "Present" : "Absent"}
        </span>{" "}
        today.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => checkIn("masuk"))}
        style={{
          flex: 1,
          padding: 14,
          borderRadius: 16,
          fontWeight: 700,
          fontSize: 14,
          background: "var(--accent-green)",
          color: "#04241A",
        }}
      >
        Check In
      </button>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => checkIn("tidak"))}
        style={{
          flex: 1,
          padding: 14,
          borderRadius: 16,
          fontWeight: 700,
          fontSize: 14,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
        }}
      >
        Absent
      </button>
    </div>
  );
}

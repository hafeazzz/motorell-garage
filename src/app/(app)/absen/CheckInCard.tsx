"use client";

import { checkIn } from "./actions";
import { Button } from "@/components/ui/button";
import { useGarage } from "@/lib/store";
import { cn, todayIso } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/database";

export function CheckInCard({ existingStatus }: { existingStatus: AttendanceStatus | null }) {
  const { data, run } = useGarage();

  // Shows as checked in the moment it's tapped; rolled back if it fails.
  function mark(status: AttendanceStatus) {
    const me = data.profile.id;
    void run({
      optimistic: (d) => ({
        ...d,
        attendanceToday: [
          ...d.attendanceToday.filter((a) => a.user_id !== me),
          { id: -Date.now(), user_id: me, date: todayIso(), status, created_at: new Date().toISOString() },
        ],
      }),
      action: () => checkIn(status),
      reload: ["attendance"],
      error: "Gagal menyimpan absen.",
    });
  }

  if (existingStatus) {
    return (
      <p className="text-sm font-semibold">
        You&apos;re marked{" "}
        <span className={existingStatus === "masuk" ? "text-primary" : "text-[#E7B183]"}>
          {existingStatus === "masuk" ? "Present" : "Absent"}
        </span>{" "}
        today.
      </p>
    );
  }

  return (
    <div className="flex gap-2.5">
      <Button onClick={() => mark("masuk")} className="h-auto flex-1 rounded-2xl py-3.5 text-sm font-bold">
        Check In
      </Button>
      <Button
        variant="outline"
        onClick={() => mark("tidak")}
        className={cn("h-auto flex-1 rounded-2xl bg-secondary py-3.5 text-sm font-bold")}
      >
        Absent
      </Button>
    </div>
  );
}

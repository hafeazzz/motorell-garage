"use client";

import { useTransition } from "react";
import { checkIn } from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/database";

export function CheckInCard({ existingStatus }: { existingStatus: AttendanceStatus | null }) {
  const [isPending, startTransition] = useTransition();

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
      <Button
        disabled={isPending}
        onClick={() => startTransition(() => checkIn("masuk"))}
        className="h-auto flex-1 rounded-2xl py-3.5 text-sm font-bold"
      >
        Check In
      </Button>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => checkIn("tidak"))}
        className={cn("h-auto flex-1 rounded-2xl bg-secondary py-3.5 text-sm font-bold")}
      >
        Absent
      </Button>
    </div>
  );
}

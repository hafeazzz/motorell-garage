"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DecisionModal } from "./DecisionModal";

// Shown on a finished-but-undecided ("Pending") inspection, for its inspector
// or an owner/admin — e.g. when the decision modal was dismissed earlier.
export function DecideButton({ inspectionId, nama }: { inspectionId: number; nama: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
        Putuskan: Beli atau Tidak
      </Button>
      <DecisionModal inspectionId={inspectionId} nama={nama} open={open} onOpenChange={setOpen} />
    </>
  );
}

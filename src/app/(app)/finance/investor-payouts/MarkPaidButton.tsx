"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { markPayoutPaid } from "../actions";
import { Button } from "@/components/ui/button";

export function MarkPaidButton({ payoutId }: { payoutId: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await markPayoutPaid(payoutId);
            toast.success("Marked as paid.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't mark as paid.");
          }
        })
      }
    >
      {isPending ? "Saving…" : "Mark paid"}
    </Button>
  );
}

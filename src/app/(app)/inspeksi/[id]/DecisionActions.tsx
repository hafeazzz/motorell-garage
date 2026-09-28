"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { decideInspection, deleteInspection } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Owner/admin only (the page doesn't render this for anyone else, and both
// actions call requireAdmin() server-side).
export function DecisionActions({
  inspectionId,
  nama,
  canDecide,
}: {
  inspectionId: number;
  nama: string;
  canDecide: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function decide(decision: "beli" | "tidak") {
    startTransition(async () => {
      try {
        await decideInspection(inspectionId, decision);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save the decision.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteInspection(inspectionId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed.");
        setConfirmDelete(false);
      }
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {canDecide && (
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={isPending} onClick={() => decide("beli")}>
            Beli — add to Inventori
          </Button>
          <Button variant="secondary" disabled={isPending} onClick={() => decide("tidak")}>
            Tidak
          </Button>
        </div>
      )}
      <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
        Delete inspection
      </Button>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete inspection of &ldquo;{nama}&rdquo;?</DialogTitle>
            <DialogDescription>This can&apos;t be undone. A unit already created from it is kept.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={remove}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

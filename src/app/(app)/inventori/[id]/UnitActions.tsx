"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { deleteUnit } from "../actions";
import { EditUnitDialog } from "./EditUnitDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Unit } from "@/types/database";

export function UnitActions({ unit }: { unit: Unit }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteUnit(unit.id);
        toast.success("Unit deleted.");
        // deleteUnit() redirects to /inventori on success — this only
        // fires if it throws instead (e.g. permission denied).
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed.");
        setDeleteOpen(false);
      }
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="secondary" size="icon" className="rounded-lg" onClick={() => setEditOpen(true)} aria-label="Edit unit">
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        className="rounded-lg text-destructive"
        onClick={() => setDeleteOpen(true)}
        aria-label="Delete unit"
      >
        <Trash2 className="size-4" />
      </Button>

      <EditUnitDialog unit={unit} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{unit.nama}&rdquo;?</DialogTitle>
            <DialogDescription>
              This can&apos;t be undone — its expense history is removed with it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

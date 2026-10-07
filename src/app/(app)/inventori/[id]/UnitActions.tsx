"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGarage } from "@/lib/store";
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
  const router = useRouter();
  const { run } = useGarage();

  // Removed from the list at once and back to Inventori; if the server
  // refuses, the unit reappears with the reason in a toast.
  function handleDelete() {
    setDeleteOpen(false);
    router.push("/inventori");
    void run({
      optimistic: (d) => ({
        ...d,
        units: d.units.filter((u) => u.id !== unit.id),
        expenses: d.expenses.filter((e) => e.unit_id !== unit.id),
      }),
      action: () => deleteUnit(unit.id),
      reload: ["units", "expenses"],
      success: "Unit dihapus.",
      error: "Gagal menghapus unit.",
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="secondary" size="icon" className="size-10 rounded-xl" onClick={() => setEditOpen(true)} aria-label="Edit unit">
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        className="size-10 rounded-xl text-destructive"
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
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

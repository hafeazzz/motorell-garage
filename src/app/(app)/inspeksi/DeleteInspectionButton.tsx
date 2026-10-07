"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGarage } from "@/lib/store";
import { Trash2 } from "lucide-react";
import { deleteInspection } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Owner/admin/mechanic — callers only render it for them, and deleteInspection()
// re-checks server-side. It's a soft delete: the inspection disappears from
// the list but stays in the database with a "Inspeksi dihapus" history entry.
export function DeleteInspectionButton({
  inspectionId,
  nama,
  redirectTo,
  iconOnly,
}: {
  inspectionId: number;
  nama: string;
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { run } = useGarage();

  // Gone from the list at once; it comes back with a toast if the server refuses.
  function remove() {
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    void run({
      optimistic: (d) => ({ ...d, inspections: d.inspections.filter((i) => i.id !== inspectionId) }),
      action: () => deleteInspection(inspectionId),
      reload: ["inspections"],
      success: "Inspeksi dihapus.",
      error: "Gagal menghapus inspeksi.",
    });
  }

  return (
    <>
      {iconOnly ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-xl bg-secondary text-destructive"
          onClick={() => setOpen(true)}
          aria-label={`Hapus inspeksi ${nama}`}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <Button variant="ghost" className="text-destructive" onClick={() => setOpen(true)}>
          Hapus inspeksi
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus inspeksi &ldquo;{nama}&rdquo;?</DialogTitle>
            <DialogDescription>
              Inspeksi disembunyikan dari daftar, tapi riwayatnya tetap tersimpan. Unit yang sudah dibuat darinya tidak ikut terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={remove}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

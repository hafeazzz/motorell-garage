"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

// Owner/admin only — callers only render it for them, and deleteInspection()
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
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        await deleteInspection(inspectionId);
        toast.success("Inspeksi dihapus.");
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
        setOpen(false);
      }
    });
  }

  return (
    <>
      {iconOnly ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-lg bg-secondary text-destructive"
          onClick={() => setOpen(true)}
          aria-label={`Hapus inspeksi ${nama}`}
        >
          <Trash2 className="size-3" />
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
            <Button variant="destructive" disabled={isPending} onClick={remove}>
              {isPending ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

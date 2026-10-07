"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useGarage } from "@/lib/store";
import { toast } from "sonner";
import { decideInspection } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Step 1: beli or tidak. Step 2 (beli only): the purchase price — asked here,
// at the end, not when the inspection starts. The action does the rest
// (creates the unit in Inventori, writes the history entry).
export function DecisionModal({
  inspectionId,
  nama,
  open,
  onOpenChange,
}: {
  inspectionId: number;
  nama: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { reload } = useGarage();
  const [step, setStep] = useState<"decision" | "price">("decision");
  const [price, setPrice] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setStep("decision");
      setPrice("");
    }
  }, [open]);

  function submit(decision: "beli" | "tidak") {
    const amount = Number(price);
    if (decision === "beli" && !(amount > 0)) {
      toast.error("Harga harus lebih dari 0.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await decideInspection(inspectionId, decision, decision === "beli" ? amount : undefined);
        if (result.decision === "beli") {
          toast.success("Motor dibeli — unit sudah masuk Inventori. Detailnya bisa dilengkapi nanti.");
        } else {
          toast.success("Inspeksi ditandai: tidak dibeli.");
        }
        // A "beli" decision created a unit — load it before opening its page.
        await reload(["inspections", "units"]);
        onOpenChange(false);
        router.push(result.redirectTo);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan keputusan.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "decision" ? (
          <>
            <DialogHeader>
              <DialogTitle>Hasil Inspeksi</DialogTitle>
              <DialogDescription>Apakah motor ini akan dibeli? — {nama}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" disabled={isPending} onClick={() => submit("tidak")}>
                {isPending ? "Menyimpan…" : "Tidak"}
              </Button>
              <Button disabled={isPending} onClick={() => setStep("price")}>
                Beli
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Harga Dibeli</DialogTitle>
              <DialogDescription>Motor akan otomatis dimasukkan ke Inventori dengan harga ini.</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="harga" className="mb-1.5 text-xs text-muted-foreground">
                Harga Dibeli (Rp)
              </Label>
              <Input
                id="harga"
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                autoFocus
                className="bg-secondary text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="secondary" disabled={isPending} onClick={() => setStep("decision")}>
                Kembali
              </Button>
              <Button disabled={isPending || !(Number(price) > 0)} onClick={() => submit("beli")}>
                {isPending ? "Menyimpan…" : "Simpan & Masukkan ke Inventori"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

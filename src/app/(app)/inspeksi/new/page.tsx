"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGarage } from "@/lib/store";
import { ArrowLeft } from "lucide-react";
import { createInspection } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewInspectionPage() {
  const router = useRouter();
  const { reload } = useGarage();
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    try {
      const id = await createInspection(formData);
      // The detail page reads the row from the store, so fetch it first.
      await reload(["inspections"]);
      router.push(`/inspeksi/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat inspeksi.");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4.5 flex items-center gap-3">
        <Link href="/inspeksi" className="pressable flex size-9 shrink-0 items-center justify-center rounded-xl bg-card">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-extrabold">New inspection</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Check a motor before buying it. Fill in what you know now — you&apos;ll go through the checklist next. The purchase price is asked at the end, only if you decide to buy.
      </p>

      <form action={submit} className="flex flex-col gap-3">
        <Field label="Model name" name="nama" placeholder="e.g. Honda Vario 160 Hitam" required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Year" name="tahun" type="number" placeholder="e.g. 2021" />
          <Field label="Plate number" name="plat" placeholder="e.g. B 1234 ABC" />
        </div>
        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? "Membuat…" : "Start inspection"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name} className="mb-1.5 text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required={required} className="bg-secondary text-sm" />
    </div>
  );
}

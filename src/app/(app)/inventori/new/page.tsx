"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUnit } from "../actions";
import { useGarage } from "@/lib/store";
import { todayIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewUnitPage() {
  const router = useRouter();
  const { reload } = useGarage();
  const [busy, setBusy] = useState(false);
  // One token per mount, resent on every submit of this form — lets the
  // server recognize a double submit as a repeat rather than a new unit.
  const clientToken = useRef(crypto.randomUUID());
  // A ref, not just `busy` state: state updates aren't synchronous, so a
  // second click fired before the re-render would still slip through.
  const submitting = useRef(false);

  async function submit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    formData.set("client_token", clientToken.current);
    try {
      const id = await createUnit(formData);
      router.push(`/inventori/${id}`);
      void reload(["units"]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah unit.");
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4.5 text-xl font-extrabold">Add unit</h1>
      <form action={submit} className="flex flex-col gap-3">
        <Field label="Model name" name="nama" required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Year" name="tahun" type="number" defaultValue={String(new Date().getFullYear())} />
          <Field label="Odometer" name="odometer" placeholder="e.g. 5,000 km" />
          <Field label="Plate number" name="plat" placeholder="e.g. B 1234 ABC" />
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">Status</Label>
            <select
              name="status"
              defaultValue="progress"
              className="h-9 w-full rounded-lg border border-input bg-secondary px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="progress">In Progress</option>
              <option value="ready">Ready</option>
              <option value="booked">Booked</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>
        <Field label="Purchase cost (Rp)" name="modal_beli" type="number" required />
        <Field label="Date acquired" name="tgl_masuk" type="date" defaultValue={todayIso()} />

        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? "Menyimpan…" : "Create unit"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} className="mb-1.5 text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="bg-secondary text-sm"
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateUnit } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Unit, UnitStatus } from "@/types/database";

const STATUS_OPTIONS: { value: UnitStatus; label: string }[] = [
  { value: "progress", label: "In Progress" },
  { value: "ready", label: "Ready for Sale" },
  { value: "booked", label: "Booked" },
  { value: "sold", label: "Sold" },
];

// Photos live in Supabase Storage (a public bucket, see README) — never as
// base64 in the units table. modal_beli/tahun/etc. columns are already
// small integers; a 5MB photo encoded as base64 text would bloat every row
// and this table isn't designed to hold that.
const PHOTO_BUCKET = "unit-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function EditUnitDialog({
  unit,
  open,
  onOpenChange,
}: {
  unit: Unit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<UnitStatus>(unit.status);
  const [photoUrl, setPhotoUrl] = useState(unit.photo_url);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be 5MB or smaller.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${unit.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? `Photo upload failed: ${err.message}` : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function validate(formData: FormData): string | null {
    const nama = String(formData.get("nama") || "").trim();
    if (nama.length < 3) return "Model name must be at least 3 characters.";

    const tahun = Number(formData.get("tahun"));
    const currentYear = new Date().getFullYear();
    if (!tahun || tahun < 1900 || tahun > currentYear) return "Enter a valid year (1900–" + currentYear + ").";

    const odometer = String(formData.get("odometer") || "").trim();
    if (!odometer) return "Odometer is required.";

    const plat = String(formData.get("plat") || "").trim();
    if (!plat) return "Plate number is required.";

    const modalBeli = Number(formData.get("modal_beli"));
    if (!modalBeli || modalBeli <= 0) return "Purchase cost must be greater than 0.";

    const tglMasuk = String(formData.get("tgl_masuk") || "");
    if (!tglMasuk) return "Date acquired is required.";
    if (tglMasuk > todayIso()) return "Date acquired can't be in the future.";

    const hargaJual = formData.get("harga_jual");
    if (hargaJual && Number(hargaJual) < 0) return "Sale price can't be negative.";

    return null;
  }

  function handleSubmit(formData: FormData) {
    const error = validate(formData);
    if (error) {
      toast.error(error);
      return;
    }
    formData.set("photo_url", photoUrl ?? "");

    startTransition(async () => {
      try {
        await updateUnit(unit.id, formData);
        toast.success("Unit updated.");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit unit: {unit.nama}</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4 py-2">
          <div>
            <Label className="mb-1.5">Photo</Label>
            <div className="flex flex-col gap-3">
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Preview" className="h-36 w-36 rounded-lg object-cover" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={uploading}
                className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
              />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Model name" name="nama" defaultValue={unit.nama} className="sm:col-span-3" />
            <Field label="Year" name="tahun" type="number" defaultValue={String(unit.tahun)} />
            <Field label="Odometer" name="odometer" defaultValue={unit.odometer ?? ""} placeholder="e.g. 5,000 km" />
            <Field label="Plate number" name="plat" defaultValue={unit.plat} placeholder="B 1234 ABC" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as UnitStatus)}>
                <SelectTrigger className="w-full bg-secondary text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Native select mirrors the value for FormData — Select's
                  Base UI primitive already renders its own hidden input,
                  but naming it "status" here directly keeps this in step
                  with the plain-form pattern the rest of this app uses. */}
              <input type="hidden" name="status" value={status} />
            </div>
            <Field label="Purchase cost (Rp)" name="modal_beli" type="number" defaultValue={String(unit.modal_beli)} />
            <Field label="Date acquired" name="tgl_masuk" type="date" defaultValue={unit.tgl_masuk} />
          </div>

          {status === "booked" && (
            <Field
              label="Booking deposit (Rp)"
              name="booking_nominal"
              type="number"
              defaultValue={unit.booking_nominal ? String(unit.booking_nominal) : ""}
            />
          )}
          {status === "sold" && (
            <Field
              label="Date sold"
              name="tanggal_jual"
              type="date"
              defaultValue={unit.tanggal_jual ?? todayIso()}
            />
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Sale price (Rp)"
              name="harga_jual"
              type="number"
              defaultValue={unit.harga_jual ? String(unit.harga_jual) : ""}
            />
            <Field label="Finance code" name="finance_code" defaultValue={unit.finance_code ?? ""} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || uploading}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} className="mb-1.5 text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="bg-secondary text-sm"
      />
    </div>
  );
}

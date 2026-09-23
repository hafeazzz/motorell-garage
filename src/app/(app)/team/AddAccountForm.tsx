"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createAccount } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POSITIONS = ["Freelancer", "Mechanic", "Field", "Finance", "Admin", "Master"];

// Kept as native <select>/<input> elements rather than shadcn's Select —
// this form submits via a plain server action reading FormData, and native
// form controls guarantee they show up in that FormData with zero extra
// wiring. TeamRoster's role/position pickers use shadcn's Select instead,
// since those are already controlled (onValueChange), not form-submitted.
export function AddAccountForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="mb-3.5 w-full gap-2 rounded-2xl border-border bg-secondary py-6 text-[13.5px] font-bold md:mb-5 md:w-auto"
      >
        <Plus className="size-4" />
        Add account
      </Button>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          try {
            await createAccount(formData);
            setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
          }
        })
      }
      className="mb-3.5 flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 md:mb-5 lg:grid lg:grid-cols-2 lg:gap-3"
    >
      <Input name="name" placeholder="Name" required className="bg-secondary text-sm" />
      <Input name="email" type="email" placeholder="Email" required className="bg-secondary text-sm" />
      <Input
        name="password"
        type="password"
        placeholder="Temporary password"
        required
        className="bg-secondary text-sm lg:col-span-2"
      />
      <select
        name="position"
        defaultValue="Mechanic"
        className="h-9 rounded-lg border border-input bg-secondary px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        name="role"
        defaultValue="staff"
        className="h-9 rounded-lg border border-input bg-secondary px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="staff">Staff access</option>
        <option value="manager">Manager access</option>
        <option value="admin">Admin access</option>
      </select>
      <Label className="flex items-center gap-2 text-[12.5px] font-normal lg:col-span-2">
        <input type="checkbox" name="tracks_attendance" defaultChecked className="size-4 accent-primary" />
        Track attendance for this account
      </Label>

      {error && <p className="m-0 text-[12.5px] text-destructive lg:col-span-2">{error}</p>}

      <div className="flex gap-2 lg:col-span-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Creating…" : "Create account"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGarage } from "@/lib/store";
import { isAdminOrAbove } from "@/types/database";
import { TeamRoster } from "./TeamRoster";
import { AddAccountForm } from "./AddAccountForm";

export default function TeamPage() {
  const router = useRouter();
  const { data } = useGarage();
  // Same rule as proxy.ts and the nav tab (owner/admin); the server actions
  // re-check it, this only keeps others off the screen.
  const allowed = isAdminOrAbove(data.profile);
  useEffect(() => {
    if (!allowed) router.replace("/");
  }, [allowed, router]);
  if (!allowed) return null;

  // Owner first, then by name (the store keeps profiles name-sorted).
  const profiles = [...data.profiles].sort((a, b) => Number(b.is_owner) - Number(a.is_owner));

  return (
    <div>
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="mb-1 text-xl font-extrabold sm:text-[22px] md:text-2xl">Team</h1>
        <p className="text-sm text-muted-foreground">Accounts, positions, access, and attendance tracking</p>
      </div>

      <AddAccountForm />
      <TeamRoster profiles={profiles} />
    </div>
  );
}

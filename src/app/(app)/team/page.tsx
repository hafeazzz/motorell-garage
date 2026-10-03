import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamRoster } from "./TeamRoster";
import { AddAccountForm } from "./AddAccountForm";
import { getMyProfile } from "@/lib/session";
import { isAdminOrAbove } from "@/types/database";
import type { TeamProfile } from "@/types/database";

export default async function TeamPage() {
  const supabase = await createClient();
  const me = await getMyProfile();

  // Server-side guard, same rule as proxy.ts and the nav tab (owner/admin).
  // The tab being hidden is only a UI convenience; anyone who navigates
  // here directly must still be turned away.
  if (!me || !isAdminOrAbove(me)) redirect("/");

  // Only what TeamRoster/AddAccountForm render — skips profile_photo_url
  // and created_at, which this page never touches.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, role, is_owner, position, tracks_attendance")
    .order("is_owner", { ascending: false })
    .limit(200)
    .returns<TeamProfile[]>();

  return (
    <div>
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="mb-1 text-xl font-extrabold sm:text-[22px] md:text-2xl">Team</h1>
        <p className="text-sm text-muted-foreground">
          Accounts, positions, access, and attendance tracking
        </p>
      </div>

      <AddAccountForm />
      <TeamRoster profiles={profiles ?? []} />
    </div>
  );
}

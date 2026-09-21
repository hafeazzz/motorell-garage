import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamRoster } from "./TeamRoster";
import { AddAccountForm } from "./AddAccountForm";
import type { TeamProfile } from "@/types/database";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("is_owner")
    .eq("id", user!.id)
    .single();

  // Server-side guard — the nav link is hidden for non-owners, but that's
  // only a UI convenience. Anyone who navigates here directly must still
  // be turned away, since RLS alone won't stop them from *viewing* this
  // page (only from calling the owner-only actions on it).
  if (!me?.is_owner) redirect("/");

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
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Team</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Accounts, positions, access, and attendance tracking
        </div>
      </div>

      <AddAccountForm />
      <TeamRoster profiles={profiles ?? []} />
    </div>
  );
}

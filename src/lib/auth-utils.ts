import { createClient } from "@/lib/supabase/server";
import { isOwner, isAdminOrAbove, canAccessFinancials, canManageUsers } from "@/types/database";
import type { Profile } from "@/types/database";

/** Signed-in user's profile row, or throws if there isn't one. For use at the top of server actions. */
export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) throw new Error("No profile found for this account");

  return profile;
}

export async function requireOwner(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) throw new Error("Only the owner can do this");
  return profile;
}

/** Owner or admin. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!isAdminOrAbove(profile)) throw new Error("Only an owner or admin can do this");
  return profile;
}

/** Owner, admin, or manager — gate for financial reads/writes. */
export async function requireFinancialAccess(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!canAccessFinancials(profile)) {
    throw new Error("Only an owner, admin, or manager can access financial data");
  }
  return profile;
}

/** Owner or admin — gate for adding/editing/removing team accounts. */
export async function requireCanManageUsers(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!canManageUsers(profile)) throw new Error("Only an owner or admin can manage team accounts");
  return profile;
}

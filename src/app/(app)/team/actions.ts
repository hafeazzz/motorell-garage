"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireCanManageUsers } from "@/lib/auth-utils";
import type { Role } from "@/types/database";

export async function updatePosition(profileId: string, position: string) {
  await requireCanManageUsers();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ position }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function updateRole(profileId: string, role: Role) {
  await requireCanManageUsers();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function updateTracksAttendance(profileId: string, tracksAttendance: boolean) {
  await requireCanManageUsers();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ tracks_attendance: tracksAttendance })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
  revalidatePath("/absen");
}

export async function renameProfile(profileId: string, name: string) {
  await requireCanManageUsers();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function deleteAccount(profileId: string) {
  await requireCanManageUsers();
  // Deleting the auth user (service role only) cascades to `profiles`
  // via its `on delete cascade` foreign key.
  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function createAccount(formData: FormData) {
  await requireCanManageUsers();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "staff") as Role;
  const position = String(formData.get("position") || "Mechanic");
  const tracksAttendance = formData.get("tracks_attendance") === "on";

  if (!email || !password || !name) throw new Error("Name, email, and password are required.");

  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    name,
    role,
    is_owner: false,
    position,
    tracks_attendance: tracksAttendance,
  });
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/team");
}

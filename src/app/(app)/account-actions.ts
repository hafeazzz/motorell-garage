"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentProfile } from "@/lib/auth-utils";

// Self-service account actions: every signed-in user can change THEIR OWN
// name, photo and password. The target is always the signed-in user (never
// an id from the client), so nobody can touch someone else's account here.

export async function updateMyName(name: string) {
  await getCurrentProfile();
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Nama minimal 2 karakter.");
  if (trimmed.length > 60) throw new Error("Nama maksimal 60 karakter.");

  // rename_self() (schema.sql) is the only write path RLS gives a non-owner
  // to their own profiles row, and it only ever touches the name column.
  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_self", { new_name: trimmed });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

/**
 * photoUrl comes from a client-side Storage upload; it must be a public URL
 * inside THIS user's own folder of our bucket (or null to remove the photo).
 * profile_photo_url isn't writable by non-owners under RLS, so the write
 * uses the service role — after this check and scoped to the caller's id.
 */
export async function updateMyPhoto(photoUrl: string | null) {
  const profile = await getCurrentProfile();

  if (photoUrl !== null) {
    const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unit-photos/profiles/${profile.id}/`;
    if (!photoUrl.startsWith(allowedPrefix)) throw new Error("Foto tidak valid.");
  }

  const { error } = await createServiceRoleClient()
    .from("profiles")
    .update({ profile_photo_url: photoUrl })
    .eq("id", profile.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  await getCurrentProfile();
  if (newPassword.length < 8) throw new Error("Password baru minimal 8 karakter.");
  if (newPassword === currentPassword) throw new Error("Password baru harus berbeda dari yang lama.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Akun ini tidak punya email.");

  // Re-check the current password first, so a borrowed unlocked phone
  // can't be used to quietly change it.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) throw new Error("Password saat ini salah.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

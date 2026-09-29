"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

export async function signIn(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();

  // Temporary diagnostic timing — this runs server-side (the "handleLogin"
  // the brief asked for doesn't exist here; sign-in is this Server Action,
  // not a client-side function), so the output lands in the terminal
  // running `next dev` / the Vercel function log, not the browser console.
  // Remove once you're done diagnosing.
  const authStart = performance.now();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  console.log(`[signIn] signInWithPassword took ${(performance.now() - authStart).toFixed(0)}ms`);

  if (error) {
    return { error: "Email or password is incorrect." };
  }

  redirect("/");
}

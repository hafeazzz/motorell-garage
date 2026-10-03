import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

// One auth check + one profile read per request, shared by the (app)
// layout, the page, and any server action — React's cache() dedupes calls
// within a single request. Before this, a single tab tap ran getUser() (a
// network round trip to Supabase Auth) three times: in proxy.ts, the
// layout, and the page, plus the same profiles query twice.
//
// getClaims() verifies the session JWT locally against the project's
// published signing keys (ES256), so it costs no Auth round trip.

export const getSessionUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
  // PGRST116 = no rows — the genuine no-profile case. Anything else (RLS,
  // network) is logged so it doesn't silently look like "no profile".
  if (error && error.code !== "PGRST116") console.error("getMyProfile: lookup failed for", userId, error);
  return data;
});

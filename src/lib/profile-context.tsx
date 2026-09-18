"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/types/database";

const ProfileContext = createContext<Profile | null>(null);

export function ProfileProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

/** Current signed-in user's profile row. Only usable inside the (app) layout. */
export function useProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) {
    throw new Error("useProfile() must be used within the authenticated (app) layout");
  }
  return profile;
}

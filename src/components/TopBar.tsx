"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/profile-context";

export function TopBar() {
  const profile = useProfile();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 18px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: "linear-gradient(135deg,#4A2A63,#E4715A)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Motorell</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
            Garage
          </span>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        title="Sign out"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 14,
          color: "#fff",
          background: profile.profile_photo_url
            ? `url(${profile.profile_photo_url}) center/cover`
            : "linear-gradient(135deg,#4A2A63,#E4715A)",
        }}
      >
        {!profile.profile_photo_url && initial}
      </button>
    </div>
  );
}

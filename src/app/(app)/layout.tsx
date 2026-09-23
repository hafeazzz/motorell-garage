import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileProvider } from "@/lib/profile-context";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import type { Profile } from "@/types/database";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // middleware.ts already redirects signed-out visitors to /login, but
  // Server Components can't assume that ran, so check again here.
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError) {
    // PGRST116 = "no rows" — that's the genuine no-profile case. Anything
    // else (RLS denial, permission error, network blip) got misreported as
    // "no profile" before this log existed, with zero trail to debug it.
    // Check your terminal / Vercel function logs for this line.
    console.error("(app)/layout: profile lookup failed for user", user.id, profileError);
  }

  if (!profile) {
    // Auth user exists but either there's no profiles row for them yet, or
    // the query above errored (see the log line right above this).
    redirect("/login?error=no-profile");
  }

  return (
    <ProfileProvider profile={profile}>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          background: "#000",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 430,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-app)",
          }}
        >
          <TopBar />
          <main style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 18px 30px" }}>
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </ProfileProvider>
  );
}

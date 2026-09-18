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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    // Auth user exists but nobody made them a profiles row yet —
    // ask the owner to add them from the Team page.
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

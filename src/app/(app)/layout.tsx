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
      {/* Mobile stays the original 430px phone-app shell; md+/lg+ widen the
          same shell (still bottom-nav, no sidebar) so grids inside pages
          have real room instead of just centering a phone-width column on
          a big screen. */}
      <div className="flex min-h-screen justify-center bg-background">
        <div className="flex h-screen w-full max-w-[430px] flex-col bg-card md:max-w-2xl lg:max-w-4xl">
          <TopBar />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-8 lg:px-10">
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </ProfileProvider>
  );
}

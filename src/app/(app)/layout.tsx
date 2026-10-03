import { redirect } from "next/navigation";
import { getMyProfile, getSessionUserId } from "@/lib/session";
import { ProfileProvider } from "@/lib/profile-context";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects signed-out visitors to /login, but Server
  // Components can't assume that ran, so check again here. Both calls are
  // cached per request — the page reuses them for free.
  if (!(await getSessionUserId())) redirect("/login");

  const profile = await getMyProfile();
  // Signed in, but no profiles row (or the lookup failed — getMyProfile
  // logs that case).
  if (!profile) redirect("/login?error=no-profile");

  return (
    <ProfileProvider profile={profile}>
      {/* App shell: pinned to the visible viewport (fixed inset-0, not just
          h-dvh) so on phones nothing but <main> can ever move — no rubber-band
          drag of the whole page, no top bar sliding away, no pull-to-refresh
          jolt. overscroll-contain keeps <main>'s own bounce from chaining out
          to the browser. */}
      <div className="app-shell fixed inset-0 flex flex-col bg-card">
        <TopBar />
        <main className="app-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 sm:px-6 md:px-8 lg:px-10">
          {children}
        </main>
        <BottomNav />
      </div>
    </ProfileProvider>
  );
}

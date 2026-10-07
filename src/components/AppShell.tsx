"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GarageStoreProvider, useGarage } from "@/lib/store";
import { ProfileProvider } from "@/lib/profile-context";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

// The whole signed-in app, Motorell Ops style: the shell (top bar, bottom
// nav) is static, the data loads once into the store, and every page
// renders from memory. proxy.ts still guards every route on the server and
// RLS still guards every row — this only changes WHEN data is fetched.
export function AppShell({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Reads the session from the auth cookie — no network round trip.
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session?.user.id) setUserId(data.session.user.id);
        else window.location.replace("/login");
      });
  }, []);

  const onNoProfile = useCallback(() => window.location.replace("/login?error=no-profile"), []);

  if (!userId) return <ShellSkeleton />;
  return (
    <GarageStoreProvider userId={userId} fallback={<ShellSkeleton />} onNoProfile={onNoProfile}>
      <LoadedShell>{children}</LoadedShell>
    </GarageStoreProvider>
  );
}

function LoadedShell({ children }: { children: React.ReactNode }) {
  const { data } = useGarage();
  return (
    <ProfileProvider profile={data.profile}>
      {/* App shell: pinned to the visible viewport (fixed inset-0) so on
          phones nothing but <main> can ever move — no rubber-band drag of
          the whole page, no top bar sliding away, no pull-to-refresh jolt. */}
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

// First-open loading screen (the only one — after this, nothing waits).
function ShellSkeleton() {
  return (
    <div className="app-shell fixed inset-0 flex flex-col items-center justify-center gap-4 bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo */}
      <img src="/logo.png" alt="Motorell" className="size-14 animate-pulse rounded-2xl" />
      <div className="text-sm text-muted-foreground">Memuat Motorell Garage…</div>
    </div>
  );
}

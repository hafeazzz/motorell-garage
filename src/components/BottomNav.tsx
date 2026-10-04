"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Package, FileBarChart, Users, ClipboardCheck } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { cn } from "@/lib/utils";
import { canAccessInventory, isAdminOrAbove } from "@/types/database";
import type { Profile } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  visible: (p: Pick<Profile, "role" | "is_owner" | "position">) => boolean;
};

// Tabs are filtered by role so nobody sees a tab that proxy.ts would just
// bounce them away from. Inspeksi is open to everyone signed in — mechanics
// do the inspecting and the whole team can watch it live.
const ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, visible: () => true },
  { href: "/absen", label: "Attendance", icon: Clock, visible: () => true },
  { href: "/inspeksi", label: "Inspeksi", icon: ClipboardCheck, visible: () => true },
  { href: "/inventori", label: "Inventori", icon: Package, visible: canAccessInventory },
  { href: "/laporan", label: "Report", icon: FileBarChart, visible: isAdminOrAbove },
  { href: "/team", label: "Team", icon: Users, visible: isAdminOrAbove },
];

function matches(href: string, path: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const profile = useProfile();
  // The tapped tab lights up immediately, like a native tab bar — not only
  // once the server has answered and the URL has actually changed.
  // Remembered together with the path it was tapped from, so it expires by
  // itself the moment the URL changes (no effect needed).
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);

  const items = ITEMS.filter((i) => i.visible(profile));
  const activeHref =
    pending && pending.from === pathname ? pending.href : items.find((i) => matches(i.href, pathname))?.href;

  return (
    <nav className="app-chrome flex flex-none justify-between gap-1 border-t border-border bg-[#0A0A0D] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6 md:justify-center md:gap-8 md:pt-3 md:pb-4 lg:gap-12">
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={() => {
              if (pathname !== item.href) setPending({ href: item.href, from: pathname });
            }}
            draggable={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold transition-[color,transform] duration-150 active:scale-90 sm:text-[11px] md:flex-none md:px-3",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200",
                active && "bg-primary/15 text-primary"
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
            </span>
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

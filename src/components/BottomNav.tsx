"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Package, FileBarChart, Users, Wallet, ClipboardCheck } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { cn } from "@/lib/utils";
import { canAccessFinancials } from "@/types/database";
import type { Profile } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  visible: (p: Pick<Profile, "role" | "is_owner">) => boolean;
};

// Tabs are filtered by role so nobody sees a tab that proxy.ts would just
// bounce them away from. Owner/admin/manager reach Inspeksi from the
// Inventori page; staff (who can't open Inventori) get it as a tab.
const ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, visible: () => true },
  { href: "/absen", label: "Attendance", icon: Clock, visible: () => true },
  { href: "/inspeksi", label: "Inspeksi", icon: ClipboardCheck, visible: (p) => !canAccessFinancials(p) },
  { href: "/inventori", label: "Inventori", icon: Package, visible: canAccessFinancials },
  { href: "/finance", label: "Finance", icon: Wallet, visible: canAccessFinancials },
  { href: "/laporan", label: "Report", icon: FileBarChart, visible: canAccessFinancials },
  { href: "/team", label: "Team", icon: Users, visible: (p) => p.is_owner },
];

export function BottomNav() {
  const pathname = usePathname();
  const profile = useProfile();

  const items = ITEMS.filter((i) => i.visible(profile));

  return (
    <nav className="flex flex-none justify-between gap-1 border-t border-border bg-[#0A0A0D] px-2.5 pt-3 pb-4 sm:px-6 md:justify-center md:gap-8 lg:gap-12">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-0.5 py-1 text-[11px] transition-colors md:flex-none md:px-3",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.3 : 1.8} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

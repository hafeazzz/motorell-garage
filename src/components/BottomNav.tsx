"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Wallet, FileBarChart, Users } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/absen", label: "Attendance", icon: Clock },
  { href: "/keuangan", label: "Finance", icon: Wallet },
  { href: "/laporan", label: "Report", icon: FileBarChart },
];

export function BottomNav() {
  const pathname = usePathname();
  const profile = useProfile();

  const items = profile.is_owner ? [...ITEMS, { href: "/team", label: "Team", icon: Users }] : ITEMS;

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

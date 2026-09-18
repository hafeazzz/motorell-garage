"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/lib/profile-context";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/absen", label: "Attendance" },
  { href: "/keuangan", label: "Finance" },
  { href: "/laporan", label: "Report" },
];

export function BottomNav() {
  const pathname = usePathname();
  const profile = useProfile();

  const items = profile.is_owner ? [...ITEMS, { href: "/team", label: "Team" }] : ITEMS;

  return (
    <nav
      style={{
        flex: "none",
        background: "#0A0A0D",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        justifyContent: "space-between",
        padding: "12px 10px 16px",
      }}
    >
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              padding: "4px 2px",
              color: active ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

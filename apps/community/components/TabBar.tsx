"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "SOS" },
  { href: "/route", label: "Route" },
  { href: "/report", label: "Report" },
  { href: "/alerts", label: "Alerts" },
] as const;

export function TabBar() {
  const path = usePathname();

  return (
    <nav className="tab" aria-label="Ramani safety">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

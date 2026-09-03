"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAlert, IconReport, IconRoute, IconSos } from "./Icons";

const TABS = [
  { href: "/", label: "SOS", icon: IconSos },
  { href: "/route", label: "Route", icon: IconRoute },
  { href: "/report", label: "Report", icon: IconReport },
  { href: "/alerts", label: "Alerts", icon: IconAlert },
] as const;

export function TabBar() {
  const path = usePathname();

  return (
    <nav className="tab" aria-label="Ramani safety">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} className={active ? "tab-item active" : "tab-item"} aria-current={active ? "page" : undefined}>
            <span className="tab-pill">
              <span className="tab-icon">
                <Icon size={22} />
              </span>
              {active ? <span>{tab.label}</span> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

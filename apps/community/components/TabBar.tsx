"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAlert, IconReport, IconRoute, IconSos } from "./Icons";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";

const TABS: { href: string; labelKey: MessageKey; icon: typeof IconSos }[] = [
  { href: "/", labelKey: "tab.sos", icon: IconSos },
  { href: "/route", labelKey: "tab.route", icon: IconRoute },
  { href: "/report", labelKey: "tab.report", icon: IconReport },
  { href: "/alerts", labelKey: "tab.alerts", icon: IconAlert },
];

export function TabBar() {
  const path = usePathname();
  const { t } = useI18n();

  return (
    <nav className="tab" aria-label={t("nav.safety")}>
      {TABS.map((tab) => {
        const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} className={active ? "tab-item active" : "tab-item"} aria-current={active ? "page" : undefined}>
            <span className="tab-pill">
              <span className="tab-icon">
                <Icon size={22} />
              </span>
              {active ? <span>{t(tab.labelKey)}</span> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

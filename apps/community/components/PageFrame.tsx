"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabBar } from "./TabBar";
import { IconBell } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSelect } from "./LanguagePicker";
import { maskPhone, readPhone } from "@/lib/location";
import { useI18n } from "@/lib/i18n";

export function PageFrame({
  children,
  hero,
}: {
  children: ReactNode;
  hero?: ReactNode;
}) {
  const path = usePathname();
  const home = path === "/";
  const [phone, setPhone] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    setPhone(readPhone());
  }, [path]);

  return (
    <div className="app">
      <div className="app-body">
        <header className={home ? "mast mast-home" : "mast mast-inner"}>
          <div className="topbar">
            <Link href="/" className="brand-lockup" aria-label="Ramani home">
              <img src="/logo.svg" alt="" width={36} height={36} />
              <span>
                <strong>Ramani</strong>
                <em>{t("brand.tag")}</em>
              </span>
            </Link>
            <div className="topbar-end">
              <LanguageSelect compact />
              <Link href="/onboard" className="loc">
                <span>
                  <small>{t("header.yourNumber")}</small>
                  {phone ? maskPhone(phone) : t("header.addPhone")}
                </span>
              </Link>
              <ThemeToggle />
              <Link href="/alerts" className="icon-btn" aria-label={t("header.alerts")}>
                <IconBell />
              </Link>
            </div>
          </div>
          {hero}
        </header>
        <div className="sheet">{children}</div>
      </div>
      <TabBar />
    </div>
  );
}

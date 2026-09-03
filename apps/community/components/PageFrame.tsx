"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabBar } from "./TabBar";
import { IconBell } from "./Icons";
import { maskPhone, readPhone } from "@/lib/location";

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
                <em>Climate safety</em>
              </span>
            </Link>
            <div className="topbar-end">
              <Link href="/onboard" className="loc">
                <span>
                  <small>Your number</small>
                  {phone ? maskPhone(phone) : "Add phone"}
                </span>
              </Link>
              <Link href="/alerts" className="icon-btn" aria-label="Alerts">
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

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { USSD_CODE } from "@/lib/api";
import { IconPhone, IconWhatsApp } from "./Icons";

export function UssdFallback({ extra }: { extra?: string }) {
  return (
    <>
      <div className="ussd-card">
        <span className="ussd-icon">
          <IconPhone />
        </span>
        <div>
          <strong>No data? Use any phone</strong>
          <p>
            Dial <b>{USSD_CODE}</b>
            {extra ? ` — ${extra}` : " — same four options as this app."}
          </p>
        </div>
      </div>
      <Link className="ussd-card" href="/whatsapp">
        <span className="ussd-icon">
          <IconWhatsApp />
        </span>
        <div>
          <strong>WhatsApp Ramani</strong>
          <p>Log SOS, a hazard, or a route first — then send the ready text to a leader.</p>
        </div>
      </Link>
    </>
  );
}

export function ActionCard({
  href,
  title,
  hint,
  icon,
}: {
  href: string;
  title: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <Link href={href} className="action-card">
      <span className="action-icon">{icon}</span>
      <span>
        <b>{title}</b>
        <small>{hint}</small>
      </span>
      <span className="chev" aria-hidden>
        ›
      </span>
    </Link>
  );
}

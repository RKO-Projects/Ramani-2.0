"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { USSD_CODE, WHATSAPP_NUMBER } from "@/lib/api";
import { IconPhone } from "./Icons";

export function UssdFallback({ extra }: { extra?: string }) {
  const wa = WHATSAPP_NUMBER.replace(/\D/g, "");
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
      {wa ? (
        <a className="ussd-card" href={`https://wa.me/${wa}?text=${encodeURIComponent("SOS")}`}>
          <span className="ussd-icon">WA</span>
          <div>
            <strong>WhatsApp Ramani</strong>
            <p>Send SOS, a hazard, or drop a pin. Leaders get the same alert as ops.</p>
          </div>
        </a>
      ) : (
        <div className="ussd-card">
          <span className="ussd-icon">WA</span>
          <div>
            <strong>WhatsApp channel</strong>
            <p>Ask a community leader for the Ramani WhatsApp. Text SOS plus your landmark.</p>
          </div>
        </div>
      )}
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

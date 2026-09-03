"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { USSD_CODE } from "@/lib/api";
import { IconPhone, IconWhatsApp } from "./Icons";
import { useI18n } from "@/lib/i18n";

export function UssdFallback({ extra }: { extra?: string }) {
  const { t } = useI18n();
  return (
    <>
      <div className="ussd-card">
        <span className="ussd-icon">
          <IconPhone />
        </span>
        <div>
          <strong>{t("ussd.title")}</strong>
          <p>
            {t("ussd.body", { code: USSD_CODE })}
            {extra ? ` — ${extra}` : ` — ${t("ussd.same")}`}
          </p>
        </div>
      </div>
      <Link className="ussd-card" href="/whatsapp">
        <span className="ussd-icon">
          <IconWhatsApp />
        </span>
        <div>
          <strong>{t("ussd.waTitle")}</strong>
          <p>{t("ussd.waBody")}</p>
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

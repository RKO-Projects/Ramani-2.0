"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type PublicTicket, whatsappHref } from "@/lib/api";
import { speakRoute } from "@/lib/speak";
import { ProcessSteps } from "./ProcessSteps";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";

export function TicketPanel({
  ticketId,
  routeText,
  placeName,
}: {
  ticketId: string;
  routeText?: string;
  placeName?: string;
}) {
  const { t } = useI18n();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setTicket(await api<PublicTicket>(`/api/v1/tickets/${ticketId}`));
    } catch {
      setError(t("ticket.fail"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    const iv = window.setInterval(() => {
      void refresh();
    }, 6000);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const wa = ticket
    ? whatsappHref(
        `SOS ${ticket.kind} at ${ticket.landmark_id ?? "my area"}. Medical: ${ticket.needs_medical ? "yes" : "no"}.`,
      )
    : null;

  const statusKey: MessageKey =
    ticket?.status === "acknowledged" || ticket?.status === "dispatched"
      ? "ticket.ack"
      : ticket?.status === "resolved"
        ? "ticket.resolved"
        : ticket?.status === "open"
          ? "ticket.open"
          : "ticket.logged";
  const steps =
    ticket?.status === "resolved"
      ? [t("ticket.res1"), t("ticket.res2"), t("ticket.res3")]
      : ticket?.status === "acknowledged" || ticket?.status === "dispatched"
        ? [t("ticket.ack1"), t("ticket.ack2"), t("ticket.ack3")]
        : [t("ticket.open1"), t("ticket.open2"), t("ticket.open3"), t("ticket.open4")];

  return (
    <div className="msg heard">
      <strong>{t("ticket.title")}</strong>
      <p>{t("ticket.status", { status: t(statusKey), place: placeName || ticket?.landmark_id || "" })}</p>
      {ticket ? <ProcessSteps steps={steps} current={ticket.status === "open" ? 0 : 2} /> : null}
      {routeText ? (
        <>
          <p>{routeText}</p>
          <button className="speak" type="button" onClick={() => speakRoute(routeText)}>
            {t("route.speak")}
          </button>
        </>
      ) : null}
      <div className="follow">
        <Link className="speak" href="/route">
          {t("ticket.read")}
        </Link>
        {wa ? (
          <a className="speak" href={wa} target="_blank" rel="noreferrer">
            {t("ticket.forward")}
          </a>
        ) : (
          <Link className="speak" href={`/whatsapp?ticket=${ticketId}`}>
            {t("ticket.wa")}
          </Link>
        )}
        <button className="speak" type="button" disabled={busy} onClick={() => void refresh()}>
          {busy ? t("ticket.checking") : t("ticket.check")}
        </button>
      </div>
      {error ? <p className="hint">{error}</p> : null}
    </div>
  );
}

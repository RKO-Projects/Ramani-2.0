"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type PublicTicket, whatsappHref } from "@/lib/api";
import { speakRoute } from "@/lib/speak";
import { ProcessSteps } from "./ProcessSteps";

export function TicketPanel({
  ticketId,
  routeText,
}: {
  ticketId: string;
  routeText?: string;
}) {
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setTicket(await api<PublicTicket>(`/api/v1/tickets/${ticketId}`));
    } catch {
      setError("Could not refresh this ticket. Keep the ID — ops still has it.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [ticketId]);

  const wa = ticket
    ? whatsappHref(
        `SOS ${ticket.kind} at ${ticket.landmark_id ?? "my landmark"}. Medical: ${ticket.needs_medical ? "yes" : "no"}. Ticket ${ticket.id}.`,
      )
    : null;

  return (
    <div className="msg">
      <strong>Ticket {ticketId.slice(0, 8)}</strong>
      <p>
        Status: {ticket?.status ?? "logged"}. Hashed landmark only — responders are alerted on WhatsApp.
      </p>
      {ticket ? <ProcessSteps steps={ticket.next_steps} current={ticket.status === "open" ? 0 : 2} /> : null}
      {routeText ? (
        <>
          <p>{routeText}</p>
          <button className="speak" type="button" onClick={() => speakRoute(routeText)}>
            Read route aloud
          </button>
        </>
      ) : null}
      <div className="follow">
        <button className="speak" type="button" disabled={busy} onClick={() => void refresh()}>
          {busy ? "Checking…" : "Check ticket status"}
        </button>
        {wa ? (
          <a className="speak" href={wa} target="_blank" rel="noreferrer">
            Forward on WhatsApp
          </a>
        ) : (
          <Link className="speak" href={`/whatsapp?ticket=${ticketId}`}>
            WhatsApp this ticket
          </Link>
        )}
        <Link className="speak" href="/route">
          Read the route
        </Link>
      </div>
      {error ? <p className="hint">{error}</p> : null}
    </div>
  );
}

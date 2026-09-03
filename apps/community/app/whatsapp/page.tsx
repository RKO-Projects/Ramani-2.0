"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { PageFrame } from "@/components/PageFrame";
import { ProcessSteps } from "@/components/ProcessSteps";
import { TicketPanel } from "@/components/TicketPanel";
import { UssdFallback } from "@/components/UssdFallback";
import {
  api,
  type SosKind,
  type WhatsAppDispatch,
  type WhatsAppGuide,
  whatsappHref,
} from "@/lib/api";
import { readPhone } from "@/lib/location";
import { useLandmarks } from "@/lib/useLandmarks";
import { storageKeys, writeJson } from "@/lib/storage";

type Action = "sos" | "hazard" | "route";

const LABELS: Record<Action, { title: string; hint: string }> = {
  sos: { title: "SOS", hint: "Logs a ticket, then opens a ready WhatsApp text" },
  hazard: { title: "Blocked path", hint: "Logs a hazard so routes avoid it" },
  route: { title: "Need a route", hint: "Computes a dry path, then shares the shout-text" },
};

export default function WhatsAppPage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="lede">Preparing WhatsApp…</p>
        </PageFrame>
      }
    >
      <WhatsAppInner />
    </Suspense>
  );
}

function WhatsAppInner() {
  const params = useSearchParams();
  const { landmarks, landmarkId, select } = useLandmarks();
  const [guide, setGuide] = useState<WhatsAppGuide | null>(null);
  const [action, setAction] = useState<Action>((params.get("action") as Action) || "sos");
  const [kind, setKind] = useState<SosKind>("flood_trapped");
  const [medical, setMedical] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WhatsAppDispatch | null>(null);
  const ticketPrefill = params.get("ticket");

  useEffect(() => {
    api<WhatsAppGuide>("/api/v1/whatsapp/guide")
      .then(setGuide)
      .catch(() => {
        setGuide({
          configured: false,
          number: null,
          steps: [
            "Pick SOS, a blocked path, or a route request.",
            "We log the same ticket ops sees.",
            "Then send the ready text in WhatsApp, or copy it to a leader.",
          ],
          templates: {},
        });
      });
  }, []);

  useEffect(() => {
    const next = params.get("action");
    if (next === "sos" || next === "hazard" || next === "route") setAction(next);
  }, [params]);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const payload = await api<WhatsAppDispatch>("/api/v1/whatsapp/dispatch", {
        method: "POST",
        body: JSON.stringify({
          action,
          kind: action === "hazard" ? "blocked_drainage" : kind,
          landmark_id: landmarkId,
          phone: readPhone() || null,
          needs_medical: medical,
          ticket_id: action === "sos" ? ticketPrefill : undefined,
        }),
      });
      setResult(payload);
      if (payload.id && payload.type === "sos") writeJson(storageKeys.ticket, { id: payload.id, kind, status: payload.status ?? "open", source: "whatsapp" });
      if (payload.wa_url) window.open(payload.wa_url, "_blank");
    } catch {
      setError("Could not log this WhatsApp packet. You can still copy a message below.");
    } finally {
      setBusy(false);
    }
  }

  const fallbackText =
    action === "hazard"
      ? `HAZARD blocked_drainage at ${landmarkId}. Treat the path as unsafe.`
      : action === "route"
        ? `Need evacuation route from ${landmarkId} to high ground.`
        : `SOS ${kind} at ${landmarkId}. Medical: ${medical ? "yes" : "no"}.`;
  const href = result?.wa_url || whatsappHref(result?.message || fallbackText, result?.number || guide?.number || undefined);

  return (
    <PageFrame>
      <div className="section-head">
        <h2>WhatsApp</h2>
      </div>
      <p className="lede">
        Not just a button. We log the same SOS or hazard ops sees, then hand you a ready text.
      </p>
      <ProcessSteps steps={guide?.steps ?? ["Pick SOS, hazard, or route.", "We log the ticket.", "Send the ready WhatsApp text."]} current={result ? 2 : 0} />
      <div className="actions stack">
        {(Object.keys(LABELS) as Action[]).map((item) => (
          <button
            key={item}
            type="button"
            className={action === item ? "action-card selected" : "action-card"}
            onClick={() => {
              setAction(item);
              setResult(null);
            }}
          >
            <span>
              <b>{LABELS[item].title}</b>
              <small>{LABELS[item].hint}</small>
            </span>
          </button>
        ))}
      </div>
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      {action === "sos" ? (
        <>
          <label className="field">
            <span className="label">SOS type</span>
            <span className="field-box">
              <select value={kind} onChange={(event) => setKind(event.target.value as SosKind)}>
                <option value="flood_trapped">Flood / trapped</option>
                <option value="collapse_fire">Collapse / fire</option>
                <option value="medical">Medical</option>
                <option value="stuck_debris">Stuck by debris</option>
                <option value="stuck_location">Stuck in location</option>
                <option value="car_flooding">Car flooding</option>
              </select>
            </span>
          </label>
          <label className="triage">
            <input type="checkbox" checked={medical} onChange={(event) => setMedical(event.target.checked)} />
            <span>Anyone injured / needs medical help?</span>
          </label>
        </>
      ) : null}
      <button className="primary" type="button" disabled={busy} onClick={() => void run()}>
        {busy ? "Logging…" : "Log and open WhatsApp"}
      </button>
      {result ? (
        <div className="msg">
          <strong>{result.type.toUpperCase()} packet ready</strong>
          <p>{result.message}</p>
          <ProcessSteps steps={result.steps} current={1} />
          <div className="follow">
            {href ? (
              <a className="speak" href={href} target="_blank" rel="noreferrer">
                Open WhatsApp
              </a>
            ) : (
              <button className="speak" type="button" onClick={() => navigator.clipboard.writeText(result.message)}>
                Copy for a leader
              </button>
            )}
          </div>
        </div>
      ) : null}
      {result?.id && result.type === "sos" ? <TicketPanel ticketId={result.id} /> : null}
      {error ? <p className="err">{error}</p> : null}
      <p className="hint">
        Incoming WhatsApp to the Ramani number is parsed the same way: SOS, HAZARD, or “need evacuation route”.
      </p>
      <UssdFallback extra="if WhatsApp is down, option 1–4 still work." />
    </PageFrame>
  );
}

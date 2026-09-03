"use client";

import { useEffect, useState } from "react";
import { AlertStrip } from "@/components/AlertStrip";
import { ActionCard, UssdFallback } from "@/components/UssdFallback";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { PageFrame } from "@/components/PageFrame";
import { ProcessSteps } from "@/components/ProcessSteps";
import { SchemaMap } from "@/components/SchemaMap";
import { TicketPanel } from "@/components/TicketPanel";
import { IconAlert, IconReport, IconRoute, IconWhatsApp } from "@/components/Icons";
import { api, ApiError, idempotencyKey, type RouteResult, type SosEvent, type SosKind } from "@/lib/api";
import { maskPhone, readPhone } from "@/lib/location";
import { speakRoute } from "@/lib/speak";
import { useLandmarks } from "@/lib/useLandmarks";
import { readJson, storageKeys, writeJson } from "@/lib/storage";

const KINDS: { id: SosKind; label: string; hint: string }[] = [
  { id: "flood_trapped", label: "Flood / trapped", hint: "Water is rising or you cannot leave" },
  { id: "collapse_fire", label: "Collapse / fire", hint: "Structure or fire emergency" },
  { id: "medical", label: "Medical", hint: "Someone needs urgent care" },
  { id: "stuck_debris", label: "Stuck by debris", hint: "Blocked by mud, rubble, or wreckage" },
  { id: "stuck_location", label: "Stuck in location", hint: "Cannot move from where you are" },
  { id: "car_flooding", label: "Car flooding", hint: "Vehicle is taking on water" },
];

const SOS_STEPS = [
  "Pick your area on the schematic (or confirm it below).",
  "Tap SOS and choose what is happening.",
  "We log a ticket and alert leaders on WhatsApp.",
  "Stay put if moving is unsafe — then check the ticket.",
];

export default function HomePage() {
  const { landmarks, landmarkId, select } = useLandmarks();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [routeText, setRouteText] = useState("");
  const [offline, setOffline] = useState(false);
  const [phone, setPhone] = useState("");
  const [needsMedical, setNeedsMedical] = useState(false);
  const [ticketId, setTicketId] = useState(() => readJson<SosEvent>(storageKeys.ticket)?.id ?? "");

  const place = landmarks.find((item) => item.id === landmarkId);

  useEffect(() => {
    setPhone(readPhone());
  }, []);

  async function send(kind: SosKind) {
    setBusy(true);
    setStatus("");
    setOk(false);
    setRouteText("");
    setOffline(false);
    const injured = needsMedical || kind === "medical";
    try {
      const event = await api<SosEvent>("/api/v1/sos", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({
          kind,
          landmark_id: landmarkId,
          source: "pwa",
          phone: phone || null,
          needs_medical: injured,
        }),
      });
      writeJson(storageKeys.ticket, event);
      setTicketId(event.id);
      setOk(true);
      setStatus(`Ticket ${event.id.slice(0, 8)} logged from ${place?.name ?? "your landmark"}.`);
      setOpen(false);
      try {
        const route = await api<RouteResult>("/api/v1/routes", {
          method: "POST",
          body: JSON.stringify({ from_landmark: landmarkId }),
        });
        writeJson(storageKeys.route, route);
        setRouteText(route.ussd_text);
      } catch {
        /* SOS still counts */
      }
    } catch (error) {
      setOffline(error instanceof ApiError && error.status === 0);
      setStatus("Could not reach Ramani. Use WhatsApp or dial *384*55# option 1.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame>
      <SchemaMap hereId={landmarkId} onSelect={select} />
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <AlertStrip />

      <section id="sos">
        <div className="section-head">
          <h2>Send SOS</h2>
        </div>
        <p className="hint">
          Four steps. Landmark hash only — no live map tiles. Callback {phone ? maskPhone(phone) : "your number"} is hashed on the server.
        </p>
        <ProcessSteps steps={SOS_STEPS} current={ticketId ? 3 : 1} />
        <button className="sos" type="button" disabled={busy} onClick={() => setOpen(true)}>
          SOS
        </button>
        {status ? <p className={ok ? "msg" : "err"}>{status}</p> : null}
        {ticketId ? <TicketPanel ticketId={ticketId} routeText={routeText} /> : null}
        {routeText && !ticketId ? (
          <div className="msg">
            <p>{routeText}</p>
            <button className="speak" type="button" onClick={() => speakRoute(routeText)}>
              Read route aloud
            </button>
          </div>
        ) : null}
        {offline ? <p className="hint">If the app is offline, WhatsApp or *384*55# still work.</p> : null}
      </section>

      <section>
        <div className="section-head">
          <h2>Next actions</h2>
        </div>
        <div className="actions">
          <ActionCard href="/route" title="Get a route" hint="Text + voice, then WhatsApp" icon={<IconRoute />} />
          <ActionCard href="/report" title="Report hazard" hint="Updates live routes" icon={<IconReport />} />
          <ActionCard href="/alerts" title="Danger areas" hint="Alarm lights + outlook" icon={<IconAlert />} />
          <ActionCard href="/whatsapp" title="WhatsApp" hint="Log, then send the text" icon={<IconWhatsApp />} />
        </div>
      </section>

      <UssdFallback extra="option 1 is Emergency SOS." />

      {open ? (
        <div className="sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="sos-title">
          <div className="sheet-card">
            <h2 id="sos-title">What is happening?</h2>
            <p className="lede">
              Sending from {place?.name ?? "your landmark"}. Leaders get a WhatsApp alert with a ticket ID.
            </p>
            <label className="triage">
              <input
                type="checkbox"
                checked={needsMedical}
                onChange={(event) => setNeedsMedical(event.target.checked)}
              />
              <span>Is anyone injured / needs medical help?</span>
            </label>
            {KINDS.map((kind) => (
              <button key={kind.id} className="choice" type="button" disabled={busy} onClick={() => send(kind.id)}>
                <b>{kind.label}</b>
                <small>{kind.hint}</small>
              </button>
            ))}
            <button className="choice ghost" type="button" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}

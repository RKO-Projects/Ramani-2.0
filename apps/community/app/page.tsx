"use client";

import { useState } from "react";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { UssdFallback } from "@/components/UssdFallback";
import { api, ApiError, idempotencyKey, type RouteResult, type SosKind } from "@/lib/api";
import { useLandmarks } from "@/lib/useLandmarks";
import { storageKeys, writeJson } from "@/lib/storage";

const KINDS: { id: SosKind; label: string; hint: string }[] = [
  { id: "flood_trapped", label: "Flood / trapped", hint: "Water is rising or you cannot leave" },
  { id: "collapse_fire", label: "Collapse / fire", hint: "Structure or fire emergency" },
  { id: "medical", label: "Medical", hint: "Someone needs urgent care" },
];

export default function SosPage() {
  const { landmarks, landmarkId, select } = useLandmarks();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [routeText, setRouteText] = useState("");
  const [offline, setOffline] = useState(false);
  const [phone, setPhone] = useState("");

  const place = landmarks.find((item) => item.id === landmarkId)?.name ?? landmarkId;

  async function send(kind: SosKind) {
    setBusy(true);
    setStatus("");
    setRouteText("");
    setOffline(false);
    try {
      await api("/api/v1/sos", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({
          kind,
          landmark_id: landmarkId,
          source: "pwa",
          phone: phone.trim() || null,
        }),
      });
      setStatus(`SOS logged from ${place}. Stay on higher ground. Responders can see this.`);
      setOpen(false);
      try {
        const route = await api<RouteResult>("/api/v1/routes", {
          method: "POST",
          body: JSON.stringify({ from_landmark: landmarkId }),
        });
        writeJson(storageKeys.route, route);
        setRouteText(route.ussd_text);
      } catch {
        /* SOS still counts without a route */
      }
    } catch (error) {
      setOffline(error instanceof ApiError && error.status === 0);
      setStatus("Could not reach Ramani. Dial *384*55# option 1.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="steps">1 of 4 · same as USSD option 1</p>
      <h1>Emergency SOS</h1>
      <p className="lede">Pick the landmark you are nearest. Then send. No account.</p>
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <label className="label" htmlFor="phone">
        SMS confirm (optional)
      </label>
      <input
        id="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+2547…"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />
      <div className="row">
        <button className="sos" type="button" disabled={busy} onClick={() => setOpen(true)}>
          SOS
        </button>
      </div>
      {status ? <p className={status.startsWith("Could") ? "err" : "msg"}>{status}</p> : null}
      {routeText ? <p className="msg">{routeText}</p> : null}
      {offline ? <p className="offline">Last landmark saved on this phone. Try again when the signal returns.</p> : null}
      <UssdFallback extra="Option 1 is Emergency SOS." />

      {open ? (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sos-title">
          <div className="sheet-card">
            <h2 id="sos-title">Send SOS from {place}?</h2>
            <p className="lede">This notifies the ops desk. Choose the emergency type.</p>
            <div className="row">
              {KINDS.map((kind) => (
                <button
                  key={kind.id}
                  className={kind.id === "flood_trapped" ? "sos" : "secondary"}
                  type="button"
                  disabled={busy}
                  onClick={() => send(kind.id)}
                >
                  {kind.label}
                  <div className="offline">{kind.hint}</div>
                </button>
              ))}
              <button className="secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

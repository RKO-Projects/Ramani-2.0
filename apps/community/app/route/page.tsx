"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { PageFrame } from "@/components/PageFrame";
import { ProcessSteps } from "@/components/ProcessSteps";
import { UssdFallback } from "@/components/UssdFallback";
import { api, ApiError, type RouteResult, type WhatsAppDispatch } from "@/lib/api";
import { useLandmarks } from "@/lib/useLandmarks";
import { readJson, storageKeys, writeJson } from "@/lib/storage";
import { speakRoute, stopSpeaking } from "@/lib/speak";
import { readPhone } from "@/lib/location";

const STEPS = [
  "Confirm the area you are in.",
  "Get a dry-path route to high ground.",
  "Hear it, send it on WhatsApp, or report if a stretch is blocked.",
];

export default function RoutePage() {
  const { landmarks, landmarkId, select } = useLandmarks();
  const [result, setResult] = useState<RouteResult | null>(() => readJson<RouteResult>(storageKeys.route));
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wa, setWa] = useState<WhatsAppDispatch | null>(null);

  useEffect(() => {
    const saved = readJson<RouteResult>(storageKeys.route);
    if (saved) {
      setResult(saved);
      setCached(true);
    }
  }, []);

  async function load() {
    setBusy(true);
    setError("");
    setCached(false);
    setWa(null);
    try {
      const data = await api<RouteResult>("/api/v1/routes", {
        method: "POST",
        body: JSON.stringify({ from_landmark: landmarkId }),
      });
      writeJson(storageKeys.route, data);
      setResult(data);
    } catch (err) {
      const saved = readJson<RouteResult>(storageKeys.route);
      if (saved) {
        setResult(saved);
        setCached(true);
        setError("Could not refresh. Showing the last route saved on this phone.");
      } else if (err instanceof ApiError && err.status === 409) {
        setError(err.message || "Routes are not ready. Dial *384*55# option 2.");
      } else {
        setError("No route yet. Dial *384*55# option 2 or send the request on WhatsApp.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function shareWhatsApp() {
    setBusy(true);
    try {
      const payload = await api<WhatsAppDispatch>("/api/v1/whatsapp/dispatch", {
        method: "POST",
        body: JSON.stringify({
          action: "route",
          landmark_id: landmarkId,
          phone: readPhone() || null,
        }),
      });
      setWa(payload);
      if (payload.wa_url) window.open(payload.wa_url, "_blank");
    } catch {
      setError("Could not prepare WhatsApp. Copy the route text to a leader.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame>
      <div className="section-head">
        <h2>Evacuation route</h2>
      </div>
      <p className="lede">A path you can shout — or hear on this phone. Not turn-by-turn GPS.</p>
      <ProcessSteps steps={STEPS} current={result ? 2 : 0} />
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <button className="primary" type="button" disabled={busy} onClick={load}>
        {busy ? "Finding a dry path…" : "Get safe route"}
      </button>
      {result ? (
        <div className={cached ? "msg warn" : "msg"}>
          <strong>Route ready</strong>
          <p>{result.ussd_text}</p>
          <div className="follow">
            <button className="speak" type="button" onClick={() => speakRoute(`${result.ussd_text}. ${result.disclaimer}`)}>
              Read route aloud
            </button>
            <button className="speak" type="button" onClick={stopSpeaking}>
              Stop
            </button>
            <button className="speak" type="button" disabled={busy} onClick={() => void shareWhatsApp()}>
              Send on WhatsApp
            </button>
            <Link className="speak" href="/report">
              Path is blocked
            </Link>
          </div>
          {result.names?.length ? (
            <div className="names">
              {result.names.map((name) => (
                <span className="chip" key={name}>
                  {name}
                </span>
              ))}
            </div>
          ) : null}
          <p className="hint">{result.disclaimer}</p>
        </div>
      ) : null}
      {wa ? (
        <div className="msg">
          <strong>WhatsApp packet</strong>
          <p>{wa.message}</p>
          {wa.wa_url ? (
            <a className="speak" href={wa.wa_url} target="_blank" rel="noreferrer">
              Open WhatsApp
            </a>
          ) : (
            <button className="speak" type="button" onClick={() => navigator.clipboard.writeText(wa.message)}>
              Copy text for a leader
            </button>
          )}
        </div>
      ) : null}
      {error ? <p className="err">{error}</p> : null}
      <UssdFallback extra="option 2 is Evacuation route." />
    </PageFrame>
  );
}

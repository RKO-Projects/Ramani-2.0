"use client";

import { useEffect, useState } from "react";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { PageFrame } from "@/components/PageFrame";
import { UssdFallback } from "@/components/UssdFallback";
import { api, ApiError, type RouteResult } from "@/lib/api";
import { useLandmarks } from "@/lib/useLandmarks";
import { readJson, storageKeys, writeJson } from "@/lib/storage";
import { speakRoute, stopSpeaking } from "@/lib/speak";

export default function RoutePage() {
  const { landmarks, landmarkId, select } = useLandmarks();
  const [result, setResult] = useState<RouteResult | null>(() => readJson<RouteResult>(storageKeys.route));
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);

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
        setError("No route yet. Dial *384*55# option 2.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame>
      <div className="section-head">
        <h2>Evacuation route</h2>
      </div>
      <p className="lede">A path you can shout — or hear on this phone with no data. Not turn-by-turn GPS.</p>
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <button className="primary" type="button" disabled={busy} onClick={load}>
        {busy ? "Finding a dry path…" : "Get safe route"}
      </button>
      {result ? (
        <div className={cached ? "msg warn" : "msg"}>
          <strong>Route available</strong>
          <p>{result.ussd_text}</p>
          <button className="speak" type="button" onClick={() => speakRoute(`${result.ussd_text}. ${result.disclaimer}`)}>
            Read route aloud
          </button>
          <button className="choice ghost" type="button" onClick={stopSpeaking}>
            Stop
          </button>
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
      {error ? <p className="err">{error}</p> : null}
      <UssdFallback extra="option 2 is Evacuation route." />
    </PageFrame>
  );
}

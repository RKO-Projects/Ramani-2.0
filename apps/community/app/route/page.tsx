"use client";

import { useEffect, useState } from "react";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { UssdFallback } from "@/components/UssdFallback";
import { api, ApiError, type RouteResult } from "@/lib/api";
import { useLandmarks } from "@/lib/useLandmarks";
import { readJson, storageKeys, writeJson } from "@/lib/storage";

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
        setError(err.message || "Routes are not ready. Dial *384*55# option 2 if you can.");
      } else {
        setError("No route yet. Dial *384*55# option 2.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="steps">2 of 4 · same as USSD option 2</p>
      <h1>Evacuation route</h1>
      <p className="lede">Text only — the path a neighbour can shout. Not turn-by-turn GPS.</p>
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <div className="row">
        <button className="btn teal" type="button" disabled={busy} onClick={load}>
          {busy ? "Finding a dry path…" : "Get safe landmark route"}
        </button>
      </div>
      {result ? (
        <div className={cached ? "msg warn" : "msg"}>
          {result.ussd_text}
          {result.names?.length ? (
            <div className="names">
              {result.names.map((name) => (
                <span className="chip" key={name}>
                  {name}
                </span>
              ))}
            </div>
          ) : null}
          <p className="offline" style={{ marginTop: 12 }}>
            {result.disclaimer}
          </p>
        </div>
      ) : null}
      {error ? <p className="err">{error}</p> : null}
      <UssdFallback extra="Option 2 is Evacuation route." />
    </>
  );
}

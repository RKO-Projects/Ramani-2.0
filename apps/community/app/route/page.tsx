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
<<<<<<< HEAD
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = readJson<RouteResult>(storageKeys.route);
    if (saved) {
      setResult(saved);
      setCached(true);
    }
  }, []);
=======
  const [loading, setLoading] = useState(false);
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)

  async function load() {
    setBusy(true);
    setError("");
<<<<<<< HEAD
    setCached(false);
=======
    setLoading(true);
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)
    try {
      const data = await api<RouteResult>("/api/v1/routes", {
        method: "POST",
        body: JSON.stringify({ from_landmark: landmarkId }),
      });
      writeJson(storageKeys.route, data);
      setResult(data);
<<<<<<< HEAD
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
=======
    } catch {
      setError("No route yet. Start the backend or use USSD option 2.");
      setResult(null);
    } finally {
      setLoading(false);
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)
    }
  }

  const selectedLandmark = LANDMARKS.find(l => l.id === from);

  return (
    <>
<<<<<<< HEAD
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
=======
      <h1>🗺️ Evacuation Route</h1>
      
      <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 20px 0" }}>
        Get safe directions to emergency shelter and relief areas
      </p>

      <div className="section">
        <label className="label">📍 You are near</label>
        <select 
          value={from} 
          onChange={(event) => setFrom(event.target.value)}
          disabled={loading}
        >
          {LANDMARKS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        
        {selectedLandmark && (
          <div style={{
            background: "rgba(14, 124, 102, 0.05)",
            border: "1px solid rgba(14, 124, 102, 0.1)",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            marginTop: "8px",
            fontSize: "13px",
            color: "var(--teal)"
          }}>
            📍 Selected: <strong>{selectedLandmark.name}</strong>
          </div>
        )}
      </div>

      <div className="row">
        <button 
          className="btn teal" 
          onClick={load}
          disabled={loading}
          style={{ position: "relative" }}
        >
          {loading && <span className="loading"></span>}
          {loading ? "Finding Route..." : "Get Safe Route"}
        </button>
      </div>

      {result && (
        <div className="msg">
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 700 }}>
            ✓ Route Available
          </h3>
          <p style={{ margin: "12px 0", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
            {result.ussd_text}
          </p>
          <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.2)", margin: "16px 0" }} />
          <p style={{ margin: "12px 0", fontSize: "13px", opacity: 0.9 }}>
            <strong>⚠️ Important:</strong> {result.disclaimer}
          </p>
        </div>
      )}

      {error && <p className="err">{error}</p>}

      <div className="card success" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px 0", color: "var(--teal)", fontSize: "16px" }}>
          💡 Evacuation Tips
        </h3>
        <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "13px", color: "var(--muted)", lineHeight: "1.7" }}>
          <li>Leave immediately when instructed</li>
          <li>Follow marked evacuation routes</li>
          <li>Bring important documents and medications</li>
          <li>Help vulnerable neighbors if possible</li>
          <li>Check in with emergency contacts</li>
          <li>Never attempt to cross flooded areas</li>
        </ul>
      </div>
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)
    </>
  );
}

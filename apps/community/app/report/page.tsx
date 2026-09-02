"use client";

import { useState } from "react";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { UssdFallback } from "@/components/UssdFallback";
import { api, hazardNeighbor, idempotencyKey, type HazardKind } from "@/lib/api";
import { useLandmarks } from "@/lib/useLandmarks";

const KINDS = [
  { id: "blocked_drainage", label: "🚰 Blocked drainage", icon: "🚰", detail: "Water can't flow properly" },
  { id: "rising_water", label: "🌊 Rising flood water", icon: "🌊", detail: "Water level increasing rapidly" },
  { id: "damaged_structure", label: "🏚️ Damaged structure", icon: "🏚️", detail: "Building or infrastructure damage" },
];

export default function ReportPage() {
  const { landmarks, landmarkId, select } = useLandmarks();
  const [kind, setKind] = useState<HazardKind>("blocked_drainage");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setStatus("");
    setStatusType("");
    try {
      await api("/api/v1/hazards", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({
          kind,
          from_landmark: landmarkId,
          to_landmark: hazardNeighbor(landmarkId, landmarks),
          source: "pwa",
        }),
      });
      setStatus("✓ Report received. The live map and routes will treat that area as unsafe.");
      setStatusType("success");
    } catch {
      setStatus("✗ Could not send. Try USSD option 3.");
      setStatusType("error");
    } finally {
      setBusy(false);
    }
  }

  const selectedKind = KINDS.find(k => k.id === kind);

  return (
    <>
      <h1>📋 Report a Hazard</h1>
      
      <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 20px 0" }}>
        Help the community stay safe by reporting hazards in real-time
      </p>

      <div className="section">
        <label className="label">⚠️ What is happening?</label>
        <div style={{ display: "grid", gap: "10px" }}>
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              style={{
                padding: "14px 16px",
                textAlign: "left",
                border: kind === k.id ? "2px solid var(--teal)" : "2px solid var(--light-gray)",
                background: kind === k.id ? "rgba(14, 124, 102, 0.05)" : "white",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer",
                transition: "var(--transition)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
              disabled={busy}
            >
              <span style={{ fontSize: "24px" }}>{k.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{k.label}</div>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>{k.detail}</div>
              </div>
              {kind === k.id && <span style={{ fontSize: "18px" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <label className="label">📍 Location - near</label>
        <select 
          value={from} 
          onChange={(event) => setFrom(event.target.value)}
          disabled={busy}
        >
          {LANDMARKS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="row">
        <button 
          className="btn teal" 
          onClick={submit}
          disabled={busy}
          style={{ position: "relative" }}
        >
          {busy && <span className="loading"></span>}
          {busy ? "Sending..." : "Send Report"}
        </button>
      </div>

      {status && (
        <div className={statusType === "error" ? "err" : "msg"}>
          {status}
        </div>
      )}

      <div className="card success">
        <h3 style={{ margin: "0 0 12px 0", color: "var(--teal)", fontSize: "16px" }}>
          💡 Reporting Guidelines
        </h3>
        <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "13px", color: "var(--muted)", lineHeight: "1.7" }}>
          <li>Be specific about the hazard type</li>
          <li>Identify the nearest landmark accurately</li>
          <li>Report in real-time for maximum impact</li>
          <li>Your report helps protect neighbors</li>
        </ul>
      </div>
    </>
  );
}

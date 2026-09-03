"use client";

import { useEffect, useState } from "react";
import type { Paginated, DamageReport, Landmark } from "@/lib/api";
import MapView from "./MapView";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import RadialGauge from "./RadialGauge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? "";

export default function AfterView() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [error, setError] = useState<string | null>(null);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  useEffect(() => {
    const load = async () => {
      try {
        const [dmgRes, lmRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/damage?limit=200`, { headers, cache: "no-store" }),
          fetch(`${API_URL}/api/v1/landmarks`, { cache: "no-store" }),
        ]);
        if (dmgRes.ok) {
          const data: Paginated<DamageReport> = await dmgRes.json();
          setReports(data.items);
        } else {
          setError("Failed to load damage reports");
        }
        if (lmRes.ok) setLandmarks(await lmRes.json());
      } catch {
        setError("Backend offline — start FastAPI on :8000");
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lmMap = new Map(landmarks.map((lm) => [lm.id, lm]));

  // Counts by zone
  const zoneCounts = new Map<string, number>();
  reports.forEach((r) => {
    const lm = lmMap.get(r.landmark_id);
    const zone = lm?.zone ?? "Unknown";
    zoneCounts.set(zone, (zoneCounts.get(zone) ?? 0) + 1);
  });

  const verifiedCount = reports.filter((r) => r.verified).length;
  const unverifiedCount = reports.length - verifiedCount;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Post-disaster loss</h1>
          <p className="lede">
            Ground-verified community reports from the first 72 hours. Satellite change detection is a second check.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ color: "var(--urgent)", fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>
      )}

      {/* Radial Stats Row */}
      <div className="radial-stats-row">
        <div className="radial-stat-card">
          <RadialGauge
            value={reports.length}
            max={Math.max(reports.length, 10)}
            label="TOTAL REPORTS"
            variant="teal"
          />
          <div className="stat-card-text">
            <span className="stat-card-title">Damage Field Reports</span>
            <span className="stat-card-desc">Logged via PWA &amp; field ops</span>
          </div>
        </div>

        <div className="radial-stat-card">
          <RadialGauge
            value={verifiedCount}
            max={Math.max(reports.length, 1)}
            label="VERIFIED"
            variant="ok"
          />
          <div className="stat-card-text">
            <span className="stat-card-title">Officer Confirmed</span>
            <span className="stat-card-desc">Ground verification complete</span>
          </div>
        </div>

        <div className="radial-stat-card">
          <RadialGauge
            value={unverifiedCount}
            max={Math.max(reports.length, 1)}
            label="UNVERIFIED"
            variant={unverifiedCount > 0 ? "warn" : "neutral"}
          />
          <div className="stat-card-text">
            <span className="stat-card-title">Pending Verification</span>
            <span className="stat-card-desc">Needs field assessment</span>
          </div>
        </div>

        <div className="radial-stat-card">
          <RadialGauge
            value={zoneCounts.size}
            max={10}
            label="AFFECTED ZONES"
            variant={zoneCounts.size > 0 ? "urgent" : "neutral"}
          />
          <div className="stat-card-text">
            <span className="stat-card-title">Impacted Clusters</span>
            <span className="stat-card-desc">Active damage pins</span>
          </div>
        </div>
      </div>

      <div className="grid-map-panel-wide">
        {/* Map */}
        <MapView overlays={{ landmarks, damage: reports }} />

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          {/* Zone breakdown */}
          {zoneCounts.size > 0 && (
            <div className="card">
              <h3>Damage Concentration by Zone</h3>
              {[...zoneCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([zone, count]) => (
                  <div key={zone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ fontWeight: 500 }}>{zone}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bar" style={{ width: 80, height: 4 }}>
                        <span style={{ width: `${Math.min((count / reports.length) * 100, 100)}%` }} />
                      </div>
                      <span style={{ fontWeight: 700, fontFamily: "DM Mono", fontSize: 13 }}>{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Reports table */}
          <div className="card" style={{ flex: 1, overflow: "auto" }}>
            <div className="card-header">
              <h2>Damage Ledger</h2>
              <span className="queue-count">{reports.length} TOTAL</span>
            </div>

            {reports.length === 0 ? (
              <EmptyState icon="📋" title="No damage reports" message="Reports will appear after a flood event" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Landmark</th>
                      <th>Zone</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => {
                      const lm = lmMap.get(r.landmark_id);
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, textTransform: "capitalize" }}>
                            {r.kind.replaceAll("_", " ")}
                          </td>
                          <td>{lm?.name ?? r.landmark_id}</td>
                          <td style={{ color: "var(--paper-muted)", fontFamily: "DM Mono", fontSize: 12 }}>{lm?.zone ?? "—"}</td>
                          <td style={{ color: "var(--paper-muted)", fontSize: 11, fontFamily: "DM Mono" }}>
                            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <StatusBadge variant={r.verified ? "verified" : "unverified"} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

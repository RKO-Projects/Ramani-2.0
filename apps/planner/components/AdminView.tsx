"use client";

import { useEffect, useState } from "react";
import type { SettlementInfo, IngestionStatus } from "@/lib/api";
import EmptyState from "./EmptyState";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? "";

export default function AdminView() {
  const [settlements, setSettlements] = useState<SettlementInfo[]>([]);
  const [runs, setRuns] = useState<IngestionStatus[]>([]);
  const [ingestLoading, setIngestLoading] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const fetchData = async () => {
    try {
      const [settRes, runsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/admin/settlements`, { headers, cache: "no-store" }),
        fetch(`${API_URL}/api/v1/admin/ingest/runs`, { headers, cache: "no-store" }),
      ]);
      if (settRes.ok) setSettlements(await settRes.json());
      if (runsRes.ok) setRuns(await runsRes.json());
    } catch {
      setError("Backend offline — start FastAPI on :8000");
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerIngest = async (type: "ghacof" | "map") => {
    setIngestLoading(type);
    setIngestResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/ingest/${type}`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data: IngestionStatus = await res.json();
        setIngestResult(`✓ ${type.toUpperCase()} INGEST COMPLETE: ${data.records} records (confidence: ${(data.confidence * 100).toFixed(0)}%)`);
        fetchData();
      } else {
        setError(`Ingest failed: ${res.status}`);
      }
    } catch {
      setError(`Failed to trigger ${type} ingest`);
    } finally {
      setIngestLoading(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>System admin</h1>
          <p className="lede">Ingestion, active settlements, and audit logs.</p>
        </div>
      </div>

      {error && (
        <div style={{ color: "var(--urgent)", fontSize: 13, marginBottom: 12, fontFamily: "DM Mono" }}>⚠ {error}</div>
      )}
      {ingestResult && (
        <div style={{ color: "var(--ok)", fontSize: 13, marginBottom: 12, fontFamily: "DM Mono" }}>{ingestResult}</div>
      )}

      {/* Ingest Actions */}
      <div className="admin-actions">
        <div className="admin-action-card">
          <h3>GHACOF Seasonal Outlook</h3>
          <p>Fetch the latest ICPAC seasonal outlook and recalculate baseline CVI weights and zone scores.</p>
          <button
            className="btn btn-primary"
            onClick={() => triggerIngest("ghacof")}
            disabled={ingestLoading !== null}
          >
            {ingestLoading === "ghacof" ? <span className="spinner" /> : "⚡ Trigger GHACOF Ingest"}
          </button>
        </div>
        <div className="admin-action-card">
          <h3>OSM Map &amp; Traces</h3>
          <p>Re-import OpenStreetMap landmarks, drainage trace geometries, and walking path networks.</p>
          <button
            className="btn btn-primary"
            onClick={() => triggerIngest("map")}
            disabled={ingestLoading !== null}
          >
            {ingestLoading === "map" ? <span className="spinner" /> : "🌐 Ingest Map Traces"}
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Ingestion Runs */}
        <div className="card">
          <div className="card-header">
            <h2>Pipeline Execution Log</h2>
            <span className="queue-count">{runs.length} RUNS LOGGED</span>
          </div>
          {runs.length === 0 ? (
            <EmptyState icon="📦" title="No ingestion runs logged" />
          ) : (
            <div className="table-wrap">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Records</th>
                    <th>Confidence</th>
                    <th>Ver.</th>
                    <th>Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: "var(--paper)" }}>{run.source}</td>
                      <td>{run.records}</td>
                      <td>
                        <span style={{ color: run.confidence >= 0.8 ? "var(--ok)" : run.confidence >= 0.5 ? "var(--warn)" : "var(--urgent)" }}>
                          {(run.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td style={{ color: "var(--paper-muted)" }}>v{run.geometry_version}</td>
                      <td style={{ color: "var(--paper-muted)", fontSize: 11 }}>
                        {run.finished_at ? new Date(run.finished_at).toLocaleTimeString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Settlements */}
        <div className="card">
          <div className="card-header">
            <h2>Active Settlements</h2>
            <span className="queue-count">{settlements.length} TOTAL</span>
          </div>
          {settlements.length === 0 ? (
            <EmptyState icon="🏘️" title="No settlements" message="Backend needs seed data" />
          ) : (
            <div className="table-wrap">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Node ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: "var(--paper)" }}>{s.name}</td>
                      <td style={{ color: "var(--paper-muted)", fontSize: 11 }}>{s.id}</td>
                      <td>
                        <span className={`pill ${s.active ? "verified" : "unverified"}`}>
                          {s.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

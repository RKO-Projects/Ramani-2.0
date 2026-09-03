"use client";

import { useEffect, useState } from "react";
import type { CviResponse, CviZone, Landmark, CviLayer } from "@/lib/api";
import MapView from "./MapView";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function BeforeView() {
  const [cvi, setCvi] = useState<CviResponse | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [layers, setLayers] = useState<CviLayer[]>([]);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cviRes, lmRes, layerRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/cvi`, { cache: "no-store" }),
          fetch(`${API_URL}/api/v1/landmarks`, { cache: "no-store" }),
          fetch(`${API_URL}/api/v1/cvi/layers`, { cache: "no-store" }),
        ]);
        if (cviRes.ok) setCvi(await cviRes.json());
        else setError("Failed to load CVI data");
        if (lmRes.ok) setLandmarks(await lmRes.json());
        if (layerRes.ok) {
          const data = await layerRes.json();
          setLayers(data.layers ?? []);
        }
      } catch {
        setError("Backend offline — start FastAPI on :8000");
      }
    };
    load();
  }, []);

  const zones = cvi?.zones
    ? [...cvi.zones].sort((a, b) => b.cvi - a.cvi)
    : [];

  const criticalHigh = zones.filter((z) => z.priority === "critical" || z.priority === "high");

  return (
    <>
      <h1>Climate Vulnerability Index (CVI)</h1>
      <p className="lede">
        {cvi
          ? `${cvi.outlook} · ${cvi.tercile.replaceAll("_", " ")}. Ranked zones by vulnerability — prioritize drain clearance &amp; structural reinforcement prior to flood onset.`
          : error ?? "Loading CVI data…"}
      </p>

      <div className="grid-map-panel-wide">
        {/* Map with CVI layer */}
        <MapView
          overlays={{
            landmarks,
            cviZones: activeLayer ? zones : undefined,
            cviLayer: activeLayer,
          }}
        />

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          {/* Layer toggles */}
          <div className="card">
            <h3>Interactive Heatmap Layers</h3>
            <div className="layer-toggles">
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  className={`btn btn-sm btn-ghost${activeLayer === layer.id ? " active" : ""}`}
                  onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
                >
                  {layer.label}
                </button>
              ))}
              {layers.length === 0 && (
                <span style={{ color: "var(--paper-muted)", fontSize: 12 }}>No layers available</span>
              )}
            </div>
          </div>

          {/* Clear this drain first callout */}
          {criticalHigh.length > 0 && (
            <div className="urgent-callout-card">
              <div className="urgent-callout-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Clear Drainage Stretch First</span>
              </div>
              {criticalHigh.slice(0, 4).map((zone) => (
                <div key={zone.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px dashed rgba(244, 63, 94, 0.2)" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{zone.name}</span>
                  <StatusBadge variant={zone.priority} label={`${zone.priority} · ${zone.cvi.toFixed(2)}`} />
                </div>
              ))}
            </div>
          )}

          {/* CVI Ranked List */}
          <div className="card" style={{ flex: 1, overflow: "auto" }}>
            <div className="card-header">
              <h2>Zone Vulnerability Rankings</h2>
              <span className="queue-count">{zones.length} ZONES</span>
            </div>

            {zones.length === 0 ? (
              <EmptyState icon="📊" title="No CVI data" message="Run the backend to score zones" />
            ) : (
              zones.map((zone) => (
                <div key={zone.id} className="cvi-zone-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="cvi-zone-name">{zone.name}</div>
                      <StatusBadge variant={zone.priority} label={`${zone.cvi.toFixed(2)}`} />
                    </div>
                    <div className="bar">
                      <span style={{ width: `${Math.round(zone.cvi * 100)}%` }} />
                    </div>
                    <div className="cvi-zone-scores" style={{ marginTop: 6 }}>
                      <span>drain: {zone.drainage_proximity.toFixed(2)}</span>
                      <span>struct: {zone.structural_density.toFixed(2)}</span>
                      <span>elev: {zone.elevation_slope.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Weights */}
          {cvi?.weights && (
            <div className="card">
              <h3>Index Model Weights (Read-Only)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Object.entries(cvi.weights).map(([key, val]) => (
                  <div key={key} style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--paper-muted)", fontFamily: "DM Mono" }}>
                      {key.replaceAll("_", " ")}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "var(--teal-bright)", fontFamily: "DM Mono" }}>
                      {(val as number).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

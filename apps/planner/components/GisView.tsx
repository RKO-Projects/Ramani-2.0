"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type AlertStatus,
  type AreaMap,
  type CviResponse,
  type Paginated,
  type SosEvent,
  type HazardEvent,
  type Landmark,
} from "@/lib/api";
import MapView, { type MapLayerId, type MapLayers } from "./MapView";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? "";

const LAYER_LABELS: { id: MapLayerId; label: string }[] = [
  { id: "sos", label: "SOS" },
  { id: "hazards", label: "Hazards" },
  { id: "infra", label: "Infra" },
  { id: "cvi", label: "CVI" },
  { id: "routes", label: "Routes" },
  { id: "elNino", label: "El Niño" },
];

export default function GisView() {
  return (
    <Suspense fallback={<p className="lede">Loading map…</p>}>
      <GisInner />
    </Suspense>
  );
}

function GisInner() {
  const params = useSearchParams();
  const focusId = params.get("sos");
  const [sosEvents, setSosEvents] = useState<SosEvent[]>([]);
  const [hazards, setHazards] = useState<HazardEvent[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [cvi, setCvi] = useState<CviResponse | null>(null);
  const [areas, setAreas] = useState<AreaMap | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [layers, setLayers] = useState<MapLayers>({
    sos: true,
    hazards: true,
    infra: true,
    cvi: false,
    routes: true,
    elNino: false,
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  useEffect(() => {
    fetch(`${API_URL}/api/v1/landmarks`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).then(setLandmarks).catch(() => {});
    fetch(`${API_URL}/api/v1/cvi`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setCvi).catch(() => {});
    fetch(`${API_URL}/api/v1/areas`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setAreas).catch(() => {});
    fetch(`${API_URL}/api/v1/alerts`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AlertStatus | null) => {
        if (data?.el_nino_mode) setLayers((prev) => ({ ...prev, elNino: true }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [sosRes, hazRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/sos?limit=200`, { headers, cache: "no-store" }),
          fetch(`${API_URL}/api/v1/hazards?limit=100`, { headers, cache: "no-store" }),
        ]);
        if (sosRes.ok) {
          const data: Paginated<SosEvent> = await sosRes.json();
          setSosEvents(data.items);
        }
        if (hazRes.ok) {
          const data: Paginated<HazardEvent> = await hazRes.json();
          setHazards(data.items);
        }
      } catch { /* silent */ }
    };
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!focusId || !landmarks.length || !sosEvents.length) return;
    const sos = sosEvents.find((row) => row.id === focusId);
    const lm = sos?.landmark_id ? landmarks.find((row) => row.id === sos.landmark_id) : null;
    if (lm) setFlyTo([lm.lon, lm.lat]);
  }, [focusId, landmarks, sosEvents]);

  const lmMap = new Map(landmarks.map((lm) => [lm.id, lm]));
  const zones = cvi ? [...cvi.zones].sort((a, b) => b.cvi - a.cvi) : [];
  const helpPoints = (areas?.nodes.flatMap((node) => node.help) ?? []).filter(
    (row, i, all) => all.findIndex((item) => item.id === row.id) === i,
  );

  return (
    <div className="map-page">
      <div className="page-head">
        <div>
          <h1>GIS map</h1>
          <p className="lede">SOS pins, hazards, toilets / Red Cross, CVI, and El Niño runoff. Dispatch stays on During.</p>
        </div>
        <div className="page-links">
          <Link className="btn btn-primary" href="/">SOS queue</Link>
          <Link className="btn btn-ghost" href="/intel">Policy intel</Link>
        </div>
      </div>
      <div className="map-toolbar">
        {LAYER_LABELS.map((layer) => (
          <button
            key={layer.id}
            className={`btn btn-sm btn-ghost${layers[layer.id] ? " active" : ""}`}
            onClick={() => setLayers((prev) => ({ ...prev, [layer.id]: !prev[layer.id] }))}
          >
            {layer.label}
          </button>
        ))}
        <label className={`elnino-switch${layers.elNino ? " on" : ""}`}>
          <input
            type="checkbox"
            checked={Boolean(layers.elNino)}
            onChange={(e) => setLayers((prev) => ({ ...prev, elNino: e.target.checked }))}
          />
          El Niño runoff
        </label>
      </div>
      <div className="map-stage">
        <MapView
          overlays={{
            landmarks,
            sosEvents,
            hazards,
            cviZones: zones,
            cviLayer: layers.cvi ? "flood" : null,
            floodEdges: areas?.edges,
            helpPoints,
          }}
          layers={layers}
          flyTo={flyTo}
          onSosClick={(sos) => {
            const lm = sos.landmark_id ? lmMap.get(sos.landmark_id) : null;
            if (lm) setFlyTo([lm.lon, lm.lat]);
          }}
        />
      </div>
    </div>
  );
}

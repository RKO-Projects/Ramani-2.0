"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  AlertStatus,
  AreaMap,
  CviResponse,
  DamageReport,
  HazardEvent,
  Landmark,
  Paginated,
  SosEvent,
} from "@/lib/api";
import IntelligencePanel from "./IntelligencePanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? "";

export default function IntelView() {
  const [sosEvents, setSosEvents] = useState<SosEvent[]>([]);
  const [hazards, setHazards] = useState<HazardEvent[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [cvi, setCvi] = useState<CviResponse | null>(null);
  const [areas, setAreas] = useState<AreaMap | null>(null);
  const [alert, setAlert] = useState<AlertStatus | null>(null);
  const [damage, setDamage] = useState<DamageReport[]>([]);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  useEffect(() => {
    fetch(`${API_URL}/api/v1/landmarks`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).then(setLandmarks).catch(() => {});
    fetch(`${API_URL}/api/v1/cvi`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setCvi).catch(() => {});
    fetch(`${API_URL}/api/v1/areas`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setAreas).catch(() => {});
    fetch(`${API_URL}/api/v1/alerts`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setAlert).catch(() => {});
    fetch(`${API_URL}/api/v1/sos?limit=200`, { headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: Paginated<SosEvent>) => setSosEvents(data.items ?? []))
      .catch(() => {});
    fetch(`${API_URL}/api/v1/hazards?limit=100`, { headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: Paginated<HazardEvent>) => setHazards(data.items ?? []))
      .catch(() => {});
    fetch(`${API_URL}/api/v1/damage?limit=100`, { headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: Paginated<DamageReport>) => setDamage(data.items ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zones = cvi ? [...cvi.zones].sort((a, b) => b.cvi - a.cvi) : [];
  const helpPoints = (areas?.nodes.flatMap((node) => node.help) ?? []).filter(
    (row, i, all) => all.findIndex((item) => item.id === row.id) === i,
  );

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h1>Policy &amp; budget intel</h1>
          <p className="lede">Drain-clearance ranking, council brief, and amenity impact. CVI detail is on Before; the loss ledger is on After.</p>
        </div>
        <div className="page-links">
          <Link className="btn btn-ghost" href="/before">CVI</Link>
          <Link className="btn btn-ghost" href="/after">Loss ledger</Link>
        </div>
      </div>
      <IntelligencePanel
        zones={zones}
        hazards={hazards}
        sosEvents={sosEvents}
        damage={damage}
        helpPoints={helpPoints}
        landmarks={landmarks}
        alert={alert}
      />
    </div>
  );
}

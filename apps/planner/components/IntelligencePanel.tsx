"use client";

import Link from "next/link";
import type { AlertStatus, CviZone, DamageReport, HazardEvent, HelpPoint, Landmark, SosEvent } from "@/lib/api";
import StatusBadge from "./StatusBadge";

export default function IntelligencePanel({
  zones,
  hazards,
  sosEvents,
  damage,
  helpPoints,
  landmarks,
  alert,
}: {
  zones: CviZone[];
  hazards: HazardEvent[];
  sosEvents: SosEvent[];
  damage: DamageReport[];
  helpPoints: HelpPoint[];
  landmarks: Landmark[];
  alert: AlertStatus | null;
}) {
  const lmMap = new Map(landmarks.map((lm) => [lm.id, lm]));
  const drains = [...zones]
    .sort((a, b) => b.drainage_proximity - a.drainage_proximity || b.cvi - a.cvi)
    .slice(0, 4);
  const openSos = sosEvents.filter((s) => s.status === "open" || s.status === "acknowledged" || s.status === "dispatched");
  const medical = sosEvents.filter((s) => s.needs_medical && s.status !== "resolved").length;
  const topZone = zones[0];
  const lossUsd = (zone: CviZone) => (0.35 + zone.cvi * 1.55).toFixed(1);
  const drainM = (zone: CviZone) => Math.round(28 + zone.drainage_proximity * 90);

  const compromised = helpPoints.filter((help) =>
    hazards.some((h) => h.from_landmark === help.landmark_id || h.to_landmark === help.landmark_id)
    || damage.some((d) => d.landmark_id === help.landmark_id),
  );

  const brief = [
    alert?.el_nino_mode ? "El Niño mode is on — treat flood-prone alleys as blocked." : (alert?.headline || "Seasonal outlook is loaded."),
    `${openSos.length} live SOS ticket${openSos.length === 1 ? "" : "s"} in the queue${medical ? `, ${medical} with medical need` : ""}.`,
    hazards.length ? `${hazards.length} active hazard${hazards.length === 1 ? "" : "s"} are already weighting the alley graph to infinity.` : "No live hazards on the graph yet.",
    topZone ? `Highest CVI is ${topZone.name} (${topZone.cvi.toFixed(2)} · ${topZone.priority}). Clear that drain stretch first.` : "CVI zones are loading.",
  ].join(" ");

  return (
    <div className="intel-grid">
      <div className="card intel-card">
        <div className="card-header">
          <h2>Pre-season budget</h2>
          <span className="queue-count">DRAINS</span>
        </div>
        <p className="intel-lede">Ranked bottlenecks. Clearing these first avoids the biggest flood-loss estimate.</p>
        {drains.length === 0 ? (
          <p className="intel-empty">CVI zones will rank here once the backend is up.</p>
        ) : (
          drains.map((zone) => (
            <div key={zone.id} className="budget-row">
              <div>
                <strong>{zone.name}</strong>
                <span>Clear ~{drainM(zone)}m drain</span>
              </div>
              <div className="budget-loss">
                <b>${lossUsd(zone)}M</b>
                <StatusBadge variant={zone.priority} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card intel-card">
        <div className="card-header">
          <h2>Policy brief</h2>
          <span className="queue-count">COUNCIL</span>
        </div>
        <p className="policy-brief">{brief}</p>
      </div>

      <div className="card intel-card intel-span">
        <div className="card-header">
          <h2>Amenity impact</h2>
          <Link href="/after" className="queue-count">LOSS LEDGER →</Link>
        </div>
        <p className="intel-lede">Toilets, Red Cross, clinics, and high ground — flagged when a nearby alley is blocked or damaged.</p>
        {helpPoints.map((help) => {
          const hit = compromised.some((row) => row.id === help.id);
          const lm = lmMap.get(help.landmark_id);
          return (
            <div key={help.id} className={`amenity-row${hit ? " hot" : ""}`}>
              <span className={`amenity-dot ${help.kind}`} />
              <div>
                <strong>{help.name}</strong>
                <span>{lm?.name ?? help.landmark_id} · {help.kind}</span>
              </div>
              <StatusBadge variant={hit ? "critical" : "verified"} label={hit ? "at risk" : "clear"} />
            </div>
          );
        })}
        {damage.length > 0 ? (
          <p className="intel-lede" style={{ marginTop: 10 }}>
            {damage.length} loss report{damage.length === 1 ? "" : "s"} in the 72-hour ledger. Open After for UN / World Bank packaging.
          </p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  type Paginated,
  type SosEvent,
  type SosStatus,
  type HazardEvent,
  type Landmark,
  type RouteResponse,
} from "@/lib/api";
import MapView from "./MapView";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";
import RadialGauge from "./RadialGauge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? "";

const SOS_ICONS: Record<string, string> = {
  flood_trapped: "🌊",
  collapse_fire: "🔥",
  medical: "🏥",
};

const HAZARD_ICONS: Record<string, string> = {
  blocked_drainage: "🚧",
  rising_water: "💧",
  damaged_structure: "🏚️",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DuringView() {
  const [sosEvents, setSosEvents] = useState<SosEvent[]>([]);
  const [hazards, setHazards] = useState<HazardEvent[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [statusFilter, setStatusFilter] = useState<SosStatus | "all">("all");
  const [selectedSos, setSelectedSos] = useState<SosEvent | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    sos: SosEvent;
    newStatus: SosStatus;
  } | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [routeDestination, setRouteDestination] = useState<string>("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patchLoading, setPatchLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const lmMap = new Map(landmarks.map((lm) => [lm.id, lm]));
  const safeHavens = landmarks.filter((lm) => lm.safe_haven);

  /* ── Fetch helpers ─────────────────────────────────────────── */
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const fetchSos = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/v1/sos?limit=200${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`,
        { headers, cache: "no-store" }
      );
      if (res.ok) {
        const data: Paginated<SosEvent> = await res.json();
        setSosEvents(data.items);
      }
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchHazards = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/hazards?limit=100`, {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data: Paginated<HazardEvent> = await res.json();
        setHazards(data.items);
      }
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLandmarks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/landmarks`, { cache: "no-store" });
      if (res.ok) {
        setLandmarks(await res.json());
      }
    } catch { /* silent */ }
  }, []);

  /* ── Initial + polling ─────────────────────────────────────── */
  useEffect(() => {
    fetchLandmarks();
  }, [fetchLandmarks]);

  useEffect(() => {
    fetchSos();
    fetchHazards();
    const iv = setInterval(() => {
      fetchSos();
      fetchHazards();
    }, 6000);
    return () => clearInterval(iv);
  }, [fetchSos, fetchHazards]);

  /* ── Patch SOS status ──────────────────────────────────────── */
  const patchSos = async (id: string, newStatus: SosStatus) => {
    setPatchLoading(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/sos/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      await fetchSos();
      setConfirmAction(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Patch failed");
    } finally {
      setPatchLoading(null);
    }
  };

  /* ── Route SOS ─────────────────────────────────────────────── */
  const computeRoute = async (fromId: string, toId?: string) => {
    setRouteLoading(true);
    setRoute(null);
    try {
      const body: Record<string, string> = { from_landmark: fromId };
      if (toId) body.to_landmark = toId;
      const res = await fetch(`${API_URL}/api/v1/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setRoute(await res.json());
      } else {
        setError(`Route failed: ${res.status}`);
      }
    } catch {
      setError("Route computation failed");
    } finally {
      setRouteLoading(false);
    }
  };

  /* ── Click handlers ────────────────────────────────────────── */
  const handleSosClick = (sos: SosEvent) => {
    setSelectedSos(sos);
    setRoute(null);
    const lm = sos.landmark_id ? lmMap.get(sos.landmark_id) : null;
    if (lm) setFlyTo([lm.lon, lm.lat]);
    if (safeHavens.length > 0 && !routeDestination) {
      setRouteDestination(safeHavens[0].id);
    }
  };

  const handleAck = (sos: SosEvent) => {
    patchSos(sos.id, "acknowledged");
  };

  const handleResolve = (sos: SosEvent) => {
    setConfirmAction({ sos, newStatus: "resolved" });
  };

  const copyScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Filtered events ───────────────────────────────────────── */
  const filtered = statusFilter === "all"
    ? sosEvents
    : sosEvents.filter((s) => s.status === statusFilter);

  const openCount = sosEvents.filter((s) => s.status === "open").length;
  const ackCount = sosEvents.filter((s) => s.status === "acknowledged").length;

  /* ── Route path landmarks ──────────────────────────────────── */
  const routePath = route
    ? route.path.map((id) => lmMap.get(id)).filter(Boolean) as Landmark[]
    : [];

  return (
    <>
      {/* Radial Stats Row */}
      <div className="radial-stats-row">
        <div className="radial-stat-card">
          <RadialGauge
            value={openCount}
            max={Math.max(sosEvents.length, 10)}
            label="OPEN SOS"
            variant={openCount > 0 ? "urgent" : "neutral"}
          />
          <div className="stat-card-text">
            <span className="stat-card-title">Urgent Incidents</span>
            <span className="stat-card-desc">Requires immediate dispatch</span>
          </div>
        </div>

        <div className="radial-stat-card">
          <RadialGauge
            value={ackCount}
            max={Math.max(sosEvents.length, 10)}
            label="ACKNOWLEDGED"
            variant={ackCount > 0 ? "warn" : "neutral"}
          />
          <div className="stat-card-text">
            <span className="stat-card-title">In Progress</span>
            <span className="stat-card-desc">Runners dispatched</span>
          </div>
        </div>

        <div className="radial-stat-card">
          <RadialGauge
            value={hazards.length}
            max={15}
            label="HAZARDS"
            variant={hazards.length > 0 ? "urgent" : "neutral"}
          />
          <div className="stat-card-text">
            <span className="stat-card-title">Active Hazards</span>
            <span className="stat-card-desc">Avoidance nodes active</span>
          </div>
        </div>

        <div className="radial-stat-card">
          <RadialGauge
            value={safeHavens.length}
            max={safeHavens.length || 1}
            label="SAFE HAVENS"
            variant="ok"
          />
          <div className="stat-card-text">
            <span className="stat-card-title">Operational Havens</span>
            <span className="stat-card-desc">Highridge &amp; Comm. Center</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: "var(--urgent)", fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>
      )}

      <div className="grid-map-panel">
        {/* Map */}
        <MapView
          overlays={{ landmarks, sosEvents, hazards, routePath: routePath.length > 1 ? routePath : undefined }}
          onSosClick={handleSosClick}
          flyTo={flyTo}
        />

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
          {/* SOS Queue */}
          <div className="card" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="card-header">
              <h2>SOS Live Timeline</h2>
              <span className="queue-count">{filtered.length} EVENTS</span>
            </div>

            <div className="queue-filters">
              {(["all", "open", "acknowledged", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm btn-ghost${statusFilter === s ? " active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="queue-panel" style={{ flex: 1, overflow: "auto" }}>
              {filtered.length === 0 ? (
                <EmptyState
                  icon="📡"
                  title="No SOS events"
                  message="Trigger one from the community app or USSD *384*55#"
                />
              ) : (
                filtered.map((sos) => {
                  const lm = sos.landmark_id ? lmMap.get(sos.landmark_id) : null;
                  return (
                    <div
                      key={sos.id}
                      className={`timeline-item ${sos.status}${selectedSos?.id === sos.id ? " selected" : ""}`}
                      onClick={() => handleSosClick(sos)}
                      onKeyDown={(e) => e.key === "Enter" && handleSosClick(sos)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="timeline-item-icon">
                        {SOS_ICONS[sos.kind] ?? "🆘"}
                      </div>
                      <div className="timeline-item-body">
                        <div className="timeline-item-title">
                          <span>{sos.kind.replaceAll("_", " ")}</span>
                          <StatusBadge variant={sos.status} />
                        </div>
                        <div className="timeline-item-meta">
                          <span style={{ fontWeight: 500, color: "var(--paper)" }}>
                            {lm?.name ?? sos.landmark_id ?? "Unknown location"}
                          </span>
                          <StatusBadge variant={sos.source} />
                          <span>{timeAgo(sos.created_at)}</span>
                        </div>
                        {sos.phone && (
                          <div style={{ fontSize: 11, fontFamily: "DM Mono", color: "var(--teal-bright)", marginTop: 2 }}>
                            📞 {sos.phone}
                          </div>
                        )}
                      </div>
                      <div className="timeline-item-actions">
                        {sos.status === "open" && (
                          <button
                            className="btn btn-sm btn-warn"
                            onClick={(e) => { e.stopPropagation(); handleAck(sos); }}
                            disabled={patchLoading === sos.id}
                            aria-label="Acknowledge SOS"
                          >
                            {patchLoading === sos.id ? <span className="spinner" /> : "Ack"}
                          </button>
                        )}
                        {sos.status === "acknowledged" && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={(e) => { e.stopPropagation(); handleResolve(sos); }}
                            disabled={patchLoading === sos.id}
                            aria-label="Resolve SOS"
                          >
                            {patchLoading === sos.id ? <span className="spinner" /> : "Resolve"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Route Panel (shown when SOS selected) */}
          {selectedSos && selectedSos.landmark_id && (
            <div className="route-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3>Route &amp; Radio Script</h3>
                <span style={{ fontSize: 11, fontFamily: "DM Mono", color: "var(--paper-muted)" }}>
                  FROM: {lmMap.get(selectedSos.landmark_id)?.name ?? selectedSos.landmark_id}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "var(--paper-muted)" }}>Destination:</span>
                <select
                  value={routeDestination}
                  onChange={(e) => setRouteDestination(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select destination…</option>
                  {safeHavens.map((lm) => (
                    <option key={lm.id} value={lm.id}>
                      ✦ {lm.name} (safe haven)
                    </option>
                  ))}
                  {landmarks.filter((lm) => !lm.safe_haven).map((lm) => (
                    <option key={lm.id} value={lm.id}>
                      {lm.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => computeRoute(selectedSos.landmark_id!, routeDestination || undefined)}
                  disabled={routeLoading}
                >
                  {routeLoading ? <span className="spinner" /> : "Compute Path"}
                </button>
              </div>

              {route && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--paper-muted)", fontFamily: "DM Mono" }}>
                      Dispatch Script (USSD / Radio)
                    </span>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => copyScript(route.ussd_text)}
                      style={{ fontSize: 10 }}
                    >
                      {copied ? "✓ Copied" : "Copy text"}
                    </button>
                  </div>
                  <div className="route-ussd-text">{route.ussd_text}</div>
                  {route.avoided.length > 0 && (
                    <div className="route-avoided">
                      <span style={{ fontSize: 11, color: "var(--paper-muted)" }}>Hazards Avoided:</span>
                      {route.avoided.map((a, i) => (
                        <StatusBadge key={i} variant="critical" label={a} />
                      ))}
                    </div>
                  )}
                  <div className="route-disclaimer">{route.disclaimer}</div>
                </>
              )}
            </div>
          )}

          {/* Active Hazards */}
          {hazards.length > 0 && (
            <div className="card" style={{ maxHeight: 180, overflow: "auto" }}>
              <h3>Active Hazards Grid</h3>
              {hazards.map((h) => {
                const fromLm = lmMap.get(h.from_landmark);
                return (
                  <div key={h.id} className="hazard-item">
                    <div className="hazard-icon">
                      {HAZARD_ICONS[h.kind] ?? "⚠️"}
                    </div>
                    <div className="hazard-text">
                      <span className="hazard-kind">{h.kind.replaceAll("_", " ")}</span>
                      <span style={{ color: "var(--paper-muted)", fontSize: 12 }}>
                        {" "}· {fromLm?.name ?? h.from_landmark}
                        {h.note ? ` (${h.note})` : ""}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--paper-muted)", fontFamily: "DM Mono" }}>
                      {timeAgo(h.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title="Resolve SOS Incident?"
          message={`Mark "${confirmAction.sos.kind.replaceAll("_", " ")}" as resolved? This removes emergency priority.`}
          confirmLabel="Resolve Incident"
          confirmVariant="primary"
          onConfirm={() => patchSos(confirmAction.sos.id, confirmAction.newStatus)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

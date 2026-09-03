"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type Paginated,
  type SosEvent,
  type SosStatus,
  type Landmark,
  type RouteResponse,
  type WhatsAppDispatch,
} from "@/lib/api";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? "";

const SOS_ICONS: Record<string, string> = {
  flood_trapped: "🌊",
  collapse_fire: "🔥",
  medical: "🏥",
  stuck_debris: "🪵",
  stuck_location: "📍",
  car_flooding: "🚗",
};

function waitLabel(dateStr: string, now: number): string {
  const mins = Math.max(0, Math.floor((now - new Date(dateStr).getTime()) / 60000));
  if (mins < 1) return "Waiting under a minute";
  if (mins < 60) return `Waiting ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Waiting ${hrs}h ${mins % 60}m`;
}

function rankSos(a: SosEvent, b: SosEvent): number {
  const rank = (s: SosStatus) => (s === "open" ? 0 : s === "acknowledged" ? 1 : s === "dispatched" ? 2 : 3);
  if (Boolean(b.needs_medical) !== Boolean(a.needs_medical)) return a.needs_medical ? -1 : 1;
  if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export default function DuringView() {
  return (
    <Suspense fallback={<p className="lede">Loading dispatch…</p>}>
      <DuringInner />
    </Suspense>
  );
}

function DuringInner() {
  const params = useSearchParams();
  const search = (params.get("q") ?? "").trim().toLowerCase();
  const [sosEvents, setSosEvents] = useState<SosEvent[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [statusFilter, setStatusFilter] = useState<SosStatus | "all">("all");
  const [selectedSos, setSelectedSos] = useState<SosEvent | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ sos: SosEvent; newStatus: SosStatus } | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [routeDestination, setRouteDestination] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patchLoading, setPatchLoading] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [medicalOnly, setMedicalOnly] = useState(false);

  const lmMap = new Map(landmarks.map((lm) => [lm.id, lm]));
  const safeHavens = landmarks.filter((lm) => lm.safe_haven);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const fetchSos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/sos?limit=200`, { headers, cache: "no-store" });
      if (res.ok) {
        const data: Paginated<SosEvent> = await res.json();
        setSosEvents(data.items);
      }
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/landmarks`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).then(setLandmarks).catch(() => {});
  }, []);

  useEffect(() => {
    fetchSos();
    const iv = setInterval(fetchSos, 6000);
    return () => clearInterval(iv);
  }, [fetchSos]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(iv);
  }, []);

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
      setSelectedSos((current) => (current?.id === id ? { ...current, status: newStatus } : current));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Patch failed");
    } finally {
      setPatchLoading(null);
    }
  };

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
      if (res.ok) setRoute(await res.json());
      else setError(`Route failed: ${res.status}`);
    } catch {
      setError("Route computation failed");
    } finally {
      setRouteLoading(false);
    }
  };

  const dispatchWhatsApp = async (sos: SosEvent) => {
    setDispatching(sos.id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/whatsapp/dispatch`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "sos",
          ticket_id: sos.id,
          landmark_id: sos.landmark_id,
          phone: sos.phone,
          needs_medical: sos.needs_medical,
        }),
      });
      if (!res.ok) throw new Error(`Dispatch failed: ${res.status}`);
      const payload: WhatsAppDispatch = await res.json();
      if (payload.wa_url) window.open(payload.wa_url, "_blank");
      else if (payload.message) {
        await navigator.clipboard.writeText(payload.message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      if (sos.status === "open" || sos.status === "acknowledged") {
        await patchSos(sos.id, "dispatched");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "WhatsApp dispatch failed");
    } finally {
      setDispatching(null);
    }
  };

  const handleSosClick = (sos: SosEvent) => {
    setSelectedSos(sos);
    setRoute(null);
    if (safeHavens.length > 0 && !routeDestination) setRouteDestination(safeHavens[0].id);
  };

  const filtered = (statusFilter === "all" ? sosEvents : sosEvents.filter((s) => s.status === statusFilter))
    .slice()
    .sort(rankSos)
    .filter((sos) => {
      if (!search) return true;
      const lm = sos.landmark_id ? lmMap.get(sos.landmark_id) : null;
      return [sos.kind, sos.status, sos.phone_masked, sos.landmark_id, lm?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .filter((sos) => !medicalOnly || Boolean(sos.needs_medical));

  const openCount = sosEvents.filter((s) => s.status === "open").length;
  const ackCount = sosEvents.filter((s) => s.status === "acknowledged").length;
  const dispatchedCount = sosEvents.filter((s) => s.status === "dispatched").length;
  const medicalCount = sosEvents.filter((s) => s.needs_medical && s.status !== "resolved").length;
  const selectedPlace = selectedSos?.landmark_id ? lmMap.get(selectedSos.landmark_id) : null;

  const toggleFilter = (status: SosStatus | "all") => {
    setStatusFilter((current) => (current === status ? "all" : status));
  };

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h1>Live SOS dispatch</h1>
          <p className="lede">Ack, WhatsApp a runner, then resolve. Map and budget live on their own pages.</p>
        </div>
        <div className="page-links">
          <Link className="btn btn-primary" href="/map">Open map</Link>
          <Link className="btn btn-ghost" href="/intel">Policy intel</Link>
        </div>
      </div>

      <div className="kpi-row">
        <button type="button" className={`kpi-card featured${statusFilter === "open" ? " active" : ""}`} onClick={() => toggleFilter("open")}>
          <div>
            <div className="kpi-label">Open SOS</div>
            <div className="kpi-value">{openCount}</div>
            <div className="kpi-trend">Waiting on ack / dispatch</div>
          </div>
          <span className="kpi-arrow">↗</span>
        </button>
        <button type="button" className={`kpi-card${statusFilter === "acknowledged" ? " active" : ""}`} onClick={() => toggleFilter("acknowledged")}>
          <div>
            <div className="kpi-label">Acknowledged</div>
            <div className="kpi-value">{ackCount}</div>
            <div className="kpi-trend">Heard, not yet on the ground</div>
          </div>
          <span className="kpi-arrow">→</span>
        </button>
        <button type="button" className={`kpi-card${statusFilter === "dispatched" ? " active" : ""}`} onClick={() => toggleFilter("dispatched")}>
          <div>
            <div className="kpi-label">Dispatched</div>
            <div className="kpi-value">{dispatchedCount}</div>
            <div className="kpi-trend">Runners on WhatsApp</div>
          </div>
          <span className="kpi-arrow">→</span>
        </button>
        <button type="button" className={`kpi-card${medicalOnly ? " active" : ""}`} onClick={() => setMedicalOnly((on) => !on)}>
          <div>
            <div className="kpi-label">Medical</div>
            <div className="kpi-value">{medicalCount}</div>
            <div className="kpi-trend">Needs clinic / ambulance</div>
          </div>
          <span className="kpi-arrow">!</span>
        </button>
      </div>

      {error ? <div className="command-error">⚠ {error}</div> : null}

      <div className="card">
        <div className="card-header">
          <h2>Queue</h2>
          <span className="queue-count">
            {search ? `Search “${search}” · ` : ""}{openCount} OPEN · {filtered.length} SHOWN
          </span>
        </div>
        <div className="queue-filters">
          {(["all", "open", "acknowledged", "dispatched", "resolved"] as const).map((s) => (
            <button
              key={s}
              className={`btn btn-sm btn-ghost${statusFilter === s ? " active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon="📡"
            title={search || medicalOnly || statusFilter !== "all" ? "No matching SOS" : "No SOS events"}
            message={search ? "Try another search, or clear ⌘K." : "Trigger one from the community app or USSD *384*55#"}
          />
        ) : (
          <div className="queue-grid">
            {filtered.map((sos) => {
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
                  <div className="timeline-item-icon">{SOS_ICONS[sos.kind] ?? "🆘"}</div>
                  <div className="timeline-item-body">
                    <div className="timeline-item-title">
                      <span>{sos.kind.replaceAll("_", " ")}</span>
                      {sos.needs_medical ? <StatusBadge variant="critical" label="medical" /> : null}
                      <StatusBadge variant={sos.status} />
                    </div>
                    <div className="timeline-item-meta">
                      <span style={{ fontWeight: 500, color: "var(--paper)" }}>
                        {lm?.name ?? sos.landmark_id ?? "cell hash"}
                      </span>
                      <StatusBadge variant={sos.source as "pwa" | "ussd" | "whatsapp"} />
                    </div>
                    <div className="wait-chip">{waitLabel(sos.created_at, now)}</div>
                    {sos.phone_masked ? <div className="queue-phone">{sos.phone_masked}</div> : null}
                  </div>
                  <div className="timeline-item-actions">
                    {sos.status === "open" ? (
                      <button className="btn btn-sm btn-warn" onClick={(e) => { e.stopPropagation(); void patchSos(sos.id, "acknowledged"); }} disabled={patchLoading === sos.id}>
                        Ack
                      </button>
                    ) : null}
                    {sos.status === "open" || sos.status === "acknowledged" ? (
                      <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); void dispatchWhatsApp(sos); }} disabled={dispatching === sos.id}>
                        {dispatching === sos.id ? "…" : "WhatsApp"}
                      </button>
                    ) : null}
                    {sos.status === "acknowledged" || sos.status === "dispatched" ? (
                      <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setConfirmAction({ sos, newStatus: "resolved" }); }}>
                        Resolve
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedSos ? (
        <div className="card dispatch-detail">
          <div className="card-header">
            <h2>{selectedSos.kind.replaceAll("_", " ")}</h2>
            <StatusBadge variant={selectedSos.status} />
          </div>
          <p className="lede" style={{ marginBottom: 12 }}>
            {selectedPlace?.name ?? selectedSos.landmark_id ?? "Hashed cell"} · {waitLabel(selectedSos.created_at, now)}
            {selectedSos.phone_masked ? ` · ${selectedSos.phone_masked}` : ""}
          </p>
          <div className="btn-group" style={{ marginBottom: 16 }}>
            {selectedSos.status === "open" ? (
              <button className="btn btn-warn" onClick={() => void patchSos(selectedSos.id, "acknowledged")} disabled={patchLoading === selectedSos.id}>
                Acknowledge
              </button>
            ) : null}
            {selectedSos.status === "open" || selectedSos.status === "acknowledged" ? (
              <button className="btn btn-primary" onClick={() => void dispatchWhatsApp(selectedSos)} disabled={dispatching === selectedSos.id}>
                WhatsApp runners
              </button>
            ) : null}
            {selectedSos.status !== "resolved" ? (
              <button className="btn btn-ghost" onClick={() => setConfirmAction({ sos: selectedSos, newStatus: "resolved" })}>
                Resolve
              </button>
            ) : null}
            {selectedSos.landmark_id ? (
              <Link className="btn btn-ghost" href={`/map?sos=${selectedSos.id}`}>
                Show on map
              </Link>
            ) : null}
          </div>
          {selectedSos.landmark_id ? (
            <>
              <h3>Dry-path script</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0 12px" }}>
                <select value={routeDestination} onChange={(e) => setRouteDestination(e.target.value)} style={{ flex: 1 }}>
                  <option value="">High ground…</option>
                  {safeHavens.map((lm) => (
                    <option key={lm.id} value={lm.id}>✦ {lm.name}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  onClick={() => computeRoute(selectedSos.landmark_id!, routeDestination || undefined)}
                  disabled={routeLoading}
                >
                  {routeLoading ? "Finding…" : "Get path"}
                </button>
              </div>
              {route ? (
                <>
                  <div className="route-ussd-text">{route.ussd_text}</div>
                  <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(route.ussd_text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    {copied ? "Copied" : "Copy radio / SMS script"}
                  </button>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {confirmAction ? (
        <ConfirmDialog
          title="Resolve SOS?"
          message={`Mark "${confirmAction.sos.kind.replaceAll("_", " ")}" as resolved? This clears emergency priority.`}
          confirmLabel="Resolve"
          confirmVariant="primary"
          onConfirm={() => patchSos(confirmAction.sos.id, confirmAction.newStatus)}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}
    </div>
  );
}

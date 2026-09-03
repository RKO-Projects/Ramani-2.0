"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { ProcessSteps } from "@/components/ProcessSteps";
import { UssdFallback } from "@/components/UssdFallback";
import { AreaSheet } from "@/components/AreaSheet";
import { api, type AlertStatus, type AreaDetail, type AreaMapPayload } from "@/lib/api";
import { fallbackDetail, SEED_AREA_MAP } from "@/lib/areas";
import { readJson, storageKeys, writeJson } from "@/lib/storage";
import { useLandmarks } from "@/lib/useLandmarks";

const STEPS = [
  "Read the seasonal outlook.",
  "Tap a danger area for what to do.",
  "Send SOS, get a route, or report from that area.",
];

export default function AlertsPage() {
  const { select } = useLandmarks();
  const [alert, setAlert] = useState<AlertStatus | null>(() => readJson<AlertStatus>(storageKeys.alert));
  const [fromCache, setFromCache] = useState(false);
  const [areas, setAreas] = useState<AreaMapPayload>(SEED_AREA_MAP);
  const [open, setOpen] = useState<AreaDetail | null>(null);

  useEffect(() => {
    api<AlertStatus>("/api/v1/alerts")
      .then((data) => {
        writeJson(storageKeys.alert, data);
        setAlert(data);
        setFromCache(false);
      })
      .catch(() => {
        const saved = readJson<AlertStatus>(storageKeys.alert);
        if (saved) {
          setAlert(saved);
          setFromCache(true);
        }
      });
    api<AreaMapPayload>("/api/v1/areas")
      .then(setAreas)
      .catch(() => {
        /* seed list */
      });
  }, []);

  const danger = areas.nodes.filter((node) => node.alarm);

  async function openArea(id: string) {
    const node = areas.nodes.find((row) => row.id === id);
    try {
      setOpen(await api<AreaDetail>(`/api/v1/areas/${id}`));
    } catch {
      if (node) setOpen(fallbackDetail(node, areas.nodes));
    }
  }

  return (
    <PageFrame>
      <div className="section-head">
        <h2>Local alerts</h2>
      </div>
      <p className="lede">Outlook plus the areas with an alarm light. Tap one for the pathway.</p>
      <ProcessSteps steps={STEPS} current={danger.length ? 1 : 0} />
      {alert ? (
        <div className={alert.el_nino_mode ? "msg warn" : "msg"}>
          <strong>{alert.headline}</strong>
          <p>{alert.detail}</p>
          {fromCache ? <p className="hint">Saved on this phone</p> : null}
        </div>
      ) : (
        <p className="err">Alerts unavailable. Dial *384*55# option 4.</p>
      )}
      <div className="section-head">
        <h2>Danger areas</h2>
      </div>
      {danger.length === 0 ? (
        <p className="hint">No alarm zones on the schematic right now. Tap the map on Home to inspect any area.</p>
      ) : (
        <div className="actions stack">
          {danger.map((node) => (
            <button key={node.id} type="button" className="action-card" onClick={() => void openArea(node.id)}>
              <span className="action-icon alarm-dot" />
              <span>
                <b>{node.name}</b>
                <small>
                  {node.flood_prone ? "Flood-prone" : node.priority} · {node.hazard_count} recent hazard{node.hazard_count === 1 ? "" : "s"}
                </small>
              </span>
              <span className="chev">›</span>
            </button>
          ))}
        </div>
      )}
      <UssdFallback extra="option 4 is Alert status." />
      {open ? (
        <AreaSheet
          detail={open}
          onClose={() => setOpen(null)}
          onUseHere={(id) => {
            select(id);
            setOpen(null);
          }}
        />
      ) : null}
    </PageFrame>
  );
}

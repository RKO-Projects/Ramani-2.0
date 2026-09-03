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
import { useI18n } from "@/lib/i18n";

export default function AlertsPage() {
  const { t } = useI18n();
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
        <h2>{t("alerts.title")}</h2>
      </div>
      <p className="lede">{t("alerts.lede")}</p>
      <ProcessSteps steps={[t("alerts.step1"), t("alerts.step2"), t("alerts.step3")]} current={danger.length ? 1 : 0} />
      {alert ? (
        <div className={alert.el_nino_mode ? "msg warn" : "msg"}>
          <strong>{alert.headline}</strong>
          <p>{alert.detail}</p>
          {fromCache ? <p className="hint">{t("alerts.cached")}</p> : null}
        </div>
      ) : (
        <p className="err">{t("alerts.fail")}</p>
      )}
      <div className="section-head">
        <h2>{t("alerts.danger")}</h2>
      </div>
      {danger.length === 0 ? (
        <p className="hint">{t("alerts.none")}</p>
      ) : (
        <div className="actions stack">
          {danger.map((node) => (
            <button key={node.id} type="button" className="action-card" onClick={() => void openArea(node.id)}>
              <span className="action-icon alarm-dot" />
              <span>
                <b>{node.name}</b>
                <small>
                  {node.flood_prone ? t("alerts.floodprone") : node.priority} ·{" "}
                  {t(node.hazard_count === 1 ? "alerts.hazards" : "alerts.hazardsMany", { count: node.hazard_count })}
                </small>
              </span>
              <span className="chev">›</span>
            </button>
          ))}
        </div>
      )}
      <UssdFallback extra={t("alerts.ussd")} />
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

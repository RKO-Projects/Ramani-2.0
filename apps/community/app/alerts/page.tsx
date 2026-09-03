"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { UssdFallback } from "@/components/UssdFallback";
import { api, type AlertStatus } from "@/lib/api";
import { readJson, storageKeys, writeJson } from "@/lib/storage";

export default function AlertsPage() {
  const [alert, setAlert] = useState<AlertStatus | null>(() => readJson<AlertStatus>(storageKeys.alert));
  const [fromCache, setFromCache] = useState(false);

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
  }, []);

  return (
    <PageFrame>
      <div className="section-head">
        <h2>Local alert</h2>
      </div>
      <p className="lede">Seasonal outlook for Kibera. Saved on this phone if the network drops.</p>
      {alert ? (
        <div className={alert.el_nino_mode ? "msg warn" : "msg"}>
          <strong>{alert.headline}</strong>
          <p>{alert.detail}</p>
          {fromCache ? <p className="hint">Saved on this phone</p> : null}
        </div>
      ) : (
        <p className="err">Alerts unavailable. Dial *384*55# option 4.</p>
      )}
      <UssdFallback extra="option 4 is Alert status." />
    </PageFrame>
  );
}

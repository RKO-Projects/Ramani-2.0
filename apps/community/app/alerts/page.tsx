"use client";

import { useEffect, useState } from "react";
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
    <>
      <p className="steps">4 of 4 · same as USSD option 4</p>
      <h1>Local alert</h1>
      {alert ? (
        <p className={alert.el_nino_mode ? "msg warn" : "msg"}>
          <strong>{alert.headline}</strong>
          <br />
          <br />
          {alert.detail}
          {fromCache ? <span className="offline"> · saved on this phone</span> : null}
        </p>
      ) : (
        <p className="err">Alerts unavailable. Dial *384*55# option 4.</p>
      )}
      <UssdFallback extra="Option 4 is Alert status." />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AlertStatus } from "@/lib/api";
import { readJson, storageKeys, writeJson } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

export function AlertStrip() {
  const { t } = useI18n();
  const [alert, setAlert] = useState<AlertStatus | null>(() => readJson<AlertStatus>(storageKeys.alert));

  useEffect(() => {
    api<AlertStatus>("/api/v1/alerts")
      .then((data) => {
        writeJson(storageKeys.alert, data);
        setAlert(data);
      })
      .catch(() => {
        /* keep cache */
      });
  }, []);

  if (!alert?.headline) return null;

  return (
    <Link href="/alerts" className={`notice ${alert.el_nino_mode ? "hot" : ""}`}>
      <strong>{alert.el_nino_mode ? t("alerts.active") : t("alerts.outlook")}</strong>
      <span>
        {alert.headline} — {t("alerts.tapDanger")}
      </span>
    </Link>
  );
}

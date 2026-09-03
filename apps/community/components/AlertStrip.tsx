"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AlertStatus } from "@/lib/api";
import { readJson, storageKeys, writeJson } from "@/lib/storage";

export function AlertStrip() {
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
      <strong>{alert.el_nino_mode ? "Active alert" : "Seasonal outlook"}</strong>
      <span>{alert.headline} — tap for danger areas</span>
    </Link>
  );
}

"use client";

import { useEffect, useState } from "react";
import { fetchLandmarks, SEED_LANDMARKS, type Landmark } from "@/lib/api";
import { readJson, readString, storageKeys, writeJson, writeString } from "@/lib/storage";

export function useLandmarks() {
  const [landmarks, setLandmarks] = useState<Landmark[]>(() => readJson<Landmark[]>(storageKeys.landmarks) ?? SEED_LANDMARKS);
  const [landmarkId, setLandmarkId] = useState(() => readString(storageKeys.landmark, "line-saba"));

  useEffect(() => {
    let cancelled = false;
    fetchLandmarks()
      .then((rows) => {
        if (cancelled || !rows.length) return;
        writeJson(storageKeys.landmarks, rows);
        setLandmarks(rows);
        setLandmarkId((current) => (rows.some((row) => row.id === current) ? current : rows[0].id));
      })
      .catch(() => {
        /* keep seed / cache */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function select(id: string) {
    setLandmarkId(id);
    writeString(storageKeys.landmark, id);
  }

  return { landmarks, landmarkId, select };
}

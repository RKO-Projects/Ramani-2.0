"use client";

import { useEffect, useState } from "react";
import { fetchLandmarks, SEED_LANDMARKS, type Landmark } from "@/lib/api";
import { readSavedPlace } from "@/lib/location";
import { readJson, readString, storageKeys, writeJson, writeString } from "@/lib/storage";

export function useLandmarks() {
  const saved = typeof window === "undefined" ? null : readSavedPlace();
  const [landmarks, setLandmarks] = useState<Landmark[]>(() => {
    const cached = readJson<Landmark[]>(storageKeys.landmarks) ?? SEED_LANDMARKS;
    if (saved && !cached.some((row) => row.id === saved.landmarkId)) {
      return [
        {
          id: saved.landmarkId,
          name: saved.path[saved.path.length - 1]?.name ?? saved.label,
          zone: saved.label,
          lat: saved.lat,
          lon: saved.lon,
          safe_haven: false,
        },
        ...cached,
      ];
    }
    return cached;
  });
  const [landmarkId, setLandmarkId] = useState(() => saved?.landmarkId ?? readString(storageKeys.landmark, "line-saba"));

  useEffect(() => {
    let cancelled = false;
    const pinned = readSavedPlace();
    fetchLandmarks()
      .then((rows) => {
        if (cancelled || !rows.length) return;
        let next = rows;
        if (pinned && !rows.some((row) => row.id === pinned.landmarkId)) {
          next = [
            {
              id: pinned.landmarkId,
              name: pinned.path[pinned.path.length - 1]?.name ?? pinned.label,
              zone: pinned.label,
              lat: pinned.lat,
              lon: pinned.lon,
              safe_haven: false,
            },
            ...rows,
          ];
        }
        writeJson(storageKeys.landmarks, next);
        setLandmarks(next);
        setLandmarkId((current) => {
          if (pinned?.landmarkId) return pinned.landmarkId;
          return next.some((row) => row.id === current) ? current : next[0].id;
        });
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

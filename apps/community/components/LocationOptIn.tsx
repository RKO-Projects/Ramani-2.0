"use client";

import { useEffect, useState } from "react";
import { IconPin } from "./Icons";
import { getExactLocation } from "@/lib/geo";
import { readSavedPlace, rememberLandmark, snapToLandmark } from "@/lib/location";
import type { Landmark } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function LocationOptIn({
  landmarks,
  onSelect,
}: {
  landmarks: Landmark[];
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [name, setName] = useState("");

  useEffect(() => {
    const saved = readSavedPlace();
    if (saved?.source === "gps") {
      setStatus("ok");
      setName(saved.path[saved.path.length - 1]?.name ?? saved.label);
    }
  }, []);

  async function useGps() {
    setBusy(true);
    setStatus("idle");
    try {
      const gps = await getExactLocation();
      const hit = snapToLandmark(gps.lat, gps.lon, landmarks);
      if (!hit) throw new Error("none");
      rememberLandmark(hit, "gps");
      onSelect(hit.id);
      setName(hit.name);
      setStatus("ok");
    } catch {
      setStatus("fail");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loc-opt">
      <p className="label">{t("onboard.locTitle")}</p>
      <p className="hint">{t("onboard.locHint")}</p>
      <button className="choice loc-btn" type="button" disabled={busy} onClick={() => void useGps()}>
        <IconPin size={18} />
        <span>
          <b>{busy ? t("onboard.locBusy") : t("onboard.locUse")}</b>
          <small>{t("onboard.cell")}</small>
        </span>
      </button>
      {status === "ok" ? <p className="hint ok">{t("onboard.locOk", { name })}</p> : null}
      {status === "fail" ? <p className="err">{t("onboard.locFail")}</p> : null}
    </div>
  );
}

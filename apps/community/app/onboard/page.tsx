"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageChips, LanguageSelect } from "@/components/LanguagePicker";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { LocationOptIn } from "@/components/LocationOptIn";
import { readPhone, rememberLandmark, savePhone } from "@/lib/location";
import { useLandmarks } from "@/lib/useLandmarks";
import { useI18n } from "@/lib/i18n";

export default function OnboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { landmarks, landmarkId, select } = useLandmarks();
  const [raw, setRaw] = useState("");
  const [existing, setExisting] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const phone = readPhone();
    setExisting(phone);
    setRaw(phone);
  }, []);

  function pickArea(id: string) {
    const hit = landmarks.find((row) => row.id === id);
    if (hit) rememberLandmark(hit, "cell");
    select(id);
  }

  function submit() {
    const phone = savePhone(raw);
    if (!phone) {
      setError(t("onboard.badPhone"));
      return;
    }
    router.replace("/");
  }

  return (
    <div className="app onboard">
      <header className="mast mast-inner">
        <div className="topbar">
          <p className="ob-kicker">Ramani</p>
          <div className="topbar-end">
            <LanguageSelect compact />
            <ThemeToggle />
          </div>
        </div>
        <h1 className="ob-title">{existing ? t("onboard.update") : t("onboard.title")}</h1>
        <p className="ob-path">{t("onboard.path")}</p>
      </header>
      <div className="sheet">
        <label className="field">
          <span className="label">{t("onboard.mobile")}</span>
          <span className="field-box">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setError("");
              }}
            />
          </span>
        </label>
        {error ? <p className="err">{error}</p> : null}

        <LocationOptIn landmarks={landmarks} onSelect={select} />
        <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={pickArea} />

        <button className="primary" type="button" onClick={submit}>
          {existing ? t("onboard.save") : t("onboard.continue")}
        </button>
        <p className="hint">{t("onboard.hint")}</p>
        <LanguageChips />
      </div>
    </div>
  );
}

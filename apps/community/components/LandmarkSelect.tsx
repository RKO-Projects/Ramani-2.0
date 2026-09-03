"use client";

import type { Landmark } from "@/lib/api";
import { IconPin, IconSearch } from "./Icons";
import { useI18n } from "@/lib/i18n";

export function LandmarkSelect({
  landmarks,
  value,
  onChange,
  variant = "field",
  placeholder,
}: {
  landmarks: Landmark[];
  value: string;
  onChange: (id: string) => void;
  variant?: "field" | "search";
  placeholder?: string;
}) {
  const { t } = useI18n();
  const selected = landmarks.find((item) => item.id === value);
  const searchLabel = placeholder ?? t("landmark.search");

  if (variant === "search") {
    return (
      <label className="search">
        <IconSearch />
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={t("landmark.label")}>
          <option value="" disabled>
            {searchLabel}
          </option>
          {landmarks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      <span className="label">{t("landmark.label")}</span>
      <span className="field-box">
        <IconPin size={18} />
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {landmarks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.safe_haven ? ` · ${t("landmark.haven")}` : ""}
            </option>
          ))}
        </select>
      </span>
      {selected ? <span className="hint">{t("landmark.using", { name: selected.name })}</span> : null}
    </label>
  );
}

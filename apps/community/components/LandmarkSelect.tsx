"use client";

import type { Landmark } from "@/lib/api";
import { IconPin, IconSearch } from "./Icons";

export function LandmarkSelect({
  landmarks,
  value,
  onChange,
  variant = "field",
  placeholder = "Search a landmark…",
}: {
  landmarks: Landmark[];
  value: string;
  onChange: (id: string) => void;
  variant?: "field" | "search";
  placeholder?: string;
}) {
  const selected = landmarks.find((item) => item.id === value);

  if (variant === "search") {
    return (
      <label className="search">
        <IconSearch />
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Nearest landmark">
          <option value="" disabled>
            {placeholder}
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
      <span className="label">Nearest landmark</span>
      <span className="field-box">
        <IconPin size={18} />
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {landmarks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.safe_haven ? " · safe haven" : ""}
            </option>
          ))}
        </select>
      </span>
      {selected ? <span className="hint">Using {selected.name}, Kibera</span> : null}
    </label>
  );
}

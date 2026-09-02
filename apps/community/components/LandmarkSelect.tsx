"use client";

import type { Landmark } from "@/lib/api";

export function LandmarkSelect({
  landmarks,
  value,
  onChange,
}: {
  landmarks: Landmark[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <>
      <label className="label" htmlFor="landmark">
        Nearest landmark
      </label>
      <select id="landmark" value={value} onChange={(event) => onChange(event.target.value)}>
        {landmarks.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </>
  );
}

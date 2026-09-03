import { readJson, readString, storageKeys, writeJson, writeString } from "./storage";
import { normalizeKenyaPhone } from "./geo";
import { NAIROBI, trailTo, type Place, type PlaceKind } from "./nairobi";
import type { Landmark } from "./api";

export type LocationSource = "gps" | "cell";

export type SavedPlace = {
  path: { id: string; name: string; kind: PlaceKind }[];
  lat: number;
  lon: number;
  landmarkId: string;
  label: string;
  source?: LocationSource;
};

export function readSavedPlace(): SavedPlace | null {
  return readJson<SavedPlace>(storageKeys.place);
}

export function readPhone(): string {
  return readString(storageKeys.phone);
}

export function savePhone(raw: string): string | null {
  const phone = normalizeKenyaPhone(raw);
  if (!phone) return null;
  writeString(storageKeys.phone, phone);
  return phone;
}

export function savePlace(place: Place, trail: Place[], source: LocationSource = "cell"): SavedPlace {
  const path = trail.map((item) => ({ id: item.id, name: item.name, kind: item.kind }));
  const saved: SavedPlace = {
    path,
    lat: place.lat,
    lon: place.lon,
    landmarkId: place.apiLandmark ?? place.id,
    label: trail
      .filter((item) => item.kind !== "county")
      .map((item) => item.name)
      .join(" · "),
    source,
  };
  writeJson(storageKeys.place, saved);
  writeString(storageKeys.landmark, saved.landmarkId);
  return saved;
}

export function snapToLandmark(lat: number, lon: number, landmarks: Landmark[]): Landmark | null {
  if (!landmarks.length) return null;
  let best = landmarks[0];
  let bestD = Infinity;
  for (const row of landmarks) {
    const d = (row.lat - lat) ** 2 + (row.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = row;
    }
  }
  return best;
}

export function rememberLandmark(landmark: Landmark, source: LocationSource): SavedPlace {
  const place: Place = {
    id: landmark.id,
    name: landmark.name,
    kind: "landmark",
    lat: landmark.lat,
    lon: landmark.lon,
    apiLandmark: landmark.id,
  };
  const trail = trailTo(landmark.id) ?? [NAIROBI, place];
  return savePlace(place, trail, source);
}

export function shortLabel(saved: SavedPlace | null): string {
  if (!saved?.path.length) return "Nairobi";
  const village = [...saved.path].reverse().find((item) => item.kind === "village" || item.kind === "landmark" || item.kind === "settlement");
  return village?.name ?? "Nairobi";
}

export function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 7)}•••${phone.slice(-3)}`;
}

import { readJson, readString, storageKeys, writeJson, writeString } from "./storage";
import { normalizeKenyaPhone } from "./geo";
import type { Place, PlaceKind } from "./nairobi";

export type SavedPlace = {
  path: { id: string; name: string; kind: PlaceKind }[];
  lat: number;
  lon: number;
  landmarkId: string;
  label: string;
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

export function savePlace(place: Place, trail: Place[]): SavedPlace {
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
  };
  writeJson(storageKeys.place, saved);
  writeString(storageKeys.landmark, saved.landmarkId);
  return saved;
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

const PREFIX = "ramani.community.";

export const storageKeys = {
  landmark: `${PREFIX}landmark`,
  route: `${PREFIX}route`,
  alert: `${PREFIX}alert`,
  landmarks: `${PREFIX}landmarks`,
  place: `${PREFIX}place`,
  phone: `${PREFIX}phone`,
  ticket: `${PREFIX}ticket`,
  hazard: `${PREFIX}hazard`,
  theme: `${PREFIX}theme`,
} as const;

export function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function readString(key: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

export function writeString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

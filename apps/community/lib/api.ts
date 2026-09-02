const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "offline");
  }

  if (!response.ok) {
    let message = `${response.status} ${path}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      /* keep fallback */
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export function idempotencyKey(): string {
  return crypto.randomUUID();
}

export type SosKind = "flood_trapped" | "collapse_fire" | "medical";
export type HazardKind = "blocked_drainage" | "rising_water" | "damaged_structure";

export type Landmark = {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  safe_haven: boolean;
};

export type SosEvent = {
  id: string;
  kind: SosKind;
  landmark_id?: string | null;
  status: string;
  source: string;
};

export type RouteResult = {
  from_landmark: string;
  to_landmark: string;
  path: string[];
  names: string[];
  ussd_text: string;
  avoided: string[];
  disclaimer: string;
};

export type AlertStatus = {
  outlook: string;
  tercile: string;
  el_nino_mode: boolean;
  headline: string;
  detail: string;
};

export const SEED_LANDMARKS: Landmark[] = [
  { id: "line-saba", name: "Line Saba", zone: "Kibera", lat: -1.3136, lon: 36.7889, safe_haven: false },
  { id: "silanga", name: "Silanga", zone: "Kibera", lat: -1.3178, lon: 36.7912, safe_haven: false },
  { id: "laini-saba", name: "Laini Saba", zone: "Kibera", lat: -1.3154, lon: 36.7948, safe_haven: false },
  { id: "olympic", name: "Olympic", zone: "Kibera", lat: -1.3102, lon: 36.7834, safe_haven: false },
];

export const USSD_CODE = "*384*55#";

export async function fetchLandmarks(): Promise<Landmark[]> {
  const rows = await api<Landmark[]>("/api/v1/landmarks");
  return rows.length ? rows : SEED_LANDMARKS;
}

export function hazardNeighbor(fromId: string, landmarks: Landmark[]): string {
  if (fromId !== "main-drain-alley" && landmarks.some((row) => row.id === "main-drain-alley")) {
    return "main-drain-alley";
  }
  const other = landmarks.find((row) => row.id !== fromId);
  return other?.id ?? "silanga";
}

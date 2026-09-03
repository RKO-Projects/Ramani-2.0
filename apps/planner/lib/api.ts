const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const PLANNER_API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? process.env.RAMANI_PLANNER_API_KEY ?? "";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(PLANNER_API_KEY ? { "X-API-Key": PLANNER_API_KEY } : {}),
    ...(init?.headers as Record<string, string>),
  };

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${path}`);
  }
  return response.json() as Promise<T>;
}

/* ── Pagination ─────────────────────────────────────────────────── */

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

/* ── CVI ────────────────────────────────────────────────────────── */

export type OutlookTercile = "above_normal" | "near_normal" | "below_normal";

export type CviWeights = {
  drainage_proximity: number;
  structural_density: number;
  elevation_slope: number;
  ghacof_rainfall: number;
};

export type CviZone = {
  id: string;
  name: string;
  drainage_proximity: number;
  structural_density: number;
  elevation_slope: number;
  ghacof_rainfall: number;
  cvi: number;
  priority: "low" | "moderate" | "high" | "critical";
};

export type CviResponse = {
  outlook: string;
  tercile: OutlookTercile;
  weights: CviWeights;
  zones: CviZone[];
  model_version: string;
  source: string;
  ingested_at: string | null;
};

export type CviLayer = {
  id: string;
  label: string;
};

/* ── Alerts ─────────────────────────────────────────────────────── */

export type AlertStatus = {
  outlook: string;
  tercile: OutlookTercile;
  el_nino_mode: boolean;
  headline: string;
  detail: string;
};

/* ── Landmarks ──────────────────────────────────────────────────── */

export type Landmark = {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  safe_haven: boolean;
};

/* ── SOS ────────────────────────────────────────────────────────── */

export type SosKind = "flood_trapped" | "collapse_fire" | "medical";
export type SosStatus = "open" | "acknowledged" | "resolved";
export type SosSource = "pwa" | "ussd";

export type SosEvent = {
  id: string;
  kind: SosKind;
  landmark_id: string | null;
  note: string | null;
  phone: string | null;
  source: SosSource;
  created_at: string;
  status: SosStatus;
  settlement_id?: string | null;
};

export type SosStatusUpdate = {
  status: SosStatus;
};

/* ── Hazards ────────────────────────────────────────────────────── */

export type HazardKind = "blocked_drainage" | "rising_water" | "damaged_structure";

export type HazardEvent = {
  id: string;
  kind: HazardKind;
  from_landmark: string;
  to_landmark: string;
  note: string | null;
  source: SosSource;
  created_at: string;
};

/* ── Damage ─────────────────────────────────────────────────────── */

export type DamageReport = {
  id: string;
  landmark_id: string;
  kind: string;
  created_at: string;
  verified: boolean;
};

/* ── Routing ────────────────────────────────────────────────────── */

export type RouteRequest = {
  from_landmark: string;
  to_landmark?: string | null;
  settlement_id?: string | null;
};

export type RouteResponse = {
  from_landmark: string;
  to_landmark: string;
  path: string[];
  names: string[];
  ussd_text: string;
  avoided: string[];
  disclaimer: string;
  graph_version: number;
  hazard_evidence: Record<string, unknown>[];
  computed_at: string | null;
  route_cost: number | null;
  penalty_expires_at: string | null;
};

/* ── Admin ──────────────────────────────────────────────────────── */

export type SettlementInfo = {
  id: string;
  name: string;
  active: boolean;
};

export type IngestionStatus = {
  source: string;
  settlement_id: string;
  records: number;
  geometry_version: number;
  confidence: number;
  finished_at: string | null;
};

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

export type CviZone = {
  id: string;
  name: string;
  cvi: number;
  priority: "low" | "moderate" | "high" | "critical";
};

export type SosEvent = {
  id: string;
  kind: string;
  landmark_id?: string | null;
  created_at: string;
  source: string;
  note?: string | null;
  phone?: string | null;
  phone_masked?: string | null;
  phone_hash?: string | null;
  needs_medical?: boolean;
  location_hash?: string | null;
  lat?: number | null;
  lon?: number | null;
  accuracy_m?: number | null;
};

export type DamageReport = {
  id: string;
  landmark_id: string;
  kind: string;
  created_at: string;
  verified: boolean;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

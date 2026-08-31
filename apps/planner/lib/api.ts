const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
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
};

export type DamageReport = {
  id: string;
  landmark_id: string;
  kind: string;
  created_at: string;
  verified: boolean;
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${path}`);
  }
  return response.json() as Promise<T>;
}

export const LANDMARKS = [
  { id: "line-saba", name: "Line Saba" },
  { id: "silanga", name: "Silanga" },
  { id: "laini-saba", name: "Laini Saba" },
  { id: "olympic", name: "Olympic" },
];

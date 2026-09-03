import { HELP_POINTS } from "./help-points";
import { SEED_LANDMARKS, type AreaDetail, type AreaEdge, type AreaMapPayload, type AreaNode } from "./api";

export const SEED_EDGES: AreaEdge[] = [
  { from_id: "line-saba", to_id: "main-drain-alley", flood_prone: true },
  { from_id: "line-saba", to_id: "olympic", flood_prone: false },
  { from_id: "line-saba", to_id: "silanga", flood_prone: false },
  { from_id: "silanga", to_id: "main-drain-alley", flood_prone: true },
  { from_id: "silanga", to_id: "laini-saba", flood_prone: false },
  { from_id: "laini-saba", to_id: "highridge", flood_prone: false },
  { from_id: "olympic", to_id: "community-center", flood_prone: false },
  { from_id: "community-center", to_id: "highridge", flood_prone: false },
  { from_id: "main-drain-alley", to_id: "laini-saba", flood_prone: true },
  { from_id: "line-saba", to_id: "community-center", flood_prone: false },
];

function neighborsOf(id: string): string[] {
  const out: string[] = [];
  for (const edge of SEED_EDGES) {
    if (edge.from_id === id) out.push(edge.to_id);
    if (edge.to_id === id) out.push(edge.from_id);
  }
  return [...new Set(out)];
}

function seedNode(id: string, name: string, lat: number, lon: number, safeHaven: boolean): AreaNode {
  const flood = SEED_EDGES.some((edge) => edge.flood_prone && (edge.from_id === id || edge.to_id === id));
  const alarm = flood && !safeHaven;
  return {
    id,
    name,
    lat,
    lon,
    safe_haven: safeHaven,
    priority: alarm ? "critical" : safeHaven ? "low" : "moderate",
    alarm,
    neighbors: neighborsOf(id),
    help: HELP_POINTS.filter((row) => row.landmarkId === id).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      landmark_id: row.landmarkId,
      meters: row.meters,
      bearing: row.bearing,
      hint: row.hint,
    })),
    hazard_count: 0,
    flood_prone: flood,
  };
}

export const SEED_AREA_MAP: AreaMapPayload = {
  settlement_id: "kibera",
  nodes: SEED_LANDMARKS.map((row) => seedNode(row.id, row.name, row.lat, row.lon, row.safe_haven)),
  edges: SEED_EDGES,
};

export function fallbackDetail(node: AreaNode, all: AreaNode[]): AreaDetail {
  const neighborNames = all.filter((row) => node.neighbors.includes(row.id)).map((row) => row.name);
  const nearby = neighborNames.join(", ") || "adjacent landmarks";
  let blurb = `You are in ${node.name}. Nearby: ${nearby}.`;
  let steps = ["Watch local alerts.", "Report blocked drains before they flood.", "Save a dry-path route while the network is up."];
  if (node.safe_haven) {
    blurb = `${node.name} is high ground. Nearby: ${nearby}.`;
    steps = ["Stay on higher ground if water is rising.", "Share this landmark on WhatsApp.", "Report a blocked path if the way here is unsafe."];
  } else if (node.alarm) {
    blurb = `${node.name} is a danger zone. Nearby safer ground: ${nearby}.`;
    steps = ["Do not walk flood-prone alleys if water is moving.", "Send SOS if you cannot leave.", "Get a text route to the nearest safe haven."];
  }
  if (node.help[0]?.hint) blurb = `${blurb} ${node.help[0].hint}`;
  return { ...node, cvi: null, blurb, next_steps: steps };
}

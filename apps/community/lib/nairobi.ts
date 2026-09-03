export type PlaceKind = "county" | "subcounty" | "settlement" | "village" | "landmark";

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lon: number;
  blurb?: string;
  apiLandmark?: string;
  children?: Place[];
};

export const KIND_LABEL: Record<PlaceKind, string> = {
  county: "County",
  subcounty: "Sub-county",
  settlement: "Settlement",
  village: "Village / zone",
  landmark: "Landmark",
};

/** Coordinates from OSM / Wikipedia / Map Kibera (WGS84). Settlements are real centroids, not invented suburbs. */
export const NAIROBI: Place = {
  id: "nairobi",
  name: "Nairobi",
  kind: "county",
  lat: -1.286389,
  lon: 36.817223,
  children: [
    {
      id: "kibra",
      name: "Kibra",
      kind: "subcounty",
      lat: -1.3139,
      lon: 36.7886,
      children: [
        {
          id: "kibera",
          name: "Kibera",
          kind: "settlement",
          lat: -1.3139,
          lon: 36.7886,
          blurb: "Ngong River / railway — Map Kibera.",
          children: [
            village("laini-saba", "Laini Saba", -1.3162, 36.7952, [
              pin("line-saba", "Line Saba", -1.3136, 36.7889, "line-saba"),
              pin("olympic", "Olympic", -1.3102, 36.7834, "olympic"),
            ]),
            village("silanga", "Silanga", -1.3179, 36.7915, [
              pin("silanga-ground", "Silanga", -1.3178, 36.7912, "silanga"),
            ]),
            village("gatwekera", "Gatwekera", -1.3115, 36.7862, [
              pin("kambi-muru", "Kambi Muru", -1.3122, 36.787),
            ]),
            village("soweto-east", "Soweto East", -1.3145, 36.7818, [
              pin("ayany", "Ayany", -1.313, 36.78),
            ]),
            village("soweto-west", "Soweto West", -1.3168, 36.7789, []),
            village("kianda", "Kianda", -1.3092, 36.7924, [
              pin("highridge", "Highridge Road", -1.3089, 36.7965, "highridge"),
            ]),
            village("makina", "Makina", -1.3131, 36.7941, [
              pin("community-center", "Community Center", -1.3095, 36.7922, "community-center"),
            ]),
            village("kisumu-ndogo-kibera", "Kisumu Ndogo", -1.3158, 36.7864, [
              pin("main-drain-alley", "Main drain alley", -1.3148, 36.7901, "main-drain-alley"),
            ]),
            village("mashimoni", "Mashimoni", -1.3176, 36.7878, []),
            village("lindi", "Lindi", -1.3192, 36.7842, []),
          ],
        },
      ],
    },
    {
      id: "mathare-sc",
      name: "Mathare",
      kind: "subcounty",
      lat: -1.2597,
      lon: 36.8583,
      children: [
        {
          id: "mathare",
          name: "Mathare Valley",
          kind: "settlement",
          lat: -1.2597,
          lon: 36.8583,
          blurb: "Along Juja Road and the Mathare River.",
          children: [
            village("mathare-4a", "Mathare 4A", -1.261, 36.8565, [pin("juja-road-4a", "Juja Road", -1.2598, 36.857)]),
            village("mathare-4b", "Mathare 4B", -1.2632, 36.859, []),
            village("kosovo", "Kosovo", -1.2654, 36.8612, []),
            village("village-2", "Village 2", -1.2641, 36.8594, []),
            village("mabatini", "Mabatini", -1.2586, 36.8542, []),
          ],
        },
        {
          id: "huruma",
          name: "Huruma",
          kind: "settlement",
          lat: -1.2545,
          lon: 36.8728,
          children: [
            village("kiamaiko", "Kiamaiko", -1.2532, 36.8748, []),
          ],
        },
      ],
    },
    {
      id: "embakasi",
      name: "Embakasi",
      kind: "subcounty",
      lat: -1.32361,
      lon: 36.9,
      blurb: "East Nairobi — Pipeline, Embakasi village, Mukuru by the airport road.",
      children: [
        {
          id: "mukuru-njenga",
          name: "Mukuru Kwa Njenga",
          kind: "settlement",
          lat: -1.30472,
          lon: 36.885,
          blurb: "Embakasi South. Wikipedia: 1°18′17″S 36°53′6″E.",
          children: [
            village("sinai", "Sinai", -1.3108, 36.8765, []),
            village("jamaica", "Jamaica", -1.3052, 36.8918, []),
            village("paradise", "Paradise", -1.3074, 36.8822, []),
            village("kayaba", "Kayaba", -1.3018, 36.8794, []),
          ],
        },
        {
          id: "mukuru-reuben",
          name: "Mukuru Kwa Reuben",
          kind: "settlement",
          lat: -1.3124,
          lon: 36.8682,
          blurb: "West of Kwa Njenga, toward Industrial Area / Outer Ring.",
          children: [
            village("fuata-nyayo", "Fuata Nyayo", -1.314, 36.8648, []),
            village("mcs", "MCS", -1.3106, 36.871, []),
          ],
        },
        {
          id: "viwandani",
          name: "Viwandani",
          kind: "settlement",
          lat: -1.3062,
          lon: 36.8615,
          children: [
            village("kingstone", "Kingstone", -1.3048, 36.8588, []),
            village("mariguini", "Mariguini", -1.3086, 36.8632, []),
          ],
        },
        {
          id: "embakasi-village",
          name: "Embakasi village",
          kind: "settlement",
          lat: -1.32361,
          lon: 36.9,
          blurb: "Near Pipeline / Airport North Road — not Mukuru.",
          children: [
            village("pipeline", "Pipeline", -1.3262, 36.8964, []),
          ],
        },
      ],
    },
    {
      id: "kasarani",
      name: "Kasarani / Ruaraka",
      kind: "subcounty",
      lat: -1.2485,
      lon: 36.8908,
      children: [
        {
          id: "korogocho",
          name: "Korogocho",
          kind: "settlement",
          lat: -1.2492,
          lon: 36.8917,
          children: [
            village("grogan", "Grogan", -1.2478, 36.8894, []),
            village("ngomongo", "Ngomongo", -1.2512, 36.8942, []),
            village("gitathuru", "Gitathuru", -1.2466, 36.8924, []),
          ],
        },
        {
          id: "kariobangi",
          name: "Kariobangi",
          kind: "settlement",
          lat: -1.2538,
          lon: 36.8856,
          children: [
            village("kariobangi-north", "Kariobangi North", -1.2522, 36.8838, []),
            village("lucky-summer", "Lucky Summer", -1.2474, 36.8876, []),
          ],
        },
        {
          id: "baba-dogo",
          name: "Baba Dogo",
          kind: "settlement",
          lat: -1.2408,
          lon: 36.8782,
          children: [],
        },
      ],
    },
    {
      id: "dagoretti",
      name: "Dagoretti",
      kind: "subcounty",
      lat: -1.283,
      lon: 36.752,
      children: [
        {
          id: "kawangware",
          name: "Kawangware",
          kind: "settlement",
          lat: -1.2822,
          lon: 36.7514,
          children: [
            village("congo", "Congo", -1.2844, 36.7488, []),
            village("gatina", "Gatina", -1.2796, 36.7536, []),
            village("kabiro", "Kabiro", -1.2858, 36.7542, []),
          ],
        },
        {
          id: "kangemi",
          name: "Kangemi",
          kind: "settlement",
          lat: -1.2681,
          lon: 36.745,
          children: [
            village("kihumbuini", "Kihumbu-ini", -1.2664, 36.7472, []),
          ],
        },
      ],
    },
    {
      id: "westlands-edge",
      name: "Westlands edge",
      kind: "subcounty",
      lat: -1.261,
      lon: 36.806,
      children: [
        {
          id: "deep-sea",
          name: "Deep Sea",
          kind: "settlement",
          lat: -1.2604,
          lon: 36.8116,
          blurb: "Parklands / Highridge.",
          children: [],
        },
        {
          id: "kibagare",
          name: "Kibagare",
          kind: "settlement",
          lat: -1.2578,
          lon: 36.7816,
          children: [],
        },
      ],
    },
    {
      id: "starehe",
      name: "Starehe / Kamukunji",
      kind: "subcounty",
      lat: -1.281,
      lon: 36.842,
      children: [
        {
          id: "majengo",
          name: "Majengo",
          kind: "settlement",
          lat: -1.2804,
          lon: 36.8448,
          children: [],
        },
        {
          id: "kiambiu",
          name: "Kiambiu",
          kind: "settlement",
          lat: -1.2768,
          lon: 36.8588,
          blurb: "Eastleigh edge.",
          children: [],
        },
      ],
    },
  ],
};

function village(id: string, name: string, lat: number, lon: number, children: Place[]): Place {
  return { id, name, kind: "village", lat, lon, children };
}

function pin(id: string, name: string, lat: number, lon: number, apiLandmark?: string): Place {
  return { id, name, kind: "landmark", lat, lon, apiLandmark };
}

export function findPlace(id: string, node: Place = NAIROBI): Place | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const hit = findPlace(id, child);
    if (hit) return hit;
  }
  return null;
}

export function allOfKind(kind: PlaceKind, node: Place = NAIROBI): Place[] {
  const rows: Place[] = [];
  if (node.kind === kind) rows.push(node);
  for (const child of node.children ?? []) rows.push(...allOfKind(kind, child));
  return rows;
}

export function zoomFor(kind: PlaceKind): number {
  if (kind === "county") return 12;
  if (kind === "subcounty") return 13;
  if (kind === "settlement") return 15;
  if (kind === "village") return 16;
  return 17;
}

export function searchPlaces(query: string, node: Place = NAIROBI): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: Place[] = [];
  function walk(item: Place) {
    if (item.kind !== "county" && item.name.toLowerCase().includes(q)) hits.push(item);
    for (const child of item.children ?? []) walk(child);
  }
  walk(node);
  const rank = (kind: PlaceKind) =>
    ({ settlement: 0, village: 1, subcounty: 2, landmark: 3, county: 4 }[kind]);
  return hits.sort((a, b) => rank(a.kind) - rank(b.kind) || a.name.localeCompare(b.name)).slice(0, 10);
}

export function nearestPlace(lat: number, lon: number, kind: PlaceKind = "settlement"): Place | null {
  const rows = allOfKind(kind);
  let best: Place | null = null;
  let bestD = Infinity;
  for (const row of rows) {
    const d = (row.lat - lat) ** 2 + (row.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = row;
    }
  }
  return best;
}

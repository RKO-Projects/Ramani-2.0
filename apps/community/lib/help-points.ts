export type HelpKind = "toilet" | "relief" | "haven";

export type HelpPoint = {
  id: string;
  name: string;
  kind: HelpKind;
  landmarkId: string;
  meters: number;
  bearing: string;
  hint: string;
};

export const HELP_POINTS: HelpPoint[] = [
  {
    id: "fl-toilet-3",
    name: "Fresh Life Toilet #3",
    kind: "toilet",
    landmarkId: "line-saba",
    meters: 80,
    bearing: "East",
    hint: "You are near Line Saba Fresh Life Toilet #3",
  },
  {
    id: "fl-toilet-2",
    name: "Fresh Life Toilet #2",
    kind: "toilet",
    landmarkId: "laini-saba",
    meters: 40,
    bearing: "North",
    hint: "Laini Saba — near Fresh Life Toilet #2",
  },
  {
    id: "red-cross",
    name: "Red Cross Center",
    kind: "relief",
    landmarkId: "community-center",
    meters: 150,
    bearing: "North",
    hint: "Red Cross Center is 150m North",
  },
  {
    id: "highridge-haven",
    name: "Highridge high ground",
    kind: "haven",
    landmarkId: "highridge",
    meters: 0,
    bearing: "",
    hint: "Safe haven — Highridge Road",
  },
  {
    id: "olympic-relief",
    name: "Olympic relief point",
    kind: "relief",
    landmarkId: "olympic",
    meters: 60,
    bearing: "West",
    hint: "Olympic grounds — relief staging",
  },
];

export function helpNear(landmarkId: string): HelpPoint[] {
  const local = HELP_POINTS.filter((row) => row.landmarkId === landmarkId);
  if (local.length) return local;
  return HELP_POINTS.filter((row) => row.kind === "relief" || row.kind === "haven").slice(0, 2);
}

export function helpLine(landmarkId: string, landmarkName: string): string {
  const rows = helpNear(landmarkId);
  if (!rows.length) return `You are near ${landmarkName}.`;
  const first = rows[0];
  const distance = first.meters ? `${first.meters}m ${first.bearing}`.trim() : "here";
  return `You are near ${landmarkName}. ${first.name} is ${distance}.`;
}

"use client";

import type { Landmark } from "@/lib/api";
import { HELP_POINTS, helpLine, type HelpPoint } from "@/lib/help-points";

const BOX = { minLat: -1.3195, maxLat: -1.3075, minLon: 36.7815, maxLon: 36.7985 };

function xy(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - BOX.minLon) / (BOX.maxLon - BOX.minLon)) * 320;
  const y = (1 - (lat - BOX.minLat) / (BOX.maxLat - BOX.minLat)) * 220;
  return { x: Math.max(18, Math.min(302, x)), y: Math.max(18, Math.min(202, y)) };
}

const KIND_COLOR: Record<HelpPoint["kind"], string> = {
  toilet: "#0f4f4a",
  relief: "#c44536",
  haven: "#276ef1",
};

export function SchemaMap({
  landmarks,
  hereId,
  onSelect,
}: {
  landmarks: Landmark[];
  hereId: string;
  onSelect?: (id: string) => void;
}) {
  const here = landmarks.find((row) => row.id === hereId) ?? landmarks[0];
  const help = HELP_POINTS;

  return (
    <div className="schema-stage">
      <svg className="schema-map" viewBox="0 0 320 240" role="img" aria-label="Kibera emergency schematic">
        <rect width="320" height="240" fill="#e7f1ef" />
        <path d="M20 150 C80 140, 140 170, 210 155 S300 140, 310 148" fill="none" stroke="#8bb8b2" strokeWidth="10" strokeLinecap="round" />
        <text x="24" y="28" fill="#0f4f4a" fontSize="11" fontWeight="700">
          Kibera · help nearby
        </text>
        {landmarks.map((pin) => {
          const p = xy(pin.lat, pin.lon);
          const active = pin.id === here?.id;
          return (
            <g key={pin.id} onClick={() => onSelect?.(pin.id)} style={{ cursor: "pointer" }}>
              <circle cx={p.x} cy={p.y} r={active ? 11 : 7} fill={active ? "#0f4f4a" : "#fff"} stroke="#0f4f4a" strokeWidth="2" />
              {pin.safe_haven ? <circle cx={p.x} cy={p.y} r="3" fill="#276ef1" /> : null}
              <text x={p.x} y={p.y + 18} textAnchor="middle" fill="#1c1f24" fontSize="8" fontWeight={active ? 700 : 500}>
                {pin.name.replace(" Road", "")}
              </text>
            </g>
          );
        })}
        {help.map((point) => {
          const host = landmarks.find((row) => row.id === point.landmarkId);
          if (!host) return null;
          const p = xy(host.lat + 0.0008, host.lon + 0.0012);
          return (
            <g key={point.id}>
              <rect x={p.x - 5} y={p.y - 5} width="10" height="10" rx="2" fill={KIND_COLOR[point.kind]} />
            </g>
          );
        })}
      </svg>
      <p className="schema-chip">{here ? helpLine(here.id, here.name) : "Pick a landmark"}</p>
      <ul className="schema-legend">
        <li><span className="dot you" /> You</li>
        <li><span className="dot toilet" /> Fresh Life</li>
        <li><span className="dot relief" /> Red Cross / relief</li>
        <li><span className="dot haven" /> High ground</li>
      </ul>
    </div>
  );
}

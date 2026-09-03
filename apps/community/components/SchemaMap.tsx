"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type AreaDetail, type AreaMapPayload, type AreaNode } from "@/lib/api";
import { fallbackDetail, SEED_AREA_MAP } from "@/lib/areas";
import { AreaSheet } from "./AreaSheet";

const BOX = { minLat: -1.3195, maxLat: -1.3075, minLon: 36.7815, maxLon: 36.7985 };

function xy(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - BOX.minLon) / (BOX.maxLon - BOX.minLon)) * 320;
  const y = (1 - (lat - BOX.minLat) / (BOX.maxLat - BOX.minLat)) * 220;
  return { x: Math.max(18, Math.min(302, x)), y: Math.max(22, Math.min(198, y)) };
}

export function SchemaMap({
  hereId,
  onSelect,
}: {
  hereId: string;
  onSelect?: (id: string) => void;
}) {
  const [payload, setPayload] = useState<AreaMapPayload>(SEED_AREA_MAP);
  const [open, setOpen] = useState<AreaDetail | null>(null);

  useEffect(() => {
    api<AreaMapPayload>("/api/v1/areas")
      .then(setPayload)
      .catch(() => {
        /* seed schematic still works offline */
      });
  }, []);

  const nodes = payload.nodes;
  const here = nodes.find((row) => row.id === hereId) ?? nodes[0];
  const nearby = useMemo(() => new Set(here?.neighbors ?? []), [here]);

  async function openArea(node: AreaNode) {
    try {
      const detail = await api<AreaDetail>(`/api/v1/areas/${node.id}`);
      setOpen(detail);
    } catch {
      setOpen(fallbackDetail(node, nodes));
    }
  }

  return (
    <div className="schema-stage">
      <svg className="schema-map" viewBox="0 0 320 240" role="img" aria-label="Kibera area schematic. Tap an area for details.">
        <rect width="320" height="240" fill="var(--map-fill)" />
        <path
          d="M20 150 C80 140, 140 170, 210 155 S300 140, 310 148"
          fill="none"
          stroke="var(--map-water)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <text x="24" y="22" fill="var(--map-text)" fontSize="11" fontWeight="700">
          Kibera · you, nearby, danger
        </text>
        {payload.edges.map((edge) => {
          const a = nodes.find((row) => row.id === edge.from_id);
          const b = nodes.find((row) => row.id === edge.to_id);
          if (!a || !b) return null;
          const p = xy(a.lat, a.lon);
          const q = xy(b.lat, b.lon);
          return (
            <line
              key={`${edge.from_id}-${edge.to_id}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={edge.flood_prone ? "#c44536" : "var(--map-link)"}
              strokeWidth={edge.flood_prone ? 2.4 : 1.4}
              strokeDasharray={edge.flood_prone ? "4 3" : undefined}
              opacity={0.7}
            />
          );
        })}
        {nodes.map((pin) => {
          const p = xy(pin.lat, pin.lon);
          const active = pin.id === here?.id;
          const neighbor = nearby.has(pin.id);
          return (
            <g key={pin.id} onClick={() => openArea(pin)} style={{ cursor: "pointer" }}>
              {pin.alarm ? <circle className="alarm-halo" cx={p.x} cy={p.y} r="12" /> : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 12 : neighbor ? 9 : 7}
                fill={active ? "var(--teal)" : pin.safe_haven ? "#276ef1" : "var(--card)"}
                stroke={active ? "var(--you-ring)" : pin.alarm ? "#c44536" : "var(--teal)"}
                strokeWidth={active || neighbor ? 3 : 2}
              />
              <text
                x={p.x}
                y={p.y + 20}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize="8"
                fontWeight={active || neighbor ? 700 : 500}
              >
                {pin.name.replace(" Road", "").replace(" Alley", "")}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="schema-chip">
        {here
          ? `You: ${here.name}. Nearby: ${(here.neighbors || []).slice(0, 3).join(", ") || "tap a pin"}. Tap any area for details.`
          : "Tap an area for details."}
      </p>
      <ul className="schema-legend">
        <li><span className="dot you" /> You</li>
        <li><span className="dot neighbor" /> Nearby</li>
        <li><span className="dot alarm" /> Danger alarm</li>
        <li><span className="dot haven" /> High ground</li>
      </ul>
      {open ? (
        <AreaSheet
          detail={open}
          onClose={() => setOpen(null)}
          onUseHere={(id) => {
            onSelect?.(id);
            setOpen(null);
          }}
        />
      ) : null}
    </div>
  );
}

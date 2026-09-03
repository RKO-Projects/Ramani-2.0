"use client";

import { useEffect, useRef, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Landmark, SosEvent, HazardEvent, DamageReport, CviZone, AreaEdge, HelpPoint } from "@/lib/api";

const KIBERA_CENTER: [number, number] = [36.789, -1.313];

// 100% Free ESRI Dark Gray Canvas — NO API KEY, NO WATERMARK!
const ESRI_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-dark": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.esri.com" target="_blank">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: "esri-dark-layer",
      type: "raster",
      source: "esri-dark",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/* ── Kind → emoji icon mapping ──────────────────────────────── */
const SOS_ICONS: Record<string, string> = {
  flood_trapped: "🌊",
  collapse_fire: "🔥",
  medical: "🏥",
  stuck_debris: "🪵",
  stuck_location: "📍",
  car_flooding: "🚗",
};

const HAZARD_ICONS: Record<string, string> = {
  blocked_drainage: "🚧",
  rising_water: "💧",
  damaged_structure: "🏚️",
};

/* ── Types for map overlays ─────────────────────────────────── */
export type MapLayerId = "cvi" | "sos" | "hazards" | "infra" | "routes" | "elNino";

export interface MapOverlays {
  landmarks?: Landmark[];
  sosEvents?: SosEvent[];
  hazards?: HazardEvent[];
  damage?: DamageReport[];
  cviZones?: CviZone[];
  cviLayer?: string | null;
  routePath?: Landmark[];
  floodEdges?: AreaEdge[];
  helpPoints?: HelpPoint[];
}

export type MapLayers = Partial<Record<MapLayerId, boolean>>;

interface MapViewProps {
  overlays: MapOverlays;
  layers?: MapLayers;
  onLandmarkClick?: (lm: Landmark) => void;
  onSosClick?: (sos: SosEvent) => void;
  flyTo?: [number, number] | null;
}

export default function MapView({ overlays, layers, onLandmarkClick, onSosClick, flyTo }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  /* ── Helpers ───────────────────────────────────────────────── */
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  const landmarkMap = useCallback(() => {
    const map = new Map<string, Landmark>();
    overlays.landmarks?.forEach((lm) => map.set(lm.id, lm));
    return map;
  }, [overlays.landmarks]);

  /* ── Initialize map ────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: ESRI_DARK_STYLE,
      center: KIBERA_CENTER,
      zoom: 14.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── Fly to ────────────────────────────────────────────────── */
  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo({ center: flyTo, zoom: 16, duration: 1200 });
    }
  }, [flyTo]);

  /* ── Render overlays ───────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!map.isStyleLoaded()) {
      const handler = () => renderOverlays();
      map.once("load", handler);
      return () => { map.off("load", handler); };
    }

    renderOverlays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays, layers]);

  function renderOverlays() {
    const map = mapRef.current;
    if (!map) return;
    clearMarkers();

    const show = {
      cvi: layers?.cvi ?? Boolean(overlays.cviLayer),
      sos: layers?.sos ?? true,
      hazards: layers?.hazards ?? true,
      infra: layers?.infra ?? true,
      routes: layers?.routes ?? true,
      elNino: layers?.elNino ?? false,
    };
    const lmMap = landmarkMap();

    const routeCoords = show.routes ? overlays.routePath?.map((lm) => [lm.lon, lm.lat] as [number, number]) ?? [] : [];
    if (map.getSource("route-line")) {
      (map.getSource("route-line") as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: routeCoords },
      });
    } else if (routeCoords.length > 1) {
      map.addSource("route-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: routeCoords },
        },
      });
      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#12a888",
          "line-width": 4,
          "line-opacity": 0.85,
          "line-dasharray": [2, 1],
        },
      });
    }

    const floodCoords = show.elNino
      ? (overlays.floodEdges ?? [])
          .filter((edge) => edge.flood_prone)
          .map((edge) => {
            const a = lmMap.get(edge.from_id);
            const b = lmMap.get(edge.to_id);
            if (!a || !b) return null;
            return {
              type: "Feature" as const,
              properties: {},
              geometry: { type: "LineString" as const, coordinates: [[a.lon, a.lat], [b.lon, b.lat]] },
            };
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row))
      : [];
    const floodFc = { type: "FeatureCollection" as const, features: floodCoords };
    if (map.getSource("flood-runoff")) {
      (map.getSource("flood-runoff") as maplibregl.GeoJSONSource).setData(floodFc);
    } else if (floodCoords.length) {
      map.addSource("flood-runoff", { type: "geojson", data: floodFc });
      map.addLayer({
        id: "flood-runoff-layer",
        type: "line",
        source: "flood-runoff",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#38bdf8",
          "line-width": 5,
          "line-opacity": 0.72,
          "line-dasharray": [1, 1.4],
        },
      });
    }

    if (show.cvi && overlays.cviZones) {
      const scoreKey = overlays.cviLayer === "heat" ? "elevation_slope"
        : overlays.cviLayer === "density" ? "structural_density"
        : "drainage_proximity";

      overlays.cviZones.forEach((zone) => {
        const zoneLm = overlays.landmarks?.find((lm) => lm.id === zone.id || lm.zone === zone.id || lm.zone === zone.name);
        if (!zoneLm) return;

        const score = zone[scoreKey as keyof CviZone] as number;
        const size = 22 + zone.cvi * 36;
        const color = zone.priority === "critical" ? "#f43f5e"
          : zone.priority === "high" ? "#e08a3c"
          : zone.priority === "moderate" ? "#3b82f6"
          : "#0e7c66";

        const el = document.createElement("div");
        el.className = "marker-cvi";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.background = color;
        el.textContent = zone.cvi.toFixed(1);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([zoneLm.lon, zoneLm.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<div class="popup-title">${zone.name}</div>
               <div class="popup-meta">CVI: ${zone.cvi.toFixed(2)} · ${zone.priority}<br/>
               ${scoreKey.replaceAll("_", " ")}: ${Number(score).toFixed(2)}</div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    if (overlays.landmarks && show.infra && !show.cvi) {
      overlays.landmarks.forEach((lm) => {
        const el = document.createElement("div");
        el.className = lm.safe_haven ? "marker-safe-haven" : "marker-landmark";
        if (lm.safe_haven) el.textContent = "✦";

        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<div class="popup-title">${lm.name}</div>
           <div class="popup-meta">${lm.zone}${lm.safe_haven ? " · Safe haven" : ""}</div>`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lm.lon, lm.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", () => onLandmarkClick?.(lm));
        markersRef.current.push(marker);
      });
    }

    if (show.infra && overlays.helpPoints) {
      overlays.helpPoints.forEach((help) => {
        const lm = lmMap.get(help.landmark_id);
        if (!lm) return;
        const el = document.createElement("div");
        el.className = `marker-infra ${help.kind}`;
        el.title = help.name;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lm.lon, lm.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<div class="popup-title">${help.name}</div>
               <div class="popup-meta">${help.kind} · ${lm.name}<br/>${help.hint}</div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    if (show.sos && overlays.sosEvents) {
      overlays.sosEvents.forEach((sos) => {
        const lm = sos.landmark_id ? lmMap.get(sos.landmark_id) : null;
        if (!lm) return;

        const el = document.createElement("div");
        el.className = `marker-sos ${sos.status}`;
        el.title = `${SOS_ICONS[sos.kind] ?? "🆘"} ${sos.kind.replaceAll("_", " ")} — ${sos.status}`;

        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<div class="popup-title">${SOS_ICONS[sos.kind] ?? "🆘"} ${sos.kind.replaceAll("_", " ")}</div>
           <div class="popup-meta">
             ${lm.name} · ${sos.source.toUpperCase()}<br/>
             Status: ${sos.status}${sos.needs_medical ? " · MEDICAL" : ""}<br/>
             ${sos.phone_masked ? `${sos.phone_masked}<br/>` : ""}
             ${new Date(sos.created_at).toLocaleString()}
           </div>`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lm.lon, lm.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", () => onSosClick?.(sos));
        markersRef.current.push(marker);
      });
    }

    if (show.hazards && overlays.hazards) {
      overlays.hazards.forEach((h) => {
        const lm = lmMap.get(h.from_landmark);
        if (!lm) return;

        const el = document.createElement("div");
        el.className = "marker-hazard";
        el.title = `${HAZARD_ICONS[h.kind] ?? "⚠️"} ${h.kind.replaceAll("_", " ")}`;

        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<div class="popup-title">${HAZARD_ICONS[h.kind] ?? "⚠️"} ${h.kind.replaceAll("_", " ")}</div>
           <div class="popup-meta">
             ${lm.name}${h.note ? ` · ${h.note}` : ""}<br/>
             ${new Date(h.created_at).toLocaleString()}
           </div>`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lm.lon, lm.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    if (overlays.damage) {
      overlays.damage.forEach((d) => {
        const lm = lmMap.get(d.landmark_id);
        if (!lm) return;

        const el = document.createElement("div");
        el.className = "marker-damage";
        el.title = `${d.kind.replaceAll("_", " ")} — ${d.verified ? "verified" : "unverified"}`;

        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<div class="popup-title">${d.kind.replaceAll("_", " ")}</div>
           <div class="popup-meta">
             ${lm.name} · ${d.verified ? "✅ Verified" : "Unverified"}<br/>
             ${new Date(d.created_at).toLocaleString()}
           </div>`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lm.lon, lm.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });
    }
  }

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="map-container" style={{ height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Landmark, SosEvent, HazardEvent, DamageReport, CviZone } from "@/lib/api";

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
};

const HAZARD_ICONS: Record<string, string> = {
  blocked_drainage: "🚧",
  rising_water: "💧",
  damaged_structure: "🏚️",
};

/* ── Types for map overlays ─────────────────────────────────── */
export interface MapOverlays {
  landmarks?: Landmark[];
  sosEvents?: SosEvent[];
  hazards?: HazardEvent[];
  damage?: DamageReport[];
  cviZones?: CviZone[];
  cviLayer?: string | null; // "flood" | "heat" | "density" | null
  routePath?: Landmark[];   // ordered landmarks forming a route line
}

interface MapViewProps {
  overlays: MapOverlays;
  onLandmarkClick?: (lm: Landmark) => void;
  onSosClick?: (sos: SosEvent) => void;
  flyTo?: [number, number] | null;
}

export default function MapView({ overlays, onLandmarkClick, onSosClick, flyTo }: MapViewProps) {
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

    return () => {
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
  }, [overlays]);

  function renderOverlays() {
    const map = mapRef.current;
    if (!map) return;
    clearMarkers();

    const lmMap = landmarkMap();

    // ── Route line ──────────────────────────────────────────
    if (map.getSource("route-line")) {
      (map.getSource("route-line") as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: overlays.routePath?.map((lm) => [lm.lon, lm.lat]) ?? [],
        },
      });
    } else if (overlays.routePath && overlays.routePath.length > 1) {
      map.addSource("route-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: overlays.routePath.map((lm) => [lm.lon, lm.lat]),
          },
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

    // ── CVI zone markers (Before view) ──────────────────────
    if (overlays.cviZones && overlays.cviLayer) {
      const scoreKey = overlays.cviLayer === "flood" ? "drainage_proximity"
        : overlays.cviLayer === "heat" ? "elevation_slope"
        : "structural_density";

      overlays.cviZones.forEach((zone) => {
        const zoneLm = overlays.landmarks?.find((lm) => lm.zone === zone.id || lm.zone === zone.name);
        if (!zoneLm) return;

        const score = zone[scoreKey as keyof CviZone] as number;
        const size = 20 + score * 30;
        const color = zone.priority === "critical" ? "#f43f5e"
          : zone.priority === "high" ? "#e08a3c"
          : zone.priority === "moderate" ? "#3b82f6"
          : "#0e7c66";

        const el = document.createElement("div");
        el.className = "marker-cvi";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.background = color;
        el.textContent = score.toFixed(1);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([zoneLm.lon, zoneLm.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<div class="popup-title">${zone.name}</div>
               <div class="popup-meta">CVI: ${zone.cvi.toFixed(2)} · ${zone.priority}<br/>
               ${scoreKey.replaceAll("_", " ")}: ${score.toFixed(2)}</div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // ── Landmark markers ────────────────────────────────────
    if (overlays.landmarks && !overlays.cviLayer) {
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

    // ── SOS pins ────────────────────────────────────────────
    if (overlays.sosEvents) {
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
             Status: ${sos.status}<br/>
             ${sos.note ? `Note: ${sos.note}<br/>` : ""}
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

    // ── Hazard markers ──────────────────────────────────────
    if (overlays.hazards) {
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

    // ── Damage markers ──────────────────────────────────────
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

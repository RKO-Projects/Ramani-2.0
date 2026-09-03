"use client";

import { useEffect, useRef } from "react";
import type { Place } from "@/lib/nairobi";
import { zoomFor } from "@/lib/nairobi";
import "leaflet/dist/leaflet.css";

type Gps = { lat: number; lon: number; accuracy?: number };

export function PlaceMap({
  center,
  pins,
  selectedId,
  gps,
  onSelect,
}: {
  center: Place;
  pins: Place[];
  selectedId?: string;
  gps?: Gps | null;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const pinKey = pins.map((pin) => pin.id).join(",");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let map: { remove: () => void } | null = null;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el) return;

      const instance = L.map(el, { zoomControl: true, attributionControl: true }).setView(
        [gps?.lat ?? center.lat, gps?.lon ?? center.lon],
        gps ? 16 : zoomFor(center.kind),
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
        subdomains: "abcd",
        attribution: "&copy; OpenStreetMap &copy; CARTO",
      }).addTo(instance);

      const points = pins.length ? pins : [center];
      points.forEach((pin) => {
        const active = pin.id === selectedId;
        const marker = L.circleMarker([pin.lat, pin.lon], {
          radius: active ? 11 : 6,
          color: "#fff",
          weight: 2,
          fillColor: active ? "#0f4f4a" : "#276ef1",
          fillOpacity: active ? 1 : 0.85,
        }).addTo(instance);
        marker.bindTooltip(pin.name, { direction: "top", opacity: 0.96 });
        marker.on("click", () => selectRef.current?.(pin.id));
      });

      if (gps) {
        if (gps.accuracy && gps.accuracy < 400) {
          L.circle([gps.lat, gps.lon], {
            radius: gps.accuracy,
            color: "#276ef1",
            weight: 1,
            fillColor: "#276ef1",
            fillOpacity: 0.12,
          }).addTo(instance);
        }
        const you = L.divIcon({
          className: "uber-you",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([gps.lat, gps.lon], { icon: you, zIndexOffset: 1000 })
          .addTo(instance)
          .bindTooltip("You are here", { direction: "top" });
      }

      const selected = points.find((pin) => pin.id === selectedId);
      if (selected && !gps) {
        instance.setView([selected.lat, selected.lon], zoomFor(selected.kind));
      } else if (selected && gps) {
        instance.setView([selected.lat, selected.lon], Math.max(zoomFor(selected.kind), 14));
      } else if (gps) {
        instance.setView([gps.lat, gps.lon], 16);
      }
      map = instance;
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [center.id, center.lat, center.lon, pinKey, selectedId, gps?.lat, gps?.lon, gps?.accuracy]);

  return <div ref={ref} className="place-map" role="img" aria-label="Street map of Nairobi" />;
}

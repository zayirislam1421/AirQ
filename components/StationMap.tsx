"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react";
import L from "leaflet";
import { colorForAqi, bandForAqi } from "@/lib/aqi-colors";
import { AnimatedMapTooltip, type TooltipState } from "@/components/ui/animated-tooltip";
import type { TimelineDTO } from "@/lib/types";

/**
 * Leaflet station map with an imperative frame API.
 *
 * Markers are canvas-rendered CircleMarkers (preferCanvas) so 500 stations draw
 * to one surface, not 500 DOM nodes. The scrubber calls `setFrame(i)` to
 * restyle markers in place — NO React re-render per frame, which is what keeps
 * playback smooth (the research's key perf rule).
 *
 * Hover shows a framer-motion tooltip: since canvas markers aren't DOM, we
 * capture the marker's screen position + current-frame AQI into React state and
 * render an absolutely-positioned overlay.
 */

export interface StationMapHandle {
  setFrame: (frameIndex: number) => void;
  focus: (lat: number, lon: number, zoom?: number) => void;
}

interface Props {
  data: TimelineDTO;
  accessible?: boolean;
  onSelect?: (stationId: number) => void;
}

const INDIA_CENTER: [number, number] = [22.5, 80.5];

export const StationMap = forwardRef<StationMapHandle, Props>(function StationMap(
  { data, accessible = false, onSelect },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const frameRef = useRef<number>(Math.max(0, data.aqi.length - 1));
  const [tip, setTip] = useState<TooltipState | null>(null);

  // Apply a frame's colors to all markers (shared by scrubber + initial paint).
  function paintFrame(frameIndex: number) {
    const frame = data.aqi[frameIndex];
    if (!frame) return;
    markersRef.current.forEach((marker, i) => {
      if (!marker) return;
      const aqi = frame[i];
      const band = bandForAqi(aqi);
      marker.setStyle({
        fillColor: colorForAqi(aqi, accessible),
        fillOpacity: band ? 0.85 : 0.15,
      });
    });
  }

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: INDIA_CENTER,
      zoom: 5,
      preferCanvas: true,
      worldCopyJump: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;

    // Hide the tooltip while panning/zooming (its anchor would be stale).
    map.on("movestart", () => setTip(null));

    data.stationIds.forEach((id, i) => {
      const lat = data.lats[i];
      const lon = data.lons[i];
      if (!lat || !lon) return;
      const marker = L.circleMarker([lat, lon], {
        radius: 7,
        weight: 1,
        color: "#00000033",
        fillOpacity: 0.85,
      });

      marker.on("mouseover", () => {
        const pt = map.latLngToContainerPoint([lat, lon]);
        const aqi = data.aqi[frameRef.current]?.[i] ?? null;
        setTip({ name: data.names[i], aqi, x: pt.x, y: pt.y });
        marker.setStyle({ weight: 2, color: "#ffffff" });
      });
      marker.on("mouseout", () => {
        setTip(null);
        marker.setStyle({ weight: 1, color: "#00000033" });
      });
      marker.on("click", () => onSelect?.(id));

      marker.addTo(map);
      markersRef.current[i] = marker;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // Re-init only if the station set identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.stationIds.length]);

  // Imperative API.
  useImperativeHandle(ref, () => ({
    setFrame(frameIndex: number) {
      frameRef.current = frameIndex;
      paintFrame(frameIndex);
    },
    focus(lat: number, lon: number, zoom = 10) {
      mapRef.current?.flyTo([lat, lon], zoom, { duration: 1 });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, accessible]);

  // Paint the initial (latest) frame after markers exist.
  useEffect(() => {
    const last = data.aqi.length - 1;
    if (last >= 0) {
      frameRef.current = last;
      paintFrame(last);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, accessible]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <AnimatedMapTooltip tip={tip} />
    </div>
  );
});

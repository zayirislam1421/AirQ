"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { bandForAqi } from "@/lib/aqi-colors";

interface Marker {
  lat: number;
  lon: number;
  aqi: number | null;
}

/** Hex "#rrggbb" -> cobe's [r,g,b] floats in 0..1. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Auto-rotating globe (cobe) with stations plotted as markers, colored by CPCB
 * band and sized by severity.
 *
 * Sizing follows cobe's canonical pattern: measure the wrapper, store the px
 * width in state, and only create the globe once we have a real (>0) width.
 * This avoids the "globe invisible until refresh" race where cobe is created
 * before layout settles and renders at width 0.
 */
export function AqiGlobe() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [size, setSize] = useState(0);

  // Fetch station markers.
  useEffect(() => {
    fetch("/api/map")
      .then((r) => r.json())
      .then((d) => {
        const ms: Marker[] = (d.markers ?? [])
          .filter((m: { lat: number; lon: number }) => m.lat && m.lon)
          .map((m: { lat: number; lon: number; aqi: number | null }) => ({
            lat: m.lat,
            lon: m.lon,
            aqi: m.aqi,
          }));
        setMarkers(ms);
      })
      .catch(() => setMarkers([]));
  }, []);

  // Measure the wrapper; keep `size` in sync with layout.
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const update = () => setSize(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Create the globe once we have a real size AND the markers.
  useEffect(() => {
    if (!canvasRef.current || size === 0) return;

    let phi = 0;
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: 4.6, // rotate to face India (~80°E)
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.35, 0.45],
      markerColor: [1, 0.55, 0.15],
      glowColor: [0.35, 0.4, 0.5],
      markers: markers.map((m) => {
        const band = bandForAqi(m.aqi);
        return {
          location: [m.lat, m.lon] as [number, number],
          size:
            m.aqi == null ? 0.02 : Math.min(0.11, 0.03 + (m.aqi / 500) * 0.08),
        };
      }),
      onRender: (state) => {
        phi += 0.004;
        state.phi = phi;
      },
    });

    return () => globe.destroy();
  }, [size, markers]);

  return (
    <div
      ref={wrapRef}
      className="relative aspect-square w-full max-w-[460px]"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="h-full w-full"
      />
    </div>
  );
}

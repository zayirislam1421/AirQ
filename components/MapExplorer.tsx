"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scrubber } from "./Scrubber";
import { AQI_BANDS } from "@/lib/aqi-colors";
import type { TimelineDTO } from "@/lib/types";
import type { StationMapHandle } from "./StationMap";

// Leaflet touches `window`, so the map must be client-only (no SSR).
const StationMap = dynamic(
  () => import("./StationMap").then((m) => m.StationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

export function MapExplorer() {
  const [data, setData] = useState<TimelineDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<StationMapHandle>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityParam = searchParams.get("city");

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  // If arriving with ?city=, fly the map to that city's centroid once loaded.
  useEffect(() => {
    if (!cityParam || !data) return;
    fetch(`/api/cities?q=${encodeURIComponent(cityParam)}`)
      .then((r) => r.json())
      .then((d) => {
        const match = (d.cities ?? []).find(
          (c: { city: string; latitude: number | null; longitude: number | null }) =>
            c.city.toLowerCase() === cityParam.toLowerCase(),
        );
        if (match?.latitude != null && match?.longitude != null) {
          // small delay so the map instance is mounted
          setTimeout(() => mapRef.current?.focus(match.latitude, match.longitude, 10), 400);
        }
      })
      .catch(() => {});
  }, [cityParam, data]);

  const handleFrame = useCallback((index: number) => {
    mapRef.current?.setFrame(index);
  }, []);

  const handleSelect = useCallback(
    (id: number) => router.push(`/stations/${id}`),
    [router],
  );

  if (error) {
    return <div className="p-6 text-destructive">Failed to load: {error}</div>;
  }
  if (!data) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Loading stations…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-[68vh] overflow-hidden rounded-xl border">
        <StationMap ref={mapRef} data={data} onSelect={handleSelect} />
        <Legend />
      </div>
      <Scrubber timestamps={data.timestamps} onFrame={handleFrame} />
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border bg-background/90 p-2 text-xs shadow backdrop-blur">
      <div className="mb-1 font-medium">AQI</div>
      <div className="space-y-0.5">
        {AQI_BANDS.map((b) => (
          <div key={b.category} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: b.color }}
            />
            <span>
              {b.category} <span className="text-muted-foreground">({b.min}–{b.max})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

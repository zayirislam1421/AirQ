import { Suspense } from "react";
import { MapExplorer } from "@/components/MapExplorer";

export const metadata = { title: "Map — AirQ India" };

export default function MapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Station Map</h1>
        <p className="text-sm text-muted-foreground">
          Scrub the timeline to watch AQI change across India. Click a station for details.
        </p>
      </div>
      <Suspense fallback={<div className="py-10 text-muted-foreground">Loading…</div>}>
        <MapExplorer />
      </Suspense>
    </div>
  );
}

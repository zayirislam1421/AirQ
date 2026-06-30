"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AqiDial } from "./AqiDial";
import { colorForAqi, type AqiCategory } from "@/lib/aqi-colors";
import type { StationAqiDTO } from "@/lib/types";
import type { Pollutant } from "@/lib/aqi";

interface DetailResp {
  station: { id: number; name: string; city: string; state: string };
  aqi: { aqi: number | null; category: string | null; dominantPollutant: string | null } | null;
  readings: { pollutantId: string; avgValue: number | null }[];
}

const POLLUTANTS: Pollutant[] = ["PM2.5", "PM10", "NO2", "SO2", "OZONE", "NH3", "CO"];

export function CompareView() {
  const [stations, setStations] = useState<StationAqiDTO[]>([]);
  const [leftId, setLeftId] = useState<number | null>(null);
  const [rightId, setRightId] = useState<number | null>(null);
  const [left, setLeft] = useState<DetailResp | null>(null);
  const [right, setRight] = useState<DetailResp | null>(null);

  useEffect(() => {
    fetch("/api/stations")
      .then((r) => r.json())
      .then((d) => {
        const s: StationAqiDTO[] = d.stations ?? [];
        setStations(s);
        if (s.length >= 2) {
          setLeftId(s[0].stationId);
          setRightId(s[1].stationId);
        }
      });
  }, []);

  useEffect(() => {
    if (leftId != null)
      fetch(`/api/stations/${leftId}`).then((r) => r.json()).then(setLeft);
  }, [leftId]);
  useEffect(() => {
    if (rightId != null)
      fetch(`/api/stations/${rightId}`).then((r) => r.json()).then(setRight);
  }, [rightId]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Picker label="Left" stations={stations} value={leftId} onChange={setLeftId} />
      <Picker label="Right" stations={stations} value={rightId} onChange={setRightId} />
      <Side detail={left} />
      <Side detail={right} />
    </div>
  );
}

function Picker({
  label,
  stations,
  value,
  onChange,
}: {
  label: string;
  stations: StationAqiDTO[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
    >
      {stations.map((s) => (
        <option key={s.stationId} value={s.stationId}>
          {s.name} — {s.city}
        </option>
      ))}
    </select>
  );
}

function Side({ detail }: { detail: DetailResp | null }) {
  const maxByPollutant = useMemo(() => {
    const m: Record<string, number> = {
      "PM2.5": 250,
      PM10: 430,
      NO2: 400,
      SO2: 800,
      OZONE: 200,
      NH3: 1200,
      CO: 50,
    };
    return m;
  }, []);

  if (!detail) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          Select a station…
        </CardContent>
      </Card>
    );
  }
  const byId: Record<string, number | null> = {};
  detail.readings.forEach((r) => (byId[r.pollutantId] = r.avgValue));

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div>
          <div className="font-semibold">{detail.station.name}</div>
          <div className="text-sm text-muted-foreground">
            {detail.station.city}, {detail.station.state}
          </div>
        </div>
        <AqiDial
          aqi={detail.aqi?.aqi ?? null}
          category={(detail.aqi?.category as AqiCategory) ?? null}
        />
        <div className="space-y-2">
          {POLLUTANTS.map((p) => {
            const v = byId[p];
            const pct = v != null ? Math.min(100, (v / maxByPollutant[p]) * 100) : 0;
            return (
              <div key={p} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-muted-foreground">{p}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: "#6366f1" }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums">{v ?? "—"}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

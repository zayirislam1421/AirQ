"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  CartesianGrid,
} from "recharts";
import { formatIST } from "@/lib/utils";
import type { Pollutant } from "@/lib/aqi";

const POLLUTANTS: Pollutant[] = ["PM2.5", "PM10", "NO2", "SO2", "OZONE", "NH3", "CO"];

interface Point {
  t: string;
  value: number | null;
}

export function TrendChart({ stationId }: { stationId: number }) {
  const [pollutant, setPollutant] = useState<Pollutant>("PM2.5");
  const [points, setPoints] = useState<Point[] | null>(null);

  useEffect(() => {
    setPoints(null);
    fetch(`/api/stations/${stationId}/trends?pollutant=${encodeURIComponent(pollutant)}`)
      .then((r) => r.json())
      .then((d) => setPoints(d.points ?? []))
      .catch(() => setPoints([]));
  }, [stationId, pollutant]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {POLLUTANTS.map((p) => (
          <button
            key={p}
            onClick={() => setPollutant(p)}
            className={`rounded-md border px-2.5 py-1 text-xs ${
              pollutant === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {points == null ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading…
        </div>
      ) : points.length <= 1 ? (
        <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
          Not enough history yet for {pollutant}.<br />
          Trends build up as ingestion runs over time.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={points} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="t"
              tickFormatter={(t) => formatIST(t).split(",")[0]}
              fontSize={11}
              minTickGap={40}
            />
            <YAxis fontSize={11} />
            <Tooltip
              labelFormatter={(t) => formatIST(String(t))}
              formatter={(v) => [v, pollutant]}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Brush dataKey="t" height={24} stroke="#6366f1" tickFormatter={() => ""} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

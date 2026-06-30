import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AqiDial } from "@/components/AqiDial";
import { TrendChart } from "@/components/TrendChart";
import { stationDetail } from "@/lib/queries";
import { POLLUTANT_INFO } from "@/lib/pollutant-info";
import type { Pollutant } from "@/lib/aqi";
import type { AqiCategory } from "@/lib/aqi-colors";

export const dynamic = "force-dynamic";

export default async function StationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stationId = Number(id);
  if (!Number.isInteger(stationId)) notFound();

  const detail = await stationDetail(stationId);
  if (!detail) notFound();

  const { station, aqi, readings } = detail;
  const dominant = aqi?.dominantPollutant as Pollutant | null;
  const info = dominant ? POLLUTANT_INFO[dominant] : null;

  return (
    <div className="space-y-6">
      <Link
        href="/map"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{station.name}</h1>
        <p className="text-muted-foreground">
          {station.city}, {station.state}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center justify-center py-4">
          <AqiDial aqi={aqi?.aqi ?? null} category={(aqi?.category as AqiCategory) ?? null} />
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {dominant ? `Dominant pollutant: ${dominant}` : "Insufficient data for AQI"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {info ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{info.label}</p>
                <p>
                  <span className="text-muted-foreground">Sources: </span>
                  {info.sources}
                </p>
                <p>
                  <span className="text-muted-foreground">Health effects: </span>
                  {info.effects}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This station reports fewer than 3 AQI-eligible pollutants, so a CPCB
                AQI cannot be computed right now.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-pollutant readings */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {readings.map((r) => (
          <Card key={r.id}>
            <CardContent className="py-4">
              <div className="text-xs uppercase text-muted-foreground">{r.pollutantId}</div>
              <div className="text-2xl font-semibold tabular-nums">
                {r.avgValue ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                {r.minValue != null && r.maxValue != null
                  ? `min ${r.minValue} · max ${r.maxValue}`
                  : "no range"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Historical trend */}
      <Card>
        <CardHeader>
          <CardTitle>Historical trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart stationId={stationId} />
        </CardContent>
      </Card>
    </div>
  );
}

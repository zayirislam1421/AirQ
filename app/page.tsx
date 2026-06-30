import Link from "next/link";
import { AqiBadge } from "@/components/AqiBadge";
import { AqiGlobe } from "@/components/AqiGlobe";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { latestSnapshot, stationsWithAqi, cityRankings } from "@/lib/queries";
import { bandForAqi } from "@/lib/aqi-colors";
import { timeAgo } from "@/lib/utils";
import { REFRESH_CADENCE_LABEL, SOURCE_CADENCE_LABEL } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [snap, stations, worst, best] = await Promise.all([
    latestSnapshot(),
    stationsWithAqi(),
    cityRankings("worst", 5),
    cityRankings("best", 5),
  ]);

  const reporting = stations.filter((s) => s.aqi != null);
  const featured = [...reporting].sort((a, b) => (b.aqi ?? 0) - (a.aqi ?? 0))[0];
  const band = featured ? bandForAqi(featured.aqi) : null;
  const statesCovered = new Set(stations.map((s) => s.state)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h1 className="text-2xl font-bold">National Air Quality</h1>
        <div className="flex flex-col items-end text-sm">
          <span className="text-muted-foreground">
            Data last changed {timeAgo(snap?.fetchedAt)}
          </span>
          <span className="text-xs text-muted-foreground/70">
            CPCB source refreshes {SOURCE_CADENCE_LABEL} · checked {REFRESH_CADENCE_LABEL}
          </span>
        </div>
      </div>

      {!snap && (
        <div className="rounded-xl border py-10 text-center text-muted-foreground">
          No snapshots yet. Run <code className="font-mono">npm run ingest</code>.
        </div>
      )}

      {/* Hero: aurora + globe + featured AQI */}
      <AuroraBackground className="p-6">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Most polluted station now
            </p>
            {featured ? (
              <>
                <div
                  className="text-7xl font-bold leading-none tabular-nums"
                  style={{ color: band?.color }}
                >
                  {featured.aqi}
                </div>
                <div className="text-xl font-semibold">{band?.category}</div>
                <div className="text-sm text-muted-foreground">
                  {featured.name}, {featured.city}
                </div>
                {featured.dominantPollutant && (
                  <div className="text-sm">
                    Dominant pollutant: <strong>{featured.dominantPollutant}</strong>
                  </div>
                )}
                {band && (
                  <p className="max-w-md pt-1 text-xs text-muted-foreground">
                    {band.health}
                  </p>
                )}
                <Link
                  href="/map"
                  className="inline-block pt-2 text-sm text-primary underline-offset-4 hover:underline"
                >
                  Explore the live map →
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">No AQI computed yet.</p>
            )}
          </div>
          <div className="flex justify-center">
            <AqiGlobe />
          </div>
        </div>
      </AuroraBackground>

      {/* KPI + rankings bento */}
      <BentoGrid>
        <Kpi label="Stations reporting" value={`${reporting.length}/${stations.length}`} />
        <Kpi
          label="Worst city"
          value={worst[0]?.city ?? "—"}
          badge={worst[0] ? <AqiBadge aqi={worst[0].aqi} size="sm" /> : null}
        />
        <Kpi
          label="Cleanest city"
          value={best[0]?.city ?? "—"}
          badge={best[0] ? <AqiBadge aqi={best[0].aqi} size="sm" /> : null}
        />

        <BentoItem className="md:col-span-1 md:row-span-2">
          <RankList title="Most polluted" rows={worst} />
        </BentoItem>
        <BentoItem className="md:col-span-1 md:row-span-2">
          <RankList title="Cleanest" rows={best} />
        </BentoItem>
        <Kpi label="States covered" value={String(statesCovered)} />
        <Kpi label="Total stations" value={String(stations.length)} />
      </BentoGrid>
    </div>
  );
}

function Kpi({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <BentoItem className="flex flex-col justify-center">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 text-2xl font-semibold">{value}</span>
      {badge && <span className="mt-1">{badge}</span>}
    </BentoItem>
  );
}

function RankList({
  title,
  rows,
}: {
  title: string;
  rows: { city: string; state: string; aqi: number }[];
}) {
  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data.</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={`${r.city}-${r.state}`} className="flex items-center gap-3">
              <span className="w-4 text-sm text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sm">
                {r.city}
                <span className="text-muted-foreground"> · {r.state}</span>
              </span>
              <AqiBadge aqi={r.aqi} size="sm" />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

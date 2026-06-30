/**
 * Ingestion pipeline: fetch -> transform -> load.
 *
 * One run = one snapshot. Steps:
 *   1. Fetch all raw records from data.gov.in.
 *   2. Clean them (NA->null, parse dates, normalize pollutants).
 *   3. Dedup: if the content hash matches the last snapshot, skip the insert
 *      (the feed updates hourly; aggressive polling would otherwise duplicate).
 *   4. Upsert stations; insert readings; compute + store per-station AQI.
 *
 * Runnable as a Vercel Cron target (app/api/ingest) and as a local CLI
 * (`npm run ingest`, optional `--catchup` to bypass dedup while backfilling).
 */

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { snapshots, stations, readings, stationAqi } from "@/db/schema";
import { fetchAllRecords } from "./datagov";
import { cleanRecord, contentHash } from "./transform";
import { computeStationAqi, type PollutantReading } from "./aqi";
import type { CleanReading } from "./types";

export interface IngestResult {
  status: "ok" | "skipped" | "failed";
  snapshotId?: number;
  sourceCount: number;
  stationCount: number;
  reason?: string;
}

interface StationGroup {
  state: string;
  city: string;
  station: string;
  latitude: number | null;
  longitude: number | null;
  sourceLastUpdate: string | null;
  readings: CleanReading[];
}

function groupByStation(clean: CleanReading[]): StationGroup[] {
  const map = new Map<string, StationGroup>();
  for (const r of clean) {
    const key = `${r.station}|${r.city}|${r.state}`;
    let g = map.get(key);
    if (!g) {
      g = {
        state: r.state,
        city: r.city,
        station: r.station,
        latitude: r.latitude,
        longitude: r.longitude,
        sourceLastUpdate: r.sourceLastUpdate,
        readings: [],
      };
      map.set(key, g);
    }
    g.readings.push(r);
    // Prefer any non-null coordinate we encounter.
    if (g.latitude == null && r.latitude != null) g.latitude = r.latitude;
    if (g.longitude == null && r.longitude != null) g.longitude = r.longitude;
  }
  return [...map.values()];
}

/** Insert the station if new, returning its id (keyed by name+city+state). */
async function upsertStation(g: StationGroup): Promise<number> {
  const existing = await db
    .select({ id: stations.id })
    .from(stations)
    .where(
      sql`${stations.name} = ${g.station} AND ${stations.city} = ${g.city} AND ${stations.state} = ${g.state}`,
    )
    .limit(1);
  if (existing.length) return existing[0].id;

  const inserted = await db
    .insert(stations)
    .values({
      name: g.station,
      city: g.city,
      state: g.state,
      latitude: g.latitude,
      longitude: g.longitude,
    })
    .returning({ id: stations.id });
  return inserted[0].id;
}

export async function runIngest(
  opts: { force?: boolean } = {},
): Promise<IngestResult> {
  let raw;
  try {
    raw = await fetchAllRecords();
  } catch (err) {
    await db.insert(snapshots).values({
      fetchedAt: new Date().toISOString(),
      sourceCount: 0,
      status: "failed",
    });
    return { status: "failed", sourceCount: 0, stationCount: 0, reason: String(err) };
  }

  const clean = raw
    .map(cleanRecord)
    .filter((r): r is CleanReading => r !== null);
  const hash = contentHash(clean);

  // Dedup against the last successful snapshot unless forced (--catchup).
  if (!opts.force) {
    const last = await db
      .select({ hash: snapshots.contentHash })
      .from(snapshots)
      .where(eq(snapshots.status, "ok"))
      .orderBy(desc(snapshots.id))
      .limit(1);
    if (last.length && last[0].hash === hash) {
      return {
        status: "skipped",
        sourceCount: raw.length,
        stationCount: 0,
        reason: "identical to last snapshot",
      };
    }
  }

  const snap = await db
    .insert(snapshots)
    .values({
      fetchedAt: new Date().toISOString(),
      sourceCount: raw.length,
      status: "ok",
      contentHash: hash,
    })
    .returning({ id: snapshots.id });
  const snapshotId = snap[0].id;

  const groups = groupByStation(clean);
  for (const g of groups) {
    const stationId = await upsertStation(g);

    await db.insert(readings).values(
      g.readings.map((r) => ({
        snapshotId,
        stationId,
        pollutantId: r.pollutant,
        minValue: r.min,
        maxValue: r.max,
        avgValue: r.avg,
        sourceLastUpdate: r.sourceLastUpdate,
      })),
    );

    const pr: PollutantReading[] = g.readings.map((r) => ({
      pollutant: r.pollutant,
      avg: r.avg,
    }));
    const result = computeStationAqi(pr);
    await db.insert(stationAqi).values({
      snapshotId,
      stationId,
      aqi: result.aqi,
      category: result.category,
      dominantPollutant: result.dominantPollutant,
    });
  }

  return {
    status: "ok",
    snapshotId,
    sourceCount: raw.length,
    stationCount: groups.length,
  };
}

// CLI entrypoint: `npm run ingest [-- --catchup]`
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const force = process.argv.includes("--catchup");
  runIngest({ force })
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.status === "failed" ? 1 : 0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

/**
 * Read queries shared by RSC pages and route handlers.
 * All reads go through here so the DB access pattern lives in one place.
 */

import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { snapshots, stations, stationAqi, readings } from "@/db/schema";
import type { Pollutant } from "./aqi";
import type { AqiCategory } from "./aqi-colors";
import type { StationAqiDTO, TimelineDTO } from "./types";
import { haversineKm } from "./geo";

/** The id + timestamp of the most recent successful snapshot, or null. */
export async function latestSnapshot(): Promise<{ id: number; fetchedAt: string } | null> {
  const rows = await db
    .select({ id: snapshots.id, fetchedAt: snapshots.fetchedAt })
    .from(snapshots)
    .where(eq(snapshots.status, "ok"))
    .orderBy(desc(snapshots.id))
    .limit(1);
  return rows[0] ?? null;
}

/** All available successful snapshot timestamps (ascending) — feeds the scrubber. */
export async function snapshotTimeline(): Promise<{ id: number; fetchedAt: string }[]> {
  return db
    .select({ id: snapshots.id, fetchedAt: snapshots.fetchedAt })
    .from(snapshots)
    .where(eq(snapshots.status, "ok"))
    .orderBy(asc(snapshots.id));
}

export interface StationFilter {
  state?: string;
  city?: string;
  category?: AqiCategory;
  snapshotId?: number;
}

/** Latest (or given-snapshot) AQI per station, joined with station metadata. */
export async function stationsWithAqi(filter: StationFilter = {}): Promise<StationAqiDTO[]> {
  const snapId = filter.snapshotId ?? (await latestSnapshot())?.id;
  if (snapId == null) return [];

  const conds = [eq(stationAqi.snapshotId, snapId)];
  if (filter.state) conds.push(eq(stations.state, filter.state));
  if (filter.city) conds.push(eq(stations.city, filter.city));
  if (filter.category) conds.push(eq(stationAqi.category, filter.category));

  const rows = await db
    .select({
      stationId: stations.id,
      name: stations.name,
      city: stations.city,
      state: stations.state,
      latitude: stations.latitude,
      longitude: stations.longitude,
      aqi: stationAqi.aqi,
      category: stationAqi.category,
      dominantPollutant: stationAqi.dominantPollutant,
    })
    .from(stationAqi)
    .innerJoin(stations, eq(stationAqi.stationId, stations.id))
    .where(and(...conds));

  return rows.map((r) => ({
    ...r,
    category: r.category as AqiCategory | null,
    dominantPollutant: r.dominantPollutant as Pollutant | null,
  }));
}

/** One station's metadata + its latest readings + AQI. */
export async function stationDetail(stationId: number) {
  const snapId = (await latestSnapshot())?.id;
  if (snapId == null) return null;

  const meta = await db
    .select()
    .from(stations)
    .where(eq(stations.id, stationId))
    .limit(1);
  if (!meta.length) return null;

  const aqiRow = await db
    .select()
    .from(stationAqi)
    .where(and(eq(stationAqi.stationId, stationId), eq(stationAqi.snapshotId, snapId)))
    .limit(1);

  const rds = await db
    .select()
    .from(readings)
    .where(and(eq(readings.stationId, stationId), eq(readings.snapshotId, snapId)));

  return { station: meta[0], aqi: aqiRow[0] ?? null, readings: rds };
}

/** Historical series of a pollutant's avg for one station (for trend charts). */
export async function stationTrend(
  stationId: number,
  pollutant: Pollutant,
  fromIso?: string,
  toIso?: string,
): Promise<{ t: string; value: number | null }[]> {
  const conds = [
    eq(readings.stationId, stationId),
    eq(readings.pollutantId, pollutant),
    eq(snapshots.status, "ok"),
  ];
  if (fromIso) conds.push(gte(snapshots.fetchedAt, fromIso));
  if (toIso) conds.push(lte(snapshots.fetchedAt, toIso));

  return db
    .select({ t: snapshots.fetchedAt, value: readings.avgValue })
    .from(readings)
    .innerJoin(snapshots, eq(readings.snapshotId, snapshots.id))
    .where(and(...conds))
    .orderBy(asc(snapshots.fetchedAt));
}

export interface CityRank {
  city: string;
  state: string;
  aqi: number;
  stationCount: number;
}

/** City rollups ranked by worst (max) station AQI. */
export async function cityRankings(
  order: "worst" | "best",
  limit = 10,
): Promise<CityRank[]> {
  const snapId = (await latestSnapshot())?.id;
  if (snapId == null) return [];

  const agg = order === "worst" ? sql<number>`max(${stationAqi.aqi})` : sql<number>`min(${stationAqi.aqi})`;
  const rows = await db
    .select({
      city: stations.city,
      state: stations.state,
      aqi: agg,
      stationCount: sql<number>`count(*)`,
    })
    .from(stationAqi)
    .innerJoin(stations, eq(stationAqi.stationId, stations.id))
    .where(and(eq(stationAqi.snapshotId, snapId), sql`${stationAqi.aqi} is not null`))
    .groupBy(stations.city, stations.state)
    .orderBy(order === "worst" ? desc(agg) : asc(agg))
    .limit(limit);

  return rows.map((r) => ({ ...r, aqi: Number(r.aqi), stationCount: Number(r.stationCount) }));
}

/** Columnar timeline payload for the scrubber: load once, animate client-side. */
export async function timeline(fromIso?: string, toIso?: string): Promise<TimelineDTO> {
  const snapConds = [eq(snapshots.status, "ok")];
  if (fromIso) snapConds.push(gte(snapshots.fetchedAt, fromIso));
  if (toIso) snapConds.push(lte(snapshots.fetchedAt, toIso));

  const snaps = await db
    .select({ id: snapshots.id, fetchedAt: snapshots.fetchedAt })
    .from(snapshots)
    .where(and(...snapConds))
    .orderBy(asc(snapshots.id));

  if (!snaps.length) {
    return { timestamps: [], stationIds: [], names: [], lats: [], lons: [], aqi: [] };
  }

  const sts = await db
    .select({
      id: stations.id,
      name: stations.name,
      latitude: stations.latitude,
      longitude: stations.longitude,
    })
    .from(stations)
    .orderBy(asc(stations.id));

  const stationIndex = new Map<number, number>();
  sts.forEach((s, i) => stationIndex.set(s.id, i));

  const snapIds = snaps.map((s) => s.id);
  const aqiRows = await db
    .select({
      snapshotId: stationAqi.snapshotId,
      stationId: stationAqi.stationId,
      aqi: stationAqi.aqi,
    })
    .from(stationAqi)
    .where(inArray(stationAqi.snapshotId, snapIds));

  const snapIndex = new Map<number, number>();
  snaps.forEach((s, i) => snapIndex.set(s.id, i));

  // aqi[frame][stationIndex]
  const grid: (number | null)[][] = snaps.map(() => sts.map(() => null));
  for (const r of aqiRows) {
    const fi = snapIndex.get(r.snapshotId);
    const si = stationIndex.get(r.stationId);
    if (fi != null && si != null) grid[fi][si] = r.aqi;
  }

  return {
    timestamps: snaps.map((s) => s.fetchedAt),
    stationIds: sts.map((s) => s.id),
    names: sts.map((s) => s.name),
    lats: sts.map((s) => s.latitude ?? 0),
    lons: sts.map((s) => s.longitude ?? 0),
    aqi: grid,
  };
}

export interface CityAqi {
  city: string;
  state: string;
  worstAqi: number | null; // max station AQI in the city
  avgAqi: number | null; // mean of reporting stations
  stationCount: number;
  reportingCount: number;
  latitude: number | null; // representative coords (mean of stations)
  longitude: number | null;
}

/** City-level rollups for the latest snapshot, optionally filtered by query string. */
export async function cityAggregates(q?: string): Promise<CityAqi[]> {
  const stationsData = await stationsWithAqi();
  const map = new Map<string, CityAqi & { _aqis: number[]; _lat: number[]; _lon: number[] }>();

  for (const s of stationsData) {
    const key = `${s.city}|${s.state}`;
    let c = map.get(key);
    if (!c) {
      c = {
        city: s.city,
        state: s.state,
        worstAqi: null,
        avgAqi: null,
        stationCount: 0,
        reportingCount: 0,
        latitude: null,
        longitude: null,
        _aqis: [],
        _lat: [],
        _lon: [],
      };
      map.set(key, c);
    }
    c.stationCount++;
    if (s.latitude != null) c._lat.push(s.latitude);
    if (s.longitude != null) c._lon.push(s.longitude);
    if (s.aqi != null) {
      c.reportingCount++;
      c._aqis.push(s.aqi);
    }
  }

  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

  let cities: CityAqi[] = [...map.values()].map((c) => ({
    city: c.city,
    state: c.state,
    worstAqi: c._aqis.length ? Math.max(...c._aqis) : null,
    avgAqi: c._aqis.length ? Math.round(mean(c._aqis)!) : null,
    stationCount: c.stationCount,
    reportingCount: c.reportingCount,
    latitude: mean(c._lat),
    longitude: mean(c._lon),
  }));

  if (q) {
    const term = q.trim().toLowerCase();
    cities = cities.filter(
      (c) =>
        c.city.toLowerCase().includes(term) ||
        c.state.toLowerCase().includes(term),
    );
  }
  // Worst-first by default.
  cities.sort((a, b) => (b.worstAqi ?? -1) - (a.worstAqi ?? -1));
  return cities;
}

export interface NearbyStation extends StationAqiDTO {
  distanceKm: number;
}

/** Stations nearest to a coordinate, sorted by distance. */
export async function nearestStations(
  lat: number,
  lon: number,
  limit = 10,
): Promise<NearbyStation[]> {
  const all = await stationsWithAqi();
  return all
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      ...s,
      distanceKm: haversineKm(lat, lon, s.latitude!, s.longitude!),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

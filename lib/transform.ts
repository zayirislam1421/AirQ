/**
 * Pure transform helpers: turn raw data.gov.in strings into clean typed values.
 * No IO — unit-tested directly in transform.test.ts.
 */

import type { Pollutant } from "./aqi";
import type { CleanReading, RawAqiRecord } from "./types";

const KNOWN_POLLUTANTS: ReadonlySet<string> = new Set([
  "PM2.5",
  "PM10",
  "NO2",
  "SO2",
  "CO",
  "OZONE",
  "NH3",
]);

/** "NA"/""/garbage -> null; otherwise a finite number. */
export function cleanNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === "" || t.toUpperCase() === "NA") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse the feed's "DD-MM-YYYY HH:MM:SS" (assumed IST) into an ISO UTC string.
 * Returns null on malformed input.
 */
export function parseLastUpdate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  // Source timestamps are IST (UTC+5:30); convert to a UTC instant.
  const istMs = Date.UTC(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    Number(ss),
  );
  const utcMs = istMs - 5.5 * 60 * 60 * 1000;
  const d = new Date(utcMs);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Normalize a raw pollutant_id to our enum, or null if unrecognized. */
export function normalizePollutant(raw: string): Pollutant | null {
  const t = raw.trim().toUpperCase();
  // Feed uses "PM2.5"/"PM10"/"OZONE" already; map a couple of variants too.
  const alias: Record<string, Pollutant> = {
    "PM2.5": "PM2.5",
    PM25: "PM2.5",
    PM10: "PM10",
    NO2: "NO2",
    SO2: "SO2",
    CO: "CO",
    OZONE: "OZONE",
    O3: "OZONE",
    NH3: "NH3",
  };
  const hit = alias[t];
  return hit && KNOWN_POLLUTANTS.has(hit) ? hit : null;
}

/** Clean a single raw record; null if the pollutant is unknown. */
export function cleanRecord(r: RawAqiRecord): CleanReading | null {
  const pollutant = normalizePollutant(r.pollutant_id);
  if (!pollutant) return null;
  return {
    state: r.state?.trim() ?? "",
    city: r.city?.trim() ?? "",
    station: r.station?.trim() ?? "",
    latitude: cleanNumber(r.latitude),
    longitude: cleanNumber(r.longitude),
    sourceLastUpdate: parseLastUpdate(r.last_update),
    pollutant,
    min: cleanNumber(r.min_value),
    max: cleanNumber(r.max_value),
    avg: cleanNumber(r.avg_value),
  };
}

/** Stable content hash of cleaned readings, for snapshot dedup. */
export function contentHash(readings: CleanReading[]): string {
  // Sort to make the hash order-independent, then FNV-1a over the key fields.
  const parts = readings
    .map((r) => `${r.state}|${r.city}|${r.station}|${r.pollutant}|${r.avg}`)
    .sort();
  let h = 0x811c9dc5;
  const s = parts.join("\n");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/**
 * CPCB India National Air Quality Index engine.
 *
 * The data.gov.in feed gives raw pollutant concentrations, NOT an AQI. We
 * compute it here, following the CPCB method:
 *   1. Map each pollutant's concentration to a 0–500 "sub-index" via the
 *      official breakpoint tables and linear interpolation.
 *   2. The station AQI is the MAX sub-index across pollutants.
 *   3. The pollutant at that max is the "dominant pollutant".
 *
 * CPCB validity rule: an AQI is reported only when at least `MIN_POLLUTANTS`
 * sub-indices are available AND at least one of them is PM2.5 or PM10.
 *
 * Reference: CPCB "National Air Quality Index" report (2014), breakpoint tables.
 * Pure functions only — no framework/IO deps — so this is trivially unit-tested.
 */

export type Pollutant =
  | "PM2.5"
  | "PM10"
  | "NO2"
  | "SO2"
  | "CO"
  | "OZONE"
  | "NH3";

import type { AqiCategory } from "./aqi-colors";
import { bandForAqi } from "./aqi-colors";

/** A single [concentration-low, concentration-high, index-low, index-high] band. */
type BreakpointRow = readonly [cLo: number, cHi: number, iLo: number, iHi: number];

/**
 * Official CPCB breakpoint tables, in the pollutant's reporting unit.
 *
 * Averaging periods per CPCB: PM2.5/PM10/NO2/SO2/NH3 are 24-hour averages;
 * OZONE and CO are 8-hour averages. We apply them to the feed's `avg_value`.
 *
 * UNIT CAVEAT (CO): CPCB CO breakpoints are in mg/m³. The data.gov.in feed's
 * CO values do not appear to be mg/m³ (observed values ~50), so the CO
 * sub-index is suspect until the feed's unit is confirmed. Tracked as a known
 * issue; CO is intentionally easy to disable via `BREAKPOINTS` if needed.
 */
export const BREAKPOINTS: Record<Pollutant, readonly BreakpointRow[]> = {
  "PM2.5": [
    [0, 30, 0, 50],
    [31, 60, 51, 100],
    [61, 90, 101, 200],
    [91, 120, 201, 300],
    [121, 250, 301, 400],
    [251, 500, 401, 500],
  ],
  PM10: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 250, 101, 200],
    [251, 350, 201, 300],
    [351, 430, 301, 400],
    [431, 600, 401, 500],
  ],
  NO2: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 180, 101, 200],
    [181, 280, 201, 300],
    [281, 400, 301, 400],
    [401, 500, 401, 500],
  ],
  OZONE: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 168, 101, 200],
    [169, 208, 201, 300],
    [209, 748, 301, 400],
    [749, 1000, 401, 500],
  ],
  CO: [
    // mg/m³ per CPCB — see UNIT CAVEAT above.
    [0, 1.0, 0, 50],
    [1.1, 2.0, 51, 100],
    [2.1, 10, 101, 200],
    [10.1, 17, 201, 300],
    [17.1, 34, 301, 400],
    [34.1, 50, 401, 500],
  ],
  SO2: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 380, 101, 200],
    [381, 800, 201, 300],
    [801, 1600, 301, 400],
    [1601, 2000, 401, 500],
  ],
  NH3: [
    [0, 200, 0, 50],
    [201, 400, 51, 100],
    [401, 800, 101, 200],
    [801, 1200, 201, 300],
    [1201, 1800, 301, 400],
    [1801, 2400, 401, 500],
  ],
};

/** Minimum number of pollutant sub-indices required to report an AQI (CPCB). */
export const MIN_POLLUTANTS = 3;

/** At least one of these must be present for a valid AQI (CPCB). */
const REQUIRED_ANY: readonly Pollutant[] = ["PM2.5", "PM10"];

/**
 * Pollutants whose sub-index is allowed to drive the station AQI (the max).
 *
 * CO is intentionally EXCLUDED: the data.gov.in feed's CO values (observed
 * range ~2–111, median ~29) are not in CPCB's mg/m³ unit — feeding them through
 * the mg/m³ breakpoints falsely pins ~15% of stations at AQI 500. Until the
 * feed's CO unit is confirmed, CO is still computed and surfaced in
 * `subIndices` (for display) but cannot be the dominant pollutant or inflate
 * the AQI. PM2.5/PM10 are the real drivers and the CPCB index is valid without CO.
 */
const AQI_POLLUTANTS: ReadonlySet<Pollutant> = new Set([
  "PM2.5",
  "PM10",
  "NO2",
  "SO2",
  "OZONE",
  "NH3",
]);

/**
 * Compute the sub-index for one pollutant concentration via linear
 * interpolation within its breakpoint band. Returns null when the value is
 * missing/invalid or no band matches (negative).
 */
export function subIndex(
  pollutant: Pollutant,
  concentration: number | null | undefined,
): number | null {
  if (concentration == null || Number.isNaN(concentration) || concentration < 0) {
    return null;
  }
  const table = BREAKPOINTS[pollutant];
  if (!table) return null;

  // Clamp above the highest band to its ceiling index (CPCB caps at 500).
  const top = table[table.length - 1];
  if (concentration > top[1]) return top[3];

  for (const [cLo, cHi, iLo, iHi] of table) {
    if (concentration >= cLo && concentration <= cHi) {
      const idx = ((iHi - iLo) / (cHi - cLo)) * (concentration - cLo) + iLo;
      return Math.round(idx);
    }
  }
  return null;
}

export interface PollutantReading {
  pollutant: Pollutant;
  /** the feed's avg_value, already cleaned to number | null */
  avg: number | null;
}

export interface AqiResult {
  aqi: number | null;
  category: AqiCategory | null;
  dominantPollutant: Pollutant | null;
  /** per-pollutant sub-indices that were computable (for tooltips/debugging) */
  subIndices: Partial<Record<Pollutant, number>>;
}

/**
 * Compute a station's AQI from its pollutant readings.
 *
 * AQI = max sub-index; dominant pollutant = the one achieving that max.
 * Returns nulls (but still the computed `subIndices`) when the CPCB validity
 * rule isn't met, so callers can show "insufficient data" honestly.
 */
export function computeStationAqi(readings: PollutantReading[]): AqiResult {
  const subIndices: Partial<Record<Pollutant, number>> = {};

  for (const { pollutant, avg } of readings) {
    const si = subIndex(pollutant, avg);
    if (si != null) subIndices[pollutant] = si;
  }

  // Only AQI-eligible pollutants (excludes CO — see AQI_POLLUTANTS) count
  // toward the validity rule and the max. CO stays in `subIndices` for display.
  const eligible = (Object.keys(subIndices) as Pollutant[]).filter((p) =>
    AQI_POLLUTANTS.has(p),
  );
  const meetsCount = eligible.length >= MIN_POLLUTANTS;
  const meetsRequired = REQUIRED_ANY.some((p) => p in subIndices);

  if (!meetsCount || !meetsRequired) {
    return { aqi: null, category: null, dominantPollutant: null, subIndices };
  }

  let dominantPollutant: Pollutant = eligible[0];
  let aqi = subIndices[dominantPollutant]!;
  for (const p of eligible) {
    if (subIndices[p]! > aqi) {
      aqi = subIndices[p]!;
      dominantPollutant = p;
    }
  }

  return {
    aqi,
    category: bandForAqi(aqi)?.category ?? null,
    dominantPollutant,
    subIndices,
  };
}

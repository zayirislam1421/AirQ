/**
 * Shared types across server (route handlers, ingestion) and client.
 * Keep API response shapes here so the frontend stays in sync with the backend.
 */

import type { Pollutant } from "./aqi";
import type { AqiCategory } from "./aqi-colors";

/** A raw record as returned by the data.gov.in feed (all strings, "NA" for missing). */
export interface RawAqiRecord {
  country: string;
  state: string;
  city: string;
  station: string;
  last_update: string; // "DD-MM-YYYY HH:MM:SS"
  latitude: string;
  longitude: string;
  pollutant_id: string;
  min_value: string;
  max_value: string;
  avg_value: string;
}

/** Cleaned, typed reading after the transform step. */
export interface CleanReading {
  state: string;
  city: string;
  station: string;
  latitude: number | null;
  longitude: number | null;
  sourceLastUpdate: string | null; // ISO
  pollutant: Pollutant;
  min: number | null;
  max: number | null;
  avg: number | null;
}

/** Latest AQI for one station (dashboard, map, search). */
export interface StationAqiDTO {
  stationId: number;
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  aqi: number | null;
  category: AqiCategory | null;
  dominantPollutant: Pollutant | null;
}

/** Columnar payload for the timeline scrubber — loaded once, animated client-side. */
export interface TimelineDTO {
  /** ISO timestamps, ascending; index = frame number */
  timestamps: string[];
  /** parallel arrays describing each station once */
  stationIds: number[];
  names: string[];
  lats: number[];
  lons: number[];
  /** aqi[frame][stationIndex]; null = no data that frame */
  aqi: (number | null)[][];
}

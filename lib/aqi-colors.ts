/**
 * Single source of truth for the CPCB India AQI category system.
 *
 * Every surface in the app (badges, map markers, charts, dials) maps an AQI
 * number to a category through THIS file — never hardcode colors elsewhere.
 *
 * Two palettes are provided: the standard CPCB green→maroon ramp, and an
 * "accessible" palette tuned for color-vision deficiency. Because we always
 * render number + label + color together, color is never the sole signal.
 */

export type AqiCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export interface AqiBand {
  category: AqiCategory;
  /** inclusive lower bound of the AQI index range */
  min: number;
  /** inclusive upper bound of the AQI index range */
  max: number;
  /** standard CPCB color */
  color: string;
  /** higher-contrast / CVD-friendly alternative */
  accessibleColor: string;
  /** one-line health implication shown in the UI */
  health: string;
}

/** Ordered low→high. The last band's `max` is the clamp ceiling (500). */
export const AQI_BANDS: readonly AqiBand[] = [
  {
    category: "Good",
    min: 0,
    max: 50,
    color: "#009865",
    accessibleColor: "#1a9850",
    health: "Minimal impact. Air quality is considered satisfactory.",
  },
  {
    category: "Satisfactory",
    min: 51,
    max: 100,
    color: "#a3c853",
    accessibleColor: "#91cf60",
    health: "Minor breathing discomfort to sensitive people.",
  },
  {
    category: "Moderate",
    min: 101,
    max: 200,
    color: "#fff833",
    accessibleColor: "#fee08b",
    health:
      "Breathing discomfort to people with lung, heart disease, children and older adults.",
  },
  {
    category: "Poor",
    min: 201,
    max: 300,
    color: "#f29305",
    accessibleColor: "#fc8d59",
    health: "Breathing discomfort to most people on prolonged exposure.",
  },
  {
    category: "Very Poor",
    min: 301,
    max: 400,
    color: "#e93f33",
    accessibleColor: "#d73027",
    health: "Respiratory illness on prolonged exposure.",
  },
  {
    category: "Severe",
    min: 401,
    max: 500,
    color: "#af2d24",
    accessibleColor: "#a50026",
    health:
      "Affects healthy people and seriously impacts those with existing disease.",
  },
] as const;

const NA_COLOR = "#9ca3af"; // gray-400, for unknown / no-data

/** Resolve the band for a given AQI value. Returns null for null/NaN/negative. */
export function bandForAqi(aqi: number | null | undefined): AqiBand | null {
  if (aqi == null || Number.isNaN(aqi) || aqi < 0) return null;
  // Clamp above the top band into Severe rather than returning null.
  const clamped = Math.min(aqi, AQI_BANDS[AQI_BANDS.length - 1].max);
  return (
    AQI_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ??
    AQI_BANDS[AQI_BANDS.length - 1]
  );
}

export function categoryForAqi(aqi: number | null | undefined): AqiCategory | null {
  return bandForAqi(aqi)?.category ?? null;
}

export function colorForAqi(
  aqi: number | null | undefined,
  accessible = false,
): string {
  const band = bandForAqi(aqi);
  if (!band) return NA_COLOR;
  return accessible ? band.accessibleColor : band.color;
}

export function colorForCategory(
  category: AqiCategory | null,
  accessible = false,
): string {
  if (!category) return NA_COLOR;
  const band = AQI_BANDS.find((b) => b.category === category)!;
  return accessible ? band.accessibleColor : band.color;
}

/**
 * App-wide constants. Keep the ingestion cadence here so the cron schedule,
 * the dashboard freshness label, and docs reference one source of truth.
 *
 * Why 15 minutes? Measured feed behavior (2026-07): the CPCB data.gov.in feed
 * publishes ONE hourly batch (every record stamped on the hour) and lags
 * real-time by up to ~90 min. Polling faster than hourly only lowers detection
 * lag of each batch — 15 min bounds that to ≤15 min, which is imperceptible for
 * hourly data, while avoiding the ~690 deduped no-op polls/day that a 2-min
 * cadence would burn. Identical polls are de-duped in lib/ingest.ts regardless.
 *
 * NOTE: keep this in sync with the schedule in vercel.json.
 */

/** Human-readable cadence shown in the UI. */
export const REFRESH_CADENCE_LABEL = "every 15 min";

/** How often the source itself changes (for honest UI copy). */
export const SOURCE_CADENCE_LABEL = "hourly";

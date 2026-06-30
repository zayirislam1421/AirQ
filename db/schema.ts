/**
 * Drizzle schema for the AQI snapshot store (Turso/libSQL = SQLite).
 *
 * Design: append-only snapshots. Each ingestion run inserts one `snapshots`
 * row plus its `readings` and computed `stationAqi`. We never overwrite, so the
 * accumulated history powers the timeline scrubber.
 */

import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

/** One ingestion run. */
export const snapshots = sqliteTable("snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fetchedAt: text("fetched_at").notNull(), // ISO UTC, when WE polled
  sourceCount: integer("source_count"),
  status: text("status").notNull(), // ok | partial | failed
  contentHash: text("content_hash"), // dedup identical consecutive polls
});

/** De-duplicated station registry. */
export const stations = sqliteTable(
  "stations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
  },
  (t) => ({
    uniqStation: unique("uniq_station").on(t.name, t.city, t.state),
  }),
);

/** One row per (snapshot × station × pollutant). */
export const readings = sqliteTable(
  "readings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => snapshots.id),
    stationId: integer("station_id")
      .notNull()
      .references(() => stations.id),
    pollutantId: text("pollutant_id").notNull(),
    minValue: real("min_value"),
    maxValue: real("max_value"),
    avgValue: real("avg_value"),
    sourceLastUpdate: text("source_last_update"),
  },
  (t) => ({
    bySnap: index("idx_readings_snap").on(t.snapshotId, t.stationId),
  }),
);

/** Computed CPCB AQI per (snapshot × station). */
export const stationAqi = sqliteTable(
  "station_aqi",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => snapshots.id),
    stationId: integer("station_id")
      .notNull()
      .references(() => stations.id),
    aqi: integer("aqi"), // null = insufficient data
    category: text("category"),
    dominantPollutant: text("dominant_pollutant"),
  },
  (t) => ({
    // Covering-ish indexes for the two hot query shapes.
    byTime: index("idx_aqi_time").on(t.snapshotId, t.stationId, t.aqi),
    byStation: index("idx_aqi_station").on(t.stationId, t.snapshotId, t.aqi),
  }),
);

export type SnapshotRow = typeof snapshots.$inferSelect;
export type StationRow = typeof stations.$inferSelect;
export type ReadingRow = typeof readings.$inferSelect;
export type StationAqiRow = typeof stationAqi.$inferSelect;

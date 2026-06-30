import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { stations } from "@/db/schema";
import { asc } from "drizzle-orm";
import { snapshotTimeline } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Filter options + available snapshot timestamps (for dropdowns + scrubber). */
export async function GET() {
  const sts = await db
    .select({ city: stations.city, state: stations.state })
    .from(stations)
    .orderBy(asc(stations.state), asc(stations.city));

  const states = [...new Set(sts.map((s) => s.state))].sort();
  const citiesByState: Record<string, string[]> = {};
  for (const s of sts) {
    (citiesByState[s.state] ??= []).push(s.city);
  }
  for (const k of Object.keys(citiesByState)) {
    citiesByState[k] = [...new Set(citiesByState[k])].sort();
  }

  const snaps = await snapshotTimeline();

  return NextResponse.json({
    states,
    citiesByState,
    pollutants: ["PM2.5", "PM10", "NO2", "SO2", "CO", "OZONE", "NH3"],
    snapshots: snaps.map((s) => ({ id: s.id, t: s.fetchedAt })),
  });
}

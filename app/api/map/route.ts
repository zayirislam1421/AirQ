import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stationsWithAqi } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  snapshot: z.coerce.number().int().optional(), // omit = latest
});

/** Lightweight marker payload for the map. */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const rows = await stationsWithAqi({ snapshotId: parsed.data.snapshot });
  const markers = rows
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: r.stationId,
      name: r.name,
      lat: r.latitude,
      lon: r.longitude,
      aqi: r.aqi,
      category: r.category,
    }));
  return NextResponse.json({ count: markers.length, markers });
}

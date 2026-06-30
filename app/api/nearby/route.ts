import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nearestStations } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/** Stations nearest to ?lat=&lon=, sorted by distance. */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "provide numeric ?lat=&lon=" },
      { status: 400 },
    );
  }
  const { lat, lon, limit } = parsed.data;
  const stations = await nearestStations(lat, lon, limit);
  return NextResponse.json({ count: stations.length, stations });
}

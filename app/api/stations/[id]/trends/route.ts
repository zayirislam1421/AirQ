import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stationTrend } from "@/lib/queries";
import { lttb } from "@/lib/downsample";
import type { Pollutant } from "@/lib/aqi";

export const dynamic = "force-dynamic";

const POLLUTANTS = [
  "PM2.5",
  "PM10",
  "NO2",
  "SO2",
  "CO",
  "OZONE",
  "NH3",
] as const;

const querySchema = z.object({
  pollutant: z.enum(POLLUTANTS).default("PM2.5"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  points: z.coerce.number().int().min(50).max(2000).default(800),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stationId = Number(id);
  if (!Number.isInteger(stationId)) {
    return NextResponse.json({ error: "invalid station id" }, { status: 400 });
  }
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { pollutant, from, to, points } = parsed.data;
  const series = await stationTrend(stationId, pollutant as Pollutant, from, to);
  const downsampled = lttb(series, points);
  return NextResponse.json({ pollutant, points: downsampled });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stationsWithAqi } from "@/lib/queries";
import type { AqiCategory } from "@/lib/aqi-colors";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Good",
  "Satisfactory",
  "Moderate",
  "Poor",
  "Very Poor",
  "Severe",
] as const;

const querySchema = z.object({
  state: z.string().optional(),
  city: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await stationsWithAqi({
    state: parsed.data.state,
    city: parsed.data.city,
    category: parsed.data.category as AqiCategory | undefined,
  });
  return NextResponse.json({ count: data.length, stations: data });
}

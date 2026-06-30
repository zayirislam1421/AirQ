import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cityAggregates } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({ q: z.string().optional() });

/** City-level AQI rollups, optionally filtered by ?q=. */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const cities = await cityAggregates(parsed.data.q);
  return NextResponse.json({ count: cities.length, cities });
}

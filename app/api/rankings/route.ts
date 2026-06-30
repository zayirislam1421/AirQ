import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cityRankings } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  order: z.enum(["worst", "best"]).default("worst"),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { order, limit } = parsed.data;
  const data = await cityRankings(order, limit);
  return NextResponse.json({ order, cities: data });
}

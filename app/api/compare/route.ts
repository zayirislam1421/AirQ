import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stationDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  ids: z
    .string()
    .transform((s) => s.split(",").map(Number))
    .pipe(z.array(z.number().int()).min(2).max(2)),
});

/** Side-by-side detail for exactly two stations. */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "provide ?ids=<a>,<b> with two station ids" },
      { status: 400 },
    );
  }
  const [a, b] = parsed.data.ids;
  const [left, right] = await Promise.all([stationDetail(a), stationDetail(b)]);
  return NextResponse.json({ left, right });
}

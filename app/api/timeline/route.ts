import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timeline } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

/** Columnar timeline payload for the scrubber — loaded once, animated client-side. */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await timeline(parsed.data.from, parsed.data.to);
  return NextResponse.json(data);
}

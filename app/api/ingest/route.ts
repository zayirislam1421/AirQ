import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

// Ingestion can take a while (paged fetch + many inserts); allow up to 60s.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron-triggered ingestion. Vercel Cron calls this on a schedule. Guarded by
 * CRON_SECRET so it can't be triggered by the public. `?force=1` bypasses the
 * dedup (used for local --catchup-style backfill).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const force = req.nextUrl.searchParams.get("force") === "1";
  const result = await runIngest({ force });
  const code = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status: code });
}

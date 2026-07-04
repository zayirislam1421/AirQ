import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

/**
 * Manual real-time refresh endpoint.
 * 
 * Call this whenever you want fresh data (bypasses deduplication).
 * Can be triggered from the UI button or manually via curl:
 *   curl http://localhost:3000/api/ingest/realtime
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    // Always fetch fresh data, bypassing dedup
    const result = await runIngest({ force: true });
    const code = result.status === "failed" ? 500 : 200;
    return NextResponse.json(result, { status: code });
  } catch (error) {
    console.error("Realtime ingest failed:", error);
    return NextResponse.json(
      { error: "Ingestion failed", status: "failed" },
      { status: 500 }
    );
  }
}

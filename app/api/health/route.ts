import { NextResponse } from "next/server";
import { latestSnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await latestSnapshot();
  return NextResponse.json({
    status: "ok",
    lastSnapshot: snap?.fetchedAt ?? null,
    hasData: snap != null,
  });
}

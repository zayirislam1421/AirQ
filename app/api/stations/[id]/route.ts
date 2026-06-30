import { NextRequest, NextResponse } from "next/server";
import { stationDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stationId = Number(id);
  if (!Number.isInteger(stationId)) {
    return NextResponse.json({ error: "invalid station id" }, { status: 400 });
  }
  const detail = await stationDetail(stationId);
  if (!detail) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

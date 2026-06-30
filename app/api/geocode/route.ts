import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
// Cache geocode results for an hour; place coordinates don't change.
export const revalidate = 3600;

const querySchema = z.object({ q: z.string().min(1).max(120) });

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

/**
 * Server-side proxy to OpenStreetMap Nominatim (free, keyless). Proxying lets us
 * set the required User-Agent, bias results to India, and avoid browser CORS.
 */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "provide ?q=" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", parsed.data.q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "in"); // bias to India
  url.searchParams.set("limit", "5");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AirQ-India/1.0 (air-quality demo app)",
        "Accept-Language": "en",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const data = (await res.json()) as NominatimResult[];
    const results = data.map((r) => ({
      label: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      type: r.type,
    }));
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: "geocoding failed", detail: String(err) },
      { status: 502 },
    );
  }
}

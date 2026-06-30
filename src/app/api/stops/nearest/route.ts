import { NextRequest, NextResponse } from "next/server";
import { loadGtfsDataAsync } from "@/lib/gtfs/parser";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "lat and lon query parameters are required" },
      { status: 400 }
    );
  }

  try {
    const gtfs = await loadGtfsDataAsync();
    const stops = Array.from(gtfs.stops.values());

    let nearest = stops[0];
    let minDist = Infinity;

    for (const stop of stops) {
      const dist = haversineDistance(lat, lon, stop.stop_lat, stop.stop_lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    }

    return NextResponse.json({
      ...nearest,
      distance_meters: Math.round(minDist),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

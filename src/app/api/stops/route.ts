import { NextRequest, NextResponse } from "next/server";
import { loadGtfsData } from "@/lib/gtfs/parser";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.toLowerCase() ?? "";

  try {
    const gtfs = loadGtfsData();
    let stops = Array.from(gtfs.stops.values());

    if (query) {
      stops = stops.filter((s) => s.stop_name.toLowerCase().includes(query));
    }

    stops = stops.slice(0, 50);

    return NextResponse.json(stops);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { loadGtfsData } from "@/lib/gtfs/parser";
import { findFastestRoute } from "@/lib/routing/dijkstra";
import { timeToSeconds } from "@/lib/routing/time";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const departureTime = searchParams.get("time");

  if (!origin || !destination) {
    return NextResponse.json(
      { error: "origin and destination stop_id are required" },
      { status: 400 }
    );
  }

  try {
    const gtfs = loadGtfsData();

    const departureSeconds = departureTime
      ? timeToSeconds(departureTime)
      : (() => {
          const now = new Date();
          return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        })();

    const result = findFastestRoute(gtfs, origin, destination, departureSeconds);

    if (!result) {
      return NextResponse.json(
        { error: "No route found between these stops" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

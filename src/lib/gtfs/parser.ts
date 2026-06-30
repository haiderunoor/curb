import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import type {
  GtfsStop,
  GtfsRoute,
  GtfsTrip,
  GtfsStopTime,
  GtfsData,
} from "./types";

// Download DART's static GTFS zip from the DART developer portal
// (dart.developer.azure-api.net) or dart.org/transitdata, and place it at:
//   data/gtfs/dart-gtfs.zip
// This parser unzips it in-memory and builds lookup tables for routing.

const GTFS_ZIP_PATH = path.join(process.cwd(), "data/gtfs/dart-gtfs.zip");

function parseCsv<T>(zip: AdmZip, fileName: string): T[] {
  const entry = zip.getEntry(fileName);
  if (!entry) {
    throw new Error(`Missing ${fileName} in GTFS zip`);
  }
  const content = entry.getData().toString("utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

let cachedData: GtfsData | null = null;

export function loadGtfsData(): GtfsData {
  if (cachedData) return cachedData;

  if (!fs.existsSync(GTFS_ZIP_PATH)) {
    throw new Error(
      `GTFS zip not found at ${GTFS_ZIP_PATH}. Download it from the DART developer portal and place it there.`
    );
  }

  const zip = new AdmZip(GTFS_ZIP_PATH);

  const rawStops = parseCsv<any>(zip, "stops.txt");
  const rawRoutes = parseCsv<any>(zip, "routes.txt");
  const rawTrips = parseCsv<any>(zip, "trips.txt");
  const rawStopTimes = parseCsv<any>(zip, "stop_times.txt");

  const stops = new Map<string, GtfsStop>();
  for (const s of rawStops) {
    stops.set(s.stop_id, {
      stop_id: s.stop_id,
      stop_name: s.stop_name,
      stop_lat: parseFloat(s.stop_lat),
      stop_lon: parseFloat(s.stop_lon),
    });
  }

  const routes = new Map<string, GtfsRoute>();
  for (const r of rawRoutes) {
    routes.set(r.route_id, {
      route_id: r.route_id,
      route_short_name: r.route_short_name,
      route_long_name: r.route_long_name,
    });
  }

  const trips = new Map<string, GtfsTrip>();
  for (const t of rawTrips) {
    trips.set(t.trip_id, {
      trip_id: t.trip_id,
      route_id: t.route_id,
      service_id: t.service_id,
    });
  }

  const stopTimesByTrip = new Map<string, GtfsStopTime[]>();
  const stopTimesByStop = new Map<string, GtfsStopTime[]>();

  for (const st of rawStopTimes) {
    const stopTime: GtfsStopTime = {
      trip_id: st.trip_id,
      stop_id: st.stop_id,
      arrival_time: st.arrival_time,
      departure_time: st.departure_time,
      stop_sequence: parseInt(st.stop_sequence, 10),
    };

    if (!stopTimesByTrip.has(stopTime.trip_id)) {
      stopTimesByTrip.set(stopTime.trip_id, []);
    }
    stopTimesByTrip.get(stopTime.trip_id)!.push(stopTime);

    if (!stopTimesByStop.has(stopTime.stop_id)) {
      stopTimesByStop.set(stopTime.stop_id, []);
    }
    stopTimesByStop.get(stopTime.stop_id)!.push(stopTime);
  }

  for (const list of stopTimesByTrip.values()) {
    list.sort((a, b) => a.stop_sequence - b.stop_sequence);
  }

  cachedData = { stops, routes, trips, stopTimesByTrip, stopTimesByStop };
  return cachedData;
}

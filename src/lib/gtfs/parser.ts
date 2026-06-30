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

const GTFS_ZIP_PATH = path.join(process.cwd(), "data/gtfs/dart-gtfs.zip");
const GTFS_TMP_PATH = "/tmp/dart-gtfs.zip";
const GTFS_REMOTE_URL =
  "https://www.dart.org/transitdata/latest/google_transit.zip";

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
let downloadPromise: Promise<void> | null = null;

async function ensureGtfsZip(): Promise<string> {
  if (fs.existsSync(GTFS_ZIP_PATH)) return GTFS_ZIP_PATH;
  if (fs.existsSync(GTFS_TMP_PATH)) return GTFS_TMP_PATH;

  if (!downloadPromise) {
    downloadPromise = (async () => {
      const res = await fetch(GTFS_REMOTE_URL);
      if (!res.ok) {
        throw new Error(
          `Failed to download GTFS data from ${GTFS_REMOTE_URL}: ${res.status}`
        );
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(GTFS_TMP_PATH, buffer);
    })();
  }

  await downloadPromise;
  return GTFS_TMP_PATH;
}

export async function loadGtfsDataAsync(): Promise<GtfsData> {
  if (cachedData) return cachedData;
  const zipPath = await ensureGtfsZip();
  return parseGtfsZip(zipPath);
}

export function loadGtfsData(): GtfsData {
  if (cachedData) return cachedData;

  let zipPath: string;
  if (fs.existsSync(GTFS_ZIP_PATH)) {
    zipPath = GTFS_ZIP_PATH;
  } else if (fs.existsSync(GTFS_TMP_PATH)) {
    zipPath = GTFS_TMP_PATH;
  } else {
    throw new Error(
      "GTFS data not yet downloaded. Use loadGtfsDataAsync() or wait for initial download."
    );
  }

  return parseGtfsZip(zipPath);
}

function parseGtfsZip(zipPath: string): GtfsData {
  if (cachedData) return cachedData;
  const zip = new AdmZip(zipPath);

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

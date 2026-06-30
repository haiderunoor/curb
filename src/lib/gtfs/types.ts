// Core GTFS entities we care about for route planning.
// Full spec: https://gtfs.org/schedule/reference/

export interface GtfsStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

export interface GtfsRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
}

export interface GtfsTrip {
  trip_id: string;
  route_id: string;
  service_id: string;
}

export interface GtfsStopTime {
  trip_id: string;
  stop_id: string;
  arrival_time: string;   // HH:MM:SS, can exceed 24:00:00
  departure_time: string; // HH:MM:SS
  stop_sequence: number;
}

export interface GtfsData {
  stops: Map<string, GtfsStop>;
  routes: Map<string, GtfsRoute>;
  trips: Map<string, GtfsTrip>;
  stopTimesByTrip: Map<string, GtfsStopTime[]>;
  stopTimesByStop: Map<string, GtfsStopTime[]>;
}

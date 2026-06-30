import type { GtfsData } from "../gtfs/types";
import { timeToSeconds } from "./time";

export interface RouteLeg {
  type: "ride" | "transfer";
  fromStopId: string;
  toStopId: string;
  departureSeconds: number;
  arrivalSeconds: number;
  tripId?: string;
  routeId?: string;
}

export interface RouteResult {
  legs: RouteLeg[];
  totalArrivalSeconds: number;
}

const MAX_TRANSFER_WAIT_SECONDS = 60 * 60;

/**
 * Earliest-arrival search over a time-expanded transit graph.
 *
 * Each "node" is implicitly (stop, time). Instead of materializing every
 * node up front, we keep a best-known arrival time per stop and relax
 * edges as we discover faster ways to reach each stop, similar to
 * Dijkstra's algorithm with arrival time as the edge weight.
 *
 * This is a simplified single/few-transfer version. For production transit
 * routing at scale, look into the RAPTOR algorithm, which processes
 * rounds-of-transfers instead of a single priority queue.
 */
export function findFastestRoute(
  gtfs: GtfsData,
  originStopId: string,
  destinationStopId: string,
  departureTimeSeconds: number,
  maxTransfers = 2
): RouteResult | null {
  const best = new Map<string, number>();
  const cameFrom = new Map<string, RouteLeg>();

  best.set(originStopId, departureTimeSeconds);

  const queue: { stopId: string; time: number }[] = [
    { stopId: originStopId, time: departureTimeSeconds },
  ];

  const visited = new Set<string>();

  while (queue.length > 0) {
    queue.sort((a, b) => a.time - b.time);
    const current = queue.shift()!;

    if (visited.has(current.stopId)) continue;
    visited.add(current.stopId);

    if (current.stopId === destinationStopId) {
      break;
    }

    const stopTimes = gtfs.stopTimesByStop.get(current.stopId) ?? [];

    for (const st of stopTimes) {
      const tripStopTimes = gtfs.stopTimesByTrip.get(st.trip_id) ?? [];
      const idx = tripStopTimes.findIndex(
        (x) => x.stop_id === current.stopId
      );
      if (idx === -1 || idx === tripStopTimes.length - 1) continue;

      const boardTime = timeToSeconds(st.departure_time);
      if (boardTime < current.time) continue;

      for (let i = idx + 1; i < tripStopTimes.length; i++) {
        const next = tripStopTimes[i];
        const arrival = timeToSeconds(next.arrival_time);
        const existingBest = best.get(next.stop_id) ?? Infinity;

        if (arrival < existingBest) {
          best.set(next.stop_id, arrival);
          cameFrom.set(next.stop_id, {
            type: "ride",
            fromStopId: current.stopId,
            toStopId: next.stop_id,
            departureSeconds: boardTime,
            arrivalSeconds: arrival,
            tripId: st.trip_id,
            routeId: gtfs.trips.get(st.trip_id)?.route_id,
          });
          queue.push({ stopId: next.stop_id, time: arrival });
        }
      }
    }
  }

  if (!best.has(destinationStopId)) {
    return null;
  }

  const legs: RouteLeg[] = [];
  let cursor = destinationStopId;
  while (cursor !== originStopId) {
    const leg = cameFrom.get(cursor);
    if (!leg) break;
    legs.unshift(leg);
    cursor = leg.fromStopId;
  }

  return {
    legs,
    totalArrivalSeconds: best.get(destinationStopId)!,
  };
}

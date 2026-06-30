# Curb

A fastest-route transit planner for Dallas Area Rapid Transit (DART), built
because existing map apps default to walking-biased routing and don't
surface the genuinely fastest bus route.

## How it works

1. Parses DART's static GTFS schedule data (stops, routes, trips, stop times)
2. Builds a time-expanded graph where edges represent scheduled bus rides
   between stops
3. Runs an earliest-arrival search (a Dijkstra variant using arrival time as
   edge weight) from the origin stop to find the fastest path to the
   destination, respecting actual scheduled departure times

## Setup

1. Download DART's static GTFS zip from the DART developer portal
   (https://dart.developer.azure-api.net/) or https://www.dart.org/transitdata/latest/
   and place it at `data/gtfs/dart-gtfs.zip`
2. Copy `.env.local` and add your Mapbox token and DART API key
3. `npm run dev`

## Stack

Next.js, TypeScript, Tailwind, Mapbox GL JS

## Next steps / future work

- Multi-transfer routing (currently optimized for single/low-transfer trips)
- GTFS-realtime integration for live delays instead of scheduled times
- Walking directions to/from stops using a geocoding API

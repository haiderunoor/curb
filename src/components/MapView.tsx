"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface RouteLeg {
  fromStopId: string;
  toStopId: string;
  departureSeconds: number;
  arrivalSeconds: number;
}

interface MapViewProps {
  originStop?: Stop | null;
  destinationStop?: Stop | null;
  routeLegs?: RouteLeg[];
  allStops?: Stop[];
  userLocation?: { lat: number; lon: number } | null;
}

export default function MapView({
  originStop,
  destinationStop,
  routeLegs,
  allStops,
  userLocation,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token === "your_mapbox_token_here") {
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-96.797, 32.777], // Downtown Dallas
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (originStop) {
      const marker = new mapboxgl.Marker({ color: "#22c55e" })
        .setLngLat([originStop.stop_lon, originStop.stop_lat])
        .setPopup(new mapboxgl.Popup().setText(originStop.stop_name))
        .addTo(map.current);
      markersRef.current.push(marker);
    }

    if (destinationStop) {
      const marker = new mapboxgl.Marker({ color: "#ef4444" })
        .setLngLat([destinationStop.stop_lon, destinationStop.stop_lat])
        .setPopup(new mapboxgl.Popup().setText(destinationStop.stop_name))
        .addTo(map.current);
      markersRef.current.push(marker);
    }

    if (originStop && destinationStop) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([originStop.stop_lon, originStop.stop_lat]);
      bounds.extend([destinationStop.stop_lon, destinationStop.stop_lat]);
      map.current.fitBounds(bounds, { padding: 100 });
    }
  }, [originStop, destinationStop]);

  useEffect(() => {
    if (!map.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const el = document.createElement("div");
      el.className = "user-location-dot";
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#3b82f6";
      el.style.border = "3px solid #ffffff";
      el.style.boxShadow = "0 0 8px rgba(59, 130, 246, 0.6)";

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([userLocation.lon, userLocation.lat])
        .setPopup(new mapboxgl.Popup().setText("You are here"))
        .addTo(map.current);

      map.current.flyTo({
        center: [userLocation.lon, userLocation.lat],
        zoom: 14,
      });
    }
  }, [userLocation]);

  useEffect(() => {
    if (!map.current) return;

    const sourceId = "route-line";
    const layerId = "route-line-layer";

    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    if (!routeLegs || routeLegs.length === 0 || !allStops) return;

    const stopsMap = new Map(allStops.map((s) => [s.stop_id, s]));
    const coordinates: [number, number][] = [];

    for (const leg of routeLegs) {
      const from = stopsMap.get(leg.fromStopId);
      const to = stopsMap.get(leg.toStopId);
      if (from && coordinates.length === 0) {
        coordinates.push([from.stop_lon, from.stop_lat]);
      }
      if (to) {
        coordinates.push([to.stop_lon, to.stop_lat]);
      }
    }

    if (coordinates.length < 2) return;

    map.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    });

    map.current.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#6366f1",
        "line-width": 4,
      },
    });
  }, [routeLegs, allStops]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const hasToken = token && token !== "your_mapbox_token_here";

  return (
    <div ref={mapContainer} className="absolute inset-0">
      {!hasToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="text-center text-zinc-400 max-w-sm px-6">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-lg font-medium text-zinc-200 mb-2">
              Map not configured
            </p>
            <p className="text-sm">
              Add your Mapbox token to <code className="text-indigo-400">.env.local</code> to see the map.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

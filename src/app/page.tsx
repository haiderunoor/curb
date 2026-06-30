"use client";

import { useState, useCallback } from "react";
import MapView from "@/components/MapView";
import SearchPanel from "@/components/SearchPanel";
import RouteResults from "@/components/RouteResults";

interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface RouteLeg {
  type: "ride" | "transfer";
  fromStopId: string;
  toStopId: string;
  departureSeconds: number;
  arrivalSeconds: number;
  tripId?: string;
  routeId?: string;
}

interface RouteResponse {
  legs: RouteLeg[];
  totalArrivalSeconds: number;
}

export default function Home() {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [stopNames, setStopNames] = useState<Map<string, string>>(new Map());
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | undefined>();
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });

        try {
          const res = await fetch(
            `/api/stops/nearest?lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const stop = await res.json();
            setOrigin(stop);
            setLocationLabel(stop.stop_name);
          } else {
            const data = await res.json();
            setError(data.error || "Could not find nearest stop.");
          }
        } catch {
          setError("Failed to find nearest stop.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Allow location in your browser settings.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location unavailable. Make sure location services are enabled on your device.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Try again.");
        } else {
          setError("Could not determine your location.");
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  const handleSearch = useCallback(async () => {
    if (!origin || !destination) {
      setError("Select both an origin and destination stop.");
      return;
    }

    setLoading(true);
    setError(null);
    setRoute(null);

    try {
      const now = new Date();
      const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");

      const res = await fetch(
        `/api/route?origin=${origin.stop_id}&destination=${destination.stop_id}&time=${timeStr}`
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to find route");
        return;
      }

      const data: RouteResponse = await res.json();
      setRoute(data);

      const stopsRes = await fetch("/api/stops");
      if (stopsRes.ok) {
        const stops: Stop[] = await stopsRes.json();
        setAllStops(stops);
        const names = new Map<string, string>();
        for (const s of stops) {
          names.set(s.stop_id, s.stop_name);
        }
        names.set(origin.stop_id, origin.stop_name);
        names.set(destination.stop_id, destination.stop_name);
        setStopNames(names);
      }
    } catch {
      setError("Network error. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  const departureSeconds = route?.legs[0]?.departureSeconds ?? 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-900">
      <MapView
        originStop={origin}
        destinationStop={destination}
        routeLegs={route?.legs}
        allStops={allStops}
        userLocation={userLocation}
      />

      <SearchPanel
        onOriginSelect={setOrigin}
        onDestinationSelect={setDestination}
        onSearch={handleSearch}
        loading={loading}
        onUseLocation={handleUseLocation}
        locating={locating}
        locationLabel={locationLabel}
      />

      {error && (
        <div className="absolute top-4 right-4 z-10 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-3 rounded-lg max-w-sm">
          {error}
        </div>
      )}

      {route && (
        <RouteResults
          legs={route.legs}
          totalArrivalSeconds={route.totalArrivalSeconds}
          departureSeconds={departureSeconds}
          stopNames={stopNames}
          onClose={() => setRoute(null)}
        />
      )}
    </div>
  );
}

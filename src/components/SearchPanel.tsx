"use client";

import { useState, useEffect, useRef } from "react";

const ABBREVIATIONS: Record<string, string> = {
  utd: "University of Texas at Dallas",
  uta: "University of Texas at Arlington",
  smu: "Southern Methodist University",
  dfw: "DFW Airport",
  dart: "DART station Dallas",
  dcc: "Dallas Convention Center",
  bbt: "American Airlines Center Dallas",
  aac: "American Airlines Center Dallas",
  ntmh: "North Texas Medical Hospital",
  utsw: "UT Southwestern Medical Center",
  pfc: "Parkland Hospital Dallas",
  tcc: "Tarrant County College",
  "el centro": "El Centro College Dallas",
  richland: "Richland College Dallas",
  northpark: "NorthPark Center Dallas",
  galleria: "Galleria Dallas",
  reunion: "Reunion Tower Dallas",
  "deep ellum": "Deep Ellum Dallas",
  uptown: "Uptown Dallas",
  "bishop arts": "Bishop Arts District Dallas",
  "las colinas": "Las Colinas Irving",
  legacy: "Legacy West Plano",
  "shops at legacy": "Shops at Legacy Plano",
  mockingbird: "Mockingbird Station Dallas",
  cityplace: "Cityplace/Uptown Station Dallas",
  victory: "Victory Park Dallas",
  cedars: "Cedars Station Dallas",
};

function expandAbbreviation(query: string): string {
  const lower = query.toLowerCase().trim();
  if (ABBREVIATIONS[lower]) return ABBREVIATIONS[lower];
  return query;
}

interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface PlaceSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
}

interface SearchPanelProps {
  onOriginSelect: (stop: Stop) => void;
  onDestinationSelect: (stop: Stop) => void;
  onSearch: () => void;
  loading: boolean;
  onUseLocation: () => void;
  locating: boolean;
  locationLabel?: string;
  userLocation?: { lat: number; lon: number } | null;
}

function PlaceInput({
  label,
  placeholder,
  onSelect,
  color,
  userLocation,
}: {
  label: string;
  placeholder: string;
  onSelect: (stop: Stop) => void;
  color: string;
  userLocation?: { lat: number; lon: number } | null;
}) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.length < 2) {
      setPlaces([]);
      setStops([]);
      setShowDropdown(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setSearching(true);

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const expanded = expandAbbreviation(value);

      let geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        expanded
      )}.json?access_token=${token}&bbox=-97.5,32.5,-96.3,33.1&limit=5&types=poi,address,neighborhood,place`;

      if (userLocation) {
        geocodeUrl += `&proximity=${userLocation.lon},${userLocation.lat}`;
      }

      const [placesRes, stopsRes] = await Promise.allSettled([
        token ? fetch(geocodeUrl) : Promise.resolve(null),
        fetch(`/api/stops?q=${encodeURIComponent(value)}`, { cache: "force-cache" }),
      ]);

      const newPlaces: PlaceSuggestion[] = [];
      if (placesRes.status === "fulfilled" && placesRes.value) {
        const data = await placesRes.value.json();
        if (data.features) {
          for (const f of data.features) {
            newPlaces.push({
              id: f.id,
              name: f.text,
              address: f.place_name,
              lat: f.center[1],
              lon: f.center[0],
            });
          }
        }
      }

      const newStops: Stop[] = [];
      if (stopsRes.status === "fulfilled" && stopsRes.value.ok) {
        const data = await stopsRes.value.json();
        if (Array.isArray(data)) {
          newStops.push(...data.slice(0, 4));
        }
      }

      setPlaces(newPlaces);
      setStops(newStops);
      setShowDropdown(newPlaces.length > 0 || newStops.length > 0);
      setSearching(false);
    }, 100);
  }

  function handleSelectStop(stop: Stop) {
    setQuery(stop.stop_name);
    setShowDropdown(false);
    onSelect(stop);
  }

  async function handleSelectPlace(place: PlaceSuggestion) {
    setQuery(place.name);
    setShowDropdown(false);

    try {
      const res = await fetch(
        `/api/stops/nearest?lat=${place.lat}&lon=${place.lon}`
      );
      if (res.ok) {
        const stop = await res.json();
        onSelect(stop);
        setQuery(`${place.name} (${stop.stop_name})`);
      }
    } catch {
      // fallback: just use the place name
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full shrink-0 ${color}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => (places.length > 0 || stops.length > 0) && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      {showDropdown && (
        <div className="absolute z-50 mt-1 ml-5 w-[calc(100%-1.25rem)] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {places.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/80 sticky top-0">
                Places
              </div>
              {places.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-zinc-200">{place.name}</span>
                  <span className="block text-xs text-zinc-500 truncate">
                    {place.address}
                  </span>
                </button>
              ))}
            </>
          )}
          {stops.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/80 sticky top-0 border-t border-zinc-700">
                DART Stops
              </div>
              {stops.map((stop) => (
                <button
                  key={stop.stop_id}
                  onClick={() => handleSelectStop(stop)}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  {stop.stop_name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPanel({
  onOriginSelect,
  onDestinationSelect,
  onSearch,
  loading,
  onUseLocation,
  locating,
  locationLabel,
  userLocation,
}: SearchPanelProps) {
  return (
    <div className="absolute top-4 left-4 z-10 w-80 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl shadow-2xl p-5">
      <h1 className="text-xl font-bold text-zinc-100 mb-1">Curb</h1>
      <p className="text-xs text-zinc-500 mb-4">DART transit route planner</p>

      <button
        onClick={onUseLocation}
        disabled={locating}
        className="w-full mb-3 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 border border-zinc-700 text-zinc-200 font-medium py-2 px-3 rounded-lg text-sm transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
        </svg>
        {locating ? "Locating..." : locationLabel ? `Near: ${locationLabel}` : "Use my location"}
      </button>

      <div className="space-y-3">
        <PlaceInput
          label="From"
          placeholder="Search a place or stop..."
          onSelect={onOriginSelect}
          color="bg-green-500"
          userLocation={userLocation}
        />
        <PlaceInput
          label="To"
          placeholder="Search a place or stop..."
          onSelect={onDestinationSelect}
          color="bg-red-500"
          userLocation={userLocation}
        />
      </div>

      <button
        onClick={onSearch}
        disabled={loading}
        className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
      >
        {loading ? "Finding route..." : "Find fastest route"}
      </button>
    </div>
  );
}

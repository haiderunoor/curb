"use client";

import { useState, useEffect, useRef } from "react";

interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface SearchPanelProps {
  onOriginSelect: (stop: Stop) => void;
  onDestinationSelect: (stop: Stop) => void;
  onSearch: () => void;
  loading: boolean;
}

function StopInput({
  label,
  placeholder,
  onSelect,
  color,
}: {
  label: string;
  placeholder: string;
  onSelect: (stop: Stop) => void;
  color: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Stop[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<Stop | null>(null);
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
    setSelected(null);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stops?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const stops = await res.json();
          setResults(stops);
          setShowDropdown(true);
        }
      } catch {
        setResults([]);
      }
    }, 300);
  }

  function handleSelect(stop: Stop) {
    setSelected(stop);
    setQuery(stop.stop_name);
    setShowDropdown(false);
    onSelect(stop);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 ml-5 w-[calc(100%-1.25rem)] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {results.map((stop) => (
            <button
              key={stop.stop_id}
              onClick={() => handleSelect(stop)}
              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              {stop.stop_name}
            </button>
          ))}
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
}: SearchPanelProps) {
  return (
    <div className="absolute top-4 left-4 z-10 w-80 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl shadow-2xl p-5">
      <h1 className="text-xl font-bold text-zinc-100 mb-1">Curb</h1>
      <p className="text-xs text-zinc-500 mb-4">DART transit route planner</p>

      <div className="space-y-3">
        <StopInput
          label="From"
          placeholder="Search origin stop..."
          onSelect={onOriginSelect}
          color="bg-green-500"
        />
        <StopInput
          label="To"
          placeholder="Search destination stop..."
          onSelect={onDestinationSelect}
          color="bg-red-500"
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

"use client";

interface RouteLeg {
  type: "ride" | "transfer";
  fromStopId: string;
  toStopId: string;
  departureSeconds: number;
  arrivalSeconds: number;
  tripId?: string;
  routeId?: string;
}

interface RouteResultsProps {
  legs: RouteLeg[];
  totalArrivalSeconds: number;
  departureSeconds: number;
  stopNames: Map<string, string>;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const remaining = m % 60;
  return remaining > 0 ? `${h}h ${remaining}m` : `${h}h`;
}

export default function RouteResults({
  legs,
  totalArrivalSeconds,
  departureSeconds,
  stopNames,
  onClose,
}: RouteResultsProps) {
  const totalDuration = totalArrivalSeconds - departureSeconds;

  return (
    <div className="absolute bottom-4 left-4 z-10 w-80 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl shadow-2xl p-5 max-h-[50vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Route found</h2>
          <p className="text-xs text-zinc-400">
            {formatDuration(totalDuration)} total •{" "}
            {formatTime(departureSeconds)} → {formatTime(totalArrivalSeconds)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="space-y-0">
        {legs.map((leg, i) => (
          <div key={i} className="relative pl-6 pb-4">
            <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-indigo-500" />
            {i < legs.length - 1 && (
              <div className="absolute left-[11px] top-3.5 w-0.5 h-[calc(100%-0.5rem)] bg-zinc-700" />
            )}
            <div className="text-sm">
              <p className="text-zinc-200 font-medium">
                {stopNames.get(leg.fromStopId) || leg.fromStopId}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatTime(leg.departureSeconds)}
                {leg.routeId && (
                  <span className="ml-2 px-1.5 py-0.5 bg-indigo-900/50 text-indigo-300 rounded text-[10px] font-medium">
                    Route {leg.routeId}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
        {legs.length > 0 && (
          <div className="relative pl-6">
            <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-red-500" />
            <div className="text-sm">
              <p className="text-zinc-200 font-medium">
                {stopNames.get(legs[legs.length - 1].toStopId) ||
                  legs[legs.length - 1].toStopId}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatTime(totalArrivalSeconds)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

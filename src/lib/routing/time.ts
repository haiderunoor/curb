// GTFS times are HH:MM:SS and can roll past 24:00:00 for trips that run
// past midnight (e.g. "25:10:00"). Convert everything to seconds-since-
// midnight so comparisons are simple integer math.

export function timeToSeconds(time: string): number {
  const [h, m, s] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

export function secondsToTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

import { Decoder, Stream } from "@garmin/fitsdk";

export type RunTrainingType =
  | "EASY"
  | "LONG"
  | "TEMPO"
  | "INTERVAL"
  | "FARTLEK"
  | "RECOVERY"
  | "RACE"
  | "GENERIC";

export type ParsedLap = {
  lapIndex: number;
  distanceM: number | null;
  durationSec: number | null;
  avgPaceSecPerKm: number | null;
  avgHRBpm: number | null;
  maxHRBpm: number | null;
  avgCadence: number | null;
  isWork: boolean;
};

export type ParsedActivity = {
  externalId: string;
  sport: string;
  subSport: string | null;
  startTime: Date;
  distanceKm: number | null;
  durationMin: number | null;
  avgPaceSecPerKm: number | null;
  avgHRBpm: number | null;
  maxHRBpm: number | null;
  calories: number | null;
  elevationGainM: number | null;
  avgCadence: number | null;
  trainingType: RunTrainingType;
  laps: ParsedLap[];
};

function paceFromSpeed(speedMs: number | undefined | null): number | null {
  if (!speedMs || speedMs <= 0) return null;
  return Math.round(1000 / speedMs);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Running cadence is per-leg (strides/min); steps/min is double.
function cadenceSpm(running: unknown, generic: unknown): number | null {
  const r = num(running);
  if (r != null) return Math.round(r * 2);
  const g = num(generic);
  return g != null ? Math.round(g) : null;
}

/**
 * Decode a Garmin .FIT activity file into a normalized activity.
 * Returns null when the buffer is not a valid/complete FIT activity.
 */
export function parseFit(bytes: Uint8Array): ParsedActivity | null {
  const decoder = new Decoder(Stream.fromByteArray(bytes));
  if (!decoder.isFIT() || !decoder.checkIntegrity()) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { messages }: { messages: any } = decoder.read();
  const session = (messages.sessionMesgs ?? [])[0];
  if (!session || !session.startTime) return null;

  const start = new Date(session.startTime);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lapMesgs: any[] = messages.lapMesgs ?? [];

  const laps: ParsedLap[] = lapMesgs.map((l, i) => ({
    lapIndex: i,
    distanceM: num(l.totalDistance),
    durationSec: num(l.totalTimerTime ?? l.totalElapsedTime),
    avgPaceSecPerKm: paceFromSpeed(l.enhancedAvgSpeed ?? l.avgSpeed),
    avgHRBpm: num(l.avgHeartRate),
    maxHRBpm: num(l.maxHeartRate),
    avgCadence: cadenceSpm(l.avgRunningCadence, l.avgCadence),
    isWork: true,
  }));

  const sport: string = session.sport ?? "generic";
  classifyLaps(laps, sport);

  const distanceKm = num(session.totalDistance) != null ? session.totalDistance / 1000 : null;
  const durationSec = num(session.totalTimerTime ?? session.totalElapsedTime);

  return {
    externalId: start.toISOString(),
    sport,
    subSport: session.subSport ?? null,
    startTime: start,
    distanceKm,
    durationMin: durationSec != null ? Math.round(durationSec / 60) : null,
    avgPaceSecPerKm: paceFromSpeed(session.enhancedAvgSpeed ?? session.avgSpeed),
    avgHRBpm: num(session.avgHeartRate),
    maxHRBpm: num(session.maxHeartRate),
    calories: num(session.totalCalories),
    elevationGainM: num(session.totalAscent),
    avgCadence: cadenceSpm(session.avgRunningCadence, session.avgCadence),
    trainingType: detectTrainingType(sport, distanceKm, laps),
    laps,
  };
}

/**
 * Mark each lap as work or recovery using a midpoint pace threshold.
 * Only meaningful for running; other sports leave every lap as work.
 */
function classifyLaps(laps: ParsedLap[], sport: string) {
  if (sport !== "running" || laps.length < 3) return;
  const paces = laps.map((l) => l.avgPaceSecPerKm).filter((p): p is number => p != null);
  if (paces.length < 3) return;
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  if (max / min < 1.4) return; // steady run, not interval
  const threshold = min + (max - min) * 0.5;
  for (const l of laps) {
    if (l.avgPaceSecPerKm != null) l.isWork = l.avgPaceSecPerKm <= threshold;
  }
}

function detectTrainingType(
  sport: string,
  distanceKm: number | null,
  laps: ParsedLap[],
): RunTrainingType {
  if (sport !== "running") return "GENERIC";
  const hasRecovery = laps.some((l) => !l.isWork);
  const workLaps = laps.filter((l) => l.isWork).length;
  if (hasRecovery && workLaps >= 3) return "INTERVAL";
  if (distanceKm != null && distanceKm >= 12) return "LONG";
  return "EASY";
}

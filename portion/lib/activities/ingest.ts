import type { PrismaClient } from "@prisma/client";
import { mapSportToActivity } from "../garmin/sport-map";
import type { ParsedActivity } from "../garmin/parse-fit";

// Shared activity-ingest pipeline used by every cardio source (Garmin FIT upload,
// the local Garmin sync script, and the Strava OAuth sync). Takes the Prisma
// client as a parameter so it works for both the app singleton (`@/lib/prisma`)
// and the standalone client the sync script creates. Uses relative imports
// because the script runs under tsx, which does not resolve the `@/` alias.

export type IngestResult = "imported" | "skipped";

/** Get-or-create the CARDIO ActivityType for a sport, cached per run. */
export async function ensureActivityType(
  db: PrismaClient,
  profileId: string,
  sport: string,
  cache: Map<string, string>,
): Promise<string> {
  const m = mapSportToActivity(sport);
  const cached = cache.get(m.slug);
  if (cached) return cached;

  const activity = await db.activityType.upsert({
    where: { profileId_slug: { profileId, slug: m.slug } },
    create: { profileId, name: m.name, slug: m.slug, icon: m.icon, kind: "CARDIO" },
    update: {},
    select: { id: true },
  });
  cache.set(m.slug, activity.id);
  return activity.id;
}

/**
 * Insert a parsed activity as a WorkoutSession (+ RunEntry + RunLaps).
 * Deduped by the `@@unique([profileId, externalId])` constraint: a session whose
 * externalId already exists for the user is left untouched and reported skipped.
 */
export async function ingestActivity(
  db: PrismaClient,
  profileId: string,
  parsed: ParsedActivity,
  source: string,
  cache: Map<string, string>,
): Promise<IngestResult> {
  const existing = await db.workoutSession.findUnique({
    where: { profileId_externalId: { profileId, externalId: parsed.externalId } },
    select: { id: true },
  });
  if (existing) return "skipped";

  const activityTypeId = await ensureActivityType(db, profileId, parsed.sport, cache);
  const sportName = mapSportToActivity(parsed.sport).name;

  await db.workoutSession.create({
    data: {
      profileId,
      activityTypeId,
      date: parsed.startTime,
      type: sportName,
      durationMin: parsed.durationMin,
      source,
      externalId: parsed.externalId,
      runs: {
        create: {
          type: sportName,
          trainingType: parsed.trainingType,
          distanceKm: parsed.distanceKm,
          durationMin: parsed.durationMin,
          avgPaceSecPerKm: parsed.avgPaceSecPerKm,
          avgHRBpm: parsed.avgHRBpm,
          maxHRBpm: parsed.maxHRBpm,
          calories: parsed.calories,
          elevationGainM: parsed.elevationGainM,
          avgCadence: parsed.avgCadence,
          laps: {
            create: parsed.laps.map((l) => ({
              lapIndex: l.lapIndex,
              distanceM: l.distanceM,
              durationSec: l.durationSec,
              avgPaceSecPerKm: l.avgPaceSecPerKm,
              avgHRBpm: l.avgHRBpm,
              maxHRBpm: l.maxHRBpm,
              avgCadence: l.avgCadence,
              isWork: l.isWork,
            })),
          },
        },
      },
    },
  });
  return "imported";
}

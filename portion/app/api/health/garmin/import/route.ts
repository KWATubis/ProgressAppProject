import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseFit, type ParsedActivity } from "@/lib/garmin/parse-fit";
import { mapSportToActivity } from "@/lib/garmin/sport-map";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportResult = {
  imported: number;
  skipped: number;
  failed: number;
  details: { file: string; status: "imported" | "skipped" | "failed"; reason?: string }[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const result: ImportResult = { imported: 0, skipped: 0, failed: 0, details: [] };
  const activityCache = new Map<string, string>(); // slug -> activityTypeId

  for (const file of files) {
    let parsed: ParsedActivity | null = null;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      parsed = parseFit(bytes);
    } catch {
      parsed = null;
    }

    if (!parsed) {
      result.failed++;
      result.details.push({ file: file.name, status: "failed", reason: "Not a valid FIT activity" });
      continue;
    }

    // Dedupe: one session per (profile, start time).
    const existing = await prisma.workoutSession.findUnique({
      where: { profileId_externalId: { profileId: user.id, externalId: parsed.externalId } },
      select: { id: true },
    });
    if (existing) {
      result.skipped++;
      result.details.push({ file: file.name, status: "skipped", reason: "Already imported" });
      continue;
    }

    try {
      const activityTypeId = await ensureActivity(user.id, parsed.sport, activityCache);
      await prisma.workoutSession.create({
        data: {
          profileId: user.id,
          activityTypeId,
          date: parsed.startTime,
          type: mapSportToActivity(parsed.sport).name,
          durationMin: parsed.durationMin,
          source: "garmin",
          externalId: parsed.externalId,
          runs: {
            create: {
              type: mapSportToActivity(parsed.sport).name,
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
      result.imported++;
      result.details.push({ file: file.name, status: "imported" });
    } catch (e) {
      result.failed++;
      result.details.push({
        file: file.name,
        status: "failed",
        reason: e instanceof Error ? e.message : "Insert failed",
      });
    }
  }

  return NextResponse.json(result);
}

async function ensureActivity(
  profileId: string,
  sport: string,
  cache: Map<string, string>,
): Promise<string> {
  const m = mapSportToActivity(sport);
  const cached = cache.get(m.slug);
  if (cached) return cached;

  const activity = await prisma.activityType.upsert({
    where: { profileId_slug: { profileId, slug: m.slug } },
    create: { profileId, name: m.name, slug: m.slug, icon: m.icon, kind: "CARDIO" },
    update: {},
    select: { id: true },
  });
  cache.set(m.slug, activity.id);
  return activity.id;
}

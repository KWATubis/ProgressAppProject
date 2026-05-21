import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const setSchema = z.object({
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0).max(1000).optional().nullable(),
  weightKg: z.number().min(0).max(1000).optional().nullable(),
});

const exerciseSchema = z.object({
  name: z.string().min(1).max(120),
  muscleGroup: z.string().min(1).max(60),
  sets: z.array(setSchema).min(1),
});

const lapSchema = z.object({
  distanceM: z.number().min(0).max(100000).optional().nullable(),
  durationSec: z.number().min(0).max(86400).optional().nullable(),
  recoverySec: z.number().int().min(0).max(86400).optional().nullable(),
  avgHRBpm: z.number().int().min(0).max(250).optional().nullable(),
});

const runSchema = z.object({
  type: z.string().min(1).max(60),
  trainingType: z
    .enum(["EASY", "LONG", "TEMPO", "INTERVAL", "FARTLEK", "RECOVERY", "RACE", "GENERIC"])
    .optional()
    .nullable(),
  distanceKm: z.number().min(0).optional().nullable(),
  durationMin: z.number().int().min(0).optional().nullable(),
  avgPaceSecPerKm: z.number().int().min(0).optional().nullable(),
  avgHRBpm: z.number().int().min(0).optional().nullable(),
  laps: z.array(lapSchema).optional().default([]),
});

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string().min(1).max(60),
  activityTypeId: z.string().optional().nullable(),
  durationMin: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  exercises: z.array(exerciseSchema).optional().default([]),
  runs: z.array(runSchema).optional().default([]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 },
    );
  }

  // Drop sets with no data, then exercises left with no sets.
  const exercises = body.exercises
    .map((ex) => ({
      ...ex,
      sets: ex.sets.filter((s) => s.reps != null || s.weightKg != null),
    }))
    .filter((ex) => ex.sets.length > 0);

  if (exercises.length === 0 && body.runs.length === 0 && !body.durationMin) {
    return NextResponse.json({ error: "Log at least one set, run, or duration" }, { status: 400 });
  }

  const session = await prisma.workoutSession.create({
    data: {
      profileId: user.id,
      date: parseISODate(body.date),
      type: body.type,
      activityTypeId: body.activityTypeId ?? null,
      durationMin: body.durationMin ?? null,
      notes: body.notes ?? null,
      exercises: exercises.length > 0
        ? {
            create: exercises.flatMap((ex) =>
              ex.sets.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps ?? null,
                weightKg: s.weightKg ?? null,
                exercise: {
                  connectOrCreate: {
                    where: { name: ex.name },
                    create: { name: ex.name, category: ex.muscleGroup },
                  },
                },
              })),
            ),
          }
        : undefined,
      runs: body.runs.length > 0
        ? {
            create: body.runs.map((r) => ({
              type: r.type,
              trainingType: r.trainingType ?? null,
              distanceKm: r.distanceKm ?? null,
              durationMin: r.durationMin ?? null,
              avgPaceSecPerKm: r.avgPaceSecPerKm ?? null,
              avgHRBpm: r.avgHRBpm ?? null,
              laps: r.laps.length > 0
                ? {
                    create: r.laps.map((l, i) => ({
                      lapIndex: i,
                      distanceM: l.distanceM ?? null,
                      durationSec: l.durationSec ?? null,
                      avgPaceSecPerKm:
                        l.distanceM && l.durationSec && l.distanceM > 0
                          ? Math.round((l.durationSec * 1000) / l.distanceM)
                          : null,
                      avgHRBpm: l.avgHRBpm ?? null,
                      recoverySec: l.recoverySec ?? null,
                      isWork: true,
                    })),
                  }
                : undefined,
            })),
          }
        : undefined,
    },
    include: { exercises: true, runs: true },
  });

  return NextResponse.json({ session });
}

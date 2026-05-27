import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const activity = await prisma.activityType.findUnique({
    where: { profileId_slug: { profileId: user.id, slug } },
    include: {
      workoutPlan: {
        include: {
          days: {
            orderBy: { sortOrder: "asc" },
            include: {
              exercises: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!activity.workoutPlan) return NextResponse.json({ plan: null });

  return NextResponse.json({ plan: activity.workoutPlan });
}

const planSchema = z.object({
  name: z.string().min(1).max(80),
  days: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        exercises: z
          .array(
            z.object({
              name: z.string().min(1).max(120),
              muscleGroup: z.string().min(1).max(60),
              metric: z.enum(["REPS", "TIME"]).optional().default("REPS"),
              targetSets: z.number().int().min(1).max(20),
              repRange: z.string().max(20).optional().nullable(),
              rir: z.number().int().min(0).max(10).optional().nullable(),
              notes: z.string().max(200).optional().nullable(),
              customMetricId: z.string().optional().nullable(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

// Create or replace the workout plan for a STRENGTH activity.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const activity = await prisma.activityType.findUnique({
    where: { profileId_slug: { profileId: user.id, slug } },
    include: { workoutPlan: true },
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (activity.kind !== "STRENGTH") {
    return NextResponse.json({ error: "Plans are only for strength activities" }, { status: 400 });
  }

  let body;
  try {
    body = planSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid body" }, { status: 400 });
  }

  // Defense-in-depth: only accept customMetricIds the user actually owns
  // and that belong to this activity. The FK would catch ownership leaks
  // but we want a clean 400 instead of a 500 if someone hand-crafts a body.
  const incomingMetricIds = Array.from(
    new Set(
      body.days
        .flatMap((d) => d.exercises)
        .map((ex) => ex.customMetricId)
        .filter((v): v is string => !!v),
    ),
  );
  let validMetricIds = new Set<string>();
  if (incomingMetricIds.length > 0) {
    const found = await prisma.customMetric.findMany({
      where: {
        id: { in: incomingMetricIds },
        profileId: user.id,
        activityTypeId: activity.id,
      },
      select: { id: true },
    });
    validMetricIds = new Set(found.map((m) => m.id));
  }

  // Replace any existing plan so editing is idempotent.
  if (activity.workoutPlan) {
    await prisma.workoutPlan.delete({ where: { id: activity.workoutPlan.id } });
  }

  const plan = await prisma.workoutPlan.create({
    data: {
      profileId: user.id,
      activityTypeId: activity.id,
      name: body.name,
      days: {
        create: body.days.map((day, di) => ({
          label: day.label,
          sortOrder: di,
          exercises: {
            create: day.exercises.map((ex, ei) => ({
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              metric: ex.metric,
              targetSets: ex.targetSets,
              repRange: ex.repRange ?? null,
              rir: ex.rir ?? null,
              notes: ex.notes ?? null,
              sortOrder: ei,
              customMetricId:
                ex.customMetricId && validMetricIds.has(ex.customMetricId)
                  ? ex.customMetricId
                  : null,
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}

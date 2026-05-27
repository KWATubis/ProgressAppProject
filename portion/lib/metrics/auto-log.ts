// Server-only: creates MetricEntry rows whenever a logged workout set
// matches an exercise that's been linked to a custom metric in the plan.
import { prisma } from "@/lib/prisma";

type LoggedSet = {
  exerciseName: string;
  reps: number | null;
  weightKg: number | null;
  holdSeconds: number | null;
};

/**
 * Map a logged set to a metric value by inspecting the linked metric's unit.
 * Falls back to the exercise's REPS/TIME type when the unit is non-standard.
 */
function pickValue(
  set: LoggedSet,
  unit: string,
  exerciseMetric: "REPS" | "TIME",
): number | null {
  const u = unit.toLowerCase().trim();
  if (u === "seconds" || u === "second" || u === "sec" || u === "s") {
    return set.holdSeconds ?? null;
  }
  if (u === "kg" || u === "lb" || u === "lbs") {
    return set.weightKg ?? null;
  }
  if (u === "reps" || u === "rep") {
    return set.reps ?? null;
  }
  // Unknown unit — fall back to the exercise's metric type.
  if (exerciseMetric === "TIME") return set.holdSeconds ?? null;
  return set.reps ?? null;
}

export async function autoLogMetricEntries({
  profileId,
  activityTypeId,
  date,
  sets,
}: {
  profileId: string;
  activityTypeId: string;
  date: Date;
  sets: LoggedSet[];
}): Promise<number> {
  if (sets.length === 0) return 0;

  // Find the activity's plan and its exercises with linked metrics.
  const plan = await prisma.workoutPlan.findUnique({
    where: { activityTypeId },
    include: {
      days: {
        include: {
          exercises: {
            where: { customMetricId: { not: null } },
            include: { customMetric: true },
          },
        },
      },
    },
  });
  if (!plan) return 0;

  // Build name → link map (case-insensitive). Defense-in-depth: confirm the
  // metric belongs to this profile in case stale FKs ever survive.
  type Link = {
    customMetricId: string;
    unit: string;
    exerciseMetric: "REPS" | "TIME";
  };
  const linkMap = new Map<string, Link>();
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      if (!ex.customMetric || ex.customMetric.profileId !== profileId) continue;
      linkMap.set(ex.name.toLowerCase(), {
        customMetricId: ex.customMetric.id,
        unit: ex.customMetric.unit,
        exerciseMetric: ex.metric,
      });
    }
  }
  if (linkMap.size === 0) return 0;

  const entries: {
    customMetricId: string;
    date: Date;
    value: number;
    notes: string | null;
  }[] = [];

  for (const s of sets) {
    const link = linkMap.get(s.exerciseName.toLowerCase());
    if (!link) continue;
    const value = pickValue(s, link.unit, link.exerciseMetric);
    if (value == null) continue;
    entries.push({
      customMetricId: link.customMetricId,
      date,
      value,
      notes: null,
    });
  }
  if (entries.length === 0) return 0;

  await prisma.metricEntry.createMany({ data: entries });
  return entries.length;
}

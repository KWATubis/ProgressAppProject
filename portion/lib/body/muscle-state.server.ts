import "server-only";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight } from "@/lib/utils/dates";
import { MUSCLE_GROUPS, mapCategory, type MuscleState } from "./muscle-state";

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);
}

export async function getMuscleStates(profileId: string): Promise<MuscleState[]> {
  const today = toUtcMidnight();
  const now = new Date();
  const lookback = new Date(today.getTime() - 30 * 86_400_000);

  const sessions = await prisma.workoutSession.findMany({
    where: { profileId, date: { gte: lookback } },
    orderBy: { date: "desc" },
    include: {
      exercises: { include: { exercise: true } },
    },
  });

  const perGroup = new Map<
    string,
    { date: Date; sets: Array<{ exercise: string; reps: number | null; weightKg: number | null }> }
  >();

  for (const session of sessions) {
    for (const set of session.exercises) {
      const groups = mapCategory(set.exercise.category);
      for (const g of groups) {
        const existing = perGroup.get(g);
        if (!existing || session.date > existing.date) {
          perGroup.set(g, {
            date: session.date,
            sets: session.exercises
              .filter((s) => mapCategory(s.exercise.category).includes(g))
              .slice(0, 8)
              .map((s) => ({
                exercise: s.exercise.name,
                reps: s.reps,
                weightKg: s.weightKg,
              })),
          });
        }
      }
    }
  }

  return MUSCLE_GROUPS.map((group) => {
    const entry = perGroup.get(group);
    if (!entry) {
      return {
        group,
        daysSince: null,
        hoursSince: null,
        lastTrainedISO: null,
        lastSets: [],
      };
    }
    return {
      group,
      daysSince: daysBetween(entry.date, today),
      hoursSince: hoursBetween(entry.date, now),
      lastTrainedISO: entry.date.toISOString().slice(0, 10),
      lastSets: entry.sets,
    };
  });
}

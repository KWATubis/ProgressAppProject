import { prisma } from "@/lib/prisma";

export type PreviousSet = {
  weightKg: number | null;
  reps: number | null;
  holdSeconds: number | null;
};

/**
 * For each exercise name, return the sets logged in the user's most recent
 * session that contained that exercise — the "last time you did this" reference
 * shown in live mode. Keyed by the exercise name (case-insensitive match is not
 * needed: Exercise.name is canonical/unique).
 */
export async function loadLastPerformance(
  profileId: string,
  exerciseNames: string[],
): Promise<Record<string, PreviousSet[]>> {
  const names = [...new Set(exerciseNames)];
  if (names.length === 0) return {};

  const sets = await prisma.exerciseSet.findMany({
    where: {
      session: { profileId },
      exercise: { name: { in: names } },
    },
    orderBy: [{ session: { date: "desc" } }, { setNumber: "asc" }],
    select: {
      reps: true,
      weightKg: true,
      holdSeconds: true,
      exercise: { select: { name: true } },
      session: { select: { id: true } },
    },
  });

  // Walk newest→oldest; the first session id seen per exercise is its most
  // recent, so keep only sets from that session for each exercise.
  const latestSessionByName: Record<string, string> = {};
  const result: Record<string, PreviousSet[]> = {};
  for (const s of sets) {
    const name = s.exercise.name;
    if (!(name in latestSessionByName)) {
      latestSessionByName[name] = s.session.id;
      result[name] = [];
    }
    if (s.session.id !== latestSessionByName[name]) continue;
    result[name].push({
      weightKg: s.weightKg,
      reps: s.reps,
      holdSeconds: s.holdSeconds,
    });
  }
  return result;
}

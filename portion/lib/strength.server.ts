// Server-only: imports Prisma. Never import from a client component.
import { prisma } from "@/lib/prisma";
import { epley1RM, roundKg, type StrengthPR, type SessionPR } from "@/lib/strength";

/**
 * Top lifts by all-time estimated 1RM. One row per exercise — the set that
 * produced its best e1RM. Sorted heaviest first.
 */
export async function loadStrengthPRs(profileId: string, limit = 5): Promise<StrengthPR[]> {
  const sets = await prisma.exerciseSet.findMany({
    where: { session: { profileId }, weightKg: { gt: 0 }, reps: { gt: 0 } },
    select: {
      weightKg: true,
      reps: true,
      exercise: { select: { id: true, name: true, category: true } },
      session: { select: { date: true } },
    },
  });

  const byExercise = new Map<
    string,
    { name: string; category: string; best: number; weightKg: number; reps: number; date: Date }
  >();

  for (const s of sets) {
    const w = s.weightKg!;
    const r = s.reps!;
    const e = epley1RM(w, r);
    const cur = byExercise.get(s.exercise.id);
    if (!cur || e > cur.best) {
      byExercise.set(s.exercise.id, {
        name: s.exercise.name,
        category: s.exercise.category,
        best: e,
        weightKg: w,
        reps: r,
        date: s.session.date,
      });
    }
  }

  return Array.from(byExercise.entries())
    .map(([exerciseId, v]) => ({
      exerciseId,
      name: v.name,
      category: v.category,
      e1RM: roundKg(v.best),
      weightKg: v.weightKg,
      reps: v.reps,
      achievedAt: v.date.toISOString().slice(0, 10),
    }))
    .sort((a, b) => b.e1RM - a.e1RM)
    .slice(0, limit);
}

/**
 * For every exercise in a session, the session's best e1RM and whether it beat
 * the user's previous best for that lift. Keyed by exerciseId. A lift only
 * counts as a PR if there was a prior weighted log to beat (so a first-ever
 * entry doesn't read as a PR).
 */
export async function detectSessionPRs(
  profileId: string,
  sessionId: string,
): Promise<Map<string, SessionPR>> {
  const sets = await prisma.exerciseSet.findMany({
    where: { session: { profileId }, weightKg: { gt: 0 }, reps: { gt: 0 } },
    select: { sessionId: true, exerciseId: true, weightKg: true, reps: true },
  });

  const acc = new Map<string, { sessionBest: number; prevBest: number }>();
  for (const s of sets) {
    const e = epley1RM(s.weightKg!, s.reps!);
    const cur = acc.get(s.exerciseId) ?? { sessionBest: 0, prevBest: 0 };
    if (s.sessionId === sessionId) {
      if (e > cur.sessionBest) cur.sessionBest = e;
    } else if (e > cur.prevBest) {
      cur.prevBest = e;
    }
    acc.set(s.exerciseId, cur);
  }

  const out = new Map<string, SessionPR>();
  for (const [exerciseId, v] of acc) {
    if (v.sessionBest <= 0) continue;
    out.set(exerciseId, {
      exerciseId,
      e1RM: roundKg(v.sessionBest),
      isPR: v.prevBest > 0 && v.sessionBest > v.prevBest + 0.01,
      prevBest: v.prevBest > 0 ? roundKg(v.prevBest) : null,
    });
  }
  return out;
}

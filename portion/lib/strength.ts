// Pure strength math — no Prisma, no React. Safe to import anywhere.

/**
 * Epley estimated one-rep max. A single rep returns the weight itself.
 * e1RM = weight × (1 + reps / 30).
 */
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Round to one decimal place for kg display. */
export function roundKg(n: number): number {
  return Math.round(n * 10) / 10;
}

/** A lift's all-time best estimated 1RM — feeds the Health "Personal records" card. */
export type StrengthPR = {
  exerciseId: string;
  name: string;
  category: string;
  e1RM: number; // rounded kg
  weightKg: number; // the working set that produced the best e1RM
  reps: number;
  achievedAt: string; // YYYY-MM-DD
};

/** Whether a single session set or holds an exercise's e1RM record. */
export type SessionPR = {
  exerciseId: string;
  e1RM: number; // this session's best e1RM, rounded
  isPR: boolean; // beat the previous best
  prevBest: number | null; // rounded; null when it's the first weighted log
};

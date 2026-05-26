export const MUSCLE_GROUPS = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type MuscleState = {
  group: MuscleGroup;
  daysSince: number | null;
  lastTrainedISO: string | null;
  lastSets: Array<{
    exercise: string;
    reps: number | null;
    weightKg: number | null;
  }>;
};

const CATEGORY_MAP: Record<string, MuscleGroup[]> = {
  chest: ["chest"],
  pec: ["chest"],
  pectoral: ["chest"],
  shoulder: ["shoulders"],
  shoulders: ["shoulders"],
  delt: ["shoulders"],
  delts: ["shoulders"],
  biceps: ["biceps"],
  bicep: ["biceps"],
  triceps: ["triceps"],
  tricep: ["triceps"],
  arm: ["biceps", "triceps"],
  arms: ["biceps", "triceps"],
  forearm: ["forearms"],
  forearms: ["forearms"],
  ab: ["abs"],
  abs: ["abs"],
  abdominal: ["abs"],
  abdominals: ["abs"],
  core: ["abs"],
  back: ["back"],
  lat: ["back"],
  lats: ["back"],
  trap: ["back"],
  traps: ["back"],
  glute: ["glutes"],
  glutes: ["glutes"],
  quad: ["quads"],
  quads: ["quads"],
  hamstring: ["hamstrings"],
  hamstrings: ["hamstrings"],
  ham: ["hamstrings"],
  hams: ["hamstrings"],
  calf: ["calves"],
  calves: ["calves"],
  leg: ["quads", "hamstrings", "calves"],
  legs: ["quads", "hamstrings", "calves"],
};

export function mapCategory(category: string): MuscleGroup[] {
  const tokens = category
    .toLowerCase()
    .split(/[\s,/&+]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const groups = new Set<MuscleGroup>();
  for (const token of tokens) {
    const hit = CATEGORY_MAP[token];
    if (hit) hit.forEach((g) => groups.add(g));
  }
  return Array.from(groups);
}

/** Color: red (0 days) → orange (1) → yellow (2) → green (3+ / null). */
export function tirednessColor(daysSince: number | null): string {
  if (daysSince == null) return "#10b981";
  if (daysSince <= 0) return "#ef4444";
  if (daysSince === 1) return "#f97316";
  if (daysSince === 2) return "#eab308";
  return "#10b981";
}

export function tirednessLabel(daysSince: number | null): string {
  if (daysSince == null) return "Rested";
  if (daysSince <= 0) return "Just trained";
  if (daysSince === 1) return "Sore";
  if (daysSince === 2) return "Recovering";
  return "Rested";
}

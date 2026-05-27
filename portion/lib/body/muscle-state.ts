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
  hoursSince: number | null;
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

/**
 * Recovery in 0–1 where 0 = just trained (max fatigue) and 1 = fully rested.
 * 48-hour recovery window. Null hours → fully rested.
 */
export function recoveryAmount(hoursSince: number | null): number {
  if (hoursSince == null) return 1;
  if (hoursSince <= 0) return 0;
  if (hoursSince >= 48) return 1;
  // Smoothstep so the curve eases at both ends (sore plateau, then quick rebound).
  const t = hoursSince / 48;
  return t * t * (3 - 2 * t);
}

/**
 * Smooth red → yellow → green gradient over 0..48h.
 * Returns an RGB hex string. Used wherever a plain color is needed (legend chips, badges).
 * The 3D shader does its own interpolation using `recoveryAmount` to keep it GPU-driven.
 */
export function tirednessColor(hoursSince: number | null): string {
  const r = recoveryAmount(hoursSince);
  // Hue 0 (red) → 60 (yellow) → 120 (green). Saturation high, lightness mid.
  const hue = r * 120;
  const sat = 78 - r * 12; // slightly desaturate as recovered
  const light = 52 + r * 4;
  return hslToHex(hue, sat, light);
}

export function tirednessLabel(hoursSince: number | null): string {
  if (hoursSince == null) return "Rested";
  if (hoursSince < 4) return "Just trained";
  if (hoursSince < 18) return "Sore";
  if (hoursSince < 36) return "Recovering";
  if (hoursSince < 48) return "Almost rested";
  return "Rested";
}

/** HSL (0..360, 0..100, 0..100) → "#rrggbb" */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lNorm - c / 2;
  const to255 = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

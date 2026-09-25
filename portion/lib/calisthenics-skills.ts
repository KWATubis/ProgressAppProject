// Calisthenics skill progressions + the maths that turns any logged hold
// (progression, band or not, seconds) into one smooth % towards the full skill.
//
// Rules of thumb it encodes:
//  - ~10s at one progression ≈ 2s at the next (a 5:1 hold ratio).
//  - A resistance band drops a hold one progression: banded straddle planche
//    ≈ super advanced tuck planche.
// 0% = a 2s banded hold of the first progression; 100% = the full skill held
// for FULL_HOLD_SECONDS. Every second held moves the bar.
export type Progression = { key: string; label: string };

export type SkillKey = "frontLever" | "planche";

export type SkillDef = {
  key: SkillKey;
  title: string;
  /** Easiest → full skill. */
  progressions: Progression[];
};

export const FRONT_LEVER: SkillDef = {
  key: "frontLever",
  title: "Front Lever",
  progressions: [
    { key: "tuck", label: "Tuck" },
    { key: "oneLeg", label: "One Leg" },
    { key: "advTuck", label: "Advanced Tuck" },
    { key: "halfLay", label: "Half Lay" },
    { key: "full", label: "Full" },
  ],
};

export const PLANCHE: SkillDef = {
  key: "planche",
  title: "Planche",
  progressions: [
    { key: "tuck", label: "Tuck" },
    { key: "advTuck", label: "Advanced Tuck" },
    { key: "superAdvTuck", label: "Super Advanced Tuck" },
    { key: "straddle", label: "Straddle" },
    { key: "full", label: "Full" },
  ],
};

export const CALISTHENICS_SKILLS: SkillDef[] = [FRONT_LEVER, PLANCHE];

/** Unit stored on skill metrics and the goals that track them. */
export const SKILL_UNIT = "%";
/** The hold that counts as 100%: the full skill for this many seconds. */
export const FULL_HOLD_SECONDS = 3;

export function getSkill(key: SkillKey): SkillDef {
  const skill = CALISTHENICS_SKILLS.find((s) => s.key === key);
  if (!skill) throw new Error(`Unknown calisthenics skill: ${key}`);
  return skill;
}

/** Matches a CustomMetric to a skill by its title ("Front Lever", "FL hold",
 *  "Planche PR"…). Only decides which logging UI to render — a metric that
 *  doesn't match just gets the plain number field. */
export function findSkillByTitle(title: string): SkillDef | null {
  const t = title.trim().toLowerCase();
  if (t.includes("front lever") || t === "fl" || t.startsWith("fl ")) return FRONT_LEVER;
  if (t.includes("planche")) return PLANCHE;
  return null;
}

const REACHED_SECONDS = 2; // a progression counts as reached at a 2s hold…
const NEXT_SECONDS = 10; // …and ~10s there ≈ 2s of the next one
const RATIO = NEXT_SECONDS / REACHED_SECONDS;

/** Continuous position on the ladder, where step n = a 2s hold at step n.
 *  Linear per second between 2s and 10s at a step; shorter/longer holds carry
 *  over to the neighbouring step via the 5:1 ratio, so the scale never jumps. */
function ladderPosition(step: number, seconds: number): number {
  const exact = step + Math.log(seconds / REACHED_SECONDS) / Math.log(RATIO);
  const s = Math.floor(exact);
  const secondsAtS = seconds * RATIO ** (step - s); // in [2, 10)
  return s + (secondsAtS - REACHED_SECONDS) / (NEXT_SECONDS - REACHED_SECONDS);
}

/** % towards the full skill (FULL_HOLD_SECONDS) for one hold, rounded to 0.1.
 *  Not capped at 100 — a longer full hold keeps counting. */
export function holdPercent(
  skill: SkillDef,
  progressionKey: string,
  banded: boolean,
  seconds: number,
): number {
  const index = skill.progressions.findIndex((p) => p.key === progressionKey);
  if (index < 0 || !(seconds > 0)) return 0;
  // Step 0 is "one below the first progression" (a banded first progression).
  const step = index + 1 - (banded ? 1 : 0);
  const full = ladderPosition(skill.progressions.length, FULL_HOLD_SECONDS);
  const pct = (ladderPosition(step, seconds) / full) * 100;
  return Math.max(0, Math.round(pct * 10) / 10);
}

/** "Advanced Tuck Front Lever + band — 5s" — stored as the entry's note. */
export function describeHold(
  skill: SkillDef,
  progressionKey: string,
  banded: boolean,
  seconds: number,
): string {
  const p = skill.progressions.find((x) => x.key === progressionKey);
  return `${p?.label ?? progressionKey} ${skill.title}${banded ? " + band" : ""} — ${seconds}s`;
}

import type { WizardPlan } from "./types";

export const allInPlan: WizardPlan = {
  health: {
    goals: [
      {
        title: "Bodybuilding contest weight",
        currentValue: 73,
        targetValue: 68,
        unit: "kg",
        targetDate: "2026-07-04",
      },
    ],
    habits: [
      { title: "Train Push", frequency: "WEEKLY", dayOfWeek: [1, 4], checked: true },
      { title: "Train Pull", frequency: "WEEKLY", dayOfWeek: [2, 5], checked: true },
      { title: "Train Upper", frequency: "WEEKLY", dayOfWeek: [3], checked: true },
      { title: "Train Lower", frequency: "WEEKLY", dayOfWeek: [6], checked: true },
      { title: "Sprint session", frequency: "WEEKLY", dayOfWeek: [3], checked: true },
      { title: "Long run", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      { title: "Log meals", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Log body weight", frequency: "DAILY", dayOfWeek: [], checked: true },
    ],
  },
  money: {
    goals: [
      {
        title: "TikTok followers",
        currentValue: 1168,
        targetValue: 10000,
        unit: "followers",
        targetDate: "2026-10-01",
      },
      { title: "Monthly income", currentValue: 0, targetValue: 10000, unit: "PLN/month", targetDate: null },
    ],
    habits: [
      { title: "Create content", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Deep work", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Update follower count", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      { title: "Log weekly income", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      { title: "Review goals", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
    ],
  },
};

export const lifterPlan: WizardPlan = {
  health: {
    goals: [
      { title: "Stage / lean weight", currentValue: 73, targetValue: 68, unit: "kg", targetDate: null },
      { title: "Bench press 1RM", currentValue: 90, targetValue: 110, unit: "kg", targetDate: null },
    ],
    habits: [
      { title: "Train Push", frequency: "WEEKLY", dayOfWeek: [1, 4], checked: true },
      { title: "Train Pull", frequency: "WEEKLY", dayOfWeek: [2, 5], checked: true },
      { title: "Train Legs", frequency: "WEEKLY", dayOfWeek: [3, 6], checked: true },
      { title: "Log meals", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Log body weight", frequency: "DAILY", dayOfWeek: [], checked: true },
    ],
  },
  money: {
    goals: [{ title: "Side income", currentValue: 0, targetValue: 3000, unit: "PLN/month", targetDate: null }],
    habits: [{ title: "Log weekly income", frequency: "WEEKLY", dayOfWeek: [0], checked: true }],
  },
};

export const cutAndBuildPlan: WizardPlan = {
  health: {
    goals: [
      { title: "Cut to lean", currentValue: 82, targetValue: 76, unit: "kg", targetDate: null },
      { title: "Strict pull-ups", currentValue: 8, targetValue: 15, unit: "reps", targetDate: null },
    ],
    habits: [
      { title: "Strength — Upper", frequency: "WEEKLY", dayOfWeek: [1, 4], checked: true },
      { title: "Strength — Lower", frequency: "WEEKLY", dayOfWeek: [2, 5], checked: true },
      { title: "Conditioning", frequency: "WEEKLY", dayOfWeek: [3, 6], checked: true },
      { title: "Log meals", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Log body weight", frequency: "DAILY", dayOfWeek: [], checked: true },
    ],
  },
  money: {
    goals: [{ title: "Monthly income", currentValue: 0, targetValue: 5000, unit: "PLN/month", targetDate: null }],
    habits: [
      { title: "Deep work", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Log weekly income", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
    ],
  },
};

export const contentSprinterPlan: WizardPlan = {
  health: {
    goals: [{ title: "Stay lean", currentValue: 78, targetValue: 75, unit: "kg", targetDate: null }],
    habits: [
      { title: "Train", frequency: "WEEKLY", dayOfWeek: [1, 3, 5], checked: true },
      { title: "Log body weight", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
    ],
  },
  money: {
    goals: [
      { title: "TikTok followers", currentValue: 1000, targetValue: 25000, unit: "followers", targetDate: null },
      { title: "Content income", currentValue: 0, targetValue: 4000, unit: "PLN/month", targetDate: null },
    ],
    habits: [
      { title: "Post content", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Engage with audience", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Batch content", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      { title: "Update follower count", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
    ],
  },
};

export const sideHustlerPlan: WizardPlan = {
  health: {
    goals: [{ title: "Stay consistent in the gym", currentValue: null, targetValue: null, unit: "", targetDate: null }],
    habits: [
      { title: "Train", frequency: "WEEKLY", dayOfWeek: [1, 3, 5], checked: true },
      { title: "Log body weight", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
    ],
  },
  money: {
    goals: [
      { title: "Monthly income", currentValue: 0, targetValue: 10000, unit: "PLN/month", targetDate: null },
      { title: "Paying clients", currentValue: 0, targetValue: 10, unit: "clients", targetDate: null },
    ],
    habits: [
      { title: "Deep work", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Outreach", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Log weekly income", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      { title: "Review pipeline", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
    ],
  },
};

export const triathleteplan: WizardPlan = {
  health: {
    goals: [
      { title: "Complete a race", currentValue: null, targetValue: null, unit: "", targetDate: null },
    ],
    habits: [
      { title: "Swim", frequency: "WEEKLY", dayOfWeek: [1, 4], checked: true },
      { title: "Bike", frequency: "WEEKLY", dayOfWeek: [2, 5], checked: true },
      { title: "Run", frequency: "WEEKLY", dayOfWeek: [3, 6], checked: true },
      { title: "Brick session", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      { title: "Log meals", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Log body weight", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
    ],
  },
  money: {
    goals: [{ title: "Monthly income", currentValue: 0, targetValue: 3000, unit: "PLN/month", targetDate: null }],
    habits: [{ title: "Deep work", frequency: "DAILY", dayOfWeek: [], checked: true }],
  },
};

export function buildAthletePlan(kind: "endurance" | "sport", sportName: string): WizardPlan {
  const name = sportName.trim() || "your sport";
  if (kind === "endurance") {
    return {
      health: {
        goals: [{ title: `${name} performance`, currentValue: null, targetValue: null, unit: "", targetDate: null }],
        habits: [
          { title: `Train ${name}`, frequency: "WEEKLY", dayOfWeek: [1, 3, 5], checked: true },
          { title: "Long session", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
          { title: "Strength", frequency: "WEEKLY", dayOfWeek: [2, 4], checked: true },
          { title: "Log meals", frequency: "DAILY", dayOfWeek: [], checked: true },
          { title: "Log body weight", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
        ],
      },
      money: {
        goals: [{ title: "Monthly income", currentValue: 0, targetValue: 3000, unit: "PLN/month", targetDate: null }],
        habits: [{ title: "Deep work", frequency: "DAILY", dayOfWeek: [], checked: true }],
      },
    };
  }
  return {
    health: {
      goals: [{ title: `${name} performance`, currentValue: null, targetValue: null, unit: "", targetDate: null }],
      habits: [
        { title: `${name} practice`, frequency: "WEEKLY", dayOfWeek: [1, 3, 5], checked: true },
        { title: "Strength training", frequency: "WEEKLY", dayOfWeek: [2, 4], checked: true },
        { title: "Skill work", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
        { title: "Log meals", frequency: "DAILY", dayOfWeek: [], checked: true },
        { title: "Log body weight", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      ],
    },
    money: {
      goals: [{ title: "Monthly income", currentValue: 0, targetValue: 3000, unit: "PLN/month", targetDate: null }],
      habits: [{ title: "Deep work", frequency: "DAILY", dayOfWeek: [], checked: true }],
    },
  };
}

export type ArchetypeId =
  | "lifter"
  | "cutAndBuild"
  | "contentSprinter"
  | "sideHustler"
  | "triathlete"
  | "athlete"
  | "allIn";

export type Archetype = {
  id: ArchetypeId;
  name: string;
  tagline: string;
  blurb: string;
  plan: WizardPlan;
};

export const ARCHETYPES: Archetype[] = [
  {
    id: "lifter",
    name: "The Lifter",
    tagline: "Build the body. Fund it on the side.",
    blurb: "Training is the main character. Income runs quietly in the background.",
    plan: lifterPlan,
  },
  {
    id: "cutAndBuild",
    name: "The Cut-and-Build",
    tagline: "Strip the fat. Stack the muscle.",
    blurb: "Recomp-focused — lean out and get stronger, with a light money goal.",
    plan: cutAndBuildPlan,
  },
  {
    id: "contentSprinter",
    name: "The Content Sprinter",
    tagline: "Post daily. Blow up. Stay shredded.",
    blurb: "Grow the audience first; stay lean enough to be on camera.",
    plan: contentSprinterPlan,
  },
  {
    id: "sideHustler",
    name: "The Side Hustler",
    tagline: "Stack the bag. Train to stay sharp.",
    blurb: "Money is the mission. The gym keeps you disciplined.",
    plan: sideHustlerPlan,
  },
  {
    id: "triathlete",
    name: "The Triathlete",
    tagline: "Swim. Bike. Run. Repeat.",
    blurb: "Three disciplines, one goal. Everything else runs lean.",
    plan: triathleteplan,
  },
  {
    id: "athlete",
    name: "The Athlete",
    tagline: "Train your sport. Chase your standard.",
    blurb: "Sport-first — pick your discipline and build the plan around it.",
    plan: buildAthletePlan("endurance", "your sport"),
  },
  {
    id: "allIn",
    name: "All-In",
    tagline: "Lock in across all four. No excuses.",
    blurb: "Everything at once — body, bag, content, the lot. The full Portion.",
    plan: allInPlan,
  },
];

export const defaultPlan: WizardPlan = allInPlan;

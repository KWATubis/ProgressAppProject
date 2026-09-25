export type Frequency = "DAILY" | "WEEKLY" | "ONE_TIME";

export type WizardGoal = {
  title: string;
  currentValue: number | null;
  targetValue: number | null;
  unit: string;
  targetDate: string | null; // ISO yyyy-mm-dd
  // When set, savePlan wires this goal to a "Calisthenics" activity's custom
  // metric for that skill (creating both if missing) instead of a plain
  // manual goal — so logging a hold moves the goal automatically.
  linkSkill?: "frontLever" | "planche";
};

export type WizardHabit = {
  title: string;
  frequency: Frequency;
  dayOfWeek: number[]; // 0=Sun … 6=Sat
  checked: boolean;
};

export type PillarPlan = {
  goals: WizardGoal[];
  habits: WizardHabit[];
};

export type WizardPlan = {
  health: PillarPlan;
  money: PillarPlan;
};

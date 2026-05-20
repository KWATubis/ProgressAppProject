import type { WizardPlan } from "./types";

export const defaultPlan: WizardPlan = {
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
      { title: "Log 4 meals (2,400 kcal · 180g protein)", frequency: "DAILY", dayOfWeek: [], checked: true },
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
      {
        title: "Monthly income",
        currentValue: 0,
        targetValue: 10000,
        unit: "PLN/month",
        targetDate: null,
      },
    ],
    habits: [
      { title: "Ship 1 piece of content", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Deep work · 2h", frequency: "DAILY", dayOfWeek: [], checked: true },
      { title: "Update follower count", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      { title: "Log weekly income", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
      { title: "Review goal progress", frequency: "WEEKLY", dayOfWeek: [0], checked: true },
    ],
  },
};

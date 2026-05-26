/**
 * Client-safe metric definitions. The server-only helpers that hit Prisma
 * live in `lib/goalMetrics.server.ts` and must never be imported from a
 * client component.
 */

export type Pillar = "HEALTH" | "MONEY";

export type ActivityKind = "STRENGTH" | "CARDIO" | "SPORT" | "SOCIAL" | "SIDE_INCOME" | "MAIN_INCOME" | "BUSINESS";

export type GoalMetric = {
  key: string;
  label: string;
  pillar: Pillar;
  unit: string;
  hint?: string;
  /** When set, the metric is activity-scoped — only meaningful when the goal
   *  is linked to an ActivityType matching one of these kinds. */
  activityKinds?: ActivityKind[];
};

export const GOAL_METRICS: readonly GoalMetric[] = [
  // ---- Health (global) ----
  { key: "body.weightKg", label: "Body weight", pillar: "HEALTH", unit: "kg", hint: "Latest logged weight" },
  { key: "body.bodyFatPct", label: "Body fat %", pillar: "HEALTH", unit: "%", hint: "Latest logged body fat %" },
  { key: "body.waistCm", label: "Waist", pillar: "HEALTH", unit: "cm", hint: "Latest waist measurement" },
  { key: "body.chestCm", label: "Chest", pillar: "HEALTH", unit: "cm", hint: "Latest chest measurement" },
  { key: "body.armCm", label: "Arm", pillar: "HEALTH", unit: "cm", hint: "Latest arm measurement" },
  { key: "body.thighCm", label: "Thigh", pillar: "HEALTH", unit: "cm", hint: "Latest thigh measurement" },
  { key: "tasks.perfectDays", label: "Perfect days", pillar: "HEALTH", unit: "days", hint: "Days where every task was completed" },
  // ---- Money (global) ----
  { key: "social.tiktok.followers", label: "TikTok followers", pillar: "MONEY", unit: "followers" },
  { key: "social.instagram.followers", label: "Instagram followers", pillar: "MONEY", unit: "followers" },
  { key: "social.youtube.followers", label: "YouTube subscribers", pillar: "MONEY", unit: "subs" },
  { key: "income.monthly", label: "This month's income", pillar: "MONEY", unit: "zł", hint: "Sum of income logged this calendar month" },
  { key: "income.total", label: "Total income", pillar: "MONEY", unit: "zł", hint: "Sum of all income entries" },
  // ---- Health (activity-scoped) ----
  { key: "activity.sessions.total", label: "Sessions logged", pillar: "HEALTH", unit: "sessions", hint: "Sessions logged for this activity", activityKinds: ["STRENGTH", "CARDIO", "SPORT"] },
  { key: "activity.cardio.distanceTotal", label: "Distance total", pillar: "HEALTH", unit: "km", hint: "Sum of distance across all runs", activityKinds: ["CARDIO"] },
  // ---- Money (activity-scoped) ----
  { key: "activity.social.followers", label: "Followers", pillar: "MONEY", unit: "followers", hint: "Latest follower count for this activity", activityKinds: ["SOCIAL"] },
  { key: "activity.income.monthly", label: "This month's income", pillar: "MONEY", unit: "zł", hint: "Income logged this month for this activity", activityKinds: ["SOCIAL", "SIDE_INCOME", "MAIN_INCOME", "BUSINESS"] },
  { key: "activity.income.total", label: "Total income", pillar: "MONEY", unit: "zł", hint: "Sum of income for this activity", activityKinds: ["SOCIAL", "SIDE_INCOME", "MAIN_INCOME", "BUSINESS"] },
  { key: "activity.business.clients", label: "Active clients", pillar: "MONEY", unit: "clients", hint: "Latest client count snapshot", activityKinds: ["BUSINESS"] },
  { key: "activity.business.leadsTotal", label: "Leads (total)", pillar: "MONEY", unit: "leads", hint: "Sum of all logged leads", activityKinds: ["BUSINESS"] },
  { key: "activity.business.dealsTotal", label: "Deals closed", pillar: "MONEY", unit: "deals", hint: "Sum of all logged deals", activityKinds: ["BUSINESS"] },
] as const;

export function metricsForActivity(pillar: Pillar, kind: ActivityKind): GoalMetric[] {
  return GOAL_METRICS.filter(
    (m) => m.pillar === pillar && m.activityKinds && m.activityKinds.includes(kind),
  );
}

export function findMetric(key: string | null | undefined): GoalMetric | undefined {
  if (!key) return undefined;
  return GOAL_METRICS.find((m) => m.key === key);
}

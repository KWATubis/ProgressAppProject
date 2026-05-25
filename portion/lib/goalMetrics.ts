/**
 * Client-safe metric definitions. The server-only helpers that hit Prisma
 * live in `lib/goalMetrics.server.ts` and must never be imported from a
 * client component.
 */

export type Pillar = "HEALTH" | "MONEY";

export type GoalMetric = {
  key: string;
  label: string;
  pillar: Pillar;
  unit: string;
  hint?: string;
};

export const GOAL_METRICS: readonly GoalMetric[] = [
  // ---- Health ----
  { key: "body.weightKg", label: "Body weight", pillar: "HEALTH", unit: "kg", hint: "Latest logged weight" },
  { key: "body.bodyFatPct", label: "Body fat %", pillar: "HEALTH", unit: "%", hint: "Latest logged body fat %" },
  { key: "body.waistCm", label: "Waist", pillar: "HEALTH", unit: "cm", hint: "Latest waist measurement" },
  { key: "body.chestCm", label: "Chest", pillar: "HEALTH", unit: "cm", hint: "Latest chest measurement" },
  { key: "body.armCm", label: "Arm", pillar: "HEALTH", unit: "cm", hint: "Latest arm measurement" },
  { key: "body.thighCm", label: "Thigh", pillar: "HEALTH", unit: "cm", hint: "Latest thigh measurement" },
  { key: "tasks.perfectDays", label: "Perfect days", pillar: "HEALTH", unit: "days", hint: "Days where every task was completed" },
  // ---- Money ----
  { key: "social.tiktok.followers", label: "TikTok followers", pillar: "MONEY", unit: "followers" },
  { key: "social.instagram.followers", label: "Instagram followers", pillar: "MONEY", unit: "followers" },
  { key: "social.youtube.followers", label: "YouTube subscribers", pillar: "MONEY", unit: "subs" },
  { key: "income.monthly", label: "This month's income", pillar: "MONEY", unit: "zł", hint: "Sum of income logged this calendar month" },
  { key: "income.total", label: "Total income", pillar: "MONEY", unit: "zł", hint: "Sum of all income entries" },
] as const;

export function findMetric(key: string | null | undefined): GoalMetric | undefined {
  if (!key) return undefined;
  return GOAL_METRICS.find((m) => m.key === key);
}

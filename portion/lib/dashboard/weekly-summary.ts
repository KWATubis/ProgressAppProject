// Server-only: imports Prisma. Powers the dashboard Compounding Week card.
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, getWeekDates, addDays } from "@/lib/utils/dates";
import { isTaskScheduledOn } from "@/lib/utils/tasks";
import { roundKg } from "@/lib/strength";

const DEFAULT_KCAL_TARGET = 2400; // mirrors MACRO_TARGETS in DietLogForm
const KCAL_TOLERANCE = 150; // a day "on target" if within ±150 kcal

export type WeeklyMetricKey =
  | "weight"
  | "kcal"
  | "volume"
  | "followers"
  | "income"
  | "tasks";

export type WeeklyMetric = {
  key: WeeklyMetricKey;
  label: string;
  value: string; // where you are now ("109.4 kg", "82%", "1,210")
  delta: string | null; // how it moved vs the comparison span
  good: boolean | null; // true = a win, false = a slip, null = can't judge yet
};

export type WeeklySummary = {
  weekLabel: string;
  metrics: WeeklyMetric[];
  judged: number; // metrics with a verdict (good !== null)
  good: number; // metrics trending the right way
  scorePct: number; // good / judged, 0–100
  headline: string;
};

function compact(n: number): string {
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    return `${Math.round(k * 10) / 10}k`;
  }
  return `${Math.round(n)}`;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

const sign = (n: number) => (n >= 0 ? "+" : "−");
const noData = (key: WeeklyMetricKey, label: string): WeeklyMetric => ({
  key,
  label,
  value: "—",
  delta: null,
  good: null,
});

function buildHeadline(good: number, judged: number): string {
  if (judged === 0) return "Log a few days this week and your compounding score lands here.";
  if (good === judged) return `Full lock-in — compounding on all ${judged} fronts this week.`;
  if (good === 0) return "Slow week. One log today flips it — never miss twice.";
  if (good / judged >= 0.6) return `You're compounding across ${good} of ${judged} fronts this week.`;
  return `Mixed week — ${good} of ${judged} moving. Pick one to lock in today.`;
}

/**
 * This-week-so-far vs the same span last week, across six fronts. "So far"
 * keeps the comparison fair: Sun→today this week against Sun→same-weekday last
 * week. Latest-snapshot metrics (weight, followers) compare end-of-span values.
 */
export async function computeWeeklySummary(profileId: string): Promise<WeeklySummary> {
  const today = toUtcMidnight();
  const thisStart = getWeekDates(today)[0]; // Sunday of this week
  const dow = today.getUTCDay(); // days elapsed since Sunday (0–6)
  const lastStart = addDays(thisStart, -7);
  const lastEnd = addDays(lastStart, dow); // same weekday last week
  const todayNext = addDays(today, 1);
  const lastEndNext = addDays(lastEnd, 1);

  const thisRange = { gte: thisStart, lt: todayNext };
  const lastRange = { gte: lastStart, lt: lastEndNext };

  const [
    healthGoals,
    weightThisRow,
    weightPrevRow,
    dietThis,
    volThisSets,
    volLastSets,
    follThisRow,
    follPrevRow,
    incThisAgg,
    incLastAgg,
    tasks,
    completeLogs,
  ] = await Promise.all([
    prisma.goal.findMany({
      where: { profileId, isActive: true, pillar: "HEALTH" },
      select: { title: true, unit: true, targetValue: true },
    }),
    prisma.bodyMetric.findFirst({
      where: { profileId, weightKg: { not: null }, date: { lt: todayNext } },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
    prisma.bodyMetric.findFirst({
      where: { profileId, weightKg: { not: null }, date: { lt: thisStart } },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
    prisma.dietLog.findMany({
      where: { profileId, date: thisRange },
      select: { date: true, kcal: true },
    }),
    prisma.exerciseSet.findMany({
      where: { session: { profileId, date: thisRange } },
      select: { weightKg: true, reps: true },
    }),
    prisma.exerciseSet.findMany({
      where: { session: { profileId, date: lastRange } },
      select: { weightKg: true, reps: true },
    }),
    prisma.socialMetric.findFirst({
      where: { profileId, platform: "TIKTOK", date: { lt: todayNext } },
      orderBy: { date: "desc" },
      select: { followerCount: true },
    }),
    prisma.socialMetric.findFirst({
      where: { profileId, platform: "TIKTOK", date: { lt: thisStart } },
      orderBy: { date: "desc" },
      select: { followerCount: true },
    }),
    prisma.incomeEntry.aggregate({ where: { profileId, date: thisRange }, _sum: { amountPln: true } }),
    prisma.incomeEntry.aggregate({ where: { profileId, date: lastRange }, _sum: { amountPln: true } }),
    prisma.task.findMany({
      where: { profileId, isActive: true },
      select: { frequency: true, dayOfWeek: true, scheduledAt: true, isActive: true },
    }),
    prisma.taskLog.findMany({
      where: { profileId, status: "COMPLETE", date: thisRange },
      select: { date: true },
    }),
  ]);

  // --- Weight: latest reading vs last reading before this week ---
  let weight: WeeklyMetric;
  const wThis = weightThisRow?.weightKg ?? null;
  const wPrev = weightPrevRow?.weightKg ?? null;
  if (wThis == null) {
    weight = noData("weight", "Weight");
  } else if (wPrev == null) {
    weight = { key: "weight", label: "Weight", value: `${roundKg(wThis)} kg`, delta: null, good: null };
  } else {
    const delta = wThis - wPrev;
    const goal = healthGoals.find(
      (g) => (g.unit ?? "").toLowerCase().includes("kg") && g.targetValue != null,
    );
    const cutting = goal ? goal.targetValue! < wThis : null;
    weight = {
      key: "weight",
      label: "Weight",
      value: `${roundKg(wThis)} kg`,
      delta: `${sign(delta)}${roundKg(Math.abs(delta))} kg`,
      good: cutting == null ? null : cutting ? delta < 0 : delta > 0,
    };
  }

  // --- Calorie compliance: days within ±150 of target ---
  const kcalGoal = healthGoals.find((g) => {
    const u = (g.unit ?? "").toLowerCase();
    const t = g.title.toLowerCase();
    return g.targetValue != null && (u.includes("kcal") || u.includes("cal") || t.includes("calorie"));
  });
  const kcalTarget = kcalGoal?.targetValue ?? DEFAULT_KCAL_TARGET;
  const kcalByDay = new Map<number, number>();
  for (const d of dietThis) {
    const k = d.date.getTime();
    kcalByDay.set(k, (kcalByDay.get(k) ?? 0) + d.kcal);
  }
  let kcal: WeeklyMetric;
  if (kcalByDay.size === 0) {
    kcal = noData("kcal", "Calories");
  } else {
    let onTarget = 0;
    for (const total of kcalByDay.values()) {
      if (Math.abs(total - kcalTarget) <= KCAL_TOLERANCE) onTarget++;
    }
    const pct = Math.round((onTarget / kcalByDay.size) * 100);
    kcal = {
      key: "kcal",
      label: "Calories",
      value: `${pct}%`,
      delta: `${onTarget}/${kcalByDay.size} on target`,
      good: pct >= 70,
    };
  }

  // --- Workout volume: Σ weight × reps ---
  const sumVol = (rows: { weightKg: number | null; reps: number | null }[]) =>
    rows.reduce((s, r) => s + (r.weightKg && r.reps ? r.weightKg * r.reps : 0), 0);
  const volThis = sumVol(volThisSets);
  const volLast = sumVol(volLastSets);
  let volume: WeeklyMetric;
  if (volThis === 0 && volLast === 0) {
    volume = noData("volume", "Volume");
  } else {
    const delta = volThis - volLast;
    volume = {
      key: "volume",
      label: "Volume",
      value: compact(volThis),
      delta: `${sign(delta)}${compact(Math.abs(delta))}`,
      good: volThis > volLast,
    };
  }

  // --- Followers: latest snapshot vs before this week ---
  let followers: WeeklyMetric;
  const fThis = follThisRow?.followerCount ?? null;
  const fPrev = follPrevRow?.followerCount ?? null;
  if (fThis == null) {
    followers = noData("followers", "Followers");
  } else if (fPrev == null) {
    followers = { key: "followers", label: "Followers", value: fThis.toLocaleString(), delta: null, good: null };
  } else {
    const delta = fThis - fPrev;
    followers = {
      key: "followers",
      label: "Followers",
      value: fThis.toLocaleString(),
      delta: `${sign(delta)}${Math.abs(delta).toLocaleString()}`,
      good: delta > 0,
    };
  }

  // --- Income: Σ this span vs last span ---
  const incThis = incThisAgg._sum.amountPln ?? 0;
  const incLast = incLastAgg._sum.amountPln ?? 0;
  let income: WeeklyMetric;
  if (incThis === 0 && incLast === 0) {
    income = noData("income", "Income");
  } else {
    const delta = incThis - incLast;
    income = {
      key: "income",
      label: "Income",
      value: `${fmtInt(incThis)} zł`,
      delta: `${sign(delta)}${fmtInt(Math.abs(delta))} zł`,
      good: incThis > incLast,
    };
  }

  // --- Task completion: completed / scheduled this span ---
  const countScheduled = (start: Date, endInclusive: Date) => {
    let n = 0;
    for (let d = new Date(start); d <= endInclusive; d = addDays(d, 1)) {
      for (const t of tasks) if (isTaskScheduledOn(t, d)) n++;
    }
    return n;
  };
  const scheduledThis = countScheduled(thisStart, today);
  const completedThis = completeLogs.length;
  let tasksMetric: WeeklyMetric;
  if (scheduledThis === 0) {
    tasksMetric = noData("tasks", "Tasks");
  } else {
    const pct = Math.min(100, Math.round((completedThis / scheduledThis) * 100));
    tasksMetric = {
      key: "tasks",
      label: "Tasks",
      value: `${pct}%`,
      delta: `${completedThis}/${scheduledThis} done`,
      good: pct >= 70,
    };
  }

  const metrics = [weight, kcal, volume, followers, income, tasksMetric];
  const judged = metrics.filter((m) => m.good !== null).length;
  const good = metrics.filter((m) => m.good === true).length;
  const scorePct = judged > 0 ? Math.round((good / judged) * 100) : 0;

  return {
    weekLabel: `Week of ${thisStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`,
    metrics,
    judged,
    good,
    scorePct,
    headline: buildHeadline(good, judged),
  };
}

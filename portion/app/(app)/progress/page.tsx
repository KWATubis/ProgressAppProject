import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate, addDays } from "@/lib/utils/dates";
import { isTaskScheduledOn } from "@/lib/utils/tasks";
import { WeightProgressChart, type WeightDataPoint } from "@/components/charts/WeightProgressChart";
import { MacroChart, type MacroDay } from "@/components/charts/MacroChart";
import { WorkoutVolumeChart, type VolumeWeek } from "@/components/charts/WorkoutVolumeChart";
import { SocialGrowthChart, type FollowerDataPoint } from "@/components/charts/SocialGrowthChart";
import { IncomeChart, type IncomeMonth } from "@/components/charts/IncomeChart";
import { TotalProgressChart, type ProgressPoint } from "@/components/charts/TotalProgressChart";
import { RangeSelector, type Range } from "./RangeSelector";

const RANGE_DAYS: Record<Range, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "all": null,
};

function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return formatISODate(d);
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const range: Range =
    params.range === "7d" || params.range === "30d" || params.range === "90d" || params.range === "all"
      ? params.range
      : "30d";

  const today = toUtcMidnight();
  const days = RANGE_DAYS[range];
  const since = days != null ? addDays(today, -days) : undefined;
  const dateFilter = since ? { gte: since } : undefined;

  const [weightMetrics, dietLogs, workoutSessions, socialMetrics, incomeEntries, goals, allTaskLogs, allTasks, profile] =
    await Promise.all([
      prisma.bodyMetric.findMany({
        where: { profileId: user.id, date: dateFilter, weightKg: { not: null } },
        orderBy: { date: "asc" },
      }),
      prisma.dietLog.findMany({
        where: { profileId: user.id, date: dateFilter },
        orderBy: { date: "asc" },
      }),
      prisma.workoutSession.findMany({
        where: { profileId: user.id, date: dateFilter },
        include: { exercises: true },
        orderBy: { date: "asc" },
      }),
      prisma.socialMetric.findMany({
        where: { profileId: user.id, platform: "TIKTOK", date: dateFilter },
        orderBy: { date: "asc" },
      }),
      prisma.incomeEntry.findMany({
        where: { profileId: user.id, date: dateFilter },
        orderBy: { date: "asc" },
      }),
      prisma.goal.findMany({ where: { profileId: user.id, isActive: true } }),
      // Always all-time for the cumulative score
      prisma.taskLog.findMany({
        where: { profileId: user.id },
        orderBy: { date: "asc" },
        select: { date: true, taskId: true, status: true },
      }),
      prisma.task.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          frequency: true,
          dayOfWeek: true,
          scheduledAt: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.profile.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
    ]);

  // --- Total progress (exponential growth score, every day from start) ---
  // Build a per-day map of task statuses.
  const logsByDate = new Map<string, Map<string, "PENDING" | "COMPLETE" | "SKIPPED">>();
  for (const log of allTaskLogs) {
    const key = formatISODate(log.date);
    let inner = logsByDate.get(key);
    if (!inner) {
      inner = new Map();
      logsByDate.set(key, inner);
    }
    inner.set(log.taskId, log.status);
  }

  // Determine the start day: earliest of (first log date, profile creation, first task creation).
  const candidates: Date[] = [];
  if (allTaskLogs[0]) candidates.push(toUtcMidnight(allTaskLogs[0].date));
  for (const t of allTasks) candidates.push(toUtcMidnight(t.createdAt));
  if (profile?.createdAt) candidates.push(toUtcMidnight(profile.createdAt));
  let startDay = candidates.length > 0 ? new Date(Math.min(...candidates.map((d) => d.getTime()))) : today;
  // Don't run further back than 365 days — keeps the chart readable.
  const earliestAllowed = addDays(today, -365);
  if (startDay < earliestAllowed) startDay = earliestAllowed;

  const progressData: ProgressPoint[] = [];
  let score = 1;
  for (let d = new Date(startDay); d <= today; d = addDays(d, 1)) {
    const iso = formatISODate(d);
    // Count tasks that were scheduled for this day (active OR archived but
    // historically scheduled doesn't track soft-delete history, so we use the
    // current schedule against d, ignoring isActive when d is in the past).
    const scheduledTaskIds = allTasks
      .filter((t) => isTaskScheduledOn({ ...t, isActive: true }, d) && toUtcMidnight(t.createdAt) <= d)
      .map((t) => t.id);

    const statuses = logsByDate.get(iso);
    if (scheduledTaskIds.length === 0) {
      // No tasks scheduled — neutral day, score unchanged.
      progressData.push({ date: iso, score: Number(score.toFixed(4)) });
      continue;
    }

    let missed = 0;
    for (const id of scheduledTaskIds) {
      const s = statuses?.get(id);
      if (s !== "COMPLETE") missed++;
    }

    let multiplier = 1;
    if (missed === 0) multiplier = 1.01; // perfect day → +1%
    else if (missed === 1) multiplier = 1.0; // missed 1 → flat
    else if (missed === 2) multiplier = 0.995; // missed 2 → -0.5%
    else multiplier = 0.99; // missed 3+ → -1%

    score = score * multiplier;
    progressData.push({ date: iso, score: Number(score.toFixed(4)) });
  }

  const currentScore = progressData.length > 0 ? progressData[progressData.length - 1].score : 1;

  // --- Weight ---
  const weightData: WeightDataPoint[] = weightMetrics.map((m) => ({
    date: formatISODate(m.date),
    weightKg: m.weightKg!,
  }));

  // --- Daily calories ---
  const dietByDate = new Map<string, { kcal: number; proteinG: number; fatG: number; carbsG: number }>();
  for (const log of dietLogs) {
    const key = formatISODate(log.date);
    const prev = dietByDate.get(key) ?? { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
    dietByDate.set(key, {
      kcal: prev.kcal + log.kcal,
      proteinG: prev.proteinG + log.proteinG,
      fatG: prev.fatG + log.fatG,
      carbsG: prev.carbsG + log.carbsG,
    });
  }
  const macroData: MacroDay[] = Array.from(dietByDate.entries())
    .map(([date, t]) => ({ date, ...t }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Weekly workout volume ---
  const volumeByWeek = new Map<string, number>();
  for (const session of workoutSessions) {
    const week = mondayOf(session.date);
    let vol = 0;
    for (const set of session.exercises) {
      if (set.reps != null && set.weightKg != null) vol += set.reps * set.weightKg;
    }
    volumeByWeek.set(week, (volumeByWeek.get(week) ?? 0) + vol);
  }
  const volumeData: VolumeWeek[] = Array.from(volumeByWeek.entries())
    .map(([week, volumeKg]) => ({ week, volumeKg }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // --- Followers ---
  const followerData: FollowerDataPoint[] = socialMetrics.map((m) => ({
    date: formatISODate(m.date),
    followerCount: m.followerCount,
  }));

  // --- Monthly income ---
  const incomeByMonth = new Map<string, number>();
  for (const entry of incomeEntries) {
    const month = formatISODate(entry.date).slice(0, 7);
    incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + entry.amountPln);
  }
  const incomeData: IncomeMonth[] = Array.from(incomeByMonth.entries())
    .map(([month, amountPln]) => ({ month, amountPln }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Targets
  const followerGoal = goals.find(
    (g) => g.pillar === "MONEY" && g.unit?.toLowerCase().includes("follower")
  );
  const incomeGoal = goals.find(
    (g) => g.pillar === "MONEY" && (g.unit?.toLowerCase().includes("zł") || g.unit?.toLowerCase().includes("pln"))
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
          <p className="text-sm text-muted-foreground">All your charts in one place.</p>
        </div>
        <RangeSelector current={range} />
      </div>

      {/* Total progress — always all-time, always full width */}
      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Total Progress</p>
          <p className="text-xs text-muted-foreground">
            Compound habit score — perfect days grow it 1%, two misses shave 0.5%,
            three or more shave 1%. Currently <span className="tabular-nums text-foreground">{currentScore.toFixed(2)}</span>.
          </p>
        </div>
        <TotalProgressChart data={progressData} />
      </section>

      <div className="h-px bg-white/8" />

      {/* Health */}
      <section className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Health</p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Weight</p>
            <WeightProgressChart data={weightData} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Daily Calories</p>
            <MacroChart data={macroData} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium">Weekly Workout Volume</p>
            <WorkoutVolumeChart data={volumeData} />
          </div>
        </div>
      </section>

      <div className="h-px bg-white/8" />

      {/* Money */}
      <section className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Money</p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">TikTok Followers</p>
            <SocialGrowthChart data={followerData} target={followerGoal?.targetValue ?? undefined} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Monthly Income</p>
            <IncomeChart data={incomeData} target={incomeGoal?.targetValue ?? undefined} />
          </div>
        </div>
      </section>
    </div>
  );
}

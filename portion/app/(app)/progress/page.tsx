import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate, addDays } from "@/lib/utils/dates";
import { isTaskScheduledOn } from "@/lib/utils/tasks";
import { WeightProgressChart, type WeightDataPoint } from "@/components/charts/WeightProgressChart";
import { MacroChart, type MacroDay } from "@/components/charts/MacroChart";
import { WorkoutVolumeChart, type VolumeWeek } from "@/components/charts/WorkoutVolumeChart";
import { CardioProgressChart, type CardioDataPoint } from "@/components/charts/CardioProgressChart";
import { SocialGrowthChart, type FollowerDataPoint } from "@/components/charts/SocialGrowthChart";
import { IncomeChart, type IncomeMonth } from "@/components/charts/IncomeChart";
import { BusinessMetricsChart, type BusinessMetricPoint } from "@/components/charts/BusinessMetricsChart";
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

  const [
    weightMetrics,
    dietLogs,
    workoutSessions,
    socialMetrics,
    incomeEntries,
    businessMetrics,
    goals,
    allTaskLogs,
    allTasks,
    profile,
    activities,
  ] = await Promise.all([
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
      include: { exercises: true, runs: true },
      orderBy: { date: "asc" },
    }),
    prisma.socialMetric.findMany({
      where: { profileId: user.id, date: dateFilter },
      orderBy: { date: "asc" },
    }),
    prisma.incomeEntry.findMany({
      where: { profileId: user.id, date: dateFilter },
      orderBy: { date: "asc" },
    }),
    prisma.businessMetric.findMany({
      where: { profileId: user.id, date: dateFilter },
      orderBy: { date: "asc" },
    }),
    prisma.goal.findMany({ where: { profileId: user.id, isActive: true } }),
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
    prisma.activityType.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const healthActivities = activities.filter((a) => a.pillar === "HEALTH");
  const moneyActivities = activities.filter((a) => a.pillar === "MONEY");

  // --- Total progress ---
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

  const candidates: Date[] = [];
  if (allTaskLogs[0]) candidates.push(toUtcMidnight(allTaskLogs[0].date));
  for (const t of allTasks) candidates.push(toUtcMidnight(t.createdAt));
  if (profile?.createdAt) candidates.push(toUtcMidnight(profile.createdAt));
  let startDay = candidates.length > 0 ? new Date(Math.min(...candidates.map((d) => d.getTime()))) : today;
  const earliestAllowed = addDays(today, -365);
  if (startDay < earliestAllowed) startDay = earliestAllowed;

  const progressData: ProgressPoint[] = [];
  let score = 1;
  for (let d = new Date(startDay); d <= today; d = addDays(d, 1)) {
    const iso = formatISODate(d);
    const scheduledTaskIds = allTasks
      .filter((t) => isTaskScheduledOn({ ...t, isActive: true }, d) && toUtcMidnight(t.createdAt) <= d)
      .map((t) => t.id);

    const statuses = logsByDate.get(iso);
    const relevantIds = scheduledTaskIds.filter((id) => statuses?.get(id) !== "SKIPPED");
    if (relevantIds.length === 0) {
      progressData.push({ date: iso, score: Number(score.toFixed(4)) });
      continue;
    }

    let missed = 0;
    for (const id of relevantIds) {
      const s = statuses?.get(id);
      if (s !== "COMPLETE") missed++;
    }

    let multiplier = 1;
    if (missed === 0) multiplier = 1.01;
    else if (missed === 1) multiplier = 1.0;
    else {
      const penalty = Math.min((missed - 1) * 0.005, 0.05);
      multiplier = 1 - penalty;
    }

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

  // --- Per-activity health data ---
  const sessionsByActivity = new Map<string, typeof workoutSessions>();
  for (const s of workoutSessions) {
    if (!s.activityTypeId) continue;
    const arr = sessionsByActivity.get(s.activityTypeId) ?? [];
    arr.push(s);
    sessionsByActivity.set(s.activityTypeId, arr);
  }

  function weeklyVolumeData(sessions: typeof workoutSessions): VolumeWeek[] {
    const byWeek = new Map<string, number>();
    for (const s of sessions) {
      const week = mondayOf(s.date);
      let vol = 0;
      for (const set of s.exercises) {
        if (set.reps != null && set.weightKg != null) vol += set.reps * set.weightKg;
      }
      byWeek.set(week, (byWeek.get(week) ?? 0) + vol);
    }
    return Array.from(byWeek.entries())
      .map(([week, volumeKg]) => ({ week, volumeKg }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  function weeklySessionCount(sessions: typeof workoutSessions): VolumeWeek[] {
    const byWeek = new Map<string, number>();
    for (const s of sessions) {
      const week = mondayOf(s.date);
      byWeek.set(week, (byWeek.get(week) ?? 0) + 1);
    }
    return Array.from(byWeek.entries())
      .map(([week, count]) => ({ week, volumeKg: count }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  function cardioSessionData(sessions: typeof workoutSessions): CardioDataPoint[] {
    return sessions
      .map((s) => ({
        date: formatISODate(s.date),
        distanceKm: s.runs.reduce((sum, r) => sum + (r.distanceKm ?? 0), 0),
      }))
      .filter((d) => d.distanceKm > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- Per-activity money data ---
  const socialByActivity = new Map<string, FollowerDataPoint[]>();
  for (const m of socialMetrics) {
    if (!m.activityTypeId) continue;
    const arr = socialByActivity.get(m.activityTypeId) ?? [];
    arr.push({ date: formatISODate(m.date), followerCount: m.followerCount });
    socialByActivity.set(m.activityTypeId, arr);
  }

  const incomeMonthsByActivity = new Map<string, Map<string, number>>();
  for (const e of incomeEntries) {
    if (!e.activityTypeId) continue;
    const monthMap = incomeMonthsByActivity.get(e.activityTypeId) ?? new Map<string, number>();
    const month = formatISODate(e.date).slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + e.amountPln);
    incomeMonthsByActivity.set(e.activityTypeId, monthMap);
  }
  const incomeByActivity = new Map<string, IncomeMonth[]>();
  for (const [actId, monthMap] of incomeMonthsByActivity) {
    incomeByActivity.set(
      actId,
      Array.from(monthMap.entries())
        .map(([month, amountPln]) => ({ month, amountPln }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    );
  }

  const businessByActivity = new Map<string, BusinessMetricPoint[]>();
  for (const m of businessMetrics) {
    const arr = businessByActivity.get(m.activityTypeId) ?? [];
    arr.push({ date: formatISODate(m.date), clients: m.clients, leads: m.leads, deals: m.deals });
    businessByActivity.set(m.activityTypeId, arr);
  }

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

      {/* Total progress */}
      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Total Progress</p>
          <p className="text-xs text-muted-foreground">
            Compound habit score — a perfect day adds 1%; one miss is free; each extra miss shaves
            another 0.5%. Currently{" "}
            <span className="tabular-nums text-foreground">{currentScore.toFixed(2)}</span>.
          </p>
        </div>
        <TotalProgressChart data={progressData} />
      </section>

      <div className="h-px bg-white/8" />

      {/* Health */}
      <section className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Health</p>

        {/* Body metrics — always shown */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Weight</p>
            <WeightProgressChart data={weightData} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Daily Calories</p>
            <MacroChart data={macroData} />
          </div>
        </div>

        {/* Per-activity charts */}
        {healthActivities.length > 0 && (
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
            {healthActivities.map((activity) => {
              const sessions = sessionsByActivity.get(activity.id) ?? [];
              const color = activity.color ?? "#34d399";

              if (activity.kind === "CARDIO") {
                const data = cardioSessionData(sessions);
                return (
                  <div key={activity.id} className="space-y-2">
                    <ActivityChartLabel activity={activity} subtitle="Distance per session" />
                    <CardioProgressChart data={data} />
                  </div>
                );
              }

              if (activity.kind === "SPORT") {
                const data = weeklySessionCount(sessions);
                return (
                  <div key={activity.id} className="space-y-2">
                    <ActivityChartLabel activity={activity} subtitle="Weekly sessions" />
                    <WorkoutVolumeChart data={data} color={color} unit="sess." />
                  </div>
                );
              }

              // STRENGTH (default)
              const data = weeklyVolumeData(sessions);
              return (
                <div key={activity.id} className="space-y-2">
                  <ActivityChartLabel activity={activity} subtitle="Weekly volume" />
                  <WorkoutVolumeChart data={data} color={color} unit="kg" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="h-px bg-white/8" />

      {/* Money */}
      <section className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Money</p>

        {moneyActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No money activities yet — add one to see charts here.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
            {moneyActivities.map((activity) => {
              const actGoal = goals.find((g) => g.activityTypeId === activity.id);
              const color = activity.color ?? "#818cf8";

              if (activity.kind === "SOCIAL") {
                const data = socialByActivity.get(activity.id) ?? [];
                return (
                  <div key={activity.id} className="space-y-2">
                    <ActivityChartLabel activity={activity} subtitle="Follower growth" />
                    <SocialGrowthChart data={data} target={actGoal?.targetValue ?? undefined} color={color} />
                  </div>
                );
              }

              if (activity.kind === "SIDE_INCOME" || activity.kind === "MAIN_INCOME") {
                const data = incomeByActivity.get(activity.id) ?? [];
                return (
                  <div key={activity.id} className="space-y-2">
                    <ActivityChartLabel activity={activity} subtitle="Monthly income" />
                    <IncomeChart data={data} target={actGoal?.targetValue ?? undefined} color={color} />
                  </div>
                );
              }

              if (activity.kind === "BUSINESS") {
                const data = businessByActivity.get(activity.id) ?? [];
                return (
                  <div key={activity.id} className="space-y-2 md:col-span-2">
                    <ActivityChartLabel activity={activity} subtitle="Business metrics" />
                    <BusinessMetricsChart data={data} />
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ActivityChartLabel({
  activity,
  subtitle,
}: {
  activity: { name: string; icon: string | null; color: string | null };
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {activity.color && (
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: activity.color }}
        />
      )}
      <p className="text-sm font-medium">
        {activity.icon && <span className="mr-1">{activity.icon}</span>}
        {activity.name}
      </p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

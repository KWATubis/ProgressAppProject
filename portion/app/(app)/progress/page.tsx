import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate, addDays } from "@/lib/utils/dates";
import { WeightProgressChart, type WeightDataPoint } from "@/components/charts/WeightProgressChart";
import { MacroChart, type MacroDay } from "@/components/charts/MacroChart";
import { WorkoutVolumeChart, type VolumeWeek } from "@/components/charts/WorkoutVolumeChart";
import { SocialGrowthChart, type FollowerDataPoint } from "@/components/charts/SocialGrowthChart";
import { IncomeChart, type IncomeMonth } from "@/components/charts/IncomeChart";
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

  const [weightMetrics, dietLogs, workoutSessions, socialMetrics, incomeEntries, goals] =
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
        where: { profileId: user.id, platform: "TikTok", date: dateFilter },
        orderBy: { date: "asc" },
      }),
      prisma.incomeEntry.findMany({
        where: { profileId: user.id, date: dateFilter },
        orderBy: { date: "asc" },
      }),
      prisma.goal.findMany({
        where: { profileId: user.id, isActive: true },
      }),
    ]);

  // Weight
  const weightData: WeightDataPoint[] = weightMetrics.map((m) => ({
    date: formatISODate(m.date),
    weightKg: m.weightKg!,
  }));

  // Calories per day
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

  // Workout volume per week (reps × weightKg summed per set)
  const volumeByWeek = new Map<string, number>();
  for (const session of workoutSessions) {
    const week = mondayOf(session.date);
    let sessionVol = 0;
    for (const set of session.exercises) {
      if (set.reps != null && set.weightKg != null) {
        sessionVol += set.reps * set.weightKg;
      }
    }
    volumeByWeek.set(week, (volumeByWeek.get(week) ?? 0) + sessionVol);
  }
  const volumeData: VolumeWeek[] = Array.from(volumeByWeek.entries())
    .map(([week, volumeKg]) => ({ week, volumeKg }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // Followers
  const followerData: FollowerDataPoint[] = socialMetrics.map((m) => ({
    date: formatISODate(m.date),
    followerCount: m.followerCount,
  }));

  // Income per month
  const incomeByMonth = new Map<string, number>();
  for (const entry of incomeEntries) {
    const month = formatISODate(entry.date).slice(0, 7); // YYYY-MM
    incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + entry.amountPln);
  }
  const incomeData: IncomeMonth[] = Array.from(incomeByMonth.entries())
    .map(([month, amountPln]) => ({ month, amountPln }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Targets from goals
  const followerGoal = goals.find(
    (g) => g.pillar === "MONEY" && g.unit?.toLowerCase().includes("follower")
  );
  const incomeGoal = goals.find(
    (g) => g.pillar === "MONEY" && (g.unit?.toLowerCase().includes("zł") || g.unit?.toLowerCase().includes("pln"))
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
          <p className="text-sm text-muted-foreground">All your charts in one place.</p>
        </div>
        <RangeSelector current={range} />
      </div>

      {/* Health */}
      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Health
        </h2>

        <div className="space-y-2">
          <p className="text-sm font-medium">Weight</p>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <WeightProgressChart data={weightData} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Daily Calories</p>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <MacroChart data={macroData} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Weekly Workout Volume</p>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <WorkoutVolumeChart data={volumeData} />
          </div>
        </div>
      </section>

      {/* Money */}
      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Money
        </h2>

        <div className="space-y-2">
          <p className="text-sm font-medium">TikTok Followers</p>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <SocialGrowthChart
              data={followerData}
              target={followerGoal?.targetValue ?? undefined}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Monthly Income</p>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <IncomeChart
              data={incomeData}
              target={incomeGoal?.targetValue ?? undefined}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

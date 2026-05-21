import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate, addDays } from "@/lib/utils/dates";
import { WeightProgressChart, type WeightDataPoint } from "@/components/charts/WeightProgressChart";
import { MacroChart, type MacroDay } from "@/components/charts/MacroChart";
import { WorkoutSessionCard, type WorkoutSessionSummary } from "@/components/health/WorkoutSessionCard";

export default async function HealthOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = toUtcMidnight();
  const thirtyDaysAgo = addDays(today, -30);
  const sevenDaysAgo = addDays(today, -7);

  const [recentSessions, weightMetrics, dietLogs] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
      take: 5,
      include: { exercises: true },
    }),
    prisma.bodyMetric.findMany({
      where: {
        profileId: user.id,
        date: { gte: thirtyDaysAgo },
        weightKg: { not: null },
      },
      orderBy: { date: "asc" },
    }),
    prisma.dietLog.findMany({
      where: { profileId: user.id, date: { gte: sevenDaysAgo } },
    }),
  ]);

  const sessionSummaries: WorkoutSessionSummary[] = recentSessions.map((s) => ({
    id: s.id,
    date: s.date,
    type: s.type,
    exerciseCount: new Set(s.exercises.map((e) => e.exerciseId)).size,
    totalSets: s.exercises.length,
  }));

  const weightData: WeightDataPoint[] = weightMetrics.map((m) => ({
    date: formatISODate(m.date),
    weightKg: m.weightKg!,
  }));

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
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Recent Workouts</h2>
          <Link
            href="/health/workout"
            className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {sessionSummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
        ) : (
          <div className="space-y-2">
            {sessionSummaries.map((s) => (
              <WorkoutSessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Weight — Last 30 Days</h2>
          <Link
            href="/health/metrics"
            className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            All metrics <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <WeightProgressChart data={weightData} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Calories — Last 7 Days</h2>
          <Link
            href="/health/diet"
            className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Diet log <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <MacroChart data={macroData} />
        </div>
      </section>
    </div>
  );
}

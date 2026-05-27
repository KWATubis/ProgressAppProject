import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate, addDays } from "@/lib/utils/dates";
import { WeightProgressChart, type WeightDataPoint } from "@/components/charts/WeightProgressChart";
import { MacroChart, type MacroDay } from "@/components/charts/MacroChart";
import { WellnessTodayCards } from "@/components/health/WellnessTodayCards";
import { GarminSyncButton } from "@/components/health/GarminSyncButton";
import { BodyExplorer } from "@/components/body/BodyExplorer";
import { MUSCLE_GROUPS, type MuscleGroup, type MuscleState } from "@/lib/body/muscle-state";
import { getMuscleStates } from "@/lib/body/muscle-state.server";

export default async function HealthOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = toUtcMidnight();
  const thirtyDaysAgo = addDays(today, -30);
  const sevenDaysAgo = addDays(today, -7);

  const [weightMetrics, dietLogs, dietToday, wellnessToday, wellnessTrend, muscleStateList] =
    await Promise.all([
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
      prisma.dietLog.findMany({
        where: { profileId: user.id, date: today },
      }),
      prisma.wellnessDay.findUnique({
        where: { profileId_date: { profileId: user.id, date: today } },
      }),
      prisma.wellnessDay.findMany({
        where: { profileId: user.id, date: { gte: sevenDaysAgo } },
        orderBy: { date: "asc" },
      }),
      getMuscleStates(user.id),
    ]);

  const muscleStates = MUSCLE_GROUPS.reduce(
    (acc, g) => {
      const found = muscleStateList.find((s) => s.group === g);
      acc[g] = found ?? { group: g, daysSince: null, lastTrainedISO: null, lastSets: [] };
      return acc;
    },
    {} as Record<MuscleGroup, MuscleState>,
  );

  const wellnessTrendPoints = wellnessTrend.map((w) => ({
    date: formatISODate(w.date),
    restingHeartRate: w.restingHeartRate,
    totalCalories: w.totalCalories,
    sleepSeconds: w.sleepSeconds,
    deepSleepSeconds: w.deepSleepSeconds,
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

  const intakeKcalToday = dietToday.reduce((sum, m) => sum + m.kcal, 0);

  const hrSamples = (wellnessToday?.hrSamples ?? null) as
    | Array<[number, number | null]>
    | null;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Today</h2>
          <GarminSyncButton
            days={7}
            lastSyncedAt={wellnessToday?.syncedAt?.toISOString() ?? null}
          />
        </div>
        <WellnessTodayCards
          hr={{
            resting: wellnessToday?.restingHeartRate ?? null,
            min: wellnessToday?.minHeartRate ?? null,
            max: wellnessToday?.maxHeartRate ?? null,
            samples: hrSamples,
          }}
          sleep={{
            totalSeconds: wellnessToday?.sleepSeconds ?? null,
            deepSeconds: wellnessToday?.deepSleepSeconds ?? null,
            lightSeconds: wellnessToday?.lightSleepSeconds ?? null,
            remSeconds: wellnessToday?.remSleepSeconds ?? null,
            awakeSeconds: wellnessToday?.awakeSleepSeconds ?? null,
          }}
          calories={{
            total: wellnessToday?.totalCalories ?? null,
            active: wellnessToday?.activeCalories ?? null,
            resting: wellnessToday?.restingCalories ?? null,
          }}
          balance={{
            intakeKcal: intakeKcalToday,
            burnedKcal: wellnessToday?.totalCalories ?? null,
          }}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Your body</h2>
        </div>
        <BodyExplorer
          muscleStates={muscleStates}
          wellnessTrend={wellnessTrendPoints}
        />
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

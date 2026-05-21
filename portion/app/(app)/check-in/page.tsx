import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate } from "@/lib/utils/dates";
import { isTaskScheduledOn } from "@/lib/utils/tasks";
import { DailyCheckInPage } from "@/components/checkin/DailyCheckInPage";
import type { TodayTask } from "@/components/dashboard/TodayTaskList";
import type { Meal } from "@/components/checkin/DietLogForm";
import type { MetricValues } from "@/components/checkin/BodyMetricForm";

export default async function CheckInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = toUtcMidnight();
  const todayISO = formatISODate(today);

  const [tasks, logsToday, dietToday, metricToday, activityTypes] = await Promise.all([
    prisma.task.findMany({
      where: { profileId: user.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.taskLog.findMany({ where: { profileId: user.id, date: today } }),
    prisma.dietLog.findMany({ where: { profileId: user.id, date: today }, orderBy: { createdAt: "asc" } }),
    prisma.bodyMetric.findUnique({
      where: { profileId_date: { profileId: user.id, date: today } },
    }),
    prisma.activityType.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true, icon: true, kind: true },
    }),
  ]);

  const logByTaskId = new Map(logsToday.map((l) => [l.taskId, l.status]));
  const todayTasks: TodayTask[] = tasks
    .filter((t) => isTaskScheduledOn(t, today))
    .map((t) => ({
      id: t.id,
      title: t.title,
      pillar: t.pillar,
      status: logByTaskId.get(t.id) ?? "PENDING",
    }));

  const meals: Meal[] = dietToday.map((m) => ({
    id: m.id,
    slot: m.slot,
    name: m.name,
    kcal: m.kcal,
    proteinG: m.proteinG,
    fatG: m.fatG,
    carbsG: m.carbsG,
  }));

  const metric: MetricValues = {
    weightKg: metricToday?.weightKg ?? null,
    bodyFatPct: metricToday?.bodyFatPct ?? null,
    chestCm: metricToday?.chestCm ?? null,
    waistCm: metricToday?.waistCm ?? null,
    hipsCm: metricToday?.hipsCm ?? null,
    armCm: metricToday?.armCm ?? null,
    thighCm: metricToday?.thighCm ?? null,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily check-in</h1>
        <p className="text-sm text-muted-foreground">
          {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>
      <DailyCheckInPage
        dateISO={todayISO}
        tasks={todayTasks}
        meals={meals}
        metric={metric}
        activityTypes={activityTypes}
      />
    </div>
  );
}

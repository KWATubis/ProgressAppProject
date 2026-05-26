import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate } from "@/lib/utils/dates";
import { isTaskScheduledOn } from "@/lib/utils/tasks";
import { DashboardPillarCard, type PillarGoal } from "@/components/dashboard/DashboardPillarCard";
import { TodayTaskList, type TodayTask } from "@/components/dashboard/TodayTaskList";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { withDerivedCurrent } from "@/lib/goalMetrics.server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = toUtcMidnight();
  const todayISO = formatISODate(today);

  const [profile, rawGoals, tasks, logsToday, latestWeight, dietToday, latestSocial] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { name: true, email: true } }),
    prisma.goal.findMany({
      where: { profileId: user.id, isActive: true, activityTypeId: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: { profileId: user.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { activityType: { select: { color: true } } },
    }),
    prisma.taskLog.findMany({ where: { profileId: user.id, date: today } }),
    prisma.bodyMetric.findFirst({
      where: { profileId: user.id, weightKg: { not: null } },
      orderBy: { date: "desc" },
    }),
    prisma.dietLog.findMany({ where: { profileId: user.id, date: today } }),
    prisma.socialMetric.findFirst({
      where: { profileId: user.id, platform: "TIKTOK" },
      orderBy: { date: "desc" },
    }),
  ]);

  const goals = await withDerivedCurrent(rawGoals);

  const todayTasks = tasks.filter((t) => isTaskScheduledOn(t, today));
  const logByTaskId = new Map(logsToday.map((l) => [l.taskId, l.status]));

  const todayItems: TodayTask[] = todayTasks.map((t) => ({
    id: t.id,
    title: t.title,
    pillar: t.pillar,
    status: logByTaskId.get(t.id) ?? "PENDING",
    activityColor: t.activityType?.color ?? null,
  }));

  function pillarSlice(pillar: "HEALTH" | "MONEY") {
    const ts = todayTasks.filter((t) => t.pillar === pillar);
    const completed = ts.filter((t) => logByTaskId.get(t.id) === "COMPLETE").length;
    const pillarGoals: PillarGoal[] = goals
      .filter((g) => g.pillar === pillar)
      .map((g) => ({
        id: g.id,
        title: g.title,
        currentValue: g.currentValue,
        targetValue: g.targetValue,
        startValue: g.startValue,
        unit: g.unit,
        targetDate: g.targetDate ? formatISODate(g.targetDate) : null,
      }));
    return { goals: pillarGoals, totalTasks: ts.length, completedTasks: completed };
  }

  const health = pillarSlice("HEALTH");
  const money = pillarSlice("MONEY");

  const kcalToday = dietToday.reduce((sum, m) => sum + m.kcal, 0);
  const proteinToday = dietToday.reduce((sum, m) => sum + m.proteinG, 0);

  const weightGoal = goals.find(
    (g) => g.pillar === "HEALTH" && (g.unit ?? "").toLowerCase().includes("kg"),
  );
  const tiktokGoal = goals.find(
    (g) => g.pillar === "MONEY" && (g.unit ?? "").toLowerCase().includes("follower"),
  );

  const greetingName = profile?.name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greetingName ? `Good to see you, ${greetingName}.` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {today.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <QuickStats
        stats={[
          {
            icon: "weight",
            label: "Weight",
            value: latestWeight?.weightKg ? `${latestWeight.weightKg} kg` : "—",
            sub: weightGoal?.targetValue ? `Target ${weightGoal.targetValue} kg` : undefined,
          },
          {
            icon: "kcal",
            label: "Today",
            value: kcalToday ? `${kcalToday} kcal` : "—",
            sub: proteinToday ? `${Math.round(proteinToday)} g protein` : "No meals logged",
          },
          {
            icon: "followers",
            label: "TikTok",
            value: latestSocial?.followerCount?.toLocaleString() ?? "—",
            sub: tiktokGoal?.targetValue
              ? `Target ${tiktokGoal.targetValue.toLocaleString()}`
              : undefined,
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardPillarCard pillar="HEALTH" {...health} />
        <DashboardPillarCard pillar="MONEY" {...money} />
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Today</h2>
          <div className="text-xs text-muted-foreground">
            {todayItems.filter((t) => t.status === "COMPLETE").length}/{todayItems.length} complete
          </div>
        </div>
        <TodayTaskList initial={todayItems} dateISO={todayISO} />
      </section>
    </div>
  );
}

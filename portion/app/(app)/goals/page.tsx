import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  GoalsManager,
  type GoalView,
  type CustomMetricOption,
} from "@/components/goals/GoalsManager";
import { withDerivedCurrent } from "@/lib/goalMetrics.server";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const goals = await prisma.goal.findMany({
    where: { profileId: user.id },
    orderBy: [{ pillar: "asc" }, { isActive: "desc" }, { createdAt: "asc" }],
  });
  const refreshed = await withDerivedCurrent(goals);

  const views: GoalView[] = refreshed.map((g) => ({
    id: g.id,
    pillar: g.pillar,
    title: g.title,
    description: g.description,
    currentValue: g.currentValue,
    targetValue: g.targetValue,
    startValue: g.startValue,
    unit: g.unit,
    targetDate: g.targetDate ? g.targetDate.toISOString().slice(0, 10) : null,
    isActive: g.isActive,
    metricKey: g.metricKey,
    customMetricId: g.customMetricId,
  }));

  const customMetrics: CustomMetricOption[] = (
    await prisma.customMetric.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: "desc" },
      include: { activityType: { select: { name: true, pillar: true } } },
    })
  ).map((m) => ({
    id: m.id,
    title: m.title,
    unit: m.unit,
    aggregation: m.aggregation,
    direction: m.direction,
    activityName: m.activityType.name,
    pillar: m.activityType.pillar,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground">
          Add, edit, or archive the goals driving your Health and Money pillars.
        </p>
      </div>

      <GoalsManager initialGoals={views} customMetrics={customMetrics} />
    </div>
  );
}

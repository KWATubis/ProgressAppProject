import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  GoalsManager,
  type GoalView,
  type CustomMetricOption,
} from "@/components/goals/GoalsManager";
import { withDerivedCurrent } from "@/lib/goalMetrics.server";
import { PageHeading } from "@/components/layout/PageHeading";
import { Reveal } from "@/components/motion/Reveal";

export default async function GoalsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const [refreshed, rawCustomMetrics] = await Promise.all([
    prisma.goal
      .findMany({
        where: { profileId: user.id },
        orderBy: [{ pillar: "asc" }, { isActive: "desc" }, { createdAt: "asc" }],
      })
      .then(withDerivedCurrent),
    prisma.customMetric.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: "desc" },
      include: { activityType: { select: { name: true, pillar: true } } },
    }),
  ]);

  const views: GoalView[] = refreshed.map((g) => ({
    id: g.id,
    pillar: g.pillar,
    title: g.title,
    description: g.description,
    whyStatement: g.whyStatement,
    currentValue: g.currentValue,
    targetValue: g.targetValue,
    startValue: g.startValue,
    unit: g.unit,
    targetDate: g.targetDate ? g.targetDate.toISOString().slice(0, 10) : null,
    isActive: g.isActive,
    metricKey: g.metricKey,
    customMetricId: g.customMetricId,
  }));

  const customMetrics: CustomMetricOption[] = rawCustomMetrics.map((m) => ({
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
      <PageHeading
        title="Goals"
        description="Add, edit, or archive the goals driving your Health and Money pillars."
      />

      <Reveal delay={0.08}>
        <GoalsManager initialGoals={views} customMetrics={customMetrics} />
      </Reveal>
    </div>
  );
}

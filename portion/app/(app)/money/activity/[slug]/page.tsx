import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatISODate } from "@/lib/utils/dates";
import { SocialGrowthChart, type FollowerDataPoint } from "@/components/charts/SocialGrowthChart";
import { IncomeChart, type IncomeMonth } from "@/components/charts/IncomeChart";
import { SocialMetricForm } from "@/components/money/SocialMetricForm";
import { IncomeForm } from "@/components/money/IncomeForm";
import { IncomeList, type IncomeRow } from "@/components/money/IncomeList";
import { DeleteActivityButton } from "@/components/health/DeleteActivityButton";
import { EditActivityButton } from "@/components/activities/EditActivityButton";
import { ActivityGoalCard, type ActivityGoalData } from "@/components/activities/ActivityGoalCard";
import { CustomMetricsPanel } from "@/components/metrics/CustomMetricsPanel";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { BusinessMetricForm } from "@/components/money/BusinessMetricForm";
import { BusinessMetricsChart, type BusinessMetricPoint } from "@/components/charts/BusinessMetricsChart";
import { withDerivedCurrent, loadActivityCustomMetrics } from "@/lib/goalMetrics.server";
import type { ActivityKind } from "@/lib/goalMetrics";

export default async function MoneyActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { slug } = await params;

  const activity = await prisma.activityType.findUnique({
    where: { profileId_slug: { profileId: user.id, slug } },
  });
  if (!activity || activity.pillar !== "MONEY") notFound();

  const rawActivityGoals = await prisma.goal.findMany({
    where: { profileId: user.id, activityTypeId: activity.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const activityGoals = await withDerivedCurrent(rawActivityGoals);
  const rawActivityGoal = activityGoals[0] ?? null;
  const activityGoal: ActivityGoalData | null = rawActivityGoal
    ? {
        id: rawActivityGoal.id,
        title: rawActivityGoal.title,
        description: rawActivityGoal.description,
        currentValue: rawActivityGoal.currentValue,
        targetValue: rawActivityGoal.targetValue,
        startValue: rawActivityGoal.startValue,
        unit: rawActivityGoal.unit,
        metricKey: rawActivityGoal.metricKey,
        customMetricId: rawActivityGoal.customMetricId,
        targetDate: rawActivityGoal.targetDate ? formatISODate(rawActivityGoal.targetDate) : null,
      }
    : null;

  const customMetricViews = await loadActivityCustomMetrics(user.id, activity.id);
  const customMetrics = customMetricViews.map((m) => ({
    id: m.id,
    title: m.title,
    unit: m.unit,
    aggregation: m.aggregation,
    direction: m.direction,
  }));

  const goalCard = (
    <ActivityGoalCard
      goal={activityGoal}
      activityTypeId={activity.id}
      activityName={activity.name}
      pillar="MONEY"
      kind={activity.kind as ActivityKind}
      color={activity.color}
      customMetrics={customMetrics}
    />
  );

  const metricsPanel = (
    <CustomMetricsPanel
      activityTypeId={activity.id}
      metrics={customMetricViews}
      color={activity.color}
    />
  );

  const header = (
    <div className="flex items-start justify-between gap-2">
      <h2 className="flex items-center gap-2.5 text-xl font-semibold">
        {activity.color && (
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: activity.color }}
            aria-hidden
          />
        )}
        {activity.icon && <span>{activity.icon}</span>}
        {activity.name}
      </h2>
      <div className="flex items-center gap-2">
        <AddTaskDialog activityTypeId={activity.id} lockedPillar="MONEY" />
        <EditActivityButton
          slug={activity.slug}
          name={activity.name}
          icon={activity.icon}
          color={activity.color}
        />
        <DeleteActivityButton slug={activity.slug} activityName={activity.name} pillar="MONEY" />
      </div>
    </div>
  );

  // ─── SOCIAL ────────────────────────────────────────────────────────────────
  if (activity.kind === "SOCIAL") {
    const platformKey = activity.slug.toUpperCase();
    const [goals, metrics] = await Promise.all([
      prisma.goal.findMany({
        where: { profileId: user.id, pillar: "MONEY", isActive: true },
      }),
      prisma.socialMetric.findMany({
        where: {
          profileId: user.id,
          OR: [{ activityTypeId: activity.id }, { platform: platformKey, activityTypeId: null }],
        },
        orderBy: { date: "asc" },
      }),
    ]);

    const followerGoal = goals.find((g) => (g.unit ?? "").toLowerCase().includes("follower"));
    const chartData: FollowerDataPoint[] = metrics.map((m) => ({
      date: formatISODate(m.date),
      followerCount: m.followerCount,
    }));
    const history = [...metrics].reverse();
    const latest = history[0]?.followerCount;

    return (
      <div className="space-y-6">
        {header}
        {goalCard}
        {metricsPanel}

        {latest != null && (
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{latest.toLocaleString()}</p>
              <p className="text-muted-foreground">followers</p>
            </div>
            {history.length > 1 && (
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {(history[0].followerCount - history[history.length - 1].followerCount).toLocaleString()}
                </p>
                <p className="text-muted-foreground">gained all-time</p>
              </div>
            )}
          </div>
        )}

        <section className="space-y-3">
          <h3 className="text-base font-semibold">Log follower count</h3>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <SocialMetricForm platform={platformKey} activityTypeId={activity.id} />
          </div>
        </section>

        {chartData.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-base font-semibold">Growth</h3>
            <div className="rounded-lg border border-white/10 bg-card p-4">
              <SocialGrowthChart data={chartData} target={followerGoal?.targetValue ?? null} />
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-base font-semibold">History</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No follower counts logged yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Followers</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Videos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {history.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {m.date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {m.followerCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {m.videoCount != null ? m.videoCount.toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ─── INCOME-LIKE KINDS (SIDE_INCOME / MAIN_INCOME / BUSINESS) ───────────────
  const labelByKind: Record<string, { entryWord: string; submitLabel: string; descLabel: string }> = {
    SIDE_INCOME: { entryWord: "shift", submitLabel: "Log shift", descLabel: "Notes" },
    MAIN_INCOME: { entryWord: "paycheck", submitLabel: "Log paycheck", descLabel: "Notes" },
    BUSINESS: { entryWord: "deal", submitLabel: "Log deal", descLabel: "Client / notes" },
  };
  const cfg = labelByKind[activity.kind] ?? { entryWord: "entry", submitLabel: "Log entry", descLabel: "Notes" };

  const [goals, entries, businessMetrics] = await Promise.all([
    prisma.goal.findMany({
      where: { profileId: user.id, pillar: "MONEY", isActive: true },
    }),
    prisma.incomeEntry.findMany({
      where: { profileId: user.id, activityTypeId: activity.id },
      orderBy: { date: "desc" },
    }),
    activity.kind === "BUSINESS"
      ? prisma.businessMetric.findMany({
          where: { profileId: user.id, activityTypeId: activity.id },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([] as { id: string; date: Date; clients: number | null; leads: number | null; deals: number | null }[]),
  ]);

  const businessPoints: BusinessMetricPoint[] = businessMetrics.map((m) => ({
    date: formatISODate(m.date),
    clients: m.clients,
    leads: m.leads,
    deals: m.deals,
  }));
  const latestBusiness = businessMetrics[businessMetrics.length - 1];

  const incomeGoal = goals.find(
    (g) => (g.unit ?? "").toLowerCase().includes("pln") || (g.unit ?? "").toLowerCase().includes("month"),
  );

  const total = entries.reduce((sum, e) => sum + e.amountPln, 0);
  const now = new Date();
  const thisMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const thisMonthTotal = entries
    .filter((e) => `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, "0")}` === thisMonthKey)
    .reduce((sum, e) => sum + e.amountPln, 0);

  const byMonth = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + e.amountPln);
  }
  const monthData: IncomeMonth[] = Array.from(byMonth.entries())
    .map(([month, amountPln]) => ({ month, amountPln }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const rows: IncomeRow[] = entries.map((e) => ({
    id: e.id,
    date: formatISODate(e.date),
    source: e.source,
    amountPln: e.amountPln,
    description: e.description,
  }));

  return (
    <div className="space-y-6">
      {header}
      {goalCard}
      {metricsPanel}

      {entries.length > 0 && (
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{total.toLocaleString()} zł</p>
            <p className="text-muted-foreground">total all-time</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{thisMonthTotal.toLocaleString()} zł</p>
            <p className="text-muted-foreground">this month</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{entries.length}</p>
            <p className="text-muted-foreground">{cfg.entryWord}s logged</p>
          </div>
        </div>
      )}

      {activity.kind === "BUSINESS" && latestBusiness && (
        <div className="flex flex-wrap gap-6 text-sm">
          {latestBusiness.clients != null && (
            <div>
              <p className="text-2xl font-semibold tabular-nums">{latestBusiness.clients}</p>
              <p className="text-muted-foreground">clients</p>
            </div>
          )}
          {latestBusiness.leads != null && (
            <div>
              <p className="text-2xl font-semibold tabular-nums">{latestBusiness.leads}</p>
              <p className="text-muted-foreground">leads (latest)</p>
            </div>
          )}
          {latestBusiness.deals != null && (
            <div>
              <p className="text-2xl font-semibold tabular-nums">{latestBusiness.deals}</p>
              <p className="text-muted-foreground">deals (latest)</p>
            </div>
          )}
        </div>
      )}

      {activity.kind === "BUSINESS" && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Log clients / leads / deals</h3>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <BusinessMetricForm activityTypeId={activity.id} />
          </div>
        </section>
      )}

      {activity.kind === "BUSINESS" && businessPoints.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Pipeline over time</h3>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <BusinessMetricsChart data={businessPoints} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{cfg.submitLabel}</h3>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <IncomeForm
            activityTypeId={activity.id}
            activityName={activity.name}
            submitLabel={cfg.submitLabel}
            descriptionLabel={cfg.descLabel}
          />
        </div>
      </section>

      {monthData.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Monthly</h3>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <IncomeChart data={monthData} target={incomeGoal?.targetValue ?? null} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-semibold">History</h3>
        <IncomeList entries={rows} />
      </section>
    </div>
  );
}

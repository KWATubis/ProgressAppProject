import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CardioProgressChart, type CardioDataPoint } from "@/components/charts/CardioProgressChart";
import { PlanSection } from "@/components/health/PlanSection";
import { GarminUploadButton } from "@/components/health/GarminUploadButton";
import { CardioSessionCard, type CardioSessionView } from "@/components/health/CardioSessionCard";
import { DeleteActivityButton } from "@/components/health/DeleteActivityButton";
import { EditActivityButton } from "@/components/activities/EditActivityButton";
import { ActivityGoalCard, type ActivityGoalData } from "@/components/activities/ActivityGoalCard";
import { CustomMetricsPanel } from "@/components/metrics/CustomMetricsPanel";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { withDerivedCurrent, loadActivityCustomMetrics } from "@/lib/goalMetrics.server";
import { formatISODate } from "@/lib/utils/dates";
import type { ActivityKind } from "@/lib/goalMetrics";

function paceStr(secPerKm: number) {
  return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, "0")}`;
}

export default async function ActivityPage({
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
    include: {
      workoutPlan: {
        include: {
          days: {
            orderBy: { sortOrder: "asc" },
            include: { exercises: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });
  if (!activity) notFound();

  const sessions = await prisma.workoutSession.findMany({
    where: { profileId: user.id, activityTypeId: activity.id },
    orderBy: { date: "desc" },
    include: {
      exercises: { include: { exercise: true } },
      runs: { include: { laps: { orderBy: { lapIndex: "asc" } } } },
    },
  });

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
      pillar="HEALTH"
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
        {activity.kind === "CARDIO" && <GarminUploadButton />}
        <Link href="/check-in">
          <Button size="sm">Log session</Button>
        </Link>
        <AddTaskDialog activityTypeId={activity.id} lockedPillar="HEALTH" />
        <EditActivityButton
          slug={activity.slug}
          name={activity.name}
          icon={activity.icon}
          color={activity.color}
        />
        <DeleteActivityButton slug={activity.slug} activityName={activity.name} pillar="HEALTH" />
      </div>
    </div>
  );

  // ─── STRENGTH ───────────────────────────────────────────────────────────────
  if (activity.kind === "STRENGTH") {
    const planInitial = activity.workoutPlan
      ? {
          name: activity.workoutPlan.name,
          days: activity.workoutPlan.days.map((d) => ({
            label: d.label,
            exercises: d.exercises.map((ex) => ({
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              metric: ex.metric,
              targetSets: ex.targetSets,
              repRange: ex.repRange,
              rir: ex.rir,
              customMetricId: ex.customMetricId,
            })),
          })),
        }
      : null;

    return (
      <div className="space-y-6">
        {header}
        {goalCard}
        {metricsPanel}

        {/* Plan overview */}
        {activity.workoutPlan && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {activity.workoutPlan.name}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {activity.workoutPlan.days.map((day) => (
                <div key={day.id} className="rounded-xl border bg-card p-4">
                  <p className="font-medium">{day.label}</p>
                  <ul className="mt-2 space-y-0.5">
                    {day.exercises.map((ex) => (
                      <li key={ex.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{ex.name}</span>
                        <span className="tabular-nums">
                          {ex.targetSets}×{ex.repRange}
                          {ex.rir != null ? ` RIR${ex.rir}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <PlanSection
          slug={activity.slug}
          activityName={activity.name}
          initial={planInitial}
          customMetrics={customMetrics}
        />

        {/* Session history */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Session history
          </h3>
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <p>No sessions yet. Log your first {activity.name} session in Check-in.</p>
            </div>
          ) : (
            sessions.map((session) => {
              const dateStr = session.date.toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              });
              const exerciseNames = [...new Set(session.exercises.map((e) => e.exercise.name))];
              return (
                <Link
                  key={session.id}
                  href={`/health/workout/${session.id}`}
                  className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{session.type}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{dateStr}</span>
                    </div>
                    {session.durationMin && (
                      <span className="text-sm text-muted-foreground">{session.durationMin} min</span>
                    )}
                  </div>
                  {exerciseNames.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {exerciseNames.slice(0, 5).join(" · ")}
                      {exerciseNames.length > 5 && " +more"}
                    </p>
                  )}
                </Link>
              );
            })
          )}
        </section>
      </div>
    );
  }

  // ─── CARDIO ─────────────────────────────────────────────────────────────────
  if (activity.kind === "CARDIO") {
    const totalKm = sessions.flatMap((s) => s.runs).reduce((sum, r) => sum + (r.distanceKm ?? 0), 0);
    const allRuns = sessions.flatMap((s) => s.runs).filter((r) => r.avgPaceSecPerKm != null);
    const avgPace = allRuns.length > 0
      ? Math.round(allRuns.reduce((sum, r) => sum + r.avgPaceSecPerKm!, 0) / allRuns.length)
      : null;
    const longestRun = Math.max(0, ...sessions.flatMap((s) => s.runs.map((r) => r.distanceKm ?? 0)));

    const chartData: CardioDataPoint[] = sessions
      .filter((s) => s.runs.some((r) => r.distanceKm))
      .map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        distanceKm: s.runs.reduce((sum, r) => sum + (r.distanceKm ?? 0), 0),
      }))
      .reverse();

    return (
      <div className="space-y-6">
        {header}
        {goalCard}
        {metricsPanel}

        {sessions.length > 0 && (
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{totalKm.toFixed(1)}</p>
              <p className="text-muted-foreground">km total</p>
            </div>
            {avgPace != null && (
              <div>
                <p className="text-2xl font-semibold tabular-nums">{paceStr(avgPace)}</p>
                <p className="text-muted-foreground">avg pace /km</p>
              </div>
            )}
            {longestRun > 0 && (
              <div>
                <p className="text-2xl font-semibold tabular-nums">{longestRun.toFixed(1)}</p>
                <p className="text-muted-foreground">longest run (km)</p>
              </div>
            )}
          </div>
        )}

        {chartData.length > 0 && (
          <section className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Distance over time</p>
            <CardioProgressChart data={chartData} />
          </section>
        )}

        <section className="space-y-2">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <p>No sessions yet. Log your first {activity.name} session in Check-in, or upload from Garmin.</p>
            </div>
          ) : (
            sessions.map((session) => {
              const run = session.runs[0];
              const view: CardioSessionView = {
                id: session.id,
                dateStr: session.date.toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                }),
                trainingType: run?.trainingType ?? null,
                source: session.source,
                distanceKm: run?.distanceKm ?? null,
                durationMin: run?.durationMin ?? session.durationMin ?? null,
                avgPaceSecPerKm: run?.avgPaceSecPerKm ?? null,
                avgHRBpm: run?.avgHRBpm ?? null,
                maxHRBpm: run?.maxHRBpm ?? null,
                calories: run?.calories ?? null,
                elevationGainM: run?.elevationGainM ?? null,
                avgCadence: run?.avgCadence ?? null,
                notes: session.notes,
                laps: (run?.laps ?? []).map((l) => ({
                  lapIndex: l.lapIndex,
                  distanceM: l.distanceM,
                  durationSec: l.durationSec,
                  avgPaceSecPerKm: l.avgPaceSecPerKm,
                  avgHRBpm: l.avgHRBpm,
                  isWork: l.isWork,
                  recoverySec: l.recoverySec,
                })),
              };
              return <CardioSessionCard key={session.id} session={view} />;
            })
          )}
        </section>
      </div>
    );
  }

  // ─── SPORT ──────────────────────────────────────────────────────────────────
  const totalSessions = sessions.length;
  const thisWeekCount = sessions.filter((s) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return s.date >= weekAgo;
  }).length;

  return (
    <div className="space-y-6">
      {header}
      {goalCard}
      {metricsPanel}

      {totalSessions > 0 && (
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{totalSessions}</p>
            <p className="text-muted-foreground">total sessions</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{thisWeekCount}</p>
            <p className="text-muted-foreground">this week</p>
          </div>
        </div>
      )}

      <section className="space-y-2">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            <p>No sessions yet. Log your first {activity.name} session in Check-in.</p>
          </div>
        ) : (
          sessions.map((session) => {
            const dateStr = session.date.toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            });
            return (
              <div key={session.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dateStr}</span>
                  {session.durationMin && (
                    <span className="text-sm text-muted-foreground">{session.durationMin} min</span>
                  )}
                </div>
                {session.notes && (
                  <p className="mt-1 text-sm text-muted-foreground">{session.notes}</p>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LiveSession, type LiveDay } from "@/components/health/live/LiveSession";
import { loadLastPerformance } from "@/lib/health/last-performance.server";
import { formatISODate } from "@/lib/utils/dates";

export default async function LiveSessionPage({
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

  // Live mode only makes sense for strength activities with a plan.
  if (activity.kind !== "STRENGTH" || !activity.workoutPlan) {
    redirect(`/health/activity/${slug}`);
  }

  const allNames = activity.workoutPlan.days.flatMap((d) =>
    d.exercises.map((ex) => ex.name),
  );
  const previous = await loadLastPerformance(user.id, allNames);

  const days: LiveDay[] = activity.workoutPlan.days.map((d) => ({
    id: d.id,
    label: d.label,
    exercises: d.exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      metric: ex.metric,
      targetSets: ex.targetSets,
      repRange: ex.repRange,
      rir: ex.rir,
      notes: ex.notes,
      previous: previous[ex.name] ?? [],
    })),
  }));

  return (
    <LiveSession
      activityId={activity.id}
      activitySlug={activity.slug}
      activityName={activity.name}
      days={days}
      todayISO={formatISODate(new Date())}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { slug } = await params;

  const folder = await prisma.healthFolder.findUnique({
    where: { profileId_slug: { profileId: user.id, slug } },
  });
  if (!folder) notFound();

  const sessions = await prisma.workoutSession.findMany({
    where: { profileId: user.id, type: folder.name },
    orderBy: { date: "desc" },
    include: {
      exercises: { include: { exercise: true } },
      runs: true,
    },
  });

  const totalDistanceKm = sessions
    .flatMap((s) => s.runs)
    .reduce((sum, r) => sum + (r.distanceKm ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {folder.icon && <span className="mr-2">{folder.icon}</span>}
            {folder.name}
          </h2>
          {folder.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{folder.description}</p>
          )}
        </div>
        <Link href="/check-in">
          <Button size="sm">Log session</Button>
        </Link>
      </div>

      {sessions.length > 0 && (
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{sessions.length}</p>
            <p className="text-muted-foreground">sessions</p>
          </div>
          {totalDistanceKm > 0 && (
            <div>
              <p className="text-2xl font-semibold tabular-nums">
                {totalDistanceKm.toFixed(1)}
              </p>
              <p className="text-muted-foreground">km total</p>
            </div>
          )}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No sessions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Log a workout session in Check-in with type &ldquo;{folder.name}&rdquo; to start
            tracking here.
          </p>
          <Link href="/check-in" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Go to Check-in
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const dateStr = session.date.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const runKm = session.runs.reduce((s, r) => s + (r.distanceKm ?? 0), 0);
            const exerciseNames = [
              ...new Set(session.exercises.map((e) => e.exercise.name)),
            ];

            return (
              <Link
                key={session.id}
                href={`/health/workout/${session.id}`}
                className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dateStr}</span>
                  {session.durationMin && (
                    <span className="text-sm text-muted-foreground">
                      {session.durationMin} min
                    </span>
                  )}
                </div>
                {runKm > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {runKm.toFixed(2)} km
                    {session.runs[0]?.avgPaceSecPerKm != null && (
                      <>
                        {" · "}
                        {Math.floor(session.runs[0].avgPaceSecPerKm / 60)}:
                        {String(session.runs[0].avgPaceSecPerKm % 60).padStart(2, "0")}
                        {" /km"}
                      </>
                    )}
                  </p>
                )}
                {exerciseNames.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {exerciseNames.slice(0, 4).join(", ")}
                    {exerciseNames.length > 4 && " +more"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

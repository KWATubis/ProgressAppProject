import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ExerciseSetRow, type ExerciseWithSets } from "@/components/health/ExerciseSetRow";
import { DeleteSessionButton } from "@/components/health/DeleteSessionButton";
import { detectSessionPRs } from "@/lib/strength.server";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;

  const session = await prisma.workoutSession.findFirst({
    where: { id, profileId: user.id },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
      },
      runs: true,
    },
  });

  if (!session) notFound();

  const dateStr = session.date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Group sets by exercise
  const exerciseMap = new Map<string, ExerciseWithSets>();
  for (const s of session.exercises) {
    const key = s.exercise.id;
    if (!exerciseMap.has(key)) {
      exerciseMap.set(key, {
        id: s.exercise.id,
        name: s.exercise.name,
        category: s.exercise.category,
        sets: [],
      });
    }
    exerciseMap.get(key)!.sets.push({
      id: s.id,
      setNumber: s.setNumber,
      reps: s.reps,
      weightKg: s.weightKg,
      holdSeconds: s.holdSeconds,
      notes: s.notes,
    });
  }

  const exercises = Array.from(exerciseMap.values());

  // Estimated 1RM + PR detection per exercise in this session.
  const prMap = await detectSessionPRs(user.id, session.id);
  for (const ex of exercises) {
    const pr = prMap.get(ex.id);
    if (pr) {
      ex.e1RM = pr.e1RM;
      ex.isPR = pr.isPR;
      ex.prevBest = pr.prevBest;
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/health/workout"
          className="mb-3 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> All workouts
        </Link>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-semibold">{session.type}</h2>
          <DeleteSessionButton sessionId={session.id} redirectTo="/health/workout" />
        </div>
        <p className="text-sm text-muted-foreground">{dateStr}</p>
        {session.durationMin && (
          <p className="text-sm text-muted-foreground">{session.durationMin} min</p>
        )}
        {session.notes && (
          <p className="mt-1 text-sm text-muted-foreground">{session.notes}</p>
        )}
      </div>

      {exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exercises logged for this session.</p>
      ) : (
        <div className="space-y-3">
          {exercises.map((ex) => (
            <ExerciseSetRow key={ex.id} exercise={ex} />
          ))}
        </div>
      )}

      {session.runs.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Cardio</h3>
          <div className="divide-y rounded-lg border border-white/10 bg-card">
            {session.runs.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <p className="font-medium">{r.type}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {r.distanceKm != null && `${r.distanceKm} km`}
                  {r.durationMin != null && ` · ${r.durationMin} min`}
                  {r.avgPaceSecPerKm != null &&
                    ` · ${Math.floor(r.avgPaceSecPerKm / 60)}:${String(r.avgPaceSecPerKm % 60).padStart(2, "0")}/km`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

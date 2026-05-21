import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { WorkoutSessionCard, type WorkoutSessionSummary } from "@/components/health/WorkoutSessionCard";

const PAGE_SIZE = 15;

export default async function WorkoutListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [total, sessions] = await Promise.all([
    prisma.workoutSession.count({ where: { profileId: user.id } }),
    prisma.workoutSession.findMany({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { exercises: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summaries: WorkoutSessionSummary[] = sessions.map((s) => ({
    id: s.id,
    date: s.date,
    type: s.type,
    exerciseCount: new Set(s.exercises.map((e) => e.exerciseId)).size,
    totalSets: s.exercises.length,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total} session{total !== 1 ? "s" : ""} total
      </p>

      {summaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
      ) : (
        <div className="space-y-2">
          {summaries.map((s) => (
            <WorkoutSessionCard key={s.id} session={s} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Link
            href={page > 1 ? `/health/workout?page=${page - 1}` : "#"}
            aria-disabled={page <= 1}
            className={
              page <= 1
                ? "pointer-events-none flex items-center gap-1 text-xs text-muted-foreground/40"
                : "flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </Link>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Link
            href={page < totalPages ? `/health/workout?page=${page + 1}` : "#"}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages
                ? "pointer-events-none flex items-center gap-1 text-xs text-muted-foreground/40"
                : "flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

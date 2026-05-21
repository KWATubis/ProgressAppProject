import Link from "next/link";
import { Dumbbell, ChevronRight } from "lucide-react";

export type WorkoutSessionSummary = {
  id: string;
  date: Date;
  type: string;
  exerciseCount: number;
  totalSets: number;
};

export function WorkoutSessionCard({ session }: { session: WorkoutSessionSummary }) {
  const dateStr = session.date.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/health/workout/${session.id}`}
      className="flex items-center justify-between rounded-lg border border-white/10 bg-card px-4 py-3 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <Dumbbell className="h-4 w-4 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-medium">{session.type}</p>
          <p className="text-xs text-muted-foreground">
            {dateStr} · {session.exerciseCount} exercise{session.exerciseCount !== 1 ? "s" : ""} ·{" "}
            {session.totalSets} sets
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

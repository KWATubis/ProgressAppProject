export type ExerciseWithSets = {
  id: string;
  name: string;
  category: string;
  e1RM?: number | null;
  isPR?: boolean;
  prevBest?: number | null;
  sets: {
    id: string;
    setNumber: number;
    reps: number | null;
    weightKg: number | null;
    holdSeconds: number | null;
    notes: string | null;
  }[];
};

export function ExerciseSetRow({ exercise }: { exercise: ExerciseWithSets }) {
  const gain =
    exercise.isPR && exercise.e1RM != null && exercise.prevBest != null
      ? Math.round((exercise.e1RM - exercise.prevBest) * 10) / 10
      : null;

  return (
    <div className="rounded-lg border border-white/10 bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{exercise.name}</p>
          <p className="text-xs text-muted-foreground">{exercise.category}</p>
        </div>
        {exercise.e1RM != null && exercise.e1RM > 0 && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {exercise.isPR && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                New PR
              </span>
            )}
            <span className="text-[11px] tabular-nums text-muted-foreground">
              e1RM <span className="font-medium text-foreground">{exercise.e1RM} kg</span>
              {gain != null && gain > 0 && <span className="text-amber-300/90"> · +{gain}</span>}
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
          <span>Set</span>
          <span>Weight</span>
          <span>Reps</span>
          <span>Hold</span>
        </div>
        {exercise.sets.map((s) => (
          <div key={s.id} className="grid grid-cols-4 gap-2 text-sm tabular-nums">
            <span className="text-muted-foreground">{s.setNumber}</span>
            <span>{s.weightKg != null ? `${s.weightKg} kg` : "—"}</span>
            <span>{s.reps ?? "—"}</span>
            <span>{s.holdSeconds != null ? `${s.holdSeconds}s` : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

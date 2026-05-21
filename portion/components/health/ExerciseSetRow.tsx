export type ExerciseWithSets = {
  id: string;
  name: string;
  category: string;
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
  return (
    <div className="rounded-lg border border-white/10 bg-card p-4">
      <div className="mb-3">
        <p className="text-sm font-medium">{exercise.name}</p>
        <p className="text-xs text-muted-foreground">{exercise.category}</p>
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

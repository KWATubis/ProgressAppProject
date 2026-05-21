"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X, Check, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { WORKOUT_PLAN, type WorkoutDay } from "@/lib/data/workout-plan";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SetEntry = { weightKg: string; reps: string };
type ExerciseState = Record<string, SetEntry[]>; // keyed by exercise name

function blankSets(n: number): SetEntry[] {
  return Array.from({ length: n }, () => ({ weightKg: "", reps: "" }));
}

function initState(day: WorkoutDay): ExerciseState {
  const state: ExerciseState = {};
  for (const ex of day.exercises) state[ex.name] = blankSets(ex.sets);
  return state;
}

export function WorkoutLogForm({ dateISO }: { dateISO: string }) {
  const [dayKey, setDayKey] = useState<WorkoutDay["key"]>("push");
  const day = useMemo(() => WORKOUT_PLAN.find((d) => d.key === dayKey)!, [dayKey]);
  const [entries, setEntries] = useState<ExerciseState>(() => initState(day));
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function selectDay(key: WorkoutDay["key"]) {
    if (key === dayKey) return;
    const next = WORKOUT_PLAN.find((d) => d.key === key)!;
    setDayKey(key);
    setEntries(initState(next));
    setDone(false);
  }

  function updateSet(exName: string, idx: number, field: keyof SetEntry, value: string) {
    setEntries((prev) => {
      const sets = prev[exName].map((s, i) => (i === idx ? { ...s, [field]: value } : s));
      return { ...prev, [exName]: sets };
    });
  }

  function addSet(exName: string) {
    setEntries((prev) => ({ ...prev, [exName]: [...prev[exName], { weightKg: "", reps: "" }] }));
  }

  function removeSet(exName: string, idx: number) {
    setEntries((prev) => {
      const sets = prev[exName].filter((_, i) => i !== idx);
      return { ...prev, [exName]: sets.length ? sets : blankSets(1) };
    });
  }

  function submit() {
    const exercises = day.exercises.map((ex) => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: entries[ex.name].map((s, i) => ({
        setNumber: i + 1,
        reps: s.reps === "" ? null : Number(s.reps),
        weightKg: s.weightKg === "" ? null : Number(s.weightKg),
      })),
    }));

    const hasData = exercises.some((ex) =>
      ex.sets.some((s) => s.reps != null || s.weightKg != null),
    );
    if (!hasData) {
      toast.error("Enter at least one set before saving.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/workout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateISO, type: day.name, exercises }),
        });
        if (!res.ok) throw new Error(await res.text());
        setDone(true);
        toast.success(`${day.name} session logged.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save workout");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {WORKOUT_PLAN.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => selectDay(d.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              d.key === dayKey
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Dumbbell className="h-4 w-4 text-emerald-500" />
        <span className="font-medium text-foreground">{day.name}</span>
        <span>·</span>
        <span>{day.focus}</span>
      </div>

      <div className="space-y-3">
        {day.exercises.map((ex) => (
          <div key={ex.name} className="rounded-lg border bg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{ex.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ex.muscleGroup} · target {ex.sets} × {ex.repRange} · RIR {ex.rir}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 text-xs text-muted-foreground">
                <span>Set</span>
                <span>Weight (kg)</span>
                <span>Reps</span>
                <span />
              </div>
              {entries[ex.name].map((s, idx) => (
                <div key={idx} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2">
                  <span className="text-sm tabular-nums text-muted-foreground">{idx + 1}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    placeholder="—"
                    value={s.weightKg}
                    onChange={(e) => updateSet(ex.name, idx, "weightKg", e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums outline-none focus:border-foreground"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="—"
                    value={s.reps}
                    onChange={(e) => updateSet(ex.name, idx, "reps", e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums outline-none focus:border-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => removeSet(ex.name, idx)}
                    className="flex h-9 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Remove set"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSet(ex.name)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add set
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={submit} disabled={isPending || done} className="w-full">
        {done ? (
          <>
            <Check className="mr-1 h-4 w-4" /> Logged
          </>
        ) : isPending ? (
          "Saving…"
        ) : (
          `Log ${day.name} session`
        )}
      </Button>
    </div>
  );
}

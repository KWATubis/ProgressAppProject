"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X, Check, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CardioLogForm } from "./CardioLogForm";
import { SportLogForm } from "./SportLogForm";

type ActivityType = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  kind: "STRENGTH" | "CARDIO" | "SPORT";
};

type PlanExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  repRange: string | null;
  rir: number | null;
  notes: string | null;
};

type PlanDay = { id: string; label: string; sortOrder: number; exercises: PlanExercise[] };
type Plan = { id: string; name: string; days: PlanDay[] };

type SetEntry = { weightKg: string; reps: string };
type ExerciseState = Record<string, SetEntry[]>;

function blankSets(n: number): SetEntry[] {
  return Array.from({ length: n }, () => ({ weightKg: "", reps: "" }));
}

function initState(day: PlanDay): ExerciseState {
  const state: ExerciseState = {};
  for (const ex of day.exercises) state[ex.name] = blankSets(ex.targetSets);
  return state;
}

export function WorkoutLogForm({
  dateISO,
  activityTypes,
}: {
  dateISO: string;
  activityTypes: ActivityType[];
}) {
  const [selectedId, setSelectedId] = useState<string>(activityTypes[0]?.id ?? "");
  const selected = activityTypes.find((a) => a.id === selectedId) ?? activityTypes[0];

  // STRENGTH-specific state
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);
  const [entries, setEntries] = useState<ExerciseState>({});
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const day: PlanDay | null = plan?.days[dayIdx] ?? null;

  // Load plan when a STRENGTH activity is selected
  useEffect(() => {
    if (!selected || selected.kind !== "STRENGTH") return;
    setPlanLoading(true);
    setDone(false);
    fetch(`/api/health/activities/${selected.slug}/plan`)
      .then((r) => r.json())
      .then(({ plan: p }: { plan: Plan | null }) => {
        setPlan(p);
        if (p?.days[0]) setEntries(initState(p.days[0]));
        setDayIdx(0);
      })
      .catch(() => toast.error("Could not load workout plan"))
      .finally(() => setPlanLoading(false));
  }, [selected?.id, selected?.kind, selected?.slug]);

  // Reset done state when activity changes
  useEffect(() => {
    setDone(false);
  }, [selectedId]);

  function selectDay(idx: number) {
    if (!plan) return;
    setDayIdx(idx);
    setEntries(initState(plan.days[idx]));
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

  function submitStrength() {
    if (!day) return;
    const exercises = day.exercises.map((ex) => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: (entries[ex.name] ?? []).map((s, i) => ({
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
          body: JSON.stringify({
            date: dateISO,
            type: day.label,
            activityTypeId: selected?.id,
            exercises,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setDone(true);
        toast.success(`${day.label} session logged.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save workout");
      }
    });
  }

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">
        No activities set up yet. Add one in Health → +.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Activity type selector */}
      {activityTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {activityTypes.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                a.id === selectedId
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {a.icon ? `${a.icon} ${a.name}` : a.name}
            </button>
          ))}
        </div>
      )}

      {/* STRENGTH */}
      {selected.kind === "STRENGTH" && (
        planLoading ? (
          <p className="text-sm text-muted-foreground">Loading plan…</p>
        ) : !plan ? (
          <p className="text-sm text-muted-foreground">No workout plan found for {selected.name}.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {plan.days.map((d, idx) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectDay(idx)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    idx === dayIdx
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {day && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Dumbbell className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-foreground">{day.label}</span>
                </div>

                <div className="space-y-3">
                  {day.exercises.map((ex) => (
                    <div key={ex.id} className="rounded-lg border bg-card p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{ex.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.muscleGroup}
                          {ex.repRange && ` · target ${ex.targetSets}×${ex.repRange}`}
                          {ex.rir != null && ` · RIR ${ex.rir}`}
                        </p>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 text-xs text-muted-foreground">
                          <span>Set</span>
                          <span>Weight (kg)</span>
                          <span>Reps</span>
                          <span />
                        </div>
                        {(entries[ex.name] ?? []).map((s, idx) => (
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

                <Button onClick={submitStrength} disabled={isPending || done} className="w-full">
                  {done ? (
                    <><Check className="mr-1 h-4 w-4" /> Logged</>
                  ) : isPending ? (
                    "Saving…"
                  ) : (
                    `Log ${day.label} session`
                  )}
                </Button>
              </>
            )}
          </>
        )
      )}

      {/* CARDIO */}
      {selected.kind === "CARDIO" && (
        <CardioLogForm
          key={selected.id}
          dateISO={dateISO}
          activityTypeId={selected.id}
          activityName={selected.name}
        />
      )}

      {/* SPORT */}
      {selected.kind === "SPORT" && (
        <SportLogForm
          key={selected.id}
          dateISO={dateISO}
          activityTypeId={selected.id}
          activityName={selected.name}
        />
      )}
    </div>
  );
}

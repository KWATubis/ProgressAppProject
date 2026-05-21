"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ExerciseRow = {
  name: string;
  muscleGroup: string;
  targetSets: string;
  repRange: string;
  rir: string;
};

type DayRow = { label: string; exercises: ExerciseRow[] };

function blankExercise(): ExerciseRow {
  return { name: "", muscleGroup: "", targetSets: "3", repRange: "", rir: "" };
}

function blankDay(label: string): DayRow {
  return { label, exercises: [blankExercise()] };
}

const input =
  "h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground";

export type PlanInitial = {
  name: string;
  days: { label: string; exercises: { name: string; muscleGroup: string; targetSets: number; repRange: string | null; rir: number | null }[] }[];
};

export function PlanEditor({
  slug,
  activityName,
  initial,
  onSaved,
}: {
  slug: string;
  activityName: string;
  initial?: PlanInitial;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [planName, setPlanName] = useState(initial?.name ?? "");
  const [days, setDays] = useState<DayRow[]>(
    initial
      ? initial.days.map((d) => ({
          label: d.label,
          exercises: d.exercises.map((ex) => ({
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            targetSets: String(ex.targetSets),
            repRange: ex.repRange ?? "",
            rir: ex.rir == null ? "" : String(ex.rir),
          })),
        }))
      : [blankDay("Day 1")],
  );
  const [isPending, startTransition] = useTransition();

  function updateDayLabel(di: number, label: string) {
    setDays((prev) => prev.map((d, i) => (i === di ? { ...d, label } : d)));
  }
  function addDay() {
    setDays((prev) => [...prev, blankDay(`Day ${prev.length + 1}`)]);
  }
  function removeDay(di: number) {
    setDays((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== di) : prev));
  }
  function updateExercise(di: number, ei: number, field: keyof ExerciseRow, value: string) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === di
          ? { ...d, exercises: d.exercises.map((ex, j) => (j === ei ? { ...ex, [field]: value } : ex)) }
          : d,
      ),
    );
  }
  function addExercise(di: number) {
    setDays((prev) =>
      prev.map((d, i) => (i === di ? { ...d, exercises: [...d.exercises, blankExercise()] } : d)),
    );
  }
  function removeExercise(di: number, ei: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === di
          ? { ...d, exercises: d.exercises.length > 1 ? d.exercises.filter((_, j) => j !== ei) : d.exercises }
          : d,
      ),
    );
  }

  function save() {
    const payloadDays = days
      .map((d) => ({
        label: d.label.trim(),
        exercises: d.exercises
          .filter((ex) => ex.name.trim() && ex.muscleGroup.trim())
          .map((ex) => ({
            name: ex.name.trim(),
            muscleGroup: ex.muscleGroup.trim(),
            targetSets: Number(ex.targetSets) || 3,
            repRange: ex.repRange.trim() || null,
            rir: ex.rir === "" ? null : Number(ex.rir),
          })),
      }))
      .filter((d) => d.label && d.exercises.length > 0);

    if (!planName.trim()) {
      toast.error("Give the plan a name.");
      return;
    }
    if (payloadDays.length === 0) {
      toast.error("Add at least one day with one exercise (name + muscle group).");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/health/activities/${slug}/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: planName.trim(), days: payloadDays }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Plan saved.");
        onSaved?.();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save plan");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Plan name</label>
        <input
          className={input}
          placeholder={`e.g. ${activityName} program`}
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
        />
      </div>

      {days.map((day, di) => (
        <div key={di} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <input
              className={`${input} font-medium`}
              value={day.label}
              onChange={(e) => updateDayLabel(di, e.target.value)}
              placeholder="Day name (e.g. Push)"
            />
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(di)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Remove day"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_3rem_3.5rem_2rem] gap-2 text-xs text-muted-foreground">
              <span>Exercise</span>
              <span>Muscle group</span>
              <span>Sets</span>
              <span>Reps</span>
              <span />
            </div>
            {day.exercises.map((ex, ei) => (
              <div key={ei} className="grid grid-cols-[1fr_1fr_3rem_3.5rem_2rem] items-center gap-2">
                <input
                  className={input}
                  placeholder="Incline press"
                  value={ex.name}
                  onChange={(e) => updateExercise(di, ei, "name", e.target.value)}
                />
                <input
                  className={input}
                  placeholder="Chest"
                  value={ex.muscleGroup}
                  onChange={(e) => updateExercise(di, ei, "muscleGroup", e.target.value)}
                />
                <input
                  className={`${input} tabular-nums`}
                  type="number"
                  min="1"
                  value={ex.targetSets}
                  onChange={(e) => updateExercise(di, ei, "targetSets", e.target.value)}
                />
                <input
                  className={`${input} tabular-nums`}
                  placeholder="8–12"
                  value={ex.repRange}
                  onChange={(e) => updateExercise(di, ei, "repRange", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeExercise(di, ei)}
                  className="flex h-9 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Remove exercise"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addExercise(di)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add exercise
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={addDay}>
          <Plus className="mr-1 h-4 w-4" /> Add day
        </Button>
        <Button type="button" onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : "Save plan"}
        </Button>
      </div>
    </div>
  );
}

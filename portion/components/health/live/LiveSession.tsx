"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Check, X, Plus, Minus, Dumbbell, Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RestTimer, DEFAULT_REST_SEC } from "./RestTimer";
import type { PreviousSet } from "@/lib/health/last-performance.server";

export type LiveExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  metric: "REPS" | "TIME";
  targetSets: number;
  repRange: string | null;
  rir: number | null;
  notes: string | null;
  previous: PreviousSet[];
};
export type LiveDay = { id: string; label: string; exercises: LiveExercise[] };

type LoggedSet = { weightKg: number | null; reps: number | null; holdSeconds: number | null };
type Draft = { weight: string; reps: string; seconds: string };

type Persisted = { dayId: string; logged: Record<string, LoggedSet[]>; startedAt: number };

const EMPTY_DRAFT: Draft = { weight: "", reps: "", seconds: "" };

function storageKey(activityId: string, todayISO: string) {
  return `portion_live_${activityId}_${todayISO}`;
}

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function setSummary(s: LoggedSet, metric: "REPS" | "TIME") {
  const w = s.weightKg != null ? `${s.weightKg}kg` : null;
  const r = metric === "TIME"
    ? s.holdSeconds != null ? `${s.holdSeconds}s` : null
    : s.reps != null ? `${s.reps} reps` : null;
  return [w, r].filter(Boolean).join(" × ") || "—";
}

// The set to prefill from: last set logged this session, else last time's first set.
function seedDraft(ex: LiveExercise, loggedSets: LoggedSet[] | undefined): Draft {
  const ref = loggedSets?.at(-1) ?? ex.previous[0];
  if (!ref) return EMPTY_DRAFT;
  return {
    weight: ref.weightKg != null ? String(ref.weightKg) : "",
    reps: ref.reps != null ? String(ref.reps) : "",
    seconds: ref.holdSeconds != null ? String(ref.holdSeconds) : "",
  };
}

function Stepper({
  value,
  onChange,
  step,
  label,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  label: string;
  placeholder: string;
}) {
  const bump = (dir: number) => {
    const cur = num(value) ?? 0;
    const next = Math.max(0, Math.round((cur + dir * step) * 100) / 100);
    onChange(String(next));
  };
  return (
    <div className="flex-1">
      <span className="mb-1 block text-center text-xs text-muted-foreground">{label}</span>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => bump(-1)}
          className="flex w-10 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full min-w-0 rounded-lg border bg-background text-center font-display text-xl tabular-nums outline-none focus:border-foreground"
        />
        <button
          type="button"
          onClick={() => bump(1)}
          className="flex w-10 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function LiveSession({
  activityId,
  activitySlug,
  activityName,
  days,
  todayISO,
}: {
  activityId: string;
  activitySlug: string;
  activityName: string;
  days: LiveDay[];
  todayISO: string;
}) {
  const router = useRouter();
  const key = storageKey(activityId, todayISO);

  const [dayId, setDayId] = useState<string | null>(days.length === 1 ? days[0].id : null);
  const [exIdx, setExIdx] = useState(0);
  const [logged, setLogged] = useState<Record<string, LoggedSet[]>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const hydrated = useRef(false);

  const day = days.find((d) => d.id === dayId) ?? null;
  const exercise = day?.exercises[exIdx] ?? null;

  // Restore an in-progress session for today, if any. Reading localStorage is a
  // legitimate external-system sync that can only run post-mount (SSR has no
  // storage), so the one-time setState here is intentional.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let saved: Persisted | null = null;
    try {
      const raw = localStorage.getItem(key);
      saved = raw ? (JSON.parse(raw) as Persisted) : null;
    } catch {
      saved = null;
    }
    if (saved && days.some((d) => d.id === saved!.dayId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDayId(saved.dayId);
      setLogged(saved.logged ?? {});
      if (saved.startedAt) setStartedAt(saved.startedAt);
    }
  }, [key, days]);

  // Persist after each change (only once a day is chosen).
  useEffect(() => {
    if (!hydrated.current || !dayId) return;
    const payload: Persisted = { dayId, logged, startedAt };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      /* quota — non-fatal */
    }
  }, [key, dayId, logged, startedAt]);

  // Session elapsed clock.
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Draft is derived: user edits win, otherwise prefill from the reference set.
  const draft: Draft = exercise
    ? drafts[exercise.id] ?? seedDraft(exercise, logged[exercise.id])
    : EMPTY_DRAFT;

  function setDraft(patch: Partial<Draft>) {
    const ex = exercise;
    if (!ex) return;
    setDrafts((prev) => {
      const base = prev[ex.id] ?? seedDraft(ex, logged[ex.id]);
      return { ...prev, [ex.id]: { ...base, ...patch } };
    });
  }

  function logSet() {
    if (!exercise) return;
    const isTime = exercise.metric === "TIME";
    const entry: LoggedSet = {
      weightKg: num(draft.weight),
      reps: isTime ? null : num(draft.reps),
      holdSeconds: isTime ? num(draft.seconds) : null,
    };
    const hasData = entry.weightKg != null || entry.reps != null || entry.holdSeconds != null;
    if (!hasData) {
      toast.error("Enter weight, reps or a hold first.");
      return;
    }
    setLogged((prev) => ({ ...prev, [exercise.id]: [...(prev[exercise.id] ?? []), entry] }));
    setRestEndsAt(Date.now() + DEFAULT_REST_SEC * 1000);
  }

  function removeSet(exId: string, idx: number) {
    setLogged((prev) => ({ ...prev, [exId]: (prev[exId] ?? []).filter((_, i) => i !== idx) }));
  }

  const totalSets = Object.values(logged).reduce((sum, arr) => sum + arr.length, 0);

  async function finish() {
    if (!day) return;
    const exercises = day.exercises
      .map((ex) => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: (logged[ex.id] ?? []).map((s, i) => ({
          setNumber: i + 1,
          reps: s.reps,
          weightKg: s.weightKg,
          holdSeconds: s.holdSeconds,
        })),
      }))
      .filter((ex) => ex.sets.length > 0);

    if (exercises.length === 0) {
      toast.error("Log at least one set before finishing.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayISO,
          type: day.label,
          activityTypeId: activityId,
          durationMin: Math.max(1, Math.round(elapsed / 60)),
          exercises,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session } = await res.json();
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      toast.success(`${day.label} session logged.`);
      router.push(`/health/workout/${session.id}`);
    } catch (e) {
      setIsSaving(false);
      toast.error(e instanceof Error ? e.message : "Failed to save session");
    }
  }

  // ─── Day picker ─────────────────────────────────────────────────────────────
  if (!day) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-4">
        <div>
          <Link
            href={`/health/activity/${activitySlug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> {activityName}
          </Link>
          <h1 className="mt-2 font-display text-3xl">Pick today&apos;s session</h1>
        </div>
        <div className="grid gap-3">
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDayId(d.id);
                setExIdx(0);
                setStartedAt(Date.now());
              }}
              className="rounded-2xl border bg-card p-5 text-left transition-colors hover:border-foreground"
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-emerald-500" />
                <span className="font-display text-xl">{d.label}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {d.exercises.length} exercises · {d.exercises.map((e) => e.name).slice(0, 4).join(", ")}
                {d.exercises.length > 4 && "…"}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const exDone = (logged[exercise!.id] ?? []).length;
  const isTime = exercise!.metric === "TIME";
  const elapsedM = Math.floor(elapsed / 60);
  const elapsedS = elapsed % 60;

  // ─── Live session ───────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col py-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/health/activity/${activitySlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Exit
        </Link>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {elapsedM}:{String(elapsedS).padStart(2, "0")} · {totalSets} sets
        </span>
      </div>

      <div className="mt-1 flex items-baseline justify-between">
        <h1 className="font-display text-2xl">{day.label}</h1>
        <span className="text-sm text-muted-foreground">
          {exIdx + 1} / {day.exercises.length}
        </span>
      </div>

      {/* Exercise progress strip */}
      <div className="mt-3 flex gap-1">
        {day.exercises.map((ex, i) => {
          const n = (logged[ex.id] ?? []).length;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => setExIdx(i)}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i === exIdx ? "bg-foreground" : n > 0 ? "bg-emerald-500/70" : "bg-muted",
              )}
              aria-label={`Go to ${ex.name}`}
            />
          );
        })}
      </div>

      {/* Current exercise */}
      <div className="mt-4 flex-1">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-2xl leading-tight">{exercise!.name}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {exercise!.muscleGroup}
                {exercise!.repRange && ` · target ${exercise!.targetSets}×${exercise!.repRange}`}
                {exercise!.rir != null && ` · RIR ${exercise!.rir}`}
              </p>
            </div>
            {exDone >= exercise!.targetSets && exDone > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                <Check className="h-3 w-3" /> {exDone}
              </span>
            )}
          </div>

          {/* Last time reference */}
          {exercise!.previous.length > 0 && (
            <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Last time</span>
              <p className="mt-0.5 text-sm tabular-nums">
                {exercise!.previous.map((s) => setSummary(s, exercise!.metric)).join("  ·  ")}
              </p>
            </div>
          )}

          {/* Completed sets */}
          {exDone > 0 && (
            <div className="mt-3 space-y-1.5">
              {(logged[exercise!.id] ?? []).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                >
                  <span className="text-sm">
                    <span className="text-muted-foreground">Set {i + 1}</span>{" "}
                    <span className="font-medium tabular-nums">{setSummary(s, exercise!.metric)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSet(exercise!.id, i)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Remove set"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Set entry */}
          <div className="mt-4 flex gap-2">
            <Stepper
              value={draft.weight}
              onChange={(v) => setDraft({ weight: v })}
              step={2.5}
              label="Weight (kg)"
              placeholder="—"
            />
            {isTime ? (
              <Stepper
                value={draft.seconds}
                onChange={(v) => setDraft({ seconds: v })}
                step={5}
                label="Hold (s)"
                placeholder="sec"
              />
            ) : (
              <Stepper
                value={draft.reps}
                onChange={(v) => setDraft({ reps: v })}
                step={1}
                label="Reps"
                placeholder="—"
              />
            )}
          </div>

          <Button onClick={logSet} size="lg" className="mt-3 h-14 w-full text-base">
            <Check className="mr-1.5 h-5 w-5" /> Log set {exDone + 1}
          </Button>
        </div>

        {/* Prev / next exercise */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            className="h-12 flex-1"
            disabled={exIdx === 0}
            onClick={() => setExIdx((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            className="h-12 flex-1"
            disabled={exIdx === day.exercises.length - 1}
            onClick={() => setExIdx((i) => Math.min(day.exercises.length - 1, i + 1))}
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sticky footer: rest timer + finish */}
      <div className="sticky bottom-4 mt-4 space-y-3">
        {restEndsAt != null && (
          <RestTimer
            endsAt={restEndsAt}
            onChangeEndsAt={setRestEndsAt}
            onDismiss={() => setRestEndsAt(null)}
          />
        )}
        <Button
          onClick={finish}
          disabled={isSaving}
          variant="secondary"
          className="h-12 w-full"
        >
          <Flag className="mr-1.5 h-4 w-4" />
          {isSaving ? "Saving…" : `Finish session${totalSets > 0 ? ` · ${totalSets} sets` : ""}`}
        </Button>
      </div>
    </div>
  );
}

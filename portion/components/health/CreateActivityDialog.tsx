"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { upsertGoal } from "@/app/(app)/goals/actions";
import { ACTIVITY_COLORS } from "@/lib/activity-colors";

type Pillar = "HEALTH" | "MONEY";
type HealthKind = "STRENGTH" | "CARDIO" | "SPORT";
type MoneyKind = "SOCIAL" | "SIDE_INCOME" | "MAIN_INCOME" | "BUSINESS";
type ActivityKind = HealthKind | MoneyKind;

type KindOption = {
  kind: ActivityKind;
  icon: string;
  label: string;
  description: string;
  defaultEmoji: string;
  placeholder: string;
};

const HEALTH_KINDS: KindOption[] = [
  { kind: "STRENGTH", icon: "🏋️", label: "Strength", description: "Log sets, reps & weight", defaultEmoji: "🏋️", placeholder: "e.g. Calisthenics" },
  { kind: "CARDIO", icon: "🏃", label: "Cardio", description: "Log distance, duration & pace", defaultEmoji: "🏃", placeholder: "e.g. Running" },
  { kind: "SPORT", icon: "⛹️", label: "Sport", description: "Log sessions with duration & notes", defaultEmoji: "⛹️", placeholder: "e.g. Basketball" },
];

const MONEY_KINDS: KindOption[] = [
  { kind: "SOCIAL", icon: "📱", label: "Social media", description: "Track followers + income from a platform", defaultEmoji: "📱", placeholder: "e.g. TikTok, Instagram" },
  { kind: "SIDE_INCOME", icon: "💼", label: "Side income", description: "Log shifts that earned money", defaultEmoji: "💼", placeholder: "e.g. Lifeguard, Ships" },
  { kind: "MAIN_INCOME", icon: "🏛️", label: "Main income", description: "Recurring salary or fixed income", defaultEmoji: "🏛️", placeholder: "e.g. Day job" },
  { kind: "BUSINESS", icon: "🚀", label: "Business", description: "Coaching, plans, deals you close", defaultEmoji: "🚀", placeholder: "e.g. Coaching, Dietary plans" },
];

type DefaultTask = {
  /** Title with optional `{name}` placeholder substituted at runtime. */
  template: string;
  frequency: "DAILY" | "WEEKLY";
  dayOfWeek: number[];
  durationMin?: number;
};

const DEFAULT_TASKS: Record<ActivityKind, DefaultTask[]> = {
  STRENGTH: [{ template: "{name} session", frequency: "WEEKLY", dayOfWeek: [1, 3, 5], durationMin: 60 }],
  CARDIO: [{ template: "{name} session", frequency: "WEEKLY", dayOfWeek: [2, 4, 6], durationMin: 40 }],
  SPORT: [{ template: "{name} session", frequency: "WEEKLY", dayOfWeek: [6], durationMin: 60 }],
  SOCIAL: [{ template: "Post on {name}", frequency: "DAILY", dayOfWeek: [], durationMin: 30 }],
  SIDE_INCOME: [],
  MAIN_INCOME: [],
  BUSINESS: [{ template: "Deep work on {name}", frequency: "WEEKLY", dayOfWeek: [1, 2, 3, 4, 5], durationMin: 120 }],
};

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

type DraftTask = {
  enabled: boolean;
  title: string;
  frequency: "DAILY" | "WEEKLY";
  dayOfWeek: number[];
  durationMin?: number;
};

export function CreateActivityDialog({ pillar }: { pillar: Pillar }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState<string>(ACTIVITY_COLORS[0]);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalUnit, setGoalUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const kinds = pillar === "HEALTH" ? HEALTH_KINDS : MONEY_KINDS;
  const activeKind = kinds.find((x) => x.kind === kind) ?? null;

  function reset() {
    setStep(1);
    setKind(null);
    setName("");
    setIcon("");
    setColor(ACTIVITY_COLORS[0]);
    setTasks([]);
    setGoalTitle("");
    setGoalTarget("");
    setGoalUnit("");
    setError("");
  }

  function handleKindSelect(k: ActivityKind) {
    setKind(k);
    setIcon(kinds.find((x) => x.kind === k)?.defaultEmoji ?? "");
    setStep(2);
  }

  function handleStep2Continue() {
    if (!name.trim() || !kind) return;
    setStep(3);
  }

  function handleStep3Continue() {
    if (!kind) return;
    const drafts: DraftTask[] = DEFAULT_TASKS[kind].map((d) => ({
      enabled: true,
      title: d.template.replace("{name}", name.trim()),
      frequency: d.frequency,
      dayOfWeek: [...d.dayOfWeek],
      durationMin: d.durationMin,
    }));
    setTasks(drafts);
    setStep(4);
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) reset();
  }

  function toggleDay(taskIdx: number, day: number) {
    setTasks((prev) =>
      prev.map((t, i) => {
        if (i !== taskIdx) return t;
        const set = new Set(t.dayOfWeek);
        if (set.has(day)) set.delete(day);
        else set.add(day);
        return { ...t, dayOfWeek: Array.from(set).sort() };
      }),
    );
  }

  function addEmptyTask() {
    setTasks((prev) => [
      ...prev,
      { enabled: true, title: "", frequency: "DAILY", dayOfWeek: [], durationMin: undefined },
    ]);
  }

  function removeTask(idx: number) {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(taskDrafts: DraftTask[]) {
    if (!kind) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon, kind, pillar, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create activity");
        return;
      }
      const activity: { id: string } = await res.json();

      const failures: string[] = [];

      if (goalTitle.trim()) {
        const target = goalTarget.trim() ? Number(goalTarget) : null;
        const goalRes = await upsertGoal({
          pillar,
          title: goalTitle.trim(),
          targetValue: Number.isFinite(target) ? (target as number) : null,
          unit: goalUnit.trim() || null,
          activityTypeId: activity.id,
        });
        if ("error" in goalRes) failures.push("goal");
      }

      const enabledTasks = taskDrafts.filter((t) => t.enabled && t.title.trim());
      if (enabledTasks.length > 0) {
        const results = await Promise.allSettled(
          enabledTasks.map((t) =>
            fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: t.title.trim(),
                pillar,
                frequency: t.frequency,
                dayOfWeek: t.frequency === "WEEKLY" ? t.dayOfWeek : [],
                durationMin: t.durationMin ?? null,
                activityTypeId: activity.id,
              }),
            }),
          ),
        );
        const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
        if (failed.length > 0) failures.push(`${failed.length} task${failed.length > 1 ? "s" : ""}`);
      }

      if (failures.length > 0) {
        setError(`Activity created, but ${failures.join(" + ")} failed to save.`);
      }

      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            className="rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Add activity"
          />
        }
      >
        <Plus className="h-4 w-4" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "What are you tracking?"}
            {step === 2 && "Name your activity"}
            {step === 3 && "Set a mini-goal"}
            {step === 4 && "Set up daily tasks"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2 pt-2">
            {kinds.map(({ kind: k, icon: ki, label, description }) => (
              <button
                key={k}
                onClick={() => handleKindSelect(k)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
              >
                <span className="text-2xl">{ki}</span>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && kind && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStep2Continue();
            }}
            className="space-y-4 pt-2"
          >
            <div className="flex gap-3">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input
                  placeholder="emoji…"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={4}
                  className="w-24"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="activity-name">Name</Label>
                <Input
                  id="activity-name"
                  placeholder={activeKind?.placeholder ?? "Activity name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full transition-transform",
                      color === c ? "scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-background" : "hover:scale-105",
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setStep(1); setKind(null); }}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving ? "Saving…" : "Continue"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {step === 3 && kind && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStep3Continue();
            }}
            className="space-y-4 pt-2"
          >
            <p className="text-xs text-muted-foreground">
              Give this activity a point. What are you chasing? (Optional — you can skip.)
            </p>

            <div className="space-y-2">
              <Label htmlFor="goal-title">Goal</Label>
              <Input
                id="goal-title"
                placeholder={
                  pillar === "MONEY"
                    ? "e.g. Earn 5k/month from coaching"
                    : "e.g. Hold a 30s handstand"
                }
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target (optional)</Label>
                <Input
                  id="goal-target"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 5000"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-unit">Unit</Label>
                <Input
                  id="goal-unit"
                  placeholder={pillar === "MONEY" ? "PLN/month" : "followers, kg…"}
                  value={goalUnit}
                  onChange={(e) => setGoalUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleStep3Continue}>
                  Skip
                </Button>
                <Button type="submit">Continue</Button>
              </div>
            </div>
          </form>
        )}

        {step === 4 && kind && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Tasks linked to this activity will show in your calendar — and tick automatically when you log a session.
              Adjust now or skip.
            </p>

            {tasks.length === 0 && (
              <p className="rounded-lg border border-dashed bg-card/40 p-4 text-center text-xs text-muted-foreground">
                No tasks yet. Add one below, or skip.
              </p>
            )}

            <div className="space-y-3">
              {tasks.map((t, i) => (
                <div key={i} className="space-y-2 rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`task-enabled-${i}`}
                      checked={t.enabled}
                      onChange={(e) =>
                        setTasks((prev) => prev.map((x, idx) => (idx === i ? { ...x, enabled: e.target.checked } : x)))
                      }
                      className="h-4 w-4 rounded border-muted-foreground/40 accent-foreground"
                    />
                    <Input
                      value={t.title}
                      onChange={(e) =>
                        setTasks((prev) => prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))
                      }
                      disabled={!t.enabled}
                      placeholder="Task name"
                      className="h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeTask(i)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove task"
                    >
                      ×
                    </button>
                  </div>

                  <div className={cn("flex flex-wrap items-center gap-2 pl-6", !t.enabled && "opacity-40")}>
                    <select
                      value={t.frequency}
                      onChange={(e) =>
                        setTasks((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, frequency: e.target.value as "DAILY" | "WEEKLY" } : x,
                          ),
                        )
                      }
                      disabled={!t.enabled}
                      className="h-7 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>

                    {t.frequency === "WEEKLY" && (
                      <div className="flex gap-1">
                        {DAYS.map((label, dayIdx) => {
                          const on = t.dayOfWeek.includes(dayIdx);
                          return (
                            <button
                              key={dayIdx}
                              type="button"
                              disabled={!t.enabled}
                              onClick={() => toggleDay(i, dayIdx)}
                              className={cn(
                                "h-7 w-7 rounded text-xs font-medium transition-colors",
                                on
                                  ? "bg-foreground text-background"
                                  : "border bg-background text-muted-foreground hover:bg-accent",
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={5}
                        disabled={!t.enabled}
                        value={t.durationMin ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          const n = v === "" ? undefined : Math.max(1, Number(v));
                          setTasks((prev) =>
                            prev.map((x, idx) => (idx === i ? { ...x, durationMin: Number.isFinite(n) ? n : undefined } : x)),
                          );
                        }}
                        placeholder="min"
                        className="h-7 w-16 text-xs"
                      />
                      <span>min</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addEmptyTask}
              className="w-full justify-center gap-1.5 border border-dashed border-white/15 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add another task
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(3)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => submit([])} disabled={saving}>
                  Skip tasks
                </Button>
                <Button type="button" onClick={() => submit(tasks)} disabled={saving}>
                  {saving ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

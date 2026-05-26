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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const kinds = pillar === "HEALTH" ? HEALTH_KINDS : MONEY_KINDS;
  const activeKind = kinds.find((x) => x.kind === kind) ?? null;
  const hasSuggestedTasks = kind ? DEFAULT_TASKS[kind].length > 0 : false;

  function reset() {
    setStep(1);
    setKind(null);
    setName("");
    setIcon("");
    setTasks([]);
    setError("");
  }

  function handleKindSelect(k: ActivityKind) {
    setKind(k);
    setIcon(kinds.find((x) => x.kind === k)?.defaultEmoji ?? "");
    setStep(2);
  }

  function handleStep2Continue() {
    if (!name.trim() || !kind) return;
    if (hasSuggestedTasks) {
      const drafts: DraftTask[] = DEFAULT_TASKS[kind].map((d) => ({
        enabled: true,
        title: d.template.replace("{name}", name.trim()),
        frequency: d.frequency,
        dayOfWeek: [...d.dayOfWeek],
        durationMin: d.durationMin,
      }));
      setTasks(drafts);
      setStep(3);
    } else {
      submit([]);
    }
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

  async function submit(taskDrafts: DraftTask[]) {
    if (!kind) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon, kind, pillar }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create activity");
        return;
      }
      const activity: { id: string } = await res.json();

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
        if (failed.length > 0) {
          setError(`Activity created, but ${failed.length} task${failed.length > 1 ? "s" : ""} failed to save.`);
        }
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
            {step === 3 && "Set up daily tasks"}
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
            <div className="space-y-2">
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
                  {saving ? "Saving…" : hasSuggestedTasks ? "Continue" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {step === 3 && kind && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Tasks linked to this activity will show in your calendar — and tick automatically when you log a session.
              Adjust now or skip.
            </p>

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
                      className="h-8 text-sm"
                    />
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

                    {t.durationMin != null && (
                      <span className="text-xs text-muted-foreground">· {t.durationMin} min</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)}>
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Pencil, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { upsertGoal, deleteGoal } from "@/app/(app)/goals/actions";
import { GOAL_METRICS, findMetric } from "@/lib/goalMetrics";

export type Pillar = "HEALTH" | "MONEY";

export type GoalView = {
  id: string;
  pillar: Pillar;
  title: string;
  description: string | null;
  currentValue: number | null;
  targetValue: number | null;
  startValue: number | null;
  unit: string | null;
  targetDate: string | null;
  isActive: boolean;
  metricKey: string | null;
};

type EditorState =
  | { mode: "create"; pillar: Pillar }
  | { mode: "edit"; goal: GoalView }
  | null;

function progressPct(g: GoalView): number | null {
  if (g.currentValue == null || g.targetValue == null) return null;
  const start =
    g.startValue ?? (g.targetValue < g.currentValue ? g.currentValue : 0);
  const span = g.targetValue - start;
  if (span === 0) return g.currentValue === g.targetValue ? 100 : 0;
  const pct = ((g.currentValue - start) / span) * 100;
  return Math.max(0, Math.min(100, pct));
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}

export function GoalsManager({ initialGoals }: { initialGoals: GoalView[] }) {
  const [editor, setEditor] = useState<EditorState>(null);

  const healthGoals = initialGoals.filter((g) => g.pillar === "HEALTH");
  const moneyGoals = initialGoals.filter((g) => g.pillar === "MONEY");

  const editorKey = editor
    ? editor.mode === "edit"
      ? `edit:${editor.goal.id}`
      : `create:${editor.pillar}`
    : "closed";

  return (
    <div className="space-y-8">
      <PillarSection
        pillar="HEALTH"
        goals={healthGoals}
        onAdd={() => setEditor({ mode: "create", pillar: "HEALTH" })}
        onEdit={(g) => setEditor({ mode: "edit", goal: g })}
      />
      <PillarSection
        pillar="MONEY"
        goals={moneyGoals}
        onAdd={() => setEditor({ mode: "create", pillar: "MONEY" })}
        onEdit={(g) => setEditor({ mode: "edit", goal: g })}
      />

      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="sm:max-w-md">
          {editor && (
            <GoalEditorForm
              key={editorKey}
              state={editor}
              onClose={() => setEditor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PillarSection({
  pillar,
  goals,
  onAdd,
  onEdit,
}: {
  pillar: Pillar;
  goals: GoalView[];
  onAdd: () => void;
  onEdit: (g: GoalView) => void;
}) {
  const Icon = pillar === "HEALTH" ? Dumbbell : TrendingUp;
  const label = pillar === "HEALTH" ? "Health" : "Money";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
          No {label.toLowerCase()} goals yet.
        </p>
      ) : (
        <div className="space-y-2">
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g} onEdit={() => onEdit(g)} />
          ))}
        </div>
      )}
    </section>
  );
}

function GoalRow({ goal, onEdit }: { goal: GoalView; onEdit: () => void }) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const pct = progressPct(goal);

  function handleDelete() {
    if (!confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return;
    startDelete(async () => {
      const res = await deleteGoal(goal.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Goal deleted");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        !goal.isActive && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-medium">{goal.title}</p>
            {goal.currentValue != null && goal.targetValue != null && (
              <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatNum(goal.currentValue)} / {formatNum(goal.targetValue)}
                {goal.unit ? ` ${goal.unit}` : ""}
              </p>
            )}
          </div>
          {goal.description && (
            <p className="text-xs text-muted-foreground">{goal.description}</p>
          )}
          {goal.metricKey && (
            <p className="text-[10px] text-emerald-400/80">
              Auto-tracked · {findMetric(goal.metricKey)?.label ?? goal.metricKey}
            </p>
          )}
          {pct !== null && (
            <div className="pt-1">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                {Math.round(pct)}%
                {goal.targetDate ? ` · by ${goal.targetDate}` : ""}
                {!goal.isActive ? " · archived" : ""}
              </p>
            </div>
          )}
          {pct === null && (goal.targetDate || !goal.isActive) && (
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {goal.targetDate ? `by ${goal.targetDate}` : ""}
              {goal.targetDate && !goal.isActive ? " · " : ""}
              {!goal.isActive ? "archived" : ""}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onEdit}
            aria-label="Edit goal"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete goal"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function GoalEditorForm({
  state,
  onClose,
}: {
  state: NonNullable<EditorState>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.goal : null;
  const initialPillar = state.mode === "create" ? state.pillar : state.goal.pillar;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pillar, setPillar] = useState<Pillar>(initialPillar);
  const [metricKey, setMetricKey] = useState<string>(initial?.metricKey ?? "");
  const [currentValue, setCurrentValue] = useState(
    initial?.currentValue != null ? String(initial.currentValue) : "",
  );
  const [targetValue, setTargetValue] = useState(
    initial?.targetValue != null ? String(initial.targetValue) : "",
  );
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const metric = findMetric(metricKey);
  const pillarMetrics = GOAL_METRICS.filter((m) => m.pillar === pillar);

  // If user switches pillar, clear an incompatible metric pick.
  function changePillar(p: Pillar) {
    setPillar(p);
    if (metric && metric.pillar !== p) setMetricKey("");
  }

  function changeMetric(key: string) {
    setMetricKey(key);
    const m = findMetric(key);
    if (m) setUnit(m.unit);
  }

  function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const parseNum = (s: string): number | null => {
      const t = s.trim();
      if (t === "") return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };

    startTransition(async () => {
      const res = await upsertGoal({
        id: isEdit ? initial!.id : undefined,
        pillar,
        title: title.trim(),
        description: description.trim() || null,
        currentValue: parseNum(currentValue),
        targetValue: parseNum(targetValue),
        unit: unit.trim() || null,
        targetDate: targetDate || null,
        isActive,
        metricKey: metricKey || null,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Goal updated" : "Goal added");
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit goal" : "New goal"}</DialogTitle>
        <DialogDescription>
          Track progress toward a measurable target, or just set an intention.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reach 68 kg"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Pillar</Label>
            <div className="flex gap-2">
              {(["HEALTH", "MONEY"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => changePillar(p)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition",
                    pillar === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-input hover:bg-accent",
                  )}
                >
                  {p === "HEALTH" ? "Health" : "Money"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-metric">Track</Label>
            <select
              id="goal-metric"
              value={metricKey}
              onChange={(e) => changeMetric(e.target.value)}
              className="flex h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground"
            >
              <option value="">Custom — I&apos;ll update progress manually</option>
              {pillarMetrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.unit})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              {metric
                ? `Progress updates automatically from your ${metric.hint?.toLowerCase() ?? metric.label.toLowerCase()}.`
                : "You'll type in the current value yourself."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-description">Description (optional)</Label>
            <Textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why does this goal matter?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">Current</Label>
              <Input
                id="goal-current"
                type="number"
                inputMode="decimal"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder={metric ? "Auto" : "—"}
                disabled={!!metric}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-unit">Unit</Label>
              <Input
                id="goal-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, followers, zł…"
                disabled={!!metric}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Active
            </label>
          )}
        </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add goal"}
        </Button>
      </DialogFooter>
    </>
  );
}

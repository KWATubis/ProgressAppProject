"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Pencil, Plus, Trash2, TrendingUp, X, Zap } from "lucide-react";
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
import { LogMetricEntryDialog } from "@/components/metrics/LogMetricEntryDialog";

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
  customMetricId: string | null;
};

export type CustomMetricOption = {
  id: string;
  title: string;
  unit: string;
  aggregation: "LATEST" | "MAX" | "SUM" | "COUNT" | "AVG";
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
  activityName: string;
  pillar: Pillar;
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

export function GoalsManager({
  initialGoals,
  customMetrics,
}: {
  initialGoals: GoalView[];
  customMetrics: CustomMetricOption[];
}) {
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
        customMetrics={customMetrics}
        onAdd={() => setEditor({ mode: "create", pillar: "HEALTH" })}
        onEdit={(g) => setEditor({ mode: "edit", goal: g })}
      />
      <PillarSection
        pillar="MONEY"
        goals={moneyGoals}
        customMetrics={customMetrics}
        onAdd={() => setEditor({ mode: "create", pillar: "MONEY" })}
        onEdit={(g) => setEditor({ mode: "edit", goal: g })}
      />

      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="sm:max-w-md">
          {editor && (
            <GoalEditorForm
              key={editorKey}
              state={editor}
              customMetrics={customMetrics}
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
  customMetrics,
  onAdd,
  onEdit,
}: {
  pillar: Pillar;
  goals: GoalView[];
  customMetrics: CustomMetricOption[];
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
            <GoalRow
              key={g.id}
              goal={g}
              customMetrics={customMetrics}
              onEdit={() => onEdit(g)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GoalRow({
  goal,
  customMetrics,
  onEdit,
}: {
  goal: GoalView;
  customMetrics: CustomMetricOption[];
  onEdit: () => void;
}) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [logOpen, setLogOpen] = useState(false);
  const pct = progressPct(goal);
  const linkedCustomMetric = goal.customMetricId
    ? customMetrics.find((m) => m.id === goal.customMetricId) ?? null
    : null;

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
          {linkedCustomMetric && (
            <p className="text-[10px] text-emerald-400/80">
              Auto-tracked · {linkedCustomMetric.title} ({linkedCustomMetric.aggregation.toLowerCase()})
            </p>
          )}
          {!linkedCustomMetric && goal.metricKey && (
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
          {linkedCustomMetric && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={() => setLogOpen(true)}
              aria-label="Log entry"
            >
              <Zap className="h-3 w-3" />
              Log
            </Button>
          )}
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
      {linkedCustomMetric && (
        <LogMetricEntryDialog
          metric={linkedCustomMetric}
          open={logOpen}
          onOpenChange={setLogOpen}
        />
      )}
    </div>
  );
}

function GoalEditorForm({
  state,
  customMetrics,
  onClose,
}: {
  state: NonNullable<EditorState>;
  customMetrics: CustomMetricOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.goal : null;
  const initialPillar = state.mode === "create" ? state.pillar : state.goal.pillar;

  // "" = manual, "builtin:<key>" = built-in metric, "custom:<id>" = custom metric
  const initialSelection = initial?.customMetricId
    ? `custom:${initial.customMetricId}`
    : initial?.metricKey
      ? `builtin:${initial.metricKey}`
      : "";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pillar, setPillar] = useState<Pillar>(initialPillar);
  const [selection, setSelection] = useState<string>(initialSelection);
  const [currentValue, setCurrentValue] = useState(
    initial?.currentValue != null ? String(initial.currentValue) : "",
  );
  const [targetValue, setTargetValue] = useState(
    initial?.targetValue != null ? String(initial.targetValue) : "",
  );
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const selectedBuiltinKey = selection.startsWith("builtin:")
    ? selection.slice(8)
    : null;
  const selectedCustomId = selection.startsWith("custom:")
    ? selection.slice(7)
    : null;
  const builtinMetric = findMetric(selectedBuiltinKey ?? undefined);
  const customMetric = selectedCustomId
    ? customMetrics.find((m) => m.id === selectedCustomId) ?? null
    : null;
  const hasMetric = !!builtinMetric || !!customMetric;

  const pillarBuiltins = GOAL_METRICS.filter((m) => m.pillar === pillar);
  const pillarCustoms = customMetrics.filter((m) => m.pillar === pillar);

  // If user switches pillar, clear an incompatible metric pick.
  function changePillar(p: Pillar) {
    setPillar(p);
    if (builtinMetric && builtinMetric.pillar !== p) setSelection("");
    if (customMetric && customMetric.pillar !== p) setSelection("");
  }

  function changeSelection(v: string) {
    setSelection(v);
    if (v.startsWith("builtin:")) {
      const m = findMetric(v.slice(8));
      if (m) setUnit(m.unit);
    } else if (v.startsWith("custom:")) {
      const m = customMetrics.find((x) => x.id === v.slice(7));
      if (m) setUnit(m.unit);
    }
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
        currentValue: hasMetric ? null : parseNum(currentValue),
        targetValue: parseNum(targetValue),
        unit: unit.trim() || null,
        targetDate: targetDate || null,
        isActive,
        metricKey: selectedBuiltinKey,
        customMetricId: selectedCustomId,
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
              value={selection}
              onChange={(e) => changeSelection(e.target.value)}
              className="flex h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground"
            >
              <option value="">Manual — I&apos;ll update progress myself</option>
              {pillarCustoms.length > 0 && (
                <optgroup label="Your custom metrics">
                  {pillarCustoms.map((m) => (
                    <option key={m.id} value={`custom:${m.id}`}>
                      {m.title} · {m.activityName} ({m.unit}, {m.aggregation.toLowerCase()})
                    </option>
                  ))}
                </optgroup>
              )}
              {pillarBuiltins.length > 0 && (
                <optgroup label="Built-in metrics">
                  {pillarBuiltins.map((m) => (
                    <option key={m.key} value={`builtin:${m.key}`}>
                      {m.label} ({m.unit})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-[11px] text-muted-foreground">
              {customMetric
                ? `Auto-updates from the ${customMetric.aggregation.toLowerCase()} of your "${customMetric.title}" entries.`
                : builtinMetric
                  ? `Progress updates automatically from your ${builtinMetric.hint?.toLowerCase() ?? builtinMetric.label.toLowerCase()}.`
                  : "Custom metrics are created from an activity page. Here you can pick one you've already defined."}
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
                placeholder={hasMetric ? "Auto" : "—"}
                disabled={hasMetric}
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
                disabled={hasMetric}
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

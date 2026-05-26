"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { upsertGoal, deleteGoal } from "@/app/(app)/goals/actions";
import { metricsForActivity, type ActivityKind } from "@/lib/goalMetrics";

type Pillar = "HEALTH" | "MONEY";

export type ActivityGoalData = {
  id: string;
  title: string;
  description: string | null;
  currentValue: number | null;
  targetValue: number | null;
  startValue: number | null;
  unit: string | null;
  metricKey: string | null;
  targetDate: string | null;
};

function progressPct(start: number | null, current: number | null, target: number | null): number {
  if (current == null || target == null) return 0;
  const s = start ?? (target < current ? current : 0);
  const range = target - s;
  if (range === 0) return current >= target ? 100 : 0;
  const pct = ((current - s) / range) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function ActivityGoalCard({
  goal,
  activityTypeId,
  activityName,
  pillar,
  kind,
  color,
}: {
  goal: ActivityGoalData | null;
  activityTypeId: string;
  activityName: string;
  pillar: Pillar;
  kind: ActivityKind;
  color: string | null;
}) {
  const [open, setOpen] = useState(false);
  const metricOptions = metricsForActivity(pillar, kind);

  if (!goal) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">No goal yet for {activityName}</p>
            <p className="text-xs text-muted-foreground">
              Give this activity a point. What are you chasing?
            </p>
          </div>
          <GoalDialog
            open={open}
            onOpenChange={setOpen}
            activityTypeId={activityTypeId}
            pillar={pillar}
            metricOptions={metricOptions}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Set goal
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const pct = progressPct(goal.startValue, goal.currentValue, goal.targetValue);

  return (
    <div
      className="rounded-xl border bg-card p-5"
      style={color ? { borderColor: `${color}40` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            <span>Goal</span>
          </div>
          <p className="mt-0.5 text-base font-semibold">{goal.title}</p>
          {goal.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <GoalDialog
            open={open}
            onOpenChange={setOpen}
            goal={goal}
            activityTypeId={activityTypeId}
            pillar={pillar}
            metricOptions={metricOptions}
            trigger={
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <DeleteGoalButton goalId={goal.id} title={goal.title} />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-end justify-between text-sm tabular-nums">
          <span className="font-medium">
            {goal.currentValue != null ? goal.currentValue.toLocaleString() : "—"}
            {goal.unit ? ` ${goal.unit}` : ""}
          </span>
          {goal.targetValue != null && (
            <span className="text-muted-foreground">
              / {goal.targetValue.toLocaleString()}
              {goal.unit ? ` ${goal.unit}` : ""}
            </span>
          )}
        </div>
        {goal.targetValue != null && (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: color ?? "white",
              }}
            />
          </div>
        )}
        {goal.metricKey && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Auto-updates from logged data
          </p>
        )}
      </div>
    </div>
  );
}

function GoalDialog({
  goal,
  activityTypeId,
  pillar,
  metricOptions,
  trigger,
  open,
  onOpenChange,
}: {
  goal?: ActivityGoalData;
  activityTypeId: string;
  pillar: Pillar;
  metricOptions: ReturnType<typeof metricsForActivity>;
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!goal;

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [targetValue, setTargetValue] = useState(
    goal?.targetValue != null ? String(goal.targetValue) : "",
  );
  const [currentValue, setCurrentValue] = useState(
    goal?.currentValue != null ? String(goal.currentValue) : "",
  );
  const [unit, setUnit] = useState(goal?.unit ?? "");
  const [metricKey, setMetricKey] = useState(goal?.metricKey ?? "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");

  function reset() {
    setTitle(goal?.title ?? "");
    setDescription(goal?.description ?? "");
    setTargetValue(goal?.targetValue != null ? String(goal.targetValue) : "");
    setCurrentValue(goal?.currentValue != null ? String(goal.currentValue) : "");
    setUnit(goal?.unit ?? "");
    setMetricKey(goal?.metricKey ?? "");
    setTargetDate(goal?.targetDate ?? "");
  }

  function save() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await upsertGoal({
        id: goal?.id,
        pillar,
        title: title.trim(),
        description: description.trim() || null,
        targetValue: targetValue.trim() ? Number(targetValue) : null,
        currentValue: !metricKey && currentValue.trim() ? Number(currentValue) : null,
        unit: unit.trim() || null,
        metricKey: metricKey || null,
        targetDate: targetDate || null,
        activityTypeId,
      });
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(editing ? "Goal updated" : "Goal set");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) reset();
        onOpenChange(v);
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit goal" : "Set goal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={pillar === "MONEY" ? "Hit 10k followers" : "Hold a 30s handstand"}
            />
          </div>

          {metricOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="goal-metric">Track via metric (auto-updates)</Label>
              <select
                id="goal-metric"
                value={metricKey}
                onChange={(e) => {
                  const k = e.target.value;
                  setMetricKey(k);
                  const m = metricOptions.find((x) => x.key === k);
                  if (m) setUnit(m.unit);
                }}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground"
              >
                <option value="">— None (manual progress) —</option>
                {metricOptions.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.unit})
                  </option>
                ))}
              </select>
              {metricKey && (
                <p className="text-[11px] text-muted-foreground">
                  Current value comes from your logged data.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!metricKey && (
              <div className="space-y-1.5">
                <Label htmlFor="goal-current">Current</Label>
                <Input
                  id="goal-current"
                  type="number"
                  inputMode="decimal"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>
            )}
            <div className={cn("space-y-1.5", metricKey && "col-span-2")}>
              <Label htmlFor="goal-target">Target</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
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
                placeholder={pillar === "MONEY" ? "PLN" : "kg"}
                disabled={!!metricKey}
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
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={pending || !title.trim()}>
            {pending ? "Saving…" : editing ? "Save" : "Set goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGoalButton({ goalId, title }: { goalId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await deleteGoal(goalId);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success("Goal deleted");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" />
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete goal &quot;{title}&quot;?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

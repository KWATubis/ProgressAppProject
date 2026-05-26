"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateTask } from "@/app/(app)/tasks/actions";

type Frequency = "DAILY" | "WEEKLY" | "ONE_TIME";
type Pillar = "HEALTH" | "MONEY";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function minutesToTimeStr(min: number | null | undefined): string {
  if (min == null) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeStrToMinutes(s: string): number | null {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export type TaskEditorTask = {
  id: string;
  title: string;
  pillar: Pillar;
  frequency: Frequency;
  dayOfWeek: number[];
  scheduledAt: string | null; // YYYY-MM-DD
  durationMin: number | null;
  startMinute: number | null;
};

/**
 * Add-task button + dialog. When `task` is omitted, opens in create mode and
 * renders an "Add task" trigger button. When `task` is provided, opens in edit
 * mode and lets the parent control visibility via `open` / `onOpenChange`.
 */
export function AddTaskDialog({
  task,
  open: openProp,
  onOpenChange,
  activityTypeId,
  lockedPillar,
}: {
  task?: TaskEditorTask;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When set, every created task is linked to this activity. Pillar is locked. */
  activityTypeId?: string;
  /** Force the pillar (and hide the toggle). Used when adding from an activity page. */
  lockedPillar?: Pillar;
} = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();

  const editing = !!task;
  const pillarLocked = lockedPillar != null;
  const defaultPillar: Pillar = task?.pillar ?? lockedPillar ?? "HEALTH";

  const [title, setTitle] = useState(task?.title ?? "");
  const [pillar, setPillar] = useState<Pillar>(defaultPillar);
  const [frequency, setFrequency] = useState<Frequency>(task?.frequency ?? "DAILY");
  const [dayOfWeek, setDayOfWeek] = useState<number[]>(task?.dayOfWeek ?? []);
  const [scheduledAt, setScheduledAt] = useState<string>(task?.scheduledAt ?? "");
  const [durationMin, setDurationMin] = useState<string>(
    task?.durationMin != null ? String(task.durationMin) : "",
  );
  const [startTime, setStartTime] = useState<string>(minutesToTimeStr(task?.startMinute));

  // Re-sync form state whenever we open in edit mode with a different task.
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setPillar(task?.pillar ?? lockedPillar ?? "HEALTH");
    setFrequency(task?.frequency ?? "DAILY");
    setDayOfWeek(task?.dayOfWeek ?? []);
    setScheduledAt(task?.scheduledAt ?? "");
    setDurationMin(task?.durationMin != null ? String(task.durationMin) : "");
    setStartTime(minutesToTimeStr(task?.startMinute));
  }, [open, task, lockedPillar]);

  function resetCreate() {
    setTitle("");
    setPillar(lockedPillar ?? "HEALTH");
    setFrequency("DAILY");
    setDayOfWeek([]);
    setScheduledAt("");
    setDurationMin("");
    setStartTime("");
  }

  function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (frequency === "WEEKLY" && dayOfWeek.length === 0) {
      toast.error("Pick at least one weekday");
      return;
    }
    if (frequency === "ONE_TIME" && !scheduledAt) {
      toast.error("Pick a date");
      return;
    }

    const parsedDuration = durationMin.trim() ? Number(durationMin) : null;
    const parsedStart = timeStrToMinutes(startTime);

    if (editing && task) {
      startTransition(async () => {
        const res = await updateTask({
          taskId: task.id,
          title: title.trim(),
          pillar,
          frequency,
          dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : [],
          scheduledAt: frequency === "ONE_TIME" ? scheduledAt : null,
          durationMin: parsedDuration,
          startMinute: parsedStart,
        });
        if ("error" in res) {
          toast.error(res.error);
        } else {
          toast.success("Task updated");
          setOpen(false);
          router.refresh();
        }
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            pillar,
            frequency,
            dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : [],
            scheduledAt: frequency === "ONE_TIME" ? scheduledAt : null,
            durationMin: parsedDuration,
            startMinute: parsedStart,
            activityTypeId: activityTypeId ?? null,
          }),
        });
        if (!res.ok) {
          let msg = "Failed to create task";
          try {
            const data = (await res.json()) as { error?: string };
            if (data.error) msg = data.error;
          } catch {
            // non-JSON body (e.g. HTML 500 page) — keep the generic message
          }
          throw new Error(msg);
        }
        toast.success("Task added");
        resetCreate();
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create task");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editing && (
        <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
          <Plus className="h-4 w-4" />
          Add task
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update title, schedule, duration, or start time."
              : "Add a recurring habit or a one-off task."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 30 min mobility"
              autoFocus
            />
          </div>

          {!pillarLocked && (
            <div className="space-y-1.5">
              <Label>Pillar</Label>
              <div className="flex gap-2">
                {(["HEALTH", "MONEY"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPillar(p)}
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
          )}

          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <div className="flex gap-2">
              {(
                [
                  { v: "DAILY", l: "Daily" },
                  { v: "WEEKLY", l: "Weekly" },
                  { v: "ONE_TIME", l: "Once" },
                ] as const
              ).map((f) => (
                <button
                  key={f.v}
                  type="button"
                  onClick={() => setFrequency(f.v)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition",
                    frequency === f.v
                      ? "border-foreground bg-foreground text-background"
                      : "border-input hover:bg-accent",
                  )}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {frequency === "WEEKLY" && (
            <div className="space-y-1.5">
              <Label>Days</Label>
              <div className="flex gap-1">
                {DAYS.map((d, i) => {
                  const active = dayOfWeek.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setDayOfWeek((prev) =>
                          prev.includes(i)
                            ? prev.filter((x) => x !== i)
                            : [...prev, i].sort((a, b) => a - b),
                        )
                      }
                      className={cn(
                        "h-8 w-8 rounded text-xs font-semibold transition",
                        active
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {frequency === "ONE_TIME" && (
            <div className="space-y-1.5">
              <Label htmlFor="task-date">Date</Label>
              <Input
                id="task-date"
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">Start time</Label>
              <Input
                id="task-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-duration">Duration (min)</Label>
              <Input
                id="task-duration"
                type="number"
                inputMode="numeric"
                min={1}
                step={5}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? (editing ? "Saving…" : "Adding…") : editing ? "Save" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Dumbbell, Pencil, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { TaskCard, formatDuration, type CalendarTask } from "./TaskCard";
import { AddTaskDialog, type TaskEditorTask } from "./AddTaskDialog";
import { cn } from "@/lib/utils";
import {
  moveTask,
  deleteTask,
  skipTaskForDate,
} from "@/app/(app)/tasks/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const START_HOUR = 5;
const END_HOUR = 24;
const PX_PER_HOUR = 50;
const TIMELINE_HEIGHT_PX = (END_HOUR - START_HOUR) * PX_PER_HOUR;
const MIN_TASK_HEIGHT_PX = 26;

function timeLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function taskTopPx(startMin: number): number {
  return Math.max(0, ((startMin - START_HOUR * 60) / 60) * PX_PER_HOUR);
}

function taskHeightPx(durationMin: number | null): number {
  const dur = durationMin ?? 30;
  return Math.max((dur / 60) * PX_PER_HOUR, MIN_TASK_HEIGHT_PX);
}

export type WeekDay = {
  iso: string; // YYYY-MM-DD
  label: string; // Mon
  dayNum: number; // 15
  isToday: boolean;
  dayOfWeek: number; // 0=Sun
  tasks: CalendarTask[];
};

type DragPayload = {
  taskId: string;
  fromIso: string;
  fromDayOfWeek: number;
  frequency: CalendarTask["frequency"];
};

type OptimisticOp =
  | { kind: "delete"; taskId: string }
  | { kind: "skip"; taskId: string; iso: string }
  | { kind: "move"; taskId: string; fromIso: string; toIso: string };

type ConfirmDelete = {
  taskId: string;
  taskTitle: string;
  iso: string;
  frequency: CalendarTask["frequency"];
  dayLabel: string;
};

const DRAG_MIME = "application/x-portion-task";

function applyOptimisticOp(state: WeekDay[], op: OptimisticOp): WeekDay[] {
  if (op.kind === "delete") {
    return state.map((d) => ({
      ...d,
      tasks: d.tasks.filter((t) => t.id !== op.taskId),
    }));
  }
  if (op.kind === "skip") {
    return state.map((d) =>
      d.iso !== op.iso ? d : { ...d, tasks: d.tasks.filter((t) => t.id !== op.taskId) },
    );
  }
  // move: pluck the task off the source day, attach to the target day.
  let plucked: CalendarTask | undefined;
  const next = state.map((d) => {
    if (d.iso !== op.fromIso) return d;
    const idx = d.tasks.findIndex((t) => t.id === op.taskId);
    if (idx < 0) return d;
    plucked = d.tasks[idx];
    return { ...d, tasks: d.tasks.filter((_, i) => i !== idx) };
  });
  if (!plucked) return state;
  return next.map((d) => {
    if (d.iso !== op.toIso) return d;
    // If task already shows on the target (WEEKLY with overlapping days), skip.
    if (d.tasks.some((t) => t.id === op.taskId)) return d;
    return { ...d, tasks: [...d.tasks, plucked!] };
  });
}

export function TaskCalendarView({
  days,
  weekLabel,
  prevWeek,
  nextWeek,
  currentWeek,
}: {
  days: WeekDay[];
  weekLabel: string;
  prevWeek: string;
  nextWeek: string;
  currentWeek: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CalendarTask["status"]>>({});
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [dropHover, setDropHover] = useState<string | null>(null); // ISO of day being hovered or "trash"
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null);
  const [editing, setEditing] = useState<TaskEditorTask | null>(null);
  const [optimisticDays, applyOp] = useOptimistic(days, applyOptimisticOp);

  function openEditor(task: CalendarTask) {
    setEditing({
      id: task.id,
      title: task.title,
      pillar: task.pillar,
      frequency: task.frequency,
      dayOfWeek: task.dayOfWeek,
      scheduledAt: task.scheduledAt,
      durationMin: task.durationMin,
      startMinute: task.startMinute,
    });
  }

  function statusKey(dateISO: string, taskId: string) {
    return `${dateISO}::${taskId}`;
  }

  function toggle(dateISO: string, task: CalendarTask) {
    const key = statusKey(dateISO, task.id);
    const current = statusOverrides[key] ?? task.status;
    const next: CalendarTask["status"] = current === "COMPLETE" ? "PENDING" : "COMPLETE";

    setStatusOverrides((prev) => ({ ...prev, [key]: next }));

    startTransition(async () => {
      try {
        const res = await fetch("/api/task-logs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id, date: dateISO, status: next }),
        });
        if (!res.ok) throw new Error(await res.text());
      } catch (e) {
        setStatusOverrides((prev) => ({ ...prev, [key]: current }));
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  function go(week: string) {
    router.push(`/tasks?week=${week}`);
  }

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    task: CalendarTask,
    day: WeekDay,
  ) {
    const payload: DragPayload = {
      taskId: task.id,
      fromIso: day.iso,
      fromDayOfWeek: day.dayOfWeek,
      frequency: task.frequency,
    };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    setDrag(payload);
  }

  function handleDragEnd() {
    setDrag(null);
    setDropHover(null);
  }

  function handleDayDragOver(e: React.DragEvent<HTMLDivElement>, day: WeekDay) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    if (drag?.fromIso === day.iso) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropHover(day.iso);
  }

  function handleDayDragLeave(e: React.DragEvent<HTMLDivElement>, day: WeekDay) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropHover((h) => (h === day.iso ? null : h));
  }

  function parseDragPayload(e: React.DragEvent): DragPayload | null {
    try {
      const raw = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData("text/plain");
      return raw ? (JSON.parse(raw) as DragPayload) : drag;
    } catch {
      return drag;
    }
  }

  function handleDayDrop(e: React.DragEvent<HTMLDivElement>, day: WeekDay) {
    e.preventDefault();
    setDropHover(null);
    const payload = parseDragPayload(e);
    if (!payload || day.iso === payload.fromIso) {
      setDrag(null);
      return;
    }

    if (payload.frequency === "DAILY") {
      toast.info("Daily tasks run every day — nothing to move.");
      setDrag(null);
      return;
    }

    const input: Parameters<typeof moveTask>[0] = { taskId: payload.taskId };
    if (payload.frequency === "WEEKLY") {
      input.moveFromDay = payload.fromDayOfWeek;
      input.moveToDay = day.dayOfWeek;
    } else if (payload.frequency === "ONE_TIME") {
      input.scheduledAt = day.iso;
    }

    setDrag(null);

    startTransition(async () => {
      applyOp({ kind: "move", taskId: payload.taskId, fromIso: payload.fromIso, toIso: day.iso });
      const res = await moveTask(input);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleTrashDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropHover("trash");
  }

  function handleTrashDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropHover((h) => (h === "trash" ? null : h));
  }

  function handleTrashDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropHover(null);
    const payload = parseDragPayload(e);
    setDrag(null);
    if (!payload) return;

    // Look up against the currently rendered (optimistic) state so a rapid
    // move-then-trash sequence still finds the task at the spot the user sees.
    const sourceDay = optimisticDays.find((d) => d.iso === payload.fromIso);
    const task = sourceDay?.tasks.find((t) => t.id === payload.taskId);
    if (!task || !sourceDay) return;

    setConfirmDelete({
      taskId: task.id,
      taskTitle: task.title,
      iso: sourceDay.iso,
      frequency: task.frequency,
      dayLabel: sourceDay.isToday ? "today" : sourceDay.label,
    });
  }

  function handleSkipDay(target: ConfirmDelete) {
    setConfirmDelete(null);
    startTransition(async () => {
      applyOp({ kind: "skip", taskId: target.taskId, iso: target.iso });
      const res = await skipTaskForDate({ taskId: target.taskId, date: target.iso });
      if ("error" in res) {
        toast.error(res.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDeleteAll(target: ConfirmDelete) {
    setConfirmDelete(null);
    startTransition(async () => {
      applyOp({ kind: "delete", taskId: target.taskId });
      const res = await deleteTask(target.taskId);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{weekLabel}</h2>
          <p className="text-xs text-muted-foreground">
            Click to toggle, double-click (or use the pencil) to edit. Drag onto another day to move it, or onto the trash to delete.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(prevWeek)}
            className="rounded-md border p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(currentWeek)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => go(nextWeek)}
            className="rounded-md border p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1">
        <div />
        {optimisticDays.map((day) => {
          const totalMin = day.tasks.reduce(
            (sum, t) => sum + (t.durationMin ?? 0),
            0,
          );
          return (
            <div
              key={`h-${day.iso}`}
              className={cn(
                "flex flex-col gap-0.5 rounded-md border bg-card px-2 py-1.5",
                day.isToday && "border-foreground/40 ring-1 ring-foreground/10",
              )}
            >
              <div className="flex items-baseline justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {day.label}
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    day.isToday && "text-foreground",
                  )}
                >
                  {day.dayNum}
                </div>
              </div>
              {totalMin > 0 && (
                <div className="text-[9px] tabular-nums text-muted-foreground/70">
                  {formatDuration(totalMin)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline: time axis + 7 day columns */}
      <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1">
        {/* Hour labels */}
        <div className="relative" style={{ height: TIMELINE_HEIGHT_PX }}>
          {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground/70"
              style={{ top: i * PX_PER_HOUR }}
            >
              {String(START_HOUR + i).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {optimisticDays.map((day) => {
          const isHover = dropHover === day.iso;
          const isSource = drag?.fromIso === day.iso;
          const timedTasks = day.tasks.filter((t) => t.startMinute != null);
          return (
            <div
              key={day.iso}
              onDragOver={(e) => handleDayDragOver(e, day)}
              onDragLeave={(e) => handleDayDragLeave(e, day)}
              onDrop={(e) => handleDayDrop(e, day)}
              className={cn(
                "relative rounded-md border bg-card transition",
                day.isToday && "border-foreground/40 ring-1 ring-foreground/10",
                isHover && "border-emerald-400/70 bg-emerald-400/5 ring-1 ring-emerald-400/40",
                drag && !isSource && !isHover && "border-dashed",
              )}
              style={{ height: TIMELINE_HEIGHT_PX }}
            >
              {/* Hour grid lines */}
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute inset-x-0 border-t border-foreground/5"
                  style={{ top: (i + 1) * PX_PER_HOUR }}
                />
              ))}
              {/* Timed tasks */}
              {timedTasks.map((t) => {
                const key = statusKey(day.iso, t.id);
                const status = statusOverrides[key] ?? t.status;
                const done = status === "COMPLETE";
                const beingDragged =
                  drag?.taskId === t.id && drag?.fromIso === day.iso;
                const Icon = t.pillar === "HEALTH" ? Dumbbell : TrendingUp;
                const accent =
                  t.pillar === "HEALTH"
                    ? "border-emerald-300/50 bg-emerald-50/95 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/40 dark:text-emerald-100"
                    : "border-amber-300/50 bg-amber-50/95 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/40 dark:text-amber-100";
                const endMin = t.startMinute! + (t.durationMin ?? 0);
                return (
                  <div
                    key={`${day.iso}-${t.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t, day)}
                    onDragEnd={handleDragEnd}
                    onDoubleClick={() => openEditor(t)}
                    style={{
                      top: taskTopPx(t.startMinute!),
                      height: taskHeightPx(t.durationMin),
                    }}
                    className={cn(
                      "group absolute inset-x-0.5 flex cursor-grab flex-col gap-0.5 overflow-hidden rounded-md border px-1.5 py-1 text-[11px] shadow-sm active:cursor-grabbing",
                      accent,
                      done && "opacity-60",
                      beingDragged && "opacity-30",
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(day.iso, t);
                        }}
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition",
                          done
                            ? "border-current bg-current/80"
                            : "border-current/40 hover:border-current",
                        )}
                        aria-label={done ? "Mark incomplete" : "Mark complete"}
                      >
                        {done && (
                          <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />
                        )}
                      </button>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate font-medium",
                          done && "line-through",
                        )}
                      >
                        {t.title}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditor(t);
                        }}
                        className="shrink-0 opacity-0 transition group-hover:opacity-80 hover:opacity-100"
                        aria-label="Edit task"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    {taskHeightPx(t.durationMin) >= 36 && (
                      <div className="flex items-center gap-1 text-[9px] tabular-nums opacity-70">
                        <Icon className="h-2.5 w-2.5" />
                        {timeLabel(t.startMinute!)}
                        {t.durationMin != null && <> – {timeLabel(endMin)}</>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Unscheduled tray */}
      <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1">
        <div className="text-right text-[9px] uppercase tracking-wider text-muted-foreground/70">
          unscheduled
        </div>
        {optimisticDays.map((day) => {
          const untimed = day.tasks.filter((t) => t.startMinute == null);
          const isHover = dropHover === day.iso;
          const isSource = drag?.fromIso === day.iso;
          return (
            <div
              key={`u-${day.iso}`}
              onDragOver={(e) => handleDayDragOver(e, day)}
              onDragLeave={(e) => handleDayDragLeave(e, day)}
              onDrop={(e) => handleDayDrop(e, day)}
              className={cn(
                "min-h-[60px] rounded-md border bg-card/40 p-1 transition",
                isHover && "border-emerald-400/70 bg-emerald-400/5 ring-1 ring-emerald-400/40",
                drag && !isSource && !isHover && "border-dashed",
              )}
            >
              {untimed.length === 0 ? (
                <div className="px-1 py-1 text-[10px] text-muted-foreground/40">—</div>
              ) : (
                <div className="space-y-1">
                  {untimed.map((t) => {
                    const key = statusKey(day.iso, t.id);
                    const effective = { ...t, status: statusOverrides[key] ?? t.status };
                    const beingDragged =
                      drag?.taskId === t.id && drag?.fromIso === day.iso;
                    return (
                      <TaskCard
                        key={`u-${day.iso}-${t.id}`}
                        task={effective}
                        onToggle={() => toggle(day.iso, t)}
                        onDragStart={(e) => handleDragStart(e, t, day)}
                        onDragEnd={handleDragEnd}
                        onEdit={() => openEditor(t)}
                        isDragging={beingDragged}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating trash zone — fixed at bottom-centre while a drag is active */}
      {drag && (
        <div
          onDragOver={handleTrashDragOver}
          onDragLeave={handleTrashDragLeave}
          onDrop={handleTrashDrop}
          className={cn(
            "fixed bottom-8 left-1/2 z-50 -translate-x-1/2",
            "flex items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-4",
            "bg-card/90 backdrop-blur-sm shadow-2xl",
            "transition-all duration-150 select-none",
            dropHover === "trash"
              ? "scale-110 border-destructive bg-destructive/20 text-destructive shadow-destructive/20"
              : "border-destructive/50 text-destructive/70",
          )}
        >
          <span className="text-3xl leading-none">🗑️</span>
          <span className="text-sm font-medium">Drop to delete</span>
        </div>
      )}

      {pending && (
        <div className="text-xs text-muted-foreground">Saving…</div>
      )}

      <AddTaskDialog
        task={editing ?? undefined}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent>
          {confirmDelete && (
            <>
              <DialogHeader>
                <DialogTitle>Delete &ldquo;{confirmDelete.taskTitle}&rdquo;?</DialogTitle>
                <DialogDescription>
                  {confirmDelete.frequency === "ONE_TIME"
                    ? "This task is scheduled for one day only — deleting removes it permanently."
                    : confirmDelete.frequency === "DAILY"
                      ? `This task runs every day. Skip just ${confirmDelete.dayLabel}, or delete it from every day going forward?`
                      : `This task is scheduled weekly. Skip just this ${confirmDelete.dayLabel}, or delete it from every week going forward?`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </Button>
                {confirmDelete.frequency !== "ONE_TIME" && (
                  <Button
                    variant="secondary"
                    onClick={() => handleSkipDay(confirmDelete)}
                  >
                    Skip {confirmDelete.dayLabel}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteAll(confirmDelete)}
                >
                  Delete task
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

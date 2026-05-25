"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { TaskCard, type CalendarTask } from "./TaskCard";
import { cn } from "@/lib/utils";
import { moveTask, deleteTask } from "@/app/(app)/tasks/actions";

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
  | { kind: "move"; taskId: string; fromIso: string; toIso: string };

const DRAG_MIME = "application/x-portion-task";

function applyOptimisticOp(state: WeekDay[], op: OptimisticOp): WeekDay[] {
  if (op.kind === "delete") {
    return state.map((d) => ({
      ...d,
      tasks: d.tasks.filter((t) => t.id !== op.taskId),
    }));
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
  const [optimisticDays, applyOp] = useOptimistic(days, applyOptimisticOp);

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
    if (!payload) return;
    const taskId = payload.taskId;
    setDrag(null);

    startTransition(async () => {
      applyOp({ kind: "delete", taskId });
      const res = await deleteTask(taskId);
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
            Click a task to toggle it. Drag to move it to another day, or drop on the trash to delete.
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

      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {optimisticDays.map((day) => {
          const isHover = dropHover === day.iso;
          const isSource = drag?.fromIso === day.iso;
          return (
            <div
              key={day.iso}
              onDragOver={(e) => handleDayDragOver(e, day)}
              onDragLeave={(e) => handleDayDragLeave(e, day)}
              onDrop={(e) => handleDayDrop(e, day)}
              className={cn(
                "min-h-[180px] rounded-lg border bg-card p-2 transition",
                day.isToday && "border-foreground/40 ring-1 ring-foreground/10",
                isHover && "border-emerald-400/70 bg-emerald-400/5 ring-1 ring-emerald-400/40",
                drag && !isSource && !isHover && "border-dashed",
              )}
            >
              <div className="mb-2 flex items-baseline justify-between px-1">
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
              <div className="space-y-1.5">
                {day.tasks.length === 0 ? (
                  <div className="px-1 py-2 text-[11px] text-muted-foreground/60">No tasks</div>
                ) : (
                  day.tasks.map((t) => {
                    const key = statusKey(day.iso, t.id);
                    const effective = { ...t, status: statusOverrides[key] ?? t.status };
                    const beingDragged =
                      drag?.taskId === t.id && drag?.fromIso === day.iso;
                    return (
                      <TaskCard
                        key={`${day.iso}-${t.id}`}
                        task={effective}
                        onToggle={() => toggle(day.iso, t)}
                        onDragStart={(e) => handleDragStart(e, t, day)}
                        onDragEnd={handleDragEnd}
                        isDragging={beingDragged}
                      />
                    );
                  })
                )}
              </div>
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
    </div>
  );
}

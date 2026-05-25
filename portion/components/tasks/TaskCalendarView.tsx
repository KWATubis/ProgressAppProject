"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TaskCard, type CalendarTask } from "./TaskCard";
import { cn } from "@/lib/utils";

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

const DRAG_MIME = "application/x-portion-task";

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
    setDrag(payload);
  }

  function handleDragEnd() {
    setDrag(null);
    setDropHover(null);
  }

  function handleDayDragOver(e: React.DragEvent<HTMLDivElement>, day: WeekDay) {
    if (!drag) return;
    if (day.iso === drag.fromIso) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropHover(day.iso);
  }

  function handleDayDragLeave(day: WeekDay) {
    setDropHover((h) => (h === day.iso ? null : h));
  }

  function handleDayDrop(e: React.DragEvent<HTMLDivElement>, day: WeekDay) {
    e.preventDefault();
    setDropHover(null);
    if (!drag || day.iso === drag.fromIso) {
      setDrag(null);
      return;
    }

    if (drag.frequency === "DAILY") {
      toast.info("Daily tasks run every day — nothing to move.");
      setDrag(null);
      return;
    }

    const body: Record<string, unknown> = {};
    if (drag.frequency === "WEEKLY") {
      body.moveFromDay = drag.fromDayOfWeek;
      body.moveToDay = day.dayOfWeek;
    } else if (drag.frequency === "ONE_TIME") {
      body.scheduledAt = day.iso;
    }

    const taskId = drag.taskId;
    setDrag(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Task moved");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to move task");
      }
    });
  }

  function handleTrashDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropHover("trash");
  }

  function handleTrashDragLeave() {
    setDropHover((h) => (h === "trash" ? null : h));
  }

  function handleTrashDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropHover(null);
    if (!drag) return;
    const taskId = drag.taskId;
    setDrag(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Task deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete task");
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
        {days.map((day) => {
          const isHover = dropHover === day.iso;
          const isSource = drag?.fromIso === day.iso;
          return (
            <div
              key={day.iso}
              onDragOver={(e) => handleDayDragOver(e, day)}
              onDragLeave={() => handleDayDragLeave(day)}
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

      {/* Trash zone — only shown while a drag is in progress. */}
      <div
        onDragOver={handleTrashDragOver}
        onDragLeave={handleTrashDragLeave}
        onDrop={handleTrashDrop}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive transition-all",
          drag ? "opacity-100" : "pointer-events-none h-0 -m-1 opacity-0 overflow-hidden border-0 p-0",
          dropHover === "trash" && "border-destructive/80 bg-destructive/15 ring-1 ring-destructive/40",
        )}
      >
        <Trash2 className="h-4 w-4" />
        Drop here to delete
      </div>

      {pending && (
        <div className="text-xs text-muted-foreground">Saving…</div>
      )}
    </div>
  );
}

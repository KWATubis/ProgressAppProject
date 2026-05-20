"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { TaskCard, type CalendarTask } from "./TaskCard";
import { cn } from "@/lib/utils";

export type WeekDay = {
  iso: string; // YYYY-MM-DD
  label: string; // Mon
  dayNum: number; // 15
  isToday: boolean;
  tasks: CalendarTask[];
};

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
  const [overrides, setOverrides] = useState<Record<string, CalendarTask["status"]>>({});

  function statusKey(dateISO: string, taskId: string) {
    return `${dateISO}::${taskId}`;
  }

  function toggle(dateISO: string, task: CalendarTask) {
    const key = statusKey(dateISO, task.id);
    const current = overrides[key] ?? task.status;
    const next: CalendarTask["status"] = current === "COMPLETE" ? "PENDING" : "COMPLETE";

    setOverrides((prev) => ({ ...prev, [key]: next }));

    startTransition(async () => {
      try {
        const res = await fetch("/api/task-logs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id, date: dateISO, status: next }),
        });
        if (!res.ok) throw new Error(await res.text());
      } catch (e) {
        setOverrides((prev) => ({ ...prev, [key]: current }));
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  function go(week: string) {
    router.push(`/tasks?week=${week}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{weekLabel}</h2>
          <p className="text-xs text-muted-foreground">Click a task to toggle it for that day.</p>
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
        {days.map((day) => (
          <div
            key={day.iso}
            className={cn(
              "min-h-[180px] rounded-lg border bg-card p-2",
              day.isToday && "border-foreground/40 ring-1 ring-foreground/10",
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
                  const effective = { ...t, status: overrides[key] ?? t.status };
                  return (
                    <TaskCard
                      key={`${day.iso}-${t.id}`}
                      task={effective}
                      onToggle={() => toggle(day.iso, t)}
                    />
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {pending && (
        <div className="text-xs text-muted-foreground">Saving…</div>
      )}
    </div>
  );
}

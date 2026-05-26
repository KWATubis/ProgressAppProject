"use client";

import { useState, useTransition } from "react";
import { Check, Circle, Dumbbell, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type TodayTask = {
  id: string;
  title: string;
  pillar: "HEALTH" | "MONEY";
  status: "PENDING" | "COMPLETE" | "SKIPPED";
  activityColor?: string | null;
};

export function TodayTaskList({
  initial,
  dateISO,
}: {
  initial: TodayTask[];
  dateISO: string;
}) {
  const [tasks, setTasks] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle(taskId: string) {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;
    const nextStatus = current.status === "COMPLETE" ? "PENDING" : "COMPLETE";

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    );

    startTransition(async () => {
      try {
        const res = await fetch("/api/task-logs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, date: dateISO, status: nextStatus }),
        });
        if (!res.ok) throw new Error(await res.text());
      } catch (e) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: current.status } : t)),
        );
        toast.error(e instanceof Error ? e.message : "Failed to update task");
      }
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
        Nothing scheduled today. Enjoy the rest.
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {tasks.map((t) => {
        const done = t.status === "COMPLETE";
        const Icon = t.pillar === "HEALTH" ? Dumbbell : TrendingUp;
        const accent = t.pillar === "HEALTH" ? "text-emerald-500" : "text-amber-500";
        return (
          <li key={t.id} className="relative">
            {t.activityColor && (
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: t.activityColor }}
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => toggle(t.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/40"
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                  done
                    ? "border-foreground bg-foreground text-background"
                    : "border-muted-foreground/40 text-transparent hover:border-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-3 w-3" />}
              </span>
              <Icon
                className={cn("h-3.5 w-3.5 shrink-0", !t.activityColor && accent)}
                style={t.activityColor ? { color: t.activityColor } : undefined}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  done && "text-muted-foreground line-through",
                )}
              >
                {t.title}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

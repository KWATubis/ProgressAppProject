"use client";

import { Check, Dumbbell, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarTask = {
  id: string;
  title: string;
  pillar: "HEALTH" | "MONEY";
  frequency: "DAILY" | "WEEKLY" | "ONE_TIME";
  status: "PENDING" | "COMPLETE" | "SKIPPED";
};

const FREQ_LABEL: Record<CalendarTask["frequency"], string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  ONE_TIME: "Once",
};

export function TaskCard({
  task,
  onToggle,
}: {
  task: CalendarTask;
  onToggle: () => void;
}) {
  const done = task.status === "COMPLETE";
  const Icon = task.pillar === "HEALTH" ? Dumbbell : TrendingUp;
  const accent =
    task.pillar === "HEALTH"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100"
      : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition hover:shadow-sm",
        accent,
        done && "opacity-60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition",
          done
            ? "border-current bg-current/80"
            : "border-current/40 group-hover:border-current",
        )}
      >
        {done && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-medium", done && "line-through")}>
          {task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-70">
          <Icon className="h-2.5 w-2.5" />
          {FREQ_LABEL[task.frequency]}
        </span>
      </span>
    </button>
  );
}

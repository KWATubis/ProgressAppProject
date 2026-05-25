"use client";

import { Check, Clock, Dumbbell, GripVertical, Pencil, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarTask = {
  id: string;
  title: string;
  pillar: "HEALTH" | "MONEY";
  frequency: "DAILY" | "WEEKLY" | "ONE_TIME";
  status: "PENDING" | "COMPLETE" | "SKIPPED";
  durationMin: number | null;
  startMinute: number | null;
  dayOfWeek: number[];
  scheduledAt: string | null;
};

const FREQ_LABEL: Record<CalendarTask["frequency"], string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  ONE_TIME: "Once",
};

export function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function TaskCard({
  task,
  onToggle,
  onEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  isReorderTarget,
  draggable = true,
}: {
  task: CalendarTask;
  onToggle: () => void;
  onEdit?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  isReorderTarget?: boolean;
  draggable?: boolean;
}) {
  const done = task.status === "COMPLETE";
  const Icon = task.pillar === "HEALTH" ? Dumbbell : TrendingUp;
  const accent =
    task.pillar === "HEALTH"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100"
      : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDoubleClick={onEdit}
      className={cn(
        "group relative flex w-full items-start gap-1.5 rounded-md border px-1.5 py-1.5 text-left text-xs transition hover:shadow-sm",
        accent,
        done && "opacity-60",
        isDragging && "opacity-30",
        isReorderTarget && "before:absolute before:-top-1 before:left-0 before:right-0 before:h-0.5 before:rounded-full before:bg-foreground/70",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      {draggable && (
        <GripVertical className="mt-0.5 h-3 w-3 shrink-0 opacity-30 group-hover:opacity-70" />
      )}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition",
          done
            ? "border-current bg-current/80"
            : "border-current/40 hover:border-current",
        )}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        {done && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="min-w-0 flex-1 text-left"
      >
        <span className={cn("block truncate font-medium", done && "line-through")}>
          {task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-70">
          <Icon className="h-2.5 w-2.5" />
          {FREQ_LABEL[task.frequency]}
          {task.durationMin != null && (
            <>
              <span aria-hidden>·</span>
              <Clock className="h-2.5 w-2.5" />
              <span className="normal-case tracking-normal">
                {formatDuration(task.durationMin)}
              </span>
            </>
          )}
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="shrink-0 self-start p-0.5 opacity-0 transition group-hover:opacity-70 hover:opacity-100"
          aria-label="Edit task"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

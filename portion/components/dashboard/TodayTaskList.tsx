"use client";

import { useState, useTransition } from "react";
import { Dumbbell, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type TodayTask = {
  id: string;
  title: string;
  pillar: "HEALTH" | "MONEY";
  status: "PENDING" | "COMPLETE" | "SKIPPED";
  activityColor?: string | null;
};

/** Animated check — draws the tick in, pops on completion, pulses a glow ring. */
function CheckCircle({ done, pop }: { done: boolean; pop: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={cn(
        "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        done ? "border-foreground bg-foreground" : "border-muted-foreground/40",
      )}
      animate={pop && !reduce ? { scale: [1, 1.28, 1] } : { scale: 1 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3 text-background"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M3.5 8.5 L6.5 11 L12.5 4.5"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
        />
      </svg>
      {pop && !reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0.55, scale: 1 }}
          animate={{ opacity: 0, scale: 2.1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.45)" }}
        />
      )}
    </motion.span>
  );
}

export function TodayTaskList({
  initial,
  dateISO,
}: {
  initial: TodayTask[];
  dateISO: string;
}) {
  const [tasks, setTasks] = useState(initial);
  const [popId, setPopId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === "COMPLETE").length;
  const pct = total ? (doneCount / total) * 100 : 0;

  function toggle(taskId: string) {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;
    const nextStatus = current.status === "COMPLETE" ? "PENDING" : "COMPLETE";

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    );

    if (nextStatus === "COMPLETE") {
      setPopId(taskId);
      window.setTimeout(() => setPopId((id) => (id === taskId ? null : id)), 600);
    }

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
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Today&apos;s progress
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{doneCount}</span>/{total}
        </span>
      </div>
      <div className="h-1 w-full bg-white/[0.06]">
        <motion.div
          className="h-full bg-foreground"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
          style={{ boxShadow: pct > 0 ? "0 0 10px rgba(255,255,255,0.35)" : "none" }}
        />
      </div>
      <ul className="divide-y">
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
              <motion.button
                type="button"
                onClick={() => toggle(t.id)}
                whileTap={{ scale: 0.985 }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <CheckCircle done={done} pop={popId === t.id} />
                <Icon
                  className={cn("h-3.5 w-3.5 shrink-0", !t.activityColor && accent)}
                  style={t.activityColor ? { color: t.activityColor } : undefined}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm transition-colors",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

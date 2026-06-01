"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import type { BrokenStreak } from "@/lib/tasks/streaks";

export function StreakRecoveryBanner({ streaks: initial }: { streaks: BrokenStreak[] }) {
  const [streaks, setStreaks] = useState(initial);

  if (streaks.length === 0) return null;

  async function recover(taskId: string, yesterdayISO: string) {
    setStreaks((s) => s.filter((b) => b.task.id !== taskId));
    try {
      const res = await fetch("/api/task-logs/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, dateISO: yesterdayISO }),
      });
      if (!res.ok) throw new Error();
      toast.success("Streak saved. The bricks are still in the wall.");
    } catch {
      toast.error("Failed to recover. Try refreshing.");
    }
  }

  return (
    <div className="space-y-2">
      {streaks.map((b) => (
        <div
          key={b.task.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Flame className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{b.task.title}</p>
              <p className="text-xs text-muted-foreground">
                {b.streak}-day streak — missed yesterday
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => recover(b.task.id, b.yesterdayISO)}
            className="shrink-0 rounded-full border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-500 transition hover:bg-amber-500/10"
          >
            Log it late
          </button>
        </div>
      ))}
    </div>
  );
}

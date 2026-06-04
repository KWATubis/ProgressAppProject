"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_REST_SEC = 120;

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Rest countdown that auto-starts when `endsAt` (epoch ms) is set. Remaining
 * time is derived from Date.now() each tick rather than decremented, so it stays
 * accurate even if the tab is backgrounded/throttled while the phone is pocketed.
 * Buzzes once (vibration) when it reaches zero.
 */
export function RestTimer({
  endsAt,
  onChangeEndsAt,
  onDismiss,
}: {
  endsAt: number | null;
  onChangeEndsAt: (next: number | null) => void;
  onDismiss: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining = endsAt == null ? 0 : Math.max(0, Math.round((endsAt - now) / 1000));
  const done = endsAt != null && remaining === 0;

  // Buzz once when the rest hits zero (re-armed each new rest by the `done` flip).
  useEffect(() => {
    if (!done) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([180, 80, 180]);
    }
  }, [done]);

  if (endsAt == null) return null;

  const total = DEFAULT_REST_SEC;
  const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-lg transition-colors",
        done ? "border-emerald-500/60" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {done ? "Rest over — go" : "Resting"}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Dismiss timer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChangeEndsAt(Math.max(now, endsAt - 15_000))}
          disabled={done}
          className="flex h-12 w-12 items-center justify-center rounded-xl border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          aria-label="Subtract 15 seconds"
        >
          <Minus className="h-5 w-5" />
        </button>

        <span
          className={cn(
            "font-display text-5xl tabular-nums",
            done ? "text-emerald-400" : "text-foreground",
          )}
        >
          {mmss(remaining)}
        </span>

        <button
          type="button"
          onClick={() => onChangeEndsAt(endsAt + 15_000)}
          className="flex h-12 w-12 items-center justify-center rounded-xl border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Add 15 seconds"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all duration-200", done ? "bg-emerald-500" : "bg-foreground")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 w-full rounded-lg py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Skip rest
      </button>
    </div>
  );
}

export { DEFAULT_REST_SEC };

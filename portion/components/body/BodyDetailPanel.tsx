"use client";

import { Heart, Brain, Dumbbell } from "lucide-react";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import { tirednessColor, tirednessLabel } from "@/lib/body/muscle-state";
import type { BodySelection } from "./Humanoid";

export type WellnessTrendPoint = {
  date: string;
  restingHeartRate: number | null;
  totalCalories: number | null;
  sleepSeconds: number | null;
  deepSleepSeconds: number | null;
};

type Props = {
  selection: BodySelection;
  muscleStates: Record<MuscleGroup, MuscleState>;
  wellnessTrend: WellnessTrendPoint[];
};

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs / Core",
  back: "Back",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

function fmtRelative(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso + "T00:00:00Z");
  const now = new Date();
  const days = Math.round(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      d.getTime()) /
      86_400_000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function Sparkline({
  values,
  color,
  height = 50,
}: {
  values: Array<number | null>;
  color: string;
  height?: number;
}) {
  const points = values
    .map((v, i) => ({ v, i }))
    .filter((p) => p.v != null) as Array<{ v: number; i: number }>;
  if (points.length < 2) {
    return (
      <div className="flex h-[50px] items-center justify-center text-[11px] text-muted-foreground">
        Not enough data
      </div>
    );
  }
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = Math.max(1, max - min);
  const width = 220;
  const d = points
    .map((p, idx) => {
      const x = (p.i / (values.length - 1)) * width;
      const y = height - ((p.v - min) / span) * (height - 6) - 3;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-[50px] w-full"
    >
      <defs>
        <linearGradient id={`gr-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L${width},${height} L0,${height} Z`}
        fill={`url(#gr-${color.replace("#", "")})`}
      />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
      <text x="2" y="11" fill={color} fontSize="9" opacity="0.7">
        {min}
      </text>
      <text x="2" y={height - 2} fill={color} fontSize="9" opacity="0.7">
        {max}
      </text>
    </svg>
  );
}

function MuscleDetail({
  group,
  states,
}: {
  group: MuscleGroup;
  states: Record<MuscleGroup, MuscleState>;
}) {
  const state = states[group];
  const days = state?.daysSince ?? null;
  const color = tirednessColor(days);
  const label = tirednessLabel(days);

  return (
    <>
      <div className="flex items-center gap-2">
        <Dumbbell className="h-4 w-4" style={{ color }} />
        <h3 className="text-lg font-semibold">{MUSCLE_LABELS[group]}</h3>
      </div>

      <div
        className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
        style={{ background: `${color}22`, color }}
      >
        <span className="block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last trained</span>
          <span className="font-medium tabular-nums">
            {fmtRelative(state?.lastTrainedISO ?? null)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Days since</span>
          <span className="font-medium tabular-nums">{days ?? "—"}</span>
        </div>
      </div>

      {state?.lastSets?.length ? (
        <div className="mt-4">
          <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Last session
          </div>
          <ul className="space-y-1 text-xs">
            {state.lastSets.slice(0, 6).map((s, i) => (
              <li
                key={`${s.exercise}-${i}`}
                className="flex justify-between rounded-md bg-white/[0.03] px-2 py-1"
              >
                <span className="truncate">{s.exercise}</span>
                <span className="tabular-nums text-muted-foreground">
                  {s.weightKg ? `${s.weightKg}kg` : ""}
                  {s.reps != null && s.weightKg ? " · " : ""}
                  {s.reps != null ? `${s.reps} reps` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function HeartDetail({ trend }: { trend: WellnessTrendPoint[] }) {
  const today = trend[trend.length - 1];
  const restingSeries = trend.map((p) => p.restingHeartRate ?? null);
  const calorieSeries = trend.map((p) => p.totalCalories ?? null);

  return (
    <>
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
        <h3 className="text-lg font-semibold">Heart</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Resting HR, range, and energy expenditure trend.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-rose-500/15 bg-rose-500/[0.05] p-3">
          <div className="text-[10px] uppercase tracking-wider text-rose-300/70">
            Resting today
          </div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums text-rose-100">
            {today?.restingHeartRate ?? "—"}
            <span className="ml-1 text-xs text-muted-foreground">bpm</span>
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.05] p-3">
          <div className="text-[10px] uppercase tracking-wider text-amber-300/70">
            Calories today
          </div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums text-amber-100">
            {today?.totalCalories?.toLocaleString() ?? "—"}
            <span className="ml-1 text-xs text-muted-foreground">kcal</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          7-day resting HR
        </div>
        <Sparkline values={restingSeries} color="#ef4444" />
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          7-day calories burned
        </div>
        <Sparkline values={calorieSeries} color="#f59e0b" />
      </div>
    </>
  );
}

function BrainDetail({ trend }: { trend: WellnessTrendPoint[] }) {
  const lastNight = trend[trend.length - 1];
  const sleepSeries = trend.map((p) =>
    p.sleepSeconds != null ? Math.round(p.sleepSeconds / 60) : null,
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 fill-violet-400/30 text-violet-300" />
        <h3 className="text-lg font-semibold">Brain</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Sleep duration and recovery — your nervous system&apos;s recovery budget.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-indigo-500/15 bg-indigo-500/[0.05] p-3">
          <div className="text-[10px] uppercase tracking-wider text-indigo-300/70">
            Last night
          </div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums text-indigo-100">
            {fmtDuration(lastNight?.sleepSeconds)}
          </div>
        </div>
        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.05] p-3">
          <div className="text-[10px] uppercase tracking-wider text-cyan-300/70">
            Deep sleep
          </div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums text-cyan-100">
            {fmtDuration(lastNight?.deepSleepSeconds)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          7-day sleep (minutes)
        </div>
        <Sparkline values={sleepSeries} color="#818cf8" />
      </div>
    </>
  );
}

export function BodyDetailPanel({
  selection,
  muscleStates,
  wellnessTrend,
}: Props) {
  if (!selection) return null;
  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="flex-1 overflow-y-auto">
        {selection.kind === "muscle" ? (
          <MuscleDetail group={selection.group} states={muscleStates} />
        ) : selection.kind === "heart" ? (
          <HeartDetail trend={wellnessTrend} />
        ) : (
          <BrainDetail trend={wellnessTrend} />
        )}
      </div>
    </div>
  );
}

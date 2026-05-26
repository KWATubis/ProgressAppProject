"use client";

import { Heart, Moon, Flame, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";

export type WellnessTodayProps = {
  hr: {
    resting: number | null;
    min: number | null;
    max: number | null;
    samples: Array<[number, number | null]> | null;
  };
  sleep: {
    totalSeconds: number | null;
    deepSeconds: number | null;
    lightSeconds: number | null;
    remSeconds: number | null;
    awakeSeconds: number | null;
  };
  calories: {
    total: number | null;
    active: number | null;
    resting: number | null;
  };
  balance: {
    intakeKcal: number;
    burnedKcal: number | null;
  };
};

function fmtDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function fmtInt(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

function HrSparkline({
  samples,
  height = 36,
}: {
  samples: Array<[number, number | null]> | null;
  height?: number;
}) {
  if (!samples || samples.length < 2) return null;
  const points = samples
    .map(([t, v]) => ({ t, v: typeof v === "number" ? v : null }))
    .filter((p) => p.v !== null) as Array<{ t: number; v: number }>;
  if (points.length < 2) return null;
  const minV = Math.min(...points.map((p) => p.v));
  const maxV = Math.max(...points.map((p) => p.v));
  const span = Math.max(1, maxV - minV);
  const width = 240;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p.v - minV) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-9 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L${width},${height} L0,${height} Z`}
        fill="url(#hrGrad)"
      />
      <path d={d} fill="none" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  );
}

function StageBar({
  deep,
  light,
  rem,
  awake,
}: {
  deep: number;
  light: number;
  rem: number;
  awake: number;
}) {
  const total = deep + light + rem + awake;
  if (total === 0) return null;
  const pct = (v: number) => `${(v / total) * 100}%`;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div style={{ width: pct(deep) }} className="bg-indigo-500" />
      <div style={{ width: pct(light) }} className="bg-indigo-400/70" />
      <div style={{ width: pct(rem) }} className="bg-cyan-400" />
      <div style={{ width: pct(awake) }} className="bg-white/30" />
    </div>
  );
}

export function WellnessTodayCards({
  hr,
  sleep,
  calories,
  balance,
}: WellnessTodayProps) {
  const balanceDelta =
    balance.burnedKcal != null ? balance.intakeKcal - balance.burnedKcal : null;
  const isDeficit = balanceDelta != null && balanceDelta < 0;
  const noData =
    hr.resting == null &&
    sleep.totalSeconds == null &&
    calories.total == null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Heart rate */}
      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-rose-500/[0.08] via-white/[0.01] to-transparent p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-rose-300/80">
            <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
            Heart rate
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-semibold tabular-nums text-rose-200">
            {fmtInt(hr.resting)}
          </span>
          <span className="text-xs text-muted-foreground">bpm resting</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {hr.min != null && hr.max != null ? (
            <>
              Range <span className="tabular-nums text-rose-200/80">{hr.min}</span>
              {" – "}
              <span className="tabular-nums text-rose-200/80">{hr.max}</span> bpm
            </>
          ) : (
            "No samples"
          )}
        </div>
        <div className="mt-3">
          <HrSparkline samples={hr.samples} />
        </div>
      </Card>

      {/* Sleep */}
      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-indigo-500/[0.08] via-white/[0.01] to-transparent p-4">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-300/80">
          <Moon className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
          Sleep
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-semibold tabular-nums text-indigo-100">
            {fmtDuration(sleep.totalSeconds)}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {sleep.deepSeconds != null
            ? `Deep ${fmtDuration(sleep.deepSeconds)} · Light ${fmtDuration(sleep.lightSeconds)}`
            : "No sleep recorded"}
        </div>
        <div className="mt-3">
          <StageBar
            deep={sleep.deepSeconds ?? 0}
            light={sleep.lightSeconds ?? 0}
            rem={sleep.remSeconds ?? 0}
            awake={sleep.awakeSeconds ?? 0}
          />
        </div>
      </Card>

      {/* Calories burned */}
      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-amber-500/[0.08] via-white/[0.01] to-transparent p-4">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-300/80">
          <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          Calories burned
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-semibold tabular-nums text-amber-100">
            {fmtInt(calories.total)}
          </span>
          <span className="text-xs text-muted-foreground">kcal</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {calories.active != null && calories.resting != null
            ? `Active ${fmtInt(calories.active)} · BMR ${fmtInt(calories.resting)}`
            : "Sync Garmin to see breakdown"}
        </div>
      </Card>

      {/* Energy balance */}
      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-emerald-500/[0.08] via-white/[0.01] to-transparent p-4">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-300/80">
          <Scale className="h-3.5 w-3.5 text-emerald-400" />
          Energy balance
        </div>
        {balanceDelta == null ? (
          <>
            <div className="mt-2 text-3xl font-semibold text-muted-foreground">—</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Needs Garmin sync
            </div>
          </>
        ) : (
          <>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                className={`text-3xl font-semibold tabular-nums ${
                  isDeficit ? "text-emerald-200" : "text-amber-200"
                }`}
              >
                {balanceDelta > 0 ? "+" : ""}
                {fmtInt(balanceDelta)}
              </span>
              <span className="text-xs text-muted-foreground">kcal</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              In <span className="tabular-nums">{fmtInt(balance.intakeKcal)}</span> ·
              Out <span className="tabular-nums">{fmtInt(balance.burnedKcal)}</span>
            </div>
            <div className="mt-2 text-[11px] font-medium uppercase tracking-wider">
              <span
                className={
                  isDeficit ? "text-emerald-300" : "text-amber-300"
                }
              >
                {isDeficit ? "Deficit" : "Surplus"}
              </span>
            </div>
          </>
        )}
      </Card>
      {noData ? (
        <div className="col-span-full text-center text-xs text-muted-foreground">
          No wellness data yet — hit <strong>Sync Garmin</strong> above.
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { Dumbbell, TrendingUp } from "lucide-react";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PillarGoal = {
  id: string;
  title: string;
  currentValue: number | null;
  targetValue: number | null;
  startValue: number | null;
  unit: string | null;
  targetDate: string | null;
};

type Props = {
  pillar: "HEALTH" | "MONEY";
  goals: PillarGoal[];
  totalTasks: number;
  completedTasks: number;
};

/** 0 → red, 50 → yellow/orange, 100 → green (HSL hue 0→120). */
function progressColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const hue = (clamped / 100) * 120; // 0 = red, 60 = yellow, 120 = green
  return `hsl(${hue.toFixed(0)}, 75%, 52%)`;
}

/**
 * Direction-aware goal progress.
 *
 * Default startValue (if not stored):
 *   - target < current → start = current (a "shrink" goal — start at 0% progress)
 *   - otherwise        → start = 0       (a "grow" goal — matches user mental model of current/target)
 *
 * progress = (current - start) / (target - start), clamped 0–100.
 */
function goalProgress(g: PillarGoal): number | null {
  if (g.currentValue == null || g.targetValue == null) return null;
  const start =
    g.startValue ?? (g.targetValue < g.currentValue ? g.currentValue : 0);
  const span = g.targetValue - start;
  if (span === 0) return g.currentValue === g.targetValue ? 100 : 0;
  const pct = ((g.currentValue - start) / span) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function DashboardPillarCard({ pillar, goals, totalTasks, completedTasks }: Props) {
  const label = pillar === "HEALTH" ? "Health" : "Money";
  const Icon = pillar === "HEALTH" ? Dumbbell : TrendingUp;

  const goalsWithProgress = goals
    .map((g) => ({ goal: g, pct: goalProgress(g) }))
    .filter((x): x is { goal: PillarGoal; pct: number } => x.pct !== null);

  const avgPct =
    goalsWithProgress.length === 0
      ? 0
      : Math.round(
          goalsWithProgress.reduce((sum, x) => sum + x.pct, 0) / goalsWithProgress.length,
        );

  const ringColor = progressColor(avgPct);

  return (
    <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.01] to-transparent shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {completedTasks}/{totalTasks} tasks today
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-5">
          <div className="relative h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="74%"
                outerRadius="100%"
                data={[{ name: "progress", value: avgPct, fill: ringColor }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  background={{ fill: "rgba(255,255,255,0.06)" }}
                  cornerRadius={12}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span
                className="text-xl font-semibold tabular-nums"
                style={{ color: ringColor }}
              >
                {avgPct}%
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                goal
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">No active goals.</p>
            )}
            {goals.map((g) => {
              const pct = goalProgress(g);
              const color = pct !== null ? progressColor(pct) : "rgba(255,255,255,0.2)";
              return (
                <div key={g.id} className="min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate text-sm font-medium">{g.title}</div>
                    {g.currentValue !== null && g.targetValue !== null && (
                      <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatNum(g.currentValue)} / {formatNum(g.targetValue)}{" "}
                        {g.unit ?? ""}
                      </div>
                    )}
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    {pct !== null && (
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                          boxShadow: `0 0 8px ${color}`,
                        }}
                      />
                    )}
                  </div>
                  {pct !== null && (
                    <div
                      className="text-[10px] font-medium tabular-nums"
                      style={{ color }}
                    >
                      {Math.round(pct)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(1);
}

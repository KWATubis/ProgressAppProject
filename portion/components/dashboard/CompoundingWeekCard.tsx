"use client";

import { useSyncExternalStore } from "react";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { WeeklySummary } from "@/lib/dashboard/weekly-summary";

const subscribe = () => () => {};
function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** 0 → red, 60 → yellow, 120 → green. Matches DashboardPillarCard. */
function progressColor(pct: number): string {
  const hue = (Math.max(0, Math.min(100, pct)) / 100) * 120;
  return `hsl(${hue.toFixed(0)}, 75%, 52%)`;
}

function deltaColor(good: boolean | null): string {
  if (good === true) return "text-emerald-400";
  if (good === false) return "text-rose-400";
  return "text-muted-foreground";
}

export function CompoundingWeekCard({ summary }: { summary: WeeklySummary }) {
  const mounted = useHasMounted();
  const { scorePct, judged, good, metrics, headline, weekLabel } = summary;
  const ringColor = progressColor(scorePct);

  return (
    <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.015] to-transparent shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]">
      <CardContent className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:w-64 sm:shrink-0">
          <div className="relative h-24 w-24 shrink-0">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="74%"
                  outerRadius="100%"
                  data={[{ name: "score", value: scorePct, fill: ringColor }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" background={{ fill: "rgba(255,255,255,0.06)" }} cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-xl font-semibold tabular-nums" style={{ color: ringColor }}>
                {judged > 0 ? `${good}/${judged}` : "—"}
              </span>
              <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">fronts</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{weekLabel}</div>
            <p className="mt-1 text-sm font-medium leading-snug">{headline}</p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-3 gap-x-4 gap-y-3 border-t border-white/10 pt-4 sm:grid-cols-6 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          {metrics.map((m) => (
            <div key={m.key} className="min-w-0">
              <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
              <div className="mt-0.5 truncate text-base font-semibold tabular-nums">{m.value}</div>
              {m.delta && (
                <div className={`truncate text-[11px] font-medium tabular-nums ${deltaColor(m.good)}`}>{m.delta}</div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

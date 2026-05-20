"use client";

import { Dumbbell, TrendingUp } from "lucide-react";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type PillarGoal = {
  id: string;
  title: string;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  targetDate: string | null;
};

type Props = {
  pillar: "HEALTH" | "MONEY";
  goals: PillarGoal[];
  totalTasks: number;
  completedTasks: number;
};

export function DashboardPillarCard({ pillar, goals, totalTasks, completedTasks }: Props) {
  const label = pillar === "HEALTH" ? "Health" : "Money";
  const Icon = pillar === "HEALTH" ? Dumbbell : TrendingUp;
  const accent = pillar === "HEALTH" ? "#10b981" : "#f59e0b";

  const pct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-4 w-4" style={{ color: accent }} />
          {label}
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {completedTasks}/{totalTasks} today
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={[{ name: "done", value: pct, fill: accent }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold">
              {pct}%
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">No active goals.</p>
            )}
            {goals.map((g) => {
              const goalPct =
                g.currentValue !== null && g.targetValue !== null && g.targetValue !== 0
                  ? Math.min(100, Math.max(0, Math.round((g.currentValue / g.targetValue) * 100)))
                  : null;
              return (
                <div key={g.id} className="min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate text-sm font-medium">{g.title}</div>
                    {g.currentValue !== null && g.targetValue !== null && (
                      <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {g.currentValue} / {g.targetValue} {g.unit ?? ""}
                      </div>
                    )}
                  </div>
                  {goalPct !== null && <Progress value={goalPct} className="h-1.5" />}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

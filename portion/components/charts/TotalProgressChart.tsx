"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import { ChartFrame } from "./ChartFrame";

export type ProgressPoint = { date: string; score: number };

export function TotalProgressChart({ data }: { data: ProgressPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Complete your tasks to start tracking progress.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [y, m, day] = d.date.split("-").map(Number);
    const label = new Date(y, m - 1, day).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
    return { score: d.score, label };
  });

  // Dynamic Y-axis: ~3× the most recent score, with a floor so very low
  // early-game scores still have visible movement.
  const latest = formatted[formatted.length - 1]?.score ?? 1;
  const peak = Math.max(...formatted.map((d) => d.score), latest);
  const yMaxRaw = Math.max(latest * 3, peak * 1.1, 3);
  const niceCeil = (n: number) => {
    if (n <= 3) return 3;
    if (n <= 6) return 6;
    if (n <= 10) return 10;
    if (n <= 30) return Math.ceil(n / 5) * 5;
    if (n <= 100) return Math.ceil(n / 10) * 10;
    return Math.ceil(n / 50) * 50;
  };
  const yMax = niceCeil(yMaxRaw);
  const tickValues = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map(
    (v) => Number(v.toFixed(yMax < 10 ? 1 : 0)),
  );

  return (
    <ChartFrame height={180}>
      <AreaChart data={formatted} margin={{ top: 8, right: 12, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, yMax]}
          ticks={tickValues}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          tickLine={false}
          axisLine={false}
        />

        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [Number(v).toFixed(2), "Score"]}
          labelStyle={{ color: "rgba(255,255,255,0.4)", marginBottom: 2 }}
          cursor={{ stroke: "rgba(255,255,255,0.08)" }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#fbbf24"
          strokeWidth={2}
          fill="url(#progressGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#fbbf24", strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartFrame>
  );
}

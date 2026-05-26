"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartFrame } from "./ChartFrame";

export type VolumeWeek = { week: string; volumeKg: number };

export function WorkoutVolumeChart({
  data,
  color = "#34d399",
  unit = "kg",
}: {
  data: VolumeWeek[];
  color?: string;
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No workout data yet.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [y, m, day] = d.week.split("-").map(Number);
    const label = new Date(y, m - 1, day).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
    return { volumeKg: Math.round(d.volumeKg), label };
  });

  return (
    <ChartFrame height={220}>
      <BarChart data={formatted} margin={{ top: 5, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}${unit}`}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${v} ${unit}`, "Volume"]}
          labelStyle={{ color: "rgba(255,255,255,0.45)", marginBottom: 2 }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="volumeKg" fill={color} radius={[3, 3, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ChartFrame>
  );
}

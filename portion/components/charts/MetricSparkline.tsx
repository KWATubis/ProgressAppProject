"use client";

import { Area, AreaChart, Tooltip, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";

export type SparkPoint = { date: string; value: number };

/**
 * Minimal axis-less sparkline of a custom metric's entry time-series.
 * Single entry renders a flat baseline dot; empty handled by the caller.
 */
export function MetricSparkline({
  data,
  unit,
  color = "#34d399",
  height = 44,
}: {
  data: SparkPoint[];
  unit: string;
  color?: string;
  height?: number;
}) {
  const gradientId = `spark-${color.replace("#", "")}`;

  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          cursor={{ stroke: color, strokeOpacity: 0.3 }}
          contentStyle={{
            background: "rgba(10,10,10,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
            padding: "4px 8px",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          formatter={(v) => [`${Number(v).toLocaleString()} ${unit}`, ""]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${gradientId})`}
          dot={data.length === 1 ? { r: 2.5, fill: color } : false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartFrame>
  );
}

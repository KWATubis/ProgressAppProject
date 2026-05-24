"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { ChartFrame } from "./ChartFrame";

export type WeightDataPoint = { date: string; weightKg: number };

const TARGET_KG = 68;

export function WeightProgressChart({ data }: { data: WeightDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No weight data yet.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [y, m, day] = d.date.split("-").map(Number);
    const label = new Date(y, m - 1, day).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
    return { weightKg: d.weightKg, label };
  });

  return (
    <ChartFrame height={220}>
      <LineChart data={formatted} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
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
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${Number(v).toFixed(1)} kg`, "Weight"]}
          labelStyle={{ color: "rgba(255,255,255,0.45)", marginBottom: 2 }}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <ReferenceLine
          y={TARGET_KG}
          stroke="rgba(52,211,153,0.4)"
          strokeDasharray="6 3"
          label={{
            value: `${TARGET_KG} kg`,
            position: "insideTopRight",
            fontSize: 10,
            fill: "rgba(52,211,153,0.65)",
          }}
        />
        <Line
          type="monotone"
          dataKey="weightKg"
          dot={false}
          stroke="#34d399"
          strokeWidth={2}
          activeDot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
        />
      </LineChart>
    </ChartFrame>
  );
}

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartFrame } from "./ChartFrame";

export type CardioDataPoint = { date: string; distanceKm: number };

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export function CardioProgressChart({ data }: { data: CardioDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No sessions yet.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [y, m, day] = d.date.split("-").map(Number);
    return { distanceKm: d.distanceKm, ts: Date.UTC(y, m - 1, day) };
  });

  return (
    <ChartFrame height={220}>
      <LineChart data={formatted} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={fmtDate}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }}
          tickLine={false}
          axisLine={false}
          domain={[0, "auto"]}
          unit=" km"
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${Number(v).toFixed(2)} km`, "Distance"]}
          labelFormatter={(ts) => fmtDate(Number(ts))}
          labelStyle={{ color: "rgba(255,255,255,0.45)", marginBottom: 2 }}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <Line
          type="monotone"
          dataKey="distanceKm"
          dot={{ r: 3, fill: "#60a5fa", strokeWidth: 0 }}
          stroke="#60a5fa"
          strokeWidth={2}
          activeDot={{ r: 5, fill: "#60a5fa", strokeWidth: 0 }}
        />
      </LineChart>
    </ChartFrame>
  );
}

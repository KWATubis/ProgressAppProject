"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartFrame } from "./ChartFrame";

export type BusinessMetricPoint = {
  date: string;
  clients: number | null;
  leads: number | null;
  deals: number | null;
};

const SERIES = [
  { key: "clients", label: "Clients", color: "#818cf8" },
  { key: "leads", label: "Leads", color: "#fbbf24" },
  { key: "deals", label: "Deals", color: "#34d399" },
] as const;

export function BusinessMetricsChart({ data }: { data: BusinessMetricPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No snapshots yet.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [y, m, day] = d.date.split("-").map(Number);
    const label = new Date(y, m - 1, day).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
    return { ...d, label };
  });

  return (
    <ChartFrame height={240}>
      <LineChart data={formatted} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
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
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "rgba(255,255,255,0.45)", marginBottom: 2 }}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}
        />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            connectNulls
            dot={false}
            stroke={s.color}
            strokeWidth={2}
            activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

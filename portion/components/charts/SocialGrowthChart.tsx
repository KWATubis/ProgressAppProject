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

export type FollowerDataPoint = { date: string; followerCount: number };

export function SocialGrowthChart({
  data,
  target,
}: {
  data: FollowerDataPoint[];
  target?: number | null;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No follower data yet.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [y, m, day] = d.date.split("-").map(Number);
    const label = new Date(y, m - 1, day).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
    return { followerCount: d.followerCount, label };
  });

  return (
    <ChartFrame height={220}>
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
          domain={["auto", "auto"]}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [Number(v).toLocaleString(), "Followers"]}
          labelStyle={{ color: "rgba(255,255,255,0.45)", marginBottom: 2 }}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke="rgba(129,140,248,0.4)"
            strokeDasharray="6 3"
            label={{
              value: target >= 1000 ? `${(target / 1000).toFixed(0)}k` : String(target),
              position: "insideTopRight",
              fontSize: 10,
              fill: "rgba(129,140,248,0.65)",
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="followerCount"
          dot={false}
          stroke="#818cf8"
          strokeWidth={2}
          activeDot={{ r: 4, fill: "#818cf8", strokeWidth: 0 }}
        />
      </LineChart>
    </ChartFrame>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { ChartFrame } from "./ChartFrame";

export type IncomeMonth = { month: string; amountPln: number };

export function IncomeChart({
  data,
  target,
}: {
  data: IncomeMonth[];
  target?: number | null;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        No income logged yet.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [y, m] = d.month.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    });
    return { amountPln: d.amountPln, label };
  });

  return (
    <ChartFrame height={200}>
      <BarChart data={formatted} margin={{ top: 5, right: 12, left: -8, bottom: 0 }}>
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
          formatter={(v: any) => [`${Number(v).toLocaleString()} zł`, "Income"]}
          labelStyle={{ color: "rgba(255,255,255,0.45)", marginBottom: 2 }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke="rgba(129,140,248,0.35)"
            strokeDasharray="5 3"
            label={{
              value: `${target.toLocaleString()} zł`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "rgba(129,140,248,0.6)",
            }}
          />
        )}
        <Bar dataKey="amountPln" fill="#818cf8" radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartFrame>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export type MacroDay = {
  date: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

const KCAL_TARGET = 2400;

export function MacroChart({ data }: { data: MacroDay[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        No diet data yet.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [y, m, day] = d.date.split("-").map(Number);
    const label = new Date(y, m - 1, day).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
    return { kcal: d.kcal, label };
  });

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={formatted} margin={{ top: 5, right: 12, left: -24, bottom: 0 }}>
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
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${v} kcal`, "Calories"]}
          labelStyle={{ color: "rgba(255,255,255,0.45)", marginBottom: 2 }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <ReferenceLine
          y={KCAL_TARGET}
          stroke="rgba(255,255,255,0.2)"
          strokeDasharray="5 3"
          label={{
            value: "2 400 kcal",
            position: "insideTopRight",
            fontSize: 10,
            fill: "rgba(255,255,255,0.35)",
          }}
        />
        <Bar dataKey="kcal" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

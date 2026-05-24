"use client";

import { useRouter } from "next/navigation";

export type Range = "7d" | "30d" | "90d" | "all";
const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All time" },
];

export function RangeSelector({ current }: { current: Range }) {
  const router = useRouter();

  return (
    <div className="inline-flex gap-1 self-start rounded-lg border border-white/10 bg-card p-1">
      {RANGES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => router.push(`/progress?range=${value}`)}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            value === current
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

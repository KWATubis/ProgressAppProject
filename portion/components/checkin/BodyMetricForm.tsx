"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type MetricValues = {
  weightKg: number | null;
  bodyFatPct: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armCm: number | null;
  thighCm: number | null;
};

const FIELDS: { key: keyof MetricValues; label: string; unit: string; step: string }[] = [
  { key: "weightKg", label: "Weight", unit: "kg", step: "0.1" },
  { key: "bodyFatPct", label: "Body fat", unit: "%", step: "0.1" },
  { key: "chestCm", label: "Chest", unit: "cm", step: "0.5" },
  { key: "waistCm", label: "Waist", unit: "cm", step: "0.5" },
  { key: "hipsCm", label: "Hips", unit: "cm", step: "0.5" },
  { key: "armCm", label: "Arm", unit: "cm", step: "0.5" },
  { key: "thighCm", label: "Thigh", unit: "cm", step: "0.5" },
];

function toStr(v: number | null): string {
  return v == null ? "" : String(v);
}

export function BodyMetricForm({ dateISO, initial }: { dateISO: string; initial: MetricValues }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, toStr(initial[f.key])])),
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    const payload: Record<string, unknown> = { date: dateISO };
    for (const f of FIELDS) {
      const raw = values[f.key];
      payload[f.key] = raw === "" ? null : Number(raw);
    }
    if (FIELDS.every((f) => payload[f.key] == null)) {
      toast.error("Enter at least one measurement.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/body-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Metrics saved.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save metrics");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {f.label} <span className="opacity-60">({f.unit})</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              step={f.step}
              min="0"
              placeholder="—"
              value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums outline-none focus:border-foreground"
            />
          </label>
        ))}
      </div>
      <Button onClick={save} disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Save metrics"}
      </Button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CustomMetricLite } from "@/components/metrics/CreateCustomMetricDialog";

type Aggregation = CustomMetricLite["aggregation"];
type Direction = CustomMetricLite["direction"];

const AGG_OPTIONS: { value: Aggregation; label: string; hint: string }[] = [
  { value: "LATEST", label: "Latest", hint: "Show most recent entry" },
  { value: "MAX", label: "Personal best", hint: "Highest entry wins" },
  { value: "SUM", label: "Total", hint: "Sum every entry" },
  { value: "COUNT", label: "Count", hint: "Number of entries" },
  { value: "AVG", label: "Average", hint: "Mean across entries" },
];

export function EditCustomMetricDialog({
  metric,
  open,
  onOpenChange,
}: {
  metric: CustomMetricLite;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit metric</DialogTitle>
        </DialogHeader>
        {open && (
          <EditForm metric={metric} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  metric,
  onClose,
}: {
  metric: CustomMetricLite;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(metric.title);
  const [unit, setUnit] = useState(metric.unit);
  const [aggregation, setAggregation] = useState<Aggregation>(metric.aggregation);
  const [direction, setDirection] = useState<Direction>(metric.direction);
  const [pending, startTransition] = useTransition();

  function submit() {
    const t = title.trim();
    const u = unit.trim();
    if (!t) return toast.error("Title is required");
    if (!u) return toast.error("Unit is required");

    startTransition(async () => {
      const res = await fetch(`/api/custom-metrics/${metric.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, unit: u, aggregation, direction }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to update metric");
        return;
      }
      toast.success("Metric updated");
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-title">What are you tracking?</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-unit">Unit</Label>
          <Input
            id="edit-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>How should progress be measured?</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {AGG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAggregation(opt.value)}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition",
                  aggregation === opt.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-input hover:bg-accent",
                )}
              >
                <span className="font-medium">{opt.label}</span>
                <span
                  className={cn(
                    "text-[11px]",
                    aggregation === opt.value
                      ? "text-background/80"
                      : "text-muted-foreground",
                  )}
                >
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Direction</Label>
          <div className="flex gap-2">
            {(
              [
                { v: "HIGHER_BETTER" as const, l: "Higher is better" },
                { v: "LOWER_BETTER" as const, l: "Lower is better" },
              ]
            ).map((d) => (
              <button
                key={d.v}
                type="button"
                onClick={() => setDirection(d.v)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm transition",
                  direction === d.v
                    ? "border-foreground bg-foreground text-background"
                    : "border-input hover:bg-accent",
                )}
              >
                {d.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}

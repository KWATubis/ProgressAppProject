"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
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

export type CustomMetricLite = {
  id: string;
  title: string;
  unit: string;
  aggregation: "LATEST" | "MAX" | "SUM" | "COUNT" | "AVG";
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
};

type Aggregation = CustomMetricLite["aggregation"];
type Direction = CustomMetricLite["direction"];

const AGG_OPTIONS: { value: Aggregation; label: string; hint: string }[] = [
  { value: "LATEST", label: "Latest", hint: "Show most recent entry" },
  { value: "MAX", label: "Personal best", hint: "Highest entry wins" },
  { value: "SUM", label: "Total", hint: "Sum every entry" },
  { value: "COUNT", label: "Count", hint: "Number of entries" },
  { value: "AVG", label: "Average", hint: "Mean across entries" },
];

const UNIT_CHIPS = ["seconds", "reps", "kg", "km", "posts", "approaches", "deals", "zł", "$"];

// Module-level singleton: AI config status doesn't change at runtime, so
// fetch it once per session and share across every dialog mount.
let aiConfiguredPromise: Promise<boolean> | null = null;
function getAiConfigured(): Promise<boolean> {
  if (!aiConfiguredPromise) {
    aiConfiguredPromise = fetch("/api/ai/suggest-metric", { method: "GET" })
      .then((r) => r.json())
      .then((d) => !!d?.configured)
      .catch(() => false);
  }
  return aiConfiguredPromise;
}

export function CreateCustomMetricDialog({
  activityTypeId,
  open,
  onOpenChange,
  onCreated,
  seedTitle,
}: {
  activityTypeId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (metric: CustomMetricLite) => void;
  seedTitle?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New custom metric</DialogTitle>
        </DialogHeader>
        {open && (
          <CreateForm
            activityTypeId={activityTypeId}
            seedTitle={seedTitle}
            onCreated={onCreated}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({
  activityTypeId,
  seedTitle,
  onCreated,
  onClose,
}: {
  activityTypeId: string;
  seedTitle?: string;
  onCreated: (metric: CustomMetricLite) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(seedTitle ?? "");
  const [unit, setUnit] = useState("");
  const [aggregation, setAggregation] = useState<Aggregation>("LATEST");
  const [direction, setDirection] = useState<Direction>("HIGHER_BETTER");
  const [aiConfigured, setAiConfigured] = useState(false);
  const [suggesting, startSuggest] = useTransition();
  const [pending, startTransition] = useTransition();

  // One-shot config probe; result is module-cached so subsequent dialog
  // opens resolve synchronously off the cached promise.
  useEffect(() => {
    let cancelled = false;
    getAiConfigured().then((v) => {
      if (!cancelled) setAiConfigured(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function suggest() {
    if (!title.trim()) {
      toast.error("Type a title first so AI knows what to shape.");
      return;
    }
    startSuggest(async () => {
      const res = await fetch("/api/ai/suggest-metric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "AI request failed");
        return;
      }
      setTitle(data.title);
      setUnit(data.unit);
      setAggregation(data.aggregation);
      setDirection(data.direction);
      toast.success(data.rationale ?? "Filled from AI suggestion");
    });
  }

  function submit() {
    const t = title.trim();
    const u = unit.trim();
    if (!t) return toast.error("Title is required");
    if (!u) return toast.error("Unit is required");

    startTransition(async () => {
      const res = await fetch("/api/custom-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityTypeId,
          title: t,
          unit: u,
          aggregation,
          direction,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to create metric");
        return;
      }
      toast.success(`Metric "${data.title}" created`);
      onCreated({
        id: data.id,
        title: data.title,
        unit: data.unit,
        aggregation: data.aggregation,
        direction: data.direction,
      });
      onClose();
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cm-title">What are you tracking?</Label>
          <Input
            id="cm-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Front lever hold"
            autoFocus
          />
          {aiConfigured && (
            <button
              type="button"
              onClick={suggest}
              disabled={suggesting || !title.trim()}
              className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-emerald-400/90 hover:text-emerald-300 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              {suggesting ? "Asking AI…" : "Suggest with AI"}
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cm-unit">Unit</Label>
          <Input
            id="cm-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="seconds, reps, kg…"
          />
          <div className="flex flex-wrap gap-1">
            {UNIT_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setUnit(c)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider transition",
                  unit === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-input text-muted-foreground hover:bg-accent",
                )}
              >
                {c}
              </button>
            ))}
          </div>
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
          {pending ? "Creating…" : "Create metric"}
        </Button>
      </DialogFooter>
    </>
  );
}

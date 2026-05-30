"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Zap, ChevronDown, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MetricSparkline } from "@/components/charts/MetricSparkline";
import { LogMetricEntryDialog } from "@/components/metrics/LogMetricEntryDialog";
import { EditCustomMetricDialog } from "@/components/metrics/EditCustomMetricDialog";
import {
  CreateCustomMetricDialog,
  type CustomMetricLite,
} from "@/components/metrics/CreateCustomMetricDialog";
import type { CustomMetricView } from "@/lib/goalMetrics.server";

const AGG_LABEL: Record<CustomMetricView["aggregation"], string> = {
  LATEST: "Latest",
  MAX: "Personal best",
  SUM: "Total",
  COUNT: "Count",
  AVG: "Average",
};

export function CustomMetricsPanel({
  activityTypeId,
  metrics,
  color,
}: {
  activityTypeId: string;
  metrics: CustomMetricView[];
  color: string | null;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const accent = color ?? "#34d399";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Custom metrics
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> New metric
        </Button>
      </div>

      {metrics.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-6 text-center">
          <Gauge className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No custom metrics yet</p>
          <p className="text-xs text-muted-foreground">
            Track anything — a front-lever hold, cold approaches, deep-work hours.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((m) => (
            <MetricCard key={m.id} metric={m} accent={accent} />
          ))}
        </div>
      )}

      <CreateCustomMetricDialog
        activityTypeId={activityTypeId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />
    </section>
  );
}

function MetricCard({
  metric,
  accent,
}: {
  metric: CustomMetricView;
  accent: string;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const lite: CustomMetricLite = {
    id: metric.id,
    title: metric.title,
    unit: metric.unit,
    aggregation: metric.aggregation,
    direction: metric.direction,
  };

  return (
    <div
      className="rounded-xl border bg-card p-4"
      style={{ borderColor: `${accent}33` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{metric.title}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {AGG_LABEL[metric.aggregation]} · {metric.unit}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setLogOpen(true)}
            style={{ backgroundColor: accent, color: "#000" }}
          >
            <Zap className="h-3 w-3" /> Log
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <DeleteMetricButton metricId={metric.id} title={metric.title} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <span className="text-2xl font-semibold tabular-nums">
            {metric.current != null ? metric.current.toLocaleString() : "—"}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">{metric.unit}</span>
        </div>
        {metric.entries.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {metric.entries.length} {metric.entries.length === 1 ? "entry" : "entries"}
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", showHistory && "rotate-180")}
            />
          </button>
        )}
      </div>

      {metric.entries.length > 0 ? (
        <div className="mt-2 -mx-1">
          <MetricSparkline data={metric.entries} unit={metric.unit} color={accent} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No entries yet. Hit Log to add your first.
        </p>
      )}

      {showHistory && metric.entries.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
          {[...metric.entries].reverse().map((e) => (
            <EntryRow key={e.id} entry={e} unit={metric.unit} />
          ))}
        </div>
      )}

      <LogMetricEntryDialog metric={lite} open={logOpen} onOpenChange={setLogOpen} />
      <EditCustomMetricDialog metric={lite} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function EntryRow({
  entry,
  unit,
}: {
  entry: { id: string; date: string; value: number };
  unit: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await fetch(`/api/metric-entries/${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to delete entry");
        return;
      }
      toast.success("Entry deleted");
      router.refresh();
    });
  }

  const dateStr = new Date(entry.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{dateStr}</span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          {entry.value.toLocaleString()} {unit}
        </span>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
          aria-label="Delete entry"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function DeleteMetricButton({ metricId, title }: { metricId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await fetch(`/api/custom-metrics/${metricId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to delete metric");
        return;
      }
      toast.success("Metric deleted");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete metric &quot;{title}&quot;?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This permanently deletes the metric and all its logged entries. Any goal
          tracking it will fall back to manual progress.
        </p>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

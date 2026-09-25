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
import { Textarea } from "@/components/ui/textarea";
import {
  FULL_HOLD_SECONDS,
  describeHold,
  findSkillByTitle,
  holdPercent,
} from "@/lib/calisthenics-skills";

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function LogMetricEntryDialog({
  metric,
  open,
  onOpenChange,
}: {
  metric: { id: string; title: string; unit: string };
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log {metric.title}</DialogTitle>
        </DialogHeader>
        {open && <LogForm metric={metric} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function LogForm({
  metric,
  onClose,
}: {
  metric: { id: string; title: string; unit: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const skill = findSkillByTitle(metric.title);

  const [value, setValue] = useState("");
  const [progressionKey, setProgressionKey] = useState(skill?.progressions[0]?.key ?? "");
  const [withBand, setWithBand] = useState(false);
  const [holdSeconds, setHoldSeconds] = useState("");
  const [date, setDate] = useState(todayISO);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const seconds = Number(holdSeconds);
  const validHold = holdSeconds.trim() !== "" && Number.isFinite(seconds) && seconds > 0;
  const previewPct =
    skill && validHold ? holdPercent(skill, progressionKey, withBand, seconds) : null;

  function submit() {
    let v: number;
    let autoNote: string | null = null;

    if (skill) {
      if (!validHold) {
        toast.error("Enter how many seconds you held it");
        return;
      }
      v = holdPercent(skill, progressionKey, withBand, seconds);
      autoNote = describeHold(skill, progressionKey, withBand, seconds);
    } else {
      v = Number(value);
      if (!Number.isFinite(v)) {
        toast.error("Enter a number");
        return;
      }
    }

    const combinedNotes = [autoNote, notes.trim() || null].filter(Boolean).join(" — ") || null;

    startTransition(async () => {
      const res = await fetch("/api/metric-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customMetricId: metric.id,
          value: v,
          date,
          notes: combinedNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to log entry");
        return;
      }
      toast.success(autoNote ? `Logged ${autoNote}` : `Logged ${v} ${metric.unit}`);
      onClose();
      router.refresh();
    });
  }

  const canSubmit = skill ? validHold : !!value.trim();

  return (
    <>
      <div className="space-y-3">
        {skill ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="entry-progression">Progression</Label>
              <select
                id="entry-progression"
                value={progressionKey}
                onChange={(e) => setProgressionKey(e.target.value)}
                className="flex h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground"
              >
                {skill.progressions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label} {skill.title}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={withBand}
                onChange={(e) => setWithBand(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              With a resistance band
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="entry-hold">Hold (seconds)</Label>
              <Input
                id="entry-hold"
                type="number"
                inputMode="decimal"
                min={0}
                value={holdSeconds}
                onChange={(e) => setHoldSeconds(e.target.value)}
                placeholder="e.g. 7"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                {previewPct != null ? (
                  <>
                    <span className="font-medium text-foreground">{previewPct}%</span> of
                    a {FULL_HOLD_SECONDS}s full {skill.title.toLowerCase()}.{" "}
                  </>
                ) : null}
                ~10s at one progression ≈ 2s at the next; a band counts as one
                progression lower.
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="entry-value">Value ({metric.unit})</Label>
            <Input
              id="entry-value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="entry-date">Date</Label>
          <Input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entry-notes">Notes (optional)</Label>
          <Textarea
            id="entry-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Form felt clean. Add bend at the knees next time."
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending || !canSubmit}>
          {pending ? "Logging…" : "Log"}
        </Button>
      </DialogFooter>
    </>
  );
}

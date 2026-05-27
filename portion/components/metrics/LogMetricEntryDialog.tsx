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
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const v = Number(value);
    if (!Number.isFinite(v)) {
      toast.error("Enter a number");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/metric-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customMetricId: metric.id,
          value: v,
          date,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to log entry");
        return;
      }
      toast.success(`Logged ${v} ${metric.unit}`);
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-3">
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
        <Button type="button" onClick={submit} disabled={pending || !value.trim()}>
          {pending ? "Logging…" : "Log"}
        </Button>
      </DialogFooter>
    </>
  );
}

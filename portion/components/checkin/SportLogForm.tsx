"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  dateISO: string;
  activityTypeId: string;
  activityName: string;
};

export function SportLogForm({ dateISO, activityTypeId, activityName }: Props) {
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!duration && !notes) {
      toast.error("Enter at least a duration or notes.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/workout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateISO,
            type: activityName,
            activityTypeId,
            durationMin: duration ? Number(duration) : null,
            notes: notes || null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setDone(true);
        toast.success(`${activityName} session logged.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save session");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Duration (min)</label>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="e.g. 60"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="h-9 w-48 rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          placeholder={`How was the ${activityName} session?`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-foreground resize-none"
        />
      </div>

      <Button onClick={submit} disabled={isPending || done} className="w-full">
        {done ? (
          <><Check className="mr-1 h-4 w-4" /> Logged</>
        ) : isPending ? (
          "Saving…"
        ) : (
          `Log ${activityName} session`
        )}
      </Button>
    </div>
  );
}

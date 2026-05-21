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

export function CardioLogForm({ dateISO, activityTypeId, activityName }: Props) {
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [paceMin, setPaceMin] = useState("");
  const [paceSec, setPaceSec] = useState("");
  const [hr, setHr] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Auto-calculate pace from distance + duration
  const autoPaceSecPerKm =
    distance && duration && Number(distance) > 0
      ? Math.round((Number(duration) * 60) / Number(distance))
      : null;

  const manualPaceSec =
    paceMin || paceSec
      ? (Number(paceMin || 0) * 60) + Number(paceSec || 0)
      : null;

  const finalPaceSecPerKm = manualPaceSec ?? autoPaceSecPerKm;

  function submit() {
    if (!distance && !duration) {
      toast.error("Enter at least distance or duration.");
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
            runs: [
              {
                type: activityName,
                distanceKm: distance ? Number(distance) : null,
                durationMin: duration ? Number(duration) : null,
                avgPaceSecPerKm: finalPaceSecPerKm,
                avgHRBpm: hr ? Number(hr) : null,
              },
            ],
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

  const inputClass =
    "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Distance (km)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="e.g. 5.00"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration (min)</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="e.g. 28"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Avg pace /km
            {autoPaceSecPerKm && !manualPaceSec && (
              <span className="ml-2 text-xs text-muted-foreground">
                (auto: {Math.floor(autoPaceSecPerKm / 60)}:{String(autoPaceSecPerKm % 60).padStart(2, "0")})
              </span>
            )}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              placeholder="min"
              value={paceMin}
              onChange={(e) => setPaceMin(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground"
            />
            <span className="text-muted-foreground">:</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              placeholder="sec"
              value={paceSec}
              onChange={(e) => setPaceSec(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Avg HR (bpm) <span className="text-muted-foreground font-normal">optional</span></label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="250"
            placeholder="e.g. 155"
            value={hr}
            onChange={(e) => setHr(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">optional</span></label>
        <textarea
          placeholder="How did it feel?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
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

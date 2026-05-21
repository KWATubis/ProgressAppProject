"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  dateISO: string;
  activityTypeId: string;
  activityName: string;
};

type TrainingType = "EASY" | "LONG" | "TEMPO" | "INTERVAL" | "FARTLEK" | "RECOVERY" | "RACE";

const TRAINING_TYPES: { value: TrainingType; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "LONG", label: "Long" },
  { value: "TEMPO", label: "Tempo" },
  { value: "INTERVAL", label: "Interval" },
  { value: "FARTLEK", label: "Fartlek" },
  { value: "RECOVERY", label: "Recovery" },
  { value: "RACE", label: "Race" },
];

type Rep = { distanceM: string; timeMin: string; timeSec: string; restMin: string; restSec: string };

function blankRep(): Rep {
  return { distanceM: "", timeMin: "", timeSec: "", restMin: "", restSec: "" };
}

function repWorkSec(r: Rep): number {
  return (Number(r.timeMin) || 0) * 60 + (Number(r.timeSec) || 0);
}
function repRestSec(r: Rep): number {
  return (Number(r.restMin) || 0) * 60 + (Number(r.restSec) || 0);
}
function paceStr(secPerKm: number): string {
  return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")}`;
}

const inputClass =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground";
const smallInput =
  "h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums text-center outline-none focus:border-foreground";

export function CardioLogForm({ dateISO, activityTypeId, activityName }: Props) {
  const [trainingType, setTrainingType] = useState<TrainingType>("EASY");

  // Steady-run fields
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [paceMin, setPaceMin] = useState("");
  const [paceSec, setPaceSec] = useState("");
  const [hr, setHr] = useState("");
  const [notes, setNotes] = useState("");

  // Interval reps
  const [reps, setReps] = useState<Rep[]>([blankRep()]);

  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isStructured = trainingType === "INTERVAL" || trainingType === "FARTLEK";

  // Steady auto-pace from distance + duration
  const autoPaceSecPerKm =
    distance && duration && Number(distance) > 0
      ? Math.round((Number(duration) * 60) / Number(distance))
      : null;
  const manualPaceSec =
    paceMin || paceSec ? Number(paceMin || 0) * 60 + Number(paceSec || 0) : null;
  const finalPaceSecPerKm = manualPaceSec ?? autoPaceSecPerKm;

  // Interval totals
  const totalWorkM = reps.reduce((s, r) => s + (Number(r.distanceM) || 0), 0);
  const totalWorkSec = reps.reduce((s, r) => s + repWorkSec(r), 0);
  const totalRestSec = reps.reduce((s, r) => s + repRestSec(r), 0);
  const intervalAvgPace = totalWorkM > 0 ? Math.round(totalWorkSec / (totalWorkM / 1000)) : null;

  function updateRep(i: number, field: keyof Rep, value: string) {
    setReps((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  }
  function addRep() {
    // Carry distance from the previous rep to speed up repeated sets.
    setReps((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, { ...blankRep(), distanceM: last?.distanceM ?? "", restMin: last?.restMin ?? "", restSec: last?.restSec ?? "" }];
    });
  }
  function removeRep(i: number) {
    setReps((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));
  }

  function submit() {
    if (isStructured) {
      const laps = reps
        .filter((r) => Number(r.distanceM) > 0 && repWorkSec(r) > 0)
        .map((r) => ({
          distanceM: Number(r.distanceM),
          durationSec: repWorkSec(r),
          recoverySec: repRestSec(r) || null,
        }));
      if (laps.length === 0) {
        toast.error("Add at least one rep with distance and time.");
        return;
      }
      send({
        type: activityName,
        trainingType,
        distanceKm: totalWorkM / 1000,
        durationMin: Math.round((totalWorkSec + totalRestSec) / 60) || null,
        avgPaceSecPerKm: intervalAvgPace,
        laps,
      });
    } else {
      if (!distance && !duration) {
        toast.error("Enter at least distance or duration.");
        return;
      }
      send({
        type: activityName,
        trainingType,
        distanceKm: distance ? Number(distance) : null,
        durationMin: duration ? Number(duration) : null,
        avgPaceSecPerKm: finalPaceSecPerKm,
        avgHRBpm: hr ? Number(hr) : null,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function send(run: any) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/workout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateISO,
            type: activityName,
            activityTypeId,
            durationMin: run.durationMin ?? null,
            notes: notes || null,
            runs: [run],
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
      {/* Training type */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Training type</label>
        <div className="flex flex-wrap gap-2">
          {TRAINING_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTrainingType(t.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                trainingType === t.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isStructured ? (
        /* ─── Per-rep interval builder ─── */
        <div className="space-y-3">
          <div className="grid grid-cols-[1.5rem_1fr_1.4fr_1.4fr_1.75rem] items-center gap-2 text-xs text-muted-foreground">
            <span>#</span>
            <span>Dist (m)</span>
            <span>Time m:s</span>
            <span>Rest m:s</span>
            <span />
          </div>
          {reps.map((r, i) => (
            <div key={i} className="grid grid-cols-[1.5rem_1fr_1.4fr_1.4fr_1.75rem] items-center gap-2">
              <span className="text-sm tabular-nums text-muted-foreground">{i + 1}</span>
              <input
                className={smallInput}
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="300"
                value={r.distanceM}
                onChange={(e) => updateRep(i, "distanceM", e.target.value)}
              />
              <div className="flex items-center gap-1">
                <input className={smallInput} type="number" min="0" placeholder="0" value={r.timeMin} onChange={(e) => updateRep(i, "timeMin", e.target.value)} />
                <span className="text-muted-foreground">:</span>
                <input className={smallInput} type="number" min="0" max="59" placeholder="51" value={r.timeSec} onChange={(e) => updateRep(i, "timeSec", e.target.value)} />
              </div>
              <div className="flex items-center gap-1">
                <input className={smallInput} type="number" min="0" placeholder="3" value={r.restMin} onChange={(e) => updateRep(i, "restMin", e.target.value)} />
                <span className="text-muted-foreground">:</span>
                <input className={smallInput} type="number" min="0" max="59" placeholder="00" value={r.restSec} onChange={(e) => updateRep(i, "restSec", e.target.value)} />
              </div>
              <button
                type="button"
                onClick={() => removeRep(i)}
                className="flex h-9 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Remove rep"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRep}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add rep
          </button>

          {totalWorkM > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border bg-card p-3 text-sm">
              <span>
                <span className="tabular-nums font-medium">{(totalWorkM / 1000).toFixed(2)}</span>
                <span className="text-muted-foreground"> km work</span>
              </span>
              <span>
                <span className="tabular-nums font-medium">{reps.filter((r) => Number(r.distanceM) > 0).length}</span>
                <span className="text-muted-foreground"> reps</span>
              </span>
              {intervalAvgPace != null && (
                <span>
                  <span className="tabular-nums font-medium">{paceStr(intervalAvgPace)}</span>
                  <span className="text-muted-foreground"> /km avg</span>
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ─── Steady run ─── */
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Distance (km)</label>
            <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="e.g. 5.00" value={distance} onChange={(e) => setDistance(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (min)</label>
            <input type="number" inputMode="numeric" min="0" placeholder="e.g. 28" value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Avg pace /km
              {autoPaceSecPerKm && !manualPaceSec && (
                <span className="ml-2 text-xs text-muted-foreground">(auto: {paceStr(autoPaceSecPerKm)})</span>
              )}
            </label>
            <div className="flex items-center gap-1">
              <input type="number" inputMode="numeric" min="0" placeholder="min" value={paceMin} onChange={(e) => setPaceMin(e.target.value)} className={inputClass} />
              <span className="text-muted-foreground">:</span>
              <input type="number" inputMode="numeric" min="0" max="59" placeholder="sec" value={paceSec} onChange={(e) => setPaceSec(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Avg HR (bpm) <span className="font-normal text-muted-foreground">optional</span></label>
            <input type="number" inputMode="numeric" min="0" max="250" placeholder="e.g. 155" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes <span className="font-normal text-muted-foreground">optional</span></label>
        <textarea placeholder="How did it feel?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
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

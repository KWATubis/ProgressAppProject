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

type SegMode = "DIST" | "TIME";
type Seg = { mode: SegMode; dist: string; min: string; sec: string };
type Rep = { work: Seg; rest: Seg };

function blankSeg(mode: SegMode): Seg {
  return { mode, dist: "", min: "", sec: "" };
}
function blankRep(): Rep {
  return { work: blankSeg("DIST"), rest: blankSeg("TIME") };
}

function segSeconds(s: Seg): number {
  return (Number(s.min) || 0) * 60 + (Number(s.sec) || 0);
}
// Returns a lap payload for a segment, or null if the user left it empty.
function segToLap(s: Seg, isWork: boolean): { distanceM: number | null; durationSec: number | null; isWork: boolean } | null {
  const dist = s.dist !== "" ? Number(s.dist) : null;
  const secs = segSeconds(s);
  const dur = secs > 0 ? secs : null;
  if (dist == null && dur == null) return null;
  return { distanceM: dist, durationSec: dur, isWork };
}
function paceStr(secPerKm: number): string {
  return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")}`;
}

const inputClass =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground";
const small =
  "h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums text-center outline-none focus:border-foreground";

function SegEditor({
  label,
  seg,
  onChange,
}: {
  label: string;
  seg: Seg;
  onChange: (s: Seg) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex shrink-0 overflow-hidden rounded-md border">
        {(["DIST", "TIME"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ ...seg, mode: m })}
            className={cn(
              "px-2 py-1.5 text-xs font-medium transition-colors",
              seg.mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {m === "DIST" ? "Dist" : "Time"}
          </button>
        ))}
      </div>
      {seg.mode === "DIST" ? (
        <>
          <input className={`${small} w-16`} type="number" min="0" placeholder="m" value={seg.dist} onChange={(e) => onChange({ ...seg, dist: e.target.value })} />
          <span className="text-xs text-muted-foreground">in</span>
          <div className="flex items-center gap-1">
            <input className={`${small} w-12`} type="number" min="0" placeholder="m" value={seg.min} onChange={(e) => onChange({ ...seg, min: e.target.value })} />
            <span className="text-muted-foreground">:</span>
            <input className={`${small} w-12`} type="number" min="0" max="59" placeholder="s" value={seg.sec} onChange={(e) => onChange({ ...seg, sec: e.target.value })} />
          </div>
        </>
      ) : (
        <div className="flex items-center gap-1">
          <input className={`${small} w-14`} type="number" min="0" placeholder="min" value={seg.min} onChange={(e) => onChange({ ...seg, min: e.target.value })} />
          <span className="text-muted-foreground">:</span>
          <input className={`${small} w-14`} type="number" min="0" max="59" placeholder="sec" value={seg.sec} onChange={(e) => onChange({ ...seg, sec: e.target.value })} />
        </div>
      )}
    </div>
  );
}

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

  const autoPaceSecPerKm =
    distance && duration && Number(distance) > 0
      ? Math.round((Number(duration) * 60) / Number(distance))
      : null;
  const manualPaceSec = paceMin || paceSec ? Number(paceMin || 0) * 60 + Number(paceSec || 0) : null;
  const finalPaceSecPerKm = manualPaceSec ?? autoPaceSecPerKm;

  // Interval totals (work segments only)
  const workLaps = reps.map((r) => segToLap(r.work, true)).filter((l): l is NonNullable<typeof l> => l != null);
  const totalWorkM = workLaps.reduce((s, l) => s + (l.distanceM ?? 0), 0);
  const totalWorkSec = workLaps.reduce((s, l) => s + (l.durationSec ?? 0), 0);
  const intervalAvgPace = totalWorkM > 0 && totalWorkSec > 0 ? Math.round(totalWorkSec / (totalWorkM / 1000)) : null;

  function updateRep(i: number, part: "work" | "rest", seg: Seg) {
    setReps((prev) => prev.map((r, j) => (j === i ? { ...r, [part]: seg } : r)));
  }
  function addRep() {
    setReps((prev) => {
      const last = prev[prev.length - 1];
      // Carry the shape (modes + rest value) of the previous rep to speed repeated sets.
      return [...prev, last ? { work: { ...last.work, dist: last.work.dist, min: "", sec: "" }, rest: { ...last.rest } } : blankRep()];
    });
  }
  function removeRep(i: number) {
    setReps((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));
  }

  function submit() {
    if (isStructured) {
      const laps: { distanceM: number | null; durationSec: number | null; isWork: boolean }[] = [];
      for (const r of reps) {
        const w = segToLap(r.work, true);
        if (w) laps.push(w);
        const rest = segToLap(r.rest, false);
        if (rest) laps.push(rest);
      }
      if (laps.filter((l) => l.isWork).length === 0) {
        toast.error("Add at least one work rep with a distance or time.");
        return;
      }
      send({
        type: activityName,
        trainingType,
        distanceKm: totalWorkM > 0 ? totalWorkM / 1000 : null,
        durationMin: Math.round(laps.reduce((s, l) => s + (l.durationSec ?? 0), 0) / 60) || null,
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
        <div className="space-y-3">
          {reps.map((r, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Rep {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRep(i)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Remove rep"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <SegEditor label="Work" seg={r.work} onChange={(s) => updateRep(i, "work", s)} />
              <SegEditor label="Rest" seg={r.rest} onChange={(s) => updateRep(i, "rest", s)} />
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
              <span><span className="font-medium tabular-nums">{(totalWorkM / 1000).toFixed(2)}</span><span className="text-muted-foreground"> km work</span></span>
              <span><span className="font-medium tabular-nums">{workLaps.length}</span><span className="text-muted-foreground"> reps</span></span>
              {intervalAvgPace != null && (
                <span><span className="font-medium tabular-nums">{paceStr(intervalAvgPace)}</span><span className="text-muted-foreground"> /km avg</span></span>
              )}
            </div>
          )}
        </div>
      ) : (
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

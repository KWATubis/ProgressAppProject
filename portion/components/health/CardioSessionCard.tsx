"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteSessionButton } from "./DeleteSessionButton";

export type LapView = {
  lapIndex: number;
  distanceM: number | null;
  durationSec: number | null;
  avgPaceSecPerKm: number | null;
  avgHRBpm: number | null;
  isWork: boolean;
  recoverySec: number | null;
};

export type CardioSessionView = {
  id: string;
  dateStr: string;
  trainingType: string | null;
  source: string;
  distanceKm: number | null;
  durationMin: number | null;
  avgPaceSecPerKm: number | null;
  avgHRBpm: number | null;
  maxHRBpm: number | null;
  calories: number | null;
  elevationGainM: number | null;
  avgCadence: number | null;
  notes: string | null;
  laps: LapView[];
};

const TYPE_STYLES: Record<string, string> = {
  EASY: "bg-emerald-500/15 text-emerald-300",
  LONG: "bg-sky-500/15 text-sky-300",
  TEMPO: "bg-amber-500/15 text-amber-300",
  INTERVAL: "bg-rose-500/15 text-rose-300",
  FARTLEK: "bg-fuchsia-500/15 text-fuchsia-300",
  RECOVERY: "bg-teal-500/15 text-teal-300",
  RACE: "bg-red-500/20 text-red-300",
  GENERIC: "bg-white/10 text-muted-foreground",
};

function pace(secPerKm: number | null): string | null {
  if (secPerKm == null) return null;
  return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")}`;
}
function dur(sec: number | null): string | null {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="tabular-nums text-sm font-medium">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function CardioSessionCard({ session: s }: { session: CardioSessionView }) {
  const [open, setOpen] = useState(false);
  const hasLaps = s.laps.length > 1;
  const workLaps = s.laps.filter((l) => l.isWork);
  const showWorkSplit = workLaps.length > 0 && workLaps.length < s.laps.length;

  const metrics: { value: string; label: string }[] = [];
  if (s.distanceKm != null) metrics.push({ value: `${s.distanceKm.toFixed(2)}`, label: "km" });
  if (s.durationMin != null) metrics.push({ value: `${s.durationMin}`, label: "min" });
  if (s.avgPaceSecPerKm != null) metrics.push({ value: `${pace(s.avgPaceSecPerKm)}`, label: "/km" });
  if (s.avgHRBpm != null) metrics.push({ value: `${s.avgHRBpm}${s.maxHRBpm ? `/${s.maxHRBpm}` : ""}`, label: "HR avg/max" });
  if (s.calories != null) metrics.push({ value: `${s.calories}`, label: "kcal" });
  if (s.elevationGainM != null) metrics.push({ value: `${s.elevationGainM}`, label: "m climb" });
  if (s.avgCadence != null) metrics.push({ value: `${s.avgCadence}`, label: "spm" });

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{s.dateStr}</span>
          {s.trainingType && (
            <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", TYPE_STYLES[s.trainingType] ?? TYPE_STYLES.GENERIC)}>
              {s.trainingType[0] + s.trainingType.slice(1).toLowerCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {s.source === "garmin" && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Garmin
            </span>
          )}
          <DeleteSessionButton sessionId={s.id} />
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {metrics.map((m, i) => (
            <Metric key={i} value={m.value} label={m.label} />
          ))}
        </div>
      )}

      {s.notes && <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p>}

      {hasLaps && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            {open ? "Hide" : "Show"} splits ({showWorkSplit ? `${workLaps.length} work / ${s.laps.length - workLaps.length} rest` : `${s.laps.length} laps`})
          </button>

          {open && (
            <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="px-2 py-1.5 text-left font-medium">#</th>
                    <th className="px-2 py-1.5 text-right font-medium">Dist</th>
                    <th className="px-2 py-1.5 text-right font-medium">Time</th>
                    <th className="px-2 py-1.5 text-right font-medium">Pace</th>
                    <th className="px-2 py-1.5 text-right font-medium">HR</th>
                    {showWorkSplit && <th className="px-2 py-1.5 text-right font-medium" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {s.laps.map((l) => (
                    <tr key={l.lapIndex} className={cn("tabular-nums", showWorkSplit && !l.isWork && "text-muted-foreground/60")}>
                      <td className="px-2 py-1.5 text-left">{l.lapIndex + 1}</td>
                      <td className="px-2 py-1.5 text-right">{l.distanceM != null ? `${Math.round(l.distanceM)}m` : "—"}</td>
                      <td className="px-2 py-1.5 text-right">{dur(l.durationSec) ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right">{pace(l.avgPaceSecPerKm) ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right">{l.avgHRBpm ?? "—"}</td>
                      {showWorkSplit && (
                        <td className="px-2 py-1.5 text-right">
                          <span className={cn("rounded px-1 py-0.5 text-[10px]", l.isWork ? "bg-rose-500/15 text-rose-300" : "bg-white/5 text-muted-foreground")}>
                            {l.isWork ? "work" : "rest"}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

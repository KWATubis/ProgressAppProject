"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import {
  BodyDetailPanel,
  type WellnessTrendPoint,
} from "./BodyDetailPanel";
import type { BodySelection } from "./Humanoid";

const BodyScene = dynamic(() => import("./BodyScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-cyan-300/40">
      Loading body scan…
    </div>
  ),
});

type Props = {
  muscleStates: Record<MuscleGroup, MuscleState>;
  wellnessTrend: WellnessTrendPoint[];
};

export function BodyExplorer({ muscleStates, wellnessTrend }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState<BodySelection>(null);
  const mode: "preview" | "idle" | "focused" = !expanded
    ? "preview"
    : selection
      ? "focused"
      : "idle";

  const trainedCount = useMemo(
    () =>
      Object.values(muscleStates).filter(
        (s) => s.daysSince != null && s.daysSince <= 1,
      ).length,
    [muscleStates],
  );

  const handleSelect = (s: BodySelection) => {
    if (!expanded) {
      setExpanded(true);
      return;
    }
    setSelection(s);
  };

  return (
    <div className="relative h-[640px] w-full overflow-hidden rounded-2xl">
      {/* Atmospheric backdrop — only once expanded */}
      <div
        className={`pointer-events-none absolute inset-0 -z-10 transition-opacity duration-700 ${
          mode === "preview" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 30% 50%, rgba(91,227,255,0.12), transparent 60%), radial-gradient(ellipse 40% 60% at 70% 70%, rgba(58,168,255,0.05), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #5be3ff 1px, transparent 1px), linear-gradient(to bottom, #5be3ff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* scan-line sweep */}
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, transparent 49.5%, rgba(91,227,255,0.06) 50%, transparent 50.5%, transparent 100%)",
            backgroundSize: "100% 4px",
          }}
        />
      </div>

      {/* HUD: top-left status — hidden in preview */}
      {mode !== "preview" ? (
        <div className="pointer-events-none absolute left-5 top-5 z-10 space-y-2 animate-in fade-in duration-500">
          <div className="flex items-center gap-2">
            <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
              Body scan · live
            </span>
          </div>
          <div className="space-y-0.5 text-[10px] uppercase tracking-wider text-cyan-200/40">
            <div>
              Trained today / yest{" "}
              <span className="text-cyan-300/90 tabular-nums">{trainedCount}</span>
            </div>
            <div>
              Groups tracked{" "}
              <span className="text-cyan-300/90 tabular-nums">
                {Object.keys(muscleStates).length}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* HUD: legend bottom-left — hidden in preview */}
      {mode !== "preview" ? (
        <div className="pointer-events-none absolute bottom-5 left-5 z-10 animate-in fade-in duration-500">
          <div className="space-y-1 text-[10px] uppercase tracking-wider">
            <LegendRow color="#ef4444" label="Just trained" />
            <LegendRow color="#f97316" label="Sore" />
            <LegendRow color="#eab308" label="Recovering" />
            <LegendRow color="#10b981" label="Rested" />
          </div>
        </div>
      ) : null}

      {/* Preview hint — pre-click only. Body sits on the left, label on the right. */}
      {mode === "preview" ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-1/2 flex-col items-end justify-center px-10 text-right">
          <div className="max-w-xs">
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/60">
              Your body
            </div>
            <h3 className="mt-3 text-2xl font-light leading-tight text-cyan-50/90">
              An overview of your body.
            </h3>
            <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-cyan-200/40">
              Click to see
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.05] px-3 py-1.5 text-[10px] uppercase tracking-widest text-cyan-200/80">
              <span className="block h-1 w-1 animate-ping rounded-full bg-cyan-300" />
              Tap to expand
            </div>
          </div>
        </div>
      ) : null}

      {/* 3D scene fills the container */}
      <div className="absolute inset-0">
        <BodyScene
          muscleStates={muscleStates}
          selection={selection}
          onSelect={handleSelect}
          mode={mode}
        />
      </div>

      {/* Click-to-expand overlay — preview only. Sits above the canvas so any click expands. */}
      {mode === "preview" ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Expand body overview"
          className="absolute inset-0 z-20 cursor-pointer bg-transparent"
        />
      ) : null}

      {/* Detail panel slides in from right when focused */}
      <div
        className={`absolute right-5 top-5 bottom-5 z-20 w-[340px] transition-all duration-500 ease-out ${
          mode === "focused"
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-[120%] opacity-0"
        }`}
      >
        <div className="relative h-full overflow-hidden rounded-xl border border-cyan-500/20 bg-[rgba(5,12,20,0.75)] shadow-[0_0_40px_-10px_rgba(91,227,255,0.4)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-200/80 transition-colors hover:bg-cyan-500/10"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <div className="h-full pt-10">
            <BodyDetailPanel
              selection={selection}
              muscleStates={muscleStates}
              wellnessTrend={wellnessTrend}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="block h-1.5 w-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span style={{ color: `${color}b3` }}>{label}</span>
    </div>
  );
}

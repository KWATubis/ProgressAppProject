"use client";

import { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { ArrowLeft, X } from "lucide-react";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import { BodyDetailPanel, type WellnessTrendPoint } from "./BodyDetailPanel";
import type { BodySelection } from "./Humanoid";

const BodyScene = dynamic(() => import("./BodyScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-cyan-300/40">
      Loading body scan…
    </div>
  ),
});

// Avoid the setState-in-effect mount pattern; use useSyncExternalStore for client detection.
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type Props = {
  muscleStates: Record<MuscleGroup, MuscleState>;
  wellnessTrend: WellnessTrendPoint[];
};

export function BodyExplorer({ muscleStates, wellnessTrend }: Props) {
  const isClient = useIsClient();
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState<BodySelection>(null);

  // ESC closes the overlay
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        setSelection(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Lock page scroll while overlay is open
  useEffect(() => {
    if (expanded) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [expanded]);

  const trainedCount = useMemo(
    () =>
      Object.values(muscleStates).filter(
        (s) => s.daysSince != null && s.daysSince <= 1,
      ).length,
    [muscleStates],
  );

  const handleClose = useCallback(() => {
    setExpanded(false);
    setSelection(null);
  }, []);

  const fullscreenMode: "idle" | "focused" = selection ? "focused" : "idle";

  // Full-screen portal — covers sidebar, topbar, everything.
  const overlay =
    isClient && expanded
      ? createPortal(
          <div className="fixed inset-0 z-[9999] bg-[#030609] animate-in fade-in duration-300">
            {/* Subtle center glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 55% 70% at 50% 48%, rgba(91,227,255,0.08), transparent 65%)",
              }}
            />
            {/* Scan grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #5be3ff 1px, transparent 1px), linear-gradient(to bottom, #5be3ff 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            {/* HUD — top-left */}
            <div className="pointer-events-none absolute left-5 top-5 z-10 space-y-2">
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

            {/* Close — top-right */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-[10px] uppercase tracking-widest text-cyan-200/70 transition-colors hover:bg-cyan-500/10 hover:text-cyan-200"
            >
              <X className="h-3 w-3" />
              Close  ·  ESC
            </button>

            {/* Legend — bottom-left */}
            <div className="pointer-events-none absolute bottom-5 left-5 z-10">
              <div className="space-y-1 text-[10px] uppercase tracking-wider">
                <LegendRow color="#ef4444" label="Just trained" />
                <LegendRow color="#f97316" label="Sore" />
                <LegendRow color="#eab308" label="Recovering" />
                <LegendRow color="#10b981" label="Rested" />
              </div>
            </div>

            {/* Bottom-center controls hint */}
            {fullscreenMode === "idle" ? (
              <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-center">
                <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/25">
                  Click a muscle · Scroll to zoom · Drag to rotate
                </p>
              </div>
            ) : null}

            {/* 3D scene — fills the viewport */}
            <div className="absolute inset-0">
              <BodyScene
                muscleStates={muscleStates}
                selection={selection}
                onSelect={setSelection}
                mode={fullscreenMode}
              />
            </div>

            {/* Detail panel — slides in from right on muscle click */}
            <div
              className={`absolute bottom-5 right-5 top-5 z-20 w-[340px] transition-all duration-500 ease-out ${
                fullscreenMode === "focused"
                  ? "translate-x-0 opacity-100"
                  : "pointer-events-none translate-x-[120%] opacity-0"
              }`}
            >
              <div className="relative h-full overflow-hidden rounded-xl border border-cyan-500/20 bg-[rgba(5,12,20,0.80)] shadow-[0_0_40px_-10px_rgba(91,227,255,0.4)] backdrop-blur-md">
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
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {/* Preview card — lives in the page, always visible */}
      <div className="relative h-[320px] w-full overflow-hidden rounded-2xl">
        {/* Right-side label */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-1/2 flex-col items-end justify-center px-10 text-right">
          <div className="max-w-xs">
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/60">
              Your body
            </div>
            <h3 className="mt-3 text-2xl font-light leading-snug text-cyan-50/90">
              An overview of your body.
            </h3>
            <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-cyan-200/40">
              Click to see
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.05] px-3 py-1.5 text-[10px] uppercase tracking-widest text-cyan-200/70">
              <span className="block h-1 w-1 animate-ping rounded-full bg-cyan-300" />
              Tap to expand
            </div>
          </div>
        </div>

        {/* Spinning body — left half */}
        <div className="absolute inset-0">
          <BodyScene
            muscleStates={muscleStates}
            selection={null}
            onSelect={() => {}}
            mode="preview"
          />
        </div>

        {/* Transparent click-to-expand overlay on top of the canvas */}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Expand body overview"
          className="absolute inset-0 z-20 cursor-pointer bg-transparent"
        />
      </div>

      {overlay}
    </>
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

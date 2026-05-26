"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import {
  BodyDetailPanel,
  type WellnessTrendPoint,
} from "./BodyDetailPanel";
import type { BodySelection } from "./Humanoid";

const BodyScene = dynamic(() => import("./BodyScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
      Loading 3D scene…
    </div>
  ),
});

type Props = {
  muscleStates: Record<MuscleGroup, MuscleState>;
  wellnessTrend: WellnessTrendPoint[];
};

export function BodyExplorer({ muscleStates, wellnessTrend }: Props) {
  const [selection, setSelection] = useState<BodySelection>(null);

  return (
    <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-emerald-500/[0.04] via-white/[0.01] to-transparent">
      <div className="grid h-[520px] grid-cols-1 md:grid-cols-[1fr_300px]">
        <div className="relative">
          <BodyScene
            muscleStates={muscleStates}
            selection={selection}
            onSelect={setSelection}
          />
          <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1">
            <Legend />
          </div>
        </div>
        <div className="border-t border-white/10 md:border-l md:border-t-0">
          <BodyDetailPanel
            selection={selection}
            muscleStates={muscleStates}
            wellnessTrend={wellnessTrend}
            onClose={() => setSelection(null)}
          />
        </div>
      </div>
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-black/40 px-2 py-1.5 text-[10px] uppercase tracking-wider backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        <span className="text-rose-200/80">Just trained</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        <span className="text-orange-200/80">Sore</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        <span className="text-yellow-200/80">Recovering</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-emerald-200/80">Rested</span>
      </div>
    </div>
  );
}

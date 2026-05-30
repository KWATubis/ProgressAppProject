"use client";

import { Banknote, Check, Clapperboard, Dumbbell, Flame, Zap, type LucideIcon } from "lucide-react";
import type { Archetype, ArchetypeId } from "./defaults";
import type { WizardPlan } from "./types";

const ICONS: Record<ArchetypeId, LucideIcon> = {
  lifter: Dumbbell,
  cutAndBuild: Flame,
  contentSprinter: Clapperboard,
  sideHustler: Banknote,
  allIn: Zap,
};

function planPreview(plan: WizardPlan) {
  const goals = [...plan.health.goals, ...plan.money.goals].filter((g) => g.title.trim());
  const habitCount = [...plan.health.habits, ...plan.money.habits].filter((h) => h.checked).length;
  return { goals, habitCount };
}

export function ArchetypePicker({
  archetypes,
  selectedId,
  onSelect,
  userName,
}: {
  archetypes: Archetype[];
  selectedId: ArchetypeId | null;
  onSelect: (id: ArchetypeId) => void;
  userName: string | null;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">
        Who are you right now
      </div>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Pick your lane{userName ? `, ${userName}` : ""}.
      </h1>
      <p className="mt-3 max-w-xl text-base text-white/60">
        Start from a setup built for someone like you — then tweak every goal and habit on the next
        steps. Nothing here is locked in.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {archetypes.map((a) => {
          const Icon = ICONS[a.id];
          const { goals, habitCount } = planPreview(a.plan);
          const active = a.id === selectedId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              aria-pressed={active}
              className={`group relative flex flex-col rounded-2xl border p-5 text-left transition ${
                a.id === "allIn" ? "sm:col-span-2" : ""
              } ${
                active
                  ? "border-white bg-white/[0.07] shadow-[0_0_0_1px_rgba(255,255,255,0.6)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
              }`}
            >
              {active && (
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <Check className="h-4 w-4 text-black" strokeWidth={3} />
                </div>
              )}

              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                    active ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold tracking-tight">{a.name}</div>
                  <div className="text-sm text-white/70">{a.tagline}</div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-white/45">{a.blurb}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {goals.slice(0, 3).map((g, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-white/60"
                  >
                    {g.title}
                  </span>
                ))}
              </div>

              <div className="mt-4 border-t border-white/5 pt-3 text-[11px] uppercase tracking-wider text-white/40">
                {goals.length} {goals.length === 1 ? "goal" : "goals"} · {habitCount} habits
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

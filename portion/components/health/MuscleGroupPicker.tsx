"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MUSCLE_GROUPS: { region: string; muscles: string[] }[] = [
  { region: "Chest", muscles: ["Upper chest", "Middle chest", "Lower chest"] },
  { region: "Back", muscles: ["Lats", "Upper back", "Lower back", "Traps"] },
  { region: "Shoulders", muscles: ["Front delts", "Side delts", "Rear delts"] },
  { region: "Arms", muscles: ["Biceps", "Triceps", "Forearms"] },
  { region: "Legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Adductors", "Abductors", "Hip flexors"] },
  { region: "Core", muscles: ["Abs", "Obliques"] },
];

const MAX_MUSCLES = 3;
export const MUSCLE_TIER_LABELS = ["Primary", "Secondary", "Tertiary"] as const;

/** Value is ordered: index 0 = primary target, 1 = secondary, 2 = tertiary.
 * Secondary/tertiary movers are trained less directly, so they show up less
 * "tired" in the bodyscan than the primary muscle would. */
export function MuscleGroupPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(m: string) {
    if (value.includes(m)) {
      onChange(value.filter((x) => x !== m));
      return;
    }
    if (value.length >= MAX_MUSCLES) return;
    onChange([...value, m]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-foreground"
          />
        }
      >
        <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
          {value.length ? value.join(", ") : "Select muscle groups"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Muscle groups</DialogTitle>
        </DialogHeader>

        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.map((m, i) => (
              <span
                key={m}
                className="inline-flex items-center gap-1 rounded-full border border-foreground bg-foreground px-2.5 py-1 text-xs font-medium text-background"
              >
                <span className="opacity-60">{MUSCLE_TIER_LABELS[i]}</span>
                {m}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Pick up to {MAX_MUSCLES} — the order you tap them sets primary → secondary → tertiary.
          Secondary and tertiary muscles show less fatigue in the bodyscan than the primary one.
        </p>

        <div className="max-h-[45vh] space-y-3 overflow-y-auto">
          {MUSCLE_GROUPS.map((g) => (
            <div key={g.region}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.region}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {g.muscles.map((m) => {
                  const tier = value.indexOf(m);
                  const active = tier !== -1;
                  const disabled = !active && value.length >= MAX_MUSCLES;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggle(m)}
                      disabled={disabled}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : disabled
                            ? "border-border text-muted-foreground/40"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                      )}
                    >
                      {active && <span className="mr-1 opacity-60">{tier + 1}</span>}
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Done{value.length > 0 ? ` (${value.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

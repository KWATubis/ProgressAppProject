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

export function MuscleGroupPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(m: string) {
    onChange(value.includes(m) ? value.filter((x) => x !== m) : [...value, m]);
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
        <div className="max-h-[55vh] space-y-3 overflow-y-auto">
          {MUSCLE_GROUPS.map((g) => (
            <div key={g.region}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.region}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {g.muscles.map((m) => {
                  const active = value.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggle(m)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                      )}
                    >
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

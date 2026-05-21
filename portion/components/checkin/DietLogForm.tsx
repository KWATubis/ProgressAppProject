"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MACRO_TARGETS = { kcal: 2400, proteinG: 180, fatG: 65, carbsG: 301 };

const SLOTS = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Supper" },
] as const;

export type Meal = {
  id: string;
  slot: string;
  name: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}<span className="text-muted-foreground"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", value > target ? "bg-amber-500" : "bg-emerald-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DietLogForm({ dateISO, initialMeals }: { dateISO: string; initialMeals: Meal[] }) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [slot, setSlot] = useState<string>("BREAKFAST");
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [fatG, setFatG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [isPending, startTransition] = useTransition();

  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      fatG: acc.fatG + m.fatG,
      carbsG: acc.carbsG + m.carbsG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

  function add() {
    if (!name.trim() || kcal === "") {
      toast.error("Meal name and calories are required.");
      return;
    }
    const payload = {
      date: dateISO,
      slot,
      name: name.trim(),
      kcal: Number(kcal),
      proteinG: proteinG === "" ? 0 : Number(proteinG),
      fatG: fatG === "" ? 0 : Number(fatG),
      carbsG: carbsG === "" ? 0 : Number(carbsG),
    };
    startTransition(async () => {
      try {
        const res = await fetch("/api/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const { meal } = await res.json();
        setMeals((prev) => [...prev, meal]);
        setName(""); setKcal(""); setProteinG(""); setFatG(""); setCarbsG("");
        toast.success("Meal logged.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to log meal");
      }
    });
  }

  const input =
    "h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-4">
        <MacroBar label="Calories" value={totals.kcal} target={MACRO_TARGETS.kcal} unit="" />
        <MacroBar label="Protein" value={totals.proteinG} target={MACRO_TARGETS.proteinG} unit="g" />
        <MacroBar label="Fat" value={totals.fatG} target={MACRO_TARGETS.fatG} unit="g" />
        <MacroBar label="Carbs" value={totals.carbsG} target={MACRO_TARGETS.carbsG} unit="g" />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {SLOTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSlot(s.value)}
              className={cn(
                "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                slot === s.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input className={input} placeholder="Meal name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-4 gap-2">
          <input className={input} type="number" inputMode="numeric" min="0" placeholder="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          <input className={input} type="number" inputMode="decimal" min="0" placeholder="protein" value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
          <input className={input} type="number" inputMode="decimal" min="0" placeholder="fat" value={fatG} onChange={(e) => setFatG(e.target.value)} />
          <input className={input} type="number" inputMode="decimal" min="0" placeholder="carbs" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
        </div>
        <Button onClick={add} disabled={isPending} className="w-full" variant="secondary">
          <Plus className="mr-1 h-4 w-4" /> {isPending ? "Adding…" : "Add meal"}
        </Button>
      </div>

      {meals.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {meals.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {SLOTS.find((s) => s.value === m.slot)?.label ?? m.slot}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {m.kcal} kcal · {Math.round(m.proteinG)}P / {Math.round(m.fatG)}F / {Math.round(m.carbsG)}C
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

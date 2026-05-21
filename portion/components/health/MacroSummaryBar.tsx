import { cn } from "@/lib/utils";

const TARGETS = { kcal: 2400, proteinG: 180, fatG: 65, carbsG: 301 };

type Props = { kcal: number; proteinG: number; fatG: number; carbsG: number };

function Bar({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const over = value > target;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}
          <span className="text-muted-foreground">
            {" "}
            / {target}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            over ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MacroSummaryBar({ kcal, proteinG, fatG, carbsG }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Bar label="Calories" value={kcal} target={TARGETS.kcal} unit="" />
      <Bar label="Protein" value={proteinG} target={TARGETS.proteinG} unit="g" />
      <Bar label="Fat" value={fatG} target={TARGETS.fatG} unit="g" />
      <Bar label="Carbs" value={carbsG} target={TARGETS.carbsG} unit="g" />
    </div>
  );
}

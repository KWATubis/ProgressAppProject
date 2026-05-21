const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Supper",
};

export type MealItem = {
  id: string;
  slot: string;
  name: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export function MealCard({ meal }: { meal: MealItem }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{meal.name}</p>
        <p className="text-xs text-muted-foreground">
          {SLOT_LABELS[meal.slot] ?? meal.slot}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {meal.kcal} kcal · {Math.round(meal.proteinG)}P / {Math.round(meal.fatG)}F /{" "}
        {Math.round(meal.carbsG)}C
      </div>
    </div>
  );
}

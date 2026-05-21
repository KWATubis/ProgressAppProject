import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate, addDays, parseISODate } from "@/lib/utils/dates";
import { MacroSummaryBar } from "@/components/health/MacroSummaryBar";
import { MealCard, type MealItem } from "@/components/health/MealCard";

const SLOT_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export default async function HealthDietPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const today = toUtcMidnight();
  const date = params.date ? parseISODate(params.date) : today;
  const dateISO = formatISODate(date);

  const meals = await prisma.dietLog.findMany({
    where: { profileId: user.id, date },
    orderBy: { createdAt: "asc" },
  });

  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      fatG: acc.fatG + m.fatG,
      carbsG: acc.carbsG + m.carbsG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

  const grouped = SLOT_ORDER.map((slot) => ({
    slot,
    meals: meals.filter((m) => m.slot === slot),
  })).filter((g) => g.meals.length > 0);

  const prevDate = formatISODate(addDays(date, -1));
  const nextDate = formatISODate(addDays(date, 1));
  const isToday = dateISO === formatISODate(today);

  const displayDate = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const SLOT_LABELS: Record<string, string> = {
    BREAKFAST: "Breakfast",
    LUNCH: "Lunch",
    DINNER: "Dinner",
    SNACK: "Supper",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/health/diet?date=${prevDate}`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium">{displayDate}</span>
        <Link
          href={isToday ? "#" : `/health/diet?date=${nextDate}`}
          aria-disabled={isToday}
          className={
            isToday
              ? "pointer-events-none flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/30"
              : "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        {!isToday && (
          <Link
            href="/health/diet"
            className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Today
          </Link>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-card p-4">
        <MacroSummaryBar {...totals} />
      </div>

      {meals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meals logged for this day.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ slot, meals: slotMeals }) => (
            <div key={slot}>
              <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {SLOT_LABELS[slot] ?? slot}
              </p>
              <div className="divide-y rounded-lg border border-white/10 bg-card">
                {slotMeals.map((m) => (
                  <MealCard
                    key={m.id}
                    meal={m as MealItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, getWeekDates, formatISODate } from "@/lib/utils/dates";
import { WeeklyReflectionForm } from "@/components/checkin/WeeklyReflectionForm";

export default async function WeeklyReflectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = toUtcMidnight();
  const weekStart = getWeekDates(today)[0];
  const weekStartISO = weekStart.toISOString();

  const existing = await prisma.weeklyReflection.findUnique({
    where: { profileId_weekStart: { profileId: user.id, weekStart } },
    select: { wins: true, learning: true, priority: true },
  });

  const weekLabel = weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const isSunday = today.getUTCDay() === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/check-in"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Check-in
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly reflection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Week of {weekLabel}
          {isSunday && (
            <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
              Today — good time for this
            </span>
          )}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        5 minutes. Three questions. Keeps you from running blind.
      </p>

      <WeeklyReflectionForm weekStartISO={weekStartISO} initial={existing ?? null} />

      {existing && (
        <p className="text-xs text-muted-foreground">
          Last saved: {formatISODate(today)} — editing updates the existing entry.
        </p>
      )}
    </div>
  );
}

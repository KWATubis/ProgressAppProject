import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, getWeekDates, formatISODate } from "@/lib/utils/dates";
import { WeeklyReflectionForm } from "@/components/checkin/WeeklyReflectionForm";
import { PageHeading } from "@/components/layout/PageHeading";
import { Stagger } from "@/components/motion/Stagger";

export default async function WeeklyReflectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = toUtcMidnight();
  const weekStart = getWeekDates(today)[0];
  const weekStartISO = weekStart.toISOString();

  const [existing, history] = await Promise.all([
    prisma.weeklyReflection.findUnique({
      where: { profileId_weekStart: { profileId: user.id, weekStart } },
      select: { wins: true, learning: true, priority: true },
    }),
    prisma.weeklyReflection.findMany({
      where: { profileId: user.id, weekStart: { lt: weekStart } },
      orderBy: { weekStart: "desc" },
      select: { weekStart: true, wins: true, learning: true, priority: true },
    }),
  ]);

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
        <PageHeading
          title="Weekly reflection"
          description={
            <>
              Week of {weekLabel}
              {isSunday && (
                <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                  Today — good time for this
                </span>
              )}
            </>
          }
        />
      </div>

      <Stagger className="space-y-8" delay={0.08}>
      <p className="text-sm text-muted-foreground">
        5 minutes. Three questions. Keeps you from running blind.
      </p>

      <WeeklyReflectionForm weekStartISO={weekStartISO} initial={existing ?? null} />

      {history.length > 0 && (
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Past reflections
          </h2>
          <div className="space-y-4">
            {history.map((r) => {
              const label = r.weekStart.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              });
              return (
                <div
                  key={formatISODate(r.weekStart)}
                  className="rounded-xl border border-border bg-card/50 p-5 space-y-4"
                >
                  <p className="text-xs font-medium text-muted-foreground">Week of {label}</p>
                  {r.wins && (
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">🏆 Wins</p>
                      <p className="text-sm whitespace-pre-wrap">{r.wins}</p>
                    </div>
                  )}
                  {r.learning && (
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">📚 Learned</p>
                      <p className="text-sm whitespace-pre-wrap">{r.learning}</p>
                    </div>
                  )}
                  {r.priority && (
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">🎯 Priority set</p>
                      <p className="text-sm font-medium">{r.priority}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      </Stagger>
    </div>
  );
}

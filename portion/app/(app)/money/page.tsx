import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Coins, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight } from "@/lib/utils/dates";
import { Card, CardContent } from "@/components/ui/card";

type ActivitySummary = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  kind: "SOCIAL" | "SIDE_INCOME" | "MAIN_INCOME" | "BUSINESS";
  /** Latest meaningful value (followers for SOCIAL; this-month income for others). */
  primary: string;
  primaryLabel: string;
  /** Secondary metric (delta or count). */
  secondary: string | null;
  secondaryLabel: string | null;
};

export default async function MoneyOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = toUtcMidnight();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [goals, activities, incomeThisMonth] = await Promise.all([
    prisma.goal.findMany({
      where: { profileId: user.id, pillar: "MONEY", isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activityType.findMany({
      where: { profileId: user.id, pillar: "MONEY" },
      orderBy: { createdAt: "asc" },
      include: {
        socialMetrics: { orderBy: { date: "desc" }, take: 2 },
        incomeEntries: {
          where: { date: { gte: monthStart } },
          select: { amountPln: true },
        },
      },
    }),
    prisma.incomeEntry.findMany({
      where: { profileId: user.id, date: { gte: monthStart } },
      select: { amountPln: true },
    }),
  ]);

  const incomeGoal = goals.find(
    (g) => (g.unit ?? "").toLowerCase().includes("pln") || (g.unit ?? "").toLowerCase().includes("month"),
  );

  const monthIncome = incomeThisMonth.reduce((sum, e) => sum + e.amountPln, 0);
  const monthLabel = today.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const summaries: ActivitySummary[] = activities.map((a) => {
    if (a.kind === "SOCIAL") {
      const latest = a.socialMetrics[0];
      const prev = a.socialMetrics[1];
      const delta = latest && prev ? latest.followerCount - prev.followerCount : null;
      return {
        id: a.id,
        name: a.name,
        slug: a.slug,
        icon: a.icon,
        kind: a.kind as ActivitySummary["kind"],
        primary: latest ? latest.followerCount.toLocaleString() : "—",
        primaryLabel: "followers",
        secondary: delta != null ? `${delta >= 0 ? "+" : ""}${delta.toLocaleString()}` : null,
        secondaryLabel: delta != null ? "since last" : null,
      };
    }
    const sum = a.incomeEntries.reduce((acc, e) => acc + e.amountPln, 0);
    const count = a.incomeEntries.length;
    return {
      id: a.id,
      name: a.name,
      slug: a.slug,
      icon: a.icon,
      kind: a.kind as ActivitySummary["kind"],
      primary: `${sum.toLocaleString()} zł`,
      primaryLabel: "this month",
      secondary: count > 0 ? `${count}` : null,
      secondaryLabel: count > 0 ? (count === 1 ? "entry" : "entries") : null,
    };
  });

  return (
    <div className="space-y-8">
      {/* This month income summary */}
      <section>
        <Card className="border-white/10 bg-gradient-to-br from-indigo-500/[0.06] to-transparent shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)]">
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Total income · {monthLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tabular-nums">
                {monthIncome.toLocaleString()} zł
              </span>
              {incomeGoal?.targetValue != null && (
                <span className="text-sm text-muted-foreground">
                  / {incomeGoal.targetValue.toLocaleString()} zł
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Activities */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Activities</h2>
          <span className="text-xs text-muted-foreground">
            Add or click a tab above to drill in
          </span>
        </div>

        {activities.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-card/40">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-medium">No money activities yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tap the <span className="font-medium">+</span> in the nav above to add Social, Side Income,
                  Main Income, or Business.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {summaries.map((s) => (
              <Link
                key={s.id}
                href={`/money/activity/${s.slug}`}
                className="group rounded-lg border border-white/10 bg-card p-4 transition-colors hover:bg-accent/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {s.icon && <span className="text-base">{s.icon}</span>}
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{s.primary}</span>
                  <span className="text-xs text-muted-foreground">{s.primaryLabel}</span>
                </div>
                {s.secondary && (
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {s.secondary} {s.secondaryLabel}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Goals */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Money Goals</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No money goals set yet.</p>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => {
              const current = g.currentValue ?? 0;
              const start = g.startValue ?? 0;
              const target = g.targetValue;
              let pct: number | null = null;
              if (target != null && target !== start) {
                pct = Math.max(0, Math.min(100, Math.round(((current - start) / (target - start)) * 100)));
              }
              return (
                <div key={g.id} className="rounded-lg border border-white/10 bg-card p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{g.title}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {current.toLocaleString()}
                      {target != null && ` / ${target.toLocaleString()}`}
                      {g.unit ? ` ${g.unit}` : ""}
                    </span>
                  </div>
                  {pct != null && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {g.description && (
                    <p className="mt-2 text-xs text-muted-foreground">{g.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, addDays } from "@/lib/utils/dates";
import { Card, CardContent } from "@/components/ui/card";
import { AudienceProgressCard } from "@/components/money/AudienceProgressCard";

export default async function MoneyOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = toUtcMidnight();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const twentyEightDaysAgo = addDays(today, -28);

  const [goals, latestSocial, socialWindow, incomeThisMonth] = await Promise.all([
    prisma.goal.findMany({
      where: { profileId: user.id, pillar: "MONEY", isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.socialMetric.findFirst({
      where: { profileId: user.id, platform: "TIKTOK" },
      orderBy: { date: "desc" },
    }),
    prisma.socialMetric.findMany({
      where: { profileId: user.id, platform: "TIKTOK", date: { gte: twentyEightDaysAgo } },
      orderBy: { date: "asc" },
    }),
    prisma.incomeEntry.findMany({
      where: { profileId: user.id, date: { gte: monthStart } },
    }),
  ]);

  const followerGoal = goals.find((g) => (g.unit ?? "").toLowerCase().includes("follower"));
  const incomeGoal = goals.find(
    (g) => (g.unit ?? "").toLowerCase().includes("pln") || (g.unit ?? "").toLowerCase().includes("month"),
  );

  // Weekly follower growth from the 28-day window.
  let weeklyGrowth: number | null = null;
  if (socialWindow.length >= 2) {
    const first = socialWindow[0];
    const last = socialWindow[socialWindow.length - 1];
    const days = (last.date.getTime() - first.date.getTime()) / 86_400_000;
    if (days > 0) {
      weeklyGrowth = ((last.followerCount - first.followerCount) / days) * 7;
    }
  }

  const monthIncome = incomeThisMonth.reduce((sum, e) => sum + e.amountPln, 0);
  const monthLabel = today.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2">
        <AudienceProgressCard
          label="TikTok followers"
          current={latestSocial?.followerCount ?? 0}
          target={followerGoal?.targetValue ?? null}
          weeklyGrowth={weeklyGrowth}
        />
        <Card className="border-white/10 bg-gradient-to-br from-indigo-500/[0.06] to-transparent shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)]">
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Income · {monthLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums">
                {monthIncome.toLocaleString()} zł
              </span>
              {incomeGoal?.targetValue != null && (
                <span className="text-sm text-muted-foreground">
                  / {incomeGoal.targetValue.toLocaleString()} zł
                </span>
              )}
            </div>
            <Link
              href="/money/income"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Log income <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </section>

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

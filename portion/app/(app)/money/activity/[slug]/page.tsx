import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatISODate } from "@/lib/utils/dates";
import { SocialGrowthChart, type FollowerDataPoint } from "@/components/charts/SocialGrowthChart";
import { IncomeChart, type IncomeMonth } from "@/components/charts/IncomeChart";
import { SocialMetricForm } from "@/components/money/SocialMetricForm";
import { IncomeForm } from "@/components/money/IncomeForm";
import { IncomeList, type IncomeRow } from "@/components/money/IncomeList";

export default async function MoneyActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { slug } = await params;

  const activity = await prisma.activityType.findUnique({
    where: { profileId_slug: { profileId: user.id, slug } },
  });
  if (!activity || activity.pillar !== "MONEY") notFound();

  const header = (
    <div className="flex items-start justify-between gap-2">
      <h2 className="text-xl font-semibold">
        {activity.icon && <span className="mr-2">{activity.icon}</span>}
        {activity.name}
      </h2>
    </div>
  );

  // ─── SOCIAL ────────────────────────────────────────────────────────────────
  if (activity.kind === "SOCIAL") {
    const platformKey = activity.slug.toUpperCase();
    const [goals, metrics] = await Promise.all([
      prisma.goal.findMany({
        where: { profileId: user.id, pillar: "MONEY", isActive: true },
      }),
      prisma.socialMetric.findMany({
        where: {
          profileId: user.id,
          OR: [{ activityTypeId: activity.id }, { platform: platformKey, activityTypeId: null }],
        },
        orderBy: { date: "asc" },
      }),
    ]);

    const followerGoal = goals.find((g) => (g.unit ?? "").toLowerCase().includes("follower"));
    const chartData: FollowerDataPoint[] = metrics.map((m) => ({
      date: formatISODate(m.date),
      followerCount: m.followerCount,
    }));
    const history = [...metrics].reverse();
    const latest = history[0]?.followerCount;

    return (
      <div className="space-y-6">
        {header}

        {latest != null && (
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{latest.toLocaleString()}</p>
              <p className="text-muted-foreground">followers</p>
            </div>
            {history.length > 1 && (
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {(history[0].followerCount - history[history.length - 1].followerCount).toLocaleString()}
                </p>
                <p className="text-muted-foreground">gained all-time</p>
              </div>
            )}
          </div>
        )}

        <section className="space-y-3">
          <h3 className="text-base font-semibold">Log follower count</h3>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <SocialMetricForm platform={platformKey} activityTypeId={activity.id} />
          </div>
        </section>

        {chartData.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-base font-semibold">Growth</h3>
            <div className="rounded-lg border border-white/10 bg-card p-4">
              <SocialGrowthChart data={chartData} target={followerGoal?.targetValue ?? null} />
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-base font-semibold">History</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No follower counts logged yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Followers</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Videos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {history.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {m.date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {m.followerCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {m.videoCount != null ? m.videoCount.toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ─── INCOME-LIKE KINDS (SIDE_INCOME / MAIN_INCOME / BUSINESS) ───────────────
  const labelByKind: Record<string, { entryWord: string; submitLabel: string; descLabel: string }> = {
    SIDE_INCOME: { entryWord: "shift", submitLabel: "Log shift", descLabel: "Notes" },
    MAIN_INCOME: { entryWord: "paycheck", submitLabel: "Log paycheck", descLabel: "Notes" },
    BUSINESS: { entryWord: "deal", submitLabel: "Log deal", descLabel: "Client / notes" },
  };
  const cfg = labelByKind[activity.kind] ?? { entryWord: "entry", submitLabel: "Log entry", descLabel: "Notes" };

  const [goals, entries] = await Promise.all([
    prisma.goal.findMany({
      where: { profileId: user.id, pillar: "MONEY", isActive: true },
    }),
    prisma.incomeEntry.findMany({
      where: { profileId: user.id, activityTypeId: activity.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const incomeGoal = goals.find(
    (g) => (g.unit ?? "").toLowerCase().includes("pln") || (g.unit ?? "").toLowerCase().includes("month"),
  );

  const total = entries.reduce((sum, e) => sum + e.amountPln, 0);
  const now = new Date();
  const thisMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const thisMonthTotal = entries
    .filter((e) => `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, "0")}` === thisMonthKey)
    .reduce((sum, e) => sum + e.amountPln, 0);

  const byMonth = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + e.amountPln);
  }
  const monthData: IncomeMonth[] = Array.from(byMonth.entries())
    .map(([month, amountPln]) => ({ month, amountPln }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const rows: IncomeRow[] = entries.map((e) => ({
    id: e.id,
    date: formatISODate(e.date),
    source: e.source,
    amountPln: e.amountPln,
    description: e.description,
  }));

  return (
    <div className="space-y-6">
      {header}

      {entries.length > 0 && (
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{total.toLocaleString()} zł</p>
            <p className="text-muted-foreground">total all-time</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{thisMonthTotal.toLocaleString()} zł</p>
            <p className="text-muted-foreground">this month</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{entries.length}</p>
            <p className="text-muted-foreground">{cfg.entryWord}s logged</p>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{cfg.submitLabel}</h3>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <IncomeForm
            activityTypeId={activity.id}
            activityName={activity.name}
            submitLabel={cfg.submitLabel}
            descriptionLabel={cfg.descLabel}
          />
        </div>
      </section>

      {monthData.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Monthly</h3>
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <IncomeChart data={monthData} target={incomeGoal?.targetValue ?? null} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-semibold">History</h3>
        <IncomeList entries={rows} />
      </section>
    </div>
  );
}

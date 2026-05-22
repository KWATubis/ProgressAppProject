import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatISODate } from "@/lib/utils/dates";
import { SocialGrowthChart, type FollowerDataPoint } from "@/components/charts/SocialGrowthChart";
import { SocialMetricForm } from "@/components/money/SocialMetricForm";

export default async function MoneyContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [goals, metrics] = await Promise.all([
    prisma.goal.findMany({
      where: { profileId: user.id, pillar: "MONEY", isActive: true },
    }),
    prisma.socialMetric.findMany({
      where: { profileId: user.id, platform: "TIKTOK" },
      orderBy: { date: "asc" },
    }),
  ]);

  const followerGoal = goals.find((g) => (g.unit ?? "").toLowerCase().includes("follower"));
  const chartData: FollowerDataPoint[] = metrics.map((m) => ({
    date: formatISODate(m.date),
    followerCount: m.followerCount,
  }));
  const history = [...metrics].reverse();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Log Follower Count</h2>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <SocialMetricForm />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">TikTok Growth</h2>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <SocialGrowthChart data={chartData} target={followerGoal?.targetValue ?? null} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follower counts logged yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Platform</th>
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
                    <td className="px-4 py-2.5">
                      {m.platform.charAt(0) + m.platform.slice(1).toLowerCase()}
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

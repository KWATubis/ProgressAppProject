import { Card, CardContent } from "@/components/ui/card";

export function AudienceProgressCard({
  label,
  current,
  target,
  weeklyGrowth,
}: {
  label: string;
  current: number;
  target: number | null;
  weeklyGrowth: number | null;
}) {
  const pct =
    target && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : null;

  let projection: string | null = null;
  if (target && weeklyGrowth && weeklyGrowth > 0 && current < target) {
    const weeksLeft = Math.ceil((target - current) / weeklyGrowth);
    const eta = new Date();
    eta.setDate(eta.getDate() + weeksLeft * 7);
    projection = `~${eta.toLocaleDateString("en-GB", { month: "short", year: "numeric" })} at +${Math.round(weeklyGrowth).toLocaleString()}/wk`;
  }

  return (
    <Card className="border-white/10 bg-gradient-to-br from-indigo-500/[0.06] to-transparent shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)]">
      <CardContent className="space-y-3 py-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          {pct != null && (
            <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums">{current.toLocaleString()}</span>
          {target != null && (
            <span className="text-sm text-muted-foreground">/ {target.toLocaleString()}</span>
          )}
        </div>
        {pct != null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {projection ?? (weeklyGrowth != null ? "Keep logging to project a date." : "Log follower counts to track growth.")}
        </p>
      </CardContent>
    </Card>
  );
}

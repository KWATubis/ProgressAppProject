import { Scale, Flame, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Stat = {
  icon: "weight" | "kcal" | "followers";
  label: string;
  value: string;
  sub?: string;
};

const ICONS = {
  weight: Scale,
  kcal: Flame,
  followers: Users,
};

export function QuickStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <Card
            key={s.label}
            className="border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)]"
          >
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
                <div className="truncate text-lg font-semibold tabular-nums">{s.value}</div>
                {s.sub && (
                  <div className="truncate text-xs text-muted-foreground">{s.sub}</div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

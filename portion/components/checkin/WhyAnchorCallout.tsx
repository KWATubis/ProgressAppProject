import { Anchor, Dumbbell, TrendingUp } from "lucide-react";

export type WhyAnchor = {
  id: string;
  title: string;
  whyStatement: string;
  pillar: "HEALTH" | "MONEY";
};

/**
 * Surfaced on the daily check-in on Sundays only (see check-in/page.tsx).
 * Replays the user's own stated reason for each goal so they don't lose the
 * thread of why — VOC Theme 6. Pure display; the Sunday gate lives upstream.
 */
export function WhyAnchorCallout({ anchors }: { anchors: WhyAnchor[] }) {
  if (anchors.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.07] to-transparent p-5">
      <div className="flex items-center gap-2">
        <Anchor className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-semibold tracking-tight">Why you started</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        It&apos;s Sunday. Before you log the day — here&apos;s the thread. Don&apos;t lose it.
      </p>

      <ul className="mt-4 space-y-3">
        {anchors.map((a) => {
          const Icon = a.pillar === "HEALTH" ? Dumbbell : TrendingUp;
          return (
            <li key={a.id} className="flex gap-3">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">{a.title}</p>
                <p className="text-sm leading-snug text-foreground/90">
                  &ldquo;{a.whyStatement}&rdquo;
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

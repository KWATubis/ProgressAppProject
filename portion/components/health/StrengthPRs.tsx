import type { StrengthPR } from "@/lib/strength";

/** All-time top lifts by estimated 1RM. Renders nothing when there's no
 *  weighted history yet — the page gates on `prs.length`. */
export function StrengthPRs({ prs }: { prs: StrengthPR[] }) {
  return (
    <div className="divide-y divide-white/5 rounded-lg border border-white/10 bg-card">
      {prs.map((pr, i) => (
        <div key={pr.exerciseId} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{pr.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {pr.weightKg}kg × {pr.reps} · {pr.category}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">
              {pr.e1RM} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">est. 1RM</p>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { Scale, Flame, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/motion/CountUp";

type Stat = {
  icon: "weight" | "kcal" | "followers";
  label: string;
  /** null → no data yet, renders as "—" */
  value: number | null;
  unit?: string;
  decimals?: number;
  /** format with thousands separators (e.g. follower counts) */
  thousands?: boolean;
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
          <motion.div
            key={s.label}
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
          >
            <Card className="h-full border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)] transition-colors hover:border-white/20">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="flex items-baseline gap-1">
                    {s.value === null ? (
                      <span className="font-display text-2xl leading-none text-muted-foreground">
                        —
                      </span>
                    ) : (
                      <>
                        <CountUp
                          value={s.value}
                          decimals={s.decimals ?? 0}
                          className="font-display text-2xl leading-none tabular-nums"
                          format={
                            s.thousands ? (n) => Math.round(n).toLocaleString() : undefined
                          }
                        />
                        {s.unit && (
                          <span className="text-xs text-muted-foreground">{s.unit}</span>
                        )}
                      </>
                    )}
                  </div>
                  {s.sub && (
                    <div className="truncate text-xs text-muted-foreground">{s.sub}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

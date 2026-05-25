// Server-only: this file imports Prisma. Never import from client components.
import { prisma } from "@/lib/prisma";

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Compute the current numeric value for a given metric key, for the given
 * profile. Returns null when the user has no data yet.
 */
export async function computeMetricValue(profileId: string, key: string): Promise<number | null> {
  switch (key) {
    case "body.weightKg":
    case "body.bodyFatPct":
    case "body.waistCm":
    case "body.chestCm":
    case "body.armCm":
    case "body.thighCm": {
      const field = key.split(".")[1] as
        | "weightKg"
        | "bodyFatPct"
        | "waistCm"
        | "chestCm"
        | "armCm"
        | "thighCm";
      const latest = await prisma.bodyMetric.findFirst({
        where: { profileId, [field]: { not: null } },
        orderBy: { date: "desc" },
        select: { [field]: true },
      });
      const v = latest?.[field];
      return typeof v === "number" ? v : null;
    }

    case "social.tiktok.followers":
    case "social.instagram.followers":
    case "social.youtube.followers": {
      const platform = key.split(".")[1].toUpperCase();
      const latest = await prisma.socialMetric.findFirst({
        where: { profileId, platform },
        orderBy: { date: "desc" },
        select: { followerCount: true },
      });
      return latest?.followerCount ?? null;
    }

    case "income.monthly": {
      const start = startOfMonthUTC(new Date());
      const rows = await prisma.incomeEntry.findMany({
        where: { profileId, date: { gte: start } },
        select: { amountPln: true },
      });
      if (rows.length === 0) return null;
      return rows.reduce((s, r) => s + r.amountPln, 0);
    }

    case "income.total": {
      const rows = await prisma.incomeEntry.findMany({
        where: { profileId },
        select: { amountPln: true },
      });
      if (rows.length === 0) return null;
      return rows.reduce((s, r) => s + r.amountPln, 0);
    }

    case "tasks.perfectDays": {
      const logs = await prisma.taskLog.findMany({
        where: { profileId },
        select: { date: true, status: true },
      });
      const byDate = new Map<number, { complete: boolean; pending: boolean }>();
      for (const log of logs) {
        const t = log.date.getTime();
        const prev = byDate.get(t) ?? { complete: false, pending: false };
        byDate.set(t, {
          complete: prev.complete || log.status === "COMPLETE",
          pending: prev.pending || log.status === "PENDING",
        });
      }
      let count = 0;
      for (const { complete, pending } of byDate.values()) {
        if (complete && !pending) count++;
      }
      return count;
    }

    default:
      return null;
  }
}

/** Resolve fresh currentValue for an array of goals — leaves goals without
 *  metricKey untouched. Returns a new array of the same shape. */
export async function withDerivedCurrent<T extends { id: string; profileId: string; metricKey: string | null; currentValue: number | null }>(
  goals: T[],
): Promise<T[]> {
  const out: T[] = [];
  for (const g of goals) {
    if (g.metricKey) {
      const v = await computeMetricValue(g.profileId, g.metricKey);
      out.push({ ...g, currentValue: v });
    } else {
      out.push(g);
    }
  }
  return out;
}

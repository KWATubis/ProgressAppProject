// Server-only: this file imports Prisma. Never import from client components.
import { prisma } from "@/lib/prisma";

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Aggregate `MetricEntry` rows for a custom metric according to its
 * declared aggregation mode. Returns null when the metric has no entries
 * yet (so the goal card can show an em-dash instead of a stale zero).
 */
export async function computeCustomMetricValue(
  customMetricId: string,
): Promise<number | null> {
  const metric = await prisma.customMetric.findUnique({
    where: { id: customMetricId },
    select: { aggregation: true },
  });
  if (!metric) return null;

  switch (metric.aggregation) {
    case "LATEST": {
      const latest = await prisma.metricEntry.findFirst({
        where: { customMetricId },
        orderBy: { date: "desc" },
        select: { value: true },
      });
      return latest?.value ?? null;
    }
    case "MAX": {
      const agg = await prisma.metricEntry.aggregate({
        where: { customMetricId },
        _max: { value: true },
      });
      return agg._max.value ?? null;
    }
    case "SUM": {
      const agg = await prisma.metricEntry.aggregate({
        where: { customMetricId },
        _sum: { value: true },
      });
      return agg._sum.value ?? null;
    }
    case "AVG": {
      const agg = await prisma.metricEntry.aggregate({
        where: { customMetricId },
        _avg: { value: true },
      });
      return agg._avg.value ?? null;
    }
    case "COUNT": {
      const n = await prisma.metricEntry.count({ where: { customMetricId } });
      return n;
    }
    default:
      return null;
  }
}

/**
 * Compute the current numeric value for a given metric key, for the given
 * profile. Returns null when the user has no data yet.
 *
 * Activity-scoped keys (prefix `activity.`) need the goal's activityTypeId;
 * if missing they resolve to null.
 */
export async function computeMetricValue(
  profileId: string,
  key: string,
  activityTypeId?: string | null,
): Promise<number | null> {
  if (key.startsWith("activity.")) {
    if (!activityTypeId) return null;
    switch (key) {
      case "activity.sessions.total": {
        return prisma.workoutSession.count({
          where: { profileId, activityTypeId },
        });
      }
      case "activity.cardio.distanceTotal": {
        const rows = await prisma.runEntry.findMany({
          where: { session: { profileId, activityTypeId } },
          select: { distanceKm: true },
        });
        if (rows.length === 0) return null;
        return rows.reduce((s, r) => s + (r.distanceKm ?? 0), 0);
      }
      case "activity.social.followers": {
        const latest = await prisma.socialMetric.findFirst({
          where: { profileId, activityTypeId },
          orderBy: { date: "desc" },
          select: { followerCount: true },
        });
        return latest?.followerCount ?? null;
      }
      case "activity.income.monthly": {
        const start = startOfMonthUTC(new Date());
        const rows = await prisma.incomeEntry.findMany({
          where: { profileId, activityTypeId, date: { gte: start } },
          select: { amountPln: true },
        });
        if (rows.length === 0) return null;
        return rows.reduce((s, r) => s + r.amountPln, 0);
      }
      case "activity.income.total": {
        const rows = await prisma.incomeEntry.findMany({
          where: { profileId, activityTypeId },
          select: { amountPln: true },
        });
        if (rows.length === 0) return null;
        return rows.reduce((s, r) => s + r.amountPln, 0);
      }
      case "activity.business.clients": {
        const latest = await prisma.businessMetric.findFirst({
          where: { profileId, activityTypeId, clients: { not: null } },
          orderBy: { date: "desc" },
          select: { clients: true },
        });
        return latest?.clients ?? null;
      }
      case "activity.business.leadsTotal": {
        const rows = await prisma.businessMetric.findMany({
          where: { profileId, activityTypeId, leads: { not: null } },
          select: { leads: true },
        });
        if (rows.length === 0) return null;
        return rows.reduce((s, r) => s + (r.leads ?? 0), 0);
      }
      case "activity.business.dealsTotal": {
        const rows = await prisma.businessMetric.findMany({
          where: { profileId, activityTypeId, deals: { not: null } },
          select: { deals: true },
        });
        if (rows.length === 0) return null;
        return rows.reduce((s, r) => s + (r.deals ?? 0), 0);
      }
      default:
        return null;
    }
  }

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
 *  metricKey/customMetricId untouched. Returns a new array of the same shape. */
export async function withDerivedCurrent<
  T extends {
    id: string;
    profileId: string;
    metricKey: string | null;
    currentValue: number | null;
    activityTypeId?: string | null;
    customMetricId?: string | null;
  },
>(goals: T[]): Promise<T[]> {
  const out: T[] = [];
  for (const g of goals) {
    if (g.customMetricId) {
      const v = await computeCustomMetricValue(g.customMetricId);
      out.push({ ...g, currentValue: v });
    } else if (g.metricKey) {
      const v = await computeMetricValue(g.profileId, g.metricKey, g.activityTypeId ?? null);
      out.push({ ...g, currentValue: v });
    } else {
      out.push(g);
    }
  }
  return out;
}

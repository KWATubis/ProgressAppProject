import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, addDays } from "@/lib/utils/dates";
import { getGarminClient, resetGarminClient } from "./client";

type DailySummary = {
  totalKilocalories?: number | null;
  activeKilocalories?: number | null;
  bmrKilocalories?: number | null;
  restingHeartRate?: number | null;
  minHeartRate?: number | null;
  maxHeartRate?: number | null;
  averageHeartRateInBeatsPerMinute?: number | null;
  totalSteps?: number | null;
};

type HeartRateResponse = {
  restingHeartRate?: number | null;
  minHeartRate?: number | null;
  maxHeartRate?: number | null;
  heartRateValues?: Array<[number, number | null]> | null;
};

type SleepResponse = {
  dailySleepDTO?: {
    sleepTimeSeconds?: number | null;
    deepSleepSeconds?: number | null;
    lightSleepSeconds?: number | null;
    remSleepSeconds?: number | null;
    awakeSleepSeconds?: number | null;
    sleepStartTimestampGMT?: number | null;
    sleepEndTimestampGMT?: number | null;
  } | null;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function avg(values: Array<[number, number | null]> | null | undefined): number | null {
  if (!values || values.length === 0) return null;
  let sum = 0;
  let count = 0;
  for (const v of values) {
    const hr = v?.[1];
    if (typeof hr === "number" && hr > 0) {
      sum += hr;
      count++;
    }
  }
  return count === 0 ? null : Math.round(sum / count);
}

async function fetchDay(date: Date) {
  let gc = await getGarminClient();
  const iso = isoDate(date);

  const get = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/401|forbidden|unauthor/i.test(msg)) {
        resetGarminClient();
        gc = await getGarminClient();
        return await fn();
      }
      console.warn(`[garmin] ${iso} fetch failed:`, msg);
      return null;
    }
  };

  const [summary, hr, sleep, steps] = await Promise.all([
    get(() =>
      gc.get<DailySummary>(
        `https://connectapi.garmin.com/usersummary-service/usersummary/daily?calendarDate=${iso}`,
      ),
    ),
    get(() => gc.getHeartRate(date) as Promise<HeartRateResponse>),
    get(() => gc.getSleepData(date) as Promise<SleepResponse>),
    get(() => gc.getSteps(date) as Promise<number | null>),
  ]);

  return { iso, summary, hr, sleep, steps };
}

export async function syncWellnessDay(profileId: string, date: Date) {
  const day = toUtcMidnight(date);
  const { summary, hr, sleep, steps } = await fetchDay(date);
  const sleepDto = sleep?.dailySleepDTO ?? null;

  const data = {
    restingHeartRate: hr?.restingHeartRate ?? summary?.restingHeartRate ?? null,
    minHeartRate: hr?.minHeartRate ?? summary?.minHeartRate ?? null,
    maxHeartRate: hr?.maxHeartRate ?? summary?.maxHeartRate ?? null,
    avgHeartRate:
      summary?.averageHeartRateInBeatsPerMinute ?? avg(hr?.heartRateValues),
    hrSamples: (hr?.heartRateValues ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
    steps: typeof steps === "number" ? steps : summary?.totalSteps ?? null,
    activeCalories:
      summary?.activeKilocalories != null
        ? Math.round(summary.activeKilocalories)
        : null,
    restingCalories:
      summary?.bmrKilocalories != null
        ? Math.round(summary.bmrKilocalories)
        : null,
    totalCalories:
      summary?.totalKilocalories != null
        ? Math.round(summary.totalKilocalories)
        : null,
    sleepSeconds: sleepDto?.sleepTimeSeconds ?? null,
    deepSleepSeconds: sleepDto?.deepSleepSeconds ?? null,
    lightSleepSeconds: sleepDto?.lightSleepSeconds ?? null,
    remSleepSeconds: sleepDto?.remSleepSeconds ?? null,
    awakeSleepSeconds: sleepDto?.awakeSleepSeconds ?? null,
    sleepStartTs: sleepDto?.sleepStartTimestampGMT
      ? new Date(sleepDto.sleepStartTimestampGMT)
      : null,
    sleepEndTs: sleepDto?.sleepEndTimestampGMT
      ? new Date(sleepDto.sleepEndTimestampGMT)
      : null,
    syncedAt: new Date(),
  };

  return prisma.wellnessDay.upsert({
    where: { profileId_date: { profileId, date: day } },
    create: { profileId, date: day, ...data },
    update: data,
  });
}

export async function syncLastNDays(profileId: string, n: number) {
  const today = toUtcMidnight();
  const results: Array<{ date: string; ok: boolean; err?: string }> = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(today, -i);
    try {
      await syncWellnessDay(profileId, d);
      results.push({ date: isoDate(d), ok: true });
    } catch (err) {
      results.push({
        date: isoDate(d),
        ok: false,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

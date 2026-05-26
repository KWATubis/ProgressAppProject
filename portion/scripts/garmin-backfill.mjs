// One-off backfill: sync last N days of Garmin wellness into Postgres.
// $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node scripts/garmin-backfill.mjs [days]
import { GarminConnect } from "garmin-connect";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" });

const profileId = process.env.SEED_USER_ID;
if (!profileId) throw new Error("SEED_USER_ID missing.");
const days = Number(process.argv[2] ?? 7);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const gc = new GarminConnect({
  username: process.env.GARMIN_EMAIL,
  password: process.env.GARMIN_PASSWORD,
});
await gc.login();
console.log(`Logged in. Backfilling last ${days} days for ${profileId}.`);

function toUtcMidnight(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function avg(values) {
  if (!values || values.length === 0) return null;
  let sum = 0, count = 0;
  for (const v of values) {
    const hr = v?.[1];
    if (typeof hr === "number" && hr > 0) { sum += hr; count++; }
  }
  return count === 0 ? null : Math.round(sum / count);
}

const today = toUtcMidnight(new Date());

for (let i = 0; i < days; i++) {
  const d = new Date(today.getTime() - i * 86400000);
  const iso = isoDate(d);
  try {
    const [summary, hr, sleep, steps] = await Promise.all([
      gc.get(`https://connectapi.garmin.com/usersummary-service/usersummary/daily?calendarDate=${iso}`).catch(() => null),
      gc.getHeartRate(d).catch(() => null),
      gc.getSleepData(d).catch(() => null),
      gc.getSteps(d).catch(() => null),
    ]);
    const sleepDto = sleep?.dailySleepDTO ?? null;
    const data = {
      restingHeartRate: hr?.restingHeartRate ?? summary?.restingHeartRate ?? null,
      minHeartRate: hr?.minHeartRate ?? summary?.minHeartRate ?? null,
      maxHeartRate: hr?.maxHeartRate ?? summary?.maxHeartRate ?? null,
      avgHeartRate: summary?.averageHeartRateInBeatsPerMinute ?? avg(hr?.heartRateValues),
      hrSamples: hr?.heartRateValues ?? null,
      steps: typeof steps === "number" ? steps : summary?.totalSteps ?? null,
      activeCalories: summary?.activeKilocalories != null ? Math.round(summary.activeKilocalories) : null,
      restingCalories: summary?.bmrKilocalories != null ? Math.round(summary.bmrKilocalories) : null,
      totalCalories: summary?.totalKilocalories != null ? Math.round(summary.totalKilocalories) : null,
      sleepSeconds: sleepDto?.sleepTimeSeconds ?? null,
      deepSleepSeconds: sleepDto?.deepSleepSeconds ?? null,
      lightSleepSeconds: sleepDto?.lightSleepSeconds ?? null,
      remSleepSeconds: sleepDto?.remSleepSeconds ?? null,
      awakeSleepSeconds: sleepDto?.awakeSleepSeconds ?? null,
      sleepStartTs: sleepDto?.sleepStartTimestampGMT ? new Date(sleepDto.sleepStartTimestampGMT) : null,
      sleepEndTs: sleepDto?.sleepEndTimestampGMT ? new Date(sleepDto.sleepEndTimestampGMT) : null,
      syncedAt: new Date(),
    };
    await prisma.wellnessDay.upsert({
      where: { profileId_date: { profileId, date: d } },
      create: { profileId, date: d, ...data },
      update: data,
    });
    console.log(`✓ ${iso}  steps=${data.steps}  rhr=${data.restingHeartRate}  burn=${data.totalCalories}  sleep=${data.sleepSeconds ? Math.round(data.sleepSeconds / 60) + "min" : "—"}`);
  } catch (err) {
    console.log(`✗ ${iso}  ${err.message}`);
  }
}

await prisma.$disconnect();
console.log("Done.");

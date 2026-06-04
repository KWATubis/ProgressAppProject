/**
 * Local Garmin sync — wellness + activities, straight into the (shared) DB.
 *
 * Garmin Connect's login is Cloudflare-protected and blocks datacenter IPs, so
 * this runs on the user's own machine (home IP), not on Vercel. Because dev and
 * prod share the same Supabase database, anything written here shows up on the
 * live site immediately.
 *
 *   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npm run garmin          # last 7 days wellness + recent activities
 *   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npm run garmin -- 30    # last 30 days wellness
 *
 * Activities are pulled from Garmin Connect (the watch syncs there over wifi/
 * phone) — no plugging in the watch, no dropping .FIT files.
 */
import { GarminConnect } from "garmin-connect";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { unzipSync } from "fflate";
import { config } from "dotenv";
import { parseFit } from "../lib/garmin/parse-fit";
import { mapSportToActivity } from "../lib/garmin/sport-map";

config({ path: ".env.local" });

const DOWNLOAD_ZIP = "https://connectapi.garmin.com/download-service/files/activity/";

const profileId = process.env.SEED_USER_ID;
if (!profileId) throw new Error("SEED_USER_ID missing in .env.local");
if (!process.env.GARMIN_EMAIL || !process.env.GARMIN_PASSWORD) {
  throw new Error("GARMIN_EMAIL / GARMIN_PASSWORD missing in .env.local");
}

const days = Number(process.argv[2] ?? 7);
const activityLimit = 15; // how many recent activities to scan for new ones

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
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

// ── Wellness ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncWellness(gc: any) {
  const today = toUtcMidnight(new Date());
  console.log(`\nWellness — last ${days} day(s):`);
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getTime() - i * 86400000);
    const iso = isoDate(d);
    try {
      const [summary, hr, sleep, steps] = await Promise.all([
        gc
          .get(`https://connectapi.garmin.com/usersummary-service/usersummary/daily?calendarDate=${iso}`)
          .catch(() => null),
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
        hrSamples: hr?.heartRateValues ?? undefined,
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
        where: { profileId_date: { profileId: profileId!, date: d } },
        create: { profileId: profileId!, date: d, ...data },
        update: data,
      });
      console.log(
        `  ✓ ${iso}  steps=${data.steps ?? "—"}  rhr=${data.restingHeartRate ?? "—"}  burn=${data.totalCalories ?? "—"}  sleep=${data.sleepSeconds ? Math.round(data.sleepSeconds / 60) + "min" : "—"}`,
      );
    } catch (err) {
      console.log(`  ✗ ${iso}  ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ── Activities ───────────────────────────────────────────────────────────────
function gmtToIso(startTimeGMT: string): string {
  // Garmin returns "2026-06-04 10:30:00" in GMT.
  return new Date(startTimeGMT.replace(" ", "T") + "Z").toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function downloadFit(gc: any, activityId: number): Promise<Uint8Array | null> {
  const zipBuf = await gc.client.get(`${DOWNLOAD_ZIP}${activityId}`, { responseType: "arraybuffer" });
  const files = unzipSync(new Uint8Array(zipBuf));
  const fitName = Object.keys(files).find((n) => n.toLowerCase().endsWith(".fit"));
  return fitName ? files[fitName] : null;
}

const activityCache = new Map<string, string>();
async function ensureActivity(sport: string): Promise<string> {
  const m = mapSportToActivity(sport);
  const cached = activityCache.get(m.slug);
  if (cached) return cached;
  const activity = await prisma.activityType.upsert({
    where: { profileId_slug: { profileId: profileId!, slug: m.slug } },
    create: { profileId: profileId!, name: m.name, slug: m.slug, icon: m.icon, kind: "CARDIO" },
    update: {},
    select: { id: true },
  });
  activityCache.set(m.slug, activity.id);
  return activity.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncActivities(gc: any) {
  console.log(`\nActivities — scanning ${activityLimit} most recent:`);
  const activities: Array<{ activityId: number; startTimeGMT: string; activityName?: string }> =
    await gc.getActivities(0, activityLimit);

  const known = await prisma.workoutSession.findMany({
    where: { profileId: profileId!, source: "garmin" },
    select: { externalId: true },
  });
  const knownIds = new Set(known.map((w) => w.externalId).filter((x): x is string => !!x));

  let imported = 0;
  let skipped = 0;
  for (const a of activities) {
    const label = a.activityName ? `"${a.activityName}"` : `#${a.activityId}`;
    try {
      // Fast path: already imported (matched on start time).
      if (a.startTimeGMT && knownIds.has(gmtToIso(a.startTimeGMT))) {
        skipped++;
        continue;
      }
      const bytes = await downloadFit(gc, a.activityId);
      const parsed = bytes ? parseFit(bytes) : null;
      if (!parsed) {
        console.log(`  ✗ ${label}  not a valid FIT activity`);
        continue;
      }
      // Authoritative dedupe on the FIT's own start timestamp.
      if (knownIds.has(parsed.externalId)) {
        skipped++;
        continue;
      }
      const activityTypeId = await ensureActivity(parsed.sport);
      const sportName = mapSportToActivity(parsed.sport).name;
      await prisma.workoutSession.create({
        data: {
          profileId: profileId!,
          activityTypeId,
          date: parsed.startTime,
          type: sportName,
          durationMin: parsed.durationMin,
          source: "garmin",
          externalId: parsed.externalId,
          runs: {
            create: {
              type: sportName,
              trainingType: parsed.trainingType,
              distanceKm: parsed.distanceKm,
              durationMin: parsed.durationMin,
              avgPaceSecPerKm: parsed.avgPaceSecPerKm,
              avgHRBpm: parsed.avgHRBpm,
              maxHRBpm: parsed.maxHRBpm,
              calories: parsed.calories,
              elevationGainM: parsed.elevationGainM,
              avgCadence: parsed.avgCadence,
              laps: {
                create: parsed.laps.map((l) => ({
                  lapIndex: l.lapIndex,
                  distanceM: l.distanceM,
                  durationSec: l.durationSec,
                  avgPaceSecPerKm: l.avgPaceSecPerKm,
                  avgHRBpm: l.avgHRBpm,
                  maxHRBpm: l.maxHRBpm,
                  avgCadence: l.avgCadence,
                  isWork: l.isWork,
                })),
              },
            },
          },
        },
      });
      knownIds.add(parsed.externalId);
      imported++;
      const dist = parsed.distanceKm != null ? `${parsed.distanceKm.toFixed(2)}km` : "—";
      console.log(`  ✓ ${label}  ${sportName}  ${dist}  ${parsed.durationMin ?? "—"}min  (${parsed.laps.length} laps)`);
    } catch (err) {
      console.log(`  ✗ ${label}  ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`  → imported ${imported}, skipped ${skipped} already-present.`);
}

// ── Run ──────────────────────────────────────────────────────────────────────
async function main() {
  const gc = new GarminConnect({
    username: process.env.GARMIN_EMAIL!,
    password: process.env.GARMIN_PASSWORD!,
  });
  await gc.login();
  console.log("Logged into Garmin Connect.");

  await syncWellness(gc);
  await syncActivities(gc);

  await prisma.$disconnect();
  console.log("\nDone. Data is live on the app (shared DB).");
}

main().catch(async (err) => {
  console.error("Sync failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});

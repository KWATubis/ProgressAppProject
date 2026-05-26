// One-off backfill: group existing SocialMetric + IncomeEntry rows into
// per-platform / per-source ActivityType rows and link them.
//
// Safe to re-run: skips creation when slug already exists for that user.
//
// Run: node prisma/backfill-money-activities.mjs
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PLATFORM_ACTIVITIES = {
  TIKTOK: { name: "TikTok", icon: "📱" },
  INSTAGRAM: { name: "Instagram", icon: "📸" },
  YOUTUBE: { name: "YouTube", icon: "▶️" },
};

// Source string → activity { kind, name, icon }
const SOURCE_ACTIVITIES = {
  LIFEGUARD: { kind: "SIDE_INCOME", name: "Lifeguard", icon: "🛟" },
  SHIPS_JOB: { kind: "SIDE_INCOME", name: "Ship's job", icon: "⚓" },
  COACHING: { kind: "BUSINESS", name: "Coaching", icon: "🚀" },
  DIETARY_PLAN: { kind: "BUSINESS", name: "Dietary plans", icon: "🥗" },
  CONTENT: { kind: "SOCIAL", name: "Content / sponsorship", icon: "📱" },
  OTHER: { kind: "SIDE_INCOME", name: "Other income", icon: "💼" },
};

function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function backfillProfile(profileId) {
  console.log(`\n→ Backfilling profile ${profileId}`);

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  const socialMetrics = await prisma.socialMetric.findMany({
    where: { profileId, activityTypeId: null },
    select: { id: true, platform: true },
  });
  const platforms = new Set(socialMetrics.map((m) => m.platform));

  for (const platform of platforms) {
    const meta = PLATFORM_ACTIVITIES[platform] ?? { name: platform, icon: "📱" };
    const slug = slugify(meta.name);

    const activity = await prisma.activityType.upsert({
      where: { profileId_slug: { profileId, slug } },
      create: { profileId, name: meta.name, slug, icon: meta.icon, pillar: "MONEY", kind: "SOCIAL" },
      update: { pillar: "MONEY", kind: "SOCIAL" },
    });

    const updated = await prisma.socialMetric.updateMany({
      where: { profileId, platform, activityTypeId: null },
      data: { activityTypeId: activity.id },
    });
    console.log(`  📱 ${meta.name} (${slug}): linked ${updated.count} social metric row(s)`);
  }

  // ── INCOME ────────────────────────────────────────────────────────────────
  const entries = await prisma.incomeEntry.findMany({
    where: { profileId, activityTypeId: null },
    select: { id: true, source: true },
  });
  const sources = new Set(entries.map((e) => e.source));

  for (const source of sources) {
    const meta = SOURCE_ACTIVITIES[source] ?? { kind: "SIDE_INCOME", name: source, icon: "💼" };
    const slug = slugify(meta.name);

    const activity = await prisma.activityType.upsert({
      where: { profileId_slug: { profileId, slug } },
      create: { profileId, name: meta.name, slug, icon: meta.icon, pillar: "MONEY", kind: meta.kind },
      update: { pillar: "MONEY", kind: meta.kind },
    });

    const updated = await prisma.incomeEntry.updateMany({
      where: { profileId, source, activityTypeId: null },
      data: { activityTypeId: activity.id },
    });
    console.log(`  💼 ${meta.name} [${meta.kind}] (${slug}): linked ${updated.count} income row(s)`);
  }
}

async function main() {
  const profiles = await prisma.profile.findMany({ select: { id: true, email: true } });
  console.log(`Found ${profiles.length} profile(s).`);
  for (const p of profiles) {
    console.log(`\n=== ${p.email} ===`);
    await backfillProfile(p.id);
  }
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

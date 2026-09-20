// Supabase keep-alive: runs a few lightweight read queries so the free-tier
// project registers activity and does not get paused/deleted for inactivity.
// Run with:  node scripts/supabase-keepalive.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

// vars live in .env.local
config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const [now] = await prisma.$queryRaw`SELECT now() as ts`;
  const profiles = await prisma.profile.count();
  const goals = await prisma.goal.count();
  console.log(`[keepalive] ${now.ts.toISOString?.() ?? now.ts} — profiles=${profiles} goals=${goals}`);
} finally {
  await prisma.$disconnect();
}

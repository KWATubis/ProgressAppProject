// Portion — full account reset. Wipes every piece of logged/derived data for
// one profile (goals, tasks, workouts, diet, body metrics, social/income/
// business metrics, custom metrics, wellness, voice notes, weekly reflections,
// Strava link) and clears the onboarding session + diet targets so the user
// goes through /onboarding fresh on next visit. The Profile row itself (and
// the Supabase auth user) is left untouched so login keeps working.
//
// Run with:  node scripts/reset-account.mjs <profileId>
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const profileId = process.argv[2];
if (!profileId) {
  console.error("Usage: node scripts/reset-account.mjs <profileId>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, email: true, name: true },
  });
  if (!profile) {
    throw new Error(`No profile found for id ${profileId}`);
  }
  console.log(`Resetting ${profile.name ?? profile.email} (${profile.id})...`);

  const where = { profileId };

  const results = await prisma.$transaction([
    prisma.taskLog.deleteMany({ where }),
    prisma.taskDayOrder.deleteMany({ where }),
    prisma.task.deleteMany({ where }),
    prisma.goal.deleteMany({ where }),
    prisma.workoutSession.deleteMany({ where }), // cascades ExerciseSet, RunEntry, RunLap
    prisma.dietLog.deleteMany({ where }),
    prisma.bodyMetric.deleteMany({ where }),
    prisma.socialMetric.deleteMany({ where }),
    prisma.incomeEntry.deleteMany({ where }),
    prisma.businessMetric.deleteMany({ where }),
    prisma.customMetric.deleteMany({ where }), // cascades MetricEntry
    prisma.activityType.deleteMany({ where }), // cascades WorkoutPlan -> Day -> Exercise
    prisma.wellnessDay.deleteMany({ where }),
    prisma.dailyVoiceNote.deleteMany({ where }),
    prisma.weeklyReflection.deleteMany({ where }),
    prisma.stravaAccount.deleteMany({ where }),
    prisma.onboardingSession.deleteMany({ where }),
    prisma.profile.update({
      where: { id: profileId },
      data: {
        dietKcalTarget: null,
        dietProteinGTarget: null,
        dietFatGTarget: null,
        dietCarbsGTarget: null,
      },
    }),
  ]);

  const labels = [
    "taskLogs", "taskDayOrders", "tasks", "goals", "workoutSessions",
    "dietLogs", "bodyMetrics", "socialMetrics", "incomeEntries",
    "businessMetrics", "customMetrics", "activityTypes", "wellnessDays",
    "voiceNotes", "weeklyReflections", "stravaAccounts", "onboardingSessions",
  ];
  labels.forEach((label, i) => {
    console.log(`  ${label}: ${results[i].count} deleted`);
  });
  console.log("Profile diet targets cleared.");
  console.log("Done. Next visit to /onboarding will start fresh.");
} finally {
  await prisma.$disconnect();
}

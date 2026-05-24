import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient, Pillar, TaskFrequency } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PPUL_PLAN = [
  {
    label: "Push",
    sortOrder: 0,
    exercises: [
      { name: "Incline barbell press", muscleGroup: "Chest", targetSets: 2, repRange: "4–6", rir: 2, notes: "Upper chest strength anchor", sortOrder: 0 },
      { name: "Low-to-high cable fly", muscleGroup: "Chest", targetSets: 2, repRange: "12–15", rir: 0, notes: "Lower chest detail + inner line", sortOrder: 1 },
      { name: "OHP (barbell or Smith)", muscleGroup: "Shoulders", targetSets: 2, repRange: "5–7", rir: 1, notes: "Shoulder strength movement", sortOrder: 2 },
      { name: "Cable lateral raise", muscleGroup: "Shoulders", targetSets: 2, repRange: "12–15", rir: 0, notes: "Mid delt isolation", sortOrder: 3 },
      { name: "Skull crushers (EZ bar)", muscleGroup: "Triceps", targetSets: 2, repRange: "8–10", rir: 1, notes: "Long head — elbows point back", sortOrder: 4 },
      { name: "Hack squat or leg press", muscleGroup: "Quads", targetSets: 2, repRange: "8–12", rir: 2, notes: "Main quad compound, feet narrow", sortOrder: 5 },
      { name: "Leg extension", muscleGroup: "Quads", targetSets: 2, repRange: "12–15", rir: 0, notes: "Finisher — pause at top", sortOrder: 6 },
    ],
  },
  {
    label: "Pull",
    sortOrder: 1,
    exercises: [
      { name: "Deadlift (conventional)", muscleGroup: "Back", targetSets: 2, repRange: "4–6", rir: 2, notes: "Strength anchor — ham + back in one", sortOrder: 0 },
      { name: "Weighted pull-up", muscleGroup: "Back", targetSets: 2, repRange: "4–6", rir: 2, notes: "Width + strength", sortOrder: 1 },
      { name: "Barbell row", muscleGroup: "Back", targetSets: 2, repRange: "5–8", rir: 2, notes: "Thickness — mid/lower trap", sortOrder: 2 },
      { name: "Face pull", muscleGroup: "Rear Delts", targetSets: 2, repRange: "15", rir: 0, notes: "Rear delt + shoulder health", sortOrder: 3 },
      { name: "Incline dumbbell curl", muscleGroup: "Biceps", targetSets: 2, repRange: "10–12", rir: 1, notes: "Long head stretch — best for bicep peak", sortOrder: 4 },
      { name: "Romanian deadlift", muscleGroup: "Hamstrings", targetSets: 2, repRange: "8–10", rir: 2, notes: "Ham stretch under load", sortOrder: 5 },
      { name: "Seated calf raise", muscleGroup: "Calves", targetSets: 2, repRange: "15–20", rir: 0, notes: "Soleus focus — slow reps, full ROM", sortOrder: 6 },
    ],
  },
  {
    label: "Upper",
    sortOrder: 2,
    exercises: [
      { name: "Flat dumbbell press", muscleGroup: "Chest", targetSets: 2, repRange: "8–10", rir: 1, notes: "Different angle to Push day", sortOrder: 0 },
      { name: "High-to-low cable fly", muscleGroup: "Chest", targetSets: 2, repRange: "12–15", rir: 0, notes: "Inner chest detail — stage lines", sortOrder: 1 },
      { name: "Underhand lat pulldown", muscleGroup: "Back", targetSets: 2, repRange: "10–12", rir: 1, notes: "Lower lat focus — width from below", sortOrder: 2 },
      { name: "Single arm dumbbell row", muscleGroup: "Back", targetSets: 2, repRange: "10–12", rir: 1, notes: "Full stretch at bottom", sortOrder: 3 },
      { name: "Dumbbell lateral raise", muscleGroup: "Shoulders", targetSets: 2, repRange: "15", rir: 0, notes: "Mid delt — slightly in front of body", sortOrder: 4 },
      { name: "EZ bar curl", muscleGroup: "Biceps", targetSets: 2, repRange: "10–12", rir: 1, notes: "Control the eccentric", sortOrder: 5 },
      { name: "Cable overhead tricep extension", muscleGroup: "Triceps", targetSets: 2, repRange: "12–15", rir: 0, notes: "Long head stretch", sortOrder: 6 },
    ],
  },
  {
    label: "Lower",
    sortOrder: 3,
    exercises: [
      { name: "Barbell squat", muscleGroup: "Hamstrings", targetSets: 2, repRange: "5–8", rir: 2, notes: "Strength anchor — glute + ham dominant", sortOrder: 0 },
      { name: "Nordic curl", muscleGroup: "Hamstrings", targetSets: 2, repRange: "6–8", rir: 1, notes: "Eccentric ham overload — best ham builder", sortOrder: 1 },
      { name: "Hip thrust (barbell)", muscleGroup: "Glutes", targetSets: 2, repRange: "8–12", rir: 1, notes: "Glute max — hold at top", sortOrder: 2 },
      { name: "Cable hip abduction", muscleGroup: "Abductors", targetSets: 2, repRange: "12–15", rir: 0, notes: "Glute med + outer hip — stage width", sortOrder: 3 },
      { name: "Cable hip flexor raise", muscleGroup: "Hip Flexors", targetSets: 2, repRange: "12–15", rir: 0, notes: "Standing cable, knee drives up", sortOrder: 4 },
      { name: "Seated calf raise", muscleGroup: "Calves", targetSets: 2, repRange: "15–20", rir: 0, notes: "Soleus focus — slow reps, full ROM", sortOrder: 5 },
    ],
  },
];

async function seedGoal(
  profileId: string,
  data: {
    pillar: Pillar;
    title: string;
    targetDate?: Date | null;
    targetValue?: number | null;
    currentValue?: number | null;
    startValue?: number | null;
    unit?: string | null;
  }
) {
  const existing = await prisma.goal.findFirst({ where: { profileId, title: data.title } });
  if (existing) {
    console.log(`  (exists) Goal "${data.title}"`);
    return existing;
  }
  const goal = await prisma.goal.create({ data: { profileId, ...data } });
  console.log(`  ✓ Goal "${data.title}"`);
  return goal;
}

async function seedTask(
  profileId: string,
  data: {
    pillar: Pillar;
    title: string;
    frequency: TaskFrequency;
    dayOfWeek?: number[];
    goalId?: string | null;
    description?: string | null;
  }
) {
  const existing = await prisma.task.findFirst({ where: { profileId, title: data.title } });
  if (existing) {
    console.log(`  (exists) Task "${data.title}"`);
    return existing;
  }
  const task = await prisma.task.create({ data: { profileId, dayOfWeek: [], ...data } });
  console.log(`  ✓ Task "${data.title}"`);
  return task;
}

async function main() {
  const profileId = process.env.SEED_USER_ID;
  if (!profileId) {
    console.error("SEED_USER_ID not set in .env.local — aborting");
    process.exit(1);
  }

  console.log(`\nSeeding profile ${profileId}…\n`);

  // ── 1. Profile ──────────────────────────────────────────────────────────────
  await prisma.profile.upsert({
    where: { id: profileId },
    update: {},
    create: { id: profileId, email: "jkondracki55@gmail.com", name: "Jędrek" },
  });
  console.log("✓ Profile\n");

  // ── 2. Goals ─────────────────────────────────────────────────────────────────
  console.log("Goals:");
  const bodyGoal = await seedGoal(profileId, {
    pillar: "HEALTH",
    title: "Bodybuilding contest weight",
    targetDate: new Date("2026-07-04"),
    targetValue: 68,
    currentValue: 73,
    startValue: 73,
    unit: "kg",
  });

  await seedGoal(profileId, {
    pillar: "HEALTH",
    title: "Daily calorie intake",
    targetValue: 2400,
    unit: "kcal/day",
  });

  await seedGoal(profileId, {
    pillar: "HEALTH",
    title: "Daily protein target",
    targetValue: 180,
    unit: "g/day",
  });

  await seedGoal(profileId, {
    pillar: "HEALTH",
    title: "Handstand hold",
    targetValue: 30,
    currentValue: 7,
    startValue: 7,
    unit: "seconds",
  });

  await seedGoal(profileId, {
    pillar: "HEALTH",
    title: "Muscle-ups",
    targetValue: 10,
    currentValue: 6,
    startValue: 6,
    unit: "reps",
  });

  const tiktokGoal = await seedGoal(profileId, {
    pillar: "MONEY",
    title: "TikTok followers",
    targetDate: new Date("2026-10-01"),
    targetValue: 10000,
    currentValue: 1168,
    startValue: 1168,
    unit: "followers",
  });

  const incomeGoal = await seedGoal(profileId, {
    pillar: "MONEY",
    title: "Monthly income",
    targetValue: 10000,
    currentValue: 0,
    startValue: 0,
    unit: "PLN/month",
  });

  // ── 3. Tasks ─────────────────────────────────────────────────────────────────
  console.log("\nTasks:");

  // Gym days
  await seedTask(profileId, { pillar: "HEALTH", title: "Train Push", frequency: "WEEKLY", dayOfWeek: [1, 4], goalId: bodyGoal.id });
  await seedTask(profileId, { pillar: "HEALTH", title: "Train Pull", frequency: "WEEKLY", dayOfWeek: [2, 5], goalId: bodyGoal.id });
  await seedTask(profileId, { pillar: "HEALTH", title: "Train Upper", frequency: "WEEKLY", dayOfWeek: [3], goalId: bodyGoal.id });
  await seedTask(profileId, { pillar: "HEALTH", title: "Train Lower", frequency: "WEEKLY", dayOfWeek: [6], goalId: bodyGoal.id });

  // Running
  await seedTask(profileId, { pillar: "HEALTH", title: "Sprint session", frequency: "WEEKLY", dayOfWeek: [3] });
  await seedTask(profileId, { pillar: "HEALTH", title: "Long run", frequency: "WEEKLY", dayOfWeek: [0] });

  // Daily health
  await seedTask(profileId, { pillar: "HEALTH", title: "Log 4 meals (2,400 kcal · 180g protein)", frequency: "DAILY" });
  await seedTask(profileId, { pillar: "HEALTH", title: "Log body weight", frequency: "DAILY", goalId: bodyGoal.id });

  // Daily money
  await seedTask(profileId, { pillar: "MONEY", title: "Ship 1 piece of content", frequency: "DAILY", goalId: tiktokGoal.id });
  await seedTask(profileId, { pillar: "MONEY", title: "Deep work · 2h", frequency: "DAILY" });

  // Weekly money
  await seedTask(profileId, { pillar: "MONEY", title: "Update follower count", frequency: "WEEKLY", dayOfWeek: [0], goalId: tiktokGoal.id });
  await seedTask(profileId, { pillar: "MONEY", title: "Log weekly income", frequency: "WEEKLY", dayOfWeek: [0], goalId: incomeGoal.id });
  await seedTask(profileId, { pillar: "HEALTH", title: "Review goal progress", frequency: "WEEKLY", dayOfWeek: [0] });

  // ── 4. Body metric ───────────────────────────────────────────────────────────
  await prisma.bodyMetric.upsert({
    where: { profileId_date: { profileId, date: new Date("2026-05-19") } },
    update: {},
    create: { profileId, date: new Date("2026-05-19"), weightKg: 73 },
  });
  console.log("\n✓ BodyMetric (73 kg · 2026-05-19)");

  // ── 5. Social metric ─────────────────────────────────────────────────────────
  await prisma.socialMetric.upsert({
    where: { profileId_platform_date: { profileId, platform: "TIKTOK", date: new Date("2026-05-19") } },
    update: {},
    create: { profileId, platform: "TIKTOK", date: new Date("2026-05-19"), followerCount: 1168 },
  });
  console.log("✓ SocialMetric (TikTok 1168 · 2026-05-19)");

  // ── 6. Onboarding session ────────────────────────────────────────────────────
  await prisma.onboardingSession.upsert({
    where: { profileId },
    update: { isComplete: true },
    create: {
      profileId,
      isComplete: true,
      messages: [
        { role: "assistant", content: "Seeded by developer — onboarding complete." },
      ],
    },
  });
  console.log("✓ OnboardingSession (isComplete: true)");

  // ── 7. ActivityType + WorkoutPlan ────────────────────────────────────────────
  const gymActivity = await prisma.activityType.upsert({
    where: { profileId_slug: { profileId, slug: "gym" } },
    create: { profileId, name: "Gym", slug: "gym", icon: "🏋️", kind: "STRENGTH" },
    update: {},
  });
  console.log(`✓ ActivityType "Gym" (${gymActivity.id})`);

  const existingPlan = await prisma.workoutPlan.findUnique({
    where: { activityTypeId: gymActivity.id },
  });

  if (!existingPlan) {
    const plan = await prisma.workoutPlan.create({
      data: {
        profileId,
        activityTypeId: gymActivity.id,
        name: "PPUL Split",
        days: {
          create: PPUL_PLAN.map((day) => ({
            label: day.label,
            sortOrder: day.sortOrder,
            exercises: { create: day.exercises },
          })),
        },
      },
    });
    console.log(`✓ WorkoutPlan "PPUL Split" (${plan.id}) — 4 days`);
  } else {
    console.log("✓ WorkoutPlan already exists — skipping");
  }

  const linked = await prisma.workoutSession.updateMany({
    where: { profileId, activityTypeId: null },
    data: { activityTypeId: gymActivity.id },
  });
  console.log(`✓ Linked ${linked.count} orphaned WorkoutSession(s) → Gym`);

  await prisma.$disconnect();
  console.log("\nSeed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

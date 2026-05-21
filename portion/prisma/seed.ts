import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
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

async function main() {
  const profileId = process.env.SEED_USER_ID;
  if (!profileId) {
    console.error("SEED_USER_ID not set in .env.local — skipping backfill");
    return;
  }

  console.log(`Seeding ActivityType + WorkoutPlan for profile ${profileId}…`);

  // Create Gym ActivityType (idempotent)
  const gymActivity = await prisma.activityType.upsert({
    where: { profileId_slug: { profileId, slug: "gym" } },
    create: {
      profileId,
      name: "Gym",
      slug: "gym",
      icon: "🏋️",
      kind: "STRENGTH",
    },
    update: {},
  });

  console.log(`✓ ActivityType "Gym" (${gymActivity.id})`);

  // Create WorkoutPlan if not already linked
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
            exercises: {
              create: day.exercises,
            },
          })),
        },
      },
    });
    console.log(`✓ WorkoutPlan "PPUL Split" (${plan.id}) with 4 days`);
  } else {
    console.log(`✓ WorkoutPlan already exists — skipping`);
  }

  // Link existing WorkoutSessions that have no activityTypeId
  const updated = await prisma.workoutSession.updateMany({
    where: { profileId, activityTypeId: null },
    data: { activityTypeId: gymActivity.id },
  });

  console.log(`✓ Linked ${updated.count} existing WorkoutSession(s) → Gym`);

  await prisma.$disconnect();
  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

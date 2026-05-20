"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { WizardPlan } from "./types";

const goalSchema = z.object({
  title: z.string().min(1),
  currentValue: z.number().nullable(),
  targetValue: z.number().nullable(),
  unit: z.string(),
  targetDate: z.string().nullable(),
});

const habitSchema = z.object({
  title: z.string().min(1),
  frequency: z.enum(["DAILY", "WEEKLY", "ONE_TIME"]),
  dayOfWeek: z.array(z.number().int().min(0).max(6)),
  checked: z.boolean(),
});

const planSchema = z.object({
  health: z.object({ goals: z.array(goalSchema), habits: z.array(habitSchema) }),
  money: z.object({ goals: z.array(goalSchema), habits: z.array(habitSchema) }),
});

export type SaveResult = { error: string } | { ok: true };

export async function savePlan(planJson: string): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  let parsed: WizardPlan;
  try {
    parsed = planSchema.parse(JSON.parse(planJson));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid plan data." };
  }

  const profileId = user.id;

  // Ensure Profile exists (in case the trigger didn't run)
  await prisma.profile.upsert({
    where: { id: profileId },
    update: {},
    create: { id: profileId, email: user.email ?? "" },
  });

  const allEntries = [
    ...parsed.health.goals.map((g) => ({ pillar: "HEALTH" as const, ...g })),
    ...parsed.money.goals.map((g) => ({ pillar: "MONEY" as const, ...g })),
  ];

  // Create goals first so we can link tasks to them
  const createdGoals = await Promise.all(
    allEntries.map((g) =>
      prisma.goal.create({
        data: {
          profileId,
          pillar: g.pillar,
          title: g.title,
          targetValue: g.targetValue ?? undefined,
          currentValue: g.currentValue ?? undefined,
          unit: g.unit || null,
          targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
        },
      }),
    ),
  );

  // Build a lookup so each habit can attach to the first goal in its pillar (if any)
  const firstHealthGoalId = createdGoals.find((g) => g.pillar === "HEALTH")?.id ?? null;
  const firstMoneyGoalId = createdGoals.find((g) => g.pillar === "MONEY")?.id ?? null;

  const habitInserts: Parameters<typeof prisma.task.create>[0]["data"][] = [];

  for (const h of parsed.health.habits) {
    if (!h.checked || !h.title.trim()) continue;
    habitInserts.push({
      profileId,
      goalId: firstHealthGoalId,
      pillar: "HEALTH",
      title: h.title,
      frequency: h.frequency,
      dayOfWeek: h.dayOfWeek,
      isAiGenerated: false,
    });
  }
  for (const h of parsed.money.habits) {
    if (!h.checked || !h.title.trim()) continue;
    habitInserts.push({
      profileId,
      goalId: firstMoneyGoalId,
      pillar: "MONEY",
      title: h.title,
      frequency: h.frequency,
      dayOfWeek: h.dayOfWeek,
      isAiGenerated: false,
    });
  }

  if (habitInserts.length > 0) {
    await prisma.task.createMany({ data: habitInserts });
  }

  await prisma.onboardingSession.upsert({
    where: { profileId },
    update: { isComplete: true, messages: { manual: true, savedAt: new Date().toISOString() } },
    create: {
      profileId,
      isComplete: true,
      messages: { manual: true, savedAt: new Date().toISOString() },
    },
  });

  redirect("/dashboard");
}

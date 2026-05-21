"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
  console.log("[savePlan] start");
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[savePlan] no user — returning auth error");
      return { error: "Not authenticated." };
    }

    let parsed: WizardPlan;
    try {
      parsed = planSchema.parse(JSON.parse(planJson));
    } catch (e) {
      console.log("[savePlan] zod parse error", e);
      return { error: e instanceof Error ? e.message : "Invalid plan data." };
    }

    const profileId = user.id;
    console.log("[savePlan] profileId", profileId);

    await prisma.profile.upsert({
      where: { id: profileId },
      update: {},
      create: { id: profileId, email: user.email ?? "" },
    });
    console.log("[savePlan] profile upserted");

    const allEntries = [
      ...parsed.health.goals.filter((g) => g.title.trim()).map((g) => ({ pillar: "HEALTH" as const, ...g })),
      ...parsed.money.goals.filter((g) => g.title.trim()).map((g) => ({ pillar: "MONEY" as const, ...g })),
    ];
    console.log("[savePlan] goals to create:", allEntries.length);

    const createdGoals = await Promise.all(
      allEntries.map((g) => {
        // Default startValue: for "shrink" goals the user starts at currentValue,
        // for "grow" goals start = 0 so progress matches current/target mental model.
        const start =
          g.currentValue != null && g.targetValue != null
            ? g.targetValue < g.currentValue
              ? g.currentValue
              : 0
            : null;
        return prisma.goal.create({
          data: {
            profileId,
            pillar: g.pillar,
            title: g.title,
            targetValue: g.targetValue ?? undefined,
            currentValue: g.currentValue ?? undefined,
            startValue: start ?? undefined,
            unit: g.unit || null,
            targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
          },
        });
      }),
    );
    console.log("[savePlan] goals created:", createdGoals.length);

    const firstHealthGoalId = createdGoals.find((g) => g.pillar === "HEALTH")?.id ?? null;
    const firstMoneyGoalId = createdGoals.find((g) => g.pillar === "MONEY")?.id ?? null;

    const habitInserts: Prisma.TaskCreateManyInput[] = [];

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
    console.log("[savePlan] habits to create:", habitInserts.length);

    if (habitInserts.length > 0) {
      const result = await prisma.task.createMany({ data: habitInserts });
      console.log("[savePlan] tasks createMany result:", result);
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
    console.log("[savePlan] all done — redirecting");
  } catch (e) {
    console.error("[savePlan] CAUGHT ERROR:", e);
    return {
      error: e instanceof Error ? `${e.name}: ${e.message}` : "Unknown error during savePlan",
    };
  }

  redirect("/dashboard");
}

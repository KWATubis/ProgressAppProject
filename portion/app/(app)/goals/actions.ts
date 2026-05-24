"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const upsertSchema = z.object({
  id: z.string().optional(),
  pillar: z.enum(["HEALTH", "MONEY"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  currentValue: z.number().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpsertGoalInput = z.infer<typeof upsertSchema>;
export type ActionResult = { ok: true } | { error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

function deriveStartValue(current: number | null | undefined, target: number | null | undefined): number | null {
  if (current == null || target == null) return null;
  return target < current ? current : 0;
}

export async function upsertGoal(input: UpsertGoalInput): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: "Not authenticated." };
  }

  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    if (data.id) {
      // For updates, only recompute startValue when current/target change in a way
      // that flips direction. Simpler: keep existing startValue unless the user
      // cleared both numeric fields.
      const existing = await prisma.goal.findFirst({
        where: { id: data.id, profileId: user.id },
      });
      if (!existing) return { error: "Goal not found." };

      const start =
        existing.startValue ??
        deriveStartValue(data.currentValue ?? null, data.targetValue ?? null);

      await prisma.goal.update({
        where: { id: data.id },
        data: {
          pillar: data.pillar,
          title: data.title,
          description: data.description ?? null,
          currentValue: data.currentValue ?? null,
          targetValue: data.targetValue ?? null,
          startValue: start,
          unit: data.unit?.trim() ? data.unit : null,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          isActive: data.isActive ?? true,
        },
      });
    } else {
      await prisma.goal.create({
        data: {
          profileId: user.id,
          pillar: data.pillar,
          title: data.title,
          description: data.description ?? null,
          currentValue: data.currentValue ?? null,
          targetValue: data.targetValue ?? null,
          startValue: deriveStartValue(data.currentValue ?? null, data.targetValue ?? null),
          unit: data.unit?.trim() ? data.unit : null,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          isActive: data.isActive ?? true,
        },
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save goal." };
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: "Not authenticated." };
  }

  try {
    const existing = await prisma.goal.findFirst({
      where: { id, profileId: user.id },
    });
    if (!existing) return { error: "Goal not found." };

    await prisma.goal.delete({ where: { id } });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete goal." };
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { findMetric } from "@/lib/goalMetrics";
import { computeCustomMetricValue, computeMetricValue } from "@/lib/goalMetrics.server";

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
  metricKey: z.string().nullable().optional(),
  customMetricId: z.string().nullable().optional(),
  activityTypeId: z.string().nullable().optional(),
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

  // A goal links to either a built-in metric (metricKey) OR a user-defined
  // custom metric (customMetricId) OR neither (manual). Custom takes
  // precedence if both are sent — the UI shouldn't, but be defensive.
  let metricKey: string | null = null;
  let customMetricId: string | null = null;
  let resolvedCurrent = data.currentValue ?? null;
  let resolvedUnit: string | null = data.unit?.trim() ? data.unit : null;

  if (data.customMetricId) {
    const cm = await prisma.customMetric.findUnique({
      where: { id: data.customMetricId },
      select: { profileId: true, unit: true, activityTypeId: true },
    });
    if (!cm || cm.profileId !== user.id) {
      return { error: "Custom metric not found." };
    }
    customMetricId = data.customMetricId;
    resolvedCurrent = await computeCustomMetricValue(customMetricId);
    resolvedUnit = cm.unit;
  } else if (data.metricKey) {
    const metric = findMetric(data.metricKey);
    if (!metric) return { error: "Unknown metric." };
    if (metric.pillar !== data.pillar) {
      return { error: `That metric belongs to the ${metric.pillar.toLowerCase()} pillar.` };
    }
    metricKey = metric.key;
    resolvedCurrent = await computeMetricValue(user.id, metric.key, data.activityTypeId ?? null);
    resolvedUnit = metric.unit;
  }

  try {
    if (data.id) {
      // For updates, only recompute startValue when current/target change in a way
      // that flips direction. Simpler: keep existing startValue unless the user
      // cleared both numeric fields.
      const existing = await prisma.goal.findFirst({
        where: { id: data.id, profileId: user.id },
      });
      if (!existing) return { error: "Goal not found." };

      // If either metric link changed, reset the baseline so progress is
      // measured from the new starting point.
      const metricLinkChanged =
        (existing.metricKey ?? null) !== metricKey ||
        (existing.customMetricId ?? null) !== customMetricId;
      const start = metricLinkChanged
        ? deriveStartValue(resolvedCurrent, data.targetValue ?? null)
        : existing.startValue ??
          deriveStartValue(resolvedCurrent, data.targetValue ?? null);

      await prisma.goal.update({
        where: { id: data.id },
        data: {
          pillar: data.pillar,
          title: data.title,
          description: data.description ?? null,
          currentValue: resolvedCurrent,
          targetValue: data.targetValue ?? null,
          startValue: start,
          unit: resolvedUnit,
          metricKey,
          customMetricId,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          isActive: data.isActive ?? true,
          activityTypeId: data.activityTypeId ?? null,
        },
      });
    } else {
      await prisma.goal.create({
        data: {
          profileId: user.id,
          pillar: data.pillar,
          title: data.title,
          description: data.description ?? null,
          currentValue: resolvedCurrent,
          targetValue: data.targetValue ?? null,
          startValue: deriveStartValue(resolvedCurrent, data.targetValue ?? null),
          unit: resolvedUnit,
          metricKey,
          customMetricId,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          isActive: data.isActive ?? true,
          activityTypeId: data.activityTypeId ?? null,
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

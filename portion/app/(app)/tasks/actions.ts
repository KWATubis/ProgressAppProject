"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const moveSchema = z.object({
  taskId: z.string().min(1),
  moveFromDay: z.number().int().min(0).max(6).optional(),
  moveToDay: z.number().int().min(0).max(6).optional(),
  scheduledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type MoveTaskInput = z.infer<typeof moveSchema>;
export type ActionResult = { ok: true } | { error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function moveTask(input: MoveTaskInput): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: "Not authenticated." };
  }

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const task = await prisma.task.findFirst({
    where: { id: data.taskId, profileId: user.id },
    select: { frequency: true, dayOfWeek: true },
  });
  if (!task) return { error: "Task not found." };

  const updates: { dayOfWeek?: number[]; scheduledAt?: Date | null } = {};

  if (
    data.moveFromDay !== undefined &&
    data.moveToDay !== undefined &&
    data.moveFromDay !== data.moveToDay &&
    task.frequency === "WEEKLY"
  ) {
    const set = new Set<number>(task.dayOfWeek);
    set.delete(data.moveFromDay);
    set.add(data.moveToDay);
    updates.dayOfWeek = Array.from(set).sort((a, b) => a - b);
  }

  if (data.scheduledAt !== undefined) {
    updates.scheduledAt = data.scheduledAt ? parseISODate(data.scheduledAt) : null;
  }

  try {
    await prisma.task.update({ where: { id: data.taskId }, data: updates });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to move task." };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

const skipSchema = z.object({
  taskId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function skipTaskForDate(
  input: z.infer<typeof skipSchema>,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: "Not authenticated." };
  }

  const parsed = skipSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { taskId, date } = parsed.data;

  const task = await prisma.task.findFirst({
    where: { id: taskId, profileId: user.id },
    select: { id: true },
  });
  if (!task) return { error: "Task not found." };

  const dateMidnight = parseISODate(date);

  try {
    await prisma.taskLog.upsert({
      where: { taskId_date: { taskId, date: dateMidnight } },
      create: {
        profileId: user.id,
        taskId,
        date: dateMidnight,
        status: "SKIPPED",
      },
      update: { status: "SKIPPED" },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to skip task." };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return { ok: true };
}

const updateSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1).max(120).optional(),
  pillar: z.enum(["HEALTH", "MONEY"]).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "ONE_TIME"]).optional(),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  scheduledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  durationMin: z.number().int().min(1).max(24 * 60).nullable().optional(),
  startMinute: z.number().int().min(0).max(24 * 60 - 1).nullable().optional(),
});

export async function updateTask(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: "Not authenticated." };
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { taskId, ...rest } = parsed.data;

  const owned = await prisma.task.findFirst({
    where: { id: taskId, profileId: user.id },
    select: { id: true },
  });
  if (!owned) return { error: "Task not found." };

  const data: Record<string, unknown> = {};
  if (rest.title !== undefined) data.title = rest.title;
  if (rest.pillar !== undefined) data.pillar = rest.pillar;
  if (rest.frequency !== undefined) data.frequency = rest.frequency;
  if (rest.dayOfWeek !== undefined) data.dayOfWeek = rest.dayOfWeek;
  if (rest.scheduledAt !== undefined) {
    data.scheduledAt = rest.scheduledAt ? parseISODate(rest.scheduledAt) : null;
  }
  if (rest.durationMin !== undefined) data.durationMin = rest.durationMin;
  if (rest.startMinute !== undefined) data.startMinute = rest.startMinute;

  try {
    await prisma.task.update({ where: { id: taskId }, data });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update task." };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

const reorderSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  orderedTaskIds: z.array(z.string().min(1)).min(1),
});

export async function reorderTasksForDate(
  input: z.infer<typeof reorderSchema>,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: "Not authenticated." };
  }

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { date, orderedTaskIds } = parsed.data;

  // Confirm every task in the requested ordering belongs to this user.
  // Anything missing means a stale client or a tampered payload.
  const owned = await prisma.task.findMany({
    where: { id: { in: orderedTaskIds }, profileId: user.id },
    select: { id: true },
  });
  if (owned.length !== orderedTaskIds.length) {
    return { error: "Some tasks not found." };
  }

  const dateMidnight = parseISODate(date);

  try {
    await prisma.$transaction(
      orderedTaskIds.map((taskId, idx) =>
        prisma.taskDayOrder.upsert({
          where: { taskId_date: { taskId, date: dateMidnight } },
          create: {
            profileId: user.id,
            taskId,
            date: dateMidnight,
            sortOrder: idx,
          },
          update: { sortOrder: idx },
        }),
      ),
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reorder." };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: "Not authenticated." };
  }

  let result;
  try {
    result = await prisma.task.deleteMany({
      where: { id: taskId, profileId: user.id },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete task." };
  }
  if (result.count === 0) return { error: "Task not found." };

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return { ok: true };
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  pillar: z.enum(["HEALTH", "MONEY"]).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  /** Move a recurring task from one weekday to another. Day-of-week, 0-6. */
  moveFromDay: z.number().int().min(0).max(6).optional(),
  moveToDay: z.number().int().min(0).max(6).optional(),
  /** Reschedule a ONE_TIME task to a new date (YYYY-MM-DD). */
  scheduledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

async function requireOwned(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      profileId: true,
      pillar: true,
      sortOrder: true,
      frequency: true,
      dayOfWeek: true,
      scheduledAt: true,
    },
  });
  if (!task || task.profileId !== userId) return null;
  return task;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const owned = await requireOwned(id, user.id);
  if (!owned) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  let body;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 },
    );
  }

  // Compute schedule-related updates based on the existing task and the move
  // payload. This keeps the calendar drag-and-drop logic on the server.
  const scheduleUpdates: {
    dayOfWeek?: number[];
    scheduledAt?: Date | null;
    frequency?: "DAILY" | "WEEKLY" | "ONE_TIME";
  } = {};

  if (body.moveFromDay !== undefined && body.moveToDay !== undefined) {
    if (body.moveFromDay !== body.moveToDay) {
      if (owned.frequency === "WEEKLY") {
        const set = new Set<number>(owned.dayOfWeek);
        set.delete(body.moveFromDay);
        set.add(body.moveToDay);
        scheduleUpdates.dayOfWeek = Array.from(set).sort((a, b) => a - b);
      } else if (owned.frequency === "DAILY") {
        // Daily tasks are scheduled every day already — no change.
      }
      // ONE_TIME ignored here; use scheduledAt below for date moves.
    }
  }

  if (body.scheduledAt !== undefined) {
    scheduleUpdates.scheduledAt = body.scheduledAt ? parseISODate(body.scheduledAt) : null;
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.pillar !== undefined && { pillar: body.pillar }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...scheduleUpdates,
    },
  });

  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const owned = await requireOwned(id, user.id);
  if (!owned) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  pillar: z.enum(["HEALTH", "MONEY"]),
  frequency: z.enum(["DAILY", "WEEKLY", "ONE_TIME"]),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  scheduledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  goalId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 },
    );
  }

  if (body.goalId) {
    const goal = await prisma.goal.findUnique({
      where: { id: body.goalId },
      select: { profileId: true },
    });
    if (!goal || goal.profileId !== user.id) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
  }

  const task = await prisma.task.create({
    data: {
      profileId: user.id,
      pillar: body.pillar,
      title: body.title,
      description: body.description ?? null,
      frequency: body.frequency,
      dayOfWeek: body.frequency === "WEEKLY" ? body.dayOfWeek : [],
      scheduledAt:
        body.frequency === "ONE_TIME" && body.scheduledAt
          ? parseISODate(body.scheduledAt)
          : null,
      goalId: body.goalId ?? null,
      isAiGenerated: false,
    },
  });

  return NextResponse.json({ task });
}

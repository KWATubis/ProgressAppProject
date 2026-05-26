import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";
import { autoTickActivityTask } from "@/lib/tasks/auto-tick";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1).max(40),
  amountPln: z.number().min(0).max(100_000_000),
  description: z.string().max(500).optional().nullable(),
  activityTypeId: z.string().cuid().optional().nullable(),
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

  if (body.activityTypeId) {
    const activity = await prisma.activityType.findUnique({
      where: { id: body.activityTypeId },
      select: { profileId: true, pillar: true },
    });
    if (!activity || activity.profileId !== user.id || activity.pillar !== "MONEY") {
      return NextResponse.json({ error: "Invalid activity" }, { status: 400 });
    }
  }

  const entry = await prisma.incomeEntry.create({
    data: {
      profileId: user.id,
      date: parseISODate(body.date),
      source: body.source,
      amountPln: body.amountPln,
      description: body.description ?? null,
      activityTypeId: body.activityTypeId ?? null,
    },
  });

  if (entry.activityTypeId) {
    await autoTickActivityTask({
      profileId: user.id,
      activityTypeId: entry.activityTypeId,
      date: entry.date,
    });
  }

  return NextResponse.json({ entry });
}

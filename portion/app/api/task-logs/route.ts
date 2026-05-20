import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const upsertSchema = z.object({
  taskId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["PENDING", "COMPLETE", "SKIPPED"]),
  note: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = upsertSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: body.taskId },
    select: { profileId: true },
  });
  if (!task || task.profileId !== user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const dateMidnight = parseISODate(body.date);

  const log = await prisma.taskLog.upsert({
    where: { taskId_date: { taskId: body.taskId, date: dateMidnight } },
    create: {
      profileId: user.id,
      taskId: body.taskId,
      date: dateMidnight,
      status: body.status,
      note: body.note ?? null,
    },
    update: { status: body.status, note: body.note ?? null },
  });

  return NextResponse.json({ log });
}

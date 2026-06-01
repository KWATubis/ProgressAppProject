import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { taskId: string; dateISO: string };

  const task = await prisma.task.findFirst({
    where: { id: body.taskId, profileId: user.id },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const date = new Date(body.dateISO);

  const log = await prisma.taskLog.upsert({
    where: { taskId_date: { taskId: body.taskId, date } },
    update: { status: "COMPLETE", recoveredLate: true },
    create: {
      taskId: body.taskId,
      profileId: user.id,
      date,
      status: "COMPLETE",
      recoveredLate: true,
    },
  });

  return NextResponse.json(log);
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getWeekDates } from "@/lib/utils/dates";

function weekSunday(d: Date) {
  return getWeekDates(d)[0];
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekParam = req.nextUrl.searchParams.get("week");
  const weekStart = weekParam ? new Date(weekParam) : weekSunday(new Date());

  const reflection = await prisma.weeklyReflection.findUnique({
    where: { profileId_weekStart: { profileId: user.id, weekStart } },
  });

  return NextResponse.json(reflection ?? null);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { wins: string; learning: string; priority: string; weekStart?: string };
  const weekStart = body.weekStart ? new Date(body.weekStart) : weekSunday(new Date());

  const reflection = await prisma.weeklyReflection.upsert({
    where: { profileId_weekStart: { profileId: user.id, weekStart } },
    update: { wins: body.wins, learning: body.learning, priority: body.priority },
    create: {
      profileId: user.id,
      weekStart,
      wins: body.wins,
      learning: body.learning,
      priority: body.priority,
    },
  });

  return NextResponse.json(reflection);
}

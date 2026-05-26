import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isValidColor } from "@/lib/activity-colors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const body = await request.json();

  const activity = await prisma.activityType.findUnique({
    where: { profileId_slug: { profileId: user.id, slug } },
    select: { id: true },
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { name?: string; icon?: string | null; color?: string | null } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.icon !== undefined) data.icon = body.icon || null;
  if (body.color !== undefined) data.color = isValidColor(body.color) ? body.color : null;

  const updated = await prisma.activityType.update({
    where: { id: activity.id },
    data,
    select: { id: true, name: true, icon: true, color: true, slug: true },
  });
  return NextResponse.json(updated);
}

// Delete an activity and its directly-owned data (sessions for Health,
// social metrics + income entries for Money). Linked Tasks have activityTypeId
// set to null via the FK cascade.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const activity = await prisma.activityType.findUnique({
    where: { profileId_slug: { profileId: user.id, slug } },
    select: { id: true, pillar: true },
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (activity.pillar === "HEALTH") {
    await prisma.workoutSession.deleteMany({
      where: { profileId: user.id, activityTypeId: activity.id },
    });
  } else {
    await prisma.socialMetric.deleteMany({
      where: { profileId: user.id, activityTypeId: activity.id },
    });
    await prisma.incomeEntry.deleteMany({
      where: { profileId: user.id, activityTypeId: activity.id },
    });
  }

  await prisma.activityType.delete({ where: { id: activity.id } });

  return NextResponse.json({ ok: true });
}

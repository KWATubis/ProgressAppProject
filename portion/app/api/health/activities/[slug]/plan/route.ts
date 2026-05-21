import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const activity = await prisma.activityType.findUnique({
    where: { profileId_slug: { profileId: user.id, slug } },
    include: {
      workoutPlan: {
        include: {
          days: {
            orderBy: { sortOrder: "asc" },
            include: {
              exercises: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!activity.workoutPlan) return NextResponse.json({ plan: null });

  return NextResponse.json({ plan: activity.workoutPlan });
}

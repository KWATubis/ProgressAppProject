import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  activityTypeId: z.string().min(1),
  title: z.string().min(1).max(80),
  unit: z.string().min(1).max(20),
  aggregation: z.enum(["LATEST", "MAX", "SUM", "COUNT", "AVG"]),
  direction: z.enum(["HIGHER_BETTER", "LOWER_BETTER"]),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const activity = await prisma.activityType.findUnique({
    where: { id: body.activityTypeId },
    select: { profileId: true },
  });
  if (!activity || activity.profileId !== user.id) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  const metric = await prisma.customMetric.create({
    data: {
      profileId: user.id,
      activityTypeId: body.activityTypeId,
      title: body.title.trim(),
      unit: body.unit.trim(),
      aggregation: body.aggregation,
      direction: body.direction,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(metric, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const activityTypeId = url.searchParams.get("activityTypeId");

  const metrics = await prisma.customMetric.findMany({
    where: {
      profileId: user.id,
      ...(activityTypeId ? { activityTypeId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(metrics);
}

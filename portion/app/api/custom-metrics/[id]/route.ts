import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  unit: z.string().min(1).max(20).optional(),
  aggregation: z.enum(["LATEST", "MAX", "SUM", "COUNT", "AVG"]).optional(),
  direction: z.enum(["HIGHER_BETTER", "LOWER_BETTER"]).optional(),
  notes: z.string().max(500).nullable().optional(),
});

async function ownsMetric(id: string, userId: string): Promise<boolean> {
  const metric = await prisma.customMetric.findUnique({
    where: { id },
    select: { profileId: true },
  });
  return !!metric && metric.profileId === userId;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await ownsMetric(id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 },
    );
  }

  const metric = await prisma.customMetric.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.unit !== undefined ? { unit: body.unit.trim() } : {}),
      ...(body.aggregation !== undefined ? { aggregation: body.aggregation } : {}),
      ...(body.direction !== undefined ? { direction: body.direction } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  });

  return NextResponse.json(metric);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await ownsMetric(id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // MetricEntry rows cascade-delete; Goal.customMetricId and
  // WorkoutPlanExercise.customMetricId are SET NULL by the schema.
  await prisma.customMetric.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

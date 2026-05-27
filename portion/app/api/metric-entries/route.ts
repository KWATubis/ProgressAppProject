import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const createSchema = z.object({
  customMetricId: z.string().min(1),
  value: z.number().finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

  const metric = await prisma.customMetric.findUnique({
    where: { id: body.customMetricId },
    select: { profileId: true },
  });
  if (!metric || metric.profileId !== user.id) {
    return NextResponse.json({ error: "Metric not found" }, { status: 404 });
  }

  const entry = await prisma.metricEntry.create({
    data: {
      customMetricId: body.customMetricId,
      value: body.value,
      date: parseISODate(body.date),
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

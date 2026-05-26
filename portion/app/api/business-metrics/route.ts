import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const upsertSchema = z.object({
  activityTypeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clients: z.number().int().min(0).nullable().optional(),
  leads: z.number().int().min(0).nullable().optional(),
  deals: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const activity = await prisma.activityType.findUnique({
    where: { id: body.activityTypeId },
    select: { profileId: true, kind: true },
  });
  if (!activity || activity.profileId !== user.id) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }
  if (activity.kind !== "BUSINESS") {
    return NextResponse.json({ error: "Activity is not a business" }, { status: 400 });
  }

  const date = parseISODate(body.date);

  const entry = await prisma.businessMetric.upsert({
    where: { activityTypeId_date: { activityTypeId: body.activityTypeId, date } },
    create: {
      profileId: user.id,
      activityTypeId: body.activityTypeId,
      date,
      clients: body.clients ?? null,
      leads: body.leads ?? null,
      deals: body.deals ?? null,
      notes: body.notes ?? null,
    },
    update: {
      clients: body.clients ?? null,
      leads: body.leads ?? null,
      deals: body.deals ?? null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

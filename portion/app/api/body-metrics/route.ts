import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const optionalNum = z.number().min(0).max(1000).optional().nullable();

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: optionalNum,
  bodyFatPct: z.number().min(0).max(100).optional().nullable(),
  chestCm: optionalNum,
  waistCm: optionalNum,
  hipsCm: optionalNum,
  armCm: optionalNum,
  thighCm: optionalNum,
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
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

  const date = parseISODate(body.date);
  const data = {
    weightKg: body.weightKg ?? null,
    bodyFatPct: body.bodyFatPct ?? null,
    chestCm: body.chestCm ?? null,
    waistCm: body.waistCm ?? null,
    hipsCm: body.hipsCm ?? null,
    armCm: body.armCm ?? null,
    thighCm: body.thighCm ?? null,
    notes: body.notes ?? null,
  };

  const metric = await prisma.bodyMetric.upsert({
    where: { profileId_date: { profileId: user.id, date } },
    create: { profileId: user.id, date, ...data },
    update: data,
  });

  return NextResponse.json({ metric });
}

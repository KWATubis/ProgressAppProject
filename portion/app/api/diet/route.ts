import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  name: z.string().min(1).max(120),
  kcal: z.number().int().min(0).max(20000),
  proteinG: z.number().min(0).max(2000),
  fatG: z.number().min(0).max(2000),
  carbsG: z.number().min(0).max(2000),
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
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 },
    );
  }

  const meal = await prisma.dietLog.create({
    data: {
      profileId: user.id,
      date: parseISODate(body.date),
      slot: body.slot,
      name: body.name,
      kcal: body.kcal,
      proteinG: body.proteinG,
      fatG: body.fatG,
      carbsG: body.carbsG,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ meal });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const setSchema = z.object({
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0).max(1000).optional().nullable(),
  weightKg: z.number().min(0).max(1000).optional().nullable(),
});

const exerciseSchema = z.object({
  name: z.string().min(1).max(120),
  muscleGroup: z.string().min(1).max(60),
  sets: z.array(setSchema).min(1),
});

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string().min(1).max(60),
  notes: z.string().max(500).optional().nullable(),
  exercises: z.array(exerciseSchema).min(1),
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

  // Drop sets with no data entered, then exercises left with no logged sets.
  const exercises = body.exercises
    .map((ex) => ({
      ...ex,
      sets: ex.sets.filter((s) => s.reps != null || s.weightKg != null),
    }))
    .filter((ex) => ex.sets.length > 0);

  if (exercises.length === 0) {
    return NextResponse.json({ error: "Log at least one set" }, { status: 400 });
  }

  const session = await prisma.workoutSession.create({
    data: {
      profileId: user.id,
      date: parseISODate(body.date),
      type: body.type,
      notes: body.notes ?? null,
      exercises: {
        create: exercises.flatMap((ex) =>
          ex.sets.map((s) => ({
            setNumber: s.setNumber,
            reps: s.reps ?? null,
            weightKg: s.weightKg ?? null,
            exercise: {
              connectOrCreate: {
                where: { name: ex.name },
                create: { name: ex.name, category: ex.muscleGroup },
              },
            },
          })),
        ),
      },
    },
    include: { exercises: true },
  });

  return NextResponse.json({ session });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 },
    );
  }

  // Verify every id belongs to this user.
  const tasks = await prisma.task.findMany({
    where: { id: { in: body.orderedIds }, profileId: user.id },
    select: { id: true },
  });
  const owned = new Set(tasks.map((t) => t.id));
  if (owned.size !== body.orderedIds.length) {
    return NextResponse.json({ error: "Some tasks not found" }, { status: 404 });
  }

  await prisma.$transaction(
    body.orderedIds.map((id, i) =>
      prisma.task.update({ where: { id }, data: { sortOrder: i } }),
    ),
  );

  return NextResponse.json({ ok: true });
}

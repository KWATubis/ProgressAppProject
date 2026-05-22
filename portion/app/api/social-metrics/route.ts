import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/utils/dates";

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.string().min(1).max(40),
  followerCount: z.number().int().min(0).max(1_000_000_000),
  videoCount: z.number().int().min(0).max(1_000_000).optional().nullable(),
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
    followerCount: body.followerCount,
    videoCount: body.videoCount ?? null,
    notes: body.notes ?? null,
  };

  const metric = await prisma.socialMetric.upsert({
    where: {
      profileId_platform_date: { profileId: user.id, platform: body.platform, date },
    },
    create: { profileId: user.id, platform: body.platform, date, ...data },
    update: data,
  });

  return NextResponse.json({ metric });
}

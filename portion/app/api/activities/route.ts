import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isValidColor } from "@/lib/activity-colors";

const HEALTH_KINDS = ["STRENGTH", "CARDIO", "SPORT"] as const;
const MONEY_KINDS = ["SOCIAL", "SIDE_INCOME", "MAIN_INCOME", "BUSINESS"] as const;
type ActivityKind = (typeof HEALTH_KINDS)[number] | (typeof MONEY_KINDS)[number];

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const pillar = url.searchParams.get("pillar");

  const activities = await prisma.activityType.findMany({
    where: {
      profileId: user.id,
      ...(pillar === "HEALTH" || pillar === "MONEY" ? { pillar } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, icon: true, color: true, kind: true, pillar: true },
  });
  return NextResponse.json(activities);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name: string = (body.name ?? "").trim();
  const kind: string = body.kind ?? "";
  const pillar: string = body.pillar ?? "";
  const icon: string | null = body.icon || null;
  const color: string | null = isValidColor(body.color) ? body.color : null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (pillar !== "HEALTH" && pillar !== "MONEY") {
    return NextResponse.json({ error: "Invalid pillar" }, { status: 400 });
  }

  const validKinds = pillar === "HEALTH" ? HEALTH_KINDS : MONEY_KINDS;
  if (!(validKinds as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: `Invalid kind for ${pillar} pillar` }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (!slug) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  try {
    const activity = await prisma.activityType.create({
      data: {
        profileId: user.id,
        name,
        slug,
        icon,
        color,
        pillar: pillar as "HEALTH" | "MONEY",
        kind: kind as ActivityKind,
      },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An activity with that name already exists" }, { status: 409 });
  }
}

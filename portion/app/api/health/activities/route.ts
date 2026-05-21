import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activities = await prisma.activityType.findMany({
    where: { profileId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, icon: true, kind: true },
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
  const icon: string | null = body.icon || null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!["STRENGTH", "CARDIO", "SPORT"].includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (!slug) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  try {
    const activity = await prisma.activityType.create({
      data: { profileId: user.id, name, slug, icon, kind: kind as "STRENGTH" | "CARDIO" | "SPORT" },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An activity with that name already exists" }, { status: 409 });
  }
}

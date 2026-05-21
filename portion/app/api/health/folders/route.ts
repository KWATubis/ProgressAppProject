import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folders = await prisma.healthFolder.findMany({
    where: { profileId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, icon: true },
  });
  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name: string = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (!slug) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  try {
    const folder = await prisma.healthFolder.create({
      data: {
        profileId: user.id,
        name,
        slug,
        icon: body.icon || null,
        description: body.description || null,
      },
    });
    return NextResponse.json(folder, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });
  }
}

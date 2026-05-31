import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, VOICE_NOTES_BUCKET } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { parseISODate, formatISODate } from "@/lib/utils/dates";

// Prisma + Supabase service role → must run on Node, not edge.
export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket fileSizeLimit
const MAX_DURATION_SEC = 120;
const ALLOWED_MIME = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"];

function storagePath(userId: string, dateISO: string) {
  // Fixed path per day → re-recording upserts cleanly, no orphaned objects.
  return `${userId}/${dateISO}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const audio = form.get("audio");
  const dateRaw = form.get("date");
  const durationRaw = form.get("durationSec");

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  }
  if (typeof dateRaw !== "string" || !ISO_DATE.test(dateRaw)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const durationSec = Math.round(Number(durationRaw));
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > MAX_DURATION_SEC) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }
  if (audio.size === 0 || audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording too large or empty" }, { status: 400 });
  }
  const contentType = audio.type.split(";")[0] || "audio/webm";
  if (!ALLOWED_MIME.includes(contentType)) {
    return NextResponse.json({ error: "Unsupported audio format" }, { status: 400 });
  }

  const date = parseISODate(dateRaw);
  const path = storagePath(user.id, dateRaw);
  const admin = createAdminClient();

  const buffer = Buffer.from(await audio.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from(VOICE_NOTES_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  await prisma.dailyVoiceNote.upsert({
    where: { profileId_date: { profileId: user.id, date } },
    update: { storagePath: path, durationSec },
    create: { profileId: user.id, date, storagePath: path, durationSec },
  });

  return NextResponse.json({ ok: true, durationSec }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateRaw = new URL(req.url).searchParams.get("date");
  if (!dateRaw || !ISO_DATE.test(dateRaw)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const note = await prisma.dailyVoiceNote.findUnique({
    where: { profileId_date: { profileId: user.id, date: parseISODate(dateRaw) } },
  });
  if (!note) return NextResponse.json({ note: null });

  const admin = createAdminClient();
  const { data: signed } = await admin.storage
    .from(VOICE_NOTES_BUCKET)
    .createSignedUrl(note.storagePath, 60 * 60); // 1h

  return NextResponse.json({
    note: {
      date: formatISODate(note.date),
      durationSec: note.durationSec,
      url: signed?.signedUrl ?? null,
    },
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateRaw = new URL(req.url).searchParams.get("date");
  if (!dateRaw || !ISO_DATE.test(dateRaw)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const date = parseISODate(dateRaw);

  const note = await prisma.dailyVoiceNote.findUnique({
    where: { profileId_date: { profileId: user.id, date } },
  });
  if (!note) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  await admin.storage.from(VOICE_NOTES_BUCKET).remove([note.storagePath]);
  await prisma.dailyVoiceNote.delete({
    where: { profileId_date: { profileId: user.id, date } },
  });

  return NextResponse.json({ ok: true });
}

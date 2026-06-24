import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseFit, type ParsedActivity } from "@/lib/garmin/parse-fit";
import { ingestActivity } from "@/lib/activities/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportResult = {
  imported: number;
  skipped: number;
  failed: number;
  details: { file: string; status: "imported" | "skipped" | "failed"; reason?: string }[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const result: ImportResult = { imported: 0, skipped: 0, failed: 0, details: [] };
  const activityCache = new Map<string, string>(); // slug -> activityTypeId

  for (const file of files) {
    let parsed: ParsedActivity | null = null;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      parsed = parseFit(bytes);
    } catch {
      parsed = null;
    }

    if (!parsed) {
      result.failed++;
      result.details.push({ file: file.name, status: "failed", reason: "Not a valid FIT activity" });
      continue;
    }

    try {
      const status = await ingestActivity(prisma, user.id, parsed, "garmin", activityCache);
      if (status === "imported") {
        result.imported++;
        result.details.push({ file: file.name, status: "imported" });
      } else {
        result.skipped++;
        result.details.push({ file: file.name, status: "skipped", reason: "Already imported" });
      }
    } catch (e) {
      result.failed++;
      result.details.push({
        file: file.name,
        status: "failed",
        reason: e instanceof Error ? e.message : "Insert failed",
      });
    }
  }

  return NextResponse.json(result);
}

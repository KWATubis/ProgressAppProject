import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured, suggestMetricFromTitle } from "@/lib/ai/suggestMetric";

const schema = z.object({
  title: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Set GOOGLE_AI_API_KEY in .env.local." },
      { status: 503 },
    );
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 },
    );
  }

  try {
    const suggestion = await suggestMetricFromTitle(body.title);
    if (!suggestion) {
      return NextResponse.json(
        { error: "Couldn't shape that into a metric. Try rephrasing." },
        { status: 422 },
      );
    }
    return NextResponse.json(suggestion);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 502 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ configured: isAiConfigured() });
}

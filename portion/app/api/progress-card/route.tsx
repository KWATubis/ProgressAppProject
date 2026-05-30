import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeWeeklySummary } from "@/lib/dashboard/weekly-summary";
import { loadCardFonts, renderProgressCard } from "./render";

// Per-user, cookie-gated, draws from live data → never static.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [profile, summary, fonts] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { name: true } }),
    computeWeeklySummary(user.id),
    loadCardFonts(),
  ]);

  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? "";
  return renderProgressCard({ summary, firstName, fonts });
}

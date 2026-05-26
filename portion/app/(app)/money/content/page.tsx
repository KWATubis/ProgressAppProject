import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Legacy /money/content route — redirects to the user's first SOCIAL activity
// (e.g. TikTok) or to the Money overview if none exists.
export default async function MoneyContentRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const social = await prisma.activityType.findFirst({
    where: { profileId: user.id, pillar: "MONEY", kind: "SOCIAL" },
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  });

  redirect(social ? `/money/activity/${social.slug}` : "/money");
}

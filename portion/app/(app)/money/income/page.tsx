import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Legacy /money/income route — redirects to the user's first income-style
// activity (SIDE_INCOME, MAIN_INCOME, or BUSINESS) or to Money overview.
export default async function MoneyIncomeRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const income = await prisma.activityType.findFirst({
    where: {
      profileId: user.id,
      pillar: "MONEY",
      kind: { in: ["SIDE_INCOME", "MAIN_INCOME", "BUSINESS"] },
    },
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  });

  redirect(income ? `/money/activity/${income.slug}` : "/money");
}

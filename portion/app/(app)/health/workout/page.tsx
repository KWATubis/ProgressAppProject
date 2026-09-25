import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function WorkoutRedirect() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const activity = await prisma.activityType.findFirst({
    where: { profileId: user.id },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    select: { slug: true },
  });

  redirect(activity ? `/health/activity/${activity.slug}` : "/health");
}

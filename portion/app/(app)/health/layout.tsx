import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { HealthSubNav } from "@/components/health/HealthSubNav";

export default async function HealthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const activityTypes = await prisma.activityType.findMany({
    where: { profileId: user.id, pillar: "HEALTH", kind: { in: ["STRENGTH", "CARDIO", "SPORT"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, icon: true, color: true, kind: true },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
        <p className="text-sm text-muted-foreground">Training, nutrition, and body metrics.</p>
        <HealthSubNav activityTypes={activityTypes as any} />
      </div>
      {children}
    </div>
  );
}

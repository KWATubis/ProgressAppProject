import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "./OnboardingWizard";
import { defaultPlan } from "./defaults";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const params = await searchParams;
  const PREVIEW = params.preview === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !PREVIEW) {
    redirect("/auth/signup");
  }

  if (user) {
    const session = await prisma.onboardingSession.findUnique({
      where: { profileId: user.id },
      select: { isComplete: true },
    });
    if (session?.isComplete) {
      redirect("/dashboard");
    }
  }

  const profile = user
    ? await prisma.profile.findUnique({
        where: { id: user.id },
        select: { name: true, email: true },
      })
    : null;

  return (
    <OnboardingWizard
      defaults={defaultPlan}
      userName={profile?.name ?? "Jędrek"}
      userEmail={profile?.email ?? user?.email ?? "preview@portion.app"}
    />
  );
}

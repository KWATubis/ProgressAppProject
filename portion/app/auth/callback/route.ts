import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const name = (data.user.user_metadata?.name as string | undefined) ?? undefined;
      await prisma.profile.upsert({
        where: { id: data.user.id },
        update: { email: data.user.email ?? "" },
        create: {
          id: data.user.id,
          email: data.user.email ?? "",
          name,
        },
      });

      // A user confirming their email for the first time hasn't onboarded yet —
      // send them through onboarding rather than to an empty dashboard.
      const onboarding = await prisma.onboardingSession.findUnique({
        where: { profileId: data.user.id },
        select: { isComplete: true },
      });
      const dest = onboarding?.isComplete ? next : "/onboarding";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}

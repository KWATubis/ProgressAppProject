import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Portion
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The AI-coached goal chat lands in Phase 2. For now, create your account and we&apos;ll
          take you to the dashboard.
        </p>
        <Link href="/auth/signup" className={buttonVariants({ className: "mt-6" })}>
          Create account
        </Link>
      </div>
    </div>
  );
}

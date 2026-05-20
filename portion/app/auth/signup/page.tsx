import Link from "next/link";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <AmbientBackground />

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
            <span className="h-2 w-2 rounded-full bg-foreground shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
            Portion
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Create your account</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-sm">
          <SignupForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

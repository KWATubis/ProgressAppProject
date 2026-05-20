import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="text-xl font-semibold tracking-tight">Portion</div>
        <Link
          href="/auth/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
        {/* Hero */}
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            You&apos;re going all in on your body{" "}
            <span className="text-muted-foreground">and your bag.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Portion is the only tracker built for both. Gym sessions, macros, follower count,
            income — one place, nothing slipping through the cracks.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/onboarding" className={buttonVariants({ size: "lg", className: "px-8" })}>
              Start Building
            </Link>
            <Link
              href="/auth/login"
              className={buttonVariants({ size: "lg", variant: "ghost" })}
            >
              I already have an account
            </Link>
          </div>
        </div>

        {/* Pain line */}
        <p className="mt-20 max-w-lg text-center text-base text-muted-foreground">
          You have the discipline. What you don&apos;t have is one place to see it all working.
        </p>

        {/* Pillars */}
        <div className="mt-8 grid w-full max-w-4xl gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
                <Dumbbell className="h-5 w-5" />
              </div>
              <CardTitle className="mt-3">Train like it counts.</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Log every session. Track sets, reps, weight, calisthenics holds, run splits.
              Hit your macro targets. Watch your body move toward the goal — with data, not hope.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
                <TrendingUp className="h-5 w-5" />
              </div>
              <CardTitle className="mt-3">Build like it compounds.</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Log your TikTok growth, income by source, monthly targets. The brand and the bag —
              side by side, every single day.
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        Portion · built for the ones who do both
      </footer>
    </div>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, LineChart } from "lucide-react";

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
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Train your body. <span className="text-muted-foreground">Build your business.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Portion is an AI-coached tracker for the two things that compound — your health and your
            income. Set real goals, get a daily plan, and watch the numbers move.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/onboarding" className={buttonVariants({ size: "lg", className: "px-8" })}>
              Get started
            </Link>
            <Link
              href="/auth/login"
              className={buttonVariants({ size: "lg", variant: "ghost" })}
            >
              I already have an account
            </Link>
          </div>
        </div>

        <div className="mt-20 grid w-full max-w-4xl gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
                <Dumbbell className="h-5 w-5" />
              </div>
              <CardTitle className="mt-3">Health</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Push/Pull/Upper/Lower training, calisthenics holds, run logs, daily macros, body
              metrics — all in one place.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
                <LineChart className="h-5 w-5" />
              </div>
              <CardTitle className="mt-3">Money</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              TikTok follower growth, income by source, monthly targets — track the brand and the
              business as it grows.
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        Portion · personal goal tracker
      </footer>
    </div>
  );
}

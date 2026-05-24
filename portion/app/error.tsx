"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Something broke</h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground/60">ref: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" render={<Link href="/dashboard" />}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

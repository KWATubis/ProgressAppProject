"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({
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
    <Card className="mx-auto max-w-md p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Couldn&apos;t load this page</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Something went wrong while loading."}
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground/60">ref: {error.digest}</p>
        ) : null}
      </div>
      <div className="mt-6">
        <Button onClick={() => reset()}>Retry</Button>
      </div>
    </Card>
  );
}

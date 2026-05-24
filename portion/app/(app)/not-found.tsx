import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppNotFound() {
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h2 className="text-xl font-semibold">Not found</h2>
        <p className="text-sm text-muted-foreground">
          This page doesn&apos;t exist in your workspace.
        </p>
      </div>
      <div className="mt-6">
        <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
      </div>
    </Card>
  );
}

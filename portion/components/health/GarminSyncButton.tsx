"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncGarminWellness } from "@/app/(app)/health/actions";

type Props = {
  days?: number;
  lastSyncedAt: string | null;
};

export function GarminSyncButton({ days = 7, lastSyncedAt }: Props) {
  const [pending, startTransition] = useTransition();
  const [stamp, setStamp] = useState<string | null>(lastSyncedAt);

  function trigger() {
    startTransition(async () => {
      const res = await syncGarminWellness(days);
      if (res.ok) {
        setStamp(new Date().toISOString());
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  }

  const subtitle = stamp
    ? `Last synced ${new Date(stamp).toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      })}`
    : "Not synced yet";

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] uppercase tracking-wider text-muted-foreground sm:inline">
        {subtitle}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={trigger}
        disabled={pending}
        className="gap-1.5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Syncing…" : "Sync Garmin"}
      </Button>
    </div>
  );
}

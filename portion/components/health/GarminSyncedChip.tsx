import { formatDistanceToNowStrict } from "date-fns";
import { Watch } from "lucide-react";

/**
 * Passive freshness indicator for Garmin data. Sync itself runs locally
 * (`npm run garmin` / the scheduled task) — this just shows how current it is.
 */
export function GarminSyncedChip({ syncedAt }: { syncedAt: Date | string | null }) {
  if (!syncedAt) return null;
  const d = typeof syncedAt === "string" ? new Date(syncedAt) : syncedAt;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
      <Watch className="h-3 w-3" />
      Garmin synced {formatDistanceToNowStrict(d, { addSuffix: true })}
    </span>
  );
}

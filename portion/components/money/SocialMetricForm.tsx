"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatISODate, toUtcMidnight } from "@/lib/utils/dates";

type Props = {
  /** Platform string sent to the API. Defaults to "TIKTOK" for backward compat. */
  platform?: string;
  /** If set, links the metric to this activity (and is validated server-side). */
  activityTypeId?: string;
};

export function SocialMetricForm({ platform = "TIKTOK", activityTypeId }: Props = {}) {
  const router = useRouter();
  const [date, setDate] = useState(() => formatISODate(toUtcMidnight()));
  const [followers, setFollowers] = useState("");
  const [videos, setVideos] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    if (followers === "") {
      toast.error("Enter a follower count.");
      return;
    }
    const payload = {
      date,
      platform,
      followerCount: Number(followers),
      videoCount: videos === "" ? null : Number(videos),
      activityTypeId: activityTypeId ?? null,
    };
    startTransition(async () => {
      try {
        const res = await fetch("/api/social-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Follower count saved.");
        setFollowers("");
        setVideos("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  const inputClass =
    "h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums outline-none focus:border-foreground";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Followers</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="—"
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">
            Videos <span className="opacity-60">(opt)</span>
          </span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="—"
            value={videos}
            onChange={(e) => setVideos(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <Button onClick={save} disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Save follower count"}
      </Button>
    </div>
  );
}

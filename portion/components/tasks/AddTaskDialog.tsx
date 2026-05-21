"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Frequency = "DAILY" | "WEEKLY" | "ONE_TIME";
type Pillar = "HEALTH" | "MONEY";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function AddTaskDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [pillar, setPillar] = useState<Pillar>("HEALTH");
  const [frequency, setFrequency] = useState<Frequency>("DAILY");
  const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>("");

  function reset() {
    setTitle("");
    setPillar("HEALTH");
    setFrequency("DAILY");
    setDayOfWeek([]);
    setScheduledAt("");
  }

  function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (frequency === "WEEKLY" && dayOfWeek.length === 0) {
      toast.error("Pick at least one weekday");
      return;
    }
    if (frequency === "ONE_TIME" && !scheduledAt) {
      toast.error("Pick a date");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            pillar,
            frequency,
            dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : [],
            scheduledAt: frequency === "ONE_TIME" ? scheduledAt : null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Task added");
        reset();
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create task");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        Add task
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a recurring habit or a one-off task.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 30 min mobility"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Pillar</Label>
            <div className="flex gap-2">
              {(["HEALTH", "MONEY"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPillar(p)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition",
                    pillar === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-input hover:bg-accent",
                  )}
                >
                  {p === "HEALTH" ? "Health" : "Money"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <div className="flex gap-2">
              {(
                [
                  { v: "DAILY", l: "Daily" },
                  { v: "WEEKLY", l: "Weekly" },
                  { v: "ONE_TIME", l: "Once" },
                ] as const
              ).map((f) => (
                <button
                  key={f.v}
                  type="button"
                  onClick={() => setFrequency(f.v)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition",
                    frequency === f.v
                      ? "border-foreground bg-foreground text-background"
                      : "border-input hover:bg-accent",
                  )}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {frequency === "WEEKLY" && (
            <div className="space-y-1.5">
              <Label>Days</Label>
              <div className="flex gap-1">
                {DAYS.map((d, i) => {
                  const active = dayOfWeek.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setDayOfWeek((prev) =>
                          prev.includes(i)
                            ? prev.filter((x) => x !== i)
                            : [...prev, i].sort((a, b) => a - b),
                        )
                      }
                      className={cn(
                        "h-8 w-8 rounded text-xs font-semibold transition",
                        active
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {frequency === "ONE_TIME" && (
            <div className="space-y-1.5">
              <Label htmlFor="task-date">Date</Label>
              <Input
                id="task-date"
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Adding…" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

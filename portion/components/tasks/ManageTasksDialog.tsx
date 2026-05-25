"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Dumbbell, Settings, Trash2, TrendingUp } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Pillar = "HEALTH" | "MONEY";
type Frequency = "DAILY" | "WEEKLY" | "ONE_TIME";

export type ManageTask = {
  id: string;
  title: string;
  pillar: Pillar;
  frequency: Frequency;
  sortOrder: number;
};

const FREQ_LABEL: Record<Frequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  ONE_TIME: "Once",
};

export function ManageTasksDialog({ tasks }: { tasks: ManageTask[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Pending optimistic edits keyed by id (null = deleted). When the prop
  // updates with fresh data from a server refresh, derived state below picks
  // it up automatically.
  const [overrides, setOverrides] = useState<{
    deleted: Set<string>;
    order: string[] | null;
  }>({ deleted: new Set(), order: null });

  // Reset overrides whenever the dialog opens, so we don't apply stale edits
  // to a fresh server snapshot.
  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) setOverrides({ deleted: new Set(), order: null });
  }

  const list = useMemo<ManageTask[]>(() => {
    const filtered = tasks.filter((t) => !overrides.deleted.has(t.id));
    if (!overrides.order) return filtered;
    const byId = new Map(filtered.map((t) => [t.id, t]));
    const reordered: ManageTask[] = [];
    for (const id of overrides.order) {
      const t = byId.get(id);
      if (t) {
        reordered.push(t);
        byId.delete(id);
      }
    }
    // Append any new tasks that arrived after our local reorder.
    reordered.push(...byId.values());
    return reordered;
  }, [tasks, overrides]);

  function moveWithin(pillar: Pillar, idx: number, dir: -1 | 1) {
    const pillarList = list.filter((t) => t.pillar === pillar);
    const target = idx + dir;
    if (target < 0 || target >= pillarList.length) return;

    const newPillarList = [...pillarList];
    [newPillarList[idx], newPillarList[target]] = [newPillarList[target], newPillarList[idx]];

    const other = list.filter((t) => t.pillar !== pillar);
    const orderedIds = [...other.map((t) => t.id), ...newPillarList.map((t) => t.id)];
    const prevOrder = overrides.order;
    setOverrides((o) => ({ ...o, order: orderedIds }));

    startTransition(async () => {
      try {
        const res = await fetch("/api/tasks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
      } catch (e) {
        setOverrides((o) => ({ ...o, order: prevOrder }));
        toast.error(e instanceof Error ? e.message : "Failed to reorder");
      }
    });
  }

  function remove(id: string) {
    const task = list.find((t) => t.id === id);
    if (!task) return;
    if (!confirm(`Delete task "${task.title}"? This also removes its history.`)) return;

    setOverrides((o) => {
      const next = new Set(o.deleted);
      next.add(id);
      return { ...o, deleted: next };
    });

    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Task deleted");
        router.refresh();
      } catch (e) {
        setOverrides((o) => {
          const next = new Set(o.deleted);
          next.delete(id);
          return { ...o, deleted: next };
        });
        toast.error(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  const grouped: Record<Pillar, ManageTask[]> = {
    HEALTH: list.filter((t) => t.pillar === "HEALTH"),
    MONEY: list.filter((t) => t.pillar === "MONEY"),
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <Settings className="h-4 w-4" />
        Manage
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage tasks</DialogTitle>
          <DialogDescription>
            Reorder with the arrows or delete tasks you no longer want.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {(["HEALTH", "MONEY"] as const).map((pillar) => {
            const items = grouped[pillar];
            const Icon = pillar === "HEALTH" ? Dumbbell : TrendingUp;
            return (
              <section key={pillar} className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {pillar === "HEALTH" ? "Health" : "Money"}
                </h3>
                {items.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-card/40 p-3 text-center text-xs text-muted-foreground">
                    No tasks.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((t, i) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5"
                      >
                        <div className="flex shrink-0 flex-col">
                          <button
                            type="button"
                            onClick={() => moveWithin(pillar, i, -1)}
                            disabled={i === 0 || pending}
                            className={cn(
                              "rounded p-0.5 text-muted-foreground transition hover:bg-accent hover:text-foreground",
                              (i === 0 || pending) && "opacity-30",
                            )}
                            aria-label="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveWithin(pillar, i, 1)}
                            disabled={i === items.length - 1 || pending}
                            className={cn(
                              "rounded p-0.5 text-muted-foreground transition hover:bg-accent hover:text-foreground",
                              (i === items.length - 1 || pending) && "opacity-30",
                            )}
                            aria-label="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{t.title}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {FREQ_LABEL[t.frequency]}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(t.id)}
                          disabled={pending}
                          className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

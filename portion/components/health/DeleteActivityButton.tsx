"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteActivityButton({
  slug,
  activityName,
}: {
  slug: string;
  activityName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/health/activities/${slug}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        toast.success(`${activityName} deleted.`);
        setOpen(false);
        router.push("/health");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete activity");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" />
        }
      >
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {activityName}?</DialogTitle>
          <DialogDescription>
            This removes the activity and all of its logged sessions. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

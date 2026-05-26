"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ACTIVITY_COLORS } from "@/lib/activity-colors";

export function EditActivityButton({
  slug,
  name: initialName,
  icon: initialIcon,
  color: initialColor,
}: {
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon ?? "");
  const [color, setColor] = useState<string>(initialColor ?? ACTIVITY_COLORS[0]);

  function save() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/activities/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), icon: icon || null, color }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Activity updated.");
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" />}
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit activity</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-24"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform",
                    color === c
                      ? "scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-background"
                      : "hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

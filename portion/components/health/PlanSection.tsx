"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanEditor, type PlanInitial } from "./PlanEditor";

export function PlanSection({
  slug,
  activityName,
  initial,
}: {
  slug: string;
  activityName: string;
  initial: PlanInitial | null;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {initial ? "Edit plan" : "Build a plan"}
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
        <PlanEditor
          slug={slug}
          activityName={activityName}
          initial={initial ?? undefined}
          onSaved={() => setEditing(false)}
        />
      </section>
    );
  }

  if (!initial) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No plan yet for {activityName}. Build one so you can log sessions in Check-in.
        </p>
        <Button type="button" className="mt-3" onClick={() => setEditing(true)}>
          <Plus className="mr-1 h-4 w-4" /> Create plan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit plan
      </Button>
    </div>
  );
}

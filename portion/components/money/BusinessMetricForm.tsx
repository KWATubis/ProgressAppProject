"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatISODate, toUtcMidnight } from "@/lib/utils/dates";

type Props = {
  activityTypeId: string;
};

export function BusinessMetricForm({ activityTypeId }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(() => formatISODate(toUtcMidnight()));
  const [clients, setClients] = useState("");
  const [leads, setLeads] = useState("");
  const [deals, setDeals] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    if (clients === "" && leads === "" && deals === "") {
      toast.error("Fill in at least one number.");
      return;
    }
    const payload = {
      activityTypeId,
      date,
      clients: clients === "" ? null : Number(clients),
      leads: leads === "" ? null : Number(leads),
      deals: deals === "" ? null : Number(deals),
    };
    startTransition(async () => {
      try {
        const res = await fetch("/api/business-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Snapshot saved.");
        setClients("");
        setLeads("");
        setDeals("");
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <span className="text-xs text-muted-foreground">Clients</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="—"
            value={clients}
            onChange={(e) => setClients(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Leads</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="—"
            value={leads}
            onChange={(e) => setLeads(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Deals</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="—"
            value={deals}
            onChange={(e) => setDeals(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <Button onClick={save} disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Save snapshot"}
      </Button>
    </div>
  );
}

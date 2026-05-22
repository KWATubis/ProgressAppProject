"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatISODate, toUtcMidnight } from "@/lib/utils/dates";

export const INCOME_SOURCES = [
  { value: "COACHING", label: "Coaching" },
  { value: "DIETARY_PLAN", label: "Dietary plan" },
  { value: "SHIPS_JOB", label: "Ship's job" },
  { value: "LIFEGUARD", label: "Lifeguard" },
  { value: "CONTENT", label: "Content / sponsorship" },
  { value: "OTHER", label: "Other" },
];

export function IncomeForm() {
  const router = useRouter();
  const [date, setDate] = useState(() => formatISODate(toUtcMidnight()));
  const [source, setSource] = useState(INCOME_SOURCES[0].value);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    if (amount === "" || Number(amount) <= 0) {
      toast.error("Enter an amount.");
      return;
    }
    const payload = {
      date,
      source,
      amountPln: Number(amount),
      description: description.trim() === "" ? null : description.trim(),
    };
    startTransition(async () => {
      try {
        const res = await fetch("/api/income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Income logged.");
        setAmount("");
        setDescription("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  const inputClass =
    "h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-foreground";

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
          <span className="text-xs text-muted-foreground">Source</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={inputClass}
          >
            {INCOME_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Amount (zł)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="—"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">
            Note <span className="opacity-60">(opt)</span>
          </span>
          <input
            type="text"
            maxLength={500}
            placeholder="—"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <Button onClick={save} disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Log income"}
      </Button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { INCOME_SOURCES } from "./IncomeForm";

export type IncomeRow = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  source: string;
  amountPln: number;
  description: string | null;
};

const SOURCE_LABELS = Object.fromEntries(INCOME_SOURCES.map((s) => [s.value, s.label]));

export function IncomeList({ entries }: { entries: IncomeRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function remove(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/income/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Entry deleted.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete");
      } finally {
        setPendingId(null);
      }
    });
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No income logged yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Source</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Note</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {entries.map((e) => {
            const [y, m, d] = e.date.split("-").map(Number);
            const label = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <tr key={e.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">{label}</td>
                <td className="px-4 py-2.5">{SOURCE_LABELS[e.source] ?? e.source}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{e.description ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {e.amountPln.toLocaleString()} zł
                </td>
                <td className="px-2 py-2.5 text-right">
                  <button
                    onClick={() => remove(e.id)}
                    disabled={pendingId === e.id}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-red-400 disabled:opacity-40"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function WeeklyReflectionForm({
  weekStartISO,
  initial,
}: {
  weekStartISO: string;
  initial: { wins: string; learning: string; priority: string } | null;
}) {
  const [wins, setWins] = useState(initial?.wins ?? "");
  const [learning, setLearning] = useState(initial?.learning ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const empty = !wins.trim() && !learning.trim() && !priority.trim();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/weekly-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wins, learning, priority, weekStart: weekStartISO }),
      });
      if (!res.ok) throw new Error();
      toast.success("Reflection saved.");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to save reflection.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">🏆 3 wins this week</label>
        <textarea
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          placeholder="Any PR hit, deal closed, habit held, conversation you had..."
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">📚 1 thing I learned</label>
        <textarea
          value={learning}
          onChange={(e) => setLearning(e.target.value)}
          placeholder="Something that shifted how you think or work..."
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">🎯 Next week&apos;s #1 priority</label>
        <input
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          placeholder="If you only win one thing next week, what is it?"
          className="w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || empty}
        className="rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save reflection"}
      </button>
    </div>
  );
}

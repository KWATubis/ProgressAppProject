"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ActivityKind = "STRENGTH" | "CARDIO" | "SPORT";

const KINDS: { kind: ActivityKind; icon: string; label: string; description: string; defaultEmoji: string }[] = [
  { kind: "STRENGTH", icon: "🏋️", label: "Strength", description: "Log sets, reps & weight", defaultEmoji: "🏋️" },
  { kind: "CARDIO", icon: "🏃", label: "Cardio", description: "Log distance, duration & pace", defaultEmoji: "🏃" },
  { kind: "SPORT", icon: "⛹️", label: "Sport", description: "Log sessions with duration & notes", defaultEmoji: "⛹️" },
];

export function CreateActivityDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleKindSelect(k: ActivityKind) {
    setKind(k);
    setIcon(KINDS.find((x) => x.kind === k)?.defaultEmoji ?? "");
    setStep(2);
  }

  function handleBack() {
    setStep(1);
    setKind(null);
    setName("");
    setIcon("");
    setError("");
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setStep(1);
      setKind(null);
      setName("");
      setIcon("");
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kind) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/health/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon, kind }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create activity");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            className="rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Add activity"
          />
        }
      >
        <Plus className="h-4 w-4" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "What are you tracking?" : "Name your activity"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2 pt-2">
            {KINDS.map(({ kind: k, icon: ki, label, description }) => (
              <button
                key={k}
                onClick={() => handleKindSelect(k)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
              >
                <span className="text-2xl">{ki}</span>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && kind && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Input
                placeholder="emoji…"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-name">Name</Label>
              <Input
                id="activity-name"
                placeholder={kind === "STRENGTH" ? "e.g. Calisthenics" : kind === "CARDIO" ? "e.g. Running" : "e.g. Basketball"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

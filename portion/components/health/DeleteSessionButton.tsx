"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function DeleteSessionButton({
  sessionId,
  redirectTo,
  className,
}: {
  sessionId: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this session? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/workout/${sessionId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Session deleted.");
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete session");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label="Delete session"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
        className,
      )}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

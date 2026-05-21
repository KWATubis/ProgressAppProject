"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ImportResult = {
  imported: number;
  skipped: number;
  failed: number;
};

export function GarminUploadButton({
  variant = "outline",
  size = "sm",
  label = "Upload from Garmin",
}: {
  variant?: "outline" | "secondary" | "default" | "ghost";
  size?: "sm" | "default";
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const form = new FormData();
    for (const f of Array.from(files)) form.append("files", f);

    setBusy(true);
    try {
      const res = await fetch("/api/health/garmin/import", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const r: ImportResult = await res.json();
      const parts = [`${r.imported} imported`];
      if (r.skipped) parts.push(`${r.skipped} already there`);
      if (r.failed) parts.push(`${r.failed} failed`);
      if (r.imported > 0) toast.success(parts.join(" · "));
      else toast.info(parts.join(" · "));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".fit,.FIT"
        multiple
        className="hidden"
        onChange={onFiles}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-1 h-4 w-4" />
        {busy ? "Importing…" : label}
      </Button>
    </>
  );
}

"use client";

import { useState } from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CARD_URL = "/api/progress-card";

export function ShareProgressButton() {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // fresh render each open so newly-logged data shows up
      setLoaded(false);
      setSrc(`${CARD_URL}?t=${Date.now()}`);
    }
  }

  async function getFile(): Promise<File> {
    const res = await fetch(src ?? CARD_URL);
    if (!res.ok) throw new Error("Couldn't generate the card");
    const blob = await res.blob();
    return new File([blob], "portion-week.png", { type: "image/png" });
  }

  async function handleShare() {
    setBusy(true);
    try {
      const file = await getFile();
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "My week on Portion" });
      } else {
        triggerDownload(file);
        toast.success("Saved — share it to your story");
      }
    } catch (e) {
      // user cancelling the share sheet throws AbortError — stay quiet
      if ((e as Error)?.name !== "AbortError") {
        toast.error((e as Error)?.message ?? "Share failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setBusy(true);
    try {
      triggerDownload(await getFile());
    } catch (e) {
      toast.error((e as Error)?.message ?? "Download failed");
    } finally {
      setBusy(false);
    }
  }

  function triggerDownload(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)} className="gap-2">
        <Share2 className="size-4" />
        Share week
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Your week, ready to post</DialogTitle>
            <DialogDescription>9:16 card for your story or feed.</DialogDescription>
          </DialogHeader>

          <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <div className="aspect-[9/16] w-full">
              {!loaded && (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt="Your weekly progress card"
                  className={loaded ? "h-full w-full object-contain" : "hidden"}
                  onLoad={() => setLoaded(true)}
                  onError={() => {
                    setLoaded(true);
                    toast.error("Couldn't load the card");
                  }}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleDownload} disabled={busy} className="gap-2">
              <Download className="size-4" />
              Download
            </Button>
            <Button onClick={handleShare} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

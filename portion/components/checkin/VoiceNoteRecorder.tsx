"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_SECONDS = 60;

type Saved = { url: string | null; durationSec: number };

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Daily voice-note recorder for the check-in. Records up to 60s via the
 * MediaRecorder API, uploads to /api/voice-notes (Supabase Storage). VOC
 * Theme 2 — lowest-friction way to log "how today went."
 */
export function VoiceNoteRecorder({ dateISO }: { dateISO: string }) {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0); // ref so onstop reads the final, non-stale value

  // Load any existing note for today.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/voice-notes?date=${dateISO}`)
      .then((r) => (r.ok ? r.json() : { note: null }))
      .then((d) => {
        if (cancelled) return;
        setSaved(d.note ? { url: d.note.url, durationSec: d.note.durationSec } : null);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateISO]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    if (typeof MediaRecorder === "undefined") {
      toast.error("Recording isn't supported in this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Mic access denied. Enable it in your browser settings.");
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stopTracks();
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      void upload(blob, elapsedRef.current);
    };

    rec.start();
    setRecording(true);
    elapsedRef.current = 0;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_SECONDS) stopRecording();
    }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function upload(blob: Blob, recordedSec: number) {
    const durationSec = Math.max(1, recordedSec);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "note.webm");
      form.append("date", dateISO);
      form.append("durationSec", String(durationSec));
      const res = await fetch("/api/voice-notes", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Upload failed");
      }
      // Re-fetch to get a signed playback URL.
      const refetch = await fetch(`/api/voice-notes?date=${dateISO}`).then((r) => r.json());
      setSaved(refetch.note ? { url: refetch.note.url, durationSec: refetch.note.durationSec } : { url: null, durationSec });
      toast.success("Voice note saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setElapsed(0);
    }
  }

  async function remove() {
    if (!confirm("Delete today's voice note?")) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/voice-notes?date=${dateISO}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSaved(null);
      toast.success("Voice note deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-400/25 bg-gradient-to-b from-indigo-400/[0.07] to-transparent p-5">
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-indigo-300" />
        <h2 className="text-sm font-semibold tracking-tight">Voice note</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {recording ? fmt(elapsed) : `up to ${MAX_SECONDS}s`}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        How did today go? Say it out loud — faster than typing.
      </p>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : recording ? (
          <div className="flex items-center gap-3">
            <Waveform />
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={stopRecording}>
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop &amp; save
            </Button>
          </div>
        ) : uploading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
          </div>
        ) : saved ? (
          <div className="flex flex-wrap items-center gap-3">
            {saved.url ? (
              <audio controls src={saved.url} className="h-9 max-w-full" />
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Play className="h-3.5 w-3.5" /> Saved · {fmt(saved.durationSec)}
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={remove}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={startRecording}>
              <Mic className="h-3.5 w-3.5" />
              Re-record
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" className="gap-1.5" onClick={startRecording}>
            <Mic className="h-3.5 w-3.5" />
            Record
          </Button>
        )}
      </div>
    </div>
  );
}

function Waveform() {
  return (
    <div className="flex items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-indigo-300"
          style={{
            height: 6,
            animation: "vn-bar 0.9s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`@keyframes vn-bar { 0%,100% { height: 6px } 50% { height: 22px } }`}</style>
    </div>
  );
}

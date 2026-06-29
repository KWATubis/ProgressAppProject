import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline — Portion",
};

// Public fallback shown by the service worker when a navigation fails offline.
// Intentionally outside the (app) auth group so it renders without a session.
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="max-w-sm text-muted-foreground">
        Portion needs a connection to sync your training, diet, and progress.
        Reconnect and try again.
      </p>
    </main>
  );
}

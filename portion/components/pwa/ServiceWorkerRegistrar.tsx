"use client";

import { useEffect } from "react";

// Registers the service worker on the client. Kept tiny and failure-tolerant —
// if registration throws (e.g. unsupported browser) we silently no-op.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

// Minimal service worker for Portion.
//
// Purpose: satisfy PWA installability (a fetch handler must exist) and give a
// graceful offline fallback. Portion is a backend-dependent, authenticated app,
// so we deliberately DO NOT cache pages or /api responses — caching private,
// per-user data in the SW would be a correctness/privacy hazard. We only keep an
// offline fallback page + the app icons.

const CACHE = "portion-shell-v1";
const PRECACHE = ["/offline", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only intervene on top-level page navigations. Everything else — API calls,
  // auth, POSTs, assets — goes straight to the network untouched.
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => caches.match("/offline"))
  );
});

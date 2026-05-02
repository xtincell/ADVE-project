/**
 * La Fusée Service Worker — Tier 3.3 of the residual debt.
 *
 * Strategy:
 *   - Cache-first for static assets (Next.js _next/static/*, public/*).
 *   - Network-first for HTML pages (so users always get fresh server-rendered
 *     content when online; falls back to cached on offline).
 *   - Bypass for /api/* and /trpc/* (must always hit the network — these are
 *     audited governance writes that cannot be served stale).
 */

const CACHE_VERSION = "lafusee-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Bypass API + tRPC + auth — must be live.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/trpc/")) {
    return;
  }

  // Static assets — cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone)).catch(() => undefined);
          }
          return res;
        });
      }),
    );
    return;
  }

  // HTML pages — network-first, fall back to cache.
  if (req.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(req, clone)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? caches.match("/"))),
    );
    return;
  }

  // Everything else — passthrough.
});

// ─── Web Push (ADR-0023) ────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (_err) {
    payload = { title: "La Fusée", body: event.data.text() };
  }
  const title = payload.title || "La Fusée";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    data: {
      link: payload.link || "/",
      notificationId: payload.notificationId || null,
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    }),
  );
});

// Static-asset cache only. Deliberately does NOT touch:
//  - navigation requests (the HTML/RSC document for a page) — those must
//    always hit the network, since every page here is authenticated,
//    role-gated, and shows live business data (attendance, financial
//    figures, team roster). Caching those risked serving stale or, worse,
//    a *different signed-in user's* cached data on a shared device.
//  - any cross-origin request (Supabase auth/API calls) — never intercepted.
//  - anything that isn't a GET.
// Scope is intentionally narrow: hashed Next.js build assets under
// /_next/static/ (JS/CSS/fonts), which are immutable per build (the
// filename hash changes on every deploy), so cache-first is safe there —
// a stale cache entry for one of these is simply never requested again
// after a new deploy ships new hashed filenames.

const CACHE_VERSION = "v1";
const CACHE_NAME = `motorell-static-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  // Don't pre-cache specific paths — Next.js build filenames are
  // content-hashed and unknown ahead of time. Assets get cached lazily as
  // they're actually requested, in the fetch handler below.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("motorell-static-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

function isCacheableStaticAsset(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  if (request.mode === "navigate") return false;
  // Next.js's own immutable, content-hashed build output.
  if (url.pathname.startsWith("/_next/static/")) return true;
  // Plain static files served from /public (fonts, icons, images).
  return /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (!isCacheableStaticAsset(event.request, url)) {
    // Let the browser handle everything else natively — no
    // event.respondWith() call means this request is untouched by the SW.
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});

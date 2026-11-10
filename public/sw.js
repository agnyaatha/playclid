/* Minimal offline support. Static build assets are cached as they are used; pages try the network first and fall
 * back to the last copy. All progress is stored on the device already, so the app keeps working offline. */
const CACHE = "table-craft-v3";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Store a copy of a response. The clone must be taken before the original body is handed to the page. */
function remember(req, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Hashed build assets never change: serve from the cache, filling it on first use.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => remember(req, res))));
    return;
  }

  // Pages: fresh when online, the last visited copy when not.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => remember(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/") || Response.error())),
    );
  }
});

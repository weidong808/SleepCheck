// SleepCheck service worker — offline app shell + ambience + scene art.
const CACHE = "sleepcheck-v6";
const SHELL = [
  "/",
  "/about",
  "/app-icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/stories/forest.svg",
  "/stories/cove.svg",
  "/stories/cottage.svg",
  "/stories/train.svg",
  "/stories/garden.svg",
  "/scenes/rainy-cabin.svg",
  "/scenes/moonlit-shore.svg",
  "/scenes/summer-meadow.svg",
  "/scenes/creekside.svg",
  "/scenes/deep-hush.svg",
  "/scenes/storm-shelter.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Network-first for navigations (fresh app); cache-first for static assets
// including the rendered ambience loops so sounds work offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept Vercel Analytics / platform routes.
  if (url.pathname.startsWith("/_vercel/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (
            res.ok &&
            (url.pathname.startsWith("/_next/") ||
              url.pathname.match(/\.(png|svg|woff2?|mp3)$/))
          ) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

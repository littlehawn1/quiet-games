/* Quiet Games offline helper (service worker).
   When the games are opened from the website, this keeps a copy of every file on the
   device. Each time a file is needed it asks the website first, so updates show up
   straight away, and uses the saved copy if there's no connection (or the site takes
   more than a few seconds to answer). */
const CACHE = "quiet-games";
const FILES = [
  "./", "index.html", "sudoku.html", "words.html", "words-data.js", "cards.html", "blocks.html", "mahjong.html",
  "fonts/lexend.woff2", "fonts/bricolage-grotesque.woff2",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // "no-cache" still uses the browser's copy when the site says nothing changed, so it's cheap.
      const fresh = await withTimeout(fetch(req, { cache: "no-cache" }), 4000);
      if (fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return (await cache.match(req, { ignoreSearch: true })) || (await cache.match("index.html")) || Response.error();
    }
  })());
});

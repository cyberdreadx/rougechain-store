// RougeChain Store service worker: makes the store installable and lets it open without a connection.
//
//   pages, scripts, styles   network first, so a change is live on the next load; the saved copy
//                            when offline (and offline.html for a page that was never opened)
//   images, fonts, icons     from the saved copy at once, refreshed in the background
//   /api/*, other sites      never touched (sign-in and Stripe always go to the network)
//
// Raise VERSION when SHELL changes; old copies are deleted when the new worker takes over.
const VERSION = "rc-store-1";
const SHELL = [
  "./", "index.html", "gltch-runner.html", "offline.html",
  "store-config.js", "store.js", "account.js", "app.js", "app.css", "manifest.webmanifest",
  "fonts/fonts.css", "img/rougechain.png", "img/capsule.jpg", "img/kestrel-night.jpg",
  "icons/icon-192.png", "icons/apple-touch-icon.png",
  "img/kestrel-night-t.jpg", "img/neonrow-street-t.jpg", "img/nexus-lobby-t.jpg", "img/coldline-platform-t.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("rc-store-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function fresh(request) {
  return fetch(request).then((res) => {
    if (res.ok && res.type === "basic") {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(request, copy));
    }
    return res;
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  const media = /\.(png|jpe?g|webp|gif|svg|ttf|woff2?)$/i.test(url.pathname);
  if (media) {
    // saved copy now, a fresh one for next time
    event.respondWith(
      caches.match(req).then((hit) => {
        const update = fresh(req).catch(() => hit || Response.error());
        return hit || update;
      }),
    );
    return;
  }

  // pages and code: the network, then the saved copy (also after 4 s on a crawling connection)
  event.respondWith(new Promise((resolve) => {
    const saved = () => caches.match(req, { ignoreSearch: req.mode === "navigate" });
    let done = false;
    const finish = (res) => { if (!done) { done = true; resolve(res); } };
    const fallback = () => saved().then((hit) => hit || (req.mode === "navigate" ? caches.match("offline.html") : Response.error()));
    const slow = setTimeout(() => saved().then((hit) => { if (hit) finish(hit); }), 4000);
    fresh(req)
      .then((res) => { clearTimeout(slow); finish(res); })
      .catch(() => { clearTimeout(slow); fallback().then(finish); });
  }));
});

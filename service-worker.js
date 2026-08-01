/* =====================================================
   Cardiothoracic Theatre Viewer
   service-worker.js
   -----------------------------------------------------
   Makes the dashboard installable and usable offline.

   Strategy is split by origin:
   - Same-origin (the app shell: every HTML/CSS/JS/icon file
     listed below) - CACHE FIRST, refreshed in the background.
     Every page load and menu switch is a brand new HTML
     document in this multi-page app, so without this every
     navigation re-fetched a dozen+ files over the network
     before rendering anything. This is safe to do instantly
     from cache because CACHE_NAME is keyed to APP_VERSION -
     bumping that version (this app's existing "golden rule")
     is what makes every device discard its old cache and pick
     up new files; it doesn't depend on this fetch strategy.
   - Cross-origin (the rota data backend) - NETWORK FIRST,
     cache fallback. Staff online always see the freshest
     rota; if the network is down, the last successfully
     fetched copy is shown instead.
   ===================================================== */

importScripts("./version.js");

const CACHE_NAME = `ct-theatre-${self.APP_VERSION}`;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./week.html",
  "./styles.css",
  "./week.css",
  "./clinical.css",
  "./app.js",
  "./viewer.js",
  "./week.js",
  "./viewer-utils.js",
    "./calendar.js",
  "./calendar.html",
    "./calendar.css",
  "./insights.js",
   "./insights.css",
  "./staff.js",
  "./staff.html",
  "./staff.css",



  "./version.js",
  "./config.js",
  "./api.js",
  "./print.js",
  "./oncall-now.js",
  "./myweek.js",
  "./features.css",
  "./tv.html",
  "./tv.js",
  "./manifest.json"
];

// Install: pre-cache the app shell, activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: delete caches from older versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: app shell = cache first + refresh in background; everything
// else (the data backend) = network first, cache fallback offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isAppShell = new URL(event.request.url).origin === self.location.origin;

  if (isAppShell) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const refresh = fetch(event.request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            return response;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// The update banner sends SKIP_WAITING when the user accepts an update
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

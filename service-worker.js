const CACHE_NAME = "berna-v16-1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/reset.css",
  "./css/variables.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/pages.css",
  "./css/miki.css",
  "./css/room.css",
  "./css/animations.css",
  "./css/theme.css",
  "./js/constants.js",
  "./js/utils.js",
  "./js/storage.js",
  "./js/ui.js",
  "./js/router.js",
  "./js/subjects.js",
  "./js/miki.js",
  "./js/sound.js",
  "./js/today.js",
  "./js/pomodoro.js",
  "./js/progress.js",
  "./js/room.js",
  "./js/friends.js",
  "./js/settings.js",
  "./js/summary.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./sounds/rain.wav",
  "./sounds/forest.wav",
  "./sounds/cafe.wav"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

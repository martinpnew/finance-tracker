const cacheName = "finance-tracker-v3";
const filesToCache = ["./","./index.html","./app.js","./manifest.webmanifest","./icon.svg"];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(filesToCache)));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => key !== cacheName ? caches.delete(key) : null))));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

const cacheName="my-finance-v7-recovery";
const files=["./","./index.html","./app.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(cacheName).then(c=>c.addAll(files)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==cacheName?caches.delete(k):null))))});
self.addEventListener("fetch",e=>{e.respondWith(fetch(e.request).then(r=>{let copy=r.clone();caches.open(cacheName).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))})

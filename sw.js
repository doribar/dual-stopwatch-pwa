const CACHE_NAME = "dual-stopwatch-v2-reminder";
const APP_FILES = [
  "./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest",
  "./reminder.html", "./reminder.css", "./reminder.js",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }))
  );
});

// 通知はPWAが閉じられていてもPush APIから受信できる。
self.addEventListener("push", (event) => {
  event.waitUntil(self.registration.showNotification("膝コゾ", {
    icon: new URL("./icons/icon-192.png", self.registration.scope).href,
    badge: new URL("./icons/icon-192.png", self.registration.scope).href,
    tag: "knee-kozo-daily",
    data: { url: self.registration.scope },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = self.registration.scope;
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const sameScope = open.find((client) => client.url.startsWith(url));
    if (sameScope) return sameScope.focus();
    return self.clients.openWindow(url);
  })());
});

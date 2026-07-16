/* No-op service worker: clears stale registrations that request /sw.js. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      return self.clients.matchAll({ type: "window" });
    }),
  );
});

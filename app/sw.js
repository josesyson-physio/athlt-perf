/* MotionPlus VO2 service worker: the whole app is cached so tests can run with no signal. */
const VERSION = '__BUILD_ID__';
const APP_CACHE = 'motionplus-app-' + VERSION;
const FONT_CACHE = 'motionplus-fonts-v1';
const APP_FILES = __APP_FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('motionplus-app-') && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonts: cache first, so typography survives offline after the first visit.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => Response.error()))
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  // App files: serve from cache; the new version arrives with the next service worker.
  event.respondWith(
    caches.open(APP_CACHE).then((c) =>
      c.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        if (req.mode === 'navigate') return c.match('./index.html').then((idx) => idx || fetch(req));
        return fetch(req);
      })
    )
  );
});

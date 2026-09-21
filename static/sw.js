// Service worker: makes the installed app (and repeat visits) start faster by keeping the site's files on the device.
// Registered by layouts/_partials/head/service-worker.html (production only). Scope: /mane-jun-blog/.
//
// - Pages (HTML), data (index.json, RSS) and the app manifest: always fetched from the network so new posts show up right away.
//   The saved copy is used only when the network is slow (NETWORK_TIMEOUT_MS) or offline.
// - CSS, JS, fonts, images: served from the device at once and refreshed in the background (stale-while-revalidate).
// - The admin (/admin/), other sites (comments, analytics) and non-GET requests are left alone.
//
// Bump VERSION to drop everything saved by an older version.
const VERSION = 'v1';
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const MAX_PAGES = 60;
const MAX_ASSETS = 200;
const NETWORK_TIMEOUT_MS = 3000;

const scopePath = new URL(self.registration.scope).pathname; // "/mane-jun-blog/"
const OFFLINE_HTML = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>오프라인 - mane-jun's log</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#292a2d;color:#e5e7eb;font-family:system-ui,sans-serif;text-align:center">
<div><p style="font-size:2rem;margin:0">🐸</p><p>인터넷에 연결되어 있지 않아요.<br>연결되면 다시 시도해 주세요.</p>
<p><a href="${scopePath}" style="color:#55bde2">홈으로</a></p></div></body></html>`;

self.addEventListener('install', (event) => {
  // Save the home page so the app can open even on the first offline start.
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add(scopePath)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([PAGES, ASSETS]);
    for (const name of await caches.keys()) if (!keep.has(name)) await caches.delete(name);
    // Lets the browser start the page request while the worker boots.
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

// Keeps a cache from growing forever: drops the oldest entries beyond the limit.
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const request of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(request);
}

async function networkFirst(event, request) {
  const cache = await caches.open(PAGES);
  const network = (async () => {
    const response = (await event.preloadResponse) || (await fetch(request));
    if (response.ok) {
      await cache.put(request, response.clone());
      event.waitUntil(trim(PAGES, MAX_PAGES));
    }
    return response;
  })();
  event.waitUntil(network.catch(() => {}));

  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  const first = await Promise.race([network.catch(() => null), timeout]);
  if (first) return first;
  // Slow or offline: fall back to the saved copy, otherwise keep waiting for the network.
  const saved = await cache.match(request);
  if (saved) return saved;
  try {
    return await network;
  } catch {
    if (request.mode === 'navigate') return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    throw new Error('offline');
  }
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(ASSETS);
  const saved = await cache.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
      await trim(ASSETS, MAX_ASSETS);
    }
    return response;
  });
  if (saved) {
    event.waitUntil(refresh.catch(() => {}));
    return saved;
  }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopePath)) return;
  if (url.pathname.startsWith(`${scopePath}admin/`) || url.pathname.endsWith('/sw.js')) return;

  const isPage = request.mode === 'navigate' || request.destination === 'document';
  const isData = /\.(json|xml|webmanifest)$/u.test(url.pathname);
  if (isPage || isData) {
    event.respondWith(networkFirst(event, request));
  } else {
    event.respondWith(staleWhileRevalidate(event, request));
  }
});

/* Service worker — Gestion Boutique Pro
 * Permet d'ouvrir l'application sans connexion internet :
 *  - la page de l'app : réseau d'abord (toujours la dernière version en ligne),
 *    copie en cache si le réseau ne répond pas en 4 secondes ;
 *  - le SDK Firebase et Chart.js (adresses versionnées) : cache d'abord ;
 *  - les échanges avec Firestore / Authentication ne sont jamais interceptés.
 * Changer CACHE_VERSION force le rafraîchissement des fichiers mis en cache.
 */
const CACHE_VERSION = 'gbp-v1';
const SHELL_CACHE = 'gbp-shell-' + CACHE_VERSION;
const CDN_CACHE = 'gbp-cdn-' + CACHE_VERSION;
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-48.png'];
const CDN_HOSTS = ['www.gstatic.com', 'cdn.jsdelivr.net'];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, CDN_CACHE];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') { event.respondWith(pageNetworkFirst(event)); return; }
    event.respondWith(staleWhileRevalidate(event, SHELL_CACHE));
    return;
  }
  const isLib = CDN_HOSTS.includes(url.hostname) &&
    (url.pathname.startsWith('/firebasejs/') || url.pathname.startsWith('/npm/'));
  if (isLib) event.respondWith(cacheFirst(req, CDN_CACHE));
  // Tout le reste (Firestore, Authentication…) passe directement par le réseau.
});

async function pageNetworkFirst(event) {
  const cache = await caches.open(SHELL_CACHE);
  const shellKey = new URL('./', self.registration.scope).href;
  const network = fetch(event.request).then(res => {
    if (res.ok && new URL(event.request.url).pathname === new URL(shellKey).pathname) cache.put(shellKey, res.clone());
    return res;
  });
  event.waitUntil(network.catch(() => {}));
  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch (e) { /* hors ligne */ }
  const cached = await cache.match(shellKey);
  if (cached) return cached;
  return network; // pas encore de copie : on attend le réseau
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then(res => {
    if (res.ok) cache.put(event.request, res.clone());
    return res;
  });
  if (cached) { event.waitUntil(network.catch(() => {})); return cached; }
  return network;
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

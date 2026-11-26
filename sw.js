// P-Salts app: keeps the locked page and its icons on the phone, so the app opens without a network.
// The page is kept as it is served, encrypted: nothing decrypted is ever stored. The copilot and every other
// request to another site go straight to the network, untouched.
// Online, the page is always taken from the network first, so a new version shows at the next opening.
const VERSION = '24-202611261905';
const CACHE = 'psalts-' + VERSION;
const SCOPE = new URL('./', self.location).pathname;
const PAGE = SCOPE + 'index.html';
const CORE = [PAGE, SCOPE + 'manifest.webmanifest', SCOPE + 'icons/icon-192.png', SCOPE + 'icons/icon-512.png', SCOPE + 'icons/icon-maskable-512.png', SCOPE + 'icons/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('psalts-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  // the page itself: network first; the kept copy when there is no network or the server answers with an error
  if (url.pathname === SCOPE || url.pathname === PAGE) {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(cache => cache.put(PAGE, copy)); return res; }
      return caches.match(PAGE).then(hit => hit || res);
    }).catch(() => caches.match(PAGE)));
    return;
  }
  // the manifest and the icons: the kept copy first
  if (CORE.includes(url.pathname)) event.respondWith(caches.match(url.pathname).then(hit => hit || fetch(req)));
  // anything else under the scope (another page of the repository) is left to the network
});

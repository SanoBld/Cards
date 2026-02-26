/* ============================================================
   Cards — Service Worker v4
   Network-First pour les fichiers principaux (détecte les mises à jour GitHub)
   Cache-First pour polices et bibliothèques externes
   ⚠️  Incrémentez VERSION à chaque déploiement sur GitHub Pages
============================================================ */
const VERSION = '4.0.0';
const CACHE   = `cards-${VERSION}`;

const CORE_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

const CDN_FILES = [
  'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

/* ── INSTALL ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll([...CORE_FILES, ...CDN_FILES]).catch(() => cache.addAll(CORE_FILES)))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE : supprime les anciens caches et informe les onglets ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: VERSION }));
        });
      })
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('0.peerjs.com') || event.request.url.includes('/id')) return;

  const url = event.request.url;
  const isCore = CORE_FILES.some(p => url.endsWith(p.replace('./', ''))) || url.endsWith('/');

  if (isCore) {
    /* Network-First : toujours vérifier si une nouvelle version est disponible */
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
  } else {
    /* Cache-First pour les ressources externes (polices, CDN) */
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});

// Bolso: guarda os arquivos do app para funcionar sem internet.
// Ao publicar uma versão nova, troque o número abaixo (v1 -> v2).
const CACHE = 'bolso-v2';
const FONTES = 'bolso-fontes';
const ARQUIVOS = [
  './', './index.html', './manifest.webmanifest', './lib/xlsx.mini.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONTES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const comPrazo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('prazo')), ms))]);

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Página: tenta a versão mais nova; sem internet, usa a guardada.
  if (r.mode === 'navigate') {
    e.respondWith(
      comPrazo(fetch(r), 4000)
        .then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Arquivos do próprio app: usa o guardado e busca se faltar.
  if (u.origin === location.origin) {
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
        return res;
      }))
    );
    return;
  }

  // Fonte do Google: guarda na primeira vez para usar sem internet.
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTES).then(c => c.match(r).then(m => m || fetch(r).then(res => { c.put(r, res.clone()); return res; })))
    );
  }
});

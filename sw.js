// Guarda os ficheiros para o jogo continuar a funcionar se a rede da escola falhar.
// Tenta sempre a rede primeiro, para apanhar alterações ao conteúdo.
var CACHE = 'geocaching-v2';
var FICHEIROS = ['./', 'index.html', 'css/estilo.css', 'js/jogo.js', 'js/sync.js', 'dados/caches.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHEIROS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // Só os ficheiros do jogo. A ligação em direto ao Firebase passa ao lado.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true });
    })
  );
});

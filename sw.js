// Guarda os ficheiros para o jogo continuar a funcionar se a rede da escola falhar.
// Tenta sempre a rede primeiro, para apanhar alterações ao conteúdo.
var CACHE = 'geocaching-v14';
var FICHEIROS = ['./', 'index.html', 'css/estilo.css', 'js/jogo.js', 'js/cripto.js', 'js/regras.js', 'js/acessivel.js', 'js/sync.js', 'dados/jogo.js', 'dados/mapa.svg',
  'dados/problemas/5-2.png', 'dados/problemas/5-3.png', 'dados/problemas/6-1.png', 'dados/problemas/6-2.png', 'dados/problemas/6-3.png', 'dados/problemas/6-5.png', 'dados/problemas/7-1.png', 'dados/problemas/7-2.png', 'dados/problemas/7-3a.png', 'dados/problemas/7-3b.png', 'dados/problemas/7-5.png', 'dados/problemas/8-1.png', 'dados/problemas/8-3.png', 'dados/problemas/8-4a.png', 'dados/problemas/8-4b.png'];

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

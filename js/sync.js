// Ligação em direto entre os tablets e a página do dono, através de uma base
// de dados Firebase Realtime Database (API REST, sem bibliotecas).
// Se "sincronizacao.url" estiver vazio em privado/conteudo.js, nada é enviado e o
// jogo funciona só no tablet, como antes.
window.Sync = (function () {
  'use strict';

  var cfg = (window.JOGO && window.JOGO.sincronizacao) || {};
  var base = cfg.url
    ? cfg.url.replace(/\/+$/, '') + '/' + encodeURIComponent(cfg.evento || 'geocaching')
    : null;

  function endereco(caminho) {
    return base + '/' + caminho + '.json';
  }

  function enviar(metodo, caminho, dados) {
    if (!base) return Promise.resolve(false);
    return fetch(endereco(caminho), { method: metodo, body: JSON.stringify(dados) })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }

  // Aplica uma alteração (caminho tipo "/LINCE42/fase") a uma cópia do valor.
  function alterar(valor, caminho, dados) {
    var partes = caminho.split('/').filter(Boolean);
    if (!partes.length) return dados;
    var raiz = valor && typeof valor === 'object' ? Object.assign({}, valor) : {};
    var no = raiz;
    for (var i = 0; i < partes.length - 1; i++) {
      var k = partes[i];
      no[k] = no[k] && typeof no[k] === 'object' ? Object.assign({}, no[k]) : {};
      no = no[k];
    }
    var ultima = partes[partes.length - 1];
    if (dados === null) delete no[ultima];
    else no[ultima] = dados;
    return raiz;
  }

  // Fica a ouvir um caminho e chama aoMudar(valorCompleto) a cada alteração.
  // O EventSource volta a ligar-se sozinho se a rede falhar.
  function ouvir(caminho, aoMudar, aoEstado) {
    if (!base || !window.EventSource) return null;
    var valor = null;
    var es = new EventSource(endereco(caminho));
    function evento(tipo) {
      return function (ev) {
        var m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!m) return;
        if (tipo === 'patch') {
          Object.keys(m.data || {}).forEach(function (k) {
            valor = alterar(valor, m.path.replace(/\/$/, '') + '/' + k, m.data[k]);
          });
        } else {
          valor = alterar(valor, m.path, m.data);
        }
        aoMudar(valor);
      };
    }
    es.addEventListener('put', evento('put'));
    es.addEventListener('patch', evento('patch'));
    if (aoEstado) {
      es.addEventListener('open', function () { aoEstado(true); });
      es.addEventListener('error', function () { aoEstado(false); });
    }
    return es;
  }

  return {
    ativo: !!base,
    guardar: function (caminho, dados) { return enviar('PUT', caminho, dados); },
    atualizar: function (caminho, dados) { return enviar('PATCH', caminho, dados); },
    ouvir: ouvir
  };
})();

// Conteúdo completo do jogo (respostas, códigos, locais) para as páginas do
// organizador. Está cifrado em dados/organizador.js e só abre com a
// palavra-passe do organizador. As funções de percurso também são usadas pelo
// script ferramentas/construir.js.
(function (raiz) {
  'use strict';

  var CHAVE_SESSAO = 'geocaching-organizador';
  var B = null; // conteúdo decifrado

  // ---------- regras do jogo (iguais no browser e no script de construção) ----------

  // A versão do problema que cabe a esta turma: a 1ª turma do ano recebe a
  // 1ª versão, a 2ª turma a 2ª versão, e assim por diante.
  function versaoProblema(conteudo, ano, posicao, turma) {
    var lista = ((conteudo.problemas || {})[ano] || [])[posicao];
    if (!lista) return null;
    var versoes = Array.isArray(lista) ? lista : [lista];
    var turmasDoAno = conteudo.turmas
      .filter(function (t) { return String(t.ano) === String(ano); })
      .map(function (t) { return t.turma; });
    var i = Math.max(0, turmasDoAno.indexOf(turma));
    return versoes[i % versoes.length];
  }

  // Os grupos da mesma turma fazem as mesmas caches, cada um a começar o mais
  // afastado possível dos outros (com 2 grupos e 5 caches: problemas 1 e 3).
  function inicioGrupo(grupo, nCaches, nGrupos) {
    return Math.floor((grupo - 1) * nCaches / (nGrupos || 1));
  }

  function percursoGrupo(conteudo, g) {
    var turma = conteudo.turmas[g.turmaIndice];
    var caches = turma.caches;
    var inicio = inicioGrupo(g.grupo, caches.length, turma.grupos);
    var passos = [];
    for (var i = 0; i < caches.length; i++) {
      var pos = (inicio + i) % caches.length;
      passos.push({ posicao: pos, cache: caches[pos] - 1 });
    }
    return passos;
  }

  function saidasPenalizadas(saidas) {
    return (saidas || []).filter(function (s) { return s.penalizada; }).length;
  }

  // A mesma conta do tablet.
  function penalizacao(cfg, r, ctrl) {
    return (r.dicas || 0) * cfg.penalizacaoDicaSegundos +
      (r.erros || 0) * cfg.penalizacaoErroSegundos +
      saidasPenalizadas(r.saidas) * (cfg.penalizacaoSaidaSegundos || 0) +
      ((ctrl && ctrl.extraSegundos) || 0);
  }

  // ---------- abrir o conteúdo ----------

  function guardarSessao(texto) {
    try { sessionStorage.setItem(CHAVE_SESSAO, texto); } catch (e) { /* ignorar */ }
  }

  function lerSessao() {
    try { return sessionStorage.getItem(CHAVE_SESSAO); } catch (e) { return null; }
  }

  function usar(texto) {
    B = JSON.parse(texto);
    raiz.JOGO_COMPLETO = B.conteudo;
    return B;
  }

  function decifrar(palavraPasse) {
    var o = raiz.ORGANIZADOR;
    if (!o) return Promise.resolve(null);
    return Cripto.chave(palavraPasse, o.sal, 'organizador', o.iteracoes)
      .then(function (k) { return Cripto.decifrarCom(k, o); });
  }

  // Mostra o pedido de palavra-passe em "zona" e chama aoAbrir() quando estiver aberto.
  function desbloquear(zona, aoAbrir) {
    var guardado = lerSessao();
    if (guardado) {
      try { usar(guardado); return aoAbrir(); } catch (e) { /* pede outra vez */ }
    }
    zona.innerHTML = '';
    var caixa = document.createElement('div');
    caixa.className = 'entrada-organizador';
    var titulo = document.createElement('h2');
    titulo.textContent = 'Área do organizador';
    var texto = document.createElement('p');
    texto.textContent = 'Escreve a palavra-passe do organizador para ver respostas e códigos.';
    var form = document.createElement('form');
    form.className = 'linha-resposta';
    var campo = document.createElement('input');
    campo.type = 'password';
    campo.id = 'palavra-passe';
    campo.className = 'resposta';
    campo.autocomplete = 'current-password';
    campo.setAttribute('aria-label', 'Palavra-passe do organizador');
    campo.placeholder = 'Palavra-passe';
    var botao = document.createElement('button');
    botao.type = 'submit';
    botao.className = 'principal';
    botao.textContent = 'Abrir';
    var erro = document.createElement('p');
    erro.className = 'erro';
    erro.setAttribute('role', 'alert');
    form.appendChild(campo);
    form.appendChild(botao);
    caixa.appendChild(titulo);
    caixa.appendChild(texto);
    caixa.appendChild(form);
    caixa.appendChild(erro);
    zona.appendChild(caixa);
    campo.focus();

    if (!raiz.ORGANIZADOR) erro.textContent = 'Falta o ficheiro dados/organizador.js.';
    else if (!Cripto.disponivel) erro.textContent = 'Este browser não permite decifrar. Abre a página pelo endereço https do site.';

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      botao.disabled = true;
      erro.textContent = 'A abrir…';
      decifrar(campo.value).then(function (t) {
        botao.disabled = false;
        if (!t) { erro.textContent = 'Palavra-passe errada.'; campo.select(); return; }
        guardarSessao(t);
        usar(t);
        aoAbrir();
      });
    });
  }

  function fechar() {
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* ignorar */ }
    B = null;
  }

  raiz.Organizador = {
    // regras puras, usadas também pelo script de construção
    versaoProblemaDe: versaoProblema,
    percursoGrupoDe: percursoGrupo,
    inicioGrupo: inicioGrupo,
    penalizacaoDe: penalizacao,
    // páginas do organizador
    desbloquear: desbloquear,
    fechar: fechar,
    listaGrupos: function () { return B.entradas; },
    codigosCache: function (i) { return B.codigosCache[i] || {}; },
    versaoProblema: function (ano, pos, turma) { return versaoProblema(B.conteudo, ano, pos, turma); },
    percursoGrupo: function (g) { return percursoGrupo(B.conteudo, g); },
    penalizacao: function (r, ctrl) { return penalizacao(B.conteudo, r, ctrl); },
    normalizar: function (s) { return Cripto.normalizar(s); }
  };
})(typeof window !== 'undefined' ? window : globalThis);

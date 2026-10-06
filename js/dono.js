(function () {
  'use strict';

  var D = null;               // conteúdo completo, depois de decifrado
  var G = window.Organizador;
  var raiz = document.getElementById('raiz');

  var grupos = {};      // estado enviado por cada tablet, por código de entrada
  var controlos = {};   // decisões do dono, por código de entrada
  var ligado = null;
  var selecionado = null;
  var separador = 'direto';
  var filtroTurma = '';
  var filtroAno = '';
  var todos = [];

  // ---------- utilitários ----------

  // Cada evento tem o seu direto no Firebase.
  function caminho(resto) {
    return 'eventos/' + D.id + '/' + resto;
  }

  function el(tag, atributos, filhos) {
    var n = document.createElement(tag);
    if (atributos) {
      Object.keys(atributos).forEach(function (k) {
        if (k === 'texto') n.textContent = atributos[k];
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), atributos[k]);
        else if (atributos[k] !== null && atributos[k] !== undefined) n.setAttribute(k, atributos[k]);
      });
    }
    (filhos || []).forEach(function (f) {
      if (f) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
    });
    return n;
  }

  function formatarTempo(seg) {
    seg = Math.max(0, Math.round(seg));
    var h = Math.floor(seg / 3600);
    var m = Math.floor((seg % 3600) / 60);
    var s = seg % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
  }

  function hora(ms) {
    var d = new Date(ms);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
  }

  function nome(g) { return g.turma + ' · G' + g.grupo; }

  // ---------- leitura do estado de cada grupo ----------

  function info(g) {
    var s = grupos[g.codigo];
    var c = controlos[g.codigo] || {};
    var agora = Date.now();
    var r = { g: g, s: s, c: c };
    if (!s) { r.estado = 'por começar'; r.classe = ''; return r; }
    var decorrido = ((s.fim || agora) - s.inicio) / 1000;
    r.pen = G.penalizacao(s, c);
    r.tempoFinal = decorrido + r.pen;
    r.decorrido = decorrido;
    r.semLigacao = !s.fim && agora - (s.atualizado || 0) > 75000;
    r.ajuda = s.ajuda && !((c.ajudaResolvida || 0) >= s.ajuda.t) ? s.ajuda : null;
    if (c.desclassificado) { r.estado = 'desclassificado'; r.classe = 'ban'; }
    else if (r.ajuda) { r.estado = 'pede ajuda'; r.classe = 'ajuda'; }
    else if (s.foraDaApp) { r.estado = 'fora da app'; r.classe = 'fora'; }
    else if (s.fim) { r.estado = s.esgotado ? 'tempo esgotado' : 'terminou'; r.classe = 'fim'; }
    else { r.estado = 'a jogar'; r.classe = 'jogo'; }
    return r;
  }

  function textoTempo(r) {
    if (!r.s) return '—';
    if (r.s.fim) return 'final ' + formatarTempo(r.tempoFinal);
    if (r.s.limite) return 'faltam ' + formatarTempo(r.s.limite - r.decorrido);
    return formatarTempo(r.decorrido);
  }

  function visiveis() {
    return todos.filter(function (g) { return !filtroTurma || g.turma === filtroTurma; });
  }

  // ---------- ações ----------

  function mandar(codigo, alteracao, aviso) {
    controlos[codigo] = Object.assign({}, controlos[codigo] || {}, alteracao);
    Object.keys(alteracao).forEach(function (k) { if (alteracao[k] === null) delete controlos[codigo][k]; });
    desenharConteudo();
    Sync.atualizar(caminho('controlo/' + codigo), alteracao).then(function (ok) {
      if (aviso) aviso.textContent = ok ? 'Enviado.' : 'Não foi enviado: sem ligação à base de dados.';
    });
  }

  // ---------- desenho ----------

  function iniciar() {
    raiz.innerHTML = '';
    var estadoLigacao = el('span', { id: 'ligacao', class: 'ligacao' });
    raiz.appendChild(el('div', { class: 'painel' }, [
      el('div', { class: 'linha-topo' }, [
        el('div', { class: 'titulo-evento' }, [
          el('h1', { texto: D.titulo + ': área do dono' }),
          G.seletorEventos()
        ]),
        el('div', { class: 'acoes-topo' }, [
          estadoLigacao,
          el('button', { type: 'button', class: 'secundario', onclick: function () { G.fechar(); location.reload(); }, texto: 'Bloquear' })
        ])
      ]),
      el('div', { class: 'separadores', role: 'tablist' }, [
        botaoSeparador('direto', 'Em direto'),
        botaoSeparador('classificacao', 'Classificação'),
        botaoSeparador('codigos', 'Códigos')
      ]),
      el('div', { id: 'conteudo' })
    ]));
    mostrarLigacao();

    if (Sync.ativo) {
      Sync.ouvir(caminho('grupos'), function (v) { grupos = v || {}; desenharConteudo(); }, function (ok) { ligado = ok; mostrarLigacao(); });
      Sync.ouvir(caminho('controlo'), function (v) { controlos = v || {}; desenharConteudo(); });
    }
    desenharConteudo();
    setInterval(atualizarTempos, 1000);
  }

  function mostrarLigacao() {
    var n = document.getElementById('ligacao');
    if (!n) return;
    if (!Sync.ativo) { n.textContent = 'Direto não configurado'; n.className = 'ligacao mal'; }
    else if (ligado) { n.textContent = '● Ligado'; n.className = 'ligacao ok'; }
    else { n.textContent = 'A ligar…'; n.className = 'ligacao'; }
  }

  function botaoSeparador(id, texto) {
    return el('button', {
      type: 'button', role: 'tab', 'aria-selected': String(separador === id), 'data-sep': id,
      onclick: function () {
        separador = id;
        document.querySelectorAll('[data-sep]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.sep === id)); });
        desenharConteudo(true);
      },
      texto: texto
    });
  }

  function desenharConteudo(mudouSeparador) {
    var zona = document.getElementById('conteudo');
    if (!zona) return;
    if (separador === 'direto') {
      if (mudouSeparador || !document.getElementById('tabela')) montarDireto(zona);
      desenharAlertas();
      desenharResumo();
      desenharTabela();
      desenharFeed();
      atualizarGestao();
    } else {
      zona.innerHTML = '';
      if (separador === 'classificacao') desenharClassificacao(zona);
      else desenharCodigos(zona);
    }
  }

  function montarDireto(zona) {
    zona.innerHTML = '';
    if (!Sync.ativo) {
      zona.appendChild(el('p', { class: 'cartao aviso', texto: 'O direto ainda não está ligado. Preenche "sincronizacao.url" em privado/conteudo.js e volta a gerar os ficheiros (ver README, secção "Acompanhar em direto"). Os códigos já funcionam.' }));
    }
    var selTurma = el('select', { id: 'filtro-turma', onchange: function (ev) { filtroTurma = ev.target.value; desenharTabela(); } },
      [el('option', { value: '', texto: 'Todas as turmas' })].concat(D.turmas.map(function (t) {
        return el('option', { value: t.turma, texto: t.turma });
      })));
    selTurma.value = filtroTurma;
    zona.appendChild(el('div', { id: 'alertas', class: 'alertas', role: 'alert' }));
    zona.appendChild(el('div', { id: 'resumo', class: 'resumo-topo' }));
    zona.appendChild(el('div', { id: 'gestao' }));
    zona.appendChild(el('div', { class: 'filtros' }, [el('label', { for: 'filtro-turma', texto: 'Mostrar' }), selTurma]));
    zona.appendChild(el('div', { class: 'colunas' }, [
      el('div', { class: 'rolar', id: 'tabela' }),
      el('div', null, [el('h3', { texto: 'Saídas da app' }), el('ul', { id: 'feed', class: 'registo-saidas' })])
    ]));
  }

  // ---------- pedidos de ajuda ----------

  var ajudasVistas = {};
  var tituloOriginal = document.title;

  function apitar() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = new Ctx();
      [0, 0.35, 0.7].forEach(function (t) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.25, ctx.currentTime + t);
        g.gain.setValueAtTime(0, ctx.currentTime + t + 0.2);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
      });
    } catch (e) { /* sem som */ }
  }

  function desenharAlertas() {
    var n = document.getElementById('alertas');
    if (!n) return;
    var ativos = todos.map(info).filter(function (r) { return r.ajuda; });
    var novo = false;
    ativos.forEach(function (r) {
      var id = r.g.codigo + '|' + r.ajuda.t;
      if (!ajudasVistas[id]) { ajudasVistas[id] = true; novo = true; }
    });
    if (novo) apitar();
    document.title = ativos.length ? '(' + ativos.length + ') AJUDA · ' + tituloOriginal : tituloOriginal;
    n.innerHTML = '';
    ativos.forEach(function (r) {
      var min = Math.max(0, Math.round((Date.now() - r.ajuda.t) / 60000));
      n.appendChild(el('div', { class: 'alerta-ajuda' }, [
        el('div', null, [
          el('strong', { texto: nome(r.g) + ': ' + (r.ajuda.tipo === 'magoado' ? 'alguém se magoou' : 'pede ajuda') }),
          el('p', { texto: (r.ajuda.onde || 'local desconhecido') + ' · há ' + min + ' min (' + hora(r.ajuda.t) + ')' })
        ]),
        el('button', { type: 'button', class: 'principal', onclick: function () { mandar(r.g.codigo, { ajudaResolvida: Date.now() }); }, texto: 'Resolvido' })
      ]));
    });
  }

  function desenharResumo() {
    var lista = todos.map(info);
    function conta(f) { return lista.filter(f).length; }
    var n = document.getElementById('resumo');
    n.innerHTML = '';
    [
      ['Pedidos de ajuda', conta(function (r) { return r.ajuda; }), true],
      ['A jogar', conta(function (r) { return r.classe === 'jogo' || r.classe === 'fora' || r.classe === 'ajuda'; }), false],
      ['Fora da app agora', conta(function (r) { return r.classe === 'fora'; }), true],
      ['Sem ligação', conta(function (r) { return r.semLigacao; }), true],
      ['Terminaram', conta(function (r) { return r.classe === 'fim'; }), false],
      ['Desclassificados', conta(function (r) { return r.classe === 'ban'; }), true]
    ].forEach(function (x) {
      n.appendChild(el('div', { class: 'numero' + (x[2] && x[1] ? ' alerta' : '') }, [el('strong', { texto: String(x[1]) }), el('span', { texto: x[0] })]));
    });
  }

  function desenharTabela() {
    var zona = document.getElementById('tabela');
    if (!zona) return;
    var cab = ['Grupo', 'Código', 'Estado', 'Caches', 'Tempo', 'Erros', 'Dicas', 'Saídas', 'Penalização', ''];
    var t = el('table', { class: 'grelha' }, [el('tr', null, cab.map(function (c) { return el('th', { texto: c }); }))]);
    visiveis().forEach(function (g) {
      var r = info(g);
      var saidas = r.s ? (r.s.saidas || []) : [];
      var pen = saidas.filter(function (x) { return x.penalizada; }).length;
      t.appendChild(el('tr', { class: selecionado === g.codigo ? 'selecionado' : null }, [
        el('td', { texto: nome(g) }),
        el('td', { texto: g.codigo }),
        el('td', null, [
          el('span', { class: 'chip ' + r.classe, texto: r.estado }),
          r.semLigacao ? el('span', { class: 'chip offline', texto: 'sem ligação' }) : null
        ]),
        el('td', { class: 'num', texto: r.s ? r.s.passo + '/' + r.s.total : '—' }),
        el('td', { class: 'num', 'data-tempo': g.codigo, texto: textoTempo(r) }),
        el('td', { class: 'num', texto: r.s ? String(r.s.erros) : '—' }),
        el('td', { class: 'num', texto: r.s ? String(r.s.dicas) : '—' }),
        el('td', { class: 'num', texto: r.s ? pen + (saidas.length > pen ? ' (+' + (saidas.length - pen) + ' curtas)' : '') : '—' }),
        el('td', { class: 'num', texto: r.s ? '+' + formatarTempo(r.pen) : '—' }),
        el('td', null, [el('button', { type: 'button', class: 'secundario', onclick: function () { selecionar(g.codigo); }, texto: 'Gerir' })])
      ]));
    });
    zona.innerHTML = '';
    zona.appendChild(t);
  }

  function desenharFeed() {
    var n = document.getElementById('feed');
    if (!n) return;
    var itens = [];
    todos.forEach(function (g) {
      var s = grupos[g.codigo];
      if (!s) return;
      if (s.foraDaApp) itens.push({ t: s.foraDaApp, texto: nome(g) + ': fora da app desde as ' + hora(s.foraDaApp), pen: true });
      (s.saidas || []).forEach(function (x) {
        itens.push({ t: x.inicio, texto: hora(x.inicio) + ' · ' + nome(g) + ': saiu ' + x.duracao + ' s' + (x.penalizada ? ' (+' + Math.round((D.penalizacaoSaidaSegundos || 0) / 60) + ' min)' : ' (curta, sem penalização)'), pen: x.penalizada });
      });
    });
    itens.sort(function (a, b) { return b.t - a.t; });
    n.innerHTML = '';
    if (!itens.length) n.appendChild(el('li', { class: 'vazio', texto: 'Nenhuma saída registada.' }));
    itens.slice(0, 40).forEach(function (i) { n.appendChild(el('li', { class: i.pen ? 'penalizada' : null, texto: i.texto })); });
  }

  function atualizarTempos() {
    if (separador !== 'direto') return;
    todos.forEach(function (g) {
      var c = document.querySelector('[data-tempo="' + g.codigo + '"]');
      if (c) c.textContent = textoTempo(info(g));
    });
  }

  function selecionar(codigo) {
    selecionado = codigo;
    var zona = document.getElementById('gestao');
    zona.innerHTML = '';
    var g = todos.filter(function (x) { return x.codigo === codigo; })[0];
    var aviso = el('p', { class: 'estado-gestao', role: 'status' });
    var msg = el('input', { id: 'mensagem', type: 'text', maxlength: '200', placeholder: 'Ex.: Voltem à base, por favor.', 'aria-label': 'Mensagem para o tablet' });
    var motivo = el('input', { id: 'motivo', type: 'text', maxlength: '120', placeholder: 'Motivo (aparece no tablet)', 'aria-label': 'Motivo' });
    var botaoBan = el('button', { type: 'button', class: 'perigo', id: 'botao-ban' });

    botaoBan.addEventListener('click', function () {
      var c = controlos[codigo] || {};
      if (c.desclassificado) {
        mandar(codigo, { desclassificado: null, motivo: null }, aviso);
        return;
      }
      if (!botaoBan.dataset.confirmar) {
        botaoBan.dataset.confirmar = '1';
        botaoBan.textContent = 'Carregar outra vez para desclassificar';
        return;
      }
      delete botaoBan.dataset.confirmar;
      mandar(codigo, { desclassificado: true, motivo: motivo.value.trim() || null }, aviso);
    });

    function ajustar(seg) {
      var atual = (controlos[codigo] && controlos[codigo].extraSegundos) || 0;
      mandar(codigo, { extraSegundos: atual + seg || null }, aviso);
    }

    zona.appendChild(el('div', { class: 'gestao' }, [
      el('div', { class: 'linha-topo' }, [
        el('h2', { texto: nome(g) + ' (' + g.codigo + ')' }),
        el('button', { type: 'button', class: 'secundario', onclick: function () { selecionado = null; zona.innerHTML = ''; desenharTabela(); }, texto: 'Fechar' })
      ]),
      el('p', { id: 'resumo-gestao', class: 'estado-gestao' }),
      el('div', { class: 'acoes' }, [
        el('button', { type: 'button', class: 'secundario', onclick: function () { ajustar(300); }, texto: '+5 min' }),
        el('button', { type: 'button', class: 'secundario', onclick: function () { ajustar(-300); }, texto: '−5 min (anular)' })
      ]),
      el('form', {
        class: 'linha-resposta',
        onsubmit: function (ev) {
          ev.preventDefault();
          if (!msg.value.trim()) return;
          mandar(codigo, { mensagem: { id: Date.now().toString(36), texto: msg.value.trim() } }, aviso);
          msg.value = '';
        }
      }, [msg, el('button', { type: 'submit', class: 'principal', texto: 'Enviar mensagem' })]),
      el('div', { class: 'linha-resposta' }, [motivo, botaoBan]),
      aviso
    ]));
    atualizarGestao();
    desenharTabela();
    zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function atualizarGestao() {
    if (!selecionado) return;
    var g = todos.filter(function (x) { return x.codigo === selecionado; })[0];
    var r = info(g);
    var c = controlos[selecionado] || {};
    var resumo = document.getElementById('resumo-gestao');
    if (resumo) {
      resumo.textContent = 'Estado: ' + r.estado +
        (r.s ? ' · caches ' + r.s.passo + '/' + r.s.total + ' · ' + textoTempo(r) : '') +
        ' · ajuste do dono: ' + (c.extraSegundos ? (c.extraSegundos > 0 ? '+' : '−') + formatarTempo(Math.abs(c.extraSegundos)) : 'nenhum');
    }
    var b = document.getElementById('botao-ban');
    if (b && !b.dataset.confirmar) b.textContent = c.desclassificado ? 'Readmitir grupo' : 'Desclassificar';
  }

  function desenharClassificacao(zona) {
    var anos = [];
    D.turmas.forEach(function (t) { if (anos.indexOf(String(t.ano)) < 0) anos.push(String(t.ano)); });
    var sel = el('select', { id: 'filtro-ano', onchange: function (ev) { filtroAno = ev.target.value; desenharConteudo(); } },
      [el('option', { value: '', texto: 'Todos os anos' })].concat(anos.map(function (a) { return el('option', { value: a, texto: a + 'º ano' }); })));
    sel.value = filtroAno;
    zona.appendChild(el('div', { class: 'filtros' }, [el('label', { for: 'filtro-ano', texto: 'Mostrar' }), sel]));

    var lista = todos
      .filter(function (g) { return !filtroAno || g.ano === filtroAno; })
      .map(info)
      .filter(function (r) { return r.s; });
    lista.sort(function (a, b) {
      if (!!a.c.desclassificado !== !!b.c.desclassificado) return a.c.desclassificado ? 1 : -1;
      if (b.s.passo !== a.s.passo) return b.s.passo - a.s.passo;
      return a.tempoFinal - b.tempoFinal;
    });
    zona.appendChild(el('p', { class: 'instrucao', texto: 'Ganha quem encontrar mais caches; em empate, o menor tempo com penalizações. Grupos ainda a jogar entram com o tempo atual.' }));
    var t = el('table', { class: 'grelha' }, [el('tr', null, ['#', 'Grupo', 'Caches', 'Tempo com penalizações', 'Estado'].map(function (c) { return el('th', { texto: c }); }))]);
    lista.forEach(function (r, i) {
      t.appendChild(el('tr', null, [
        el('td', { class: 'num', texto: r.c.desclassificado ? '—' : String(i + 1) }),
        el('td', { texto: nome(r.g) }),
        el('td', { class: 'num', texto: r.s.passo + '/' + r.s.total }),
        el('td', { class: 'num', texto: formatarTempo(r.tempoFinal) }),
        el('td', null, [el('span', { class: 'chip ' + r.classe, texto: r.estado })])
      ]));
    });
    if (!lista.length) t.appendChild(el('tr', null, [el('td', { colspan: '5', class: 'vazio', texto: 'Ainda nenhum grupo começou.' })]));
    zona.appendChild(el('div', { class: 'rolar' }, [t]));
  }

  function desenharCodigos(zona) {
    var c = el('div', { class: 'codigos' });
    c.appendChild(el('p', null, ['Para imprimir cartões, papéis e folhas por turma, abre ', el('a', { href: 'professor.html', texto: 'o material do professor' }), '.']));
    c.appendChild(el('p', { texto: 'PIN dos professores nos tablets: ' + D.pinProfessor }));

    c.appendChild(el('h3', { texto: 'Códigos de entrada' }));
    var t = el('table', { class: 'grelha' }, [el('tr', null, ['Turma', 'Grupo', 'Código', 'Caches da turma'].map(function (x) { return el('th', { texto: x }); }))]);
    todos.forEach(function (g) {
      t.appendChild(el('tr', null, [
        el('td', { texto: g.turma }),
        el('td', { texto: String(g.grupo) }),
        el('td', { texto: g.codigo }),
        el('td', { texto: D.turmas[g.turmaIndice].caches.join(', ') })
      ]));
    });
    c.appendChild(el('div', { class: 'rolar' }, [t]));

    c.appendChild(el('h3', { texto: 'Códigos dentro das caches' }));
    var tc = el('table', { class: 'grelha' }, [el('tr', null, [el('th', { texto: 'Cache' }), el('th', { texto: 'Local' })].concat(
      D.turmas.map(function (tu) { return el('th', { texto: tu.turma }); })))]);
    D.caches.forEach(function (cache, i) {
      var cod = G.codigosCache(i);
      tc.appendChild(el('tr', null, [el('td', { texto: cache.nome }), el('td', { texto: (cache.coordenada || '') + ' ' + (cache.texto || '') })].concat(
        D.turmas.map(function (tu) { return el('td', { texto: tu.caches.indexOf(i + 1) >= 0 ? cod[tu.turma] : '·' }); }))));
    });
    c.appendChild(el('div', { class: 'rolar' }, [tc]));
    zona.appendChild(c);
  }

  raiz.innerHTML = '';
  raiz.dataset.pronto = '1';
  G.desbloquear(raiz, function () {
    D = window.JOGO_COMPLETO;
    todos = G.listaGrupos();
    iniciar();
  });
})();

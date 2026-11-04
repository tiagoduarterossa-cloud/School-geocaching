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
    var fimT = s.fim || agora;
    var pausa = (c.pausaSegundos || 0) + (c.pausadoDesde && !s.fim ? Math.max(0, (fimT - c.pausadoDesde) / 1000) : 0);
    var decorrido = Math.max(0, (fimT - s.inicio) / 1000 - pausa);
    r.pen = G.penalizacao(s, c);
    r.tempoFinal = decorrido + r.pen;
    r.decorrido = decorrido;
    r.semLigacao = !s.fim && agora - (s.atualizado || 0) > 75000;
    r.ajuda = s.ajuda && !((c.ajudaResolvida || 0) >= s.ajuda.t) ? s.ajuda : null;
    if (c.desclassificado) { r.estado = 'desclassificado'; r.classe = 'ban'; }
    else if (r.ajuda) { r.estado = 'pede ajuda'; r.classe = 'ajuda'; }
    else if (s.foraDaApp) { r.estado = 'fora da app'; r.classe = 'fora'; }
    else if (c.pausadoDesde && !s.fim) { r.estado = 'na base, tempo parado'; r.classe = 'chamado'; }
    else if (c.chamar && !s.fim) { r.estado = s.chamadaVista === c.chamar.id ? 'chamado (viram)' : 'chamado (ainda não viram)'; r.classe = 'chamado'; }
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
        botaoSeparador('onde', 'Onde estão'),
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
    setInterval(function () { if (separador === 'onde') desenharConteudo(); }, 15000);
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
      var zc = document.getElementById('chamar');
      if (zc) { zc.innerHTML = ''; zc.appendChild(barraChamar()); }
      desenharResumo();
      desenharTabela();
      desenharFeed();
      atualizarGestao();
    } else {
      zona.innerHTML = '';
      if (separador === 'onde') desenharOnde(zona);
      else if (separador === 'classificacao') desenharClassificacao(zona);
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
    zona.appendChild(el('div', { id: 'chamar' }));
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
      ['Fora da base há ' + MIN_FORA + '+ min', conta(function (r) { var o = onde(r); return o && !o.naBase && o.minutos >= MIN_FORA; }), true],
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
        el('button', { type: 'button', class: 'secundario', onclick: function () { ajustar(-300); }, texto: '−5 min (anular)' }),
        el('button', { type: 'button', class: 'principal', id: 'botao-chamar', onclick: function () { passoChamada(codigo, aviso); } }),
        el('button', { type: 'button', class: 'secundario', id: 'botao-cancelar-chamada', onclick: function () { mandar(codigo, { chamar: null }, aviso); }, texto: 'Cancelar a chamada' })
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
    var bc = document.getElementById('botao-chamar');
    var cs = controlos[selecionado] || {};
    if (bc) bc.textContent = cs.pausadoDesde ? 'Podem sair (o tempo recomeça)' : cs.chamar ? 'Chegaram à base (parar o tempo)' : 'Chamar à base';
    var bx = document.getElementById('botao-cancelar-chamada');
    if (bx) bx.hidden = !cs.chamar || !!cs.pausadoDesde;
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

  // ---------- onde estão ----------

  // Os alunos não levam o tablet, por isso não há GPS: o sítio de cada grupo
  // vem da fase do jogo. A resolver um problema, estão na base; depois de
  // acertarem, estão a ir ou a voltar da cache que lhes foi revelada.
  var MIN_FORA = 8;      // minutos fora da base a partir dos quais se avisa
  var MIN_URGENTE = 12;  // minutos a partir dos quais vale a pena ir ver

  function onde(r) {
    var s = r.s;
    if (!s || r.classe === 'ban') return null;
    var desde = s.faseDesde || s.atualizado || s.inicio;
    var minutos = Math.max(0, Math.floor((Date.now() - desde) / 60000));
    if (s.fim || s.fase !== 'procurar' || r.c.pausadoDesde) return { naBase: true, minutos: minutos, r: r };
    var passo = G.percursoGrupo(r.g)[s.passo];
    return { naBase: false, cache: passo ? passo.cache : -1, minutos: minutos, r: r };
  }

  function nomeLocal(i) {
    var c = D.caches[i];
    if (!c) return { nome: 'Cache desconhecida', sitio: '' };
    var andar = Number.isInteger(c.andar) && c.andar >= 0 ? (c.andar === 0 ? 'rés-do-chão' : c.andar + 'º andar') : '';
    return { nome: c.nome + (c.coordenada ? ' (' + c.coordenada + ')' : ''), sitio: (andar ? andar.charAt(0).toUpperCase() + andar.slice(1) + '. ' : '') + (c.texto || '') };
  }

  // Chama à base todos os grupos que ainda estão a jogar (ou tira o aviso a todos).
  // Chamar à base -> chegaram (o tempo para) -> podem sair (o tempo recomeça).
  function passoChamada(codigo, aviso) {
    var c = controlos[codigo] || {};
    if (c.pausadoDesde) {
      var parado = Math.max(0, (Date.now() - c.pausadoDesde) / 1000);
      mandar(codigo, { pausadoDesde: null, pausaSegundos: Math.round((c.pausaSegundos || 0) + parado) }, aviso);
    } else if (c.chamar) {
      mandar(codigo, { chamar: null, pausadoDesde: Date.now() }, aviso);
    } else {
      mandar(codigo, { chamar: { id: Date.now().toString(36), t: Date.now() } }, aviso);
    }
  }

  var confirmarChamadaAte = 0;  // o segundo clique tem de vir nos 6 s seguintes (a página redesenha-se sozinha)

  function barraChamar() {
    var aJogar = todos.filter(function (g) { var s = grupos[g.codigo]; return s && !s.fim && !(controlos[g.codigo] || {}).desclassificado; });
    var chamados = aJogar.filter(function (g) { return (controlos[g.codigo] || {}).chamar; });
    var aviso = el('span', { class: 'estado-gestao', role: 'status' });
    var botao = el('button', { type: 'button', class: chamados.length ? 'secundario' : 'perigo' });
    var aConfirmar = Date.now() < confirmarChamadaAte;
    botao.textContent = chamados.length ? 'Tirar o aviso a todos (' + chamados.length + ')'
      : aConfirmar ? 'Carregar outra vez para chamar ' + aJogar.length + ' grupos' : 'Chamar todos à base (' + aJogar.length + ')';
    if (!aJogar.length && !chamados.length) botao.disabled = true;
    botao.addEventListener('click', function () {
      if (chamados.length) {
        chamados.forEach(function (g) { mandar(g.codigo, { chamar: null }, aviso); });
        return;
      }
      if (Date.now() >= confirmarChamadaAte) {
        confirmarChamadaAte = Date.now() + 6000;
        botao.textContent = 'Carregar outra vez para chamar ' + aJogar.length + ' grupos';
        return;
      }
      confirmarChamadaAte = 0;
      var id = Date.now().toString(36);
      aJogar.forEach(function (g) { mandar(g.codigo, { chamar: { id: id, t: Date.now() } }, aviso); });
    });
    var parados = aJogar.filter(function (g) { return (controlos[g.codigo] || {}).pausadoDesde; });
    var retomar = parados.length ? el('button', { type: 'button', class: 'principal', onclick: function () {
      parados.forEach(function (g) { passoChamada(g.codigo, aviso); });
    }, texto: 'Podem sair todos (' + parados.length + ' com o tempo parado)' }) : null;
    return el('div', { class: 'barra-chamar' }, [botao, retomar, aviso]);
  }

  function desenharOnde(zona) {
    zona.appendChild(barraChamar());
    var base = (window.REGRAS && window.REGRAS.base) || '';
    zona.appendChild(el('p', { class: 'nota-onde', texto: 'Sem GPS: o sítio vem do jogo. A resolver um problema, o grupo está na base; depois de acertar, está a ir ou a voltar da cache indicada. ' +
      'Laranja: fora da base há ' + MIN_FORA + ' min ou mais. Vermelho: há ' + MIN_URGENTE + ' min ou mais, ou pedido de ajuda. Vai ver primeiro aos vermelhos.' }));
    var naBase = [], porCache = {};
    todos.map(info).forEach(function (r) {
      var o = onde(r);
      if (!o) return;
      if (o.naBase) naBase.push(o);
      else (porCache[o.cache] = porCache[o.cache] || []).push(o);
    });

    function linhaGrupo(o) {
      var r = o.r, cls = null, txt;
      if (o.naBase) {
        txt = r.s.fim ? (r.s.esgotado ? 'tempo esgotado' : 'terminou') : r.c.pausadoDesde ? 'tempo parado' : 'a resolver há ' + o.minutos + ' min';
      } else {
        txt = 'saiu há ' + o.minutos + ' min';
        if (o.minutos >= MIN_URGENTE) cls = 'urgente'; else if (o.minutos >= MIN_FORA) cls = 'atrasado';
      }
      if (r.classe === 'chamado') txt = r.estado + ' · ' + txt;
      if (r.ajuda) { cls = 'urgente'; txt = 'PEDE AJUDA · ' + txt; }
      return el('li', { class: cls }, [
        el('span', null, [nome(r.g), r.semLigacao ? el('span', { class: 'chip offline', texto: 'sem ligação' }) : null]),
        el('span', { class: 'min', texto: txt })
      ]);
    }
    function pior(lista) {
      return lista.reduce(function (m, o) { return Math.max(m, o.r.ajuda ? 99 : o.minutos); }, 0);
    }

    var grelha = el('div', { class: 'onde' });
    grelha.appendChild(el('div', { class: 'local base' }, [
      el('h3', { texto: 'Base' }),
      el('p', { class: 'sitio', texto: base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Onde está o professor' }),
      naBase.length ? el('ul', null, naBase.map(linhaGrupo)) : el('p', { class: 'sitio', texto: 'Nenhum grupo na base.' })
    ]));
    Object.keys(porCache).sort(function (a, b) { return pior(porCache[b]) - pior(porCache[a]); }).forEach(function (i) {
      var lista = porCache[i].sort(function (a, b) { return b.minutos - a.minutos; });
      var p = pior(lista);
      var l = nomeLocal(Number(i));
      grelha.appendChild(el('div', { class: 'local' + (p >= MIN_URGENTE ? ' urgente' : p >= MIN_FORA ? ' atrasado' : '') }, [
        el('h3', { texto: l.nome }),
        l.sitio ? el('p', { class: 'sitio', texto: l.sitio }) : null,
        el('ul', null, lista.map(linhaGrupo))
      ]));
    });
    var porComecar = todos.filter(function (g) { return !grupos[g.codigo]; }).length;
    zona.appendChild(grelha);
    if (window.REGRAS && window.REGRAS.mapa) {
      zona.appendChild(el('details', { class: 'mapa-dono', open: 'open' }, [
        el('summary', { texto: 'Mapa da escola' }),
        el('img', { src: window.REGRAS.mapa, alt: 'Mapa da escola com quadrícula' })
      ]));
    }
    if (porComecar) zona.appendChild(el('p', { class: 'nota-onde', texto: porComecar + ' grupo(s) ainda não começaram.' }));
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

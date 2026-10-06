(function () {
  'use strict';

  var DADOS = window.JOGO;
  var A = window.Acessivel || { fala: String, falar: function () {}, falarSeAtivo: function () {}, temVoz: false, painel: function () {} };
  var IT = Cripto.ITERACOES;
  var CHAVE = 'geocaching-escola-v5';
  var app = document.getElementById('app');
  var estado = carregar();
  var temporizador = null;
  var escutaControlo = null;
  var wakeLock = null;
  var chaveProfessor = null; // só em memória, depois de o professor escrever o PIN

  // ---------- armazenamento ----------

  function carregar() {
    try {
      var t = localStorage.getItem(CHAVE);
      return t ? JSON.parse(t) : null;
    } catch (e) {
      return null;
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (e) { /* sem armazenamento: o jogo continua, só não sobrevive a um recarregar */ }
    publicar();
  }

  function apagar() {
    try {
      localStorage.removeItem(CHAVE);
    } catch (e) { /* ignorar */ }
    if (escutaControlo) { escutaControlo.close(); escutaControlo = null; }
    estado = null;
  }

  // ---------- percurso ----------

  // O conteúdo está dividido em eventos (teste, Semana das Ciências, Dia da
  // Matemática); o código de entrada diz a que evento pertence o grupo.
  function eventoDe(id) {
    return (DADOS.eventos || []).filter(function (e) { return e.id === id; })[0] || null;
  }

  function eventoAtual() {
    return (estado && eventoDe(estado.evento)) || { percursos: {}, turmas: [] };
  }

  var normalizar = Cripto.normalizar;

  // Os grupos da mesma turma fazem as mesmas caches, cada um a começar o mais
  // afastado possível dos outros (com 2 grupos e 5 caches: problemas 1 e 3).
  function percursoGrupo(g) {
    var ev = eventoDe(g.evento) || { percursos: {}, turmas: [] };
    var n = (ev.percursos[g.turma] || []).length;
    var turma = ev.turmas[g.turmaIndice] || {};
    var inicio = Math.floor((g.grupo - 1) * n / (turma.grupos || 1));
    var passos = [];
    for (var i = 0; i < n; i++) passos.push({ posicao: (inicio + i) % n });
    return passos;
  }

  // O código de entrada só existe no ficheiro como resumo: calcula-se o resumo
  // do que foi escrito e procura-se na lista.
  function procurarGrupo(codigo) {
    return Cripto.resumo(normalizar(codigo), DADOS.sal, 'entrada', IT.entrada).then(function (h) {
      return DADOS.entradas.filter(function (e) { return e.h === h; })[0] || null;
    });
  }

  function contexto(pos) {
    return estado.evento + '|' + estado.turma + '|' + pos;
  }

  // Tenta abrir o local da cache com a resposta escrita. Devolve o local, ou null.
  function abrirComResposta(problema, pos, resposta) {
    return Cripto.chave(Cripto.canonica(resposta), DADOS.sal, 'resposta|' + contexto(pos), IT.resposta).then(function (k) {
      return (problema.fechos || []).reduce(function (anterior, fecho) {
        return anterior.then(function (achado) { return achado || Cripto.decifrarCom(k, fecho); });
      }, Promise.resolve(null));
    }).then(function (t) { return t ? JSON.parse(t) : null; });
  }

  function codigoDaCacheCerto(pos, escrito) {
    return Cripto.resumo(normalizar(escrito), DADOS.sal, 'cache|' + contexto(pos), IT.codigo).then(function (h) {
      return h === estado.revelado.codigo;
    });
  }

  function nomeEquipa(g) {
    return g.turma + ' · Grupo ' + g.grupo;
  }

  function passoAtual() {
    return estado.passos[estado.passo];
  }

  function problemaAtual() {
    return (eventoAtual().percursos[estado.turma] || [])[passoAtual().posicao];
  }

  function agora() {
    return Date.now();
  }

  function controlo() {
    return (estado && estado.controlo) || {};
  }

  function saidasPenalizadas(saidas) {
    return (saidas || []).filter(function (s) { return s.penalizada; }).length;
  }

  // A mesma conta é usada na página do dono (js/organizador.js).
  function penalizacao(r, ctrl) {
    return (r.dicas || 0) * DADOS.penalizacaoDicaSegundos +
      (r.erros || 0) * DADOS.penalizacaoErroSegundos +
      saidasPenalizadas(r.saidas) * (DADOS.penalizacaoSaidaSegundos || 0) +
      ((ctrl && ctrl.extraSegundos) || 0);
  }

  function segundosPenalizacao() {
    return penalizacao(estado, controlo());
  }

  // ---------- ligação ao dono ----------

  // Um envio de cada vez, sempre com o estado mais recente: assim um envio
  // antigo nunca chega depois de um novo e o dono vê sempre o último.
  var aEnviar = false;
  var enviarDeNovo = false;

  function publicar() {
    if (!window.Sync || !Sync.ativo || !estado || !estado.codigo) return;
    if (aEnviar) { enviarDeNovo = true; return; }
    aEnviar = true;
    Sync.guardar('eventos/' + estado.evento + '/grupos/' + estado.codigo, {
      turma: estado.turma,
      grupo: estado.grupo,
      ano: estado.ano,
      fase: estado.fase,
      passo: estado.passo,
      total: estado.passos.length,
      inicio: estado.inicio,
      fim: estado.fim || null,
      esgotado: !!estado.esgotado,
      erros: estado.erros,
      dicas: estado.dicas,
      saidas: estado.saidas || [],
      foraDaApp: estado.saidaInicio || null,
      ajuda: estado.ajuda || null,
      regras: estado.regrasAceites || null,
      limite: limiteSegundos(),
      atualizado: agora()
    }).then(function () {
      aEnviar = false;
      if (enviarDeNovo) { enviarDeNovo = false; publicar(); }
    });
  }

  function ouvirControlo() {
    if (!window.Sync || !Sync.ativo || !estado || !estado.codigo || escutaControlo) return;
    escutaControlo = Sync.ouvir('eventos/' + estado.evento + '/controlo/' + estado.codigo, function (v) {
      if (!estado) return;
      var novo = v || {};
      if (JSON.stringify(novo) === JSON.stringify(estado.controlo || {})) return;
      estado.controlo = novo;
      if (estado.ajuda && (novo.ajudaResolvida || 0) >= estado.ajuda.t) delete estado.ajuda;
      guardar();
      desenhar();
    });
  }

  // ---------- saídas da app ----------

  // Só conta como saída durante um problema: é aí que dava jeito uma
  // calculadora ou uma IA. A andar à procura da cache o ecrã pode apagar-se
  // sem penalização.
  function aResolver() {
    return estado && !estado.fim && estado.fase === 'problema' && !controlo().desclassificado && !estado.ajuda;
  }

  function registarRegresso() {
    if (!estado || !estado.saidaInicio) return;
    var inicio = estado.saidaInicio;
    var duracao = agora() - inicio;
    delete estado.saidaInicio;
    var penalizada = duracao >= (DADOS.toleranciaSaidaSegundos || 0) * 1000;
    estado.saidas = estado.saidas || [];
    estado.saidas.push({ inicio: inicio, duracao: Math.round(duracao / 1000), penalizada: penalizada });
    if (penalizada) estado.avisoSaida = true;
    guardar();
  }

  function manterEcraLigado() {
    try {
      if (!navigator.wakeLock || !estado || estado.fim || document.hidden) return;
      navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});
    } catch (e) { /* sem suporte */ }
  }

  function formatarTempo(seg) {
    seg = Math.max(0, Math.round(seg));
    var h = Math.floor(seg / 3600);
    var m = Math.floor((seg % 3600) / 60);
    var s = seg % 60;
    var mm = (h ? String(m).padStart(2, '0') : String(m));
    return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
  }

  function limiteSegundos() {
    var ev = estado && eventoDe(estado.evento);
    return ((ev && ev.tempoLimiteMinutos) || DADOS.tempoLimiteMinutos || 0) * 60;
  }

  // Termina o jogo se o tempo limite já passou. Devolve true se terminou.
  function verificarLimite() {
    var limite = limiteSegundos();
    if (!estado || estado.fim || !limite || tempoDecorrido() < limite) return false;
    estado.fase = 'fim';
    estado.fim = estado.inicio + limite * 1000;
    estado.esgotado = true;
    guardar();
    return true;
  }

  function tempoDecorrido() {
    var fim = estado.fim || agora();
    return (fim - estado.inicio) / 1000;
  }

  function comecar(g, regrasAceites) {
    estado = {
      evento: g.evento,
      regrasAceites: regrasAceites,
      codigo: g.codigo.toUpperCase(),
      equipa: nomeEquipa(g),
      turma: g.turma,
      grupo: g.grupo,
      ano: g.ano,
      passos: percursoGrupo(g),
      passo: 0,
      fase: 'problema',
      inicio: agora(),
      fim: null,
      erros: 0,
      errosSeguidos: 0,
      dicas: 0,
      dicaVista: false,
      bloqueadoAte: 0,
      saidas: []
    };
    guardar();
    ouvirControlo();
    manterEcraLigado();
    desenhar();
  }

  function avancar() {
    if (estado.fase === 'problema') {
      estado.fase = 'procurar';
    } else if (estado.fase === 'procurar') {
      estado.passo++;
      if (estado.revelado) estado.ultimoLocal = descricaoLocal(estado.revelado);
      delete estado.revelado;
      estado.dicaVista = false;
      estado.errosSeguidos = 0;
      if (estado.passo >= estado.passos.length) {
        estado.fase = 'fim';
        estado.fim = agora();
      } else {
        estado.fase = 'problema';
      }
    }
    guardar();
    desenhar();
  }

  function registarErro() {
    estado.erros++;
    estado.errosSeguidos++;
    if (estado.errosSeguidos >= DADOS.errosAteBloqueio) {
      estado.errosSeguidos = 0;
      estado.bloqueadoAte = agora() + DADOS.bloqueioSegundos * 1000;
    }
    guardar();
  }

  // ---------- interface ----------

  function el(tag, atributos, filhos) {
    var n = document.createElement(tag);
    if (atributos) {
      Object.keys(atributos).forEach(function (k) {
        if (k === 'texto') n.textContent = atributos[k];
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), atributos[k]);
        else n.setAttribute(k, atributos[k]);
      });
    }
    (filhos || []).forEach(function (f) {
      if (f) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
    });
    return n;
  }

  function desenhar() {
    clearInterval(temporizador);
    app.innerHTML = '';
    if (!estado) return ecraInicio();
    verificarLimite();
    app.appendChild(cabecalho());
    if (estado.ajuda) app.appendChild(avisoAjuda());
    if (controlo().desclassificado) return ecraDesclassificado();
    if (estado.fase === 'problema') ecraProblema();
    else if (estado.fase === 'procurar') ecraProcurar();
    else ecraFim();
    avisos();
    anunciarMudanca();
  }

  // Quando o ecrã muda (novo problema, local revelado, fim), o leitor de ecrã
  // vai para o título e, se a leitura automática estiver ligada, o tablet lê-o.
  var ultimoEcra = null;
  function anunciarMudanca() {
    var id = estado.fase + '|' + estado.passo;
    if (id === ultimoEcra) return;
    var primeira = ultimoEcra === null;
    ultimoEcra = id;
    if (primeira) return;
    var titulo = app.querySelector('main h2');
    if (estado.fase === 'procurar' && titulo) titulo.focus();
    if (estado.fase === 'problema') {
      var p = problemaAtual();
      if (p && !p.falta) A.falarSeAtivo('Problema ' + (estado.passo + 1) + '. ' + p.enunciado);
    } else if (estado.fase === 'procurar' && estado.revelado) {
      var c = estado.revelado;
      A.falarSeAtivo('Resposta certa! A cache está em ' + (c.coordenada ? c.coordenada + '. ' : '') + (c.texto || ''));
    } else if (estado.fase === 'fim') {
      A.falarSeAtivo(estado.esgotado ? 'Acabou o tempo. Voltem à base.' : 'Parabéns! Encontraram todas as caches.');
    }
  }

  function ecraDesclassificado() {
    refsBloqueio = null;
    app.appendChild(el('main', { class: 'cartao fim' }, [
      el('p', { class: 'trofeu', texto: '⛔' }),
      el('h2', { texto: 'Grupo desclassificado' }),
      controlo().motivo ? el('p', { class: 'motivo', texto: controlo().motivo }) : null,
      el('p', { texto: 'Desliguem o tablet do jogo e dirijam-se ao professor.' })
    ]));
  }

  function janela(titulo, texto, aoFechar, cls) {
    var fundo = el('div', { class: 'modal-fundo' });
    var botao = el('button', { type: 'button', class: 'principal', texto: 'Percebido', onclick: function () { fundo.remove(); aoFechar(); } });
    fundo.appendChild(el('div', { class: 'modal ' + (cls || ''), role: 'alertdialog', 'aria-modal': 'true' }, [
      el('h2', { texto: titulo }),
      el('p', { class: 'modal-texto', texto: texto }),
      botao
    ]));
    document.body.appendChild(fundo);
    botao.focus();
  }

  // Avisos que aparecem por cima do jogo: penalização por saída e mensagens do organizador.
  function avisos() {
    if (document.querySelector('.modal-fundo')) return;
    var msg = controlo().mensagem;
    if (estado.avisoSaida) {
      janela('Saíram da app',
        'Saíram desta página a meio de um problema. Isso conta como usar calculadora ou outra ajuda: +' +
        Math.round((DADOS.penalizacaoSaidaSegundos || 0) / 60) + ' minutos no tempo final.',
        function () { estado.avisoSaida = false; guardar(); }, 'modal-alerta');
    } else if (msg && msg.id && msg.id !== estado.mensagemVista) {
      janela('Mensagem do organizador', msg.texto, function () { estado.mensagemVista = msg.id; guardar(); });
    }
  }

  // ---------- pedir ajuda ----------

  function descricaoLocal(l) {
    return l.nome + (l.coordenada ? ' (' + l.coordenada + ')' : '') + (l.texto ? ': ' + l.texto : '');
  }

  // Onde o grupo está, pelo que o tablet sabe: a caminho da cache revelada, ou
  // perto da última cache encontrada.
  function ondeEstao() {
    if (estado.fase === 'procurar' && estado.revelado) return 'a caminho de ' + descricaoLocal(estado.revelado);
    if (estado.ultimoLocal) return 'perto de ' + estado.ultimoLocal;
    return 'perto do ponto de partida';
  }

  function pedirAjuda() {
    if (document.querySelector('.modal-fundo')) return;
    var fundo = el('div', { class: 'modal-fundo' });
    function fechar() { fundo.remove(); }
    function enviar(tipo) {
      estado.ajuda = { t: agora(), tipo: tipo, onde: ondeEstao() };
      if (estado.saidaInicio) delete estado.saidaInicio;
      guardar();
      fechar();
      desenhar();
    }
    fundo.appendChild(el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
      el('h2', { texto: 'Pedir ajuda' }),
      el('p', { class: 'modal-texto', texto: 'O organizador recebe o aviso logo, com o sítio onde estão.' }),
      el('button', { type: 'button', class: 'perigo', onclick: function () { enviar('magoado'); }, texto: 'Alguém se magoou' }),
      el('button', { type: 'button', class: 'secundario', onclick: function () { enviar('outro'); }, texto: 'Outro problema (perdidos, cache estragada, tablet)' }),
      el('button', { type: 'button', class: 'secundario', onclick: fechar, texto: 'Cancelar' })
    ]));
    fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fechar(); });
    document.body.appendChild(fundo);
  }

  function avisoAjuda() {
    var hora = new Date(estado.ajuda.t);
    var hh = String(hora.getHours()).padStart(2, '0') + ':' + String(hora.getMinutes()).padStart(2, '0');
    return el('div', { class: 'aviso-ajuda', role: 'alert' }, [
      el('strong', { texto: 'Pedido de ajuda enviado às ' + hh + '.' }),
      el('p', { texto: window.Sync && Sync.ativo
        ? 'Fiquem juntos e onde estão. Chamem também o adulto mais próximo.'
        : 'Este tablet não está ligado ao organizador: vão já ter com o adulto mais próximo.' }),
      el('button', { type: 'button', class: 'secundario', onclick: function () { delete estado.ajuda; guardar(); desenhar(); }, texto: 'Já está resolvido' })
    ]);
  }

  function cabecalho() {
    var relogio = el('span', { class: 'relogio' });
    function mostrarRelogio() {
      var limite = limiteSegundos();
      if (limite && !estado.fim) {
        var falta = limite - tempoDecorrido();
        relogio.textContent = 'Faltam ' + formatarTempo(falta);
        relogio.classList.toggle('pouco-tempo', falta <= 300);
      } else {
        relogio.textContent = formatarTempo(tempoDecorrido());
      }
    }
    mostrarRelogio();
    if (!estado.fim) {
      temporizador = setInterval(function () {
        if (verificarLimite()) return desenhar();
        mostrarRelogio();
        atualizarBloqueio();
      }, 1000);
    }
    var total = estado.passos.length;
    var feitas = estado.passo;
    var barra = el('div', { class: 'progresso' }, [
      el('div', { class: 'progresso-cheio', style: 'width:' + (100 * feitas / total) + '%' })
    ]);
    return el('header', { class: 'topo' }, [
      el('div', { class: 'topo-linha' }, [
        el('span', { class: 'equipa', texto: estado.equipa + ' · ' + estado.ano + 'º ano' }),
        relogio,
        el('button', { class: 'botao-prof', type: 'button', onclick: A.painel, 'aria-label': 'Acessibilidade', title: 'Acessibilidade', texto: 'Aa' }),
        el('button', { class: 'botao-ajuda', type: 'button', onclick: pedirAjuda, texto: 'Pedir ajuda' }),
        el('button', { class: 'botao-prof', type: 'button', onclick: painelProfessor, 'aria-label': 'Professor', texto: '⚙' })
      ]),
      barra,
      el('div', { class: 'contagem', texto: 'Caches encontradas: ' + feitas + ' de ' + total })
    ]);
  }

  function ecraInicio() {
    var codigo = el('input', {
      id: 'codigo', type: 'text', class: 'resposta', maxlength: '30', autocomplete: 'off',
      autocapitalize: 'characters', spellcheck: 'false', placeholder: 'Código do grupo'
    });
    var erro = el('p', { class: 'erro', role: 'alert' });
    var zona = el('div');

    function confirmar(eq) {
      var R = window.REGRAS || { seguranca: [], conduta: [] };
      var botaoComecar = el('button', { type: 'button', class: 'principal', disabled: 'disabled', onclick: function () { comecar(eq, agora()); }, texto: 'Começar' });
      var aceitar = el('input', { type: 'checkbox', id: 'aceitar-regras', onchange: function (ev) { botaoComecar.disabled = !ev.target.checked; } });
      function listaRegras(titulo, itens) {
        return el('div', { class: 'bloco-regras' }, [
          el('p', { class: 'etapa', texto: titulo }),
          el('ul', { class: 'regras' }, itens.map(function (t) { return el('li', { texto: t }); }))
        ]);
      }
      zona.innerHTML = '';
      zona.appendChild(el('div', { class: 'cartao confirmar' }, [
        el('p', { class: 'etapa', texto: ((eventoDe(eq.evento) || {}).nome ? eventoDe(eq.evento).nome + ' · ' : '') + 'Vocês são' }),
        el('p', { class: 'quem', texto: eq.turma }),
        el('p', { class: 'quem-grupo', texto: 'Grupo ' + eq.grupo }),
        el('p', { class: 'instrucao', texto: 'Se não são vocês, chamem o professor.' }),
        listaRegras('Segurança', R.seguranca),
        listaRegras('Comportamento', R.conduta),
        listaRegras('Jogo', [
          'Têm ' + ((eventoDe(eq.evento) || {}).tempoLimiteMinutos || DADOS.tempoLimiteMinutos || 60) + ' minutos.',
          'Os problemas resolvem-se na base e o tablet fica sempre na base. À cache levam só a folha do grupo e o lápis.',
          'Nada de calculadoras, telemóveis ou IA. Contas em papel.',
          'Sair desta página a meio de um problema dá +' + Math.round((DADOS.penalizacaoSaidaSegundos || 0) / 60) + ' minutos.'
        ]),
        el('p', { class: 'instrucao' }, ['Regras completas: ', el('a', { href: 'termos.html', target: '_blank', rel: 'noopener', texto: 'termos de utilização' }), '.']),
        el('label', { class: 'aceitar', for: 'aceitar-regras' }, [aceitar, ' Lemos as regras em grupo e vamos cumpri-las.']),
        el('div', { class: 'opcoes' }, [
          el('button', { type: 'button', class: 'secundario', onclick: function () { zona.innerHTML = ''; zona.appendChild(form); codigo.value = ''; codigo.focus(); }, texto: 'Voltar' }),
          botaoComecar
        ])
      ]));
    }

    var form = el('form', {
      class: 'cartao',
      onsubmit: function (ev) {
        ev.preventDefault();
        if (!codigo.value.trim()) return mostrar(erro, 'Escrevam o código que o professor vos deu.');
        var botao = form.querySelector('button');
        botao.disabled = true;
        procurarGrupo(codigo.value).then(function (g) {
          botao.disabled = false;
          if (!g) { codigo.select(); return mostrar(erro, 'Este código não existe. Confirmem as letras e os números no papel.'); }
          confirmar(Object.assign({ codigo: normalizar(codigo.value) }, g));
        });
      }
    }, [
      el('label', { for: 'codigo', texto: 'Código de entrada' }),
      el('div', { class: 'linha-resposta' }, [codigo, el('button', { type: 'submit', class: 'principal', texto: 'Entrar' })]),
      erro
    ]);
    zona.appendChild(form);

    app.appendChild(el('div', { class: 'inicio' }, [
      el('h1', { texto: DADOS.titulo }),
      el('p', { class: 'acess-inicio' }, [el('button', { type: 'button', class: 'secundario', onclick: A.painel, texto: 'Aa · Acessibilidade' })]),
      el('p', { class: 'intro', texto: 'Resolvam cada problema para descobrir onde está escondida a próxima cache. Dentro de cada cache há um código: escrevam-no aqui para continuar.' }),
      zona
    ]));
    codigo.focus();
  }

  function mostrar(no, texto) {
    no.textContent = texto;
    no.classList.remove('abanar');
    void no.offsetWidth;
    no.classList.add('abanar');
  }

  var refsBloqueio = null;

  function atualizarBloqueio() {
    if (!refsBloqueio) return;
    var falta = Math.ceil((estado.bloqueadoAte - agora()) / 1000);
    if (falta > 0) {
      refsBloqueio.campo.disabled = true;
      refsBloqueio.botao.disabled = true;
      refsBloqueio.aviso.textContent = 'Muitas respostas erradas. Pensem com calma… ' + falta + ' s';
      refsBloqueio.aviso.className = 'aviso';
    } else if (refsBloqueio.campo.disabled) {
      refsBloqueio.campo.disabled = false;
      refsBloqueio.botao.disabled = false;
      refsBloqueio.aviso.textContent = '';
      refsBloqueio.campo.focus();
    }
  }

  function ecraProblema() {
    var p = problemaAtual();
    if (!p || p.falta) {
      app.appendChild(el('main', { class: 'cartao' }, [
        el('p', { class: 'erro', texto: 'Falta o problema ' + (passoAtual().posicao + 1) + ' do ' + estado.ano + 'º ano. Chamem o professor.' })
      ]));
      return;
    }
    var numerica = !!p.numerica;
    var campo = el('input', {
      type: 'text',
      class: 'resposta',
      inputmode: numerica ? 'decimal' : 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': 'Resposta',
      placeholder: 'Resposta'
    });
    var botao = el('button', { type: 'submit', class: 'principal', texto: 'Verificar' });
    var aviso = el('p', { class: 'erro', role: 'alert' });
    refsBloqueio = { campo: campo, botao: botao, aviso: aviso };

    var zonaDica = el('div', { class: 'zona-dica' });
    function desenharDica() {
      zonaDica.innerHTML = '';
      if (!p.dica) return;
      if (estado.dicaVista) {
        zonaDica.appendChild(el('p', { class: 'dica', 'aria-label': 'Dica: ' + A.fala(p.dica), texto: '💡 ' + p.dica }));
      } else {
        zonaDica.appendChild(el('button', {
          type: 'button',
          class: 'secundario',
          onclick: function () {
            estado.dicaVista = true;
            estado.dicas++;
            guardar();
            desenharDica();
            A.falarSeAtivo('Dica: ' + p.dica);
          },
          texto: 'Pedir dica (+' + Math.round(DADOS.penalizacaoDicaSegundos / 60) + ' min)'
        }));
      }
    }
    desenharDica();

    app.appendChild(el('main', { class: 'cartao' }, [
      el('h2', { class: 'etapa', tabindex: '-1', texto: 'Problema ' + (estado.passo + 1) + ' de ' + estado.passos.length }),
      el('p', { class: 'enunciado', 'aria-hidden': 'true', texto: p.enunciado }),
      el('p', { class: 'so-leitor', texto: A.fala(p.enunciado) }),
      A.temVoz ? el('button', { type: 'button', class: 'botao-ouvir', onclick: function () { A.falar(p.enunciado); }, texto: 'Ouvir o problema' }) : null,
      el('form', {
        class: 'linha-resposta',
        onsubmit: function (ev) {
          ev.preventDefault();
          if (agora() < estado.bloqueadoAte || botao.disabled || !campo.value.trim()) return;
          botao.disabled = true;
          botao.textContent = 'A verificar…';
          abrirComResposta(p, passoAtual().posicao, campo.value).then(function (local) {
            botao.disabled = false;
            botao.textContent = 'Verificar';
            if (local) {
              estado.revelado = local;
              estado.errosSeguidos = 0;
              avancar();
            } else {
              registarErro();
              campo.select();
              mostrar(aviso, 'Ainda não. Verifiquem as contas.');
              A.falarSeAtivo('Ainda não. Verifiquem as contas.');
              atualizarBloqueio();
            }
          });
        }
      }, [campo, botao]),
      aviso,
      zonaDica
    ]));
    atualizarBloqueio();
    if (!campo.disabled) campo.focus();
  }

  function ecraProcurar() {
    refsBloqueio = null;
    var cache = estado.revelado || {};
    var campo = el('input', {
      type: 'text',
      class: 'resposta',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      'aria-label': 'Código da cache',
      placeholder: 'Código'
    });
    var aviso = el('p', { class: 'erro', role: 'alert' });

    var textoLocal = 'Resposta certa! A cache está em ' + (cache.coordenada ? cache.coordenada + '. ' : '') + (cache.texto || '');
    var filhos = [
      el('h2', { class: 'certo', tabindex: '-1', texto: '✔ Resposta certa!' }),
      el('p', { class: 'etapa', texto: 'A cache está em' })
    ];
    if (cache.coordenada) filhos.push(el('p', { class: 'coordenada', texto: cache.coordenada }));
    if (cache.texto) filhos.push(el('p', { class: 'local', texto: cache.texto }));
    if (cache.imagem) filhos.push(el('img', { class: 'imagem-local', src: cache.imagem, alt: 'Pista do local' }));
    if (DADOS.mapa && cache.coordenada) {
      filhos.push(el('details', { class: 'mapa' }, [
        el('summary', { texto: 'Ver mapa da escola' }),
        el('img', { src: DADOS.mapa, alt: 'Mapa da escola' })
      ]));
    }
    filhos.push(
      A.temVoz ? el('button', { type: 'button', class: 'botao-ouvir', onclick: function () { A.falar(textoLocal); }, texto: 'Ouvir onde está a cache' }) : null,
      el('p', { class: 'instrucao', texto: 'Copiem este local para a folha do grupo e vão todos à cache. Copiem o código do cartão para a folha, deixem o cartão onde estava e voltem à base para o escrever aqui.' }),
      el('form', {
        class: 'linha-resposta',
        onsubmit: function (ev) {
          ev.preventDefault();
          var botao = ev.target.querySelector('button');
          if (botao.disabled || !campo.value.trim()) return;
          botao.disabled = true;
          codigoDaCacheCerto(passoAtual().posicao, campo.value).then(function (certo) {
            botao.disabled = false;
            if (certo) return avancar();
            campo.select();
            mostrar(aviso, 'Esse código não é desta cache.');
            A.falarSeAtivo('Esse código não é desta cache.');
          });
        }
      }, [campo, el('button', { type: 'submit', class: 'principal', texto: 'Confirmar' })]),
      aviso
    );
    app.appendChild(el('main', { class: 'cartao' }, filhos));
  }

  function ecraFim() {
    refsBloqueio = null;
    var tempo = tempoDecorrido();
    var pen = segundosPenalizacao();
    var total = estado.passos.length;
    app.appendChild(el('main', { class: 'cartao fim' }, [
      el('p', { class: 'trofeu', texto: estado.esgotado ? '⏰' : '🏆' }),
      el('h2', { texto: estado.esgotado ? 'Acabou o tempo!' : 'Parabéns, ' + estado.equipa + '!' }),
      el('p', { texto: estado.esgotado ? 'Voltem à base e mostrem este ecrã ao professor.' : DADOS.mensagemFinal }),
      el('table', { class: 'resumo' }, [
        linha('Turma', estado.turma),
        linha('Grupo', String(estado.grupo)),
        linha('Caches encontradas', estado.passo + ' de ' + total, true),
        linha('Tempo', formatarTempo(tempo)),
        linha('Respostas erradas', estado.erros + ' (+' + formatarTempo(estado.erros * DADOS.penalizacaoErroSegundos) + ')'),
        linha('Dicas', estado.dicas + ' (+' + formatarTempo(estado.dicas * DADOS.penalizacaoDicaSegundos) + ')'),
        saidasPenalizadas(estado.saidas) ? linha('Saídas da app', saidasPenalizadas(estado.saidas) + ' (+' +
          formatarTempo(saidasPenalizadas(estado.saidas) * (DADOS.penalizacaoSaidaSegundos || 0)) + ')') : null,
        controlo().extraSegundos ? linha('Ajuste do organizador', (controlo().extraSegundos > 0 ? '+' : '−') +
          formatarTempo(Math.abs(controlo().extraSegundos))) : null,
        linha('Tempo final', formatarTempo(tempo + pen), true)
      ])
    ]));
  }

  function linha(a, b, destaque) {
    return el('tr', destaque ? { class: 'destaque' } : null, [el('th', { texto: a }), el('td', { texto: b })]);
  }

  function painelProfessor() {
    var fundo = el('div', { class: 'modal-fundo' });
    var pin = el('input', { type: 'password', inputmode: 'numeric', class: 'resposta', 'aria-label': 'PIN', placeholder: 'PIN' });
    var aviso = el('p', { class: 'erro', role: 'alert' });
    var caixa = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });

    function fechar() { fundo.remove(); }

    function opcoes() {
      caixa.innerHTML = '';
      var acoes = [el('h2', { texto: 'Professor' })];
      if (estado.fase !== 'fim' && !(problemaAtual() || {}).falta) {
        acoes.push(el('button', {
          type: 'button', class: 'secundario',
          onclick: function () {
            if (estado.fase !== 'problema') { fechar(); return avancar(); }
            Cripto.decifrarCom(chaveProfessor, problemaAtual().professor).then(function (t) {
              fechar();
              if (!t) return;
              estado.revelado = JSON.parse(t);
              avancar();
            });
          },
          texto: estado.fase === 'problema' ? 'Mostrar o local desta cache' : 'Dar esta cache como encontrada'
        }));
      }
      acoes.push(
        el('button', {
          type: 'button', class: 'perigo',
          onclick: function (ev) {
            var b = ev.currentTarget;
            if (b.dataset.confirmar) { fechar(); apagar(); desenhar(); return; }
            b.dataset.confirmar = '1';
            b.textContent = 'Tocar outra vez para apagar o progresso';
          },
          texto: 'Reiniciar tablet'
        }),
        el('button', { type: 'button', class: 'secundario', onclick: fechar, texto: 'Fechar' })
      );
      acoes.forEach(function (a) { caixa.appendChild(a); });
    }

    caixa.appendChild(el('h2', { texto: 'Professor' }));
    caixa.appendChild(el('form', {
      class: 'linha-resposta',
      onsubmit: function (ev) {
        ev.preventDefault();
        aviso.textContent = 'A verificar…';
        Cripto.chave(pin.value, DADOS.sal, 'professor', IT.professor).then(function (k) {
          return Cripto.decifrarCom(k, DADOS.verificacaoProfessor).then(function (t) {
            if (t === 'ok') { chaveProfessor = k; aviso.textContent = ''; opcoes(); }
            else { pin.select(); mostrar(aviso, 'PIN errado.'); }
          });
        });
      }
    }, [pin, el('button', { type: 'submit', class: 'principal', texto: 'Entrar' })]));
    caixa.appendChild(aviso);
    caixa.appendChild(el('button', { type: 'button', class: 'secundario', onclick: fechar, texto: 'Cancelar' }));

    fundo.appendChild(caixa);
    fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fechar(); });
    document.body.appendChild(fundo);
    pin.focus();
  }

  // Exposto para testes.
  window.Geocaching = {
    percursoGrupo: percursoGrupo,
    penalizacao: penalizacao
  };

  if (app) {
    document.addEventListener('visibilitychange', function () {
      if (!estado) return;
      if (document.hidden) {
        if (aResolver()) { estado.saidaInicio = agora(); guardar(); }
      } else {
        registarRegresso();
        manterEcraLigado();
        desenhar();
      }
    });
    // Se o tablet fechou a página enquanto estavam fora, conta na mesma.
    registarRegresso();
    ouvirControlo();
    manterEcraLigado();
    setInterval(publicar, 30000);
    desenhar();
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();

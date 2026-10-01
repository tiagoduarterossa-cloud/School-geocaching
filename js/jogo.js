(function () {
  'use strict';

  var DADOS = window.JOGO;
  var CHAVE = 'geocaching-escola-v3';
  var app = document.getElementById('app');
  var estado = carregar();
  var temporizador = null;

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
  }

  function apagar() {
    try {
      localStorage.removeItem(CHAVE);
    } catch (e) { /* ignorar */ }
    estado = null;
  }

  // ---------- respostas ----------

  function normalizar(s) {
    return String(s)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .replace(/^[a-z]=/, '');
  }

  // Devolve o valor numérico de "12", "12.5", "3/8", "36cm²", "30€"; ou null.
  function paraNumero(s) {
    var m = /^(-?\d+(?:\.\d+)?)(?:\/(-?\d+(?:\.\d+)?))?([^\d]*)$/.exec(s);
    if (!m) return null;
    var n = parseFloat(m[1]);
    if (m[2] !== undefined) {
      var d = parseFloat(m[2]);
      if (d === 0) return null;
      n = n / d;
    }
    return n;
  }

  function respostaCerta(dada, esperada) {
    var lista = Array.isArray(esperada) ? esperada : [esperada];
    var a = normalizar(dada);
    if (!a) return false;
    var na = paraNumero(a);
    return lista.some(function (r) {
      var b = normalizar(r);
      var nb = paraNumero(b);
      if (na !== null && nb !== null) return Math.abs(na - nb) < 1e-6;
      return a === b;
    });
  }

  // ---------- jogo ----------

  // Palavras para gerar códigos. Os de entrada não dizem a turma, para
  // ninguém adivinhar o código de outro grupo.
  var ANIMAIS = ['LINCE', 'LONTRA', 'TEXUGO', 'RAPOSA', 'GAMO', 'LOBO', 'FALCAO', 'CORUJA',
    'GARCA', 'CEGONHA', 'ABUTRE', 'MILHAFRE', 'SALMAO', 'TRUTA', 'ENGUIA', 'POLVO', 'LULA',
    'GOLFINHO', 'ORCA', 'FOCA', 'LAGARTO', 'SAPO', 'TRITAO', 'MORCEGO', 'ESQUILO', 'OURICO',
    'TOUPEIRA', 'JAVALI', 'VEADO', 'GAIVOTA', 'PARDAL', 'MELRO', 'ANDORINHA', 'POMBO', 'PEGA',
    'CORVO', 'CAVALO', 'BURRO', 'CABRA', 'OVELHA'];
  var CIENCIA = ['ATOMO', 'CELULA', 'ORBITA', 'PRISMA', 'VETOR', 'ELIPSE', 'FRACAO', 'CUBO',
    'ANGULO', 'NEURONIO', 'PLANETA', 'COMETA', 'CRISTAL', 'MAGNETE', 'ENERGIA', 'FOTAO',
    'PROTAO', 'ELETRAO', 'GALAXIA', 'ECLIPSE', 'VULCAO', 'FOSSIL', 'MOLECULA', 'ENZIMA',
    'POLIGONO', 'ESFERA', 'CILINDRO', 'CONE', 'PIRAMIDE', 'RAIO', 'DIAMETRO', 'VERTICE'];

  function hash(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function gerarCodigo(palavras, semente, usados) {
    var h = hash(semente);
    var codigo;
    do {
      codigo = palavras[h % palavras.length] + (10 + Math.floor(h / palavras.length) % 90);
      h = (h + 7919) >>> 0;
    } while (usados[codigo]);
    usados[codigo] = true;
    return codigo;
  }

  // Todos os grupos com o seu código de entrada. Os códigos são sempre os
  // mesmos para os mesmos dados, e acrescentar turmas no fim da lista não muda
  // os códigos das que já existiam.
  function listaGrupos() {
    var usados = {};
    var lista = [];
    DADOS.turmas.forEach(function (t, ti) {
      for (var g = 1; g <= (t.grupos || 1); g++) {
        lista.push({
          codigo: gerarCodigo(ANIMAIS, 'entrada|' + t.turma + '|' + g, usados),
          turmaIndice: ti,
          turma: t.turma,
          ano: String(t.ano),
          grupo: g
        });
      }
    });
    return lista;
  }

  // Código escondido numa cache, diferente para cada turma.
  function codigosCache(indiceCache) {
    var c = DADOS.caches[indiceCache];
    var usados = {};
    var codigos = {};
    DADOS.turmas.forEach(function (t) {
      codigos[t.turma] = c.codigo || gerarCodigo(CIENCIA, 'cache|' + indiceCache + '|' + t.turma, usados);
    });
    return codigos;
  }

  // A versão do problema que cabe a esta turma: a 1ª turma do ano recebe a
  // 1ª versão, a 2ª turma a 2ª versão, e assim por diante.
  function versaoProblema(ano, posicao, turma) {
    var lista = (DADOS.problemas[ano] || [])[posicao];
    if (!lista) return null;
    var versoes = Array.isArray(lista) ? lista : [lista];
    var turmasDoAno = DADOS.turmas
      .filter(function (t) { return String(t.ano) === String(ano); })
      .map(function (t) { return t.turma; });
    var i = Math.max(0, turmasDoAno.indexOf(turma));
    return versoes[i % versoes.length];
  }

  // Os grupos da mesma turma fazem as mesmas caches, cada um a começar numa
  // diferente e o mais afastado possível dos outros (com 2 grupos e 5 caches,
  // um começa no problema 1 e o outro no 3).
  function percursoGrupo(grupo) {
    var turma = DADOS.turmas[grupo.turmaIndice];
    var caches = turma.caches;
    var inicio = Math.floor((grupo.grupo - 1) * caches.length / (turma.grupos || 1));
    var passos = [];
    for (var i = 0; i < caches.length; i++) {
      var pos = (inicio + i) % caches.length;
      passos.push({ posicao: pos, cache: caches[pos] - 1 });
    }
    return passos;
  }

  function procurarGrupo(codigo) {
    var c = normalizar(codigo);
    var grupos = listaGrupos();
    for (var i = 0; i < grupos.length; i++) {
      if (normalizar(grupos[i].codigo) === c) return grupos[i];
    }
    return null;
  }

  function nomeEquipa(g) {
    return g.turma + ' · Grupo ' + g.grupo;
  }

  function passoAtual() {
    return estado.passos[estado.passo];
  }

  function cacheAtual() {
    return DADOS.caches[passoAtual().cache];
  }

  function agora() {
    return Date.now();
  }

  function segundosPenalizacao() {
    return estado.dicas * DADOS.penalizacaoDicaSegundos + estado.erros * DADOS.penalizacaoErroSegundos;
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
    return (DADOS.tempoLimiteMinutos || 0) * 60;
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

  function comecar(g) {
    estado = {
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
      bloqueadoAte: 0
    };
    guardar();
    desenhar();
  }

  function avancar() {
    if (estado.fase === 'problema') {
      estado.fase = 'procurar';
    } else if (estado.fase === 'procurar') {
      estado.passo++;
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
    if (estado.fase === 'problema') ecraProblema();
    else if (estado.fase === 'procurar') ecraProcurar();
    else ecraFim();
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
      zona.innerHTML = '';
      zona.appendChild(el('div', { class: 'cartao confirmar' }, [
        el('p', { class: 'etapa', texto: 'Vocês são' }),
        el('p', { class: 'quem', texto: eq.turma }),
        el('p', { class: 'quem-grupo', texto: 'Grupo ' + eq.grupo }),
        el('p', { class: 'instrucao', texto: 'Está certo? Se não, chamem o professor.' }),
        el('div', { class: 'opcoes' }, [
          el('button', { type: 'button', class: 'secundario', onclick: function () { zona.innerHTML = ''; zona.appendChild(form); codigo.value = ''; codigo.focus(); }, texto: 'Voltar' }),
          el('button', { type: 'button', class: 'principal', onclick: function () { comecar(eq); }, texto: 'Começar' })
        ])
      ]));
    }

    var form = el('form', {
      class: 'cartao',
      onsubmit: function (ev) {
        ev.preventDefault();
        if (!codigo.value.trim()) return mostrar(erro, 'Escrevam o código que o professor vos deu.');
        var grupo = procurarGrupo(codigo.value);
        if (!grupo) { codigo.select(); return mostrar(erro, 'Este código não existe. Confirmem as letras e os números no papel.'); }
        confirmar(grupo);
      }
    }, [
      el('label', { for: 'codigo', texto: 'Código de entrada' }),
      el('div', { class: 'linha-resposta' }, [codigo, el('button', { type: 'submit', class: 'principal', texto: 'Entrar' })]),
      erro
    ]);
    zona.appendChild(form);

    app.appendChild(el('div', { class: 'inicio' }, [
      el('h1', { texto: DADOS.titulo }),
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
    var p = versaoProblema(estado.ano, passoAtual().posicao, estado.turma);
    if (!p) {
      app.appendChild(el('main', { class: 'cartao' }, [
        el('p', { class: 'erro', texto: 'Falta o problema ' + (passoAtual().posicao + 1) + ' do ' + estado.ano + 'º ano. Chamem o professor.' })
      ]));
      return;
    }
    var numerica = paraNumero(normalizar(Array.isArray(p.resposta) ? p.resposta[0] : p.resposta)) !== null;
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
        zonaDica.appendChild(el('p', { class: 'dica', texto: '💡 ' + p.dica }));
      } else {
        zonaDica.appendChild(el('button', {
          type: 'button',
          class: 'secundario',
          onclick: function () {
            estado.dicaVista = true;
            estado.dicas++;
            guardar();
            desenharDica();
          },
          texto: 'Pedir dica (+' + Math.round(DADOS.penalizacaoDicaSegundos / 60) + ' min)'
        }));
      }
    }
    desenharDica();

    app.appendChild(el('main', { class: 'cartao' }, [
      el('p', { class: 'etapa', texto: 'Problema ' + (estado.passo + 1) }),
      el('p', { class: 'enunciado', texto: p.enunciado }),
      el('form', {
        class: 'linha-resposta',
        onsubmit: function (ev) {
          ev.preventDefault();
          if (agora() < estado.bloqueadoAte) return;
          if (respostaCerta(campo.value, p.resposta)) {
            estado.errosSeguidos = 0;
            avancar();
          } else {
            registarErro();
            campo.select();
            mostrar(aviso, 'Ainda não. Verifiquem as contas.');
            atualizarBloqueio();
          }
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
    var cache = cacheAtual();
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

    var filhos = [
      el('p', { class: 'certo', texto: '✔ Resposta certa!' }),
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
      el('p', { class: 'instrucao', texto: 'Quando encontrarem a cache, escrevam o código que está lá dentro.' }),
      el('form', {
        class: 'linha-resposta',
        onsubmit: function (ev) {
          ev.preventDefault();
          if (normalizar(campo.value) === normalizar(codigosCache(passoAtual().cache)[estado.turma])) {
            avancar();
          } else {
            campo.select();
            mostrar(aviso, 'Esse código não é desta cache.');
          }
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
      if (estado.fase !== 'fim') {
        acoes.push(el('button', {
          type: 'button', class: 'secundario',
          onclick: function () { fechar(); avancar(); },
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
        if (pin.value === String(DADOS.pinProfessor)) opcoes();
        else mostrar(aviso, 'PIN errado.');
      }
    }, [pin, el('button', { type: 'submit', class: 'principal', texto: 'Entrar' })]));
    caixa.appendChild(aviso);
    caixa.appendChild(el('button', { type: 'button', class: 'secundario', onclick: fechar, texto: 'Cancelar' }));

    fundo.appendChild(caixa);
    fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fechar(); });
    document.body.appendChild(fundo);
    pin.focus();
  }

  // Exposto para testes e para a página do professor.
  window.Geocaching = {
    respostaCerta: respostaCerta,
    normalizar: normalizar,
    listaGrupos: listaGrupos,
    percursoGrupo: percursoGrupo,
    versaoProblema: versaoProblema,
    codigosCache: codigosCache
  };

  if (app) desenhar();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();

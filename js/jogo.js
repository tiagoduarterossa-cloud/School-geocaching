(function () {
  'use strict';

  var DADOS = window.JOGO;
  var CHAVE = 'geocaching-escola-v2';
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

  // Cada equipa começa numa cache diferente (pela posição na lista de equipas,
  // ou pelo campo "inicio" se o professor o definir) e segue em roda.
  function ordemParaEquipa(indice) {
    var n = DADOS.caches.length;
    var eq = DADOS.equipas[indice];
    var inicio = eq && eq.inicio ? eq.inicio - 1 : indice;
    var ordem = [];
    for (var i = 0; i < n; i++) ordem.push((inicio + i) % n);
    return ordem;
  }

  function procurarEquipa(codigo) {
    var c = normalizar(codigo);
    for (var i = 0; i < DADOS.equipas.length; i++) {
      if (normalizar(DADOS.equipas[i].codigo) === c) return i;
    }
    return -1;
  }

  function nomeEquipa(eq) {
    return eq.turma + (eq.grupo ? ' · Grupo ' + eq.grupo : '');
  }

  function cacheAtual() {
    return DADOS.caches[estado.ordem[estado.passo]];
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

  function tempoDecorrido() {
    var fim = estado.fim || agora();
    return (fim - estado.inicio) / 1000;
  }

  function comecar(indice) {
    var eq = DADOS.equipas[indice];
    estado = {
      equipa: nomeEquipa(eq),
      turma: eq.turma,
      grupo: eq.grupo || '',
      ano: String(eq.ano),
      ordem: ordemParaEquipa(indice),
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
      if (estado.passo >= estado.ordem.length) {
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
    app.appendChild(cabecalho());
    if (estado.fase === 'problema') ecraProblema();
    else if (estado.fase === 'procurar') ecraProcurar();
    else ecraFim();
  }

  function cabecalho() {
    var relogio = el('span', { class: 'relogio', texto: formatarTempo(tempoDecorrido()) });
    if (!estado.fim) {
      temporizador = setInterval(function () {
        relogio.textContent = formatarTempo(tempoDecorrido());
        atualizarBloqueio();
      }, 1000);
    }
    var total = estado.ordem.length;
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

    function confirmar(indice) {
      var eq = DADOS.equipas[indice];
      zona.innerHTML = '';
      zona.appendChild(el('div', { class: 'cartao confirmar' }, [
        el('p', { class: 'etapa', texto: 'Vocês são' }),
        el('p', { class: 'quem', texto: eq.turma }),
        eq.grupo ? el('p', { class: 'quem-grupo', texto: 'Grupo ' + eq.grupo }) : null,
        el('p', { class: 'instrucao', texto: 'Está certo? Se não, chamem o professor.' }),
        el('div', { class: 'opcoes' }, [
          el('button', { type: 'button', class: 'secundario', onclick: function () { zona.innerHTML = ''; zona.appendChild(form); codigo.value = ''; codigo.focus(); }, texto: 'Voltar' }),
          el('button', { type: 'button', class: 'principal', onclick: function () { comecar(indice); }, texto: 'Começar' })
        ])
      ]));
    }

    var form = el('form', {
      class: 'cartao',
      onsubmit: function (ev) {
        ev.preventDefault();
        if (!codigo.value.trim()) return mostrar(erro, 'Escrevam o código que o professor vos deu.');
        var indice = procurarEquipa(codigo.value);
        if (indice < 0) { codigo.select(); return mostrar(erro, 'Este código não existe. Confirmem as letras no papel.'); }
        confirmar(indice);
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
    var cache = cacheAtual();
    var p = cache.problemas[estado.ano];
    if (!p) {
      app.appendChild(el('main', { class: 'cartao' }, [
        el('p', { class: 'erro', texto: 'Esta cache não tem problema para o ' + estado.ano + 'º ano. Chamem o professor.' })
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
    if (cache.local.coordenada) filhos.push(el('p', { class: 'coordenada', texto: cache.local.coordenada }));
    if (cache.local.texto) filhos.push(el('p', { class: 'local', texto: cache.local.texto }));
    if (cache.local.imagem) filhos.push(el('img', { class: 'imagem-local', src: cache.local.imagem, alt: 'Pista do local' }));
    if (DADOS.mapa && cache.local.coordenada) {
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
          if (normalizar(campo.value) === normalizar(cache.codigo)) {
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
    app.appendChild(el('main', { class: 'cartao fim' }, [
      el('p', { class: 'trofeu', texto: '🏆' }),
      el('h2', { texto: 'Parabéns, ' + estado.equipa + '!' }),
      el('p', { texto: DADOS.mensagemFinal }),
      el('table', { class: 'resumo' }, [
        linha('Turma', estado.turma),
        estado.grupo ? linha('Grupo', String(estado.grupo)) : null,
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
  window.Geocaching = { respostaCerta: respostaCerta, ordemParaEquipa: ordemParaEquipa, normalizar: normalizar };

  if (app) desenhar();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();

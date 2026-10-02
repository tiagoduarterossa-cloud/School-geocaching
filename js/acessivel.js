// Acessibilidade: leitura em voz alta, texto para leitores de ecrã, letra
// grande e alto contraste, e braille para os cartões impressos.
window.Acessivel = (function () {
  'use strict';

  var CHAVE = 'geocaching-acessibilidade';
  var prefs = ler();

  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; }
  }

  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch (e) { /* ignorar */ }
  }

  function aplicar() {
    document.documentElement.classList.toggle('grande', !!prefs.grande);
  }

  // ---------- matemática dita em voz alta ----------

  var DENOMINADORES = {
    2: ['meio', 'meios'], 3: ['terço', 'terços'], 4: ['quarto', 'quartos'], 5: ['quinto', 'quintos'],
    6: ['sexto', 'sextos'], 7: ['sétimo', 'sétimos'], 8: ['oitavo', 'oitavos'], 9: ['nono', 'nonos'],
    10: ['décimo', 'décimos'], 100: ['centésimo', 'centésimos'], 1000: ['milésimo', 'milésimos']
  };
  var SOBRESCRITOS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

  function fracao(n, d) {
    var num = parseInt(n, 10);
    var den = parseInt(d, 10);
    var nome = DENOMINADORES[den];
    var plural = Math.abs(num) !== 1;
    if (nome) return n + ' ' + nome[plural ? 1 : 0];
    return n + ' sobre ' + d;
  }

  function potencia(expoente) {
    var e = expoente.split('').map(function (c) { return SOBRESCRITOS[c]; }).join('');
    if (e === '2') return ' ao quadrado';
    if (e === '3') return ' ao cubo';
    return ' elevado a ' + e.replace('-', 'menos ');
  }

  // "3/4 × 2⁻³" → "3 quartos vezes 2 elevado a menos 3"
  function fala(texto) {
    return String(texto)
      .replace(/(\d+)\s*\/\s*(\d+)/g, function (_, n, d) { return fracao(n, d); })
      .replace(/([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, function (_, e) { return potencia(e); })
      .replace(/√\s*/g, 'raiz quadrada de ')
      .replace(/×/g, ' vezes ')
      .replace(/÷/g, ' a dividir por ')
      .replace(/(\d)\s*:\s*(\d)/g, '$1 a dividir por $2')
      .replace(/\s[−-]\s/g, ' menos ')
      .replace(/=/g, ' igual a ')
      .replace(/π/g, 'pi')
      .replace(/°/g, ' graus')
      .replace(/([.?!:])\s*\n+/g, '$1 ')
      .replace(/\s*\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------- voz ----------

  var temVoz = typeof window.speechSynthesis !== 'undefined';

  function vozPortuguesa() {
    var vozes = temVoz ? speechSynthesis.getVoices() : [];
    return vozes.filter(function (v) { return /^pt[-_]PT/i.test(v.lang); })[0] ||
      vozes.filter(function (v) { return /^pt/i.test(v.lang); })[0] || null;
  }

  function falar(texto) {
    if (!temVoz || !texto) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(fala(texto));
      u.lang = 'pt-PT';
      var v = vozPortuguesa();
      if (v) u.voice = v;
      u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) { /* sem voz */ }
  }

  // Lê sozinho só se a opção estiver ligada.
  function falarSeAtivo(texto) {
    if (prefs.voz) falar(texto);
  }

  // ---------- braille (para imprimir numa impressora braille ou escrever na Perkins) ----------

  var LETRAS = 'abcdefghijklmnopqrstuvwxyz';
  var BRAILLE = '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵';

  function braille(texto) {
    var saida = '';
    var emNumero = false;
    String(texto).toLowerCase().split('').forEach(function (c) {
      if (/\d/.test(c)) {
        if (!emNumero) { saida += '⠼'; emNumero = true; }
        // 1 a 9 e 0 escrevem-se com as letras a a j, depois do sinal de número
        saida += BRAILLE[LETRAS.indexOf('jabcdefghi'[parseInt(c, 10)])];
        return;
      }
      var i = LETRAS.indexOf(c);
      if (i >= 0) {
        if (emNumero && i < 10) saida += '⠰'; // letra a-j logo a seguir a algarismos
        saida += BRAILLE[i];
      } else {
        saida += c === ' ' ? ' ' : c;
      }
      emNumero = false;
    });
    return saida;
  }

  // ---------- painel de opções ----------

  function painel() {
    if (document.querySelector('.modal-fundo')) return;
    var fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    var caixa = document.createElement('div');
    caixa.className = 'modal';
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-modal', 'true');
    caixa.setAttribute('aria-labelledby', 'titulo-acess');

    function opcao(id, chave, texto, nota) {
      var l = document.createElement('label');
      l.className = 'aceitar';
      l.htmlFor = id;
      var c = document.createElement('input');
      c.type = 'checkbox';
      c.id = id;
      c.checked = !!prefs[chave];
      c.addEventListener('change', function () {
        prefs[chave] = c.checked;
        guardar();
        aplicar();
        if (chave === 'voz' && c.checked) falar('Leitura em voz alta ligada.');
      });
      l.appendChild(c);
      var t = document.createElement('span');
      t.textContent = ' ' + texto;
      l.appendChild(t);
      caixa.appendChild(l);
      if (nota) {
        var p = document.createElement('p');
        p.className = 'nota-acess';
        p.textContent = nota;
        caixa.appendChild(p);
      }
    }

    var h = document.createElement('h2');
    h.id = 'titulo-acess';
    h.textContent = 'Acessibilidade';
    caixa.appendChild(h);
    opcao('acess-grande', 'grande', 'Letra grande e alto contraste');
    if (temVoz) {
      opcao('acess-voz', 'voz', 'Ler em voz alta automaticamente',
        'Lê cada problema e cada local logo que aparecem. Se o tablet tiver o VoiceOver ou o TalkBack ligado, deixa esta opção desligada.');
    }
    var fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'principal';
    fechar.textContent = 'Fechar';
    fechar.addEventListener('click', function () { fundo.remove(); });
    caixa.appendChild(fechar);
    fundo.appendChild(caixa);
    fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fundo.remove(); });
    document.body.appendChild(fundo);
    caixa.querySelector('input').focus();
  }

  if (temVoz) {
    // Em alguns browsers as vozes só aparecem depois deste evento.
    speechSynthesis.onvoiceschanged = function () {};
  }
  if (typeof document !== 'undefined') aplicar();

  return {
    fala: fala,
    falar: falar,
    falarSeAtivo: falarSeAtivo,
    temVoz: temVoz,
    braille: braille,
    painel: painel
  };
})();

// Cifra e verificação de respostas sem as guardar em claro.
// Usado nos tablets, nas páginas do organizador e no script ferramentas/construir.js.
//
// - As respostas não estão em lado nenhum: a resposta certa é a chave que abre
//   o local da cache (AES-GCM com chave PBKDF2). Uma resposta errada não abre nada.
// - Os códigos (de entrada e das caches) só existem como resumos (PBKDF2).
// - O conteúdo completo do organizador está cifrado com a palavra-passe dele.
(function (raiz) {
  'use strict';

  var subtle = raiz.crypto && raiz.crypto.subtle;
  var codificar = new TextEncoder();
  var descodificar = new TextDecoder();

  // Iterações PBKDF2: tornam cada tentativa lenta para quem quiser adivinhar.
  var ITERACOES = {
    entrada: 20000,
    resposta: 50000,
    codigo: 50000,
    professor: 150000,
    organizador: 300000
  };

  function paraBase64(bytes) {
    var s = '';
    var b = new Uint8Array(bytes);
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }

  function deBase64(texto) {
    var s = atob(texto);
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }

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

  // Forma única de uma resposta: "3/8", "0,375" e "0.375 " dão todas "0.375".
  function canonica(s) {
    var n = normalizar(s);
    var num = paraNumero(n);
    return num !== null ? String(Number(num.toFixed(6))) : n;
  }

  function bitsDerivados(segredo, sal, contexto, iteracoes) {
    return subtle.importKey('raw', codificar.encode(segredo), 'PBKDF2', false, ['deriveBits', 'deriveKey'])
      .then(function (base) {
        return subtle.deriveBits(
          { name: 'PBKDF2', hash: 'SHA-256', salt: codificar.encode(sal + '|' + contexto), iterations: iteracoes },
          base, 256);
      });
  }

  function chave(segredo, sal, contexto, iteracoes) {
    return bitsDerivados(segredo, sal, contexto, iteracoes).then(function (bits) {
      return subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']);
    });
  }

  function cifrarCom(k, texto) {
    var iv = raiz.crypto.getRandomValues(new Uint8Array(12));
    return subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, codificar.encode(texto)).then(function (ct) {
      return { iv: paraBase64(iv), ct: paraBase64(ct) };
    });
  }

  // Devolve o texto, ou null se a chave não for a certa.
  function decifrarCom(k, caixa) {
    return subtle.decrypt({ name: 'AES-GCM', iv: deBase64(caixa.iv) }, k, deBase64(caixa.ct))
      .then(function (b) { return descodificar.decode(b); })
      .catch(function () { return null; });
  }

  function resumo(valor, sal, contexto, iteracoes) {
    return bitsDerivados(valor, sal, contexto, iteracoes).then(paraBase64);
  }

  function salAleatorio() {
    return paraBase64(raiz.crypto.getRandomValues(new Uint8Array(16)));
  }

  raiz.Cripto = {
    ITERACOES: ITERACOES,
    disponivel: !!subtle,
    normalizar: normalizar,
    paraNumero: paraNumero,
    canonica: canonica,
    chave: chave,
    cifrarCom: cifrarCom,
    decifrarCom: decifrarCom,
    resumo: resumo,
    salAleatorio: salAleatorio
  };
})(typeof window !== 'undefined' ? window : globalThis);

#!/usr/bin/env node
// Gera os ficheiros publicados a partir do conteúdo privado.
//
//   GEO_PASSE='palavra-passe' node ferramentas/construir.js
//       lê privado/conteudo.js e escreve:
//       - dados/jogo.js        (público: enunciados, dicas, locais cifrados com as respostas)
//       - dados/organizador.js (tudo, cifrado com a palavra-passe do organizador)
//
//   GEO_PASSE='palavra-passe' node ferramentas/construir.js --extrair
//       recupera privado/conteudo.js a partir de dados/organizador.js
//       (útil num computador novo; a pasta privado/ nunca vai para o GitHub).
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nodeCrypto = require('crypto');

require('../js/cripto.js');
require('../js/organizador.js');
const Cripto = globalThis.Cripto;
const Org = globalThis.Organizador;

const RAIZ = path.join(__dirname, '..');
const FONTE = path.join(RAIZ, 'privado', 'conteudo.js');
const PUBLICO = path.join(RAIZ, 'dados', 'jogo.js');
const ORGANIZADOR = path.join(RAIZ, 'dados', 'organizador.js');

const ANIMAIS = ['LINCE', 'LONTRA', 'TEXUGO', 'RAPOSA', 'GAMO', 'LOBO', 'FALCAO', 'CORUJA',
  'GARCA', 'CEGONHA', 'ABUTRE', 'MILHAFRE', 'SALMAO', 'TRUTA', 'ENGUIA', 'POLVO', 'LULA',
  'GOLFINHO', 'ORCA', 'FOCA', 'LAGARTO', 'SAPO', 'TRITAO', 'MORCEGO', 'ESQUILO', 'OURICO',
  'TOUPEIRA', 'JAVALI', 'VEADO', 'GAIVOTA', 'PARDAL', 'MELRO', 'ANDORINHA', 'POMBO', 'PEGA',
  'CORVO', 'CAVALO', 'BURRO', 'CABRA', 'OVELHA'];
const CIENCIA = ['ATOMO', 'CELULA', 'ORBITA', 'PRISMA', 'VETOR', 'ELIPSE', 'FRACAO', 'CUBO',
  'ANGULO', 'NEURONIO', 'PLANETA', 'COMETA', 'CRISTAL', 'MAGNETE', 'ENERGIA', 'FOTAO',
  'PROTAO', 'ELETRAO', 'GALAXIA', 'ECLIPSE', 'VULCAO', 'FOSSIL', 'MOLECULA', 'ENZIMA',
  'POLIGONO', 'ESFERA', 'CILINDRO', 'CONE', 'PIRAMIDE', 'RAIO', 'DIAMETRO', 'VERTICE'];

function falhar(msg) {
  console.error('Erro: ' + msg);
  process.exit(1);
}

function lerScript(ficheiro) {
  const janela = {};
  vm.runInNewContext(fs.readFileSync(ficheiro, 'utf8'), { window: janela });
  return janela;
}

// Códigos sempre iguais para a mesma semente e a mesma turma, impossíveis de
// calcular sem a semente (que só existe no conteúdo privado).
function gerarCodigo(semente, palavras, texto, usados) {
  for (let n = 0; ; n++) {
    const h = nodeCrypto.createHmac('sha256', semente).update(texto + '#' + n).digest();
    const codigo = palavras[h.readUInt32BE(0) % palavras.length] + (10 + h.readUInt32BE(4) % 90);
    if (!usados[codigo]) { usados[codigo] = true; return codigo; }
  }
}

async function construir(passe) {
  if (!fs.existsSync(FONTE)) falhar('não encontrei ' + FONTE + '. Usa --extrair para o recuperar.');
  const fonte = fs.readFileSync(FONTE, 'utf8');
  const C = lerScript(FONTE).JOGO;
  if (!C) falhar('privado/conteudo.js não define window.JOGO.');
  if (!Array.isArray(C.eventos) || !C.eventos.length) falhar('privado/conteudo.js não tem "eventos".');
  if (!/^\d{6,}$/.test(String(C.pinProfessor || ''))) falhar('"pinProfessor" tem de ter pelo menos 6 algarismos.');
  const ids = {};
  C.eventos.forEach((ev) => {
    if (!/^[a-z0-9-]+$/.test(ev.id || '')) falhar('o evento "' + (ev.nome || '?') + '" precisa de um "id" só com letras minúsculas, algarismos e hífenes.');
    if (ids[ev.id]) falhar('há dois eventos com o id "' + ev.id + '".');
    ids[ev.id] = true;
    if (!ev.semente || ev.semente.length < 16) falhar('o evento "' + ev.id + '" precisa de uma "semente" com pelo menos 16 caracteres.');
  });

  const sal = Cripto.salAleatorio();
  const IT = Cripto.ITERACOES;
  const chaveProfessor = await Cripto.chave(String(C.pinProfessor), sal, 'professor', IT.professor);
  const avisos = [];
  // Os códigos de entrada são únicos entre todos os eventos: o código diz ao tablet qual é o evento.
  const usadosEntrada = {};
  const privados = [];
  const eventosPublicos = [];
  const entradasPublicas = [];

  for (const ev of C.eventos) {
    const entradas = [];
    ev.turmas.forEach((t, ti) => {
      for (let g = 1; g <= (t.grupos || 1); g++) {
        entradas.push({
          codigo: gerarCodigo(ev.semente, ANIMAIS, 'entrada|' + t.turma + '|' + g, usadosEntrada),
          turmaIndice: ti, turma: t.turma, ano: String(t.ano), grupo: g
        });
      }
    });
    const codigosCache = ev.caches.map((c, i) => {
      const usados = {};
      const porTurma = {};
      ev.turmas.forEach((t) => {
        porTurma[t.turma] = c.codigo || gerarCodigo(ev.semente, CIENCIA, 'cache|' + i + '|' + t.turma, usados);
      });
      return porTurma;
    });

    const percursos = {};
    for (const t of ev.turmas) {
      percursos[t.turma] = [];
      for (let pos = 0; pos < t.caches.length; pos++) {
        const cache = ev.caches[t.caches[pos] - 1];
        const p = Org.versaoProblemaDe(ev, String(t.ano), pos, t.turma);
        const onde = ev.nome + ', ' + t.turma;
        if (!cache) { avisos.push(onde + ': a cache ' + t.caches[pos] + ' não existe.'); percursos[t.turma].push({ falta: true }); continue; }
        if (!p) { avisos.push(onde + ': falta o problema ' + (pos + 1) + ' do ' + t.ano + 'º ano.'); percursos[t.turma].push({ falta: true }); continue; }
        // O id do evento entra em todos os contextos: a mesma turma noutro evento tem outras chaves.
        const contexto = ev.id + '|' + t.turma + '|' + pos;
        const local = JSON.stringify({
          nome: cache.nome,
          coordenada: cache.coordenada || '',
          texto: cache.texto || '',
          imagem: cache.imagem || '',
          codigo: await Cripto.resumo(Cripto.normalizar(codigosCache[t.caches[pos] - 1][t.turma]), sal, 'cache|' + contexto, IT.codigo)
        });
        const respostas = [...new Set((Array.isArray(p.resposta) ? p.resposta : [p.resposta]).map(Cripto.canonica))];
        const fechos = [];
        for (const r of respostas) {
          const k = await Cripto.chave(r, sal, 'resposta|' + contexto, IT.resposta);
          fechos.push(await Cripto.cifrarCom(k, local));
        }
        percursos[t.turma].push({
          enunciado: p.enunciado,
          dica: p.dica || '',
          numerica: respostas.every((r) => Cripto.paraNumero(r) !== null),
          fechos,
          professor: await Cripto.cifrarCom(chaveProfessor, local)
        });
      }
    }
    for (const e of entradas) {
      entradasPublicas.push({
        h: await Cripto.resumo(Cripto.normalizar(e.codigo), sal, 'entrada', IT.entrada),
        evento: ev.id, turmaIndice: e.turmaIndice, turma: e.turma, ano: e.ano, grupo: e.grupo
      });
    }
    eventosPublicos.push({
      id: ev.id,
      nome: ev.nome,
      semana: ev.semana || null,
      tempoLimiteMinutos: ev.tempoLimiteMinutos || C.tempoLimiteMinutos,
      turmas: ev.turmas.map((t) => ({ turma: t.turma, ano: t.ano, grupos: t.grupos || 1, sessao: t.sessao || null })),
      percursos
    });
    privados.push({ id: ev.id, entradas, codigosCache });
  }

  const publico = {
    titulo: C.titulo,
    escola: C.escola || '',
    organizador: C.organizador || '',
    tempoLimiteMinutos: C.tempoLimiteMinutos,
    penalizacaoDicaSegundos: C.penalizacaoDicaSegundos,
    penalizacaoErroSegundos: C.penalizacaoErroSegundos,
    penalizacaoSaidaSegundos: C.penalizacaoSaidaSegundos,
    toleranciaSaidaSegundos: C.toleranciaSaidaSegundos,
    errosAteBloqueio: C.errosAteBloqueio,
    bloqueioSegundos: C.bloqueioSegundos,
    mapa: C.mapa || '',
    mensagemFinal: C.mensagemFinal,
    sincronizacao: C.sincronizacao || null,
    sal,
    verificacaoProfessor: await Cripto.cifrarCom(chaveProfessor, 'ok'),
    eventos: eventosPublicos,
    entradas: entradasPublicas
  };
  fs.writeFileSync(PUBLICO,
    '// Gerado por ferramentas/construir.js a partir de privado/conteudo.js. Não editar à mão.\n' +
    '// As respostas e os códigos não estão aqui: os locais estão cifrados com a resposta certa.\n' +
    'window.JOGO = ' + JSON.stringify(publico, null, 1) + ';\n');

  // ficheiro do organizador
  const salOrg = Cripto.salAleatorio();
  const kOrg = await Cripto.chave(passe, salOrg, 'organizador', IT.organizador);
  const caixa = await Cripto.cifrarCom(kOrg, JSON.stringify({ conteudo: C, eventos: privados, fonte }));
  fs.writeFileSync(ORGANIZADOR,
    '// Gerado por ferramentas/construir.js. Conteúdo completo do jogo, cifrado com a palavra-passe do organizador.\n' +
    'window.ORGANIZADOR = ' + JSON.stringify({ sal: salOrg, iteracoes: IT.organizador, iv: caixa.iv, ct: caixa.ct }) + ';\n');

  console.log('Escrito dados/jogo.js e dados/organizador.js:');
  C.eventos.forEach((ev, i) => console.log('  ' + ev.nome + ': ' + privados[i].entradas.length + ' grupos, ' + ev.caches.length + ' caches.'));
  avisos.forEach((a) => console.log('Aviso: ' + a));
}

async function extrair(passe) {
  if (!fs.existsSync(ORGANIZADOR)) falhar('não encontrei dados/organizador.js.');
  const o = lerScript(ORGANIZADOR).ORGANIZADOR;
  const k = await Cripto.chave(passe, o.sal, 'organizador', o.iteracoes);
  const texto = await Cripto.decifrarCom(k, o);
  if (!texto) falhar('palavra-passe errada.');
  fs.mkdirSync(path.dirname(FONTE), { recursive: true });
  if (fs.existsSync(FONTE)) falhar(FONTE + ' já existe; apaga-o primeiro se o queres substituir.');
  fs.writeFileSync(FONTE, JSON.parse(texto).fonte);
  console.log('Recuperado ' + FONTE + '.');
}

const passe = process.env.GEO_PASSE;
if (!passe || passe.length < 10) falhar('define GEO_PASSE com a palavra-passe do organizador (pelo menos 10 caracteres).');
(process.argv.includes('--extrair') ? extrair(passe) : construir(passe)).catch((e) => falhar(e.message));

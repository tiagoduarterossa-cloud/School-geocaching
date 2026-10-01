// Conteúdo do jogo. É o único ficheiro que precisa de ser editado.
//
// EQUIPAS: cada grupo recebe um código de entrada num papel. O código diz ao
// tablet a turma, o grupo e o ano (que escolhe os problemas). Os códigos não
// devem revelar a turma, para ninguém adivinhar o de outro grupo.
// Opcional: "inicio: 3" obriga esse grupo a começar na Cache 3. Sem isso,
// cada grupo começa numa cache diferente pela ordem desta lista.
//
// CACHES: cada cache é um sítio físico da escola. Para cada ano há um
// problema; a resposta certa revela onde está a cache. Dentro da cache está o
// "codigo" que o grupo escreve no tablet para provar que a encontrou.
//
// resposta: número, texto, ou lista de respostas aceites ['3/8', 0.375].
// Aceita vírgula ou ponto decimal, frações e ignora maiúsculas, acentos e
// unidades no fim (36 cm² conta como 36).

window.JOGO = {
  titulo: 'Geocaching Matemático',
  pinProfessor: '2468',
  penalizacaoDicaSegundos: 120,
  penalizacaoErroSegundos: 30,
  errosAteBloqueio: 3,
  bloqueioSegundos: 30,
  // Imagem opcional com o mapa da escola dividido em quadrícula (ex.: 'dados/mapa.jpg').
  mapa: '',
  mensagemFinal: 'Encontraram todas as caches! Voltem à base e mostrem este ecrã ao professor.',

  equipas: [
    { codigo: 'LINCE', turma: '7ºA', grupo: 1, ano: 7 },
    { codigo: 'LONTRA', turma: '7ºA', grupo: 2, ano: 7 },
    { codigo: 'TEXUGO', turma: '7ºA', grupo: 3, ano: 7 },
    { codigo: 'RAPOSA', turma: '7ºA', grupo: 4, ano: 7 },
    { codigo: 'GAMO', turma: '7ºB', grupo: 1, ano: 7 },
    { codigo: 'LOBO', turma: '7ºB', grupo: 2, ano: 7 },
    { codigo: 'FALCAO', turma: '7ºB', grupo: 3, ano: 7 },
    { codigo: 'CORUJA', turma: '7ºB', grupo: 4, ano: 7 },
    { codigo: 'GARCA', turma: '8ºA', grupo: 1, ano: 8 },
    { codigo: 'CEGONHA', turma: '8ºA', grupo: 2, ano: 8 },
    { codigo: 'ABUTRE', turma: '8ºA', grupo: 3, ano: 8 },
    { codigo: 'MILHAFRE', turma: '8ºA', grupo: 4, ano: 8 },
    { codigo: 'SALMAO', turma: '8ºB', grupo: 1, ano: 8 },
    { codigo: 'TRUTA', turma: '8ºB', grupo: 2, ano: 8 },
    { codigo: 'ENGUIA', turma: '8ºB', grupo: 3, ano: 8 },
    { codigo: 'POLVO', turma: '8ºB', grupo: 4, ano: 8 },
    { codigo: 'LULA', turma: '9ºA', grupo: 1, ano: 9 },
    { codigo: 'GOLFINHO', turma: '9ºA', grupo: 2, ano: 9 },
    { codigo: 'ORCA', turma: '9ºA', grupo: 3, ano: 9 },
    { codigo: 'FOCA', turma: '9ºA', grupo: 4, ano: 9 },
    { codigo: 'LAGARTO', turma: '9ºB', grupo: 1, ano: 9 },
    { codigo: 'SAPO', turma: '9ºB', grupo: 2, ano: 9 },
    { codigo: 'TRITAO', turma: '9ºB', grupo: 3, ano: 9 },
    { codigo: 'MORCEGO', turma: '9ºB', grupo: 4, ano: 9 }
  ],

  caches: [
    {
      nome: 'Cache 1',
      codigo: 'ANGULO',
      local: { coordenada: 'B2', texto: 'Biblioteca, debaixo da estante dos dicionários.' },
      problemas: {
        '7': {
          enunciado: 'Resolve a equação:\n3x − 7 = 2x + 5\nQual é o valor de x?',
          resposta: 12,
          dica: 'Passa os termos com x para um lado e os números para o outro.'
        },
        '8': {
          enunciado: 'Os catetos de um triângulo retângulo medem 6 cm e 8 cm.\nQuanto mede a hipotenusa, em cm?',
          resposta: 10,
          dica: 'Teorema de Pitágoras: a² + b² = c².'
        },
        '9': {
          enunciado: 'Resolve o sistema:\nx + y = 10\nx − y = 4\nQual é o valor de x?',
          resposta: 7,
          dica: 'Soma as duas equações: o y desaparece.'
        }
      }
    },
    {
      nome: 'Cache 2',
      codigo: 'PRISMA',
      local: { coordenada: 'D1', texto: 'Ginásio, atrás do banco sueco junto à porta.' },
      problemas: {
        '7': {
          enunciado: 'Calcula:\n2⁵ − 3²',
          resposta: 23,
          dica: '2⁵ = 2×2×2×2×2'
        },
        '8': {
          enunciado: 'Num saco há 3 bolas vermelhas e 5 bolas azuis.\nTiras uma bola ao acaso.\nQual é a probabilidade de ser vermelha? (escreve como fração)',
          resposta: '3/8',
          dica: 'Casos favoráveis a dividir por casos possíveis.'
        },
        '9': {
          enunciado: 'Qual é a solução positiva da equação\n3x² = 48 ?',
          resposta: 4,
          dica: 'Divide os dois lados por 3 primeiro.'
        }
      }
    },
    {
      nome: 'Cache 3',
      codigo: 'CUBO',
      local: { coordenada: 'C4', texto: 'Refeitório, no vaso grande ao lado da entrada.' },
      problemas: {
        '7': {
          enunciado: 'A média de 4 testes é 15.\nTrês das notas são 14, 16 e 13.\nQual é a quarta nota?',
          resposta: 17,
          dica: 'Se a média de 4 testes é 15, a soma das notas é 4 × 15.'
        },
        '8': {
          enunciado: 'Calcula:\n√144 + √81',
          resposta: 21,
          dica: 'Que número multiplicado por si próprio dá 144?'
        },
        '9': {
          enunciado: 'Lançam-se dois dados.\nQual é a probabilidade de a soma das faces ser 7? (fração)',
          resposta: '1/6',
          dica: 'Há 36 resultados possíveis. Conta os pares que somam 7.'
        }
      }
    },
    {
      nome: 'Cache 4',
      codigo: 'VETOR',
      local: { coordenada: 'A3', texto: 'Laboratório de Ciências, na prateleira das lupas.' },
      problemas: {
        '7': {
          enunciado: 'Quanto é 20% de 45?',
          resposta: 9,
          dica: '10% de 45 é 4,5.'
        },
        '8': {
          enunciado: 'Calcula:\n(2³)²',
          resposta: 64,
          dica: 'Potência de potência: multiplica os expoentes.'
        },
        '9': {
          enunciado: 'Sendo f(x) = 2x − 3,\nquanto é f(5)?',
          resposta: 7,
          dica: 'Substitui x por 5.'
        }
      }
    },
    {
      nome: 'Cache 5',
      codigo: 'ELIPSE',
      local: { coordenada: 'E2', texto: 'Polivalente, dentro do placard de cortiça (canto inferior).' },
      problemas: {
        '7': {
          enunciado: 'Descobre o número seguinte:\n3, 7, 11, 15, …',
          resposta: 19,
          dica: 'Quanto aumenta de um número para o seguinte?'
        },
        '8': {
          enunciado: 'Resolve:\n2x + 3 = 4x − 9\nQual é o valor de x?',
          resposta: 6,
          dica: 'Junta os x de um lado e os números do outro.'
        },
        '9': {
          enunciado: 'Escreve sem notação científica:\n2,5 × 10³',
          resposta: 2500,
          dica: 'Multiplicar por 10³ é multiplicar por 1000.'
        }
      }
    },
    {
      nome: 'Cache 6',
      codigo: 'FRACAO',
      local: { coordenada: 'C5', texto: 'Jardim, debaixo do banco de pedra junto à árvore grande.' },
      problemas: {
        '7': {
          enunciado: 'Dois ângulos são complementares.\nUm mede 35°. Quanto mede o outro?',
          resposta: 55,
          dica: 'Ângulos complementares somam 90°.'
        },
        '8': {
          enunciado: 'Qual é a área de um círculo de raio 10 cm?\n(usa π = 3,14)',
          resposta: 314,
          dica: 'Área = π × r²'
        },
        '9': {
          enunciado: 'Num triângulo retângulo, a hipotenusa mede 10 cm\ne o seno do ângulo α é 0,6.\nQuanto mede o cateto oposto a α, em cm?',
          resposta: 6,
          dica: 'sen α = cateto oposto ÷ hipotenusa.'
        }
      }
    }
  ]
};

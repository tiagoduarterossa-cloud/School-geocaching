// Conteúdo do jogo. É o único ficheiro que o professor precisa de editar.
//
// Cada cache é um sítio físico da escola. Para cada ciclo há um problema;
// a resposta certa revela onde está a cache. Dentro da cache está o "codigo"
// que a equipa escreve no tablet para provar que a encontrou.
//
// resposta: número, texto, ou lista de respostas aceites. Aceita vírgula ou
// ponto decimal, frações (3/8) e ignora maiúsculas, acentos e unidades no fim.

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

  caches: [
    {
      nome: 'Cache 1',
      codigo: 'ANGULO',
      local: { coordenada: 'B2', texto: 'Biblioteca, debaixo da estante dos dicionários.' },
      problemas: {
        '2': {
          enunciado: 'Um bolo foi dividido em 12 fatias iguais.\nA turma comeu 3/4 do bolo.\nQuantas fatias sobraram?',
          resposta: 3,
          dica: 'Primeiro descobre quanto é 3/4 de 12.'
        },
        '3': {
          enunciado: 'Resolve a equação:\n3x − 7 = 2x + 5\nQual é o valor de x?',
          resposta: 12,
          dica: 'Passa os termos com x para um lado e os números para o outro.'
        }
      }
    },
    {
      nome: 'Cache 2',
      codigo: 'PRISMA',
      local: { coordenada: 'D1', texto: 'Ginásio, atrás do banco sueco junto à porta.' },
      problemas: {
        '2': {
          enunciado: 'Qual é o mínimo múltiplo comum de 6 e 8?',
          resposta: 24,
          dica: 'Escreve os múltiplos de 8 e vê qual é o primeiro que também é múltiplo de 6.'
        },
        '3': {
          enunciado: 'Os catetos de um triângulo retângulo medem 6 cm e 8 cm.\nQuanto mede a hipotenusa, em cm?',
          resposta: 10,
          dica: 'Teorema de Pitágoras: a² + b² = c².'
        }
      }
    },
    {
      nome: 'Cache 3',
      codigo: 'CUBO',
      local: { coordenada: 'C4', texto: 'Refeitório, no vaso grande ao lado da entrada.' },
      problemas: {
        '2': {
          enunciado: 'Um retângulo tem 9 cm de comprimento e 4 cm de largura.\nQual é a sua área, em cm²?',
          resposta: 36,
          dica: 'Área do retângulo = comprimento × largura.'
        },
        '3': {
          enunciado: 'Calcula:\n2⁵ − 3²',
          resposta: 23,
          dica: '2⁵ = 2×2×2×2×2'
        }
      }
    },
    {
      nome: 'Cache 4',
      codigo: 'VETOR',
      local: { coordenada: 'A3', texto: 'Laboratório de Ciências, na prateleira das lupas.' },
      problemas: {
        '2': {
          enunciado: 'Uma camisola custa 40 €.\nEstá com 25% de desconto.\nQuanto custa agora, em euros?',
          resposta: 30,
          dica: '25% é o mesmo que um quarto.'
        },
        '3': {
          enunciado: 'Num saco há 3 bolas vermelhas e 5 bolas azuis.\nTiras uma bola ao acaso.\nQual é a probabilidade de ser vermelha? (escreve como fração)',
          resposta: '3/8',
          dica: 'Casos favoráveis a dividir por casos possíveis.'
        }
      }
    },
    {
      nome: 'Cache 5',
      codigo: 'ELIPSE',
      local: { coordenada: 'E2', texto: 'Polivalente, dentro do placard de cortiça (canto inferior).' },
      problemas: {
        '2': {
          enunciado: 'Calcula:\n7 + 3 × 5 − 4',
          resposta: 18,
          dica: 'A multiplicação faz-se antes da adição e da subtração.'
        },
        '3': {
          enunciado: 'A média de 4 testes é 15.\nTrês das notas são 14, 16 e 13.\nQual é a quarta nota?',
          resposta: 17,
          dica: 'Se a média de 4 testes é 15, a soma das notas é 4 × 15.'
        }
      }
    },
    {
      nome: 'Cache 6',
      codigo: 'FRACAO',
      local: { coordenada: 'C5', texto: 'Jardim, debaixo do banco de pedra junto à árvore grande.' },
      problemas: {
        '2': {
          enunciado: 'A soma dos ângulos internos de um triângulo é 180°.\nDois ângulos medem 50° e 70°.\nQuanto mede o terceiro ângulo?',
          resposta: 60,
          dica: 'Soma os dois ângulos que conheces e tira a 180.'
        },
        '3': {
          enunciado: 'Calcula:\n√144 + √81',
          resposta: 21,
          dica: 'Que número multiplicado por si próprio dá 144?'
        }
      }
    }
  ]
};

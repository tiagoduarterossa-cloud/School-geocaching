// Conteúdo do jogo. É o único ficheiro que precisa de ser editado.
// Depois de mudar alguma coisa, abre professor.html: se faltar algo, avisa no topo.
//
// CACHES: os sítios físicos da escola onde há uma caixa escondida. São fixas
// durante a semana inteira. Dentro de cada caixa vai o cartão impresso em
// professor.html, que tem um código diferente para cada turma.
//
// TURMAS: cada turma faz um percurso pelas caches da sua lista ("caches", pelo
// número da cache). Turmas que joguem à mesma hora devem ter caches diferentes.
// "grupos" é o número de grupos (e de tablets) da turma; 2 = turma a meio.
// "sessao" (opcional) é o dia e a hora em que a turma joga; aparece no convite. Cada grupo recebe um
// código de entrada, gerado automaticamente e impresso em professor.html.
//
// PROBLEMAS: para cada ano, um problema por cache do percurso (o problema 1
// revela a 1ª cache da lista da turma, o 2 a 2ª, etc.). Cada problema tem uma
// versão por turma desse ano: a 1ª versão vai para a 1ª turma desse ano na
// lista de turmas, a 2ª para a 2ª, e assim por diante. Assim as turmas não
// podem passar respostas umas às outras.
//
// resposta: número, texto, ou lista de respostas aceites ['3/8', 0.375].
// Aceita vírgula ou ponto decimal, frações, e ignora maiúsculas, acentos e
// unidades no fim (36 cm² conta como 36).

window.JOGO = {
  titulo: 'Geocaching Matemático',
  pinProfessor: '2468',
  penalizacaoDicaSegundos: 120,
  penalizacaoErroSegundos: 30,
  errosAteBloqueio: 3,
  bloqueioSegundos: 30,
  // Tempo de jogo de cada grupo, em minutos. Quando acaba, o tablet mostra o
  // resultado. 0 = sem limite.
  tempoLimiteMinutos: 60,
  // Sair da página a meio de um problema (para usar calculadora ou IA) dá
  // esta penalização. Saídas mais curtas do que a tolerância não contam.
  penalizacaoSaidaSegundos: 300,
  toleranciaSaidaSegundos: 3,
  // PIN da página do dono (dono.html). Diferente do PIN dos professores.
  pinDono: '13579',
  // Ligação em direto à página do dono. Ver README, secção "Acompanhar em direto".
  // url: endereço da Firebase Realtime Database; evento: um nome difícil de adivinhar.
  // Semana do evento: o ecrã dos quadros (quadro.html) faz a contagem decrescente até "inicio".
  semana: { nome: 'Semana das Ciências', inicio: '2026-11-16T08:15' },
  sincronizacao: {
    url: '',
    evento: 'semana-ciencias-2026'
  },
  // Imagem opcional com o mapa da escola dividido em quadrícula (ex.: 'dados/mapa.jpg').
  mapa: '',
  mensagemFinal: 'Encontraram todas as caches! Voltem à base e mostrem este ecrã ao professor.',

  caches: [
    { nome: 'Cache 1', coordenada: 'B2', texto: 'Biblioteca, debaixo da estante dos dicionários.' },
    { nome: 'Cache 2', coordenada: 'D1', texto: 'Ginásio, atrás do banco sueco junto à porta.' },
    { nome: 'Cache 3', coordenada: 'C4', texto: 'Refeitório, no vaso grande ao lado da entrada.' },
    { nome: 'Cache 4', coordenada: 'A3', texto: 'Laboratório de Ciências, na prateleira das lupas.' },
    { nome: 'Cache 5', coordenada: 'E2', texto: 'Polivalente, dentro do placard de cortiça (canto inferior).' },
    { nome: 'Cache 6', coordenada: 'C5', texto: 'Jardim, debaixo do banco de pedra junto à árvore grande.' },
    { nome: 'Cache 7', coordenada: 'A1', texto: 'Portaria, atrás do vaso à esquerda da porta.' },
    { nome: 'Cache 8', coordenada: 'B4', texto: 'Bar dos alunos, debaixo do balcão do lado da janela.' },
    { nome: 'Cache 9', coordenada: 'D3', texto: 'Pavilhão B, no extintor do primeiro andar (atrás da placa).' },
    { nome: 'Cache 10', coordenada: 'E4', texto: 'Campo de jogos, na base do cesto de basquetebol do lado norte.' },
    { nome: 'Cache 11', coordenada: 'A5', texto: 'Sala de Educação Visual, na caixa dos pincéis.' },
    { nome: 'Cache 12', coordenada: 'B1', texto: 'Reprografia, colado debaixo do balcão.' },
    { nome: 'Cache 13', coordenada: 'C2', texto: 'Auditório, na última fila, debaixo do banco do canto.' },
    { nome: 'Cache 14', coordenada: 'D5', texto: 'Horta pedagógica, dentro do regador grande.' },
    { nome: 'Cache 15', coordenada: 'E1', texto: 'Sala de estudo, atrás do quadro de cortiça.' }
  ],

  turmas: [
    { turma: '5ºA', ano: 5, grupos: 2, caches: [1, 2, 3, 4, 5], sessao: { dia: '2026-11-16', hora: '10:15' } },
    { turma: '5ºB', ano: 5, grupos: 2, caches: [6, 7, 8, 9, 10], sessao: { dia: '2026-11-16', hora: '11:55' } },
    { turma: '6ºA', ano: 6, grupos: 2, caches: [11, 12, 13, 14, 15], sessao: { dia: '2026-11-17', hora: '08:15' } },
    { turma: '6ºB', ano: 6, grupos: 2, caches: [1, 2, 3, 4, 5], sessao: { dia: '2026-11-17', hora: '10:15' } },
    { turma: '7ºA', ano: 7, grupos: 2, caches: [6, 7, 8, 9, 10], sessao: { dia: '2026-11-18', hora: '08:15' } },
    { turma: '7ºB', ano: 7, grupos: 2, caches: [11, 12, 13, 14, 15], sessao: { dia: '2026-11-18', hora: '10:15' } },
    { turma: '8ºA', ano: 8, grupos: 2, caches: [1, 3, 5, 7, 9], sessao: { dia: '2026-11-19', hora: '10:15' } },
    { turma: '8ºB', ano: 8, grupos: 2, caches: [2, 4, 6, 8, 10], sessao: { dia: '2026-11-19', hora: '11:55' } },
    { turma: '9ºA', ano: 9, grupos: 2, caches: [11, 13, 15, 2, 4], sessao: { dia: '2026-11-20', hora: '08:15' } },
    { turma: '9ºB', ano: 9, grupos: 2, caches: [12, 14, 1, 3, 5], sessao: { dia: '2026-11-20', hora: '10:15' } }
  ],

  problemas: {
    '5': [
      // Problema 1
      [
        { enunciado: 'Um bolo foi dividido em 12 fatias iguais.\nA turma comeu 3/4 do bolo.\nQuantas fatias sobraram?', resposta: 3, dica: 'Primeiro descobre quanto é 3/4 de 12.' },
        { enunciado: 'Uma pizza foi dividida em 20 fatias iguais.\nA turma comeu 3/5 da pizza.\nQuantas fatias sobraram?', resposta: 8, dica: 'Primeiro descobre quanto é 3/5 de 20.' }
      ],
      // Problema 2
      [
        { enunciado: 'Qual é o mínimo múltiplo comum de 6 e 8?', resposta: 24, dica: 'Escreve os múltiplos de 8 e vê qual é o primeiro que também é múltiplo de 6.' },
        { enunciado: 'Qual é o mínimo múltiplo comum de 4 e 10?', resposta: 20, dica: 'Escreve os múltiplos de 10 e vê qual é o primeiro que também é múltiplo de 4.' }
      ],
      // Problema 3
      [
        { enunciado: 'Um retângulo tem 9 cm de comprimento e 4 cm de largura.\nQual é a sua área, em cm²?', resposta: 36, dica: 'Área do retângulo = comprimento × largura.' },
        { enunciado: 'Um retângulo tem 7 cm de comprimento e 6 cm de largura.\nQual é a sua área, em cm²?', resposta: 42, dica: 'Área do retângulo = comprimento × largura.' }
      ],
      // Problema 4
      [
        { enunciado: 'Calcula:\n7 + 3 × 5 − 4', resposta: 18, dica: 'A multiplicação faz-se antes da adição e da subtração.' },
        { enunciado: 'Calcula:\n9 + 4 × 6 − 5', resposta: 28, dica: 'A multiplicação faz-se antes da adição e da subtração.' }
      ],
      // Problema 5
      [
        { enunciado: 'A soma dos ângulos internos de um triângulo é 180°.\nDois ângulos medem 50° e 70°.\nQuanto mede o terceiro?', resposta: 60, dica: 'Soma os dois ângulos que conheces e tira a 180.' },
        { enunciado: 'A soma dos ângulos internos de um triângulo é 180°.\nDois ângulos medem 45° e 85°.\nQuanto mede o terceiro?', resposta: 50, dica: 'Soma os dois ângulos que conheces e tira a 180.' }
      ]
    ],
    '6': [
      // Problema 1
      [
        { enunciado: 'Uma camisola custa 40 €.\nEstá com 25% de desconto.\nQuanto custa agora, em euros?', resposta: 30, dica: '25% é o mesmo que um quarto.' },
        { enunciado: 'Uns ténis custam 60 €.\nEstão com 20% de desconto.\nQuanto custam agora, em euros?', resposta: 48, dica: '20% é o mesmo que um quinto.' }
      ],
      // Problema 2
      [
        { enunciado: 'Calcula:\n2⁴ + 3²', resposta: 25, dica: '2⁴ = 2×2×2×2' },
        { enunciado: 'Calcula:\n5² − 2³', resposta: 17, dica: '2³ = 2×2×2' }
      ],
      // Problema 3
      [
        { enunciado: 'Um cubo tem 4 cm de aresta.\nQual é o seu volume, em cm³?', resposta: 64, dica: 'Volume do cubo = aresta × aresta × aresta.' },
        { enunciado: 'Um cubo tem 5 cm de aresta.\nQual é o seu volume, em cm³?', resposta: 125, dica: 'Volume do cubo = aresta × aresta × aresta.' }
      ],
      // Problema 4
      [
        { enunciado: 'Qual é o máximo divisor comum de 18 e 24?', resposta: 6, dica: 'Escreve os divisores de 18 e vê qual é o maior que também divide 24.' },
        { enunciado: 'Qual é o máximo divisor comum de 20 e 30?', resposta: 10, dica: 'Escreve os divisores de 20 e vê qual é o maior que também divide 30.' }
      ],
      // Problema 5
      [
        { enunciado: 'Qual é o perímetro de uma circunferência de raio 5 cm?\n(usa π = 3,14)', resposta: '31.4', dica: 'Perímetro = 2 × π × raio.' },
        { enunciado: 'Qual é o perímetro de uma circunferência de raio 10 cm?\n(usa π = 3,14)', resposta: '62.8', dica: 'Perímetro = 2 × π × raio.' }
      ]
    ],
    '7': [
      // Problema 1
      [
        { enunciado: 'Resolve a equação:\n3x − 7 = 2x + 5\nQual é o valor de x?', resposta: 12, dica: 'Passa os termos com x para um lado e os números para o outro.' },
        { enunciado: 'Resolve a equação:\n3x − 4 = 2x + 9\nQual é o valor de x?', resposta: 13, dica: 'Passa os termos com x para um lado e os números para o outro.' }
      ],
      // Problema 2
      [
        { enunciado: 'Descobre o número seguinte:\n3, 7, 11, 15, …', resposta: 19, dica: 'Quanto aumenta de um número para o seguinte?' },
        { enunciado: 'Descobre o número seguinte:\n5, 11, 17, 23, …', resposta: 29, dica: 'Quanto aumenta de um número para o seguinte?' }
      ],
      // Problema 3
      [
        { enunciado: 'Quanto é 20% de 45?', resposta: 9, dica: '10% de 45 é 4,5.' },
        { enunciado: 'Quanto é 30% de 70?', resposta: 21, dica: '10% de 70 é 7.' }
      ],
      // Problema 4
      [
        { enunciado: 'A média de 4 testes é 15.\nTrês das notas são 14, 16 e 13.\nQual é a quarta nota?', resposta: 17, dica: 'Se a média de 4 testes é 15, a soma das notas é 4 × 15.' },
        { enunciado: 'A média de 3 testes é 12.\nDuas das notas são 10 e 15.\nQual é a terceira nota?', resposta: 11, dica: 'Se a média de 3 testes é 12, a soma das notas é 3 × 12.' }
      ],
      // Problema 5
      [
        { enunciado: 'Dois ângulos são complementares.\nUm mede 35°. Quanto mede o outro?', resposta: 55, dica: 'Ângulos complementares somam 90°.' },
        { enunciado: 'Dois ângulos são suplementares.\nUm mede 110°. Quanto mede o outro?', resposta: 70, dica: 'Ângulos suplementares somam 180°.' }
      ]
    ],
    '8': [
      // Problema 1
      [
        { enunciado: 'Os catetos de um triângulo retângulo medem 6 cm e 8 cm.\nQuanto mede a hipotenusa, em cm?', resposta: 10, dica: 'Teorema de Pitágoras: a² + b² = c².' },
        { enunciado: 'Os catetos de um triângulo retângulo medem 5 cm e 12 cm.\nQuanto mede a hipotenusa, em cm?', resposta: 13, dica: 'Teorema de Pitágoras: a² + b² = c².' }
      ],
      // Problema 2
      [
        { enunciado: 'Num saco há 3 bolas vermelhas e 5 azuis.\nTiras uma bola ao acaso.\nQual é a probabilidade de ser vermelha? (fração)', resposta: '3/8', dica: 'Casos favoráveis a dividir por casos possíveis.' },
        { enunciado: 'Num saco há 2 bolas vermelhas e 7 azuis.\nTiras uma bola ao acaso.\nQual é a probabilidade de ser vermelha? (fração)', resposta: '2/9', dica: 'Casos favoráveis a dividir por casos possíveis.' }
      ],
      // Problema 3
      [
        { enunciado: 'Calcula:\n√144 + √81', resposta: 21, dica: 'Que número multiplicado por si próprio dá 144?' },
        { enunciado: 'Calcula:\n√169 − √49', resposta: 6, dica: 'Que número multiplicado por si próprio dá 169?' }
      ],
      // Problema 4
      [
        { enunciado: 'Calcula:\n(2³)²', resposta: 64, dica: 'Potência de potência: multiplica os expoentes.' },
        { enunciado: 'Calcula:\n(3²)²', resposta: 81, dica: 'Potência de potência: multiplica os expoentes.' }
      ],
      // Problema 5
      [
        { enunciado: 'Resolve:\n2x + 3 = 4x − 9\nQual é o valor de x?', resposta: 6, dica: 'Junta os x de um lado e os números do outro.' },
        { enunciado: 'Resolve:\n5x − 4 = 3x + 10\nQual é o valor de x?', resposta: 7, dica: 'Junta os x de um lado e os números do outro.' }
      ]
    ],
    '9': [
      // Problema 1
      [
        { enunciado: 'Resolve o sistema:\nx + y = 10\nx − y = 4\nQual é o valor de x?', resposta: 7, dica: 'Soma as duas equações: o y desaparece.' },
        { enunciado: 'Resolve o sistema:\nx + y = 13\nx − y = 5\nQual é o valor de x?', resposta: 9, dica: 'Soma as duas equações: o y desaparece.' }
      ],
      // Problema 2
      [
        { enunciado: 'Qual é a solução positiva da equação\n3x² = 48 ?', resposta: 4, dica: 'Divide os dois lados por 3 primeiro.' },
        { enunciado: 'Qual é a solução positiva da equação\n2x² = 50 ?', resposta: 5, dica: 'Divide os dois lados por 2 primeiro.' }
      ],
      // Problema 3
      [
        { enunciado: 'Lançam-se dois dados.\nQual é a probabilidade de a soma ser 7? (fração)', resposta: '1/6', dica: 'Há 36 resultados possíveis. Conta os pares que somam 7.' },
        { enunciado: 'Lançam-se dois dados.\nQual é a probabilidade de a soma ser 2? (fração)', resposta: '1/36', dica: 'Há 36 resultados possíveis. Conta os pares que somam 2.' }
      ],
      // Problema 4
      [
        { enunciado: 'Sendo f(x) = 2x − 3,\nquanto é f(5)?', resposta: 7, dica: 'Substitui x por 5.' },
        { enunciado: 'Sendo f(x) = 3x + 1,\nquanto é f(4)?', resposta: 13, dica: 'Substitui x por 4.' }
      ],
      // Problema 5
      [
        { enunciado: 'Num triângulo retângulo, a hipotenusa mede 10 cm\ne o seno do ângulo α é 0,6.\nQuanto mede o cateto oposto a α, em cm?', resposta: 6, dica: 'sen α = cateto oposto ÷ hipotenusa.' },
        { enunciado: 'Num triângulo retângulo, a hipotenusa mede 5 cm\ne o seno do ângulo α é 0,8.\nQuanto mede o cateto oposto a α, em cm?', resposta: 4, dica: 'sen α = cateto oposto ÷ hipotenusa.' }
      ]
    ]
  }
};

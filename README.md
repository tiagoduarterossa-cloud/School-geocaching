# Geocaching Matemático

Jogo de geocaching dentro da escola para jogar em tablets, por grupos dentro de cada turma.

## Como funciona

1. Cada grupo recebe um papel com um código de entrada (ex.: LINCE42). O código diz ao tablet a turma, o grupo e o ano.
2. Aparece um problema de matemática. A resposta certa revela onde está escondida a cache: uma coordenada no mapa da escola (ex.: `C4`) e uma descrição do local.
3. Dentro da cache há um cartão com um código para cada turma. O grupo escreve o código da sua turma e recebe o problema seguinte.
4. No fim aparece o tempo total, com penalizações por respostas erradas e dicas.

Outras regras:

- 3 respostas erradas seguidas bloqueiam a resposta durante 30 segundos, para não adivinharem números ao calhas.
- Cada dica acrescenta 2 minutos ao tempo final, e cada erro 30 segundos.
- O progresso fica guardado no tablet. Se a página fechar, o grupo continua onde estava.
- Depois de aberta uma vez, a app continua a funcionar sem internet.

## Como se evita que as turmas passem respostas

Pensado para uma semana inteira, com uma turma a jogar de cada vez:

- **Cada turma do mesmo ano recebe uma versão diferente de cada problema** (o mesmo exercício com outros números). Uma resposta passada a outra turma não serve.
- **O código dentro de cada cache é diferente para cada turma.** Passar o código não permite saltar a parte de ir à cache.
- **Saber onde estão as caches não adianta**: a app só mostra o campo do código depois de o problema certo estar resolvido.
- Há um conjunto de caches fixas (15 no exemplo). Cada turma faz um percurso de 5. Turmas que joguem à mesma hora devem usar caches diferentes; o plano da semana em `professor.html` mostra que turmas partilham caches.
- Dentro da turma, cada grupo começa num problema diferente.

## Preparar o evento

1. Edita `dados/caches.js`, que tem três partes:
   - `caches`: os sítios da escola (nome, coordenada no mapa, descrição);
   - `turmas`: cada turma com o ano, o número de grupos e a lista das suas caches;
   - `problemas`: para cada ano, um problema por cache do percurso, com uma versão por turma desse ano.
2. (Opcional) Põe uma imagem do mapa da escola com quadrícula em `dados/mapa.jpg` e escreve `mapa: 'dados/mapa.jpg'` no ficheiro.
3. Abre `professor.html` num computador. Se faltar alguma coisa (um problema, versões a menos, uma cache que não existe), avisa no topo. Imprime:
   - os cartões para dentro das caches (com o código de cada turma);
   - os papéis com os códigos de entrada dos grupos;
   - uma folha por turma, com problemas, respostas, percurso de cada grupo e registo dos tempos.
4. Esconde as caches e abre `index.html` em cada tablet.

Os códigos são gerados automaticamente a partir dos nomes das turmas. Se mudares o nome de uma turma ou a ordem das turmas depois de imprimir, volta a imprimir os cartões e os papéis.

## Botão do professor

O ⚙ no canto do ecrã pede o PIN (`pinProfessor` em `dados/caches.js`, por defeito `2468`). Com ele podes:

- mostrar o local de uma cache se a equipa estiver presa no problema;
- dar uma cache como encontrada (se o cartão desaparecer, por exemplo);
- reiniciar o tablet para o grupo seguinte.

Muda o PIN antes do evento.

## Publicar

Não precisa de servidor nem de instalar nada. A forma mais simples é ativar o GitHub Pages neste repositório (Settings → Pages → branch). Os tablets abrem o endereço que o GitHub der.

Também funciona a abrir o `index.html` diretamente, mas assim não fica disponível offline.

## Limitações

- As respostas estão no código da página. Um aluno com muito jeito e um computador conseguia encontrá-las. Num tablet, aos 10 a 15 anos, o risco é baixo.
- Um aluno que fotografe o cartão de uma cache fica com os códigos de todas as turmas que a usam. Como os problemas mudam de turma para turma, continua a ter de os resolver; só poupa a caminhada.
- Não há ranking em tempo real entre tablets. O professor regista o tempo final que aparece em cada tablet na folha de resultados.

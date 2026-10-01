# Geocaching Matemático

Jogo de geocaching dentro da escola para jogar em tablets, por grupos dentro de cada turma.

## Como funciona

1. Cada grupo recebe um papel com um código de entrada (ex.: LINCE). O código diz ao tablet a turma, o grupo e o ano, e o ano decide que problemas aparecem.
2. Aparece um problema de matemática. A resposta certa revela onde está escondida a cache: uma coordenada no mapa da escola (ex.: `C4`) e uma descrição do local.
3. Dentro da cache física há um cartão com um código. A equipa escreve o código no tablet e recebe o problema seguinte.
4. No fim aparece o tempo total, com penalizações por respostas erradas e dicas.

O código dentro da cache obriga os grupos a ir mesmo ao local. Os grupos da mesma turma começam em caches diferentes.

Outras regras:

- 3 respostas erradas seguidas bloqueiam a resposta durante 30 segundos, para não adivinharem números ao calhas.
- Cada dica acrescenta 2 minutos ao tempo final, e cada erro 30 segundos.
- O progresso fica guardado no tablet. Se a página fechar, a equipa continua onde estava.
- Depois de aberta uma vez, a app continua a funcionar sem internet.

## Preparar o evento

1. Edita `dados/caches.js`: a lista de grupos com os códigos de entrada, e para cada cache o local, o código e um problema por ano.
2. (Opcional) Põe uma imagem do mapa da escola com quadrícula em `dados/mapa.jpg` e escreve `mapa: 'dados/mapa.jpg'` no ficheiro.
3. Abre `professor.html` num computador e imprime. Tens os papéis com os códigos de entrada, os cartões para dentro das caches, o percurso de cada grupo, as soluções por ano e uma folha para registar os tempos. Se faltar algum problema ou houver códigos repetidos, a página avisa no topo.
4. Esconde as caches e abre `index.html` em cada tablet.

## Botão do professor

O ⚙ no canto do ecrã pede o PIN (`pinProfessor` em `dados/caches.js`, por defeito `2468`). Com ele podes:

- mostrar o local de uma cache se a equipa estiver presa no problema;
- dar uma cache como encontrada (se o cartão desaparecer, por exemplo);
- reiniciar o tablet para outro grupo.

Muda o PIN antes do evento.

## Publicar

Não precisa de servidor nem de instalar nada. A forma mais simples é ativar o GitHub Pages neste repositório (Settings → Pages → branch). Os tablets abrem o endereço que o GitHub der.

Também funciona a abrir o `index.html` diretamente, mas assim não fica disponível offline.

## Limitações

- As respostas estão no código da página. Um aluno com muito jeito e um computador conseguia encontrá-las. Num tablet, aos 10 a 15 anos, o risco é baixo.
- Não há ranking em tempo real entre tablets. O professor regista o tempo final que aparece em cada tablet na folha de resultados.

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

## Calculadoras e IA

O tablet deteta quando o grupo sai da página do jogo a meio de um problema (para abrir a calculadora, o ChatGPT, outra app). Quando voltam, aparece um aviso e o tempo final leva +5 minutos. Saídas com menos de 3 segundos não contam, e durante a procura da cache o ecrã pode apagar-se sem penalização. Os valores estão em `dados/caches.js` (`penalizacaoSaidaSegundos`, `toleranciaSaidaSegundos`).

O que a app não consegue ver: um telemóvel no bolso, uma calculadora a sério, ou uma app em ecrã dividido. Para o ecrã dividido, a solução é bloquear o tablet no browser antes do evento (o professor de informática faz isto em cada tablet):

- iPad: Definições → Acessibilidade → Acesso guiado. Abre o jogo e carrega três vezes no botão lateral.
- Android: Definições → Segurança → Fixação de ecrã (ou "Afixar aplicação"). Abre o jogo, vai às apps recentes e escolhe "Fixar".

Com o tablet bloqueado, os alunos não conseguem sair do jogo, e a deteção fica só como reserva.

## Área do dono

`dono.html`, protegida pelo `pinDono` (diferente do PIN dos professores). Tem três separadores:

- **Em direto**: cada grupo com estado (a jogar, fora da app agora, terminou, desclassificado, sem ligação), caches encontradas, tempo que falta, erros, dicas, saídas da app e penalização. Ao lado, a lista de todas as saídas da app com hora e duração. Em "Gerir" podes dar +5 min ou anular 5 min, mandar uma mensagem que aparece no tablet do grupo, e desclassificar o grupo (com motivo) ou readmiti-lo.
- **Classificação**: mais caches primeiro, depois o menor tempo com penalizações. Pode filtrar por ano.
- **Códigos**: todos os códigos de entrada e os códigos dentro de cada cache, por turma.

O direto precisa da ligação descrita a seguir. Sem ela, o separador dos códigos funciona na mesma.

## Acompanhar em direto (configurar uma vez)

Os tablets enviam o estado para uma base de dados Firebase (gratuita, da Google). Demora uns 10 minutos:

1. Em https://console.firebase.google.com cria um projeto (não precisa do Google Analytics).
2. No menu, abre **Realtime Database** e carrega em **Criar base de dados**. Escolhe a localização na Europa e começa no **modo bloqueado**.
3. No separador **Regras**, substitui tudo por isto (troca `semana-ciencias-2026` por um nome difícil de adivinhar) e publica:

   ```json
   {
     "rules": {
       "semana-ciencias-2026": { ".read": true, ".write": true }
     }
   }
   ```

4. Copia o endereço da base de dados (algo como `https://nome-default-rtdb.europe-west1.firebasedatabase.app`) para `sincronizacao.url` em `dados/caches.js`, e põe o mesmo nome do passo 3 em `sincronizacao.evento`.
5. Abre `dono.html`: o indicador no canto deve dizer "Ligado".

Na base de dados só fica a turma, o número do grupo e o progresso no jogo. Não há nomes de alunos. Quem souber o endereço e o nome do evento consegue ler e escrever lá, por isso, no fim da semana, apaga o projeto ou muda as regras para `false`.

Se a rede falhar, o jogo continua no tablet. A página do dono mostra "sem ligação" nesse grupo, e o estado é enviado quando a rede voltar.

## Convites e mensagem nos quadros

- `convites.html`: um convite por turma para imprimir e esconder na sala. Tem o dia e a hora da sessão da turma escritos como contas (vêm de `sessao` em cada turma). Sem `sessao`, ficam linhas em branco para preencher à mão.
- `quadro.html`: ecrã para projetar no quadro de cada sala ("Há uma mensagem escondida nesta sala"), com contagem decrescente até ao início da semana (`semana.inicio`). Para mostrar a turma, acrescenta ao endereço `?turma=7ºA`. A tecla F põe em ecrã inteiro.

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
- Sem a ligação Firebase, não há direto: o professor regista o resultado de cada tablet na folha de resultados.
- **Tudo o que está no site é público**, incluindo `dados/caches.js` (com as respostas), `professor.html` e `dono.html`. Os PIN só impedem que se abra a página por engano, não protegem os dados. Um aluno que adivinhe o endereço e saiba ler código vê as respostas. Não divulgues o endereço do site para além dos tablets.

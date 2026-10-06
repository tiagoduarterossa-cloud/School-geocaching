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

## Eventos

O conteúdo está dividido em eventos, cada um com as suas caches, turmas, problemas e códigos:

- **Teste 8ºB**: um teste com uma turma, antes dos eventos maiores.
- **Semana das Ciências**: 3 dias, turmas do 5º ao 8º ano.
- **Dia da Matemática**: um dia, com caches noutros sítios e problemas diferentes, porque os alunos são os mesmos.

Cada turma está dividida em 2 grupos. O código de entrada diz ao tablet a que evento pertence o grupo, por isso os tablets não precisam de ser configurados para cada evento. A área do dono, o material do professor e os convites têm um seletor de eventos (ou `?evento=<id>` no endereço, por exemplo `dono.html?evento=dia-matematica`), e o direto de cada evento fica separado no Firebase. O ecrã dos quadros usa o evento com data de início, ou o que estiver em `?evento=`.

Para acrescentar um evento, copia um bloco de `eventos` em `privado/conteudo.js`, dá-lhe um `id` e uma `semente` novos, e volta a gerar os ficheiros. Os códigos de entrada são sempre diferentes entre eventos.

## Respostas e códigos protegidos

O site e este repositório são públicos, por isso nenhuma resposta, código ou local está publicado em claro:

- `dados/jogo.js` (o que os tablets usam) só tem os enunciados e as dicas. O local de cada cache está cifrado e a chave é a resposta certa: o tablet tenta abrir com o que o grupo escreveu e só abre se estiver certo. Os códigos de entrada, os códigos das caches e o PIN dos professores só existem como resumos que não se conseguem reverter.
- `dados/organizador.js` tem o conteúdo completo, cifrado com a palavra-passe do organizador. As páginas `professor.html` e `dono.html` pedem essa palavra-passe e decifram no próprio browser.
- `privado/conteudo.js` é o conteúdo em claro, onde se editam turmas, caches e problemas. A pasta `privado/` nunca vai para o GitHub.

Até onde vai a proteção: chega para alunos curiosos, mesmo com jeito para informática. Alguém que saiba programar e tenha tempo pode experimentar respostas numéricas uma a uma no seu computador até acertar; cada tentativa foi tornada lenta de propósito, mas as respostas de matemática são números pequenos. Para um jogo de escola, é suficiente.

## Preparar o evento

1. Edita `privado/conteudo.js`, que tem três partes:
   - `caches`: os sítios da escola (nome, coordenada no mapa, descrição);
   - `turmas`: cada turma com o ano, o número de grupos, a lista das suas caches e (opcional) a sessão;
   - `problemas`: para cada ano, um problema por cache do percurso, com uma versão por turma desse ano.
2. Gera os ficheiros publicados (precisa do Node.js 20 ou mais recente):

   ```sh
   GEO_PASSE='palavra-passe do organizador' node ferramentas/construir.js
   ```

   Num computador sem a pasta `privado/`, recupera primeiro o conteúdo com o mesmo comando e `--extrair` no fim.
3. (Opcional) Põe uma imagem do mapa da escola com quadrícula em `dados/mapa.jpg` e escreve `mapa: 'dados/mapa.jpg'` no conteúdo.
4. Abre `professor.html` e escreve a palavra-passe. Se faltar alguma coisa (um problema, versões a menos, uma cache que não existe), avisa no topo. Imprime:
   - os cartões para dentro das caches (com o código de cada turma);
   - os papéis com os códigos de entrada dos grupos;
   - uma folha por turma, com problemas, respostas, percurso de cada grupo e registo dos tempos.
5. Esconde as caches e abre o site em cada tablet.

Os códigos são gerados a partir de um segredo (`semente`) e dos nomes das turmas. Enquanto a semente e os nomes não mudarem, os códigos ficam iguais, mesmo que se altere o resto. Se mudares a semente ou o nome de uma turma depois de imprimir, volta a imprimir os cartões e os papéis.

## Calculadoras e IA

O tablet deteta quando o grupo sai da página do jogo a meio de um problema (para abrir a calculadora, o ChatGPT, outra app). Quando voltam, aparece um aviso e o tempo final leva +5 minutos. Saídas com menos de 3 segundos não contam, e durante a procura da cache o ecrã pode apagar-se sem penalização. Os valores estão em `privado/conteudo.js` (`penalizacaoSaidaSegundos`, `toleranciaSaidaSegundos`).

O que a app não consegue ver: um telemóvel no bolso, uma calculadora a sério, ou uma app em ecrã dividido. Para o ecrã dividido, a solução é bloquear o tablet no browser antes do evento (o professor de informática faz isto em cada tablet):

- iPad: Definições → Acessibilidade → Acesso guiado. Abre o jogo e carrega três vezes no botão lateral.
- Android: Definições → Segurança → Fixação de ecrã (ou "Afixar aplicação"). Abre o jogo, vai às apps recentes e escolhe "Fixar".

Com o tablet bloqueado, os alunos não conseguem sair do jogo, e a deteção fica só como reserva.

## Área do dono

`dono.html`, protegida pela palavra-passe do organizador. Fica aberta até fechares o separador do browser ou carregares em "Bloquear". Tem três separadores:

- **Em direto**: cada grupo com estado (a jogar, fora da app agora, terminou, desclassificado, sem ligação), caches encontradas, tempo que falta, erros, dicas, saídas da app e penalização. Ao lado, a lista de todas as saídas da app com hora e duração. Em "Gerir" podes dar +5 min ou anular 5 min, mandar uma mensagem que aparece no tablet do grupo, e desclassificar o grupo (com motivo) ou readmiti-lo.
- **Classificação**: mais caches primeiro, depois o menor tempo com penalizações. Pode filtrar por ano.
- **Códigos**: todos os códigos de entrada e os códigos dentro de cada cache, por turma.

O direto precisa da ligação descrita a seguir. Sem ela, o separador dos códigos funciona na mesma.

## Acompanhar em direto (configurar uma vez)

Os tablets enviam o estado para uma base de dados Firebase (gratuita, da Google). Demora uns 10 minutos:

1. Em https://console.firebase.google.com cria um projeto (não precisa do Google Analytics).
2. No menu, abre **Realtime Database** e carrega em **Criar base de dados**. Escolhe a localização na Europa e começa no **modo bloqueado**.
3. No separador **Regras**, substitui tudo por isto (troca `o-nome-do-evento` por um nome difícil de adivinhar) e publica:

   ```json
   {
     "rules": {
       "o-nome-do-evento": { ".read": true, ".write": true }
     }
   }
   ```

4. Copia o endereço da base de dados (algo como `https://nome-default-rtdb.europe-west1.firebasedatabase.app`) para `sincronizacao.url` em `privado/conteudo.js`, põe o mesmo nome do passo 3 em `sincronizacao.evento`, e volta a gerar os ficheiros.
5. Abre `dono.html`: o indicador no canto deve dizer "Ligado".

Na base de dados só fica a turma, o número do grupo e o progresso no jogo. Não há nomes de alunos. Quem souber o endereço e o nome do evento consegue ler e escrever lá, por isso, no fim da semana, apaga o projeto ou muda as regras para `false`.

Se a rede falhar, o jogo continua no tablet. A página do dono mostra "sem ligação" nesse grupo, e o estado é enviado quando a rede voltar.

## Segurança e termos de utilização

- **Regras antes de começar**: no tablet, o grupo vê as regras de segurança, de comportamento e do jogo, e só pode carregar em "Começar" depois de confirmar que as leu. A hora da confirmação fica registada. O texto das regras está em `js/regras.js`.
- **Pedir ajuda**: botão sempre visível no tablet ("Alguém se magoou" ou "Outro problema"). Na área do dono aparece um alerta vermelho com som, o grupo e o local onde está (perto da última cache encontrada, ou a caminho da seguinte). "Resolvido" faz desaparecer o aviso no tablet. Enquanto o pedido está ativo, sair da app não é penalizado. Se o tablet não tiver ligação, diz ao grupo para ir ter com o adulto mais próximo.
- **`termos.html`**: termos de utilização públicos, com o papel de cada um (escola, organizador, participantes), as regras, o que acontece em caso de acidente ou dano e que dados são registados. Os campos `escola` e `organizador` em `privado/conteudo.js` aparecem no topo.

Os termos não afastam a responsabilidade por danos a pessoas: em Portugal, cláusulas desse tipo são nulas (Decreto-Lei n.º 446/85, art. 18.º, alínea a); Código Civil, art. 809.º). O que protege o organizador é a atividade ser aprovada e supervisionada pela escola, o que também a coloca sob o seguro de acidentes que cobre as atividades escolares (nas escolas públicas, o Seguro Escolar da Portaria n.º 413/99; num colégio privado, o seguro do próprio colégio, a confirmar na secretaria). Os termos registam essa divisão de papéis.

Os locais das caches nunca devem obrigar a mexer em equipamento (extintores, quadros elétricos, armários de laboratório), a subir a nada, ou a entrar em zonas fechadas.

## Acessibilidade (alunos cegos e com baixa visão)

- **Botão "Aa"** (no ecrã inicial e no topo do jogo): letra grande e alto contraste, e leitura automática em voz alta. A escolha fica guardada no tablet.
- **"Ouvir o problema" e "Ouvir onde está a cache"**: o tablet lê em voz alta, em português. A matemática é dita como se diz: 3/4 é "3 quartos", 2⁻³ é "2 elevado a menos 3", × é "vezes", ÷ é "a dividir por". Escrevam os enunciados com estes símbolos para serem bem lidos.
- **Leitores de ecrã** (VoiceOver no iPad, TalkBack no Android): o enunciado tem uma versão escrita para ser lida em voz alta; quando o grupo acerta, o leitor salta para "Resposta certa!". Com o leitor de ecrã ligado, deixem desligada a leitura automática da app, para não falarem os dois ao mesmo tempo.
- **Braille**: os papéis com os códigos de entrada e os cartões das caches, em `professor.html`, mostram o código também em braille. O braille impresso em tinta não se sente: passa-o numa impressora braille ou na máquina Perkins.
- **Locais das caches**: descreve-os para se encontrarem sem ver, com referências que se tocam, à altura da mão e sem escadas.
- **Grupos**: os alunos cegos jogam nos grupos da turma, um por grupo, com um papel ativo (por exemplo, ouvir e resolver o problema, ou ler o código em braille). Nas regras, o grupo é lembrado de oferecer o braço para guiar e de avisar antes de escadas e portas.

## Convites e mensagem nos quadros

- `convites.html`: um convite por turma para imprimir e esconder na sala. Tem o dia e a hora da sessão da turma escritos como contas (vêm de `sessao` em cada turma). Sem `sessao`, ficam linhas em branco para preencher à mão.
- `quadro.html`: ecrã para projetar no quadro de cada sala ("Há uma mensagem escondida nesta sala"), com contagem decrescente até ao início da semana (`semana.inicio`). Para mostrar a turma, acrescenta ao endereço `?turma=7ºA`. A tecla F põe em ecrã inteiro.

## Botão do professor

O ⚙ no canto do ecrã pede o PIN dos professores (`pinProfessor` em `privado/conteudo.js`, pelo menos 6 algarismos; também aparece nas folhas por turma). Com ele podes:

- mostrar o local de uma cache se a equipa estiver presa no problema;
- dar uma cache como encontrada (se o cartão desaparecer, por exemplo);
- reiniciar o tablet para o grupo seguinte.


## Publicar

Não precisa de servidor nem de instalar nada. A forma mais simples é ativar o GitHub Pages neste repositório (Settings → Pages → branch). Os tablets abrem o endereço que o GitHub der.

Também funciona a abrir o `index.html` diretamente, mas assim não fica disponível offline.

## Limitações

- Um aluno que fotografe o cartão de uma cache fica com os códigos de todas as turmas que a usam. Como os problemas mudam de turma para turma, continua a ter de os resolver; só poupa a caminhada.
- Sem a ligação Firebase, não há direto: o professor regista o resultado de cada tablet na folha de resultados.
- A palavra-passe do organizador não se recupera. Sem ela, não se abrem as páginas do professor e do dono, nem se recupera o conteúdo a partir do GitHub. Guarda-a num sítio seguro.

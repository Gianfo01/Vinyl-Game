# Masters 31 — texto da página do plano (cópia)

Fonte: https://claude.ai/artifact/YTDVe5eVDcagAvwi3AzZ7Q (versão 36). As imagens dos mocks não estão no repositório.
Masters 31 — telas em cena

- 

 Proposta para aprovação · nada foi implementado
 Telas em cena

Quais telas do Masters podem virar imagem clicável no estilo da Sede e do Nosso mundo, com mocks desenhados com as peças reais do jogo. No fim, a avaliação das regras RN-01 a RN-35 e o que pegar de Rising Star 2, Software Inc., Crusader Kings III, RimWorld e GearCity.

## A ideia

Cada tela escolhida vira uma sala em corte, igual à Sede: os objetos são os botões. Um número ou ícone pequeno em cima do objeto mostra o estado (quantas decisões, quanto falta, se está travado), e o clique abre a mesma tela de hoje já filtrada. A tabela continua existindo num "ver detalhes" logo abaixo da cena. Ninguém perde informação, só deixa de precisar ler para achar o que importa.

- Você aparece na cena. Sempre que estiver numa sala da sede, num interior da cidade (bar, loja, rádio, gravadora rival, delegacia, leilão…) ou numa cena de mecânica, o seu personagem aparece ali junto com os NPCs, com o visual que você escolheu e a roupa da época, numa posição que faz sentido (atrás da mesa na sua sala, no balcão do bar, na plateia do leilão, do outro lado da mesa na negociação). Clicar em você abre o seu painel (agenda, energia, dinheiro pessoal). Se a sua agenda diz que você está em outro lugar, a cena mostra isso ("você está em turnê em Lisboa") em vez de te desenhar ali.

- Toda cena é interativa, sempre. Nenhuma é só ilustração: toda pessoa e todo objeto com significado no jogo acende ao passar o mouse, mostra uma dica curta e abre algo ao clicar (ficha, ação, tela). Os cabeçalhos clicáveis seguem a mesma regra, e o clique direito funciona nas pessoas e objetos da cena como no resto do jogo. Um teste confere que cada cena tem áreas clicáveis e que cada uma leva a algum lugar.

- Tudo que a cena mostra vem do motor. A cena só desenha; não calcula nada novo (RN-01).

- Mesmas peças da Sede. Contorno escuro, paleta da época, bonecos reais. A cena muda com a década, como a Sede já muda.

- Pouco texto. Números, barras e ícones em cima dos objetos; a dica ao passar o mouse dá a frase curta, incluindo o motivo de um botão travado (RN-04).

- Não vira tudo cena. Fichas, contratos, finanças, paradas e listas continuam em texto. Mapa ajuda a se orientar; tabela ajuda a decidir.

## Cenas ligadas à sua sede

As cenas de dentro da empresa são as salas reais da sua sede, vistas de perto, e não salas genéricas. Elas seguem as mesmas regras que já desenham a Sede.

- Época: paleta, móveis e equipamento do ano (gramofone e partitura em 1890, rolo de fita em 1975, PC bege em 1998, notebook e tela touch em 2020).

- Tamanho da sede: garagem, sala comercial, prédio, torre, campus. Na garagem a "Mesa do chefe" é a mesa da cozinha com um telefone; na torre é um escritório no último andar com vista. A Equipe mostra quantos andares você tem de verdade.

- Salas compradas: se você não tem estúdio próprio, a cena do Estúdio mostra o estúdio alugado onde a banda está gravando. Sem a sala de arquivo, o Catálogo são caixas de fitas num canto da garagem. Sala em obra aparece em obra.

- Estilo e cidade: a fachada, a vista da janela e o clima vêm da sua cidade e do estilo da sede, como já acontece na Sede e no Nosso mundo.

- Entrar pela Sede: clicar na sala na Sede abre a cena dela de perto, e a cena tem um botão para voltar à Sede.

Ficam fora da sede, e por isso mudam só com a época e a cidade: Turnê (mapa), Projeto musical (a rua do lançamento), Talentos (o clube da cidade onde o olheiro está), Loja, casas de show e gravadoras rivais.

## Quais telas

### Viram cena

Mesa do chefe (cockpit) · Estúdio · Talentos · Turnês · Projeto musical · Casas de show · Festivais (o terreno já existe; vira a vista principal) · Elenco · Equipe · Catálogo · Lançamentos (vitrine) · Prêmios (cerimônia e sala de troféus) · Dinâmica da banda (sala de ensaio) · Vida pessoal (sua casa) · Shows (casa de shows)

### Viram lugares no mundo

Mídia (redação e banca) · Editora (sala de partituras) · Plataforma (escritório de tecnologia, na época certa) · Bolsa (corretora com painel de cotações) · Tribunal (processos) · Submundo (fachadas, salas dos fundos, delegacia, mercado negro) · Aeroporto · Casa de leilões

### Ficam em texto (só o essencial)

Todos os artistas e diretórios · ficha de pessoa · contratos (cláusulas) · finanças · paradas · caixa de entrada · calendário completo · dados de mercados e regiões · opções

### Cenas novas que nascem dos pedidos desta rodada

- Sua casa por dentro: o interior muda com o tipo de casa e a época. Mostra a família e os itens que você comprou para você (instrumentos, discos, quadros), com as relíquias que guarda em casa nas prateleiras. Clicar no objeto abre a ficha dele, com a lista de donos.

- Garagem: os carros e motos comprados aparecem de verdade na garagem da casa (os seus) e na da sede (os da empresa: van de turnê, ônibus). Hoje a garagem da sede só mostra a van fixa.

- Sala de troféus e relíquias da empresa: o museu do selo já existe. Ele passa a usar os pedestais dos 5 níveis, e os itens da empresa ficam expostos ali. Emprestar ao museu, vender ou presentear sai do clique na peça.

Não viram cena (ficam como estão ou em texto): bolsa de valores, tribunal e processos, conhecidos (aparecem nas cenas onde as pessoas estão, não numa cena própria). Encontros, noite, premiações, crises e diretoria já são cenas hoje.

Regra desta versão: diminuir telas e pôr mais coisas no mundo. Só fica em texto o que é essencialmente lista ou documento. Em toda cena e todo lugar, um "ver detalhes" abre a tabela completa, para nada se perder.

Atalho técnico: quase toda página já tem uma faixa ilustrada no topo (as cenas de cabeçalho). O caminho mais barato para o grupo do meio é tornar essas faixas clicáveis, em vez de desenhar tudo do zero.

## Mocks

Desenhados com o código de pixel do próprio jogo (1975; a Equipe está em 1998 para mostrar a troca de época). Os contornos amarelos tracejados, os quadrados numerados e a legenda "1 = … › abre X" embaixo são só para explicar o mock e não entram no jogo. No jogo, o objeto acende ao passar o mouse e a dica curta aparece ali mesmo.

0 · referência

### Sede de hoje
Para comparar estilo e escala.

1 · vira cena

### Mesa do chefe
Responde as três perguntas da tela principal: telefone tocando = o que exige decisão agora; mural com alfinetes verde, amarelo e vermelho = projetos em andamento (ok, atrasado, travado); jornal = o que mudou por causa das suas decisões. Calendário e bandeja de cartas levam à agenda e à caixa de entrada.
RN-30RN-31RN-20

2 · vira cena

### Estúdio
Mesa com medidor de qualidade, fita com sessões feitas/total, luz de gravação, músicos com balão de humor ou estresse, produtor com o bônus dele, porta com a agenda do estúdio.
RN-06RN-27

3 · cabeçalho

### Elenco
Cada artista posado pelo estado: sofá = descansando, violão = gravando, mala = em turnê, nuvem de chuva = estressado. Anos de contrato em cima da cabeça; vaga vazia leva a Talentos. A lista completa fica embaixo.
RN-17RN-19

4 · vira cena

### Talentos
Banda no palco com potencial "??" (o jogo não revela o talento real), olheiro no balcão com a missão em curso, pilha de fitas demo e caderno com a lista de observação.
RN-05

5 · cabeçalho · 1998

### Equipe
Uma mesa por função com barra de carga; mesa vazia com "vaga" = contratar. A prancheta na parede é a diretriz de delegação (escopo e orçamento). Andares de cima esmaecidos = visão agregada das sedes grandes.
RN-16RN-17RN-18RN-34

6 · vira cena

### Turnê
Mapa e calendário juntos: tamanho do ponto = lotação da casa, laranja = já tocou, roxo = falta, colunas pontilhadas = dia de viagem, dia vermelho = conflito (show e estúdio no mesmo dia), "+" = dia livre para marcar. A tabela detalhada continua acessível.
RN-11RN-06

7 · cabeçalho

### Catálogo e direitos
Três armários separados para não misturar bases: Masters (lombadas brilham pelo faturamento), Editora (composições) e Imagem. Cada um com seu número; nada é somado entre eles.
RN-14

8 · vira cena

### Projeto musical
O lançamento como uma rua: compor → estúdio → fábrica → rádio → loja. Etapa feita = check verde, etapa atual acesa com barra, futuras apagadas com o mês. Bandeiras na calçada são os marcos de promoção e mídia; a van mostra onde o projeto está.
RN-12

## As regras RN-01 a RN-35

Conferi cada uma contra o código. Nenhuma é "não faz sentido"; muitas já existem e só precisam aparecer melhor. O que mais falta é apresentação e etiquetar dados, não sistema novo.

| RN | Situação | O que existe / o que faria | 

| 01 | princípio | O jogo já segue isso (a chance mostrada é a mesma do sorteio, com teste). Vira critério de revisão + uma auditoria das telas atrás de contas paralelas. | 

| 02 | já existe | Bolinhas de escritório (2) e pessoais (5), envolvimento por carreira. Falta abrir cada segmento e ver os compromissos. | 

| 03 | parcial | Calendário único + valores reservados existem. Falta etiquetar cada item como estimado / reservado / a pagar e nunca inventar data. | 

| 04 | parcial | Hoje o motivo aparece depois do clique (mais de 240 casos). Padronizar: botão travado já mostra o motivo e a condição antes do clique. | 

| 05 | parcial | Já compara com propostas rivais e mostra a chance real. Falta cenário A × B lado a lado, marcado "estimativa", sem revelar o mínimo secreto da negociação nem o talento real. | 

| 06 | parcial | Rodapé padrão nas decisões: tempo (bolinhas), caixa livre, quem fica ocupado. Sem nota inventada. | 

| 07 | falta | Etiquetar cada lançamento financeiro com artista/projeto; o que não der para atribuir aparece como "não alocado". | 

| 08 | já existe | Caixa × competência, DRE, valores reservados, a receber e a pagar. | 

| 09 | falta | Metas pessoais do jogador, sem recompensa, guardadas só na interface (para não virar um segundo sistema de objetivos). | 

| 10 | parcial | O Diário e os "ecos" de decisão existem, mas não guardam o contexto do momento. Gravar caixa, fama e chance mostrada na hora; leitura do sistema marcada como inferência. | 

| 11 | já existe | Rota no mapa, custo por trecho, conflitos na agenda. O mock 6 junta mapa e calendário numa vista. | 

| 12 | parcial | Etapas de rollout existem (teaser → single → clipe → álbum). Falta a linha do tempo visual (mock 8). | 

| 13 | falta | Biblioteca de aprendizados a partir das autópsias e da história. Depende da RN-07. Sempre rotulada como correlação. | 

| 14 | parcial | Obra × master × versões e territórios existem. Falta a carteira consolidada por base, sem somar bases diferentes (mock 7). | 

| 15 | parcial | Busca rápida (Ctrl+K) existe. Falta favoritos salvos; só navegam, nunca executam ação. | 

| 16 | parcial | Ordens permanentes para agente/promotor e políticas existem. Faltam diretrizes para chefe de A&R e produtor executivo. | 

| 17 | parcial | Ações em lote existem. Falta a visão agregada do elenco com exceções. Os números 20 e 30 conferem, mas são a capacidade de partida: filiais e salas somam mais, e acima do limite a carreira é terceirizada. | 

| 18 | parcial | Cada ordem já se explica. Falta um registro único: quem agiu, qual diretriz, quanto gastou, resultado. | 

| 19 | já existe | Favores, promessas, mágoas e "lembra quando…" existem. Falta mostrar a cadeia na ficha da pessoa. | 

| 20 | já existe | Boletim da semana, resumo do mês, momentos marcantes, notificações agrupadas. | 

| 21 | validação | As 10 carreiras existem; os bots de teste só jogam selo e artista. Criar bots por carreira. | 

| 22 | validação | As carreiras batem com a lista. Selo, empresário e festival já são fortes; auditar mídia, plataforma e editora. | 

| 23 | já existe | Agente ganha comissão; promotor arrisca na bilheteria. Só conferir a clareza na tela. | 

| 24 | validação | Andares, filiais, delegação e doutrinas existem. Medir com bots se o fim de jogo traz decisões novas. | 

| 25 | balanço | Números conferem (−0,75/ano desde 1990, teto 15). Mas vale para todo o elenco do selo, não só sua banda, e como sai antes da potência 2,4 corta ~44% do apelo com qualidade 70. E é invisível. Medir com e sem, por ano de início, e decidir o alcance. | 

| 26 | parcial | Mostrar essa penalização como fator próprio ("Era digital") na autópsia e separar efeito no apelo de efeito nas vendas. | 

| 27 | parcial | Autópsias têm fatores com grau de confiança. Falta rotular fato observado / efeito calculado / hipótese. | 

| 28 | já existe | Fator "acaso", faixas do analista, chance real. Acrescentar "um resultado não prova a estratégia". | 

| 29 | já existe | Bots adversários (spam, empréstimos, revenda, contratar tudo, catálogo, crime). Rodar em mais cenários e carreiras. | 

| 30 | já existe | O cockpit já responde agora / acontecendo / mudou. O mock 1 é a versão em cena. | 

| 31 | princípio | Recursos liberados por época, tutoriais de primeira visita. Vira critério de revisão. | 

| 32 | validação | Tutorial por carreira existe. Falta medir os primeiros 30 minutos de cada uma. | 

| 33 | já existe | Marcos por carreira, momentos, conquistas, final. | 

| 34 | já existe | Dinheiro não compra bolinhas de agenda (chefe de gabinete dá só +1), há sobrecarga e estresse. Validar com bots. | 

| 35 | parcial | O jogo avisa mudanças de década. A penalização pós-1990 é dificuldade disfarçada de mercado; separar as duas no aviso. | 

## O que pegar das referências

### Software Inc.
O prédio é a tela: salas com função, gente trabalhando, gargalo visível na planta. É o modelo para a Sede, a Equipe e o Estúdio. Também times com líder e diretrizes (RN-16, 17, 18).

### RimWorld
A colônia é a tela principal e a pilha de alertas à direita leva direto à causa. Aplicar na Sede/Nosso mundo: alertas presos a salas e pessoas (RN-20, 30). Acaso assumido (RN-28).

### Crusader Kings III
Dicas dentro de dicas, decomposição de modificadores em toda tela, barra de decisões com motivo e condição (RN-04, 26, 27). Segredos e ganchos já existem no Masters (RN-19).

### GearCity
Mapa-múndi para se orientar, tabelas densas para decidir, histórico por produto e região. Por isso turnês têm mapa + tabela e finanças continuam tabela (RN-07, 11, 13, 14).

### Rising Star 2
Ciclo curto e legível: calendário semanal, artista como carta de atributos, consequência visível logo após a escolha (RN-03, 12, 32).

 Rodada 2 · seus 15 pedidos

## Penalização pós-1990

Ela existe para começar tarde não ficar fácil demais. O comentário no código diz que "a partir dos anos 90 todo mundo grava bem". Só que o jogo já dá esse ganho de produção a todos, rivais incluídos. A penalização tira do jogador uma vantagem que ele não tem.

- Os rivais já gravam melhor que você. Qualidade média dos lançamentos numa partida medida: em 1975, 53 seus contra 69 dos rivais; em 2010, 71 contra 76. Com a penalização, em 2010 você cai para 56.

- Aplicar a todos não resolve. A fatia de mercado é relativa, então tirar de todo mundo quase se anula. Na medição, o jogador até ganhou mais nesse modo: receita de 22,8 mi contra 12,6 mi hoje, em 4 anos de uma única partida (número ruidoso).

- Outros defeitos: a previsão de vendas ignora a penalização e erra para cima (cerca de 1,8× em 2010); ela pune também quem joga como artista contratado por selo de outro; e o jogador nunca vê o efeito.

- Proposta: tirar a penalização. No lugar, uma pressão de mercado igual para todos e visível no resultado ("mercado saturado, era digital ×0,8"). Corrigir a previsão de vendas e medir de novo a meta original: começar tarde render cerca de 3× começar em 1990.

## Bolsa de valores

A ação dos selos rivais já reage a hits, escândalos, entrada e saída de artistas, dívida, catálogo, crises e juros. A ação do seu selo não. É um sorteio que olha só o lucro e o crescimento da receita, e ainda tem um defeito que faz o preço escorregar todo começo de ano.

- Não ligado em ninguém: processos, crime e submundo, relíquias, festivais, prêmios, saída de funcionário importante, antitruste, boicote e cancelamento.

- Proposta: valor de verdade para toda empresa listada (seu selo e os rivais, e as demais empresas da bolsa onde fizer sentido: plataformas, rádios e TVs, redes de casas de show, fabricantes de equipamento). O preço segue um valor calculado a partir do que a empresa realmente tem e faz, com sorteio próprio e pequeno só para o "humor do mercado":

- Elenco: quantos artistas, qualidade, fama, potencial, idade da carreira e anos de contrato restantes (artista estourado com contrato longo vale mais; contrato acabando vale menos).

- Catálogo e direitos: masters, obras da editora e imagem, cada um pela sua base (sem somar bases diferentes), com o rendimento recente.

- Bens e relíquias: sede e salas, imóveis, casas de show e festivais próprios, frota, equipamentos e itens da empresa, relíquias pelo nível (e a exposição em museu como marca).

- Dinheiro: caixa, receita e lucro dos últimos 12 meses, dívida, obrigações e adiantamentos.

- Resultado musical: paradas por país, prêmios, certificados, lançamentos a caminho.

- Gente e reputação: qualidade da equipe e saída de profissionais importantes, reputação do selo, escândalos, processos, ligação com crime e calor da polícia, antitruste, boicotes.

- Época e mercado: participação de mercado, aposta em formatos e plataformas certos ou errados, crises, juros e bolhas (NFT, FTX, "ponto com").

 O mesmo valor serve para IPO, compra e venda de participação, ofertas de aquisição e sócios. Uma ficha "por que vale isso" mostra a conta por parte (RN-01, RN-27), e o motivo de cada alta ou queda aparece nas notícias da bolsa. O valor dos rivais segue as mesmas regras, sem atalho.

## Paradas, alcance e nacionalidade

O que já funciona: entrar na parada de um país aumenta a fama ali e transborda para vizinhos e mesma língua; nº 1 em 4+ países dispara o hit viral mundial; nacionalidade pesa (preferência pelo artista local, peso cultural do país, prêmios nacionais); turnê aumenta a fama no país.

Elos fracos medidos (partida de 1985–89): ser famoso num país não faz vender mais lá (em um caso a parada até cai quando a fama sobe); as vendas são decididas no mundo inteiro e só depois repartidas, então o artista local pequeno some (nº 1 da casa nos últimos 40 de cada país: Reino Unido 40, Brasil 37, EUA 32, Japão 1, Alemanha, Canadá, Austrália e Holanda 0); a língua quase não pesa; leis e cotas valem para o mundo todo; não há efeito dominó; turnê, divulgação e rádio quase não chegam às paradas do país; estrelas ficam com fama 100 em todo lugar.

- Fama local vende: a fama num país passa a pesar nas vendas ali, o que faz turnê e divulgação chegarem às paradas daquele país. Corrigir o caso em que a parada cai quando a fama sobe.

- Língua: mesma língua vende mais, língua diferente vende menos; o peso vai caindo com streaming e vídeo curto.

- Leis e cotas no país certo: cota canadense, lei francesa, Malvinas, cotas da Austrália e da Índia passam a valer só no país da lei (bônus ao local, desconto ao estrangeiro ali).

- Efeito dominó: nº 1 num país puxa um pouco os vizinhos e quem fala a mesma língua, antes do limiar do viral.

- Fama menos uniforme: teto mais baixo para estrelas fora dos seus mercados e língua; a parada nacional também soma um pouco à fama global, pesada pelo tamanho do país. Os NPCs passam a guardar picos de parada como o jogador.

- Mercado de cada país: parte das vendas de cada país fica reservada para os artistas de lá, conforme a preferência local (Japão e Brasil alto, Holanda baixo). É o que mais mexe no balanço: entra por último, com medição antes e depois.

- Cada mudança com interruptor para desligar na medição; meta: nº 1 da casa por país perto do histórico real de cada mercado.

## Loja, itens, presentes e níveis de relíquia

Base existente: já dá para comprar bens (inclusive moto e instrumentos raros, com dinheiro pessoal), e a loja de instrumentos já aparece na cidade. Mas não se faz nada lá dentro, nada é vendido antes de 1920, os itens não têm história própria e não podem ser dados a ninguém.

mock · loja

### Loja de instrumentos no Nosso mundo
Etiquetas de preço nos itens; laço = pode comprar como presente; quadro "Novidades" com a contagem até o estoque mudar (na virada de cada mês o estoque inteiro troca, de acordo com a época; nunca repete o mês anterior); vitrine com relíquia rara (aparece raramente); janela da garagem com carros e motos.

mock · compra

### Comprar ou dar de presente
Todo item, de qualquer tipo, tem três formas de compra:

- Para você: paga com dinheiro pessoal e fica com o seu personagem (entra no patrimônio).

- Para a empresa: paga com o caixa do selo e fica com a empresa (estúdio, frota, acervo; entra no balanço).

- De presente: para qualquer pessoa que você conhece (ver "Conhecidos" abaixo). Você escolhe se paga com dinheiro pessoal ou da empresa. O efeito na opinião depende do valor e do gosto da pessoa: instrumento do instrumento dela vale mais.

O item guarda todos os donos. Se viver uma história forte, vira relíquia.

mock · relíquias

### Níveis e donos anteriores
Cinco níveis (Comum, Notável, Rara, Lendária, Mítica), cada um com pedestal e brilho próprios. O nível sai do valor e da história do objeto; não é sorteado. Na ficha, o dono atual, todos os anteriores com anos e os acontecimentos que fizeram a relíquia subir. Sai a linha "Próximo: …": o jogador não vê o que falta para o próximo nível.

Vários caminhos para cada nível. O nível é a soma de pontos de história; qualquer combinação serve. Exemplos de acontecimentos que dão pontos:

- Música: gravou disco de ouro ou nº 1; tocou num show histórico ou festival lendário; está na capa de um disco.

- Dono: pertenceu a uma lenda ou ao Hall da Fama; o dono morreu jovem; passou por várias mãos famosas.

- Drama: quebrado no palco; roubado e recuperado; leiloado por valor recorde; envolvido em escândalo ou processo.

- Tempo: sobreviveu décadas; último do modelo; exposto em museu por anos.

Também falta corrigir: roubo, reaparecimento e devolução hoje não entram na lista de donos.

### Relíquias na loja: chance por raridade

- A loja só oferece relíquias que já existem no mundo do jogo e estão com algum colecionador ou foram a leilão. Nenhuma é criada para a loja.

- Cada mês, cada loja tem uma chance por nível. A mais rara nunca é garantida: Notável é comum, Rara aparece de vez em quando, Lendária raramente, Mítica quase nunca. Os valores finais saem da medição e respeitam a densidade de relíquias escolhida na nova partida.

- Na maior parte dos meses a vitrine fica vazia ou só com Comum e Notável.

- O sorteio é fixo por loja e mês (não muda ao recarregar o save) e não grava nada até você comprar.

## Tela de delegação (estilo Football Manager)

Uma tela única, na Sede (sala da diretoria) e em Opções, com a lista de todas as responsabilidades do jogo. Para cada uma você escolhe quem decide:

- Eu decido: tudo chega para você.

- Delegar a: um funcionário com a função certa (só aparece se você tiver alguém com essa função; sem ninguém, a opção fica travada com o motivo e o cargo que falta).

- Parcial: o funcionário decide dentro de limites e consulta você acima deles (ex.: "renovações até US$ 50 mil e 3 anos; acima disso, me pergunte").

- Automático pela regra: uma política fixa, sem pessoa (ex.: "recusar sempre jabá").

Responsabilidades, agrupadas: Elenco (sondar talentos, ofertas, renovações, demissões), Música (repertório, produtor, estúdio, mixagem), Lançamentos (calendário, formato, marketing, rádio), Palco (shows, turnês, festivais, transporte), Dinheiro (empréstimos, investimentos, preços), Pessoas (contratar e demitir equipe, presentes), Imprensa (entrevistas, crises), Submundo (pedidos de facções), Bens (compras, leilões com teto).

- Cada linha mostra quem cuida hoje, o orçamento e o teto, quantas decisões foram tomadas no mês e o resultado.

- A competência do funcionário pesa: um A&R fraco decide pior. A delegação usa exatamente as mesmas regras de custo, agenda, capacidade e elegibilidade das ações manuais.

- Tudo que foi delegado entra no registro de automação (quem agiu, qual regra, quanto gastou, resultado) e pode ser desfeito dali em diante.

- Presets por tamanho de empresa ("garagem: eu faço tudo", "selo médio", "multinacional: só exceções").

- Junta e substitui as configurações espalhadas hoje (ordens permanentes, políticas, envolvimento por carreira).

## Conhecidos, amigos e rivais

A ideia vem do The Sims, valendo para todos os personagens com todos os personagens, não só com você: quem nunca cruzou com alguém não tem opinião sobre essa pessoa ainda, e vice-versa.

O que já existe: opinião sobre você de −100 a +100 com motivo (guardada hoje em 5 lugares diferentes); laços entre NPCs (amigo, rival, romance, mentor, briga, parceria); laços duradouros; favores, promessas e mágoas. O que falta: o estado "não conhece", e a mesma lógica entre NPCs.

- Cinco coisas separadas (a interface mostra um rótulo simples, mas o motor guarda cada uma):

- Reconhecimento: não sabe quem é › sabe quem é (pela fama, imprensa) › já teve contato direto.

- Intimidade: conhecido › colega › amigo › próximo.

- Opinião: positiva, neutra ou negativa, sempre com os motivos. Alguém que nunca te viu pode ter opinião negativa depois de uma notícia; um amigo pode estar magoado sem deixar de ser amigo.

- Vínculos: família, romance, mentor, rivalidade, promessas (os que já existem).

- Informação: o que se sabe dos atributos e da história da pessoa (ver "O que se sabe de cada pessoa" abaixo).

- Entre NPCs também: artistas que tocaram juntos se conhecem, colegas de selo viram amigos ou rivais, o CEO rival conhece os empresários da cidade. Isso alimenta os laços, as fofocas, as apresentações ("um amigo em comum te apresenta") e as reações nas cenas.

- Como se conhece alguém: contratar, gravar ou tocar junto, festival, premiação, apresentação por um amigo em comum, visitar o lugar onde a pessoa está. A imprensa só dá reconhecimento, não intimidade.

- Com o tempo: a passagem do tempo é um evento do motor (uma vez por mês): a intimidade esfria sem contato, devagar e com piso. Presentes, favores, promessas cumpridas e trabalho bem-sucedido aproximam; calote, traição e escândalo afastam. Rival vira inimigo só com motivo registrado.

- Onde aparece: ícone ao lado de cada nome; aba "Conhecidos" em Você; o presente lista quem você conhece; clique direito mostra "como se conheceram".

- Saves: não é preciso adaptar saves antigos (o jogo ainda está em testes); partidas novas começam com o grafo limpo.

- Desempenho: o grafo guarda só pares que já tiveram contato (não todos com todos), com limite por pessoa e limpeza dos laços frios de quem saiu de cena.

## O que se sabe de cada pessoa

Regra única de conhecimento, lida por todas as telas (ficha, comparador, cenas, leilões e até a bolsa, para o preço das ações não revelar potencial secreto):

- Público: nome, foto, gênero, cidade, gravadora, discografia, posições nas paradas, prêmios e fama aproximada. Visível para gente famosa mesmo sem contato; para gente desconhecida, quase nada.

- Imprensa: escândalos, romances públicos, brigas conhecidas. Quanto mais famoso, mais da vida privada vira público.

- Contato pessoal: personalidade aproximada, humor, gostos, a opinião sobre você.

- Sondagem do olheiro: talento e potencial em faixas que estreitam com o nível da sondagem; nunca o valor exato de quem não é seu.

- Seu pessoal: tudo, menos o que é segredo de verdade (por exemplo, o mínimo que ele aceitaria numa renegociação).

Como está hoje: não existe uma fonte única do que você sabe; cada tela usa uma regra diferente (há pelo menos cinco), e foram achadas 25 incoerências. As principais:

- A "névoa" não esconde: várias faixas de valor ficam centradas no número real, então o meio da faixa entrega o valor exato.

- Segredos vazando: potencial aparece cedo demais e, em algumas telas, exato; estresse e risco de colapso de qualquer pessoa aparecem exatos; favores, segredos e chantagens entre NPCs aparecem todos; ligações com crime aparecem mesmo quando são só boato; o valor exato da chance de uma oferta revela o mínimo secreto da negociação.

- Contradições entre telas: política e família aparecem numa aba e ficam escondidas em outra; um vício que já virou escândalo público continua "?"; amizade conta na ficha mas não no comparador nem na negociação; a fama mostrada é a mundial, mas o que você sabe depende da fama no seu país.

- Opinião de quem nunca te viu aparece como "0 · nada marcante" em vez de "não te conhece".

- "Todos os artistas" lista o mundo inteiro e a ordenação por fama e momento vaza o que as colunas escondem.

- Rivais: dívida e passivos de selos rivais aparecem sem você ter participação, e há dois limites diferentes (5% e 25%) para ver informação interna. A inteligência dos rivais decide olhando o potencial verdadeiro dos artistas.

Correção: uma regra única de conhecimento para todo par observador → pessoa (inclusive NPC com NPC, selos rivais, imprensa e "o mercado" da bolsa), com os seis eixos acima, e uma tabela só de quais campos cada eixo libera. As faixas sempre têm desvio (o meio não é o valor real); fato público revela o campo (escândalo de vício mostra o vício). Bolsa e rivais leem o que o mercado e eles sabem, nunca o potencial real. Ordem: primeiro tapar os vazamentos graves (barato), depois as faixas, o diretório, a opinião, as finanças dos rivais e por último bolsa e inteligência dos rivais, com testes de invariantes. Detalhes: conhecimento.md.

## Aparência e sex appeal

Como está hoje: existe só em pedaços. O atributo Imagem e visual da ficha de cada pessoa é recalculado toda vez a partir de carisma, vaidade e palco, e já pesa no apelo conforme a era (pouco no rádio, muito na MTV e nas redes). Mas nada é guardado, então nada melhora nem piora. A "imagem" do artista é reputação (artística, popularidade, profissionalismo, imagem pública), não aparência; o dossiê tem o rótulo "Aparência" sem dado; academia, yoga e spa existem só para o jogador e só mexem em saúde e estresse.

### Fonte única

- Guardado na ficha da pessoa (artista, NPC e jogador, todos com o mesmo modelo): base física (sorteio fixo pela semente), forma física (muda devagar), estilo (figurino, cabelo, styling; cai sem manutenção), marcas temporárias com prazo (inchaço de cirurgia, lesão, olheiras de turnê, cabelo raspado) e segredos (cirurgia escondida).

- Calculado, nunca guardado: o atributo de imagem atual passa a ler esses dados e continua sendo o único ponto que entra no apelo. Sex appeal = aparência + carisma + estilo, com peso por era, gênero musical e público (pop, funk e era MTV pesam muito; jazz e erudito, pouco).

- Conhecimento: o público vê a aparência percebida, não a real; cirurgia escondida vira boato e a imprensa pode descobrir (vira fato público).

- Avatar: o visual do personagem reflete forma, cabelo e estilo; a mudança aparece no sprite.

- Família Fossati: fora do envelhecimento, como já decidido.

### Para melhorar (cada um é lugar na cidade, com cena interativa)

| Opção | Desde | Efeito | Risco | 

| Academia e personal trainer | 1950; boom da aeróbica nos anos 80 | forma sobe devagar; mais fôlego no palco | lesão por excesso | 

| Nutricionista e dieta | 1960 | forma e saúde | dieta radical derruba a saúde | 

| Estilista, figurinista, cabeleireiro | sempre (custo e qualidade por época) | estilo sobe rápido; precisa de manutenção | visual vira meme | 

| Dentista estético | lentes nos anos 2010 | sorriso; pesa na TV e no vídeo | — | 

| Dermatologista e spa | — | tira marcas; envelhecimento mais lento | — | 

| Cirurgião plástico | anos 50; botox 2002; harmonização 2018 | salto grande de aparência | dar errado, escândalo, boato, perda de autenticidade em gêneros "raiz" | 

| Consultor de imagem e fotógrafo | — | estilo e imagem pública | — | 

Paga com dinheiro pessoal, da empresa (cláusula de imagem no contrato) ou como presente: as três formas de compra de sempre. O artista pode recusar conforme vaidade e autenticidade; insistir pesa na relação.

### Para piorar

Idade (curva; alguns envelhecem bem e viram ícone), vícios (sistema de vícios atual), estresse, burnout e turnê sem descanso, ganho de peso numa pausa ou depressão, lesão no palco, acidente, briga (submundo), doença, cirurgia mal feita, tatuagem ou visual polêmico (bom ou ruim conforme a era). Cigarro e gritaria afetam também a voz.

### Eventos aleatórios (com escolha)

- Foto sem maquiagem viraliza: negar, assumir ou virar campanha.

- Transformação fitness: apelo sobe, a mídia fica em cima.

- Boato de plástica: confirmar, negar ou processar.

- Cirurgia dá errado: hiato, processo contra o cirurgião, imprensa em cima.

- Convite para ensaio sensual em capa de revista: apelo sobe; a reputação artística pode cair conforme o gênero; o artista pode recusar.

- Crítico comenta o corpo do artista: escândalo para o crítico, autoestima do artista cai.

- Corte radical vira tendência (ou meme).

- "Envelheceu como vinho": veterano ganha apelo com o público mais velho.

- Cirurgia nas cordas vocais: a voz volta melhor ou pior.

- Efeitos em outros atributos: autoestima e humor, estresse, saúde, fôlego, lealdade (se o selo forçou a cirurgia).

### Onde pesa

Apelo e efeito de videoclipe e TV; contratos de marca casados com a imagem da marca (luxo, jovem…); entrevistas, encontros e valor de contrato; venda de capa e merch; imagem do elenco no valor do selo na bolsa.

### Tom

Sem caricatura nem humor gordofóbico. A pressão estética (mais forte sobre mulheres) aparece como crítica histórica, usando a barreira que já existe. Opção "Pressão estética: normal / suave / desligada".

## Gente de verdade pelo mundo

Hoje os lugares da cidade já mostram alguns artistas (quem toca no bar, quem grava no estúdio), mas o dono e os funcionários são nomes inventados na hora.

- Cada lugar mostra pessoas que já existem na base e fazem sentido estar lá: na gravadora rival, o CEO e os artistas dela; na rádio, o locutor e o diretor; na casa de shows, o dono e quem toca na semana; no estúdio, o produtor e quem está gravando; na loja, colecionadores e músicos da cidade.

- Dono e funcionários são pessoas diferentes. O CEO não atende no balcão. Cada lugar tem um dono e uma equipe com funções próprias (vendedor, técnico, bartender, recepcionista).

- Bico de músico. O funcionário pode ser um artista pouco conhecido que trabalha ali para completar a renda: o vendedor da loja toca na noite, o técnico do estúdio tem uma banda de garagem. A ficha mostra os dois lados ("vendedor na Casa do Som · guitarrista da banda X").

- A vaga muda de mãos. Se esse artista assinar com uma gravadora (a sua ou de um rival) ou começar a viver de música, larga o emprego e outra pessoa assume. Se a carreira afundar, pode voltar a procurar trabalho. Visitar os lugares vira também um jeito de descobrir talentos.

- Quem ocupa as vagas sai primeiro de gente que já existe no mundo (músicos sem contrato, ex-artistas, parentes); só se não houver ninguém adequado o jogo cria uma pessoa nova, e ela passa a existir de verdade (pode ser conhecida, contratada, presenteada).

- A presença segue a agenda real: artista em turnê não aparece na cidade; quem morreu ou foi preso some.

- Clicar na pessoa abre a ficha. Visitar o lugar é uma forma de conhecer alguém (liga com o sistema de conhecidos).

- Na rua do Nosso mundo, de vez em quando um rosto conhecido passa (seu ex-artista, um rival, um crítico).

## Interiores dos lugares do Nosso mundo

Hoje há 12 tipos de interior: casa de shows, loja de discos, rádio, estúdio, bar, jornal, sala de ensaio, gravadora, escritório, prédio residencial, hotel e loja de instrumentos. Neles só as pessoas são clicáveis, os objetos não. E 6 deles não têm nenhuma ação: gravadora, ensaio, escritório, residencial, hotel e loja de instrumentos.

Proposta: todos os interiores seguem as mesmas regras das cenas.

- Sempre interativos: pessoas e objetos clicáveis, com dica e ação.

- Época: o interior muda com o ano. A loja de discos vende partitura, 78 rpm, LP, CD ou vinil de colecionador; a rádio vai do microfone de fita ao estúdio de podcast.

- Gente de verdade: dono, equipe com músicos fazendo bico e quem está lá naquela semana, seguindo a agenda.

- Seu rastro no mundo: seu disco na prateleira e no toca-discos da loja, seu cartaz na porta da casa de shows, sua música tocando na rádio, seu artista no ensaio.

Ações por lugar:

| Lugar | Objetos e pessoas clicáveis → o que fazem | 

| Casa de shows | palco → marcar data; bilheteria → lotação e cachê; dono → negociar; cartaz → quem toca na semana | 

| Loja de discos | prateleira → seus discos e os mais vendidos da cidade; balcão → ação de vitrine (promoção); cliente → o que o público está ouvindo | 

| Rádio | locutor → pedir entrevista ou execução; disco no ar → o que toca; diretor → parceria | 

| Estúdio | mesa → alugar sessão; produtor → contratar; banda gravando → ficha | 

| Bar e clube | palco → ver quem toca (descobrir talento); balcão → conhecer gente; mesa → encontro marcado | 

| Jornal e revista | redator → entrevista; crítico → ficha e opinião sobre você; capa → manchete da semana | 

| Sala de ensaio | bandas ensaiando → descobrir talento; agenda → alugar para seus artistas | 

| Gravadora rival | CEO → conversar, propor sociedade ou compra; artistas dela → ficha e sondagem (seguindo as regras de contrato); parede de discos de ouro → catálogo do rival | 

| Escritório (advocacia, contabilidade, agência) | contratar o serviço; profissionais → ficha | 

| Prédio residencial e hotel | moradores e hóspedes conhecidos → ficha; recepção → onde está hospedado quem está em turnê na cidade | 

| Loja de instrumentos | a loja nova: comprar para você, para a empresa ou de presente | 

Se o lugar for seu (você comprou a casa de shows, o bar ou o estúdio), o interior mostra também a gestão: equipe, caixa do lugar e programação, tudo clicável.

## Submundo no mundo

Hoje são cerca de 24 facções (EUA, Brasil, Reino Unido, Itália, Japão, Colômbia, México e algumas digitais). Não vão todas para o mapa.

- Só as do seu país no Nosso mundo: as facções que operam no país da sua sede (normalmente 1 a 3) têm fachada fixa na cidade (restaurante, boate, galpão no porto, cassino), marcas nos muros e gente na esquina, sempre visíveis, de dia e de noite (de noite com mais movimento). Facção do país com base em outra cidade aparece só como um contato (o bar do emissário); a base fica no mapa-múndi. Mudar a sede de país ou abrir filial muda quem aparece.

- Polícia: mais calor na região = mais viaturas passando e paradas.

- Sala dos fundos (uma por facção, com o estilo dela): fundos do restaurante, barracão do baile, escritório do cassino, contêiner no porto, gabinete. Chefe e tenentes são pessoas do jogo, com ficha e opinião. Na mesa, os pedidos em aberto (show no baile, pedágio, proteção, empréstimo) e os envelopes do que você deve e do que te devem. Aceitar, recusar, negociar, pagar, denunciar.

- Mural de ligações (na sua sede): fotos dos chefes, fios entre facções (aliança, guerra), facções e artistas (seus e do mundo), facções e gêneros, e seus favores, dívidas e promessas. Mostra as do país e as de fora já contatadas. Clicar no fio conta a história da ligação.

- Delegacia (prédio fixo), com cadeia: as celas mostram as pessoas presas naquele momento (artistas, empresários, membros de facções, seus e do mundo), com quanto tempo falta; clicar abre a ficha e as ações possíveis (visitar, pagar fiança, advogado). Também: o detetive do seu caso, sua pasta na mesa com o que a polícia já sabe e o calor por cidade, informantes, cela com quem foi preso. Pagar advogado, subornar com risco ou colaborar (a facção não gosta).

- Mercado negro (beco ou galpão): estoque que gira como o da loja: cópias piratas, equipamento roubado e, raramente, uma relíquia roubada (chance por raridade, sempre uma que já existe). Barato, com risco de apreensão e escândalo; na lista de donos fica "comprada no mercado negro". Tem também o leilão silencioso.

- Baile ou festa da facção: cena de show na fachada da facção: seu artista no palco, chefe no camarote, polícia podendo chegar. Tocar até o fim, sair antes ou chamar a imprensa; resultado pelas regras que já existem.

- Facções de fora, pelo intermediário: na sala VIP do aeroporto (ou no porto e no hotel, conforme a época) um intermediário mostra todas as facções do mundo por país. Dá para contratar, mas mais caro (taxa do intermediário + custo de não ter operação no país), mais lento, com mais chance de falha e menos controle. Usar muito uma facção de fora pode fazer ela abrir operação no seu país e entrar em conflito com as locais. As digitais não têm fronteira depois da internet e não pagam a taxa de país.

- Todo país com cena musical tem ao menos uma facção: completar os que faltam. Reais só quando bem documentadas e seguindo as regras atuais (lacunas prováveis: França, Jamaica, Rússia, Hong Kong, Argentina, Nigéria, Canadá, Austrália); inventadas onde não houver nada documentado. Cada uma com a época em que surge e some.

## Aeroporto

Muda com a época, seguindo as datas reais: até 1919 a cidade tem só estação de trem e porto (o voo dos Wright é de 1903 e o aeródromo mais antigo, de 1909, era só um campo de pouso). O aeroporto aparece em 1919–1920 como campo de pouso pequeno (as primeiras linhas de passageiros), ganha terminal nas décadas seguintes, recebe jatos a partir de 1958 e, mais tarde, o hangar de jatinhos.

- Painel de partidas: para onde seus artistas estão indo (turnês, shows e gravações fora); clicar abre a turnê. Daqui se manda o olheiro para outro país e se abre turnê internacional.

- Desembarque: artistas estrangeiros chegando para tocar na sua cidade, para conhecer e convidar (abertura, participação). Seu artista voltando famoso: fãs e imprensa no portão, multidão do tamanho da fama.

- Alfândega: importar instrumentos e relíquias de lojas e leilões de fora; exportar discos (licenciamento). Inspeção com risco de apreensão e escândalo se for carga do mercado negro.

- Sala VIP: o intermediário das facções de fora e executivos estrangeiros com propostas de distribuição, sociedade ou compra.

- Hangar: seu jatinho, se tiver; fretar avião para turnê (poupa tempo e cansaço, custa caro).

- Acontecimentos da época: visto negado, deportação, greve aérea atrasando turnê, prisão na alfândega (os eventos que já existem passam a acontecer ali).

Tira texto de turnês internacionais, licenciamento no exterior, mudança de sede de país e abertura de filial.

## Transporte por época, cruzeiros e o futuro

- Notícias da aviação: o voo dos Wright (1903), a primeira linha aérea comercial (1914), o primeiro voo transatlântico de passageiros (1939) e a era do jato (1958) viram notícias no jornal do jogo.

- Você escolhe o transporte: hoje o jogo escolhe sozinho e de forma invisível (navio e trem até 1946, avião a hélice, jato em 1958, hyperloop em 2035). Cada trecho da turnê passa a mostrar as opções reais da época. Navio é lento, barato, cansa pouco e permite tocar a bordo. Trem é médio. Avião é rápido e caro (antes de 1946, opção cara e rara; depois de 1958, viável para turnê mundial). As datas do calendário da turnê passam a depender da escolha.

- Shows em cruzeiro: de 1900 a 1950, temporada nas orquestras dos transatlânticos, chegando ao destino da turnê. A partir de 1970, temporadas em navios de cruzeiro, parecidas com a residência em Las Vegas que já existe (pagamento fixo, pouca fama, bom para veteranos). A partir de 2000, cruzeiros temáticos que funcionam como festival no mar; na carreira de festival, dá para organizar o seu. Easter egg: rádio pirata em navio (como a Radio Caroline, 1964).

- Sem teletransporte: ele apagaria a logística da turnê, uma das mecânicas centrais. No lugar, o show por holograma (a tecnologia já existe no jogo a partir de 2027): um show transmitido para várias cidades ao mesmo tempo, com menos receita e menos fama que o ao vivo. Teletransporte só como boato no jornal de 2040, sem efeito.

## Casa de leilões

Calendário de leilões: cada casa tem sua frequência, que muda com a época e o tamanho da cidade: leilão local todo mês, leilão grande a cada 3 meses e leilão de prestígio a cada 6 meses (só nas capitais da música). Os lotes nunca se repetem: cada peça só volta a leilão se mudar de dono de verdade. O catálogo de lotes do próximo leilão aparece com antecedência.

Os leilões de relíquias e de catálogos/masters já existem, só em texto. Viram cena, que muda com a época: salão com lustre em 1900, auditório nos anos 70, tela de lances online estilo começo dos 2000, depois app.

- Lote no pedestal com o brilho do nível e a lista de donos na tela atrás.

- Leiloeiro com martelo conduzindo o ritmo.

- Plateia com plaquinhas: pessoas que já existem (CEOs rivais, colecionadores, artistas famosos). Se você conhece a pessoa, vê pistas (hesitação, quanto costuma gastar, se quer muito a peça); se não conhece, é só um rosto.

- Seus lances: levantar a plaquinha, com tempo por rodada, ou mandar um representante com limite de lance (como uma diretriz de delegação).

- Catálogo na parede com os próximos lotes do mês; balcão de consignação para vender suas coisas.

- Catálogo e masters: sala de reunião com lances fechados em envelope. Mercado negro: leilão silencioso, com risco.

- Ligações: preço recorde conta ponto de história e pode subir o nível da relíquia; o comprador entra na lista de donos; ganhar uma peça disputada pode fazer quem perdeu virar desafeto ou rival.

## Mecânicas em cena, sem perder profundidade

Três regras para todas:

- A cena é a frente do mesmo cálculo. A reação sai da conta que já existe (mínimo secreto da negociação, personalidade, opinião sobre você, ofertas rivais). Nada é inventado para a cena e nada secreto aparece.

- Os números continuam ali. Cada objeto é uma alavanca com o valor ao passar o mouse; "ver detalhes" abre o formulário completo de hoje.

- O repetitivo pode ser pulado. Modo rápido ou delegar a alguém da equipe, para o fim de jogo com 20–30 carreiras não virar uma sequência de cenas.

| Mecânica | Como vira cena | 

| Negociar contrato | Mesa com o artista e o empresário dele. Cada cláusula é um papel que você monta e empurra (adiantamento, royalties, anos, discos, controle criativo, bônus). Reação imediata: sorri, cruza os braços, cochicha, ri; oferta ridícula = levanta e sai e a negociação fecha por um tempo. Barra de paciência que cai por rodada (mais rápido em quem é impaciente). Pistas claras se você o conhece bem, ambíguas se não. A contraproposta volta com cláusulas riscadas; oferta rival aparece como carta na mesa. | 

| Renovar ou rescindir | Renovar: o artista chega com o empresário e uma lista de exigências; o histórico (promessas cumpridas, discos que deram certo) fica na mesa. Rescindir: cara a cara; aceita, chora, ameaça processo ou vaza para a imprensa, conforme a relação. | 

| Contratar funcionário | Entrevista na sua sala: o candidato reage a salário e função; dá para ligar para referências (pessoas que o conhecem); se vem de um rival, o rival pode cobrir a oferta. | 

| Planejar lançamento | Reunião com quadro branco: arrastar cartões (single, clipe, rádio, TV, turnê, imprensa) para a linha do tempo. A&R, imprensa e produtor opinam; a opinião sai da previsão real, pesada pela competência de cada um (funcionário fraco erra mais). | 

| Montar formação | Sala de ensaio: arrastar músicos para as posições; os integrantes reagem à química (olhares, briga, entrosamento); testar alguém novo vira jam de teste. | 

| Banco e empréstimo | O gerente olha seus papéis e reage ao balanço; juros de acordo com o que vê; devendo demais, crédito negado. | 

| Comprar empresa ou sociedade | Reunião com o CEO rival na sala dele; proposta montada como no contrato; sócios dele reagem; compra grande demais chama o antitruste. | 

| Jabá e lobby | Na rádio, o envelope ao diretor: aceita, recusa com desprezo ou denuncia, conforme a época e a pessoa. O risco aparece no rosto dele, não em porcentagem. | 

| Demitir ou punir | Cara a cara, com o resto da equipe assistindo pelo vidro; a moral do escritório muda na hora e aparece nas mesas. | 

| Cenas que já existem | Gravar, compor, show, entrevista, crise, diretoria, golpe, rede de favores e olheiro ganham o padrão novo: pessoas reais, reações conforme você as conhece, pular cena. | 

## O Nosso mundo completo

Mock aprovado. Feito com o desenho real da cidade; prédios repetidos e veículos chapados ganham arte própria na Onda 3.

1975 · com aeroporto

1905 · estação de trem e porto

- Veículos e pessoas em movimento continuam (carros, ônibus, trens, aviões, navios, carroças, pedestres), com acabamento melhor: entram e saem pela borda certa do mapa, seguindo ruas, trilhos, rotas de pista e de mar, em vez de surgir ou sumir no meio da cidade; somem atrás de prédios na ordem de profundidade correta; aviões decolam e pousam na pista; navios atracam no cais. Os veículos ganham desenho em perspectiva no lugar do perfil chapado.

- Mais neon: letreiros de neon nas fachadas (bares, boates, casas de show, cinemas, lojas de discos), seguindo a época: começa nos anos 1920, auge de 1930 a 1960, volta nos anos 80, e depois vira tela de LED. De noite, a cidade brilha mais. Entra com o agente de arte na Onda 3.

- Anúncios das paradas: outdoors e painéis no alto dos prédios mostram as capas que o jogo já gera. Painel pintado nos anos 1920, neon e luminoso de 1950 a 1980, iluminado por trás nos anos 90, LED a partir de 2000. Clicar no anúncio abre a ficha da obra.

- O que os anúncios mostram: as paradas do jogo já são separadas (Top músicas, Top álbuns, Streaming, Vendas, Clipes, por país e região). Os anúncios alternam entre os nº 1 de cada parada do seu país, cada um com o nome da parada (ex.: "Nº 1 em músicas", "Nº 1 em álbuns"). Não somamos tudo num número só, porque single e álbum são bases diferentes e somar daria um ranking que não existe. As paradas mostradas seguem a época (sem streaming antes da internet).

- Anúncio pago: você pode comprar um outdoor para o seu lançamento (ação de marketing que já existe, agora visível na cidade). Rivais também compram.

## Cidade maior e lugares reais

- Tamanho: hoje o máximo é 29 × 24 quadrados, com 34 terrenos em 4 bairros (Centro 20 × 16; leste em 1960 ou sede nível 2; sul em 1985 ou nível 3; bairro novo em 2010 ou nível 4). Passa a ir até 44 × 32, com cerca de 70 terrenos em 7 bairros: os 3 novos (porto/estação, zona de casas de show, centro financeiro) abrem pela época e pelo tamanho da empresa. Arrastar e zoom no mapa. Filial em outra cidade ganha o próprio mapa, em vez de um mapa gigante. Os terrenos podem ser reorganizados livremente (saves antigos não precisam abrir).

- Lugares reais da música: hoje há 94 marcos reais (24 casas de show históricas e 5 estúdios lendários), mas só como silhueta no horizonte. Passam a ser prédios de verdade no mapa, com interior e pessoas: rádios e TVs (Gazeta FM e TV Gazeta na Paulista, Globo no Jardim Botânico, Rádio Nacional), casas de show (Canecão 1967–2010, Circo Voador desde 1982, Theatro Municipal, Credicard Hall, Bourbon Street), lojas (Galeria do Rock, desde 1963), estúdios e gravadoras famosas, e lá fora Abbey Road, Sun Studio e outros.

- Cada lugar só existe nos anos certos (quando o Canecão fecha, o terreno vira outro negócio) e faz seu papel no jogo: a Gazeta FM é uma rádio do mercado de rádio (onde a Sonia trabalha), o Canecão é uma casa de shows onde você marca datas. Ficam em terrenos reservados, sem brigar com os que você compra, e seguem "Nomes e obras reais".

- Todas as 155 cidades do banco, em três níveis: capitais da música (cerca de 20 cidades, 10 a 20 lugares reais cada, ~300); cidades médias (cerca de 50, 3 a 6 cada, ~200); demais (cerca de 85, 1 a 3 lugares, a rádio ou casa de shows mais icônica, ~150). Cerca de 650 lugares reais, com curadoria e datas marcadas "verificar" quando houver dúvida; o resto da cidade usa lugares genéricos da época; a lista cresce depois pelo editor de base.

- Interiores reaproveitados: os 12 modelos de interior ganham variações de época; cada lugar real usa o modelo do seu tipo com uma "pele" própria (letreiro, cor, tamanho, palco grande ou pequeno); só cerca de 30 lugares famosos ganham interior único (Abbey Road, Canecão, Sun Studio, Apollo Theater, Cavern Club…). Arte nova: cerca de 15 modelos de fachada com variações de época, mais os 30 prédios únicos.

- Festival na cidade: nos meses em que há festival na sua cidade (seu, de rival ou real, como o Rock in Rio), ele aparece num terreno com palcos, público e cartaz do line-up; clicar abre o festival (comprar ingresso, ver quem toca, levar seus artistas). Festivais fixos (como a Cidade do Rock) usam o terreno deles; os outros ocupam um terreno livre ou parque durante o mês e somem depois.

## Comprar, ser sócio e criar em conjunto

Hoje você só pode fundar o seu próprio festival (com dinheiro do selo ou pessoal), sempre como dono único; os 63 festivais reais só aparecem como eventos do mundo. Passa a valer para festivais e também para casas de shows, rádios e estúdios:

- Comprar um existente, inteiro ou parte: preço pelo mesmo modelo de valor da bolsa (público, prestígio, histórico, dívidas). O dono pode não querer vender, conforme a relação com você; os lendários (como Sanremo) só vendem parte, ou nunca.

- Ser sócio: voto nas decisões (line-up, preço, data, programação) proporcional à sua parte; lucro e prejuízo na mesma proporção. Sócios discordam, e isso conta na relação entre vocês.

- Criar em conjunto: fundar com um parceiro (gravadora rival, prefeitura, marca patrocinadora, casa de shows), dividindo custo, risco e decisões, com o acordo definido no começo (quem escolhe a atração principal, quem cuida da produção) e renegociável na cena de negociação.

- Vender sua parte: para o sócio ou para um interessado, pelo preço do momento.

- Dono, sócio e parceiro aparecem no interior do lugar e no terreno da cidade; a participação entra no valor da sua empresa e no editor.

## Casa e cidade de cada época

mock · casa

### Sua casa no Nosso mundo
Comprar casa já existe (8 tipos, de 1920 a 2040) e ela já aparece, mas sempre no mesmo terreno. Proposta: tipos desde 1889, você escolhe o terreno, imóveis em outras cidades aparecem na faixa "pelo mundo" e dá para entrar na casa.

mock · eras

### O mesmo quarteirão em 1889, 1965 e 2005
Hoje a cidade muda ruas, carros e fachadas pela época, mas o tipo de cada loja é fixo e o ícone de loja de discos é sempre um CD. Proposta: cada tipo de loja tem anos de abertura e fechamento (partituras, discos, rádio, megastore de CD, lan house, celulares), os terrenos trocam de negócio a cada poucos anos e o registro da cidade avisa "fechou / abriu". O mapa ganha mais bairros e terrenos, só acrescentando, para os saves continuarem valendo. Nos mocks, as lojas de cada época ainda são só etiquetas; a arte de fachada é nova.

## Visual da interface por época

Nove estilos, que mudam sozinhos com a década (padrão). Também dá para fixar qualquer um, inclusive o de hoje. As cenas em pixel não mudam; só a moldura da interface. Todos passam no teste de contraste, e o alto contraste e o modo daltônico continuam valendo por cima.

Gazeta 1889–1919 · Déco Rádio 1920–45 · Jukebox 1946–64 · Hi-Fi 1965–79 · Fósforo 1980–89 · Janelas 95 1990–99 · Portal 2000 2000–07 · Plano 2008–19 · Vidro 2020–40 · Estúdio (o de hoje)

hoje

Gazeta · 1889

Hi-Fi · 1970s

Fósforo · 1980s

Janelas 95 · 1990s

Portal 2000 · 2000s

Vidro · 2020s

opção e aviso

## Telas poluídas

Hoje são 8 seções, cerca de 90 páginas e 315 abas, com 7 sistemas de menu diferentes. Em Finanças, o conteúdo só começa depois de 6 camadas de menu, abas e cabeçalho, e o caixa aparece 4 vezes. A mesma lista de artistas aparece em 7 lugares, a agenda em 6 e o histórico em 7.

hoje · Finanças

- Proposta (versão final, centrada no mundo): o menu lateral vira só as portas de entrada, com no máximo 10 itens. Hoje (Mesa do chefe: linha do tempo única, caixa de entrada única com boletim e alertas, quadro de metas, diário, pasta "Fios do Mestre") · Sede (a sede em corte; salas abrem estúdio, elenco, equipe, arquivo com 3 armários, troféus e relíquias com o Hall da Fama, mural do submundo, garagem, rua dos projetos, vitrine) · Cidade (Nosso mundo; prédios abrem interiores, incluindo os novos: banco, corretora, tribunal, delegacia, mercado negro, fachadas das facções, estação/porto/aeroporto, leilões, prefeitura com Sociedade, emissora de TV, estúdio de cinema) · Mundo (mapa-múndi com camadas: turnês, filiais, mercados, política, festivais, facções de fora, cultura) · Você (interior da sua casa) · Listas (a única tela de texto: artistas, contratos e direitos, finanças, paradas, calendário completo, dados de mercado, "Mais") · Buscar (Ctrl+K, absorve o Índice e acha lugares) · Opções (Arquivo, Campanha, Ajuda e "Menu completo", desligado por padrão, que mostra a árvore de 7 seções). Aparecem só quando fazem sentido: Fixados e "Suas casas" (2+ carreiras). Atalhos Shift+1 a 6 para os itens, sem conflito com os atalhos atuais.

- Cada carreira tem a sua "Sede": o item Sede abre a casa da carreira principal e muda de nome (gravadora: sede; músico: sala de ensaio e camarim; empresário: escritório; agência: prédio com mapa de turnês; festival: terreno do festival; casa de shows: seu interior; produtor: seu estúdio; editora: escritório; mídia: redação ou emissora; plataforma: sala de servidores; cinema e TV: estúdio de cinema; crítico: sua mesa no jornal). Carreiras secundárias são prédios seus na cidade, com ★. "Depois do palco" (voltas e segundas carreiras) fica no bar.

- Contadores no menu ("Sede 2", "Cidade 1"); ao entrar, a sala ou o prédio com pendência pisca.

- Mapeamento completo: as 80 páginas e as 12 páginas de carreira de hoje têm destino definido (conferido por script). Plano detalhado: plano-telas.md.

- No máximo 6 abas visíveis, o resto num "Mais".

- Um cabeçalho curto só, sem repetir a barra do topo.

- Contadores só onde há algo a fazer; no máximo uma etiqueta por linha.

- Barra do topo só com data, caixa, fama e Avançar. A Sede passa a ter um nome só.

- Nada se perde: cada página antiga abre no lugar novo, então links e atalhos continuam valendo. Só a interface muda; a simulação fica igual.

## Bandas de filmes, séries e animações

Entram na base como artistas normais (integrantes, gênero, cidade, época; contratáveis, lançam discos, entram nas paradas), com detalhes de fã como easter egg. Surgem no ano em que a história se passa, não no ano do filme.

- Ficção que virou real (seguem a carreira real nos modos históricos): The Monkees (1966), The Archies (1969), The Partridge Family (1970), Alvin e os Esquilos (1958), Blues Brothers (1978), Spinal Tap (1984), The Rutles (1978), Gorillaz (já na base), RBD (2004), Big Time Rush (2009), Hannah Montana (2006), New Directions de Glee (2009), Wildcats de High School Musical (2006), Violetta (2012), Patito Feo (2007), Chiquititas (1997), HUNTR/X e Saja Boys de Guerreiras do K-Pop (2025), Hatsune Miku (2007) e K/DA (2018), Lynn Minmay de Macross (1982), Ho-kago Tea Time de K-On! (2009), Kessoku Band de Bocchi the Rock (2022), Poppin'Party de BanG Dream (2015).

- Só na ficção: The Wonders (1964), Marvin Berry and the Starlighters (1955, De Volta para o Futuro), Soggy Bottom Boys (anos 1930), Eddie and the Cruisers (anos 60), Dewey Cox (1950–70s, Walk Hard), Stillwater (1973), Electric Mayhem (Muppets, 1976), The Be Sharps (Simpsons, 1985), Jem and the Holograms e The Misfits (1985), Josie and the Pussycats, Daisy Jones & The Six (anos 70), PoP! (anos 80, Letra e Música), The Commitments (1991), Wyld Stallyns (1989), Crucial Taunt (1992), The Lone Rangers (1994), Sadgasm (Simpsons, grunge), Jesse and the Rippers (Três é Demais), Zack Attack (Galera do Barulho), Dingoes Ate My Baby (Buffy), Steel Dragon (2001), Infant Sorrow (2008), Sex Bob-Omb (2010), Dethklok (2006), Connect 3 (Camp Rock, 2008), Conner4Real e The Style Boyz (2016), Fire Saga (Eurovision, 2020), Drive Shaft (Lost), Mouse Rat (Parks and Recreation), Sing Street (1985), Jackson Maine e Ally (Nasce uma Estrela), Rayna Jaymes (Nashville), a família Lyon (Empire).

- Ligação com a obra: na estreia do filme ou da série, notícia no jornal e pico de fama, como uma trilha sonora.

- Detalhes de fã: o amplificador que vai até 11 pode virar relíquia; a "missão de Deus" dos Blues Brothers; The Wonders com um único sucesso enorme e o fim; Hatsune Miku e K/DA usando o show por holograma; Marvin Berry ligando para o primo Chuck em 1955. Conquista secreta: contratar uma banda de ficção.

- Direitos: seguem o interruptor geral "Nomes e obras reais" (seção abaixo).

- A lista final é conferida pelo agente (datas, cidade, gênero, integrantes) e pode crescer com outras do mesmo tipo.

## Homenagem à família Fossati

Efro, Lucia, Sonia e Antonella Fossati existem no mundo do jogo como pessoas, em todas as partidas, com homenagem discreta e respeitosa. Gianluca entra na árvore da família como pessoa do jogo, sem homenagem. A família aparece sempre com o nome real, mesmo com "Nomes e obras reais" desligado; marcas reais ligadas a ela (rádios, artistas agenciados) seguem o interruptor.

- Sempre presentes: não envelhecem nem morrem e estão na sua cidade em qualquer ano de início, sempre em lugares e papéis que fazem sentido para a época. Exemplos: a Metalmac fabrica as prensas da época (de gramofone em 1900, de LP em 1950, linhas de CD nos anos 90); a Sonia faz promoções no veículo da época (salão de eventos e jornal antes do rádio, a rádio principal a partir de 1922, as FMs dos anos 2000) e vira empresária nas décadas mais recentes; a Antonella produz teatro e escreve no jornal nas épocas antigas e tem a escola de idiomas nas recentes. A única mudança de vida é a Sonia se aposentar como empresária no fim.

- Efro (engenheiro mecânico, empresário, violinista, piloto, tenista): a Metalmac, empresa dele, fornece máquinas de prensagem; contratar a Metalmac melhora a qualidade da fabricação dos seus discos. No aeroclube ele tem um avião pequeno e oferece um voo panorâmico uma vez por partida. O clube de tênis vira um lugar da cidade para conhecer gente importante.

- O violino do Efro: relíquia de nível Mítico presente em todas as partidas. Nunca vai para um rival; se ficar com você, ganha história própria.

- Lucia (dona de casa, o coração da família): almoço de domingo na casa dela alivia o estresse e aumenta a moral dos seus artistas (o lugar para recuperar alguém em crise). "A lasanha da Lucia" é um presente que agrada qualquer pessoa. É ela quem reúne a família.

- Sonia: na era das FMs (cerca de 2000 a 2020) é diretora de promoções e eventos de rádio (89, Virgin e Gazeta FM); em outras épocas, no veículo equivalente. Com ela dá para fazer eventos promocionais com seus artistas. Depois vira uma das melhores empresárias de artistas do jogo, contratável; com nomes reais, Milton Guedes aparece como artista dela.

- Antonella: nas épocas antigas (até cerca de 1996), produtora de teatro (seus artistas podem fazer temporada ou trilha) e jornalista (porta aberta para entrevistas). Depois abre uma escola de línguas: seus artistas aprendem qualquer idioma e a barreira de língua daquele país diminui nas paradas.

- Gianluca: pessoa da árvore da família e fundador da Arara.

- Homenagem: praça "Efro e Lucia Fossati" com placa clicável; dedicatória na abertura e nos créditos ("Para Efro, Lucia, Antonella e Sonia"); conquista "Famiglia" ao conhecer todos.

## Arara e o filme

- Arara Trips: agência de viagens na cidade que organiza a logística das turnês, com o jeito de cada época (passagem de navio em 1900, app em 2020).

- Mascote: uma arara de verdade às vezes pousa no letreiro da sede; clicar dá uma frase. Dar o nome "Arara" ao seu selo libera um logotipo especial.

- L'educazione della nonna: coprodução Brasil–Itália com lançamento em 2027. Estreia nos cinemas de São Paulo e de uma cidade italiana, sai no jornal e abre uma oportunidade de trilha sonora para um artista seu; com a escola de idiomas da Antonella e a origem italiana da família, é o elo Brasil–Itália do jogo. Sem sinopse no jogo

## Referências da cultura pop

Todas seguem "Nomes e obras reais" e ficam no humor e na ambientação, sem glorificar crime ou violência. Menos presas a um lugar: só algumas ficam fixas na cidade de origem (onde o lugar é a piada, como Albuquerque ou Nova Jersey); a maioria aparece onde você estiver (a lanchonete com concurso de dança, o bar onde todo mundo sabe seu nome, o maestro tirano, o café com sofá laranja podem surgir em qualquer cidade grande), para quem joga em São Paulo, Londres ou Tóquio ver as referências. Há um controle central de frequência (no máximo poucas por mês) e uma opção para reduzir humor e referências; memes não aparecem em morte ou tragédia, a menos que você ligue a opção "humor em situações sérias".

- Séries de crime: Breaking Bad (Albuquerque 2008–13: restaurante de frango como fachada, professor de química chefe, cristal azul no mercado negro, advogado brega contratável no tribunal) · Família Soprano (Nova Jersey 1999–2007: boate como fachada, chefe que faz terapia, "Don't Stop Believin'" volta às paradas em 2007) · Dexter (Miami 2006–13: analista de sangue arrumado demais na delegacia, só a piada) · O Poderoso Chefão (o cantor e "a oferta que não se pode recusar" como evento de negociação) · Peaky Blinders (Birmingham ~1919) · Narcos (Medellín, já no jogo) · Ozark (lavagem por negócios de fachada).

- Filmes: Cinema Paradiso (o projecionista e o cinema que fecha nos anos 80) · Pulp Fiction (concurso de dança, 1994) · Os Embalos de Sábado à Noite (discoteca no Brooklyn, 1977) · Dirty Dancing (temporada em resort, 1963) · Footloose (cidade que proíbe a dança, 1984) · 8 Mile (batalha de rap em Detroit, 1995, evento de talentos) · Whiplash (maestro tirano como produtor) · La La Land (clube de jazz) · Yesterday (raríssimo: o mundo esquece uma banda famosa) · Coco (violão-relíquia e música roubada, pelo sistema de plágio) · Inside Llewyn Davis (café folk, 1961) · Rocky (tema que vira hino) · Grease (o carro "Greased Lightning" à venda, 1959) · banda da cantina de Star Wars · The Weird Sisters de Harry Potter (2005).

- Séries: Vinyl (HBO, 1973, o selo American Century) · Succession (conglomerado de mídia tenta comprar seu selo) · La Casa de Papel ("Bella Ciao" volta às paradas em 2018) · Cheers (o bar onde todo mundo sabe seu nome) · Happy Days (a jukebox que liga com um soco) · The Get Down (Bronx, 1977) · Atlanta · Lost (os números na loteria) · Ted Lasso (placa "Believe" na sede) · Cowboy Bebop e Nana · Mad Men, Friends, Seinfeld, Twin Peaks, The Office, Stranger Things (revival em 2022).

- Brasil: Cassino do Chacrinha (show de calouros, 1967–88) · Xou da Xuxa (vendas gigantes a partir de 1986) · Chaves · Os Trapalhões · Avenida Brasil (2012) · Castelo Rá-Tim-Bum · Roque Santeiro e Tieta · Cidade de Deus · Tropa de Elite.

- Games: Guitar Hero (2005, rock clássico volta a vender) · GTA Vice City (rádios dos anos 80) · Tetris ("Korobeiniki", domínio público).

- Red Dead Redemption 2 (ambientado em 1899): a partida pode começar em 1889, então encaixa. Um saloon com pianista e um teatro de variedades em Saint Denis (Nova Orleans) contratam artistas; uma gangue do Velho Oeste (Van der Linde) como facção nos EUA até cerca de 1899; a gaita do pistoleiro como relíquia; em 2018, a trilha do jogo vira notícia.

- Red Dead Redemption (1911): a fronteira com o México em 1911, com cantina e mariachis; um ex-pistoleiro como pessoa da cidade; em 2010, a música do jogo chega ao topo das paradas de trilha.

- GTA VI (lançamento em 2026, Vice City e o estado de Leonida): a notícia do lançamento no jornal; as rádios do jogo procurando músicas licenciadas (oportunidade de licenciamento para artistas seus); uma dupla de assaltantes como pessoas em Miami nos anos 2020; a tela "Wasted" como piada quando um artista seu sai de controle. Uma coincidência boa: a protagonista se chama Lucia, como sua avó.

## Artistas e relíquias reais que faltam

- Já estão na base: Xuxa, Sandy & Junior, Mamonas Assassinas, É o Tchan, Molejo, Só Pra Contrariar, Raça Negra, Rouge, Menudo.

- Entram (24 pedidos): Eliana, Angélica, Mara Maravilha, Simony, Turma do Balão Mágico, Trem da Alegria, Paquitas, Netinho, KLB, Br'oz, Chiquititas, Gugu, Sérgio Mallandro, Patati Patatá, Galinha Pintadinha, Palavra Cantada, Bia Bedran, Dominó, Polegar, Milton Guedes, Chacrinha e Silvio Santos como artistas (hoje só aparecem como figuras da TV), e a música "Ilariê".

- Gênero novo "infantil": hoje não existe; Xuxa e os artistas infantis caem em teen pop ou MPB.

- Mais 48 que faltam: 23 brasileiros (Luiz Caldas, Asa de Águia, Mastruz com Leite, Roberta Miranda, Wando, Waldick Soriano, Nelson Ned, Agepê, Gretchen, Ritchie, Kelly Key, MC Guimê, Banda Uó…), 7 latinos (Timbiriche, Gloria Trevi, Los Bukis, Los Ángeles Azules, Olga Tañón, Ricardo Arjona…), 5 europeus (Demis Roussos, Vicky Leandros, Dschinghis Khan, Isabel Pantoja, André Rieu), 9 asiáticos e 4 africanos (Momoe Yamaguchi, Pink Lady, Dreams Come True, Wonder Girls, Kumar Sanu, Barış Manço, Sharon Cuneta, Awilo Longomba, Yemi Alade, Mafikizolo). Há uma reserva de cerca de 70 nomes (Psirico, Belo, Zélia Duncan, Paulina Rubio, RBD…).

- Relíquias reais: hoje são cerca de 107. Já existem Il Cannone de Paganini, a Strat de Hendrix em Woodstock, o violão de Cobain no Acústico MTV, Blackie de Clapton, o Rolls-Royce de Lennon, a luva de Michael Jackson, itens de Elvis, os turbantes de Carmen Miranda e a sanfona de Luiz Gonzaga. Entram 30 novas, entre elas o Stradivarius "Messiah" (Ashmolean, Oxford), o "Lady Blunt" (US$ 15,9 mi em 2011), o piano Broadwood de Beethoven, o fortepiano de Mozart, o violão de "Help!" de Lennon, a guitarra "Wolf" de Jerry Garcia, o vestido "Happy Birthday, Mr. President" de Marilyn Monroe, o Cadillac rosa e o jato de Elvis, o piano de Tom Jobim, o violão de Raul Seixas e o instrumento de Pixinguinha. A mesa EMI de Abbey Road e a Yellow Cloud de Prince são corrigidas. Cada uma já vem com o nível sugerido.

- Cuidado: os detalhes marcados "(verificar)" na lista, principalmente as relíquias brasileiras, são conferidos pelo agente antes de entrar. Lista completa: artistas-reliquias.md.

## Memes, bolhas e fracassos

- Memes que viram mecânica: Rickroll (2007, música dos anos 80 volta às paradas como piada) · Gangnam Style (2012, primeiro bilhão de visualizações, K-pop explode no mundo) · "Friday" (2011, selo que cobra para gravar quem paga; a pior música do ano viraliza) · Trololo (2010, cantor soviético de 1976 volta 34 anos depois) · Numa Numa (2004) e Crazy Frog (2005, a era do toque de celular, que vende mais que single) · Old Town Road (2019, briga sobre o gênero de um lançamento) · Baby Shark (2016–19) · Harlem Shake (2013) e Ice Bucket Challenge (2014, evento de caridade) · "Stonks" na bolsa, "This is fine" com o caixa pegando fogo, "Press F" quando um artista morre, "It's over 9000!" quando a fama passa de um limite.

- Memes brasileiros: "Para Nossa Alegria" (2012, família gospel viraliza e recebe proposta) · "Luiza que está no Canadá" (2012, fama de um mês) · "Ah Lelek Lek Lek" (2013, funk de uma estação) · Gretchen (revival de fama nos anos 2010 como rainha dos memes).

- Bolhas para apostar: NFT (2021–22: vender o NFT do disco no auge dá dinheiro rápido, irrita parte dos fãs e vale quase zero em 2022; rivais entram também) · cripto e FTX (2022: patrocinador da turnê ou do nome da casa de shows quebra e deixa dívida) · metaverso (2021–22: show milionário que ninguém vê) · bolha de colecionáveis (estilo Beanie Babies, anos 90: o mercado de relíquias pode inflar e estourar) · bolha "ponto com" (2000: startups de música online que dão adiantamento e somem).

- Formatos e plataformas que fracassaram (apostas em tecnologia que dão errado, com perda para quem investiu na fábrica ou no catálogo nelas): fita de 8 pistas, MiniDisc, DCC, Laserdisc, Betamax contra VHS, SACD e DVD-Audio · Napster (fechado em 2001) · Myspace (em 2019 perde 50 milhões de músicas: seus lançamentos de 2003–2015 somem de lá) · Zune · Vine · Quibi · Clubhouse · Orkut.

- Escândalos reais da indústria: Milli Vanilli (1990, playback e Grammy cassado) · rootkit da Sony nos CDs (2005) · disco do U2 forçado no iTunes (2014) · lançamento do Tidal (2015) · Chinese Democracy (o disco que leva 15 anos para sair).

- Festivais: Fyre Festival (2017: o "festival de luxo numa ilha" de um rival desmorona, e seu artista pode cair nessa como atração; na sua carreira de festival, cortar custos demais tem risco de virar um Fyre) e Woodstock '99.

- Tudo segue "Nomes e obras reais".

## Interruptor "Nomes e obras reais"

Hoje existe o modo "nomes reais", mas ele só cobre o que entrou na rodada 6 (os 100 artistas do catálogo, 22 gravadoras, festivais, veículos, plataformas, paradas e prêmios). Muita coisa real entrou depois direto nos dados e não troca. Proposta: um único interruptor que cobre tudo que pode infringir direito de terceiros.

- Ligado (padrão, como hoje): tudo com nome real. Desligado: tudo vira homenagem parecida, de forma consistente (o mesmo nome real vira sempre a mesma homenagem).

- O que cobre:

- artistas reais, integrantes, títulos de músicas e discos;

- gravadoras, editoras, empresas e ações na bolsa;

- marcas de instrumentos, equipamentos, carros, motos e aviões da loja;

- festivais, casas de show famosas, prêmios, paradas, revistas, emissoras e plataformas (inclusive a ligação com o Spotify);

- facções reais e pessoas reais ligadas a elas;

- bandas e personagens de filmes, séries e animações;

- citações, letras e melodias em easter eggs (só fica o que for domínio público);

- logotipos e capas que imitem os reais.

- Modos e cenários de jogo também: cenários e modos com nome ou premissa tirados de obras de terceiros ganham nome e texto de homenagem. O modo "Vida real exata" continua funcionando, seguindo a história documentada, mas com os nomes de homenagem.

- Onde fica: na Nova partida e em Opções. Pode ser trocado no meio da partida, porque a troca é só na hora de mostrar: os saves e a simulação não mudam.

- Para não escapar nada no futuro: um registro único de nomes de terceiros, cada um com a sua homenagem, e um teste que varre os dados e falha se um nome real novo entrar sem homenagem. Isso vira regra do briefing comum dos agentes de todas as ondas.

## Demais pedidos

- Comparar artistas. Já existe, mas só com seus artistas e os já sondados, e mostra alguns números reais mesmo de quem você não conhece. Proposta: comparar qualquer artista conhecido, mostrando só o que você sabe; o resto aparece "?" com link para mandar o olheiro.

- Linha do tempo no cockpit. Só visualização: junta calendário, agenda, rollouts, festivais, turnês, contratos, dívidas e vida pessoal em faixas (empresa, artistas, lançamentos, palco, dinheiro, vida, mundo). Zoom de semana a década, clique leva ao lugar de origem. Do mundo, mostra só o passado e o já anunciado.

- Conquistas. Hoje todas as bloqueadas ficam escondidas. Passam a aparecer com nome e como ganhar; as secretas continuam "???". Novas conquistas: "Run completa" (1889 a 2040), relíquia mítica, presente que virou relíquia, casa em três épocas, e uma secreta do Edison.

- Easter egg do Edison. Já existe um (demonstração do "Mary had a little lamb" em 1889–90). Novos: o "Tone Test" de 1915–25 (a plateia não sabe se é sua banda ou um disco Edison); um visitante raro na loja comprando cilindros antes de 1931; o fonógrafo da Sede tocando o "Mary" original.

- Tudo dentro do jogo. Hoje há cerca de 40 janelas do navegador (confirmar, digitar nome, PIN de perfil, renomear save, colar código). Todas viram painéis do jogo, inclusive criar e editar perfil. Um teste impede que janelas do navegador voltem. Só o seletor de arquivo do sistema continua (não dá para substituir), mas ganha uma área de arrastar e um campo para colar.

## Carreiras com decisão que muda o mundo

Hoje quase todas as carreiras transformam sua escolha num pequeno impulso global, sem efeito no país nem nas paradas. Na rádio, por exemplo, você escolhe artistas (não músicas), cada vaga vale cerca de +0,25% nas vendas da semana e não existe audiência. O mercado de rádio de verdade (formatos por época, diretores de programação, rotação leve e pesada, efeito real nas paradas) já existe no jogo, mas a sua rádio não faz parte dele.

Peça comum: uma função única de execução (música × lugar × peso) alimenta as paradas por país e a fama local, usada por todas as carreiras abaixo. Sua empresa tocando seu próprio selo é limitada por conflito de interesse e pelos retornos decrescentes que já existem, para nunca virar máquina de sucesso.

- Rádio: sua rádio entra no mercado de rádio de verdade, numa cidade e com formato da época. Você monta a programação semanal com músicas em rotação pesada, média, leve e "aposta", com poucas vagas por formato. A audiência é disputada cidade a cidade com as rádios rivais, com ibope por trimestre, e a receita de anúncio segue a audiência. Execuções = audiência × rotação × peso do rádio na época, indo para a fama no país e as paradas. Tensões: sucesso segura audiência mas não dá prestígio; artista novo custa audiência agora e, se estourar, dá fama de "ouvido de ouro"; rotação pesada demais cansa; rivais copiam seu formato; jabá por música com risco legal por país e época; tocar seu selo custa audiência. Diretor de programação contratável pela tela de delegação.

- Revista e TV: o mesmo esqueleto: capas e críticas pesam pela tiragem; rotação de clipes na TV.

- Plataforma: playlists próprias com vagas limitadas; streams = seguidores × posição × quanto o público salva, indo para as paradas; assinantes por país. Tensões: gravadoras grandes exigem vagas, favorecer seu selo é conflito, fazendas de streams.

- Casa de shows e festival: a programação do mês e o line-up são a decisão. Quem toca ganha fama na cidade conforme a posição no cartaz e a nota da edição; quem estoura no palco ganha um empurrão curto nas paradas. Tensão: artista novo esvazia a casa, mas dá prestígio.

- Agenciamento: as turnês dos clientes passam pelo motor real de rotas, com mercados-alvo.

- Empresário: o plano de carreira vira pedidos reais a gravadoras, festivais e produtores, que podem recusar.

- Estúdio e produtor: a gravação vira a qualidade real do próximo disco do cliente; uma assinatura de sucesso empurra aos poucos a tendência do gênero.

- Editora: música colocada vira um disco de verdade de outro artista; trilha sonora pelo motor de sincronização que já existe.

- Crítico: peso por país e lista de melhores do ano.

- Cinema e TV: a música do filme entra nas paradas na proporção da bilheteria.

### Cada carreira com progressão, fim de jogo e cena própria

| Carreira | Progressão | Desafio de fim de jogo | Cena-assinatura | 

| Gravadora | selo pequeno → independente forte → major | gerir o catálogo, segurar estrelas na renovação, sobreviver à troca de formato | reunião de lançamento (quadro branco) | 

| Músico | garagem → bar → contrato → estádio → lenda | envelhecer no palco, brigas na banda, reinvenção ou despedida | sala de ensaio e camarim | 

| Empresário | 1 cliente → agência com vários empresários | clientes disputando a mesma vaga, cliente que te troca, reputação | escritório com quadro de clientes | 

| Agente / promotor | rotas regionais → nacionais → mundial | promotoras gigantes, cambismo, casas exclusivas | mapa de rotas com calendário | 

| Casa de shows | bar → casa média → arena → rede | vizinhança e prefeitura, novo × prestígio, redes rivais comprando casas | interior com palco e bilheteria | 

| Festival | bairro → nacional → lendário | edição que dá errado, clima, segurança, line-up disputado | terreno com palcos | 

| Estúdio / produtor | caseiro → referência → produtor-assinatura | som datado, era do home studio, equipamento lendário | sala de controle | 

| Editora | poucos compositores → catálogo grande → compra de catálogos históricos | disputa de direitos, plágio, catálogo envelhecendo | arquivo de partituras | 

| Mídia | uma rádio → rede → grupo de mídia | queda do rádio, concorrência por formato, censura e leis por país | estúdio da rádio com a grade | 

| Plataforma | startup → nacional → global | gravadoras exigindo vagas, repasse, fazendas de streams, regulação | sala de servidores com playlists | 

| Crítico | frila → editor → dono do veículo → cânone | credibilidade × acesso, suborno | redação com a pilha de discos | 

| Trilhas | comerciais → filmes → grandes estúdios | diretor × selo, prazos, prêmios | sala de projeção | 

Cada degrau traz objetivos próprios (RN-21/24); o fim de jogo de cada carreira só aparece quando você está grande (RN-24/34); a tensão central da RN-22 vira conflito mecânico. Os robôs da Onda 31.5 jogam as 12 carreiras até o fim.

Detalhes: carreiras.md.

## Editores para testar e personalizar

### Editor dentro da partida

- Onde fica: só aparece ligando Opções › "Modo editor (testes)" ou Ctrl+Shift+E; aí surge o item "Editor" no menu. Nenhuma outra tela ganha botão de editar. A partida que usou o editor fica marcada como "editada" e não conta para conquistas e recordes.

- Dinheiro: caixa do selo, dinheiro pessoal, dívidas, valores a receber.

- Pessoas: busca qualquer pessoa ou artista pelo nome e edita fama (mundial e por país), talento, potencial, humor, estresse, saúde, opinião e intimidade com qualquer outra pessoa, contrato, onde está, preso ou solto, e quanto você sabe dela.

- Empresas: selos rivais e empresas da bolsa (caixa, elenco, preço); sua sede (nível, salas, filiais, terrenos).

- Itens e relíquias: criar qualquer item ou relíquia, mudar nível, dono e quem está com ela; forçar o estoque da loja e o próximo leilão.

- Cenas e eventos: lista de todas as cenas, eventos e easter eggs; escolher participantes e rodar em "só ver" (sem efeito) ou "aplicar".

- Mundo: avançar N semanas ou anos, liberar tecnologias e formatos, mudar o calor da polícia e a força das facções, ligar e desligar cada sistema novo, e "ver tudo" (sem névoa de conhecimento).

- Controle e trapaças de teste: assumir o controle de qualquer empresa do mundo (gravadora rival, festival, casa de shows, rádio, editora, plataforma, agência), passando a jogá-la como sua; ter todas as carreiras ao mesmo tempo; "sem esgotamento" (agenda, energia e estresse sem limite para você); construção e reformas instantâneas; congelar rivais ou o tempo; tirar ou pôr qualquer pessoa num lugar, contrato ou cargo. Cada uma liga e desliga separadamente e fica no registro de edições.

- Ferramentas: foto do estado e voltar a ela, desfazer, registro de tudo que foi editado, exportar o estado com a semente para mandar quando achar um bug.

- Por baixo: sempre que possível a edição usa as mesmas funções do jogo (dinheiro passa pelo registro financeiro, relíquia muda de dono pela lista de donos), para o resto do jogo reagir de verdade; quando não houver, a edição é marcada como "crua". Desligado, o editor não faz nada; um teste garante.

### Editor de base (estilo pré-editor do Football Manager)

- Onde fica: na tela inicial, antes de começar uma partida: "Editor de base".

- O que edita: artistas e bandas (nome, integrantes, gênero, cidade, estreia, atributos, visual, discografia), pessoas (empresários, produtores, executivos, apresentadores, a família), gravadoras e empresas, relíquias e itens (nível, donos, onde estão), facções (país, época, força), lugares e casas de show famosas, festivais e prêmios, datas de tecnologias e formatos, cenários de início. Dá para criar, mudar e remover.

- Validação: o editor confere antes de salvar (datas impossíveis, cidade ou gênero que não existe, nome repetido, integrante em duas bandas no mesmo ano) e mostra o que está errado.

- Bases salvas: você dá nome à base ("Brasil anos 80 turbinado"), escolhe qual usar na Nova partida, e pode juntar várias (ex.: base original + seu pacote de bandas + o pacote da família).

- Baixar e compartilhar: exportar a base como arquivo (pequeno, porque guarda só as diferenças da base original) ou como código para copiar e colar; importar arquivo ou código de outra pessoa, com resumo do que muda antes de aplicar.

- Partidas com base editada: ficam marcadas com o nome da base; a mesma base + a mesma semente dão a mesma partida (para comparar e reportar bug). Conquistas valem só na base original.

- Versões do jogo: cada base guarda a versão em que foi feita; ao abrir numa versão nova, o jogo adapta o que for possível e avisa o que não deu.

- Nomes reais: nomes editados por você valem por cima do interruptor "Nomes e obras reais".

## Decisões tomadas

- Escopo: tudo deste plano entra na Masters 31, sem passar nada para a 32.

- Penalização pós-1990: sai. Entra pressão de mercado igual para todos e visível (ver ajuste abaixo sobre o que ela realmente altera).

- Menu: centrado no mundo, até 10 itens; a árvore de 7 seções só no "Menu completo" opcional.

- Cenas: estilo aprovado, sem a legenda numerada; com camada de clareza (abaixo).

- Estilos por época: os 9 aprovados, troca automática por padrão.

- Loja e relíquias: aprovadas, com nível por história, três formas de compra e chance por raridade.

- Família Fossati: sempre presente, papéis por época, sem envelhecer nem morrer.

## Ajustes depois dos pareceres

Dois pareceres revisaram o plano. Concordo com quase tudo; o que muda:

### Cenas resolvem, não só abrem

- Ação no lugar: as ações mais frequentes se resolvem na própria cena, num painel curto: clicar no telefone já mostra a proposta e permite responder; clicar no artista mostra situação, compromisso e ações; clicar na sessão ajusta a alocação sem sair do estúdio. "Ver detalhes" fica para investigar casos complexos.

- Regra de velocidade: toda ação frequente fica tão rápida quanto na versão 30, de preferência mais. Isso é medido (cliques e tempo para encontrar e concluir) antes e depois, numa lista fixa de tarefas.

- Dois cliques, definido: ação frequente = 1 clique depois de entrar no lugar; pendência = o atalho leva direto à ação certa; resultado de busca abre direto a ação, a pessoa ou a aba; consulta profunda pode ter mais passos, mas é medida.

- Mecânicas em cena com pressa: negociar, renovar, demitir têm sempre o modo de 2 cliques sem animação e a tecla de avançar; com 20–30 artistas, a delegação resolve o repetitivo.

### Camada de clareza nas cenas

- Rótulos curtos nos objetos principais (sempre no começo da partida, opcionais depois).

- Botão e opção persistente "mostrar tudo que é clicável".

- Área de clique maior que o desenho; teclado percorre e ativa os pontos (com foco visível); toque tem equivalente ao passar o mouse e ao clique direito; a lista acessível dos pontos vem do mesmo registro que desenha a cena.

- Pendências com texto e símbolo, não só cor nem só número: o telefone diz "3 decisões: contrato, atraso, dívida".

- Quatro níveis de alerta que não brigam entre si: bloqueio crítico, prazo próximo, decisão normal, informação. Só o crítico pulsa.

- Na primeira visita a cena ensina o que é cada objeto; depois, nada de tutorial obrigatório.

- Objeto decorativo não vira botão à força: interativo é todo objeto que significa uma ação.

- Filtro "lugares com ação" na cidade, para o mapa não virar o menu antigo espalhado.

### Ajustes nas cenas

- Projeto musical: a rua mostra o plano real daquele lançamento, com etapas opcionais e simultâneas (sem fábrica num lançamento digital, divulgação durante a gravação, clipe e turnê em paralelo, regravações e trilhas com caminho próprio).

- Elenco: a sala mostra só quem está fisicamente ali, seguindo a agenda; quem está fora aparece num quadro de fotos com a localização ("em turnê na Itália"). Os dois modelos não se misturam.

- Equipe em empresa grande: a visão agregada mostra só as exceções (falta de capacidade, orçamento estourado, diretriz travada, decisão que voltou para você).

- Catálogo: o cofre sai do arquivo; caixa e empréstimos ficam no banco e em Hoje.

- Turnê: reordenar a rota recalcula tempo, transporte, custo e conflitos pelo motor, com prévia antes de confirmar; datas confirmada, proposta e estimada são diferentes; dá para reordenar sem arrastar.

- Cidade: mapa maior só onde os lotes novos acrescentam lugar, progressão ou relação; a cidade é uma abstração da região (o porto pode ser de uma cidade vizinha), não um mapa literal.

- Estilos por época: todos usam os mesmos componentes e a mesma ordem de controles; validados com texto pequeno, tabelas densas, foco, desabilitado, erro e zoom. O estilo é só a moldura: fixar Janelas 95 não muda o equipamento desenhado em 1905.

- Bolsa e tribunal: são lugares na cidade (fachada e interior clicáveis), mas o conteúdo de cotações e processos é tabela dentro do lugar.

### Simulação

- Penalização: o código atual vale para todo lançamento do seu selo e para sua banda em selo de outro. Antes de trocar: registrar a fórmula, mostrar a diferença entre apelo, fatia de mercado, unidades e receita, e medir várias partidas. A pressão de mercado tem de alterar algo absoluto (a demanda total por lançamento ou a atenção disponível na época), porque um fator igual para todos numa fatia relativa se anula. A meta de começo tardio passa a ter período, unidade e capital definidos.

- Paradas por país: o teste certo é "mais fama local, com o resto igual, nunca diminui a demanda do próprio artista" (cair no ranking porque o rival cresceu mais é legítimo). Cota legal e preferência cultural são coisas diferentes e não se somam duas vezes. O mercado reservado ao artista local vira último recurso: só entra se língua, distribuição, público e divulgação por país não chegarem perto do histórico. Fama → vendas → parada → fama ganha limites e esquecimento para não criar estrelas eternas. Colaborações entre países usam a origem de cada artista e a língua da obra.

- Bolsa: o valor separa patrimônio (o que a empresa tem), capacidade de gerar resultado e expectativas, sem contar o mesmo valor duas vezes (um master entra pelo que rende, não pelo rendimento e de novo pelo catálogo). Gravadora, plataforma e rádio seguem os mesmos princípios com fórmulas próprias. Valor justo, preço negociado e o motivo da notícia são coisas separadas; nenhum evento mexe no preço duas vezes; o preço não pode revelar o potencial secreto de artistas (usa só o que o mercado sabe).

- Relíquias sem exploração: cada acontecimento de história conta uma vez só (com identificador); repetir dá cada vez menos; venda entre partes ligadas a você não vale como recorde; preço, raridade, autenticidade e importância são medidas separadas. Nível e disponibilidade também: peças de museu (como o Messiah) são Míticas e nunca vão a venda; Míticas negociáveis existem, raríssimas.

- Explorar não muda o mundo: abrir, fechar ou filtrar uma cena nunca cria pessoas, muda estoque, consome sorteio ou faz transação. Pessoas novas para vagas, estoques, presenças e lotes de leilão são gerados na virada do mês pelo motor, de forma fixa, e a tela só lê.

- Bens pessoais × empresa: pagador, dono e beneficiário são campos separados; usar o caixa da empresa para um bem que fica com você conta como retirada (pró-labore ou dividendo) e aparece como tal; bens perdem valor e têm manutenção. A medição de balanço verifica se retirar dinheiro e comprar bens vira atalho para enriquecer sem o risco da música.

### Contratos de dados, antes de qualquer agente

- Pendência única: cada decisão tem um identificador, um dono principal (o lugar) e pode aparecer em outros atalhos sem ser contada de novo; o número no menu conta decisões únicas.

- Destino: o caminho para cada ação considera área, aba, intenção, pessoa selecionada, país, época e carreira; voltar/avançar, fixados e histórico testados.

- Resultados por projeto: o registro de lançamentos guarda só 400 linhas, então há totais duráveis por artista, projeto e período; o contexto é gravado na transação que de fato aconteceu; atribuído + não alocado sempre fecha com o total; caixa, resultado e compra de bem separados.

- Objetos: modelo de item ≠ objeto individual (com identificador, origem, dono, quem está com ele e histórico); oferta aponta para o objeto; compra acontece uma vez; uma peça única não pode estar em duas lojas, no museu e no leilão ao mesmo tempo; roubo muda quem está com ela, não o dono. O limite de 90 relíquias passa a arquivar e compactar o histórico em vez de descartar peças com trajetória sua.

- Pessoas permanentes: uma pessoa com vários papéis por época (não várias pessoas); aposentadoria muda papel, não identidade; o violino do Efro nunca vai para rival e, se for roubado, sempre é recuperado; os efeitos da família são medidos e não obrigatórios para competir; a homenagem é ficção declarada.

- Conteúdo com curadoria: cada artista, banda de ficção, personagem e relíquia tem nome e apelidos, tipo (pessoa, banda, personagem, referência), anos, cidade, língua, fontes e campos a confirmar. Apresentadores (Chacrinha, Silvio Santos, Gugu) são pessoas da TV e só ganham discografia onde gravaram de fato. Por modo: histórico (ficção com carreira real entra definida), simulado (trajetórias alternativas), crossover (ficção pura e referências).

- Nomes reais: a troca é feita pelo identificador de cada coisa, não por substituição de texto (evita trocar homônimos). E trocar nomes não é garantia jurídica: para distribuição pública, o pacote precisa de revisão de direitos.

## Unificar motores e dados duplicados

O levantamento achou partes do jogo com mais de um motor ou mais de um lugar guardando o mesmo dado. Como os saves antigos podem ser descartados, cada grupo vira uma fonte única e os módulos antigos são apagados.

### Problemas reais encontrados

- Opinião sobre você guardada em vários lugares que não se falam (cerca de 45 pontos gravam num e outros leem de outro): um funcionário pode aparecer leal na ficha e levar a penalidade de "desmotivado"; o mesmo com críticos e ofertas.

- O que se sabe das pessoas: o mesmo artista estrangeiro aparece com fama exata numa tela e "?" em outra; larguras de faixa em três tabelas.

- Relação com cada cidade em três lugares, começando com 30, 50 e 0.

- Segredos em quatro lugares; os de intriga nunca vazam para imprensa e rivais.

- Casa: os dois sistemas aliviam o estresse ao mesmo tempo (soma em dobro) e a casa principal não entra no patrimônio.

- Diário gravado duas vezes, a cópia sem limite (o save cresce sem parar).

- Fim de jogo com dois motores diferentes.

- Calendário "único" sem shows de turnê, rotas, seu festival, passos do lançamento e quatro das cinco premiações.

- Avisos: três controles de quantidade de aviso e duas caixas de entrada.

- Reputação de gravadora: artistas julgam você por uma medida e rivais por outra; um terceiro cálculo não é usado.

- Cliente de empresário com "satisfação" num sistema e "confiança" em outro.

- Três relógios de crise diferentes.

- Dinheiro pessoal alterado direto em 81 lugares, sem registro (o caixa da empresa está limpo).

- Relíquias: lista única, mas três lugares de dados extras e duas definições; a explicação do valor esquece um multiplicador do preço.

- Moda de gênero muda a cada 3 anos sem olhar as paradas (desconectada das tendências).

- Casas de shows e rivais têm porta única, mas dados antigos por trás.

- Tamanho: 248 blocos de dados separados no save, 145 arquivos com histórico próprio, sorteios feitos de três jeitos (o sorteio único antigo, em 27 lugares, sai).

### O que vira fonte única, por onda

- Onda 0: opinião; o que se sabe das pessoas; fila única de avisos; tipo "papel" (uma pessoa, vários papéis); regra "nada tem data sem estar no calendário"; um só jeito de registrar acontecimentos (diário e avisos saem dele); fim do sorteio único antigo.

- 31.1: calendário completo; avisos e caixa de entrada unificados.

- 31.3: opinião aplicada em todo o jogo; casa única; diário sem cópia; reputação de gravadora única; delegação única; registro do dinheiro pessoal; relíquias com uma definição só e valor explicado por inteiro; moda de gênero puxada pelas tendências das paradas.

- 31.4: relação com cidades; segredos; e as fusões grandes: um motor de festival, um de casa de shows, um de turnê, um de empresário e um de rivais.

- 31.5: metas e fim de jogo num motor só.

Cuidados: cada fusão muda os valores de referência dos testes, remedidos na mesma onda com o motivo registrado; a fonte única do que se sabe tem cache semanal; fusões que mexem nos mesmos arquivos ficam com um só agente (festival, casa de shows e turnê juntos). Detalhes: unificacao.md.

## Como executar

Uma versão pública (Masters 31), várias ondas internas, uma build para você jogar ao fim de cada uma e um critério para seguir. As frentes de usabilidade, simulação e conteúdo ficam em ondas diferentes, para saber o que deixou o jogo melhor ou mais confuso. A arte pode adiantar em paralelo, mas nunca dois agentes decidem ao mesmo tempo o significado do mesmo sistema.

### Regras para os agentes

- Saves antigos: não precisam ser adaptados; o jogo ainda está em testes e saves da versão 30 podem ser descartados. Isso permite trocar estruturas duplicadas por uma só, sem pontes para o formato antigo.

- Plano mestre no repositório: cada requisito com identificador, responsável, dependências, tipo (interface, dados, ação, regra econômica), teste e critério de aceite. Novas exigências entram nele, não só num briefing. Um registro de decisões diz o que substituiu o quê.

- Briefing comum escrito uma vez (sorteio, testes, estilo de arte, textos sem dados crus, sem janelas do navegador, nomes reais registrados, "explorar não muda o mundo", todo sistema novo registrado nos dois editores); cada agente recebe só a parte dele, com arquivos e linhas já levantados.

- Contratos compartilhados (pendência, destino, pessoa, objeto, transação) têm um dono e são escritos antes da onda; ninguém muda identificador, sorteio ou chave contábil por conta própria.

- Testes: cada agente roda os seus; na junção rodam testes rápidos de integração e a suíte inteira. Atualizar um valor de referência exige explicar a diferença. Medições de economia: cada mudança sozinha, depois combinadas, em várias sementes e épocas (antes do rádio, LP, 1990, streaming, futuro).

- Revisor: ao fim de cada onda, um agente lê só a diferença da onda atrás de erros.

### Nuvem e seu PC

- Nuvem: agentes em paralelo, cada um na sua cópia; eu junto no ramo claude/friendly-brown-vpsmfl e envio.

- Seu PC: sessão local do Claude Code que roda a suíte, as medições de balanço e a build da onda.

- Passagem verificável: cada passagem diz o commit exato, os comandos, as sementes, o resultado esperado, os arquivos gerados e quem é o próximo. Um lado por vez no ramo. Roteiro em docs/r31/LOCAL.md.

- Prazo: sem promessa de horas antes de medir a primeira onda; reestimo com o tempo real dela.

### Onda 0 · contratos e ponto de partida

- Plano mestre, briefing comum, roteiro local e scripts de build e teste de fumaça no repositório.

- Contratos: pendência única, destino, pessoa (papéis, camadas de conhecimento), objeto (dono, quem está com ele, oferta), transação atribuída e totais duráveis, sorteios novos, interruptores.

- Registro de nomes reais vazio com o teste de varredura.

- Fontes únicas: opinião, conhecimento, fila de avisos, tipo "papel" das pessoas, regra do calendário, registro único de acontecimentos; fim do sorteio único antigo.

- Medição de referência da versão 30: cliques e tempo numa lista fixa de tarefas, desempenho (abrir telas, virar semana, salvar), tamanho do save, balanço em várias sementes.

- Para seguir: ponto de partida reproduzível e as contradições dos documentos resolvidas.

### Onda 1 (31.1) · clareza

- A · Menu e Hoje: menu de até 10 itens com faixas de "Lugares"; Hoje com as três perguntas (decidir agora, em andamento, o que mudou) e a linha do tempo única; Listas; Menu completo; cabeçalho único; barra do topo enxuta; abas com "Mais"; aliases; contadores por pendência única.

- B · Janelas dentro do jogo: painel de perguntas próprio, as cerca de 40 janelas do navegador trocadas, perfil e PIN dentro do jogo, área de arrastar arquivo, teste que proíbe janela do navegador.

- C · Base dos estilos: preferência "automático pela era", tokens, contraste e daltonismo corrigidos, aviso de troca (só o estilo de hoje por enquanto).

- EDT · Editores: editor dentro da partida (dinheiro, pessoas, empresas, itens, cenas e eventos, mundo, ferramentas) e editor de base na tela inicial (editar, validar, salvar, juntar, exportar e importar bases como arquivo ou código), cobrindo o que existe hoje. A partir daqui, o briefing obriga cada agente a registrar no editor o que o seu sistema permite editar, rodar e incluir na base, então os dois editores crescem junto com o jogo.

- UNI-1 · Calendário e avisos: calendário completo (turnês, rotas, festivais, lançamentos, premiações), avisos e caixas de entrada unificados.

- O · Fundamentos: motivo do bloqueio antes do clique com a condição para liberar (RN-04); estimado, reservado e a pagar (RN-03); fato, cálculo e hipótese (RN-27/28); painel rápido de ação (a peça que as cenas vão usar); busca que abre direto a ação; favoritos (RN-15) e metas pessoais (RN-09).

- Para seguir: as tarefas da lista fixa ficam iguais ou mais rápidas; cada carreira tem um percurso mínimo testado com o menu novo; páginas antigas continuam abrindo.

### Onda 2 (31.2) · cenas e gestão

- J · Hoje e projetos: Mesa do chefe em cena, Turnê (mapa e calendário), Projeto musical pelo plano real.

- K · Salas da sede: o seu personagem nas salas da sede; a cena-assinatura de cada carreira; Estúdio, Elenco (presença física + quadro), Equipe (exceções), Catálogo, Talentos, sala de troféus e relíquias.

- Q · Delegação: a tela estilo Football Manager, diretrizes de A&R e produtor executivo, registro de automação, visão agregada das sedes grandes (RN-16/17/18).

- V · Mecânicas em cena 1: negociar, renovar e rescindir, contratar, demitir e punir, montar formação, sempre com o modo de 2 cliques.

- L · Arte (começa aqui e segue): salas da sede por época e tamanho, objetos das cenas.

- Para seguir: as ações frequentes funcionam dentro das cenas com o mesmo resultado do formulário; pular cena e delegar seguem as mesmas regras; a empresa grande não exige mais cliques.

### Onda 3 (31.3) · economia, mercados e dados

- D · Mercado: pressão de mercado no lugar da penalização, previsão de vendas pela mesma conta, escolha de transporte (automática por padrão).

- Y · Paradas por país: fama local, língua, leis por país, dominó, limites; mercado reservado só se preciso.

- E · Bolsa: valor por empresa sem dupla contagem e sem vazar segredo, sorteio próprio, ficha "por que vale isso", eventos ligados.

- P · Resultados por projeto: etiquetas, totais duráveis, rateio declarado, não alocado, diário com contexto (RN-07/10).

- F · Conhecidos e conhecimento: grafo de todos com todos, cinco dimensões, regra única do que cada um sabe (substitui as cinco regras de hoje), as 25 incoerências corrigidas, rivais e bolsa sem ver potencial real.

- AP · Aparência: módulo único na ficha da pessoa (base, forma, estilo, marcas, segredos), sex appeal calculado por era, gênero e público; academia, nutricionista, estilista, dentista, dermatologista, cirurgião e consultor como lugares com cena; piora por idade, vícios, estresse, lesões e cirurgia mal feita; cerca de 12 eventos; avatar refletindo a mudança; opção de pressão estética. Depende de F (conhecimento) e usa o modificador de apelo atual.

- UNI-3 · Unificação de dados: opinião aplicada em todo o jogo, casa única, diário sem cópia, reputação de gravadora única, delegação única, registro do dinheiro pessoal, relíquias com uma definição, moda puxada pelas paradas; módulos antigos apagados.

- SOC · Sócios e compras: comprar festivais, casas de shows, rádios e estúdios existentes (inteiros ou parte), sociedade com voto e divisão de resultado, criação em conjunto com acordo renegociável, venda de participação; usa o modelo de valor da bolsa (E) e os conhecidos (F).

- U · Facções por país: países que faltam, presença no país da sede, intermediário, expansão.

- G · Objetos: itens com história, três formas de compra, presentes, níveis sem exploração, disponibilidade separada, chance por raridade, arquivamento em vez de descarte.

- Z · Família e base nova: pessoas permanentes com papéis por época, Metalmac, tênis, aeroclube, almoço, Sonia, Antonella, violino; artistas, bandas e relíquias novas com curadoria.

- CAR · Carreiras que mudam o mundo: progressão, desafio de fim de jogo e tensão central de cada uma das 12 carreiras; a função comum de execução e, nesta ordem, rádio (mais revista e TV), plataforma, casa de shows e festival, estúdio e editora, agenciamento, crítico, cinema e TV, empresário por último. Depende das paradas por país (Y). O que mexe em artistas que não são seus fica atrás de interruptores e é medido com o resto da onda.

- Para seguir: cada mudança medida sozinha e combinada, em várias sementes e épocas, com cada diferença explicada; totais conciliados; nenhuma relíquia duplicada ou perdida; bens pessoais sem atalho.

### Onda 4 (31.4) · mundo e conteúdo

- UNI-4 · Fusões grandes: um motor de festival, de casa de shows, de turnê, de empresário e de rivais (um agente só, porque mexem nos mesmos arquivos), relação com cidades e segredos únicos.

- H · Loja e cidade: loja (estoque troca na virada do mês), casa, garagens, lojas por época, mapa de até 44 × 32 com 7 bairros e zoom, lugares reais da música por cidade, festival aparecendo num terreno no mês em que acontece, neon e outdoors das paradas, veículos saindo pela borda certa.

- I · Gente e interiores: os 12 interiores interativos, o seu personagem presente em toda sala e interior onde estiver, pessoas reais com agenda, dono ≠ funcionário, músicos fazendo bico, cadeia com presos.

- S · Submundo: fachadas, salas dos fundos, mural, delegacia, mercado negro, baile.

- T · Aeroporto, transporte e leilões: aeroporto por época, cruzeiros, holograma, calendário de leilões e cena de lances.

- W · Mecânicas em cena 2: quadro do lançamento, banco, compra de empresa e sociedade, jabá; padrão novo nas cenas que já existem.

- R · Resultados e aprendizados: telas por projeto e coorte, biblioteca de aprendizados com amostra e contexto (RN-13).

- N · Extras: comparador, conquistas bloqueadas e secretas, Edison, bandas de ficção, cultura pop, memes e fracassos, homenagem da família, Arara, o filme; controle central de frequência e de tom.

- M · Estilos por época: os 9 estilos com teste de contraste, largura e estados.

- X · Nomes e obras reais: troca por identificador em textos, fichas, cenas e logotipos; modos e cenários; teste de varredura.

- Para seguir: tudo acessível, sem aumentar o trabalho obrigatório; interruptores de produção decididos.

### Onda 5 (31.5) · fechamento

- Metas e fim de jogo num motor só.

- Robôs por carreira (as 12, não só selo e artista), primeiros 30 minutos e fim de jogo de cada uma (RN-21/22/24/29/32/34).

- Balanço em várias sementes e épocas com tudo ligado.

- Salvar e carregar partidas novas sem perder nada (saves da versão 30 não precisam abrir).

- Desempenho contra a versão 30 (abrir cena, virar semana, vendas por país, salvar, tamanho do save; empresa grande e partida longa).

- Acessibilidade (teclado, toque, zoom, movimento reduzido, nada só por cor ou só ao passar o mouse).

- Regressão completa e uma rodada de uso real sua.

- Para lançar: todos os critérios cumpridos; teste adiado não conta como funcionalidade pronta.

### Como as ondas do plano de telas se encaixam

O plano de telas tinha ondas O0–O8: O0 → Onda 0; O1 (menu e lugares) → Onda 1; O2 (Hoje) → Ondas 1 e 2; O3 (Sede) → Onda 2; O4–O5 (Cidade e Mundo) → Onda 4; O6 (Você) → Onda 4; O7 (fusões e exclusões) → Onda 4; O8 (densidade e nova medição) → Onda 5.

Mapas de apoio: sistemas.md · plano-telas.md · artistas-reliquias.md.

## Como vai rodar

- Sem parar para aprovação: quando você mandar começar, faço a Onda 0, gero a build, te mando e já começo a Onda 1, e assim até a última onda, sem esperar ok seu entre elas.

- Builds no caminho: ao fim de cada onda você recebe a build (Masters_31_onda0.html, …_onda1.html, …) para jogar quando quiser; se algo te incomodar, me escreve e eu ajusto a onda seguinte, mas o trabalho não para esperando.

- Critérios de cada onda: continuam valendo, só que verificados por mim (testes, medições, teste de fumaça). Se uma onda não passar, corrijo antes de seguir.

- Seu PC: como o fluxo não espera ninguém, os testes e as builds rodam aqui na nuvem. O seu PC fica como reforço opcional: se quiser acelerar uma onda, eu aviso e você roda a parte local.

- Início: hoje à noite, quando você mandar.

◀ AnteriorTela cheiaPróxima ▶Fechar (Esc)


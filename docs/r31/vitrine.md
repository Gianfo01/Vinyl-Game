# R31 · onda 4 · VIT — Vitrine do mês (tabela final)

Pedido do dono: interiores dinâmicos no estilo da loja de instrumentos (que vende coisas diferentes a cada mês),
estendidos aos lugares que já existem.

## Motor

**Um motor só: `src/sim/r31/vitrine31.ts`.**

- **Quando sorteia.** O conteúdo do mês de cada lugar é sorteado no motor, nunca ao abrir a tela:
  - na virada do mês (gancho `month`), para o mês que começa;
  - na primeira semana da partida, para o primeiro mês (gancho `week`). Na nova partida os índices de pessoas e papéis
    ainda estão sendo montados, e ler gente cedo demais deixava caches velhos (o r27-consistency pegou isso).
  O sorteio usa o fluxo rng19 próprio `vit31`, registrado em `STREAMS19`. Explorar, abrir painéis e listar não sorteiam
  nem mudam o estado (há teste para isso).
- **Estado.** Fica em `x4.vit31` e guarda só referências ao mundo: lançamento, ato, pessoa, chave de ficha, selo,
  oferta e lote. Nome, texto, preço e motivo de bloqueio são lidos do estado na hora, sempre bilíngues.
- **Como escolhe.** O catálogo (`VIT_DEFS31`) cruza época × país × porte/prestígio do lugar × estado do mundo.
  - Cada lugar recebe 3 itens + até 2 pelo porte da cidade (editor: `vit31.slots`).
  - O sorteio é ponderado e penaliza repetir o mesmo tipo: cada repetição pesa 1/3, com no máximo 2 do mesmo tipo.
  - Item comum dura 1–3 meses. O raro dura 1 mês e pode sumir no mês seguinte.
- **Ações.** Toda ação é uma função que já existia no jogo:
  - `buyOffer31` (loja), `buyBm31` (beco), `scoutHere31` (radar), `meetHere31` (conhecer);
  - `doPlace27` (ações do lugar), `raise31` (lance), `commitCrime('wiretap')` (grampo), `denounce31` (denúncia);
  - na interface: ouvir prévia, abrir tela, ficha, painel rápido.
  O motor executa pelo `runVit31`. A interface só traduz as ações dela.
- **Fontes migradas (uma fonte só).** O motor da vitrine gera três estoques que antes tinham gancho próprio:
  - loja de instrumentos (`items31.restockShops31`);
  - beco (`under31.restockUnder31`; revenda e apreensão seguem no gancho do submundo);
  - lotes da casa de leilões (`auction31.restockAuction31`; o martelo segue no gancho semanal).

  A vitrine **não copia** esses estoques: ela os espelha na hora (`vitItems31`). O que a vitrine põe à venda entra no
  **mesmo registro** de objetos e ofertas (`items31.stockOne31`, holder `shop:<cidade>:<disc|gear|fair>`) e é comprado
  pela mesma `buyOffer31`. Quando o item sai da vitrine, `unstock31` tira o exemplar da venda. Os testes de contrato
  conferem que não há oferta órfã, duplicada ou copiada.
- **Interruptor `vit31`** (padrão ligado). Desligado, só as fontes migradas giram e o jogo fica como era (goldens
  idênticos, conferido). Ligado, entram o conteúdo novo e as duas regras econômicas:
  - ofertas novas à venda;
  - prejuízo da fita pirata do seu disco.
- **Editor (regra 10).**
  - `vit31.roll` sorteia de novo o mês agora: tira o que a vitrine pôs à venda e gira as fontes.
  - `vit31.slots` define quantos itens cada lugar recebe.
  - `vit31.pirate` define o peso do prejuízo da pirataria.

## Três fontes de aleatoriedade

| Fonte | O que lê | Exemplos |
|---|---|---|
| **Reflexo do mundo** (`world`) | paradas, falências (`closedYear`), mortes (`died`), moda de gênero nas paradas, turnês, sessões, boatos | lançamento das paradas, "esgotado" depois da morte, massa falida, moda do mês, cartaz, jukebox, no ar |
| **Raridade por época/porte** (`rare`) | catálogo de discos de época, ofício do músico famoso, porte da cidade (peso do raro = 0,3 + 0,7 × porte) | caixa de saldos com disco raro, instrumento "era de fulano", desconhecido abrindo a noite, contrato largado na mesa, garimpo da feira |
| **Encontros com gente real da agenda** (`people`) | músicos de bico (gente31), críticos ativos, empresários reais, chefes dos selos rivais, atos sem contrato da cidade | cliente comentando seu artista, músico sem dinheiro consignando, olheiro rival, jornalista e empresário no balcão, executivo hospedado, quem espera para assinar |

## Conteúdo por lugar

| Lugar | Item | Fonte | Época/condição | Desenho | Ações (funções existentes) | Duração |
|---|---|---|---|---|---|---|
| **Loja de discos** | Lançamento das paradas, **incluindo os seus** | mundo | lançado há < 26 semanas | disco | ouvir; seu disco → vitrine e autógrafos (`doPlace27 instore`); dos outros → radar; ficha | 1–2 meses |
| | Moda do mês (gênero que mais aparece nas paradas) | mundo | — | caixote | descobrir talentos (tela) | 1–2 |
| | **Caixa de saldos com disco raro** (pode virar relíquia) | raro · econômico | cilindro (até 1935), 78 rpm, partitura (até 1960), LP de 1ª prensagem (1950+), compacto promocional (1955+), fita demo (1972+), CD de 1ª tiragem (1983+), vinil redescoberto (2008+) | caixote | comprar para você ou para a empresa (`buyOffer31`); presente pela loja | 1 (raro) |
| | "Esgotado": a morte de um integrante faz o disco sumir e o usado encarecer | mundo | morte no ano | disco | ouvir; troféus e relíquias | 1–3 |
| | **Cliente comentando o seu artista** (boca a boca pelo embalo) | gente | precisa de artista seu com fama ≥ 5 | pessoa na cena | conhecer (`meetHere31`); ações do artista | 1 |
| | **Porta da feira dos fundos** (lugar novo da época) | — | sempre | — | entra na feira | — |
| **Feira / sebo / brechó** (dentro da loja de discos) | Garimpo de disco de época | raro · econômico | nome pela época: feira de 78 rotações (< 1950), sebo (< 1975), feira de fitas e discos (< 1995), brechó de CDs (< 2010), feira de vinil (2010+) | caixote | comprar (`buyOffer31`) | 1 |
| | Banda vendendo o próprio disco ou fita demo | gente | ato da cidade sem contrato e fora do seu radar | fita | radar (`scoutHere31`); propor contrato (painel rápido) | 1 |
| | Clássico usado de outros tempos | mundo | nº 1–3 com mais de 10 anos | disco | ouvir | 1 |
| **Loja de instrumentos** | Estoque do mês (migrado, espelho) e relíquia da vitrine | estoque | `items31` | guitarra / lote | comprar (você, empresa, presente) | o mês |
| | **Usado com história, "era de fulano"** (integrante de ato famoso ≥ 55; instrumento da função dele) | raro · econômico | 1900+ | guitarra | comprar (`buyOffer31`); preço ×1,6–2,4 | 1 (raro) |
| | **Consignado de músico quebrado** (músico de bico real) | gente · econômico | — | amplificador | comprar (×0,6–0,8); conhecer | 1–2 |
| | **Novidade tecnológica da época** (modelo lançado há ≤ 4 anos) | mundo · econômico | pelo `from` do catálogo | teclado | comprar (×1,15, novo) | 1–3 |
| | Massa falida (equipamento de selo que fechou no último ano) | mundo · econômico | falência real | equipamento | comprar (×0,45–0,65) | 1–2 |
| **Casa de shows** | Cartaz do mês (quem toca na semana ou em turnê na cidade; senão o maior ato ativo da cidade) | mundo (turnê) | — | cartaz | marcar data aqui (`doPlace27 show`); ficha | 1 |
| | **Desconhecido abrindo a noite** (possível revelação, potencial ≥ 60, sem contrato, fora do radar) | raro | — | pessoa na cena | radar; propor contrato | 1 (raro) |
| | **Olheiro rival na plateia** (chefe de selo; "de olho em X") | gente | selo da cidade (ou qualquer em cidade grande) | pessoa | conhecer; ficha do chefe; radar no ato visado | 1 |
| **Bar** | No balcão: músico de bico | gente | gente31 | pessoa | conhecer; ficha | 1 |
| | No balcão: jornalista (crítico ativo da época) | gente | 1900+ | pessoa | conhecer (`c:`); ficha | 1 |
| | No balcão: empresário real em atividade | gente | managers14 | pessoa | conhecer (`e:`); ficha | 1 |
| | Jukebox com o que mais toca agora | mundo | 1925+ | disco | ouvir | 1 |
| | Boato do dia (fato de visibilidade "boato" das últimas 8 semanas) | mundo | — | bilhete | notícias | 1 |
| **Estúdio** | Quem grava (sessão de ato NPC) | mundo | — | pessoa | radar; ficha | 1 |
| | Equipamento à venda (estúdio/microfone) | mundo · econômico | 1930+ | equipamento | comprar (×0,7–0,9) | 1–2 |
| | Horário vago | mundo | — | bilhete | alugar horas (`doPlace27 rent`) | 1 |
| **Rádio** | No ar (top das paradas; "é seu!") | mundo | 1922+ | disco | ouvir | 1 |
| | Pedido de ouvinte do seu artista | gente (fãs) | seu artista com fãs ativos/fiéis | bilhete | levar ao diretor (`doPlace27 pitch`) | 1 |
| | Vaga de entrevista | mundo | 1925+ | microfone | marcar entrevista (`doPlace27` da imprensa `interview`) | 1 |
| **Hotel** | Hóspede: artista em turnê na cidade | mundo (turnê) | — | pessoa | ficha; radar | 1 |
| | Hóspede: executivo de selo de outra cidade | gente | — | pessoa | conhecer; ficha | 1 |
| | Recado na recepção (decisões esperando) | mundo | há decisão | bilhete | atender os recados | 1 |
| **Gravadora rival** | Quem espera para assinar (ato da cidade sem contrato) | gente | fama ≥ 5 ou potencial ≥ 55 | pessoa | propor contrato (painel rápido); radar | 1 |
| | **Contrato largado na mesa** → ação do submundo com risco (chance e exposição mostradas antes) | raro | selo da cidade | contrato | grampear o escritório (`commitCrime wiretap`; trava pelo `crimeOdds.block`) | 1 (raro) |
| **Beco (mercado negro)** | Cópias piratas, equipamento roubado, relíquia roubada (migrado, espelho) | estoque | `under31`/`crime17` | caixote | comprar (`buyBm31`; trava `bmLock31`) | o mês |
| | **Fita pirata do SEU disco** (seu lançamento no top 15 de álbuns ou singles) → prejuízo todo mês e pista de quem fabrica (facção do país) | mundo · econômico | 1960+ | fita | denunciar a facção (`denounce31`) | 1–2 |
| **Casa de leilões** | Lote do mês (os 2 primeiros lotes dos 2 próximos pregões; espelho) | estoque | `auction31` | lote | deixar um lance (`raise31`; trava `bidLock31`); abrir a casa | o pregão |
| **Aeroporto** | Desembarque: ato em turnê | mundo (turnê) | — | pessoa | ficha; radar | 1 |
| | Sala VIP: chefe de selo de fora | gente | 1930+ | pessoa | conhecer; ficha | 1 |

## Cenários e lugares que já existiam

- **Cidade.** Os interiores do mapa (`inside31`) recebem a prateleira do mês, desenhada em pixel art com variação por
  época (`ui/pixel/vit31px.ts`):
  - o disco passa por cilindro, goma-laca, LP, CD e vinil;
  - a fita passa por rolo, cassete e pen drive;
  - o cartaz passa por litografia, serigrafia e tela;
  - a prateleira passa por madeira, metal e acrílico iluminado.

  Cada item é clicável e mostra a dica com o motivo do bloqueio antes do clique. O painel rápido traz os botões
  (`lockBtn31`) e o atalho ⚡. O ponto "Vitrine do mês" e o botão "Ver como lista" abrem a lista do mês. Os encontros
  entram na cena como gente desenhada (selo ✦ "no mês").
- **Turnê.** O cartaz da casa, o hóspede do hotel e o desembarque leem as turnês em andamento ou marcadas na cidade.
- **Aeroporto e casa de leilões** (telas da sessão T). Ganham a faixa "Vitrine do mês" embaixo da cena, com as mesmas
  ações.
- **Loja da cidade** (tela da onda 3). Ganha a seção "Vitrine do mês" com as ofertas que a vitrine pôs à venda. Por ali
  também se dá de presente, com a mesma `buyOffer31`.
- **Sede (salas31) e festival.** Ficaram de fora desta rodada:
  - a sede já tem a caixa de recados, as salas e o mural de talentos;
  - o festival vem pelo cartaz da casa e pelas turnês.

  Candidatos para depois: a demo na recepção da sede e a barraca de merchandising do festival. Ambos usariam o mesmo
  motor.

## Capturas

`docs/r31/shots/onda4-vit-*.png`:
- `loja-<época>-mes1/2`: o mesmo lugar em 2 meses seguidos, em 1935, 1975 e 2015;
- `feira-1935/1985/2015`: a feira da época;
- `instrumentos`, `bar`, `casa-de-shows`, `gravadora`, `beco` e `estudio`, com painel ou lista.

O script é `scripts/r31/shots-vit.mjs`.

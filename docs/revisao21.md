# Revisão 21 — erros, melhorias, profundidade e sistemas que não se conversam

Arquivo revisado: `Masters_4.html` (build de 9,3 MB, equivalente ao commit 20b: tem "Reais em mundo aleatório" e "Configuração legada", mas ainda não tem a residência de intercâmbio (`exch20`) nem a negociação coletiva (`union20`) da 20c). A revisão de código foi feita sobre o HEAD da branch (`8cbf726`, 797 arquivos, 181 mil linhas em `src/`), que é o que o build representa mais os dois sistemas da 20c.

Princípio desta revisão, por pedido: **nada aqui propõe cortar profundidade**. Onde há duplicação, a proposta é uma fonte de verdade que os outros sistemas leem; onde há tela congestionada, a proposta é hierarquia e progressividade, não remoção.

## 0. Método e o que foi verificado de fato

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | passa |
| `vitest run` (165 arquivos) | tudo passa; 2 testes estouraram tempo sob carga da máquina (`r9-identity-plus` "13 manuais de rival", `r10-life` "frequência de eventos de vida"); rodados isolados, passam |
| `vite build` | gera `dist/` sem aviso de erro |
| Lote oficial `balance19 --quick --years 5` (base pequena, 6 sementes) | 17 % de quebra (1/6), patrimônio mediano $6,9 mi — dentro da meta 10–30 % |
| Simulador headless com a configuração padrão (`defaultConfig`, base média) | selo quebra em todas as partidas que rodei: 1960 livre → insolvência em 1961 e 1966 (caixa −$130 mil e −$732 mil), 1889 histórico → 1890 (ver §1.1) |
| Build no Chromium (Playwright) | 0 erros de JavaScript, 0 `undefined`/`NaN` visíveis nas 66 áreas; um recurso 404 na carga (sem efeito) |
| Determinismo | sem `Math.random`/`Date.now` na simulação (confirmado por 7 revisores em suas áreas); 4 meses reproduzem JSON idêntico |

Dez revisões por área foram feitas em paralelo sobre o código, cada uma com scripts de reprodução (`npx tsx`) onde cabia. Os relatórios completos estão em `docs/revisao21/` (A núcleo e tempo, B dinheiro e saves, C pessoas, D mercado e mídia, E criação e direitos, F shows, G rivais e eventos, H contratos e negócios, I interface, J dados). Este arquivo é a síntese: o que é bug confirmado com linha, o que é melhoria estrutural, o que está raso, o que não se conversa, e o que fazer primeiro. Toda marcação [CONFIRMADO] foi lida no código (e, quando indicado, reproduzida); [SUSPEITO] é padrão visto sem execução.


## 1. Erros e problemas — os que importam primeiro

### 1.1 Equilíbrio: depende muito da configuração [SUSPEITO, média]

O lote oficial `balance19 --quick --years 5` (base pequena, sem adversários, 6 sementes) dá **17 % de quebra** (1/6: 1975 quebra em 1976), dentro da meta de 10–30 % de `docs/balance19.md`. Mas o mesmo `playbot16` com a configuração padrão do `headless` (base média, `defaultConfig`) quebrou em **todas** as partidas que rodei: 1960 livre → insolvência em 1961 (caixa −$130 mil) e em 1966 (−$732 mil); 1889 histórico → 1890 (−$37 mil); o revisor de eventos viu o mesmo em 1889, 1925 e 1975 em partidas de 36 meses. Ou seja: o equilíbrio medido só vale para a base pequena e sem rivais ativos; com a base média (padrão do Novo Jogo) o começo é muito mais duro. Vale incluir um lote `--db medium` com adversários no `balance19` e rever o que a R20 encareceu (`docs/precos20.md`: fábrica $90 mil → $350 mil; caixa reservado a ofertas; títulos, seguros, sindicato). Nota lateral: a partida que chega a −$732 mil mostra que `checkInsolvency` (4 meses seguidos no vermelho, `economy.ts:88`) deixa o caixa afundar por anos quando empréstimos o devolvem a zero de vez em quando.

### 1.2 Dinheiro que nasce ou some (B)

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| B-1 | `src/sim/util.ts:57-61` `post()` | recusa chave duplicada na mesma semana em silêncio; os chamadores mutam o estado mesmo assim. Reproduzido: dois aportes ao subselo na semana (`sublabels.ts:61`) criam $5 mil; `capital.payDividend` (`capital.ts:251-253`) credita o bolso do dono duas vezes com um débito; `issueShares` (`business.ts:276`) dilui sem captar; `takeLoan` (`economy.ts:82`) empurra empréstimo sem creditar caixa se outro foi quitado na semana | alta |
| B-2 | `src/sim/finance.ts:149-163` `seize()` | o credor "retoma" o ativo e **paga** 60 % do valor ao jogador; o credor-banco nunca tem `owed`, então nada é abatido | alta |
| B-3 | `finance.ts:126-130` + `oblig20.ts:69-100` | `supplier.owed` é derivado do caixa negativo e a Posição soma caixa negativo **e** credor: patrimônio cai de −$80,7 mil para −$141,7 mil sem movimento | média/alta |
| B-4 | `sublabels.ts:166` | fechar subselo cobra o caixa negativo dele duas vezes | média |
| B-5 | `business.ts:207-227`, `capital.ts:196`, `events.ts:525` | securitização antiga (sem teto, paga várias vezes o adiantamento), empréstimo do dono e `investorShare` ficam fora de `obligations20` → Posição e covenant não os veem | média |
| B-6 | `hooks.ts:48` × `econ18.ts:140-168` | credores veem o caixa negativo **antes** de os recebíveis do mês liquidarem | média |
| B-7 | `tick.ts:231-238` | imposto ignora investimento e depreciação (nunca lançada) e não compensa prejuízo | média (design) |
| B-8 | `movements9.ts:350`, `bonds9.ts:389,600` | constantes em centavos nominais sem `money()`: fundar movimento custa o mesmo em 1889 e 2040 | média |
| B-9 | 15 pontos (`services12:144`, `agenda:169`, `rollout:88`, `scouting:215`, `studio:273`, `tour12:241`, `exch20:91`, `bolsa10:970`, `capital.payDividend`…) | gastam com `s.player.cash` cru, ignorando a reserva de ofertas que a R20 diz valer para "todo gasto" | média |

### 1.3 Mercado, paradas e mídia (D)

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| D-1 | `market.ts:201-204` × `market19a.ts:252`, `revival19.ts:250`, `remix19.ts:252`, `adsync19.ts:154`, `score19.ts:164,218`, `charity19.ts:248` | `rel.hypeBoost` tem duas semânticas (multiplicador ≥ 1 × bônus 0–0,5) e **ninguém o lê depois do lançamento**: certificação, relançamento, sync, remix, trilha e beneficente acreditam esquentar vendas e não fazem nada (e corrompem o valor: 1,3 → 0,5) | alta |
| D-2 | `market.ts:365-378` | `rel.weekly` não registra semanas com 0 unidades → rádio (`radio18:202`), canais (`outlets17:123`), streaming, devoluções e a sparkline leem uma série desalinhada | média |
| D-3 | `market.ts:566-580` | a previsão ignora `maxShare`, a penalidade de escala, fragmentação e `focusCap`: 2,6× acima do teto real; `rel.fc` alimenta a autópsia | média |
| D-4 | `revival19.ts:191-196` | "sucesso tardio" soma unidades e posta 100 % ao caixa sem `distribute()`: sem royalty, edição, pirataria nem parada, mas conta para certificação | média |
| D-5 | `media.ts:337,283` | censura só para o jogador e só remove território **depois** de o apelo congelar a cobertura; `s.bans` não tem leitor na simulação; rádio e streaming ignoram | média |
| D-6 | `links19a.ts:371` + `terr20.ts:205`; `regions18:183` + `regions19:323` | fãs por região e vistos empilhados duas vezes no mesmo modificador `cityDemand` | média |
| D-7 | `fandom19.ts:55` | fãs por região não somam o total em 49 % dos atos (R20 diz que somam; `terr20` conserva só para o jogador) | baixa |
| D-8 | `market.ts:395-400`; `market19a.ts:253` | devoluções não revertem unidades (certificação conta devolvido); `stats.platinum` incrementado por degrau | baixa |
| D-9 | `worldgen.ts:308` + `decnew18.ts:202` | `genrePop` nasce com todos os gêneros (218 futuros em 1960) e um evento sorteia sem filtro de era | baixa |
| D-10 | `market.ts:320` | lançamentos do jogador ficam `live` para sempre → custo semanal cresce com a partida | baixa |

### 1.4 Criação, produção e direitos (E)

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| E-1 | `studio.ts:199-229` `fixSong` | a sessão de estúdio (caminho principal) **nunca dispara o hook `record`**; 20 sistemas o registram (split sheets de `rights18`, autorização de cover, sala/mesa da sede, mobília, sindicato, greve, instrumentos, talento…) e 4 compensam com varreduras. Efeito: política "split sheet" nunca vale para faixas de sessão (chance no tribunal 0,45 em vez de 0,80), equipamento de sala não melhora faixas | alta |
| E-2 | `rollout.ts:147-148` | fase deluxe cobra o marketing duas vezes (`pay()` + `marketing[]` → `releaseCost`) | alta |
| E-3 | `market.ts:490-500` | cover/regravação divide a edição da obra **alheia** pelo contrato do ato que gravou o cover e manda metade ao próprio ato; o detentor original recebe só os 5 % de `payAuthors`; remix e tributo não pagam licença | alta |
| E-4 | `business.ts:302` + `heritage17.ts:93` | sample sem liberação processado por dois sistemas (acordo + processo); `studio.ts:360` corta `s.samples` em 80 e apaga a prova | média |
| E-5 | `studio.ts:92-128` | estúdio da sede (tier 0) sem limite de salas nem exigência de sede na API (a agenda checa, a sessão não) | média |
| E-6 | `studio.ts:243-248`, `:151` | cancelar sessão não libera o produtor; hiato descola `producerBusy` da sessão | média |
| E-7 | `studio12.ts:229-231`; `events_more.ts:1886`; `neural.ts:158,196` | engenheiro conta em dobro no Q; fórmula de Q reimplementada sem o caso instrumental; `song.q = songQ(song)` solto apaga perks | média |
| E-8 | `camps18.topShare`, `creation.features.share`, `songX.credit`, `guestPts` | créditos/royalties guardados e nunca pagos | média |
| E-9 | `media.ts:114`, `sound.ts:1030`, `rollout.ts:149`, `sync15.ts:171` | mexem em `rel.appeal` depois da autópsia sem anotar → "Por que deu nisso?" mente | média |
| E-10 | `sync15.ts:170` | sync "ressuscita" o disco reescrevendo `rel.week` → contrato errado em `dealOfRelease` | média |
| E-11 | `production.ts:232,275` | cancelar lançamento não devolve a capa (viola "cancelar não cobra") | média |
| E-12 | `session19.ts:216`, `session18.ts:124` | músicos de sessão só "tocam" em faixas **compostas** há ≤ 5 semanas (semana da composição ≠ gravação) | média |
| E-13 | `rules.ts EQUIPMENT.effect.catalog/performance` | equipamentos comprados sem efeito algum | baixa |

### 1.5 Shows e turnês (F)

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| F-1 | `tours.ts:106` × `:259-269` | previsão ≠ acerto: o acerto aplica `quality` (setlist, palco, clube, clima) e ~25 modificadores `showRevenue`; a previsão só o clash. Medido: público real 77–80 % do previsto; são **seis** fórmulas de público esperado. A UI mostra "Saldo previsto" com 100 % da bilheteria enquanto o acerto paga 65 % | alta |
| F-2 | `live18.ts:149` × `tours.ts:273,261-264,294` | abertura: cachê previsto $44.520 → pago $1.098; opener recebe o público inteiro do headliner (222 % do previsto) e converte fãs duas vezes | alta |
| F-3 | `tours.ts:214-219`; `content.ts:555`, `hist19.ts:399` | planejador deixa marcar cidade em mercado bloqueado → cancelamento no dia sem reembolso; os dados bloqueiam **toda a América do Norte** em 1964–75 (Vietnã) e 1990–91 (Golfo). Medido: 3/6 datas canceladas | alta |
| F-4 | `tours.ts:108,225` | visto cobrado e sorteado por perna, não por país; `travel.planRoute` (que deduplica e tem prazo) não é usado | média |
| F-5 | `route8.ts:336-339` | `costReserved` inclui o que o promotor cobriu → reembolso/seguro devolvem dinheiro que o selo não pagou | média |
| F-6 | `tours.ts:138` | o mesmo ato pode estar em turnê, festival, residência (3 implementações) e intercâmbio ao mesmo tempo; `hiatus` não impede nada | média |
| F-7 | `tours.ts:268` único `runSimHooks('show')` | shows de agente, da agenda, festivais e residências não aplicam fadiga a pessoas, saúde, fãs por região nem o prêmio "Ato ao Vivo do Ano" | média |
| F-8 | `tours.ts:275-282` + `brands.ts` + `merch17.ts` | merch vende sem estoque e três sistemas vendem ao mesmo público | média |
| F-9 | `insure19.ts:105`; `fests8.ts:245` | seguro paga "shows cancelados" sem show cancelado; cachê de festival 100 % ao selo em contrato clássico | baixa |

### 1.6 Contratos, scouting e negócios (H)

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| H-1 | `market.ts:443` + `sublabels.ts:215-223` | lançamento de subselo **nunca paga royalty, nunca abate recoupment nem gera fãs**; o contrato segue `party:'player'` | alta |
| H-2 | `sublabels.ts:200,166-183,280-286` | masters de subselo fechado/falido ficam mortos; "elenco volta à matriz" e "masters aos credores" são só texto | alta |
| H-3 | `contracts.ts:369-386` | `endContract` não limpa o roster do subselo, que segue gravando e lançando para um ato que já é de rival | alta |
| H-4 | `contracts2.ts:17-38` + `ui/panels/people.ts:105-108` | exploit: adicionar opção, cross-collateral e multa de saída a contrato já assinado, sem consentimento; `moneyb19.setClause19` grava a mesma cláusula com outras regras | alta |
| H-5 | `tick.ts:158`, `rights8.ts:79`, `business.ts:355`, `moneyb19.ts:488`… | rescisão sem multa: só 2 dos 8 caminhos cobram `exitFee` | média |
| H-6 | `discover18.ts:250` e mais 11 pontos com `force=true` | veto de desenvolvimento/bolsa ("sem rival") não vale | média |
| H-7 | `scout11:73`, `discover18:85`, `deals18`, `discovery.ts:259`, `manager11:170` | elegibilidade "única" da R20 tem ≥ 6 caminhos; vários gastam `s.player.cash` cru | média |
| H-8 | `tours.ts:286` / `live/state.ts:198` / `live18.ts:359,396,475`, `merch17.ts:116` | fatia 360 calculada de três formas; merch dá 30 % ao selo no 360 e 70 % num acordo de imagem | média |
| H-9 | `intra19.ts:140,199`; `offers12.ts:332`; `contracts18.ts:111-121` | recuperável fora das cláusulas; verba prometida nunca entra; teto por projeto descarta a despesa inteira; três auditorias concorrentes | média |
| H-10 | `why18.ts:104-115`, `explain12.rangeAround`, `ui/sys/artist18.ts:81`, `careers19.ts:377` | a % "escondida" da negociação é dedutível e aparece exata em outras telas (contradiz "faixa, nunca %") | média |
| H-11 | `ventures9.ts:729-735`, `intra19.ts:179`, `manager11.ts:196` | comissão do jogador-empresário é dinheiro criado e cobrada de novo em festival e adiantamento | média |
| H-12 | `business.ts:32,57` | compra de selo trata recoupment (ativo) como passivo e cria credor | média |

### 1.7 Núcleo, tempo e agenda (A)

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| A-1 | `agenda.ts:92` | soma a própria agenda duas vezes → carga de 131 % com agenda manual + plano iniciado (medido) | alta |
| A-2 | `capacity.ts:67-68` | plano iniciado no mês atual "entra pela agenda", mas `s.agenda` nunca o recebe → `personLoad`/`checkCapacity`/esgotamento ficam cegos (81 vs 131) | alta |
| A-3 | `capacity.ts:137` + `tick.ts:42` | reserva para o mês corrente com o mês já aberto nunca executa, nunca cobra e ocupa capacidade | média |
| A-4 | `capacity.ts:152-156` + `agenda7.ts:99-114` | cancelar plano iniciado não tira as semanas 2–4 da fila `ag7` | média |
| A-5 | `ext4.ts:225-230`; `live/festival.ts:328` × `fest12.ts:829` | `registerSimHook` substitui em silêncio; `live-festival` registrado duas vezes (quem vence depende da ordem de import) | média |
| A-6 | `ext4.ts:207-211` | `ensureExt4` só cria a chave de topo: campo novo em estado `x4` antigo (ex.: `ag7.combos`) dá `TypeError` que o `tx20` reverte → save fica inavançável; `MIG20` vazio | média [SUSPEITO] |
| A-7 | `agenda.ts:1`, README | "4 slots (3 para iniciantes)" na doc; 6/5 no código | baixa |

### 1.8 Interface (I)

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| I-1 | `app.ts:136-166` + `actmenu20.ts:144-148` | atalhos globais disparam dentro do menu Ações ▾ (digitar "a" navega para Todos os artistas), das cenas e do tour; **Ctrl+Enter avança o mês com cerimônia aberta** (`ux19.ts:119` já tem o seletor certo) | alta |
| I-2 | `common.ts:95-113` + 9 pontos que fazem `.overlay.remove()` | `keydown` do `modal()` vaza e acumula; cada Esc futuro reexecuta `onClose` de modais mortos | média |
| I-3 | `hq.ts:170-199`, `app.ts:514,608` | loop `requestAnimationFrame` da Sede continua no menu inicial | média |
| I-4 | `app.ts:224,444-447` | `announce()` para leitor de tela é apagado pelo render seguinte: o briefing nunca é anunciado | média (a11y) |
| I-5 | `tutorial18.ts:120,289,307` | Ctrl+K e índice de ajuda navegam para 16 ids que não são áreas (`bulletin19`, `exch20`, `offer20`, `review20`…) → cai na Mesa com rota inválida | média |
| I-6 | `panels/misc.ts:334-341` | Empresa usa abas próprias fora de `tabs()`: `{`/`}`, rota, Ctrl+K e ajuda por aba não funcionam; `store.marketTab` morto | média |
| I-7 | `help18data.ts` × código (15 amostras) | 6 itens de ajuda desatualizados: "clique no nome abre a ficha", "analista libera relatório mensal", estratégias "inundar/desenvolver/abandonar", "filtre por tipo" no Diário, cor do fôlego, "por quê" no hover da oferta | média |
| I-8 | `media17.ts:330`, `love17.ts:402`, `npc17.ts:587`, `sitsworld17.ts:94,136,138` | EN perde placeholders (`{v}`, `{p}`, `{b}`) | baixa |
| I-9 | 43 `confirm()/prompt()/alert()` nativos; `'Erro'` cru em `app.ts:511`, `saves17.ts:239`; `furnish.ts:42` depende do texto PT | baixa |
| I-10 | `live/stage.ts:164`, `live/festival.ts:214`, `places/view.ts:95`, `cine18.ts:297`; `ux19.ts:395,420-431`; ~10 caches sem teto | loops de canvas sem controle de visibilidade; `setInterval` global permanente + `MutationObserver` que varre todos os botões a cada re-render; caches de sprites/capas só crescem | baixa |

### 1.9 Pessoas e ciclo de vida (C)

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| C-1 | `realworld.ts:251` (`decorate`, reuso por índice) + `realacts_classic.ts:129` | pessoa real duplicada: Black Sabbath nasce com dois Tony Iommi (8 atos com "segunda passagem" na lista desalinham os índices); "Dave Brubeck Quartet" × "The Dave Brubeck Quartet" coexistem (`norm16` não ignora "The") | alta |
| C-2 | `dynasty.ts:45` `realSafe` | pessoas reais **sem data de morte** nunca morrem: S. H. Dudley vivo aos 124–135 anos; também no modo fictício (arquétipos mantêm `catalogNo`) | alta |
| C-3 | `people/health.ts:296` + `healthOf` | assinar um NPC viciado o cura no 1º mês (`dependency` nasce em 0) | alta |
| C-4 | `people.ts:55` | habilidade gerada até `potencial + 5` → valores 101–104 (Ice Cube instr = 104); "atual > potencial" | média |
| C-5 | `dynasty.ts:58` + `lifecycle.ts:23-27` | morte põe `hiatusUntil` sem mudar status → memória falsa "{a} volta da pausa" e status forçado a `active` | média |
| C-6 | `dynasty.ts:197,377,381` | herdeiro/solo clonam `deceased`, `hiatusUntil`, `careerEnd` e `contractId` do ato de origem; `prune` pode apagar o contrato da banda | média |
| C-7 | `dynasty.ts:122`, `people/life.ts:49` | artista que namora o jogador ganha outro parceiro; romances de banda ignoram `sex17` | média |
| C-8 | `kin15.ts:69-98` × `dynasty.familyMonth` | três modelos de filhos e cinco de parceiro sem ponte; luto/rixas não veem filhos de dinastia | média |
| C-9 | `persona13.ts:122`; `data/people.ts:170` | sexo por hash do id, lista de nomes mista → "Ernesto" com retrato feminino (visto na tela); homônimos viram uma identidade (Roger Taylor ×2) | baixa |
| C-10 | `lifecycle.ts:35-37` | `traitMod` por integrante dentro do laço (O(atos × membros² × traços) por mês) | média [SUSPEITO] |
| C-11 | `lifecycle.ts:180` | `prune` não checa `families`, `lineage`, `vault`, `kin15`, `love17`, `life.partner` antes de apagar a pessoa | média [SUSPEITO] |

### 1.10 Rivais, eventos e narrativa (G)

Validação em massa feita pelo revisor: 796 eventos / 2.232 opções em 7 partidas (1889–2030): 0 placeholders sobrando, 0 `find` quebrando, 0 texto só em PT. Os problemas são de semântica:

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| G-1 | `tick.ts:34` + `events.ts:892` + `situations17.ts:187` | opção padrão = **última** opção; em 83 eventos a última é agressiva/arriscada e em 23 tem custo (burnout → `push` com 35 % de colapso, voice_strain → `push` com perda permanente de voz, stage_accident → `fight`, payola_exposed → `deny`, neural_vote → `oppose` decide o Arco Neural por omissão). Ignorar um cartão aplica o pior desfecho | alta |
| G-2 | `events.ts:872-875` | filtro de conteúdo/regra RS aplica essa mesma última opção **em silêncio**: filtro `health` dá o colapso do burnout; `violence` paga o processo do acidente | alta |
| G-3 | `events.ts:122-126, 631-632` | `find()` com efeito colateral antes do sorteio: `coverup_exposed` apaga a flag ao ser avaliado (nunca disparou em 7 partidas); o crash de 1930 pode ser perdido | alta |
| G-4 | `legacy.ts:142-176` | finais: `eternal_archivist` cresce sem teto com reedições; `famous_ghost` (58) e `the_silence` (62) dominam a faixa 45–52; `neural_empire`/`human_renaissance` dependem de um único evento sorteado depois de 2036 | alta |
| G-5 | `feud18.ts:199-225`, `crimenpc17.ts:91,294,300`, `dmsits18.ts:103,252`, `sitsworld17.ts` | regra RS e filtros de conteúdo só valem em `events.ts`/`sits17`: rixa escala até "tiros" e cadáver com filtro `violence` ligado | alta |
| G-6 | `rivalmind18.ts:77-98,148-153`, `rivals2.ts:121`, `rivals12.ts:135-145` | rivais leem informação privada (receita exata, `a.trust`, adiantamento da oferta pendente) — README §19 promete só pública | média |
| G-7 | `rivals.ts:27,79`, `rivals8.ts:398-787` | economia dos rivais fictícia: `lb.cash`/`revenueYear` somados sem lançamento; falência só abaixo de −$300 mil; alimenta a Carta `emperor` e demissões de líderes | média |
| G-8 | `director.ts:212-214,105-110` | arco "traição" emite o cartão 2× (e cobra 2×); "velhas feridas" contam qualquer `decision:*` como mágoa | média |
| G-9 | `events.ts:52-55`, `events_more.ts:42-45`, `events_more11.ts:633` | eventos escolhem atos em hiato/aposentados/mortos (45 casos em 7 partidas; fita de ato falecido) | média |
| G-10 | `events.ts:488,588` | decisão consumida sem efeito nem aviso quando falta caixa | média |
| G-11 | `paths18.ts:417-427` | `catalog_sale` entrega masters ao rival sem debitar o comprador | média |
| G-12 | 7 motores de cartão (`situations17`, `dm18`, `lifeevents10`, `inbox18`, `rivals12`, `crimenpc17`, `intrigue`) | ignoram narrador, filtros e cooldown; só `events.ts` passa por tudo | média |
| G-13 | `rivalmind18.ts:305`, `intrigue.ts:207,273`, `paths18.ts:408` | adiantamento cobrado 2×; contratos apagados sem `endContract`; "sorteio" `(week*7+year) % 10` previsível | baixa |

### 1.11 Dados (J)

Validação por scripts sobre 371 gêneros, 249 cidades, 128 fichas de país, 1.929 atos reais, 796 eventos, 23 techs, 11 formatos e 3.745 objetos `{pt,en}`: 0 ids duplicados, 0 mojibake, 0 EN vazio, 0 placeholder, 0 literal órfão de tech/formato/país. O que sobrou:

| # | Onde | O que acontece | Prioridade |
|---|---|---|---|
| J-1 | `data/geo/meta.json` (gerado por `tools/build-geo.ts`) | `singapore` → Malásia, `hong_kong` → China, `pointe_a_pitre` → Porto Rico (SGP/HKG/GLP não estão no atlas 1:110m): 8 atos reais com país errado; `countryName('SGP'/'HKG')` devolve o código | alta |
| J-2 | `data/world.ts` GENRES | 5 gêneros com pai mais novo que o filho (`art_rock` ← `psychedelic`, `torch_song` ← `vocal_jazz`, `bhangra` ← `dance_pop`, `psytrance` ← `trance`, `alt_rnb` ← `bedroom_pop`) | média |
| J-3 | `realacts_us.ts` Lead Belly, `realacts_world.ts` Secos & Molhados, `lineups16.ts` Vímana | gênero nasce **depois** do fim do ato (folk 1958 × 1934–49; rock_br 1980 × 1973–74) | média |
| J-4 | `data/hist19.ts` | 5 fatos empurram `genrePop` de gêneros ainda não nascidos (`h19_apollo` 1934 → rnb 1945; `h19_avandaro` 1971 → rock_latino 1980) | média |
| J-5 | `realacts_more14.ts`, `realacts_world.ts` | integrante entra criança (Thiaguinho aos 2 anos; Celio González aos 0; Madilu aos 4); disco de 2012 antes da estreia de 2013 | média |
| J-6 | `more17.ts` | Chic, The Stone Roses, The Four Seasons repetidos → o carregador descarta a versão nova em silêncio | média |
| J-7 | `session19.ts:63`, `careers19.ts:323`, `sex17.ts:168`, `remix19.ts:34,38` | ids que não existem: cidade `rio_de_janeiro` (é `rio`), famílias `country`/`gospel`/`disco`/`dance` (ramos mortos), cidades `nyc`/`lasvegas` | média |
| J-8 | `events.ts:861` × `ui/newgame.ts:35` | filtro `health` existe no código e não na UI; `romance` existe na UI e em nenhum evento; 434 dos 796 eventos sem tag | média |
| J-9 | `countries.ts` PRI × `geo.ts marketOfCountry` | Porto Rico é `latam` na ficha e `na` na função | baixa |
| J-10 | equilíbrio | **75 gêneros fora de qualquer cena de cidade** (atos procedurais nunca nascem neles: rockabilly, chicago_blues, dubstep, drill, phonk, choro, pagode, toda a era 1889 e **todos os 17 gêneros de 2030+**); 103 gêneros sem ato real; `musicSpend17` = 1 para 100 dos 128 países (Arábia Saudita e Taiwan maiores que Turquia e Rússia); população constante antes de 1920 (EUA 106 M em 1889, real ≈ 62 M); década de 2020 com 64 atos reais (2010: 235); 70 cidades sem ato real | média |


## 2. Interface e experiência — o que foi medido no navegador

Método: o próprio `Masters_4.html` foi servido localmente e aberto no Chromium (Playwright, 1400×900 e 390×844), com três partidas: padrão "Recomendado" em janeiro de 1962, a mesma após 8 meses, e "Sandbox" (empresa estabelecida, 3 atos) após 3 meses. Para cada uma das 66 áreas do menu e suas subabas medi botões visíveis, campos, cabeçalhos, palavras, altura de rolagem ("telas" = altura ÷ 900 px) e elementos que estouram a largura no celular. Seis capturas ilustrativas estão em `docs/revisao21/telas/`; os números abaixo são os da partida Sandbox.

### 2.1 Telas mais congestionadas (medidas)

| Tela | Botões | Palavras | Telas de rolagem | O que pesa |
|---|---|---|---|---|
| Mundo › Mapa e cenas | **601** | 1.235 | 4,2 | 5 abas de hub + 4 "perguntas" + 20 chips de camada + 2 seletores + 9 botões de região + mapa + 2 cartões laterais, tudo antes do mapa |
| Cockpit (com elenco) | 87 | 1.399 | **5,9** | 23 cabeçalhos: decisões, compromissos, projetos, "o que mudou", hoje/ameaças/andamento, calendário, próximos passos, briefing, metas, carreiras, estrutura, metas da era — o painel "essencial" da R20 virou 6 telas |
| Todos os artistas | 177 | 765 | 2,7 | 273 linhas × 2 botões por linha ("Página", "Seguir") |
| Paradas | 142 | 832 | 3,1 | 4 abas + duas tabelas de 15 + "gêneros em alta" + "nº 1 recentes"; cada título, ato e selo é link |
| Mercados (regions18) | 141 | 704 | 2,1 | 7 regiões × submercados, cada "gosto em alta" é um link |
| Mercado (scouting) | 130 | 919 | 3,5 | 5 abas de hub + 3 subabas + 6 filtros + cartões com 6 botões cada + formulário lateral |
| Submundo › Organizações | 62 | 888 | 2,5 | 15 cartões, 2–3 botões cada, 18 % do texto abaixo de 12 px |
| Gravadora (cp17-label) | 52 | 924 | 3,0 | 2 fileiras de abas (6 + 2) e 19 `details` recolhidos dentro de Você › Suas carreiras — é a página da atividade principal e está a 4 cliques |
| Pessoas › Elenco | 89 (122 no celular) | 452 | 1,8 | cada pessoa mostra sempre "Repouso vocal", "Cirurgia", "Clínica de reabilitação" e 5 botões de conversa, mesmo com saúde em 0 e sem pensamentos |
| Notícias e boatos | 40 | 1.036 | 2,2 | 5 abas + 5 filtros + manchetes + lista sem paginação |
| Mídia › Imprensa e crítica | 29 | 665 | 2,3 | 8 abas numa fileira que quebra em duas; 25 % do texto abaixo de 12 px |
| Estúdio › Sessões | 56 | 473 | 1,9 | abas por artista + 5 subabas + 12 cartões de produtor com "Afinidade: ~" |

Outros sinais:
- **Dois níveis de abas é a regra, três é comum**: Mercado (hub 5 › 3), Gravadora (6 › 2), Estúdio (artistas › 5), Mundo (5 › perguntas › camadas). A barra de abas principal quebra em duas linhas em Mídia (8), Finanças (8), Negócios (12), Direitos (10), Lendas (11) a 1400 px.
- **Barra superior muda de altura**: em janeiro cabe numa linha; a partir de fevereiro, com "Desfazer mês", quebra em duas e empurra a página 48 px para baixo.
- **Celular (390 px)**: não há rolagem horizontal da página, mas tabelas estouram o contêiner e cortam colunas (Paradas: 249 elementos além da borda, Mercados: 123, Shows: 64, Finanças: 26); o cabeçalho ocupa 300 dos 844 px; 292 alvos de toque menores que 32 px no Mundo e 115 em Pessoas.
- **Páginas vazias sem orientação**: com selo sem elenco, Projeto musical, Compor, Estúdio e Lançamentos mostram só uma frase ("Contrate um artista para começar um disco") sem botão para o Mercado.
- **Shows › Agenda** repete a mesma tabela por artista no corpo e na coluna lateral estreita (quebra "Bar ou clube pequeno" em três linhas) e lista Teatro/Arena/Estádio com "—" para atos que não alcançam nem o clube.
- **"Antes de avançar"** aparece todo mês enquanto houver decisão pendente, mesmo com a opção padrão já exibida no Cockpit; são dois cliques por mês para quem aceita o padrão.

### 2.2 Plausibilidade visível na primeira hora (modo "Reais em mundo aleatório")

- Notícias de fevereiro de 1962: "Robert Johnson e Miles Davis vistos juntos de madrugada: romance?", "Frank Sinatra e Kishore Kumar vistos juntos…", boato "espalhado em Japão, Uganda, Uruguai". Causa: `media17.ts:236-238` sorteia o par entre **qualquer** ato famoso do mundo e `spread()` (`:250-268`) sorteia países ao acaso quando o veículo é global. [CONFIRMADO]
- "Mahalia Jackson desponta em Chicago, formado em 1936" / "Charlie Parker desponta… formado em 1946" como manchete de 1962: `chron9.ts:179` marca "desponta" para todo ato com fama ≥ 28 que ainda não foi "visto", e no início da partida ninguém foi visto. [CONFIRMADO] Correção: semear `c.seen` no worldgen para atos com estreia anterior ao ano inicial.
- Robert Johnson (†1938), Glenn Miller (†1944) e Charlie Parker (†1955) ativos em 1962 no preset Recomendado. É consequência da política "destinos simulados" do modo aleatório (`worldpolicy20`), mas não há indicação na tela de que o destino é simulado, e o diretório mostra ★85 para Robert Johnson em "Memphis · Columbia Records".
- Scouting inicial de um selo em Londres traz "Tejano (conjunto) · Roterdã", "Taarab · Birmingham", "Biguine · Port of Spain": `spawnProceduralAct` (`worldgen.ts:160-163`) sorteia o gênero pela popularidade global em 35 % dos casos (e sempre quando a cidade não tem cena), ignorando os `hubs` do gênero. [CONFIRMADO]
- Nome e sexo não combinam: "Ernesto Iriarte" com retrato feminino e "Maya Mercer" com retrato masculino. `personName` (`people.ts:24`) sorteia de uma lista mista e o sexo é sorteado à parte (`people16.ts:108`, `persona.ts:121`). [CONFIRMADO]
- Parada mundial de 1962 chamada "Billboard Hot 100" com Abdel Halim Hafez e Adoniran Barbosa; 13 dos 15 primeiros são "Independente" num ano em que quase todo ato real tinha selo. Unidades do nº 1: 2.356 por semana.


### 2.3 Como desafogar as telas sem perder nada

Regra geral proposta: **orçamento de três níveis** (Grupo › Página › Aba) e um teste de alcançabilidade que falhe quando uma página/aba não aparece no menu, no Ctrl+K e na ajuda. Tudo o que está abaixo mantém cada função existente; muda onde ela mora e quando aparece.

1. **Mundo › Mapa**: as 20 camadas viram um painel lateral recolhível "Camadas" com 4 presets no topo (Meus fãs, Cenas, Rivais, Turnês) e "Todas (especialista)" fechado por padrão; as 4 "perguntas" viram o primeiro nível (cada pergunta liga seu preset de camadas); região e política viram um seletor único sobre o mapa. O mapa sobe para a primeira dobra.
2. **Cockpit**: manter os 4 cartões do topo (decisões, compromissos, projetos, o que mudou) e mover "Próximos passos", "Briefing", "Metas da era", "Estrutura desalinhada" e "Quem tem tempo" para a aba "Caixa de entrada" ou para cartões recolhidos por padrão, lembrando o estado por jogador. Meta: 2 telas de altura com elenco cheio. O "3 destaques + N outros" da R20 já é o princípio certo; falta aplicá-lo ao painel inteiro.
3. **Todos os artistas**: linhas clicáveis (a linha inteira abre a página) e "Seguir" como ícone de estrela na linha; paginação ou virtualização acima de 100 linhas; filtros em uma linha com "mais filtros" recolhido.
4. **Paradas**: tabela principal com 10 linhas e "ver 100"; só título e ato como link (selo vira texto com clique no cabeçalho); "Gêneros em alta" e "Nº 1 recentes" como abas da coluna lateral, não dois cartões empilhados. Em 1962 chamar a parada mundial de "WorldSound 100" (o nome real "Billboard Hot 100" só na parada dos EUA).
5. **Mercado (scouting)**: cartões com 2 ações primárias ("Aprofundar", "Fazer oferta") e o resto num menu `…`; o formulário "Pedido de scout" vira botão que abre um diálogo; filtros avançados recolhidos. As duas fileiras de abas (hub 5 + 3) viram uma só com o segundo nível como segmentos dentro do conteúdo.
6. **Pessoas › Elenco**: mostrar ações de saúde só quando há desgaste/dano/dependência; "Conversa" vira um botão que abre as 5 opções; patrimônio e "Adiantar dinheiro" num rodapé de cartão. Cada cartão cai de 12 para 4 controles.
7. **Gravadora (cp17-label)**: a página da atividade principal não pode viver em Você › Suas carreiras; promover para o grupo Empresa (ou renomear o grupo Empresa para "Gravadora" quando a carreira principal é selo) e manter o atalho em Você. Fundir as duas fileiras de abas (6 + 2) em uma.
8. **Mídia, Finanças, Negócios, Direitos, Lendas**: barras de 8–12 abas quebram em duas linhas a 1400 px. Agrupar em 4–5 abas com segmentos internos (ex.: Finanças: Posição · DRE e caixa · Capital (sócios, empréstimos, participações, bolsa) · Balanço e dívida). Nenhuma tela some; muda a profundidade.
9. **Estúdio › Sessões**: produtores como lista compacta (nome, assinatura, habilidade, preço, afinidade) com "ver cartões"; "Afinidade com o gênero: ~" vira ícone com tooltip.
10. **Shows › Agenda**: uma tabela por artista no corpo (não duplicada na lateral); linhas de casa só para tiers alcançáveis, com "ver todos os portes"; mostrar líquido já com a fatia do selo (hoje mostra 100 % da bilheteria, ver F-1).
11. **Submundo › Organizações**: cartões com 1 ação primária e menu `…`; texto a 12 px no mínimo (18 % do texto está abaixo disso).
12. **Páginas vazias** (Projeto, Compor, Estúdio, Lançamentos sem elenco): uma frase + botão direto para o Mercado/Ações ▾, no lugar do texto solto.
13. **"Antes de avançar"**: quando todas as decisões pendentes têm opção padrão já mostrada no Cockpit, o diálogo vira uma linha de confirmação no próprio botão ("Avançar e aceitar 3 padrões") com o checkbox "não perguntar" já existente em destaque.
14. **Barra superior**: altura fixa; "Desfazer mês" entra no menu do botão "Até…▾" ou como ícone, para a página não pular 48 px entre janeiro e fevereiro. Mostrar **caixa livre / total** (reserva de ofertas) e fôlego em meses com "por quê", porque hoje o topo mostra $50 mil e a ação diz "caixa livre insuficiente".
15. **Celular**: tabelas longas (Paradas, Mercados, Shows, Finanças) com rolagem horizontal interna ou modo cartão abaixo de 640 px; cabeçalho recolhível ao rolar (hoje ocupa 300 dos 844 px); alvos de toque ≥ 40 px (292 abaixo de 32 px no Mundo).
16. **Atalhos e diálogos**: usar `BUSY19` em `onKey` (I-1), `stopPropagation` no type-ahead do menu Ações ▾, focus-trap + `inert` nos diálogos, substituir os 43 `confirm/prompt` nativos pelo `modal()` do jogo.
17. **Ctrl+K e ajuda**: indexar subabas dos hubs r20 sem a página aberta; remover os 16 ids de ajuda que não são áreas (ou criar as áreas); atualizar os 6 itens de ajuda desatualizados (I-7).
18. **Nomes e sexo**: separar `FIRST_NAMES` por sexo e derivar o sexo do nome (ou o nome do sexo) — o retrato errado é a primeira coisa que o jogador vê ao abrir um artista.
19. **Notícias plausíveis**: romance/rixa só entre atos do mesmo mercado ou com relação real (`p.rel`), boato espalhado pelos países onde o ato tem fama (`fameIn`), e "desponta" só para quem estreou de fato neste ano.


## 3. Sistemas que não se conversam (mapa consolidado)

O padrão que se repete em todas as áreas: cada rodada acrescentou um sistema com o seu próprio estado e os seus próprios cálculos, sem ler o anterior. Nada aqui pede remoção; pede que **um** deles seja a fonte e os outros leiam dela.

### 3.1 Dez fontes de verdade que hoje são múltiplas

| Conceito | Quantas versões | Onde | Consequência visível |
|---|---|---|---|
| Carga/capacidade de um ato | 3 fórmulas, 4 estados (`s.agenda`, `s.plans`, `ag7.queue`, `s.loadNow`) | `agenda.ts`, `capacity.ts`, `sys/agenda7.ts` | 131 % de carga com a UI mostrando 81 % (A-1/A-2) |
| Público esperado de um show | 6 fórmulas | `tours.ts:106`, `live18.ts:145`, `showops20.ts:85`, `explain12.ts:152`, `tour12.ts:148`, `live.ts:30` | previsão 20–25 % acima do acerto (F-1) |
| Fatia 360 do selo | 3 (`take360`, `eff360`, `share360` cru) | tours/route8 · live/state · live18/brands/merch17/events | post-mortem ≠ razão (H-8) |
| Recoupment | 17 escritas diretas em `recoupBalance` fora de `addRecoup18` | intra19, production, events, rights, market19a, npc17… | cláusulas negociadas não valem (H-9) |
| Vendas por região/país | 6 repartições | market, charts2 (descartada), charts7, market19a, relevance8, terr20 | nº 1 num país é impossível sem o peso estático (D §3.5) |
| Fãs por região | 2 (`fansByRegion19` sem estado × livro `terr20`) | fandom19, terr20 | não somam o total em 49 % dos atos (D-7) |
| Qualidade da música (Q) | fórmula canônica + 1 reimplementação + ≥10 cópias da estimativa "não gravada" | production, events_more, neural, vocals10, studio, repertoire, sound, writers19, camps18 | perks apagados por `song.q = songQ(song)` (E-7) |
| Capa do disco | 3 (`covers.ts`, `project13.ARTS`, `setCover`) | — | penalidade "provocativa" pode contar duas vezes (E §2.6) |
| Residência | 4 (`live/venue`, `venues17`, `venue12`, `events.ts resid`) | — | mesmo ato em dois lugares (F-6) |
| Merch | 3 (`brands.s.merch`, `merch17.lines`, banca em `tours.ts`) | — | vende sem estoque, ao mesmo público (F-8) |
| Mortalidade | 4 tabelas (dynasty, lifecycle7, people16, owner/heirs8) | — | nenhuma com era/país/sexo (C §2) |
| Vício | 3 escalas + 2 máquinas de estado | health.dependency, Life16.dep, vices.dep × Person.health, St16 | assinar cura (C-3) |
| Parceiro/romance | 5 representações | life.partner, love17, families[].partner, P(s).romances, kin15 | artista namora o jogador e ganha outro parceiro (C-7) |
| Filhos | 3 modelos | owner.kids/kids17, families.kids/lineage, kin15.kids | luto não vê filhos de dinastia (C-8) |
| "Viral" | 4 conceitos | audience8, media18, reach17, revival19 | cada um com gatilho e efeito próprios |
| Censura | 4 fontes | media.CENSOR_RULES, content.censorshipIn, society18.regimeAt18, world4/laws | nenhuma lê a outra; `s.bans` sem leitor (D-5) |
| Contrato | 4 camadas no mesmo objeto + 5 formatos de oferta | base, rights, clauses18, contracts2 · Offer, DealPackage, Offer18, DealOffer, Bid | opção/cross/multa gravadas por dois sistemas com regras diferentes (H-4) |
| IPO / dividendo / título de catálogo | 2 IPOs chamados pela UI, 3 regimes de dividendo, 2 títulos | business × capital × events × money19 | securitização sem passivo (B-5) |
| Custo mensal (burn) | `monthlyCosts` não vê overhead13, seguros, bonds, ownerLoan, cartão | economy × oblig20 | "dívida funda", previsão de caixa e retirada do dono subestimam o burn |
| Abas da interface | 3 mecanismos | `tabs()`, `store.companyTab`, hubs r20 | Empresa fora de rota/Ctrl+K/ajuda (I-6) |
| Tutorial | 3 camadas, 3 preferências | tutorial.ts, tutorial18, ux19 | "Sem tutoriais" não zera `tutorial.done` |

### 3.2 Ligações que existem no texto do README mas não no código

| Ligação prometida | Estado real |
|---|---|
| Hype → paradas | só a expectativa congelada no lançamento (40 semanas); hype de **ato**, **selo** e **cena** não entram em nenhum `chartUnits`/`appeal` — medidores sem consumidor |
| Certificação, relançamento, sync, remix, beneficente → vendas | escrevem `hypeBoost` que ninguém lê (D-1) |
| Turnê → vendas no país | `terr20` grava fãs só pelo hook `show` de `tours.ts`; `charts7.countryWeights` ignora shows, fama regional, rádio e censura |
| Festival → hype → mídia | `fests8.runEditions` não chama `addHype` nem `emitFact` |
| Prêmio → vendas | só `momentum +10`; o EV `award` do hype morre no `a:` |
| Rádio (`radio18`) → fama regional / paradas por país | `spins18` só entra em `chartUnits`; NPCs nunca estão na rádio |
| Censura → rádio/streaming/apelo | não (D-5) |
| Postura antipirataria (`world4`) → `piracyLoss` | não |
| Olheiro × cenas por cidade | `scouting`, `scout11`, `discover18`, `scout20` não leem `s.scenes` |
| Relação pessoal → aceitação de oferta | só via empresário; a relação do dono com o líder da banda não pesa |
| Equipe sobrecarregada → qualidade das decisões | `cap14.strain` lido só por `capacity14` |
| Traços/humor → qualidade da sessão | `takeQuality` lê só moral/fadiga; persona e momentos de vida só mexem nos eixos sonoros |
| Equipamento comprado → qualidade | `effect.catalog`/`performance` nunca lidos; sala/mobília só pelo hook `record` que a sessão não dispara (E-1) |
| Engenheiro contratado → som | só reduz `techIssue` |
| Capa → censura por país | `covers.ts:279` codifica mercados "conservadores" à mão; não lê `censorshipLevel`, `regions19` nem `movements9` |
| Projeto → rollout → marketing | `rollout.mainChannel` ignora os canais escolhidos no projeto; só o clipe passa por `addChannel18` |
| Cover → relação com autor original | `makeCover` não toca opinião, `holds17` nem fama do original |
| Visto com prazo → calendário | `travel.processingDays`/`leadDays` só na UI |
| Vícios × saúde × shows (NPC) | NPC viciado não perde público nem cancela show |
| Fama (`fame15/16`) × notoriedade (`notoriety14`) | nunca se leem |
| Morte → contrato | só via `remember('death')` → `bridge17` → `Fact` → `afterlife19` (acoplamento invisível) |
| Posição financeira ← ações, ventures, subselos | `position20.assets` soma só `s.assets` |
| Bolsa ← resultado do selo | passeio aleatório com drift; `bond_default`/covenant só viram notícia |
| Catálogo de ações (`actions20`) ← botões antigos | `panels/artists.ts:224-301` muta `s.agenda`/`s.delegated` direto, sem revalidação nem recibo |
| Ctrl+K ← subabas dos hubs r20 | só quando a página já está aberta |

### 3.3 Funções exportadas que ninguém chama (código que o jogo acha que tem)

`liabilities20`, `totalDebt`, `canSpend20` (B); `music/state.refreshQ`, `camps18.topShare`, `creation.features[].share`, `songX.credit`, `EQUIPMENT.effect.catalog/performance`, `SongComp.master/mix` (E); `live/festival.runEdition` (substituído em silêncio por `fest12`), `tourEligibleLive`, `canHologram`, `tourMonthIdx`, `venueNights`, `clashLog`, `previewShowRevenue` (F); `dynasty.openVote` (a votação da banda do README nunca roda), `dynastyYear` (C); `GameState.undo`, `store.marketTab` (A/I); `travel.planRoute` pelas turnês (A/F).


## 4. O que está raso e pode ganhar profundidade (sem tirar nada)

Cada item abaixo já tem metade da infraestrutura no código; a proposta é completar a ligação, não criar outro sistema.

### Economia e dinheiro
- **Moeda por mercado**: hoje um único CPI dos EUA para o mundo (1889–2040), câmbio só como perda em 5 crises. `econ18.postSalesAR18` já separa vendas por mercado; falta índice de preços por mercado e taxa de câmbio por ano (como `rates19` faz para juros). Começar em São Paulo 1985 em cruzeiro, com inflação mensal no caixa, é uma experiência que o jogo já quase suporta.
- **Imposto por país e como decisão**: alíquota única EUA; `branches` e territórios existem. Imposto retido sobre royalties internacionais, VAT em físico, capex dedutível (exige B-7).
- **Crédito**: 3 empréstimos de 36 meses. Falta rotativo, garantia, refinanciamento, prazo do fornecedor de prensagem (`supply18` já tem `distLag18`), rating do selo (`rating19` existe só para o lastro do título).
- **Bolsa com fundamento**: preço = múltiplo da época (`rates19.eraMultiple`) × lucro consolidado; `labelTarget` existe só para rivais.
- **Subselo como empresa**: usar `distribute` nos discos do subselo (royalties, AR/AP, recoupment), consolidar na DRE, falência que entrega masters a credores de verdade (H-1/H-2).

### Mercado e mídia
- **Playlists/algoritmo (2008+)**: `stream18` só para o jogador; NPCs não disputam vagas. N vagas editoriais por mercado/semana disputadas por todos (score = apelo × retorno × relação com curador).
- **Rádio por formato**: 9 formatos, 3 estações cada, mas só o jogador faz pitch; uma parada de airplay com rotação de NPC fecha o ciclo e dá sentido ao `needle time` de `regions19`.
- **TikTok/viral 2016+**: viral de faixa nova de qualquer ato, com gancho (`songProfile.hook`) e sem campanha, puxando `genrePop` e o país de origem (`reach17` já faz para nº 1 em 4+ países).
- **Vinil 2010+**: fatia por família de gênero e idade do público (`AGE_LAG18`), RSD anual com edição limitada, fila da fábrica (`supply18`).
- **Paradas por país com memória local**: pesos dinâmicos (fama regional, shows, rádio, censura, idioma) em vez de tabela estática.
- **Bolo de streaming conservado por território**: majors, faixas sem rosto e IA diluem de verdade; "user-centric" da `platform12` vira escolha mensurável.

### Criação
- **Mixagem e masterização como decisão** (3 cliques por disco): mono × estéreo (1958–68), loudness war (1995–2010), Atmos (2019+) alimentando `quality18.tech/dur` e a crítica da era; `SongComp.master/mix` já existem como campos mortos.
- **Estúdios reais reserváveis** (`STUDIOS19` + `STUDIO_KIT19` já têm dimensões): fila, preço por dia, som da sala, engenheiro da casa, cruzar com um rival gravando ao lado.
- **Direção de álbum**: faixa-título, single de trabalho escolhido pelo jogador (hoje `rolloutProject` decide), ordem (`bestOrder18` como sugestão), lado A/B por era.
- **Editora como jogo próprio**: compositores com adiantamento e cota, covers de NPCs sobre o seu catálogo pagando mecânicos, e a outra ponta — pagar o detentor certo ao fazer cover (E-3).
- **Catálogo vivo**: reedição de aniversário com faixas do cofre, remaster que exige fitas preservadas (dá uso ao `EQUIPMENT.effect.catalog`, hoje morto), tudo anotado na autópsia do mesmo disco.

### Palco
- **Setlist com músicas reais** e efeito: hits locais por país (`charts7`), pedido do público ligado a um hit antigo real, versão ao vivo que vira **disco ao vivo** (não existe `Release` do tipo live; `liveLog20` já tem `energy` por show).
- **Economia de turnê por era**: `TICKET = [12,25,45,70,95]` fixo por tier; pré-1960 (teatros/bailes, cachê fixo), 1965–95 (porta + promotores), 1997+ (gigante, garantia), 2010+ (turnê como receita principal, VIP, dynamic pricing e revolta dos fãs).
- **Cambistas como decisão com dinheiro real** (`clash17:scalp` hoje só texto).
- **Equipe de estrada nomeada** (tour manager, FOH, segurança) com lealdade e cansaço; roubo por rivais; greve com nomes (`union20`).
- **Turnê de reunião como turnê real** (`circuit17.stageReunion` é um lance único de caixa).

### Pessoas
- **Registro civil único**: parceiros, filhos e herdeiros como `Person` (idade, morte, carreira, laços) — `people16` já faz metade com chaves `p:/pd:/e:/l:`; resolve C-7, C-8, C-9 de uma vez.
- **Curva de vida por era**: mortalidade e aposentadoria por década/país (1918, guerras, AIDS nos anos 80 em cenas específicas, opioides 2010+), ligadas a `history19`/`regions19`.
- **Dependência como barra única** com gatilhos (turnê longa, fama, parceiro viciado, era) e mês de reabilitação que bloqueia agenda — hoje só para o jogador.
- **Votação e facções com consequência**: `openVote` existe e nunca roda; racha automático acima de 85 de tensão.
- **Herdeiros do espólio como pessoas** (`afterlife19.estate18.heirs` não envelhecem nem morrem).

### Contratos e negócios
- **Mesa de negociação por bloco**: contraproposta por dimensão (`offers12.DIMS`) com o empresário do artista falando (`managers14` já tem estilo e exigência).
- **Advogado do artista como personagem**; **opções e pick-ups com prazo** no `calendar19`; **leilão aberto** com 2–3 rivais e pacotes completos (`offers12.rivalPackages` já gera, só não assina).
- **Distribuidora e editora como serviço vendido a terceiros**; **scouting ligado à cena** (`s.scenes` com calor); **fama regional na oferta** (`fame16`).

### Tempo e agenda
- **Agenda diária real** cruzada com turnês/sessões (o tick já é diário); vistos com prazo no calendário; planos encadeados como projeto com datas; "avançar até o próximo prazo que pede ação" via `calendar19`; esgotamento com memória da causa (`cap14.over`).

### Rivais, eventos e narrativa
- Ver `docs/revisao21/G-rivais-eventos.md` (seção 3).

### Interface
- Gráficos com dados que já existem: caixa × obrigações (Posição), vendas semanais sobre o rollout, fãs por região empilhado, ano a ano no Diário.
- Comparadores: lançamento × lançamento (previsão × resultado), turnê × turnê, você × rival (`rivals12` tem os motivos).
- "Por quê" nas decisões mais caras: prensagem e previsão de vendas, leitura da negociação, reputação do topo, valor de catálogo/selo, custo da turnê por cidade (`data-why` cobre 12 chaves hoje).
- Previsão × realizado como mecânica: o jogo mostra o erro acumulado do jogador ("você superestima vendas em 30 %") e o analista reduz a faixa.


## 5. O que fazer primeiro (proposta de Rodada 21)

Ordenado por "quanto conserta por linha mudada". Nada remove sistema; tudo liga ou corrige.

### 21a — Integridade (uma semana de trabalho, quase tudo cirúrgico)
1. `post()` estrito: devolve erro em chave duplicada e os ~95 chamadores financeiros abortam a mutação (B-1); `seize` abate `owed` e não credita caixa (B-2); credor só nasce de lançamento real (B-3); registrar securitização, `ownerLoan` e `investorShare` em `obligations20` (B-5).
2. `fixSong` dispara o hook `record` e as quatro varreduras compensatórias saem (E-1); deluxe deixa de pagar duas vezes (E-2); cancelar lançamento devolve a capa (E-11).
3. `capLeft = freeCapacity(s, act)` e `personLoad` conta o plano iniciado (A-1/A-2); `reservePlan` recusa o mês já aberto (A-3); `cancelPlan` limpa a fila `ag7` (A-4).
4. Opção padrão explícita (`neutralId`) com teste de tom; filtro de conteúdo aplica a neutra e avisa (G-1/G-2); `find` puro (G-3); `pickMine`/`pick` filtram status (G-9).
5. Subselo: `distribute` roda para `owner` de subselo e `endContract` limpa o roster (H-1/H-3); `setClauses` exige consentimento ou some da UI (H-4); `exitFee` cobrado dentro de `endContract` (H-5).
6. `hypeBoost` só no lançamento; os seis escritores pós-lançamento viram `registerMod('chartUnits')` com janela (D-1); `rel.weekly.push(0)` (D-2); `forecastUnits` com os mesmos tetos do mercado (D-3); `revival19` passa por `distribute` (D-4).
7. Turnês: previsão chama a função do acerto com ruído 1 (F-1); cachê de abertura único (F-2); planejador recusa mercado bloqueado e os dados de Vietnã/Golfo deixam de bloquear a América do Norte inteira (F-3); `planRoute` no lugar de `legInfo` por perna (F-4).
8. Pessoas: `decorate` reusa integrantes por nome, `norm16` ignora "The" (C-1); `realSafe` só com `died` documentado (C-2); `dependency` inicial para quem chega viciado (C-3); teto de skill = potencial (C-4).
9. Interface: `onKey` ignora `BUSY19` e o type-ahead do Ações ▾ faz `stopPropagation` (I-1); `modal()` registra o listener de forma descartável (I-2); parar o loop da Sede no título (I-3); `announce` depois do render (I-4); tirar os 16 ids fantasmas do Ctrl+K (I-5); Empresa usa `tabs()` (I-6).
10. Plausibilidade: `chron9.debuts` semeado no início; par de boato por mercado/relação; boato espalhado por `fameIn`; gênero procedural por `hubs`; nome ↔ sexo.

### 21b — Fontes de verdade (duas a três semanas)
- `loadOf/freeOf` únicos para capacidade; `showmath.ts` com `expectedSold`/`settleStop`; um só evento `show` emitido por todas as rotas; `labelTake()` para 360/merch/marcas; `recoup()` único; `closeTrack()` único com `refreshQ`; `bumpAppeal()` que anota na autópsia; `burn20()` para custo mensal; `transferAct()`/`signAct()` únicos; `mortality()` única; `dependency` numérica em toda pessoa; `EditionPlan` único; uma residência; um merch; `EventDef` canônico com adaptadores para os outros sete motores.
- Testes que travam as regressões: `post()` nunca retorna `false` numa partida do bot ("Outros ajustes = 0" na reconciliação); lista de ids de hooks; alcançabilidade de toda área/aba por menu, Ctrl+K e ajuda; catálogo de eventos (placeholders, era, estado do alvo, tom da opção padrão); recoupment de ponta a ponta com subselo, cross-collateral, 360 e multa.

### 21c — Ligações que o README já promete (o "mundo que se fala")
- Hype de ato/selo/cena → `chartUnits` e aceitação de contrato; festival → `addHype` + `emitFact`; prêmio → janela de +X % (o "Grammy bump"); turnê e rádio e censura → `charts7.countryWeights`; olheiro → `s.scenes`; `cap14.strain` → faixa da oferta e scouting; relação do dono com o líder → `evaluateOffer`; traços/humor → `takeQuality`; capa → nível de censura do país; rollout → canais do projeto; cover → relação com o autor; morte → contrato sem passar por `remember`; rivais com extrato próprio e só informação pública; Posição com ações, ventures e subselos; bolsa com fundamento.

### 21d — Profundidade nova (depois de 21a–c, para não construir sobre areia)
- Playlists/airplay disputados por NPCs e bolo de streaming conservado; estúdios reais reserváveis e mesa de mixagem; editora como negócio com a outra ponta do cover; disco ao vivo; economia de turnê por era; registro civil único de pessoas e curva de vida por era; mesa de negociação por bloco e leilão aberto; agenda diária real com vistos no calendário; finais compostos por caminho + epílogos; moeda por mercado.

### 21e — Interface (pode correr em paralelo com tudo acima)
- Os 19 itens de §2.3, começando por Mundo, Cockpit, Mercado e Pessoas (os quatro com mais controles por tela) e pelo topo com caixa livre/total.

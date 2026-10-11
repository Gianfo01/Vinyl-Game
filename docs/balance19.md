# Equilíbrio R19: bot realista por padrão e bots adversários (frentes 11.4 e 0.3)

## Como rodar

```
npm run balance                                   # padrão: 6 sementes × 5 anos, 4 perfis + 6 adversários (60 partidas)
npm run balance -- --seeds 12 --years 10          # amostra maior
npm run balance -- --adv none                     # só os perfis (24 partidas)
npm run balance -- --bots balanced --adv crime    # um adversário contra o equilibrado
npm run balance -- --starts 1975,2005 --grid      # cruza todas as sementes com todos os inícios
npm run balance -- --jobs 8 --json out.json       # processos e linhas brutas em JSON
npm run headless -- --runs 4 --years 10 --start 1975               # bot realista (playbot16)
npm run headless -- --runs 4 --years 10 --start 1975 --bot simple  # espantalho (bot.ts), só de propósito
```

- **Bot:** `simulatePlayer` / `playMonth` de `src/sim/playbot16.ts` (o bot que joga de verdade). O bot simples
  (`bot.ts`) quebra em ~100% das partidas e só existe com `--bot simple` no `headless`.
- **Perfis:** `balanced`, `cautious`, `aggressive` (selo) e `artist` (papel artista, perfil equilibrado).
- **Inícios:** 1889, 1955, 1975, 2005. Sem `--grid`, cada semente pega um início em rodízio
  (b19-0 → 1889, b19-1 → 1955, b19-2 → 1975, b19-3 → 2005, b19-4 → 1889, b19-5 → 1955). Todos os bots jogam as
  mesmas (semente, início), então a comparação com o equilibrado é pareada.
- **Paralelo:** um processo filho por núcleo, com fila. As partidas mais lentas (inícios tardios) saem primeiro. Se um
  filho morre (memória, sinal), a partida vira `ERRO` e outro filho assume a fila.
- **Tempo:** cerca de 5 min em 4 núcleos ocupados (310 s; 455–970 s com a máquina a carga 20–60 por outros agentes).
  O caminho crítico é uma partida de 2005 com o agressivo (~4 min sozinha). Uma partida de 1889 leva segundos.
- **Código:** `src/sim/balance19.ts` (partida, métricas, adversários, `exploit19`) e `tools/balance19.ts` (fila e
  tabela). Teste: `tests/r19-bots.test.ts` (1 semente, 1 ano, todo perfil roda sem exceção).

### Colunas
- **caixa p25/med/p75**: caixa final em US$ de 2020.
- **líquido**: caixa − empréstimos − credores + o que entrou no bolso do dono (venda do selo).
- **patrimônio**: igual, mas com o selo pelo **valor de venda** (`valuation17`: catálogo + elenco + prestígio + caixa −
  dívida) se ele ainda é seu e não quebrou. Sem isso, "vender o selo" sempre venceria quem continua operando.
- **fama**: `playerFame`; **prest.**: reputação artística; **nº1**: nº 1 do jogador; **escând./mortes/ecos**:
  mediana de fatos `scandal`, `death` e `echo` no barramento durante a partida (mundo inteiro).
- **Veredito:** `EXPLOIT` = patrimônio mediano ≥ 2× o do equilibrado e +US$ 50 mil, sem quebrar mais.
  `caixa!` (alerta) = líquido ≥ 2× e +US$ 100 mil. Pega quem fica rico sem construir selo. Vender o selo sempre acende
  esse alerta, então ali vale o patrimônio.

## Adversários

| id | estratégia |
|---|---|
| spam | equilibrado + lança toda música inédita como demo barata (US$ 150, 25% da tiragem, sem marketing) |
| loans | equilibrado + pega todo empréstimo que o banco der, todo mês |
| flip | agressivo (hype máximo) e, a partir do mês 30, aceita o maior lance pelo selo; depois só resolve cartas |
| signall | equilibrado + proposta padrão a todo artista conhecido (vagas + 4) e aceita toda contraproposta |
| catalog | equilibrado + vende todo master que um fundo quiser e sempre "vender catálogo" na venda de emergência |
| crime | só crime, sem música: pirataria dos 3 atos mais famosos, chantagem na maior estrela e desvio dos próprios, todo mês |

## Tabela atual (6 sementes × 5 anos, depois das correções)

| perfil | n | quebra | caixa p25 / med / p75 | líquido | patrimônio | fama | prest. | nº1 | escând. | mortes | ecos | × equil. (patr. / líq.) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| balanced | 6 | 33% | 8 mil / 53 mil / 66 mil | -72 mil | 4.75 mi | 11 | 50 | 1 | 62 | 2 | 18 |  |
| cautious | 6 | 33% | 75 mil / 408 mil / 2.02 mi | 386 mil | 5.36 mi | 11 | 63 | 1 | 52 | 2 | 13 |  |
| aggressive | 6 | 17% | 26 mil / 96 mil / 152 mil | 15 mil | 4.21 mi | 12 | 34 | 2 | 59 | 1 | 16 |  |
| artist | 6 | 0% | 3.01 mi / 3.67 mi / 4.19 mi | 3.65 mi | 3.67 mi | 52 | 57 | 1 | 65 | 1 | 16 |  |
| spam | 6 | 83% | -20 mil / -16 mil / -9 mil | -127 mil | -127 mil | 10 | 10 | 0 | 13 | 1 | 4 | -0.03× / 0× |
| loans | 6 | 83% | -23 mil / -16 mil / -6 mil | -147 mil | -147 mil | 10 | 40 | 0 | 10 | 2 | 3 | -0.03× / 0× |
| flip | 6 | 17% | 72 mil / 182 mil / 234 mil | 1.22 mi | 1.22 mi | 11 | 38 | 1 | 53 | 2 | 11 | 0.26× / 99× caixa! |
| signall | 6 | 100% | -33 mil / -26 mil / -24 mil | -158 mil | -158 mil | 10 | 32 | 0 | 6 | 1 | 2 | -0.03× / 0× |
| catalog | 6 | 33% | 7 mil / 53 mil / 209 mil | -59 mil | 4.75 mi | 11 | 51 | 1 | 62 | 2 | 16 | 1× / 0× |
| crime | 6 | 100% | -141 mil / -91 mil / -84 mil | -120 mil | -120 mil | 10 | 35 | 0 | 6 | 1 | 1 | -0.03× / 0× |

(99× = o equilibrado tem líquido negativo. Este lote teve 5 filhos mortos por SIGKILL externo, sob carga 64 da máquina.
As partidas foram refeitas com `--bots balanced --adv flip,catalog` e as linhas juntadas. O jogo é determinístico:
balanced/catalog repetem números idênticos.)

### Antes das correções (mesmas sementes)

| perfil | quebra | líquido | patrimônio | × equil. |
|---|---|---|---|---|
| balanced | 33% | -72 mil | 6.75 mi | |
| flip | 17% | **2.67 mi** | 2.67 mi | 0.4× / 99× caixa! |
| crime | **0%** | **1.72 mi** | 1.72 mi | 0.25× / 99× caixa! (149 escândalos, 240 crimes) |

## Exploits encontrados e corrigidos

### 1. "Só crime" (`crime`): pirataria + chantagem sem selo nenhum
- **Medido:** 0% de quebra em todos os inícios, contra 33% do equilibrado. Líquido mediano de US$ 1,72 mi em 5 anos
  (1,24–2,01 mi por início), 4,5× o cauteloso (386 mil). Nenhum artista nem lançamento.
- **Causa:** cada pirataria de um ato famoso rendia US$ 2.500 + 160 × fama, cerca de US$ 17 mil, a 70% de chance. Cada
  chantagem rendia até US$ 45 mil. Nada diminuía com a repetição, e a condenação era só multa de US$ 30–45 mil.
  Prisão só acontecia com gravidade ≥ 70.
- **Correção (`crime17.ts`):**
  - **Saturação:** `glut19`. Cada sucesso do jogador no mesmo crime (pirataria, chantagem, desvio) nos últimos 12
    meses corta o ganho: 1/(1 + 0,25n). Motivo: o mercado de piratas dos mesmos sucessos satura, as vítimas
    contratam advogado e a fama de chantagista corre. O "por quê?" das chances mostra a linha "Já fez isso n× em 12
    meses: rende x% do normal".
  - **Confisco:** `loot19`. A condenação confisca 60% do produto de crime ainda não confiscado (24% na delação), e o
    texto da sentença mostra o valor.
- **Depois:** o crime sozinho quebra em 100% (líquido −120 mil). Um crime ocasional continua rendendo o valor cheio:
  é uma ferramenta, não uma estratégia.

### 2. "Hype máximo e vende" (`flip`): o comprador pagava pelo pico e pela fama
- **Medido:** vendendo no 3º ano, o líquido mediano era US$ 2,67 mi (5,84 mi num início de 2005). O equilibrado tinha
  −72 mil de líquido depois de 5 anos.
  - Diagnóstico, 1889, semente b19-0: um selo com receita de US$ 268 mil/ano e caixa zero era avaliado em 1,78 mi.
    Desse valor, 858 mil vinham do elenco (fama² × US$ 160, sem olhar o que o artista rende) e 510 mil de
    prestígio (34 prêmios/nº 1 × US$ 15 mil).
  - Em 2005, 5,6 mi vinham do catálogo: o múltiplo da época incidia sobre a receita **bruta**, e um disco do ano
    contava a receita do pico de lançamento como renda anual.
- **Correção (`sale17.ts`, `valuation17`):** o texto do "por quê" da avaliação foi atualizado em cada linha.
  - `relIncome`: um disco com menos de 2 anos conta como se tivesse 2. O comprador desconta o pico.
  - `netShare19`: o múltiplo incide sobre a fatia **líquida** do selo, (1 − royalty) × 0,75. No contrato de
    distribuição, só a taxa.
  - `rosterTerm19` e um teto de elenco:
    - cada artista vale no máximo 3 anos do que rende ao selo (+ US$ 20 mil);
    - o valor cai com o contrato restante (menos de 1 ano de contrato = até 25%).
  - O prestígio vira ágio: no máximo 50% de catálogo + elenco.
- **Depois:** flip 1,22 mi, só 0,26× o patrimônio do equilibrado (4,75 mi = quanto ele conseguiria vendendo no 5º
  ano). Vender cedo deixou de ser dominante. O alerta `caixa!` continua aceso por definição, porque vender converte
  valor em dinheiro.

### Sem exploit (o adversário perde feio)
- **spam:** 83% de quebra. Demo barata não vende e esvazia o repertório (prestígio 10).
- **loans:** 83%. No máximo 3 empréstimos, cada um menor e mais caro, e as parcelas afundam o caixa.
- **signall:** 100%, em 1–2 anos. Os adiantamentos consomem o caixa.
- **catalog:** igual ao equilibrado. Lances de fundo só aparecem para masters com 5 anos ou mais, então em 5 anos quase
  nunca há o que vender.

## O que ficou (fora desta passada mínima)
- **Equilibrado quebra 33%** (meta 10–30%). As duas quebras são 1889 e 1955, ambas antes do 3º ano. O cauteloso tem
  melhor caixa e patrimônio que o equilibrado: o foco em 3 atos ainda vence.
- **Papel artista:** 3,67 mi de líquido mediano, 0% de quebra e fama 52, muito acima de todo perfil de selo em
  dinheiro na mão. Candidato forte a exploit de papel: rever cachês, adiantamentos e ofertas do `artist18` com o
  `botArtist18`.
- **Valor de venda alto para selo no zero a zero:** o equilibrado de 1975 tem receita de 3,76 mi/ano, lucro de 42 mil e
  vale 11,9 mi (lances até 14,5 mi). Fica o próximo botão: um componente de lucro (EBITDA) em `valuation17`, ou um
  múltiplo menor quando a margem é baixa.
- **catalog** precisa de partidas de 10+ anos (`--years 10`) para testar de verdade a venda repetida de masters.
- **Desempenho:** uma partida de 2005 leva 2–4 min em 5 anos e cresce mais que linearmente. No perfil, os quentes
  são o GC, `repertoire.songUses` (varre todos os lançamentos a cada `songStatus`) e `charts7.weekCharts`.
  Indexar canção → lançamentos encurtaria o lote.
- Faltam adversários para payola, chart_rig, 360 e IPO/bolsa (próxima rodada da 0.3).

## Onda 4 — integração final (12 sementes × 5 anos, inícios 1889/1955/1975/2005 em rodízio)

**Antes** = código da onda 3 integrada (sem estas mudanças). **Depois** = código combinado com a onda 5
(`claude/bold-maxwell-j94owc` mesclado), `npm run balance -- --seeds 12 --years 5` (120 partidas, 28 min com carga alta).

| perfil | quebra antes → depois | caixa mediana antes → depois (p25 / p75 depois) | patrimônio med. | prest. med. (máx.) antes → depois | fama |
|---|---|---|---|---|---|
| balanced | 17% → **17%** | 149 mil → **127 mil** (−15%; 27 mil / 310 mil) | 8.39 mi → 5.64 mi | 75 (99) → 70 (86) | 12 |
| cautious | 0% → 33% | 900 mil → 497 mil (−1 mil / 2.26 mi) | 9.91 mi → 9.54 mi | 91 (100) → 70 (86) | 12 |
| aggressive | 33% → 50% | 56 mil → 8 mil (−7 mil / 130 mil) | 3.17 mi → 1.47 mi | 42 (80) → 32 (60) | 14 |
| artist | 8% → **0%** | 4.36 mi → **1.78 mi** (1.20 mi / 2.65 mi; 0.89–5.57 mi) | 4.40 mi → 1.88 mi | 58 → 52 | 56 |

Adversários (depois): nenhum exploit. `catalog` 1.16× do equilibrado em patrimônio, `flip` 0.12× (líquido 21× porque o
equilibrado reinveste), spam/loans/signall/crime quebram 75–100%. Sanidade de carreira única (6 × 5 anos, `--quick
--years 5`): só empresário (`--role manager --careers manager`) 33% de quebra, caixa mediana 76 mil; só festival
(`--careers festival`) 17%, 97 mil.

Por início (equilibrado, depois): 1889 3/3 sobrevivem (127 mil; antes 2/3 quebravam em 1890 — a onda 5 corrigiu, o
`b19-4` de 1889 também passa com todos os sistemas R19 desligados), 1955 3/3, 1975 1/3 (dois quebram em 1976: o primeiro
ano de 1975 queima ~140 mil contra ~60 mil de receita antes do 1º sucesso), 2005 3/3.

### O que mudou nesta passada
- **Divisão da banda** (`sys/bandpay19.ts`, carreira de artista): o lucro operacional do mês (DRE do ledger18) é dividido
  em partes iguais entre os integrantes (fora o dono) e o fundo; prejuízo acumulado é abatido antes; 3+ meses sem divisão
  sobem o ressentimento (lineup16 lê). Porquê `bandpay19`, ajuda `bandpay19`. Artista: 4.36 → 1.78 mi de mediana,
  amplitude 0.89–5.57 mi (solo fica com tudo, quarteto com ¼).
- **Avaliação com lucro** (`sale17.valuation17` → `margin19`/`marginFactor19`): catálogo + elenco × (0,6 + 1,6 × margem
  operacional de 12 meses + 0,5 × crescimento da receita), entre 0,35× e 1,3×. Selo no zero a zero vale ~0,6× do que
  valia; histórico < 3 meses não ajusta. Linha "Lucro" no porquê da venda.
- **Prestígio sem teto fácil** (`sys/sat19.ts`): a alta mensal de cada reputação acima de 50 rende ×(100 − antes)/50
  (mín. ×0,1) e acima de 85 desbota 0,25/mês. Máximo do equilibrado 99 → 86; cauteloso 100 → 86.
- **Cadeias 2 e 3** (abaixo): `revival19` — metade dos usos aleatórios de mídia volta a uma faixa que já tem calor
  (decaimento 0,85 → 0,9); `botr19.ts` — o playbot responde às ofertas de canção/ghostwriter e divide a autoria.
- A/B (`OFF19=sat,botr,rev` via `tmp`/`NODE_OPTIONS`; flags `__sat19Off`, `__botr19Off`, `__rev19Old`, além de
  `__mkb19Off`, `__l19aOff`, `__mka19Off`): na mesma semente as três mudanças não alteram a quebra do agressivo de 1975
  (−22 947 idêntico com e sem). A deriva de caixa entre lotes vem de divergência (qualquer sorteio a mais muda a partida:
  2005/b19-3 deu 1.49 mi, 443 mil e 210 mil com mudanças que não tocam o selo), não de um dreno.

### Ainda fora da meta
- **Espalhamento de estratégias**: o agressivo ainda perde do cauteloso (50% de quebra; só 2005 sobrevive inteiro). O
  bot agressivo se endivida cedo (empréstimo com 3 meses de fôlego, até 3 empréstimos, adiantamento até 40% do caixa).
  Próximo passo: guarda-corpo no perfil agressivo ou retorno maior para investimento (o crescimento já pesa na avaliação).
- **Cauteloso 33%**: quebras em 1889/1975 no 1º–2º ano (pouco lançamento = sem sucesso que pague a estrutura).

### Cadeias de história (plano19 §9) — 10 partidas × 20 anos desde 1955, equilibrado
Contagem por fatos (`tmp-w4/chains.ts`, `onFact('*')`): partidas em que cada passo aconteceu ao menos uma vez.

| cadeia | passos (partidas com o passo, de 10) | cadeia inteira (núcleo) |
|---|---|---|
| 1 separação → tributo → sósia → fãs → documentário → processo do músico | 7 · 10 · 2 · 10 · 2 · 0 | 1/10 |
| 2 remix → comercial → série/needle drop → revival → certificação → relançamento → título | 0 · 7 · 8 · **3** · 0 · 3 · 0 | 3/10 (mídia → revival; antes 0/4) |
| 3 coral/prodígio → concurso → divisão de autoria → ghostwriter revelado → solo | 10 · 10 · 10 · 8 · 10 | 8/10 (antes 0/4: sem `cowrite_split`) |
| 4 crise → show beneficente → briga/pacto → dinheiro some → investigação | 9 · 9 · 10 · 2 · 10 | 2/10 |
| 5 assinatura/instrumento-ícone → morte → relíquia → leilão → herdeiros → holograma/tributo | 7 · 10 · 10 · 0 · 8 · 10 | 7/10 |
| 6 fanzine → cena → corrida do ouro → bandas-fantasma → lei | 8 · 8 · 9 · 10 · 9 | 8/10 |

Remix de clube só existe a partir de 1975 e certificação tardia exige o revival vender muito: em 1955–1975 a cadeia 2
fecha no revival. O processo do músico de estúdio (cadeia 1) e o leilão de masters (cadeia 5) não apareceram em 20 anos.

### Desempenho
`tests/r14-db` enorme: 1 201 ms/mês (carga 3,7 de outros agentes; meta < 1 500). Perfil: ganchos R19 somam ~45 ms/mês;
os mais caros continuam `charts7` (semana, ~83–130 ms/mês), `hype12`, `fame16`, `lineup16`. `live-achievements`
(33 ms/mês) passou a varrer os lançamentos do jogador uma vez por semana.

## Passada de equilíbrio pós-integração (cauteloso/agressivo quebrando)

12 sementes × 5 anos, inícios 1889/1955/1975/2005 em rodízio (`npx tsx tools/balance19.ts --tsx --seeds 12 --years 5
--bots balanced,cautious,aggressive --adv none`; artista no lote com os 4 perfis; empresário `--role manager --careers
manager`, festival `--careers festival`). **Antes** = código combinado da onda 4 (tabela acima; cauteloso/agressivo
medidos de novo neste lote: 17% / 42%). **Depois** = os 5 commits desta passada.

| perfil | quebra antes → depois | caixa mediana antes → depois (p25 / p75 depois) | patrimônio med. depois | quebras depois |
|---|---|---|---|---|
| balanced | 17% → **17%** | 127 mil → 154 mil (27 mil / 221 mil) | 8.68 mi | 1975 b19-6 (1976), 1889 b19-0 (1890) |
| cautious | 33% (17% no lote novo) → **17%** | 497 mil → **768 mil** (335 mil / 2.39 mi) | 12.62 mi | só 1889 (b19-0, b19-4, em 1890) |
| aggressive | 50% (42%) → **33%** | 8 mil (24 mil) → **104 mil** (−1 mil / 268 mil) | 3.25 mi (2005: 9–20 mi) | 1975 ×2 (1976), 1955 (1957), 1889 (1891) |
| artist | 0% → **0%** | 1.78 mi → 1.68 mi (1.21 mi / 2.62 mi) | 1.70 mi | — |
| empresário só | 33% (6 sementes) → **0%** | 76 mil → 206 mil (81 mil / 361 mil) | — | — |
| festival só | 17% (6 sementes) → **17%** | 97 mil → 237 mil (171 mil / 588 mil) | — | 1975 ×2 (1976) |

Ruído: com 12 partidas uma quebra vale 8 pontos; lotes intermediários desta passada deram equilibrado 25% e 8% com o
mesmo código de regras exceto um ajuste — leia ±8–15 pontos.

### Causa raiz (logs por partida: ledger por chave + `lossCauses19`)
1. **Ordens delegadas cobravam 100× o orçamento** (`deleg16.pay`: `money(usdN * 100)` trata o orçamento como dólares
   reais ×100). Uma ordem de rádio de "$300/mês" saía ~US$ 20–30 mil/mês; o agressivo de 2005 perdia 238 mil em 2007 e
   437 mil em 2008 só nisso (`business|d16:od…`), o cauteloso de 1975 141 mil em 1977. Qualquer jogador que contratasse
   um promotor e delegasse rádio sangrava igual. A bilheteria da noite do selo tinha o mesmo erro para cima (100×).
   Agora o orçamento é em dólares reais como a tela mostra (mensagens também). Era o que matava o agressivo em 2005
   (0/3 quebras agora, era 2/3) e o que levou o empresário-só a 33%.
2. **Multa de dupla marcação fixa de US$ 15 mil** por erro do agente → metade do cachê da data desfeita (US$ 500–15 mil).
3. **Sede alugada danificada pagava espaço provisório para sempre** (`campus18`: enchente do bairro `hood19` ignorada =
   dano permanente, ~10 mil/ano em 1975). Agora o dono do imóvel reforma em 6 meses; prédio próprio continua sendo seu problema.
4. **Pirataria cobrava valor fixo pela fama** (`crime17`: 800 + fama×90, 10–35 mil/ano para selo pequeno de 1975, mais que
   o disco rendia). Agora é até 20% do que o disco pirateado já rendeu, com o mesmo teto.
5. **Crédito empilhado** (`economy.loanOffer`): o 2º/3º empréstimo encolhe para 65% (era 75%) e soma 4 pontos de juro por
   linha aberta (eram 3). O 1º empréstimo não muda (o cauteloso nem sente); recoloca o risco no agressivo depois das correções acima.

Não eram causa: empréstimo de fundação (só carreiras com pacote inicial), `bandpay19` (só artista), `sat19`, `intra19`
(só com negócios próprios), avaliação (não toca caixa).

### 1975: choque do petróleo
Era evento de época (`supply13.matTarget`): vinil ×1,7 em 1973, 1974 **e 1975**, e prensas de terceiros com fila
(9000/preço). Historicamente o embargo foi de out/1973 a mar/1974 e o PVC já baixava em 1975. Agora: 1973 ×1,35, 1974
×1,7, 1975 ×1,3 ("ressaca do choque") — e enquanto o preço da matéria-prima principal estiver ≥ 1,15× com motivo de
época, o conselheiro mostra o alerta "Matéria-prima cara" (porquê + ir para Fornecimento). Cauteloso de 1975: 3/3 sobrevivem;
equilibrado e agressivo ainda quebram em 1976 numa semente (b19-6) que torra o 1º ano antes do 1º sucesso.

### Ainda fora da meta
- **Cauteloso 17%** (meta 10–15%): as duas quebras são 1889 em 1890, estáveis em todas as variantes. Grade só de 1889
  (12 sementes × 3 anos): equilibrado 0%, agressivo 17%, cauteloso 33%. O cauteloso de 1889 gasta o mesmo em lançamento
  que o equilibrado (24 × 28 mil) mas vende 1/3 (27 × 80 mil) com marketing de 5% e orçamento enxuto, e sem a 2ª linha de
  crédito nem o investidor de 1890 não aguenta a guerra de patentes. É estilo do bot numa era de mercado minúsculo; não mexi.
- **Agressivo não supera o cauteloso** em patrimônio mediano (3.25 × 12.62 mi); o melhor agressivo (2005, 19.5 mi) fica
  abaixo do cauteloso de 2005 (31–34 mi). Próximo botão: retorno de lavish/marketing, não mais risco.
- **Empresário-só 0%** (meta descuidado 20–25%): sem aluguel nem folha, o empresário não tem custo fixo que quebre.
  Se quiser risco, ponha custo fixo (escritório/assistente) ou adiantamento a cliente.

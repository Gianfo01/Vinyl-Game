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

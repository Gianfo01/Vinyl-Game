# Equilíbrio R17 — teste final (rápido e completo)

## Como foi rodado (≈ 15 min no total)
- **Playbot** (`src/sim/playbot16.ts` + `src/sim/playbot17.ts`): perfis cautious / balanced / aggressive × inícios 1960, 1975, 1990,
  2005, 2012, 2018 × 5 anos, um processo por corrida em paralelo (`nproc` = 4; ~5 min por lote de 18 corridas, 52–65 s por
  corrida). O lote final usa 2 sementes por início (36 corridas, ~10 min); 1 semente por célula é ruído puro (o mesmo perfil/início
  variou 3× entre sementes). Caixa final em US$ de 2020 (`toReal`). "Quebra" = fim por insolvência.
- **UI smoke** (Chromium, bundle único): as 4 predefinições do Novo Jogo (Recomendado, Historiador, Sandbox, Desafio) em 1975 e 2005;
  8 meses jogados, depois TODAS as páginas do menu nav17 (49 em 1975, 51 em 2005), TODAS as abas (111–127 por jogo), 2 botões
  seguros por página, uma cena interativa (aparece no Sandbox; nos começos do zero não há cena sem ação do jogador — o botão de
  encontro agora explica isso) e popups de cidade e de país no mapa. Erros de console/página coletados: **0** após as correções.

## O bot agora usa os sistemas da rodada 17 (`playbot17.ts`)
- **Canais de lançamento por época** (padrão aplicado a cada lançamento): cauteloso = lojas independentes/venda direta;
  equilibrado = canal principal da época (streaming, megastores, supermercado, 8-track); agressivo = alcance e adiantamentos
  (clube do disco, vídeo curto, exclusiva de plataforma, vinil especial).
- **Merch**: o agressivo propõe contrato **360** depois de 2002 (volta ao clássico se a leitura for "improvável") e produz
  lotes de camiseta/pôster/bóton quando o estoque cai (40–110 lotes por corrida nos começos ≥ 2005).
- **Casa de shows**: compra quando o retorno estimado (`monthEst17`) passa de 8–15%/ano e cabe no caixa (raro: 1 em 36).
- **Imprensa**: responde boatos sobre seus artistas (verdade → assumir se grave, senão silêncio; mentira → desmentir; o agressivo
  compra/processa quando é barato). 4–23 respostas por corrida.
- **Cenas interativas**: escolhe pela chance mostrada conforme o perfil (≥65% / ≥50% / ≥35%), senão a mais segura.
- **Envolvimento na carreira** (agenda17): agressivo "à frente" do selo quando sobra tempo livre; os outros acompanham.

## Antes × depois

| perfil | quebra | já ficou negativo | mediana final | mediana ≤1990 | mediana 2012/2018 | tardio ÷ 1990 | faixa |
|---|---|---|---|---|---|---|---|
| **antes** (bot r16, 18 corridas) | | | | | | | |
| cautious | 0/6 (0%) | 1/6 | 2,55 mi | 464 mil | 4,56 mi | 9,8× | 216 mil … 4,98 mi |
| balanced | 0/6 (0%) | 1/6 | 600 mil | 263 mil | 948 mil | 2,6× | 227 mil … 1,21 mi |
| aggressive | 0/6 (0%) | 1/6 | 160 mil | 171 mil | 305 mil | 1,2× | 58 mil … 461 mil |
| **bot r17, sem ajuste** (18) | | | | | | | |
| cautious | 0/6 (0%) | 1/6 | 3,08 mi | 1,31 mi | 9,08 mi | 7,1× | 1,28 mi … 9,61 mi |
| balanced | 0/6 (0%) | 4/6 | 406 mil | 203 mil | 970 mil | 7,9× | 122 mil … 1,26 mi |
| aggressive | 2/6 (33%) | 5/6 | 274 mil | −28 mil | 3,22 mi | (1990 quebrou) | −74 mil … 5,26 mi |
| **depois** (36 corridas, 2 sementes por início) | | | | | | | |
| cautious | 0/12 (0%) | 3/12 | 2,52 mi | 1,36 mi | 3,22 mi | 1,7× | 629 mil … 4,27 mi |
| balanced | 0/12 (0%) | 3/12 | 268 mil | 167 mil | 644 mil | 4,0× | 70 mil … 1,55 mi |
| aggressive | 1/12 (8%) | 9/12 | 475 mil | 113 mil | 2,73 mi | 21,7× | −15 mil … 10,55 mi |

(tardio ÷ 1990 = mediana 2012/2018 ÷ mediana dos começos em 1990.)

## A passada de ajuste (uma só)
1. **Margem dos canais laterais só na fatia deles** (`outlets17.ts`, `shareOf`): antes a margem de cada canal valia para
   todas as unidades — loja própria (+25%) e vinil especial (+30%) davam aumento em tudo (cauteloso tardio ia a 9,6 mi) e clube do
   disco + supermercado + megastore (−58%) quebravam o agressivo antes de 2000. Agora streaming/janela/exclusivas valem para a
   venda inteira e os laterais para ~4× o alcance extra que trazem (5–60%). A interface mostra a margem efetiva.
2. **Repasse do streaming para o selo independente: 0,6** (`market.ts`, `STREAM_PAYOUT17`): rateio pró-rata, acordos das majors e
   distribuidora digital no meio. Com custo de fabricação quase zero, o digital rendia ~2,5× a receita de 1990 com metade do custo.
   Resultado: cauteloso tardio ÷ 1990 caiu de 9,8× para **1,7×** e o equilibrado de 7,9× para **4,0×** (meta ~3×).
3. *(testado e desfeito)* começo do zero 34 → 28 mil: não mudou a quebra do playbot e matava o bot simples (`bot.ts`) em menos de
   2 anos — o teste longo de 2005 deixava de cobrir 30 anos. Ficou 34 mil.
4. **Crédito realista** (`economy.ts`): banco não empresta depois de 2 meses no vermelho; cada empréstimo aberto reduz o próximo
   em 25% e soma 3 p.p. de juros (explicado em Finanças). Pesa sobretudo no agressivo (3–6 empréstimos por corrida).

## Leitura e pendências
- **Tardios × 1990**: cauteloso 1,7× e equilibrado 4,0× (antes 7–10×; meta ~3×). O agressivo tardio vai a 21× porque, a partir de
  2002, ele assina **360** e o selo leva 15% de shows e merch de atos que chegam à fama 80–90 (até 46 mi em shows numa corrida de
  2012). Antes de 2002 o bot não usa 360 (modelo anacrônico). Próximo botão sugerido: fatia de shows do 360 decrescente com a fama
  do ato ou teto anual por ato.
- **Agressivo ganha mais com mais risco**: maior teto (10,5 mi contra 1,55 mi do equilibrado), a única quebra e 9/12 corridas no
  negativo em algum momento. O cauteloso ainda tem a melhor mediana — foco em 3 atos vence a diluição de lançamentos (`focusCap`).
- **Quebra do equilibrado continua 0%** (meta 10–25%): 10 de 12 descem abaixo de US$ 5 mil e 3 ficam negativos, mas o bot corta
  equipe, vende catálogo na carta de aperto e se recupera antes de 6 meses seguidos no vermelho. Ficou fora desta passada única;
  próximo botão sugerido: insolvência com 4 meses seguidos (hoje 6) ou venda de catálogo com deságio maior.
- Nenhum perfil acima de 50% de quebra; cauteloso e equilibrado em 0% — a meta "nenhum perfil em 0% em tudo" não foi atingida.

## Desempenho (tests de tempo que falhavam)
Causa raiz: a fonte de perks da agenda17 chamava `careerQ → overbooked → maxEnergy → perk('energy')`, que recalculava todas as
fontes de perks — inclusive a da agenda17 — em recursão até estourar a pilha; o `try/catch` de `computeEntries` engolia o erro.
Isso custava ~60% do tempo do mês. Agora uma reentrada devolve as entradas já somadas (`perks.ts`). Mês em 2005: 1,4 s → 0,36 s.
Na suíte completa (97 arquivos, 537 testes, todos passando): r14-db huge 843 ms/mês (limite 1,5 s), arco 2030 57 s, r8-social 25 s,
r9-identity-plus 21 s. O `content-c 2005` cai de ~500 s (estourava 300 s) para 39 s — mas também porque o bot simples (`bot.ts`)
agora quebra por volta de 2013 com o repasse 0,6 do streaming (como `content-a 1920` e `content-b 1960`, que já terminavam cedo
antes desta rodada; o teste exige só "sem exceção e caixa fechando"). Uma partida 2005 "estabelecida" vai aos 30 anos em ~180 s
(0,3 → 0,5 s/mês com 1.800 atos e 9.400 lançamentos); quentes restantes: `charts7` semanal, `hype12`, `sound` na composição.

## Passada de seguimento (insolvência, 360, corrida de playlists)
Mesmo lote: 3 perfis × 12 corridas (2 sementes por início 1965/1975/1990/2005/2012/2018) × 5 anos, processos paralelos
(`tmp-bal17/batch.sh` → `one.ts`, ~8 min por lote). Sementes novas (`b17-<início>-<k>`), então a linha "depois" acima é a
referência, não um pareamento exato.

1. **Insolvência com 4 meses seguidos no vermelho** (era 6; `economy.ts`, `INSOLVENT_AT`). Venda de emergência no 2º mês,
   reestruturação forçada no 3º, fim no 4º. O aviso mensal conta quantos meses faltam; o texto do cenário foi atualizado.
2. **360 com alavanca e teto** (`sys/deal360_17.ts`): fatia efetiva = fatia do contrato × alavanca da fama (100% até fama 45,
   cai até 40% em fama 93+ — a estrela renegocia) e teto anual por ato do que o selo leva via 360 (US$ 50 mil reais antes de
   1990, 70 mil até 2004, 90 mil de 2005 em diante). Vale para turnês, rotas, casa própria e a adoção do 360 (w4). A ficha de
   contrato explica na hora ("360 na prática: com fama X … até $Y por ano; já levado este ano").
3. **Corrida por playlists e anúncios (2010+)** (`overhead13.ts`, linha `arms`): 4% da receita acima de 400 mil/ano + 0,4 p.p.
   por lançamento nos últimos 12 meses (até 8%); teto de despesas gerais +5 p.p. a partir de 2010.

| perfil | quebra | já ficou negativo | mediana final | mediana ≤1990 | mediana 2012/2018 | tardio ÷ 1990 | faixa |
|---|---|---|---|---|---|---|---|
| **passo 1+2** (36 corridas) | | | | | | | |
| cautious | 0/12 (0%) | 2/12 | 1,83 mi | 1,15 mi | 2,98 mi | 4,6× | 342 mil … 4,20 mi |
| balanced | 2/12 (17%) | 7/12 | 182 mil | 157 mil | 391 mil | 3,6× | −12 mil … 1,20 mi |
| aggressive | 4/12 (33%) | 8/12 | 328 mil | −11 mil | 1,21 mi | 8,9× | −33 mil … 1,55 mi |
| **+ passo 3 (final)** | | | | | | | |
| cautious | 0/12 (0%) | 2/12 | 1,83 mi | 1,15 mi | 3,08 mi | 4,8× | 342 mil … 3,72 mi |
| balanced | 2/12 (17%) | 6/12 | 182 mil | 157 mil | 815 mil | 7,4× | −12 mil … 1,09 mi |
| aggressive | 4/12 (33%) | 8/12 | 396 mil | −11 mil | 725 mil | 5,3× | −33 mil … 1,47 mi |

Leitura:
- **Quebra**: equilibrado 0% → 17% (meta 10–25%, as duas quebras são os começos de 2005); agressivo 8% → 33% (abaixo de 50%);
  cauteloso continua 0% (nunca passa de 2 meses no vermelho).
- **Agressivo tardio**: mediana 2012/2018 caiu de 2,73 mi para 0,73 mi; o teto agora é 1,47 mi (antes 10,55 mi). O "÷ 1990" de
  5,3× é distorcido porque um dos dois começos de 1990 quebrou (mediana −11 mil); contra o sobrevivente de 1990 (292 mil) dá 2,5×.
- **Ruído**: com 2 sementes por início, o mesmo código move medianas de célula em 2× (o equilibrado tardio foi de 391 mil a 815 mil
  entre os lotes 1 e 2 sem mudança relevante para ele; o bot reage ao caixa e muda contratações/cortes). As razões tardio ÷ 1990
  do cauteloso (4,8×) e do equilibrado (3,6–7,4×) ficam acima da meta ~3–4× nesta amostra; o próximo botão seria a receita digital
  tardia (repasse do streaming) e não o 360, que deixou de ser o motor.

# Equilíbrio R17 — teste final (rápido e completo)

## Como foi rodado (≈ 15 min no total)
- **Playbot** (`src/sim/playbot16.ts` + `src/sim/playbot17.ts`): perfis cautious / balanced / aggressive × inícios 1960, 1975, 1990,
  2005, 2012, 2018 × 5 anos, um processo por corrida em paralelo (`nproc` = 4; ~5 min por lote de 18 corridas). O lote final usa
  2 sementes por início (36 corridas). Caixa final em US$ de 2020 (`toReal`). "Quebra" = fim por insolvência.
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
| **depois** (36 corridas) | | | | | | | |
| cautious | 0/12 (0%) | 4/12 | 2,21 mi | 1,34 mi | 3,04 mi | 3,1× | 616 mil … 3,76 mi |
| balanced | 0/12 (0%) | 4/12 | 625 mil | 150 mil | 992 mil | 3,2× | 57 mil … 1,75 mi |
| aggressive | 1/12 (8%) | 5/12 | 271 mil | 208 mil | 1,06 mi | 4,6× | −1 mil … 3,15 mi |

(tardio ÷ 1990 = mediana 2012/2018 ÷ mediana dos começos em 1990.)

## A passada de ajuste (uma só)
1. **Margem dos canais laterais só na fatia deles** (`outlets17.ts`, `shareOf`): antes a margem de cada canal valia para
   todas as unidades — loja própria (+25%) e vinil especial (+30%) davam aumento em tudo (cauteloso tardio ia a 9,6 mi) e clube do
   disco + supermercado + megastore (−58%) quebravam o agressivo antes de 2000. Agora streaming/janela/exclusivas valem para a
   venda inteira e os laterais para ~4× o alcance extra que trazem (5–60%). A interface mostra a margem efetiva.
2. **Repasse do streaming para o selo independente: 0,6** (`market.ts`, `STREAM_PAYOUT17`): rateio pró-rata, acordos das majors e
   distribuidora digital no meio. Com custo de fabricação quase zero, o digital rendia ~2,5× a receita de 1990 com metade do custo.
   Resultado: tardio ÷ 1990 caiu de 7–10× para **3,1–4,6×** (meta ~3×).
3. **Começo do zero 34 mil → 28 mil reais** (`worldgen.ts`): o primeiro ano aperta mais (4 em 12 equilibrados ficam negativos).
4. **Crédito realista** (`economy.ts`): banco não empresta depois de 2 meses no vermelho; cada empréstimo aberto reduz o próximo
   em 25% e soma 3 p.p. de juros (explicado em Finanças). Pesa sobretudo no agressivo (3–6 empréstimos por corrida).

## Leitura e pendências
- **Tardios × 1990**: dentro da meta para cauteloso/equilibrado (~3×); agressivo 4,6× (vende mais no digital com merch/360).
- **Agressivo ganha mais com mais risco**: maior teto (3,15 mi contra 1,75 mi do equilibrado), a única quebra e os mínimos mais fundos.
  O cauteloso ainda tem a melhor mediana — foco em 3 atos vence a diluição de lançamentos (`focusCap`), como em R16.
- **Quebra do equilibrado continua 0%** (meta 10–25%): 9 de 12 descem abaixo de US$ 5 mil e 4 ficam negativos, mas o bot corta
  equipe, vende catálogo na carta de aperto e se recupera antes de 6 meses seguidos no vermelho. Ficou fora desta passada única;
  próximo botão sugerido: insolvência com 4 meses seguidos (hoje 6) ou venda de catálogo com deságio maior.
- Nenhum perfil acima de 50% de quebra; cauteloso e equilibrado em 0% — a meta "nenhum perfil em 0% em tudo" não foi atingida.

## Desempenho (tests de tempo que falhavam)
Causa raiz: a fonte de perks da agenda17 chamava `careerQ → overbooked → maxEnergy → perk('energy')`, que recalculava todas as
fontes de perks — inclusive a da agenda17 — em recursão até estourar a pilha; o `try/catch` de `computeEntries` engolia o erro.
Isso custava ~60% do tempo do mês. Agora uma reentrada devolve as entradas já somadas (`perks.ts`). Mês em 2005: 1,4 s → 0,36 s;
`content-c 2005` 30 anos ~200 s sob carga (limite 300 s); r14-db huge 611 ms/mês (limite 1,5 s); arco 2030: 49 s.

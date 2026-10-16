# Onda 3 · P (Resultados por projeto + UNI-3/B.17 dinheiro pessoal) — medição

`npx tsx scripts/r31/measure.ts --jobs 2 --out docs/r31/p --label P-ligado` e
`… --out docs/r31/p-off --label P-desligado --sw purse31.draws=false` (interruptor `purse31.draws` desligado).
4 sementes × 5 eras × 36 meses. Tabelas completas em `p.json` / `p-off.json`.

| soma das 20 partidas | base30 (versão 30) | G (antes desta junção) | P ligado | P desligado |
|---|---|---|---|---|
| caixa (US$ 2020) | 3 402 127 | 3 005 357 | 3 514 987 | 3 514 987 |
| patrimônio (US$ 2020) | 110 618 448 | 94 732 793 | 100 327 543 | 100 327 543 |
| fama / atos / lançamentos / nº 1 | 395 / 65 / 364 / 45 | 399 / 69 / 362 / 54 | 390 / 62 / 414 / 55 | 390 / 62 / 414 / 55 |
| partidas encerradas | 2 | 3 | 3 | 3 |
| save JSON (bytes) | 174 955 627 | 178 181 939 | 182 052 399 | 182 052 819 |
| save gzip (bytes) | 34 429 972 | 34 990 077 | 35 997 752 | 35 997 931 |

- **Ligado × desligado: 0 diferenças nos números de jogo.** O robô não compra bens "pela empresa", não vai à
  reabilitação/internação paga pela empresa nem escolhe o herdeiro "cashout"; só nesses caminhos a regra muda a
  classificação (retirada em vez de custo). A diferença para G e para a base30 vem das frentes juntadas antes
  (D/Y re-mediram os goldens; E, F, G), não desta: os goldens r27-p2a, r27-p2b, r27-m3 e r16-playbot ficaram iguais com P.
- **Por que nada mudou nos números:** `purse`/`purseSet` aplicam exatamente a conta antiga (sem arredondar) e só
  registram; os resultados (`results31`) e o diário com contexto só leem os lançamentos; nenhum sorteio novo.
- **Save:** por partida, `res31` ≈ 22–24 KB, `dctx31` ≈ 11–13 KB, `purse31` ≈ 6–8 KB (`scripts/r31/probe-p-size.ts`,
  36 meses) — cerca de +40 KB por partida (+0,4% do save de 2012). O resto da diferença para G é das outras frentes.
- **Quanto fica sem marca** (`scripts/r31/probe-p.ts`, 1990, 36 meses): antes das marcas no ato, 43% do movimento
  (|valor|) ficava sem artista; com lançamento programado, logística de turnê, sync e encomendas marcados, 20%. O que
  sobra é custo da casa (salários, aluguel, serviços, escritório — rateado pela regra) e impostos/juros (nunca rateados).
  Em 2012 a parte sem artista sobe (33% do movimento): negócios fora da música (plataforma, veículos de mídia,
  promotora) e impostos — corretamente "não alocado".
- **Atalho de enriquecer pelo bolso (bens pessoais × empresa):** com a regra ligada, comprar um bem pessoal com o caixa
  da empresa é uma retirada (sai do caixa, não reduz o lucro, aparece no extrato como retirada + compra e pesa na
  confiança dos artistas como a retirada comum); desligada, vira custo da empresa e some do lucro — exatamente o
  atalho que a regra fecha (`tests/r31-pessoal.test.ts`). Bens continuam perdendo valor e cobrando manutenção (o
  carro popular perde valor em 12 meses; a manutenção aparece no extrato).

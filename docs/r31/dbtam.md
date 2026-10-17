# R31 · DBTAM — bases de artistas divididas pelos tamanhos de base de dados

Pedido do dono: dividir as bases pelo tamanho escolhido (para não pesar o jogo nem o save), números certos por tamanho, ano
e país, e a seleção de países funcionando em todas as bases.

## O que mudou

- **Critério por notoriedade** (`src/data/dbtam31.ts`, aplicado na carga em `sim/sys/realworld.ts`; vale sozinho para os atos
  novos que a frente BR ainda acrescentar):
  - **Média** (z 1) — o núcleo: BR com t ≤ 2 ou carreira de 20+ anos com 3+ discos e 2+ fontes (46); IT com t ≤ 2 ou
    vencedor de Sanremo/Eurovision (92); HITS sem ser one-hit wonder, com nº 1 nos EUA/Reino Unido/mundo e 2+ top 10 (92,
    passam a t 2). Mais as 8 estrelas (t 1) das listas antigas que estavam presas na Grande (Herbert Grönemeyer, Flume, aespa,
    IVE, LE SSERAFIM, Tate McRae, Jorge e Mateus e Paulo Londra), atrás da chave `base31.stars`.
  - **Grande** (z 2) — BR/IT com carreira de 15+ anos e 2+ discos (ou 30+ anos); IT do MusicBrainz com 10+ lançamentos; HITS
    com top 10 sem ser one-hit wonder, e o one-hit wonder que foi nº 1 nos EUA/Reino Unido/mundo.
  - **Enorme** (z 3) — a cauda longa: carreiras curtas ou pouco documentadas, regionais, MusicBrainz com < 10 lançamentos e
    os demais one-hit wonders.
  - **Pequena** — igual a antes (só os principais das listas originais). Originais e lote Z continuam onde estavam.
- **País** (`dbsize14.realCountry31`): passa a usar o país fichado (`cn`); antes era o da cidade (Rihanna contava como EUA,
  Hong Kong como China). O filtro `realOff31` agora também tira o **catálogo clássico** (os 100 arquétipos que viram nomes
  reais), no início, nas lendas já encerradas e na fila de estreia (`classicOff31`).
- **Números da Nova run** (`src/sim/dbcast31.ts`, fonte única com as regras do motor): estimativa por tamanho, ano e país
  (conta o modo livre/caos, o catálogo clássico e as chaves das bases) e o cartão de países com a contagem **do tamanho
  escolhido** (muda ao trocar de tamanho; um país desligado que some neste tamanho continua na lista para ser religado).
- **Desempenho** (mesmo resultado, conferido pelos goldens com as chaves desligadas):
  - `where31.actOfPid31` contava `s.acts` a cada consulta (12% do mês na Enorme); agora só quando a versão do índice muda.
  - `vitrine31.unsignedHere` varria todos os atos a cada tipo × vaga × lugar; agora uma vez por sorteio.
  - `member29.dissolveBand` passa a avisar o índice de atos (faltava o `actsTouched17`).

## Atos reais por tamanho
| Base | Pequena | Média | Grande | Enorme |
|---|---:|---:|---:|---:|
| originais | 682 | 1.332 | 3.092 | 3.415 |
| Z | 0 | 68 | 68 | 68 |
| BR | 0 | 46 | 242 | 337 |
| IT | 0 | 92 | 373 | 564 |
| HITS | 0 | 92 | 695 | 1.043 |
| **total** | **682** | **1.630** | **4.470** | **5.427** |

| País | Pequena | Média | Grande | Enorme | % na Média |
|---|---:|---:|---:|---:|---:|
| USA | 264 | 449 | 1.074 | 1.297 | 27.5% |
| BRA | 98 | 288 | 701 | 888 | 17.7% |
| ITA | 44 | 191 | 571 | 769 | 11.7% |
| GBR | 109 | 198 | 564 | 690 | 12.1% |
| FRA | 14 | 30 | 163 | 176 | 1.8% |
| DEU | 7 | 17 | 132 | 151 | 1.0% |
| AUS | 11 | 26 | 103 | 123 | 1.6% |
| CAN | 18 | 32 | 86 | 97 | 2.0% |
| JPN | 4 | 26 | 90 | 94 | 1.6% |
| KOR | 11 | 37 | 83 | 89 | 2.3% |
| SWE | 5 | 7 | 61 | 73 | 0.4% |
| ARG | 6 | 17 | 48 | 52 | 1.0% |
| NLD | 2 | 9 | 41 | 46 | 0.6% |
| ESP | 8 | 16 | 40 | 45 | 1.0% |
| MEX | 8 | 18 | 41 | 43 | 1.1% |

| Década de estreia | Pequena | Média | Grande | Enorme |
|---|---:|---:|---:|---:|
| até 1899 | 7 | 15 | 15 | 15 |
| 1900s | 13 | 19 | 19 | 23 |
| 1910s | 8 | 10 | 13 | 14 |
| 1920s | 11 | 51 | 69 | 70 |
| 1930s | 20 | 75 | 117 | 122 |
| 1940s | 25 | 48 | 84 | 87 |
| 1950s | 48 | 97 | 182 | 196 |
| 1960s | 104 | 191 | 427 | 458 |
| 1970s | 101 | 180 | 428 | 483 |
| 1980s | 98 | 198 | 417 | 496 |
| 1990s | 105 | 249 | 760 | 982 |
| 2000s | 70 | 212 | 806 | 1.041 |
| 2010s | 61 | 226 | 943 | 1.181 |
| 2020s | 11 | 59 | 190 | 259 |

A Média ainda é pesada em EUA, Brasil, Itália e Reino Unido. **Reequilíbrio por país** (medido e deixado de fora): devolver à
Média até 6 grandes nomes (t 2) de cada país com menos de 25 artistas nela (França, Alemanha, Japão, Suécia… 272 atos) custava
+11% a +23% no mês da Média. Ficou só a volta das 8 estrelas. Fica como opção para o dono, se aceitar a Média mais lenta.

## Tempo por mês e save, por tamanho e ano

Robô realista (`scripts/r31/measure.ts`), 12 meses. **Média** com 3 sementes e 1 processo (a medição de referência);
os outros tamanhos com 2 sementes e 2 processos (mais ruído, ±7%). "Antes" = ramo de integração (BR/IT/HITS só na Enorme).

| Média (3 sementes) | 1925 | 1975 | 2012 | 2030 |
|---|---:|---:|---:|---:|
| ms/mês antes | 344 | 769 | 1 280 | 1 605 |
| ms/mês depois | 328 (−5%) | 805 (+4,7%) | 1 355 (+5,9%) | 1 734 (+8,0%) |
| save gzip antes → depois (MB) | 0,42 → 0,42 | 1,20 → 1,28 | 1,93 → 2,18 | 1,91 → 2,15 |
| atos no mundo antes → depois | 211 → 211 | 731 → 797 | 1 322 → 1 529 | 1 455 → 1 674 |

| ms/mês (save JSON) | 1925 | 1975 | 2012 | 2030 |
|---|---:|---:|---:|---:|
| Pequena antes → depois | 232 → 238 | 646 → 677 | 1 269 → 1 225 | 1 277 → 1 235 (6,0 MB) |
| Grande antes → depois | 315 → 367 | 1 343 → 1 324 | 2 950 → 3 028 (17,8 → 21,1 MB) | 3 394 → 3 637 (20,4 → 24,0 MB) |
| Enorme antes → depois | 409 → 466 | 1 352 → 1 430 | 3 606 → 3 142 (24,2 → 24,3 MB) | 4 749 → 4 032 (28,5 → 28,4 MB) |

**Orçamento declarado** (máquina destas sessões, 2030, robô): Pequena ≤ 1,5 s/mês e 7 MB; Média ≤ +8% sobre antes das bases
(~1,8 s/mês) e 12 MB; Grande ≤ 4 s/mês e 25 MB; Enorme ≤ 5 s/mês e 30 MB. A meta de ~5% da Média cumpriu-se em 1925–2012
(até +5,9%); em 2030 ficou em +8% (92 atos de sucesso ativos a mais) — as duas otimizações exatas acima já descontam ~4 pontos.
Testes: `r31-dbtam` (Média < 3 s/mês e Enorme < 5 s/mês em 2012) e `r14-db` (Enorme < 3 s/mês; mede ~2,3 s, antes ~3,9 s).

## Estimativa da Nova run × mundo gerado

Semente fixa, nomes reais, modo livre (padrão): o total mostrado bate com o mundo em **−4,1% a +2,2%** nas 80 combinações
(4 tamanhos × 1925/1975/2012/2030 × nenhum país, Brasil, Itália, EUA ou Reino Unido desligado). Sem país desligado:

| Tamanho | 1925 | 1975 | 2012 | 2030 |
|---|---|---|---|---|
| Pequena | 97 × 97 | 393 × 396 | 741 × 729 | 790 × 796 |
| Média | 169 × 171 | 725 × 737 | 1 507 × 1 512 | 1 705 × 1 700 |
| Grande | 254 × 255 | 1 330 × 1 330 | 3 626 × 3 653 | 4 390 × 4 345 |
| Enorme | 394 × 390 | 1 557 × 1 577 | 4 419 × 4 424 | 5 407 × 5 391 |

(estimativa × mundo, artistas no início; `scripts/r31/dbtam-est.ts`). O teste `r31-dbtam` exige ±5% no total em 7 casos.

## Seleção de países

`realOff31` passa por `realAllowed` (listas: originais, Z, BR, IT, HITS) e `classicOff31` (catálogo clássico), no início e na
fila de estreia. Testado com Brasil, Itália, EUA e Reino Unido desligados um de cada vez na Enorme (nenhum ato real do país no
mundo nem nas filas; ligado, o país aparece em 2+ bases), estreias dois anos depois sem Brasil, "Desligar todos" (nenhum
artista real, filas vazias) e "Ligar todos" (lista vazia = mundo de sempre).

## Goldens

A base padrão (Média) mudou de propósito: r27-p2a/p2b 182589 / 3575668786 / 1693608899 / 3302724126 → 1109567 / 1382068899 /
3840120958 / 3918718534. Com `base31br`, `base31it`, `base31hits` e `base31stars` = false voltam os valores antigos (conferido).
r27-m3 e r16-playbot iguais.

## Arquivos

`src/data/dbtam31.ts` (critério), `src/sim/dbcast31.ts` (números), `src/sim/dbsize14.ts`, `src/sim/sys/realworld.ts`,
`src/sim/worldgen.ts`, `src/ui/newgame14db.ts`, `src/sim/sys/where31.ts`, `src/sim/r31/vitrine31.ts`, `src/sim/sys/member29.ts`,
`tests/r31-dbtam.test.ts`; scripts `scripts/r31/dbtam-{table,est,prof,golden}.ts`.

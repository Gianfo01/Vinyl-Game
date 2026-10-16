# Medição de referência — onda 3 · D+Y (padrão) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 1605 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 1.023 | 1.530 | 1.484 | 390 | 3,03 MB | 0,60 MB | 214 | 262 |
| 1955 | 4 | 1.569 | 4.644 | 4.820 | 960 | 5,92 MB | 1,16 MB | 464 | 263 |
| 1990 | 4 | 2.182 | 8.592 | 7.976 | 1.951 | 9,96 MB | 1,98 MB | 642 | 264 |
| 2012 | 4 | 2.331 | 11.322 | 11.080 | 2.925 | 12,76 MB | 2,52 MB | 1.821 | 264 |
| 2030 | 4 | 3.345 | 8.302 | 7.766 | 2.914 | 12,45 MB | 2,39 MB | 577 | 264 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 4 mil | 1,34 mi | 23 | 3 | 431 mil | 2 |
| 1955 | 1 mil | 430 mil | 18 | 3 | 369 mil | 1 |
| 1990 | -4 mil | 2,06 mi | 17 | 3 | 740 mil | 1 |
| 2012 | 314 mil | 12,34 mi | 20 | 5 | 2,83 mi | 0 |
| 2030 | 186 mil | 6,06 mi | 20 | 4 | 2,14 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 07/1901 | 1569/2179/2867 | 2,06 MB | 0,45 MB | 262 | -37 mil | -166 mil | 14 | 38/35 | 3 | 6 | 1 | 1900: 36 mil | insolvency |
| 1900 | `r31-base-1` | 01/1903 | 1867/2657/3910 | 3,83 MB | 0,73 MB | 262 | 23 mil | 2,81 mi | 33 | 24/81 | 3 | 23 | 19 | 1900: 95 mil · 1901: 383 mil · 1902: 792 mil | não |
| 1900 | `r31-base-2` | 09/1901 | 1606/2307/2741 | 2,35 MB | 0,51 MB | 262 | -16 mil | -123 mil | 15 | 32/38 | 3 | 7 | 1 | 1900: 69 mil | insolvency |
| 1900 | `r31-base-3` | 01/1903 | 1133/1893/1923 | 3,71 MB | 0,70 MB | 262 | 80 mil | 3,84 mi | 30 | 19/75 | 3 | 26 | 10 | 1900: 109 mil · 1901: 457 mil · 1902: 1,73 mi | não |
| 1955 | `r31-base-0` | 08/1956 | 3962/5112/8523 | 5,28 MB | 1,14 MB | 263 | -3 mil | -106 mil | 14 | 51/35 | 3 | 13 | 0 | 1955: 140 mil | insolvency |
| 1955 | `r31-base-1` | 01/1958 | 4520/6196/7120 | 5,91 MB | 1,17 MB | 263 | 31 mil | 893 mil | 22 | 67/54 | 3 | 9 | 0 | 1955: 99 mil · 1956: 481 mil · 1957: 551 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 5026/7515/9312 | 5,92 MB | 1,16 MB | 263 | 0 mil | 438 mil | 20 | 71/49 | 3 | 19 | 0 | 1955: 69 mil · 1956: 196 mil · 1957: 412 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 4745/7322/9466 | 5,99 MB | 1,18 MB | 265 | 2 mil | 421 mil | 16 | 60/40 | 3 | 16 | 0 | 1955: 132 mil · 1956: 351 mil · 1957: 327 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 7281/11213/15022 | 9,95 MB | 1,97 MB | 265 | 0 mil | 2,09 mi | 15 | 69/38 | 3 | 15 | 0 | 1990: 173 mil · 1991: 360 mil · 1992: 734 mil | não |
| 1990 | `r31-base-1` | 01/1993 | 9201/16319/20808 | 10,14 MB | 2,02 MB | 263 | -23 mil | 2,03 mi | 18 | 53/46 | 3 | 16 | 0 | 1990: 137 mil · 1991: 354 mil · 1992: 746 mil | não |
| 1990 | `r31-base-2` | 01/1993 | 9649/15237/21813 | 9,97 MB | 1,99 MB | 263 | 8 mil | 3,87 mi | 18 | 48/44 | 3 | 12 | 0 | 1990: 181 mil · 1991: 482 mil · 1992: 1,34 mi | não |
| 1990 | `r31-base-3` | 05/1991 | 7795/10212/10923 | 8,73 MB | 1,91 MB | 264 | -9 mil | -126 mil | 15 | 40/36 | 3 | 7 | 0 | 1990: 89 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 11074/17398/20921 | 12,78 MB | 2,53 MB | 264 | 452 mil | 14,84 mi | 20 | 79/50 | 5 | 28 | 0 | 2012: 216 mil · 2013: 1,68 mi · 2014: 3,07 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 10486/14813/20805 | 12,72 MB | 2,49 MB | 264 | 45 mil | 6,62 mi | 19 | 75/47 | 2 | 11 | 0 | 2012: 76 mil · 2013: 529 mil · 2014: 1,51 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 10691/16516/19652 | 12,73 MB | 2,51 MB | 264 | 176 mil | 13,90 mi | 22 | 70/55 | 5 | 22 | 3 | 2012: 50 mil · 2013: 256 mil · 2014: 2,60 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 13036/20105/25008 | 13,13 MB | 2,56 MB | 263 | 964 mil | 10,77 mi | 19 | 77/48 | 5 | 35 | 0 | 2012: 201 mil · 2013: 1,80 mi · 2014: 4,87 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 6990/8831/12847 | 12,36 MB | 2,36 MB | 264 | 2 mil | 5,59 mi | 16 | 66/39 | 3 | 16 | 0 | 2030: 38 mil · 2031: 316 mil · 2032: 1,60 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 7537/10896/17648 | 12,30 MB | 2,35 MB | 265 | 163 mil | 3,79 mi | 20 | 65/51 | 3 | 22 | 0 | 2030: 65 mil · 2031: 278 mil · 2032: 1,64 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 8616/13762/15170 | 12,97 MB | 2,47 MB | 264 | 1,16 mi | 14,72 mi | 20 | 83/50 | 5 | 40 | 0 | 2030: 113 mil · 2031: 3,08 mi · 2032: 7,90 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 10066/14654/21401 | 12,53 MB | 2,41 MB | 264 | 210 mil | 6,54 mi | 20 | 65/50 | 5 | 31 | 0 | 2030: 47 mil · 2031: 618 mil · 2032: 2,64 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 492.258 |
| `chron9` | 309.727 |
| `facts17` | 246.169 |
| `fame15` | 216.451 |
| `creation` | 148.405 |
| `leisure14` | 124.967 |
| `ag18` | 117.724 |
| `attn` | 108.380 |
| `deleg31` | 102.833 |
| `fest8` | 93.843 |
| `fame16` | 93.214 |
| `st28` | 91.656 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

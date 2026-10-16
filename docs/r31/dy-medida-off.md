# Medição de referência — onda 3 · D+Y desligados (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 355 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 168 | 191 | 187 | 200 | 3,66 MB | 0,70 MB | 62 | 266 |
| 1955 | 4 | 272 | 502 | 487 | 493 | 6,04 MB | 1,18 MB | 66 | 266 |
| 1990 | 4 | 417 | 938 | 886 | 897 | 9,88 MB | 1,99 MB | 146 | 267 |
| 2012 | 4 | 654 | 1.499 | 1.501 | 1.455 | 12,63 MB | 2,48 MB | 332 | 267 |
| 2030 | 4 | 899 | 1.712 | 1.667 | 1.675 | 12,45 MB | 2,37 MB | 177 | 267 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 53 mil | 2,54 mi | 27 | 3 | 903 mil | 1 |
| 1955 | 71 mil | 1,35 mi | 17 | 3 | 815 mil | 0 |
| 1990 | 98 mil | 2,92 mi | 19 | 3 | 977 mil | 1 |
| 2012 | 368 mil | 10,99 mi | 18 | 4 | 3,13 mi | 0 |
| 2030 | 167 mil | 4,32 mi | 19 | 4 | 1,91 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 09/1901 | 162/226/252 | 2,40 MB | 0,52 MB | 266 | -13 mil | -131 mil | 22 | 30/55 | 3 | 10 | 7 | 1900: 54 mil | insolvency |
| 1900 | `r31-base-1` | 01/1903 | 199/305/492 | 3,66 MB | 0,71 MB | 266 | 0 mil | 2,69 mi | 25 | 12/63 | 3 | 25 | 7 | 1900: 55 mil · 1901: 482 mil · 1902: 978 mil | não |
| 1900 | `r31-base-2` | 01/1903 | 199/273/315 | 3,67 MB | 0,71 MB | 265 | 105 mil | 2,39 mi | 30 | 33/75 | 3 | 21 | 17 | 1900: 61 mil · 1901: 179 mil · 1902: 829 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 192/276/376 | 3,66 MB | 0,69 MB | 265 | 210 mil | 5,30 mi | 28 | 23/70 | 3 | 22 | 9 | 1900: 60 mil · 1901: 610 mil · 1902: 1,73 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 506/733/837 | 6,38 MB | 1,24 MB | 266 | 125 mil | 3,81 mi | 17 | 71/42 | 3 | 13 | 0 | 1955: 149 mil · 1956: 695 mil · 1957: 1,92 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 458/602/701 | 5,78 MB | 1,14 MB | 266 | 172 mil | 728 mil | 19 | 68/47 | 3 | 11 | 0 | 1955: 86 mil · 1956: 261 mil · 1957: 473 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 537/858/969 | 6,06 MB | 1,18 MB | 266 | -3 mil | 1,34 mi | 17 | 77/42 | 3 | 25 | 0 | 1955: 75 mil · 1956: 571 mil · 1957: 1,02 mi | não |
| 1955 | `r31-base-3` | 01/1958 | 507/822/1028 | 6,03 MB | 1,18 MB | 268 | 18 mil | 1,35 mi | 17 | 73/43 | 3 | 15 | 0 | 1955: 133 mil · 1956: 406 mil · 1957: 610 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1007/1422/1561 | 9,87 MB | 1,96 MB | 268 | 141 mil | 4,38 mi | 19 | 58/48 | 3 | 14 | 0 | 1990: 125 mil · 1991: 448 mil · 1992: 1,25 mi | não |
| 1990 | `r31-base-1` | 07/1991 | 780/927/1236 | 9,18 MB | 2,05 MB | 266 | -7 mil | -105 mil | 14 | 44/36 | 3 | 11 | 0 | 1990: 108 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 975/1261/1868 | 9,90 MB | 1,97 MB | 267 | 54 mil | 1,96 mi | 18 | 54/44 | 3 | 15 | 0 | 1990: 109 mil · 1991: 201 mil · 1992: 701 mil | não |
| 1990 | `r31-base-3` | 01/1993 | 912/1251/2032 | 10,07 MB | 2,01 MB | 266 | 216 mil | 3,89 mi | 19 | 50/47 | 3 | 17 | 0 | 1990: 201 mil · 1991: 456 mil · 1992: 1,41 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 1544/2301/2632 | 12,78 MB | 2,51 MB | 267 | 625 mil | 14,51 mi | 20 | 78/49 | 5 | 32 | 0 | 2012: 110 mil · 2013: 956 mil · 2014: 4,36 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1486/2060/2701 | 12,51 MB | 2,47 MB | 267 | 282 mil | 7,46 mi | 18 | 72/46 | 3 | 25 | 0 | 2012: 41 mil · 2013: 364 mil · 2014: 1,90 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1476/2127/2435 | 12,63 MB | 2,48 MB | 268 | 454 mil | 14,64 mi | 17 | 77/43 | 5 | 24 | 0 | 2012: 71 mil · 2013: 806 mil · 2014: 4,58 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1491/1846/2106 | 12,63 MB | 2,48 MB | 266 | 33 mil | 5,03 mi | 18 | 70/45 | 3 | 22 | 0 | 2012: 102 mil · 2013: 617 mil · 2014: 1,34 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 1891/2561/2900 | 12,44 MB | 2,37 MB | 267 | 175 mil | 3,56 mi | 17 | 67/43 | 4 | 21 | 0 | 2030: 19 mil · 2031: 325 mil · 2032: 1,92 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 1820/2342/2572 | 12,25 MB | 2,33 MB | 268 | 171 mil | 3,56 mi | 20 | 67/50 | 3 | 10 | 0 | 2030: 69 mil · 2031: 1,04 mi · 2032: 960 mil | não |
| 2030 | `r31-base-2` | 01/2033 | 1577/2006/2153 | 12,57 MB | 2,39 MB | 267 | 162 mil | 5,48 mi | 19 | 75/49 | 4 | 18 | 0 | 2030: 53 mil · 2031: 373 mil · 2032: 1,91 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1558/2189/2411 | 12,46 MB | 2,37 MB | 267 | 98 mil | 5,08 mi | 19 | 70/47 | 3 | 27 | 0 | 2030: 59 mil · 2031: 735 mil · 2032: 2,30 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 486.436 |
| `chron9` | 311.194 |
| `facts17` | 248.404 |
| `fame15` | 217.953 |
| `creation` | 147.308 |
| `leisure14` | 127.546 |
| `relics9` | 116.223 |
| `ag18` | 114.329 |
| `attn` | 103.334 |
| `fame16` | 97.841 |
| `st28` | 94.628 |
| `fest8` | 93.926 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

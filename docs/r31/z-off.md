# Medição de referência — z-off (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 332 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 181 | 183 | 178 | 204 | 3,69 MB | 0,71 MB | 42 | 266 |
| 1955 | 4 | 217 | 453 | 442 | 475 | 5,64 MB | 1,17 MB | 75 | 267 |
| 1990 | 4 | 367 | 974 | 967 | 1.011 | 10,28 MB | 2,04 MB | 131 | 267 |
| 2012 | 4 | 466 | 1.431 | 1.429 | 1.540 | 13,22 MB | 2,57 MB | 166 | 268 |
| 2030 | 4 | 714 | 1.613 | 1.593 | 1.832 | 12,95 MB | 2,45 MB | 168 | 268 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 44 mil | 3,75 mi | 28 | 3 | 1,39 mi | 0 |
| 1955 | -1 mil | 1,57 mi | 15 | 3 | 777 mil | 2 |
| 1990 | 19 mil | 3,58 mi | 17 | 3 | 1,34 mi | 1 |
| 2012 | 310 mil | 14,95 mi | 19 | 5 | 4,31 mi | 0 |
| 2030 | 177 mil | 5,08 mi | 19 | 3 | 1,90 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 175/240/264 | 3,77 MB | 0,70 MB | 268 | 68 mil | 4,31 mi | 29 | 24/72 | 3 | 24 | 14 | 1900: 67 mil · 1901: 552 mil · 1902: 1,62 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 191/268/333 | 3,60 MB | 0,71 MB | 266 | 13 mil | 2,20 mi | 22 | 17/56 | 3 | 18 | 5 | 1900: 64 mil · 1901: 251 mil · 1902: 809 mil | não |
| 1900 | `r31-base-2` | 01/1903 | 203/266/353 | 4,04 MB | 0,76 MB | 266 | 29 mil | 4,17 mi | 29 | 18/74 | 3 | 28 | 15 | 1900: 88 mil · 1901: 502 mil · 1902: 1,52 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 162/216/252 | 3,61 MB | 0,67 MB | 266 | 60 mil | 3,34 mi | 27 | 16/67 | 3 | 23 | 9 | 1900: 72 mil · 1901: 477 mil · 1902: 1,25 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 519/690/860 | 6,29 MB | 1,22 MB | 267 | 1 mil | 3,24 mi | 15 | 69/39 | 3 | 22 | 0 | 1955: 121 mil · 1956: 720 mil · 1957: 1,48 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 483/712/801 | 6,01 MB | 1,17 MB | 267 | 177 mil | 3,31 mi | 21 | 69/52 | 3 | 17 | 0 | 1955: 105 mil · 1956: 470 mil · 1957: 1,64 mi | não |
| 1955 | `r31-base-2` | 10/1956 | 390/497/552 | 5,27 MB | 1,17 MB | 267 | -3 mil | -106 mil | 14 | 56/35 | 3 | 7 | 0 | 1955: 66 mil | insolvency |
| 1955 | `r31-base-3` | 10/1956 | 351/453/646 | 5,18 MB | 1,15 MB | 269 | -9 mil | -112 mil | 13 | 50/34 | 3 | 7 | 0 | 1955: 75 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1028/1415/1623 | 10,36 MB | 2,06 MB | 268 | 53 mil | 3,56 mi | 19 | 57/46 | 3 | 19 | 0 | 1990: 52 mil · 1991: 283 mil · 1992: 1,27 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 678/878/903 | 8,56 MB | 1,88 MB | 267 | -16 mil | -133 mil | 13 | 38/32 | 3 | 10 | 0 | 1990: 85 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1007/1458/1907 | 10,45 MB | 2,09 MB | 267 | 184 mil | 5,11 mi | 17 | 59/43 | 3 | 23 | 0 | 1990: 194 mil · 1991: 462 mil · 1992: 1,90 mi | não |
| 1990 | `r31-base-3` | 01/1993 | 1003/1694/2187 | 10,20 MB | 2,03 MB | 267 | -72 mil | 3,60 mi | 16 | 44/41 | 3 | 12 | 0 | 1990: 63 mil · 1991: 213 mil · 1992: 1,40 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 1419/2106/2686 | 13,35 MB | 2,59 MB | 268 | 450 mil | 24,43 mi | 19 | 83/48 | 5 | 32 | 0 | 2012: 104 mil · 2013: 1,41 mi · 2014: 8,65 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1301/1751/2574 | 13,06 MB | 2,54 MB | 268 | 170 mil | 10,90 mi | 18 | 73/46 | 3 | 22 | 1 | 2012: 44 mil · 2013: 381 mil · 2014: 2,30 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1486/2125/2559 | 13,44 MB | 2,63 MB | 268 | 591 mil | 19,00 mi | 18 | 75/45 | 5 | 25 | 1 | 2012: 98 mil · 2013: 815 mil · 2014: 6,26 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1520/1918/3197 | 13,09 MB | 2,55 MB | 267 | 154 mil | 8,21 mi | 22 | 78/54 | 5 | 33 | 0 | 2012: 149 mil · 2013: 802 mil · 2014: 2,36 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 1639/2038/2418 | 12,92 MB | 2,44 MB | 267 | 100 mil | 3,47 mi | 17 | 66/42 | 3 | 13 | 0 | 2030: 46 mil · 2031: 299 mil · 2032: 1,56 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 1761/2144/2678 | 12,97 MB | 2,46 MB | 268 | 144 mil | 6,69 mi | 20 | 67/51 | 3 | 26 | 0 | 2030: 66 mil · 2031: 652 mil · 2032: 2,23 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 1667/2570/3104 | 13,57 MB | 2,58 MB | 268 | 1,11 mi | 17,05 mi | 14 | 82/35 | 5 | 32 | 0 | 2030: 114 mil · 2031: 3,62 mi · 2032: 8,79 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1383/1990/2173 | 12,80 MB | 2,44 MB | 267 | 209 mil | 2,92 mi | 20 | 58/50 | 3 | 26 | 0 | 2030: 35 mil · 2031: 415 mil · 2032: 1,37 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 492.194 |
| `chron9` | 318.999 |
| `facts17` | 246.297 |
| `fame15` | 222.100 |
| `creation` | 151.132 |
| `leisure14` | 126.614 |
| `ag18` | 118.383 |
| `relics9` | 116.272 |
| `st28` | 107.484 |
| `attn` | 103.797 |
| `fame16` | 97.565 |
| `deleg31` | 96.467 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

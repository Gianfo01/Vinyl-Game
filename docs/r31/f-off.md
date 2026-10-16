# Medição de referência — F (know31.rivals e know31.intim desligados) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 350 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 146 | 214 | 203 | 211 | 3,69 MB | 0,71 MB | 46 | 265 |
| 1955 | 4 | 225 | 428 | 438 | 446 | 5,52 MB | 1,15 MB | 61 | 266 |
| 1990 | 4 | 401 | 901 | 882 | 937 | 9,99 MB | 1,98 MB | 199 | 267 |
| 2012 | 4 | 628 | 1.536 | 1.507 | 1.510 | 12,73 MB | 2,50 MB | 328 | 267 |
| 2030 | 4 | 968 | 1.769 | 1.753 | 1.745 | 12,50 MB | 2,38 MB | 319 | 267 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 44 mil | 3,75 mi | 28 | 3 | 1,39 mi | 0 |
| 1955 | -3 mil | 557 mil | 15 | 3 | 338 mil | 2 |
| 1990 | 57 mil | 2,55 mi | 18 | 3 | 1,06 mi | 1 |
| 2012 | 115 mil | 5,36 mi | 18 | 3 | 1,52 mi | 0 |
| 2030 | 238 mil | 4,04 mi | 19 | 4 | 1,54 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 215/344/491 | 3,77 MB | 0,70 MB | 267 | 68 mil | 4,31 mi | 29 | 24/72 | 3 | 24 | 14 | 1900: 67 mil · 1901: 552 mil · 1902: 1,62 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 222/313/333 | 3,60 MB | 0,71 MB | 265 | 13 mil | 2,20 mi | 22 | 17/56 | 3 | 18 | 5 | 1900: 64 mil · 1901: 251 mil · 1902: 809 mil | não |
| 1900 | `r31-base-2` | 01/1903 | 216/316/524 | 4,04 MB | 0,76 MB | 265 | 29 mil | 4,17 mi | 29 | 18/74 | 3 | 28 | 15 | 1900: 88 mil · 1901: 502 mil · 1902: 1,52 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 205/317/425 | 3,61 MB | 0,67 MB | 265 | 60 mil | 3,34 mi | 27 | 16/67 | 3 | 23 | 9 | 1900: 72 mil · 1901: 477 mil · 1902: 1,25 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 446/632/780 | 6,29 MB | 1,22 MB | 266 | 1 mil | 3,24 mi | 15 | 69/39 | 3 | 22 | 0 | 1955: 121 mil · 1956: 720 mil · 1957: 1,48 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 441/625/772 | 5,76 MB | 1,14 MB | 266 | 67 mil | 1,22 mi | 19 | 67/46 | 3 | 11 | 0 | 1955: 86 mil · 1956: 261 mil · 1957: 600 mil | não |
| 1955 | `r31-base-2` | 10/1956 | 430/537/820 | 5,28 MB | 1,17 MB | 266 | -7 mil | -110 mil | 14 | 56/35 | 3 | 7 | 0 | 1955: 66 mil | insolvency |
| 1955 | `r31-base-3` | 08/1956 | 365/531/574 | 4,92 MB | 1,09 MB | 268 | -9 mil | -118 mil | 14 | 54/35 | 3 | 4 | 0 | 1955: 75 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1002/1400/1494 | 10,02 MB | 1,99 MB | 268 | 205 mil | 2,71 mi | 19 | 70/46 | 3 | 16 | 0 | 1990: 93 mil · 1991: 342 mil · 1992: 1,36 mi | não |
| 1990 | `r31-base-1` | 01/1993 | 998/1395/1486 | 10,09 MB | 2,00 MB | 266 | 121 mil | 2,39 mi | 16 | 66/41 | 3 | 9 | 0 | 1990: 132 mil · 1991: 428 mil · 1992: 869 mil | não |
| 1990 | `r31-base-2` | 06/1991 | 704/813/1000 | 8,83 MB | 1,93 MB | 267 | -7 mil | -116 mil | 14 | 44/35 | 3 | 6 | 0 | 1990: 104 mil | insolvency |
| 1990 | `r31-base-3` | 01/1993 | 797/1127/1471 | 9,96 MB | 1,98 MB | 266 | -89 mil | 4,77 mi | 21 | 56/52 | 3 | 18 | 0 | 1990: 314 mil · 1991: 609 mil · 1992: 1,25 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 1640/2430/3061 | 12,88 MB | 2,53 MB | 267 | 842 mil | 16,16 mi | 20 | 83/51 | 5 | 33 | 1 | 2012: 110 mil · 2013: 896 mil · 2014: 5,96 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1452/2290/3159 | 12,71 MB | 2,49 MB | 268 | -76 mil | 6,58 mi | 17 | 74/42 | 3 | 27 | 0 | 2012: 58 mil · 2013: 374 mil · 2014: 1,70 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1524/1934/2077 | 12,61 MB | 2,49 MB | 266 | 65 mil | 3,42 mi | 18 | 66/45 | 3 | 24 | 0 | 2012: 48 mil · 2013: 392 mil · 2014: 1,34 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1529/1895/2340 | 12,76 MB | 2,50 MB | 266 | 165 mil | 4,13 mi | 15 | 68/39 | 3 | 11 | 0 | 2012: 102 mil · 2013: 789 mil · 2014: 1,16 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 1895/2409/2595 | 12,47 MB | 2,37 MB | 267 | 35 mil | 4,40 mi | 20 | 72/51 | 2 | 7 | 0 | 2030: 25 mil · 2031: 658 mil · 2032: 1,45 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 1889/2272/2861 | 12,28 MB | 2,33 MB | 268 | 239 mil | 3,12 mi | 18 | 63/45 | 4 | 22 | 0 | 2030: 77 mil · 2031: 567 mil · 2032: 1,58 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 1761/2570/3235 | 13,12 MB | 2,51 MB | 267 | 1,05 mi | 10,83 mi | 19 | 83/48 | 5 | 34 | 0 | 2030: 131 mil · 2031: 3,10 mi · 2032: 6,60 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1531/2020/2513 | 12,53 MB | 2,39 MB | 266 | 237 mil | 3,67 mi | 19 | 67/47 | 3 | 27 | 0 | 2030: 71 mil · 2031: 440 mil · 2032: 1,51 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 480.478 |
| `chron9` | 307.410 |
| `facts17` | 245.873 |
| `fame15` | 216.456 |
| `creation` | 148.159 |
| `leisure14` | 127.905 |
| `ag18` | 117.633 |
| `relics9` | 115.735 |
| `deleg31` | 114.662 |
| `st28` | 100.820 |
| `fame16` | 98.724 |
| `fest8` | 94.142 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

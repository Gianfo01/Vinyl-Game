# Medição de referência — UNI-4-ligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 339 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 183 | 317 | 314 | 365 | 3,81 MB | 0,72 MB | 39 | 274 |
| 1955 | 4 | 256 | 712 | 743 | 791 | 6,06 MB | 1,19 MB | 69 | 275 |
| 1990 | 4 | 455 | 1.431 | 1.455 | 1.587 | 10,39 MB | 2,07 MB | 155 | 275 |
| 2012 | 4 | 681 | 2.031 | 2.008 | 2.296 | 13,40 MB | 2,62 MB | 212 | 276 |
| 2030 | 4 | 958 | 2.377 | 2.207 | 2.627 | 13,37 MB | 2,54 MB | 195 | 275 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 17 mil | 3,32 mi | 29 | 3 | 1,15 mi | 1 |
| 1955 | 32 mil | 456 mil | 17 | 3 | 372 mil | 1 |
| 1990 | 33 mil | 1,38 mi | 17 | 3 | 518 mil | 0 |
| 2012 | 462 mil | 12,62 mi | 21 | 5 | 4,58 mi | 0 |
| 2030 | 531 mil | 9,48 mi | 20 | 5 | 3,77 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 09/1902 | 284/365/407 | 3,34 MB | 0,70 MB | 275 | -17 mil | -90 mil | 17 | 39/43 | 3 | 15 | 3 | 1900: 40 mil · 1901: 182 mil | insolvency |
| 1900 | `r31-base-1` | 01/1903 | 356/516/668 | 4,05 MB | 0,75 MB | 274 | 11 mil | 4,76 mi | 34 | 18/84 | 3 | 27 | 22 | 1900: 89 mil · 1901: 942 mil · 1902: 1,56 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 332/485/581 | 3,78 MB | 0,73 MB | 274 | 22 mil | 1,88 mi | 31 | 31/77 | 3 | 11 | 16 | 1900: 90 mil · 1901: 175 mil · 1902: 739 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 293/387/520 | 3,83 MB | 0,72 MB | 274 | 138 mil | 5,42 mi | 27 | 20/69 | 3 | 29 | 10 | 1900: 106 mil · 1901: 977 mil · 1902: 2,08 mi | não |
| 1955 | `r31-base-0` | 08/1956 | 629/748/1078 | 5,31 MB | 1,15 MB | 275 | -15 mil | -116 mil | 12 | 52/29 | 3 | 12 | 0 | 1955: 194 mil | insolvency |
| 1955 | `r31-base-1` | 01/1958 | 738/1016/1068 | 5,97 MB | 1,17 MB | 275 | 76 mil | 1,03 mi | 20 | 60/49 | 3 | 10 | 0 | 1955: 86 mil · 1956: 503 mil · 1957: 663 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 732/985/1199 | 6,15 MB | 1,21 MB | 275 | 30 mil | 724 mil | 18 | 71/44 | 3 | 20 | 0 | 1955: 88 mil · 1956: 273 mil · 1957: 462 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 710/915/994 | 6,23 MB | 1,23 MB | 276 | 33 mil | 189 mil | 16 | 68/41 | 3 | 12 | 0 | 1955: 112 mil · 1956: 431 mil · 1957: 282 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1491/1888/2226 | 10,60 MB | 2,12 MB | 276 | -43 mil | 2,75 mi | 18 | 58/46 | 3 | 20 | 0 | 1990: 187 mil · 1991: 372 mil · 1992: 916 mil | não |
| 1990 | `r31-base-1` | 01/1993 | 1444/2054/2066 | 10,47 MB | 2,08 MB | 275 | 96 mil | 1,31 mi | 16 | 45/41 | 2 | 3 | 0 | 1990: 137 mil · 1991: 230 mil · 1992: 589 mil | não |
| 1990 | `r31-base-2` | 01/1993 | 1422/1783/2075 | 10,31 MB | 2,06 MB | 275 | 33 mil | 826 mil | 17 | 58/43 | 3 | 5 | 0 | 1990: 141 mil · 1991: 309 mil · 1992: 317 mil | não |
| 1990 | `r31-base-3` | 01/1993 | 1365/1878/2222 | 10,21 MB | 2,04 MB | 275 | 33 mil | 1,44 mi | 14 | 44/36 | 2 | 9 | 0 | 1990: 124 mil · 1991: 287 mil · 1992: 446 mil | não |
| 2012 | `r31-base-0` | 01/2015 | 2121/2958/3265 | 13,59 MB | 2,65 MB | 276 | 796 mil | 18,77 mi | 22 | 89/54 | 5 | 35 | 0 | 2012: 75 mil · 2013: 1,75 mi · 2014: 7,87 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1996/2598/3452 | 13,22 MB | 2,60 MB | 276 | 294 mil | 10,62 mi | 17 | 76/43 | 5 | 32 | 0 | 2012: 78 mil · 2013: 603 mil · 2014: 2,99 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2146/3020/3704 | 13,73 MB | 2,68 MB | 275 | 630 mil | 14,63 mi | 20 | 71/51 | 5 | 35 | 1 | 2012: 100 mil · 2013: 1,13 mi · 2014: 6,17 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1861/2492/2939 | 13,17 MB | 2,59 MB | 276 | 201 mil | 10,54 mi | 22 | 80/56 | 5 | 19 | 0 | 2012: 62 mil · 2013: 676 mil · 2014: 2,88 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2402/3000/6323 | 13,25 MB | 2,52 MB | 275 | 301 mil | 8,31 mi | 19 | 80/47 | 5 | 22 | 0 | 2030: 45 mil · 2031: 1,94 mi · 2032: 2,46 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2403/3276/5142 | 13,16 MB | 2,51 MB | 276 | 524 mil | 13,38 mi | 21 | 69/53 | 5 | 26 | 0 | 2030: 110 mil · 2031: 1,07 mi · 2032: 4,42 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2623/3834/4682 | 13,53 MB | 2,57 MB | 275 | 539 mil | 10,14 mi | 22 | 78/56 | 5 | 25 | 0 | 2030: 131 mil · 2031: 2,33 mi · 2032: 3,13 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2080/2806/3157 | 13,48 MB | 2,57 MB | 275 | 734 mil | 8,81 mi | 19 | 71/47 | 5 | 59 | 0 | 2030: 49 mil · 2031: 1,87 mi · 2032: 4,46 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 495.267 |
| `chron9` | 310.722 |
| `facts17` | 246.963 |
| `fame15` | 230.220 |
| `creation` | 155.037 |
| `st28` | 138.787 |
| `leisure14` | 125.628 |
| `ag18` | 124.810 |
| `attn` | 122.732 |
| `relics9` | 115.722 |
| `deleg31` | 114.145 |
| `festivals` | 99.902 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

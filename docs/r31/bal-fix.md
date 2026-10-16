# Medição de referência — bal fix1 (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 479 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 148 | 231 | 233 | 234 | 3,88 MB | 0,73 MB | 32 | 271 |
| 1955 | 4 | 201 | 558 | 556 | 525 | 6,06 MB | 1,19 MB | 54 | 271 |
| 1990 | 4 | 325 | 933 | 895 | 1.031 | 10,33 MB | 2,09 MB | 101 | 271 |
| 2012 | 4 | 758 | 1.619 | 1.589 | 1.490 | 13,23 MB | 2,60 MB | 131 | 272 |
| 2030 | 4 | 1.346 | 3.167 | 3.040 | 1.851 | 13,25 MB | 2,51 MB | 351 | 272 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 106 mil | 5,58 mi | 28 | 3 | 2,13 mi | 0 |
| 1955 | 57 mil | 2,49 mi | 17 | 3 | 1,08 mi | 0 |
| 1990 | 2 mil | 1,31 mi | 18 | 3 | 590 mil | 1 |
| 2012 | 81 mil | 13,76 mi | 20 | 4 | 3,11 mi | 0 |
| 2030 | 508 mil | 15,35 mi | 21 | 5 | 4,10 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 252/372/546 | 3,80 MB | 0,73 MB | 271 | 58 mil | 5,46 mi | 27 | 20/69 | 3 | 23 | 13 | 1900: 97 mil · 1901: 748 mil · 1902: 1,97 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 227/314/377 | 3,86 MB | 0,74 MB | 271 | 92 mil | 3,82 mi | 29 | 23/72 | 3 | 23 | 10 | 1900: 178 mil · 1901: 994 mil · 1902: 1,97 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 219/292/489 | 3,89 MB | 0,73 MB | 270 | 119 mil | 6,01 mi | 27 | 15/68 | 3 | 25 | 10 | 1900: 176 mil · 1901: 790 mil · 1902: 2,46 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 227/330/360 | 3,89 MB | 0,72 MB | 270 | 261 mil | 5,70 mi | 33 | 14/82 | 3 | 26 | 18 | 1900: 73 mil · 1901: 972 mil · 1902: 2,29 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 580/852/1073 | 6,44 MB | 1,26 MB | 271 | 86 mil | 3,78 mi | 15 | 66/39 | 3 | 27 | 0 | 1955: 205 mil · 1956: 950 mil · 1957: 1,84 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 538/765/1073 | 5,86 MB | 1,16 MB | 271 | 49 mil | 2,36 mi | 17 | 67/42 | 2 | 9 | 0 | 1955: 139 mil · 1956: 585 mil · 1957: 1,01 mi | não |
| 1955 | `r31-base-2` | 01/1958 | 537/787/1222 | 5,96 MB | 1,18 MB | 271 | 65 mil | 1,00 mi | 19 | 66/49 | 3 | 8 | 0 | 1955: 134 mil · 1956: 278 mil · 1957: 610 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 579/793/941 | 6,16 MB | 1,21 MB | 273 | 22 mil | 2,62 mi | 17 | 60/44 | 3 | 21 | 1 | 1955: 163 mil · 1956: 633 mil · 1957: 1,14 mi | não |
| 1990 | `r31-base-0` | 01/1993 | 980/1424/1576 | 10,34 MB | 2,06 MB | 272 | 21 mil | 984 mil | 17 | 58/42 | 3 | 21 | 0 | 1990: 128 mil · 1991: 274 mil · 1992: 470 mil | não |
| 1990 | `r31-base-1` | 09/1991 | 757/986/1180 | 9,86 MB | 2,16 MB | 271 | -6 mil | -99 mil | 14 | 36/36 | 3 | 12 | 0 | 1990: 105 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 968/1297/1588 | 10,56 MB | 2,11 MB | 271 | -19 mil | 5,93 mi | 18 | 61/44 | 3 | 13 | 0 | 1990: 169 mil · 1991: 658 mil · 1992: 1,93 mi | não |
| 1990 | `r31-base-3` | 01/1993 | 948/1505/1922 | 10,33 MB | 2,07 MB | 271 | 10 mil | 1,64 mi | 19 | 54/48 | 3 | 14 | 0 | 1990: 118 mil · 1991: 253 mil · 1992: 710 mil | não |
| 2012 | `r31-base-0` | 01/2015 | 1773/2226/2875 | 13,16 MB | 2,60 MB | 272 | -90 mil | 17,04 mi | 20 | 73/49 | 3 | 25 | 0 | 2012: 132 mil · 2013: 807 mil · 2014: 3,68 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1657/2169/3106 | 13,02 MB | 2,57 MB | 273 | 224 mil | 13,52 mi | 17 | 70/43 | 3 | 23 | 0 | 2012: 81 mil · 2013: 310 mil · 2014: 2,81 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1515/1974/2066 | 13,31 MB | 2,61 MB | 272 | 332 mil | 14,00 mi | 20 | 68/50 | 5 | 21 | 1 | 2012: 93 mil · 2013: 607 mil · 2014: 3,41 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1533/1887/2044 | 13,32 MB | 2,62 MB | 272 | -61 mil | 12,22 mi | 20 | 75/50 | 4 | 25 | 1 | 2012: 185 mil · 2013: 728 mil · 2014: 2,52 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2946/3658/4078 | 13,31 MB | 2,51 MB | 272 | 619 mil | 14,64 mi | 21 | 78/52 | 5 | 24 | 0 | 2030: 70 mil · 2031: 2,20 mi · 2032: 3,97 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 3036/4066/5510 | 13,19 MB | 2,50 MB | 273 | 397 mil | 16,07 mi | 21 | 77/53 | 3 | 19 | 0 | 2030: 87 mil · 2031: 976 mil · 2032: 4,24 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 3474/5254/5634 | 13,80 MB | 2,61 MB | 272 | 1,09 mi | 20,04 mi | 18 | 83/44 | 5 | 41 | 0 | 2030: 221 mil · 2031: 4,55 mi · 2032: 9,95 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 3214/4112/5785 | 13,09 MB | 2,50 MB | 271 | 119 mil | 7,52 mi | 20 | 75/51 | 5 | 30 | 0 | 2030: 83 mil · 2031: 600 mil · 2032: 2,90 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 490.464 |
| `chron9` | 320.187 |
| `facts17` | 252.839 |
| `fame15` | 227.798 |
| `st28` | 161.758 |
| `creation` | 154.390 |
| `ag18` | 126.209 |
| `leisure14` | 125.010 |
| `relics9` | 115.851 |
| `attn` | 112.766 |
| `deleg31` | 104.647 |
| `fest8` | 94.280 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

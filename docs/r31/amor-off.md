# Medição de referência — AMOR (desligado) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 489 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 275 | 435 | 411 | 510 | 3,75 MB | 0,72 MB | 54 | 289 |
| 1955 | 4 | 366 | 1.022 | 1.038 | 1.134 | 6,03 MB | 1,19 MB | 90 | 289 |
| 1990 | 4 | 580 | 2.094 | 2.094 | 2.308 | 10,48 MB | 2,10 MB | 208 | 289 |
| 2012 | 4 | 838 | 3.283 | 3.056 | 3.638 | 13,43 MB | 2,63 MB | 278 | 290 |
| 2030 | 4 | 1.184 | 3.179 | 3.064 | 3.654 | 13,20 MB | 2,52 MB | 272 | 290 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 176 mil | 4,42 mi | 28 | 3 | 1,74 mi | 0 |
| 1955 | 30 mil | 865 mil | 18 | 3 | 555 mil | 1 |
| 1990 | 49 mil | 1,00 mi | 19 | 3 | 478 mil | 0 |
| 2012 | 354 mil | 11,09 mi | 20 | 5 | 4,56 mi | 0 |
| 2030 | 216 mil | 5,79 mi | 19 | 4 | 2,25 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 449/631/971 | 3,70 MB | 0,72 MB | 289 | 216 mil | 5,00 mi | 32 | 25/79 | 3 | 23 | 19 | 1900: 61 mil · 1901: 675 mil · 1902: 2,02 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 447/651/874 | 3,87 MB | 0,74 MB | 289 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 424/586/704 | 3,67 MB | 0,73 MB | 288 | 191 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 977 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 421/675/945 | 3,80 MB | 0,72 MB | 288 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 1105/1491/1664 | 6,29 MB | 1,25 MB | 289 | 236 mil | 2,13 mi | 17 | 68/43 | 3 | 12 | 0 | 1955: 165 mil · 1956: 280 mil · 1957: 1,02 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 1035/1379/2089 | 6,08 MB | 1,20 MB | 289 | 24 mil | 1,16 mi | 24 | 68/60 | 3 | 14 | 0 | 1955: 105 mil · 1956: 356 mil · 1957: 698 mil | não |
| 1955 | `r31-base-2` | 08/1956 | 829/1070/1586 | 5,11 MB | 1,11 MB | 289 | -14 mil | -137 mil | 13 | 56/33 | 3 | 10 | 0 | 1955: 57 mil | insolvency |
| 1955 | `r31-base-3` | 01/1958 | 1029/1469/1599 | 5,99 MB | 1,18 MB | 291 | 36 mil | 575 mil | 19 | 62/48 | 3 | 20 | 1 | 1955: 98 mil · 1956: 523 mil · 1957: 412 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 2075/2793/3390 | 10,31 MB | 2,06 MB | 291 | 68 mil | 1,03 mi | 18 | 64/46 | 3 | 10 | 0 | 1990: 203 mil · 1991: 241 mil · 1992: 575 mil | não |
| 1990 | `r31-base-1` | 01/1993 | 2060/2884/3314 | 10,50 MB | 2,10 MB | 289 | 31 mil | 970 mil | 20 | 49/50 | 3 | 6 | 0 | 1990: 166 mil · 1991: 287 mil · 1992: 381 mil | não |
| 1990 | `r31-base-2` | 01/1993 | 2003/2662/3781 | 10,46 MB | 2,10 MB | 289 | 5 mil | 332 mil | 19 | 50/47 | 3 | 7 | 0 | 1990: 133 mil · 1991: 195 mil · 1992: 189 mil | não |
| 1990 | `r31-base-3` | 01/1993 | 2239/3223/4314 | 10,57 MB | 2,12 MB | 289 | 78 mil | 5,53 mi | 17 | 49/43 | 3 | 21 | 0 | 1990: 137 mil · 1991: 348 mil · 1992: 2,11 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 3755/7067/9795 | 13,75 MB | 2,67 MB | 291 | 501 mil | 23,65 mi | 19 | 82/47 | 5 | 36 | 0 | 2012: 87 mil · 2013: 1,98 mi · 2014: 7,07 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 3126/4224/5681 | 13,34 MB | 2,61 MB | 291 | 162 mil | 9,49 mi | 19 | 69/47 | 3 | 27 | 0 | 2012: 72 mil · 2013: 547 mil · 2014: 2,55 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 3183/4926/6109 | 13,39 MB | 2,62 MB | 289 | 207 mil | 9,68 mi | 20 | 76/49 | 5 | 30 | 0 | 2012: 93 mil · 2013: 619 mil · 2014: 3,22 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 3068/4227/5205 | 13,48 MB | 2,63 MB | 289 | 1,19 mi | 12,50 mi | 21 | 79/52 | 5 | 24 | 0 | 2012: 154 mil · 2013: 1,32 mi · 2014: 5,90 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 3288/4537/5619 | 13,09 MB | 2,49 MB | 290 | 227 mil | 5,12 mi | 16 | 75/39 | 3 | 25 | 0 | 2030: 37 mil · 2031: 478 mil · 2032: 2,20 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 3314/4266/6414 | 13,33 MB | 2,54 MB | 291 | 204 mil | 6,46 mi | 21 | 65/54 | 5 | 27 | 0 | 2030: 92 mil · 2031: 728 mil · 2032: 2,29 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 3210/4355/5424 | 13,32 MB | 2,55 MB | 290 | 745 mil | 12,41 mi | 20 | 79/51 | 5 | 27 | 0 | 2030: 71 mil · 2031: 850 mil · 2032: 4,72 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2902/3718/4499 | 12,86 MB | 2,45 MB | 290 | 66 mil | 2,75 mi | 18 | 71/46 | 3 | 14 | 0 | 2030: 50 mil · 2031: 244 mil · 2032: 827 mil | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 491.256 |
| `chron9` | 313.124 |
| `facts17` | 252.087 |
| `fame15` | 223.555 |
| `creation` | 153.525 |
| `leisure14` | 127.579 |
| `ag18` | 117.283 |
| `relics9` | 114.726 |
| `attn` | 107.337 |
| `st28` | 100.134 |
| `fame16` | 96.462 |
| `fest8` | 93.971 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

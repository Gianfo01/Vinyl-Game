# Medição de referência — base-br (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 4 partidas em paralelo; tempo total 311 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 206 | 326 | 312 | 357 | 3,84 MB | 0,73 MB | 44 | 286 |
| 1955 | 4 | 294 | 862 | 868 | 830 | 6,32 MB | 1,26 MB | 104 | 288 |
| 1990 | 4 | 596 | 1.613 | 1.609 | 1.559 | 10,99 MB | 2,23 MB | 202 | 287 |
| 2012 | 4 | 789 | 2.523 | 2.490 | 2.443 | 14,46 MB | 2,85 MB | 488 | 288 |
| 2030 | 4 | 1.527 | 2.823 | 2.791 | 2.723 | 14,10 MB | 2,68 MB | 422 | 287 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 128 mil | 4,68 mi | 32 | 3 | 1,65 mi | 0 |
| 1955 | 21 mil | 1,00 mi | 19 | 3 | 522 mil | 0 |
| 1990 | -2 mil | 594 mil | 16 | 3 | 240 mil | 1 |
| 2012 | 569 mil | 16,64 mi | 23 | 5 | 4,60 mi | 0 |
| 2030 | 607 mil | 11,82 mi | 21 | 5 | 5,38 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 318/422/689 | 3,65 MB | 0,70 MB | 287 | 4 mil | 2,41 mi | 33 | 31/82 | 3 | 20 | 22 | 1900: 41 mil · 1901: 308 mil · 1902: 699 mil | não |
| 1900 | `r31-base-1` | 01/1903 | 353/536/795 | 4,20 MB | 0,77 MB | 286 | 138 mil | 6,36 mi | 35 | 11/87 | 3 | 29 | 25 | 1900: 89 mil · 1901: 875 mil · 1902: 2,15 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 360/535/654 | 3,87 MB | 0,74 MB | 286 | 118 mil | 3,02 mi | 30 | 30/75 | 3 | 22 | 14 | 1900: 90 mil · 1901: 208 mil · 1902: 1,14 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 271/399/453 | 3,81 MB | 0,72 MB | 286 | 292 mil | 6,33 mi | 27 | 15/67 | 3 | 24 | 8 | 1900: 88 mil · 1901: 723 mil · 1902: 2,58 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 881/1249/1358 | 6,59 MB | 1,30 MB | 288 | 16 mil | 2,12 mi | 16 | 72/41 | 2 | 12 | 1 | 1955: 157 mil · 1956: 614 mil · 1957: 1,15 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 831/1158/1346 | 6,37 MB | 1,26 MB | 288 | 25 mil | 1,06 mi | 20 | 64/51 | 3 | 11 | 0 | 1955: 69 mil · 1956: 422 mil · 1957: 557 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 876/1163/1792 | 6,27 MB | 1,26 MB | 287 | 31 mil | 687 mil | 18 | 63/45 | 3 | 16 | 0 | 1955: 82 mil · 1956: 305 mil · 1957: 487 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 859/1199/1271 | 6,26 MB | 1,24 MB | 287 | 9 mil | 947 mil | 19 | 65/46 | 3 | 12 | 0 | 1955: 82 mil · 1956: 292 mil · 1957: 452 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1588/2109/2408 | 11,01 MB | 2,21 MB | 287 | 1 mil | 211 mil | 17 | 60/43 | 3 | 4 | 0 | 1990: 154 mil · 1991: 294 mil · 1992: 151 mil | não |
| 1990 | `r31-base-1` | 01/1993 | 1707/2239/3478 | 11,21 MB | 2,25 MB | 287 | 89 mil | 4,23 mi | 16 | 54/40 | 2 | 17 | 0 | 1990: 154 mil · 1991: 240 mil · 1992: 1,49 mi | não |
| 1990 | `r31-base-2` | 01/1993 | 1677/2277/2575 | 10,97 MB | 2,20 MB | 287 | -4 mil | 977 mil | 16 | 47/41 | 3 | 4 | 0 | 1990: 137 mil · 1991: 231 mil · 1992: 328 mil | não |
| 1990 | `r31-base-3` | 09/1991 | 1372/1744/1907 | 10,71 MB | 2,36 MB | 287 | -10 mil | -116 mil | 16 | 37/40 | 3 | 11 | 0 | 1990: 55 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 2427/2924/3913 | 14,26 MB | 2,82 MB | 288 | 789 mil | 14,80 mi | 23 | 77/57 | 5 | 28 | 1 | 2012: 81 mil · 2013: 864 mil · 2014: 4,81 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 2591/3429/5131 | 14,61 MB | 2,86 MB | 288 | 349 mil | 16,31 mi | 21 | 78/52 | 5 | 25 | 1 | 2012: 91 mil · 2013: 973 mil · 2014: 4,39 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2429/3148/4439 | 14,45 MB | 2,85 MB | 288 | 297 mil | 18,41 mi | 22 | 83/54 | 5 | 27 | 4 | 2012: 73 mil · 2013: 409 mil · 2014: 3,41 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2646/3565/4236 | 14,48 MB | 2,85 MB | 287 | 855 mil | 16,97 mi | 23 | 88/57 | 5 | 36 | 3 | 2012: 274 mil · 2013: 2,53 mi · 2014: 6,69 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2906/3432/4278 | 14,12 MB | 2,69 MB | 287 | 778 mil | 13,04 mi | 22 | 81/56 | 5 | 24 | 0 | 2030: 16 mil · 2031: 1,49 mi · 2032: 6,28 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2728/3372/3524 | 14,08 MB | 2,68 MB | 288 | 762 mil | 15,34 mi | 22 | 83/55 | 5 | 23 | 0 | 2030: 73 mil · 2031: 1,18 mi · 2032: 6,81 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2896/3511/4608 | 14,26 MB | 2,73 MB | 287 | 452 mil | 10,61 mi | 19 | 75/48 | 5 | 24 | 0 | 2030: 70 mil · 2031: 522 mil · 2032: 4,48 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2764/3182/3398 | 13,80 MB | 2,64 MB | 287 | -34 mil | 3,59 mi | 16 | 68/41 | 3 | 17 | 0 | 2030: 43 mil · 2031: 531 mil · 2032: 1,20 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 490.964 |
| `chron9` | 332.498 |
| `facts17` | 251.771 |
| `fame15` | 246.190 |
| `creation` | 164.720 |
| `st28` | 145.645 |
| `ag18` | 130.685 |
| `leisure14` | 126.425 |
| `attn` | 123.774 |
| `relics9` | 116.693 |
| `festivals` | 99.637 |
| `fame16` | 94.820 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

# Medição de referência — g desligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 1591 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 417 | 779 | 738 | 262 | 3,69 MB | 0,72 MB | 163 | 263 |
| 1955 | 4 | 745 | 1.650 | 1.555 | 579 | 5,48 MB | 1,15 MB | 222 | 264 |
| 1990 | 4 | 1.443 | 4.586 | 4.198 | 1.411 | 9,97 MB | 1,98 MB | 537 | 264 |
| 2012 | 4 | 1.727 | 6.224 | 5.951 | 2.055 | 12,70 MB | 2,49 MB | 680 | 265 |
| 2030 | 4 | 2.500 | 8.443 | 8.000 | 2.359 | 12,46 MB | 2,38 MB | 653 | 265 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 62 mil | 3,50 mi | 30 | 3 | 1,17 mi | 1 |
| 1955 | 14 mil | 308 mil | 16 | 3 | 274 mil | 2 |
| 1990 | 49 mil | 3,45 mi | 19 | 3 | 1,03 mi | 0 |
| 2012 | 182 mil | 7,81 mi | 18 | 4 | 2,00 mi | 0 |
| 2030 | 140 mil | 4,03 mi | 19 | 5 | 1,88 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 859/1369/2262 | 3,77 MB | 0,70 MB | 265 | 117 mil | 4,28 mi | 29 | 23/72 | 3 | 24 | 13 | 1900: 67 mil · 1901: 552 mil · 1902: 1,64 mi | não |
| 1900 | `r31-base-1` | 10/1902 | 787/1258/1991 | 3,56 MB | 0,74 MB | 263 | -18 mil | -87 mil | 21 | 26/54 | 3 | 15 | 4 | 1900: 64 mil · 1901: 311 mil | insolvency |
| 1900 | `r31-base-2` | 01/1903 | 727/1061/1533 | 4,07 MB | 0,77 MB | 263 | 31 mil | 3,98 mi | 30 | 30/74 | 3 | 24 | 16 | 1900: 88 mil · 1901: 529 mil · 1902: 1,39 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 742/1186/1369 | 3,61 MB | 0,68 MB | 263 | 92 mil | 3,03 mi | 33 | 18/81 | 3 | 15 | 18 | 1900: 72 mil · 1901: 340 mil · 1902: 955 mil | não |
| 1955 | `r31-base-0` | 01/1958 | 1991/3200/4330 | 6,18 MB | 1,22 MB | 264 | 37 mil | 3,43 mi | 18 | 66/46 | 3 | 20 | 0 | 1955: 121 mil · 1956: 693 mil · 1957: 1,77 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 1657/2572/2982 | 5,77 MB | 1,14 MB | 264 | 172 mil | 729 mil | 19 | 68/47 | 3 | 11 | 0 | 1955: 86 mil · 1956: 261 mil · 1957: 473 mil | não |
| 1955 | `r31-base-2` | 10/1956 | 1459/2026/2673 | 5,19 MB | 1,15 MB | 264 | -10 mil | -113 mil | 14 | 53/36 | 3 | 7 | 0 | 1955: 66 mil | insolvency |
| 1955 | `r31-base-3` | 08/1956 | 1203/1859/3378 | 4,91 MB | 1,09 MB | 266 | -9 mil | -118 mil | 14 | 54/35 | 3 | 4 | 0 | 1955: 75 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 4963/7083/9484 | 10,16 MB | 2,03 MB | 266 | 59 mil | 5,11 mi | 19 | 73/47 | 3 | 15 | 0 | 1990: 93 mil · 1991: 315 mil · 1992: 1,83 mi | não |
| 1990 | `r31-base-1` | 01/1993 | 5105/7770/8609 | 10,08 MB | 2,00 MB | 264 | 122 mil | 2,40 mi | 16 | 66/41 | 3 | 9 | 0 | 1990: 132 mil · 1991: 428 mil · 1992: 870 mil | não |
| 1990 | `r31-base-2` | 01/1993 | 4154/5980/9303 | 9,87 MB | 1,96 MB | 264 | 40 mil | 1,59 mi | 19 | 49/47 | 2 | 3 | 0 | 1990: 152 mil · 1991: 352 mil · 1992: 449 mil | não |
| 1990 | `r31-base-3` | 01/1993 | 4121/7082/8506 | 9,87 MB | 1,96 MB | 264 | -79 mil | 4,50 mi | 21 | 60/51 | 3 | 18 | 0 | 1990: 314 mil · 1991: 609 mil · 1992: 1,20 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 6425/10015/14087 | 12,82 MB | 2,51 MB | 265 | 352 mil | 16,23 mi | 22 | 86/55 | 5 | 34 | 2 | 2012: 110 mil · 2013: 901 mil · 2014: 5,97 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 6372/10130/11999 | 12,70 MB | 2,49 MB | 266 | 76 mil | 7,38 mi | 18 | 73/44 | 3 | 26 | 1 | 2012: 58 mil · 2013: 367 mil · 2014: 1,84 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 6267/9493/11236 | 12,56 MB | 2,48 MB | 265 | 72 mil | 1,99 mi | 16 | 66/41 | 3 | 19 | 0 | 2012: 48 mil · 2013: 369 mil · 2014: 997 mil | não |
| 2012 | `r31-base-3` | 01/2015 | 5831/7925/10238 | 12,70 MB | 2,48 MB | 264 | 288 mil | 8,23 mi | 18 | 76/45 | 5 | 25 | 0 | 2012: 102 mil · 2013: 842 mil · 2014: 2,17 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 9111/12368/15368 | 12,49 MB | 2,39 MB | 264 | 13 mil | 4,67 mi | 21 | 73/52 | 5 | 14 | 0 | 2030: 25 mil · 2031: 368 mil · 2032: 1,79 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 8702/11822/17106 | 12,32 MB | 2,33 MB | 266 | 62 mil | 3,28 mi | 19 | 66/47 | 3 | 14 | 0 | 2030: 77 mil · 2031: 544 mil · 2032: 1,33 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 8317/11326/15950 | 13,04 MB | 2,47 MB | 265 | 1,37 mi | 20,82 mi | 18 | 84/44 | 5 | 38 | 0 | 2030: 131 mil · 2031: 3,24 mi · 2032: 8,95 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 7644/9822/17198 | 12,42 MB | 2,37 MB | 265 | 219 mil | 3,39 mi | 14 | 64/36 | 5 | 27 | 0 | 2030: 60 mil · 2031: 488 mil · 2032: 1,97 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 486.656 |
| `chron9` | 310.940 |
| `facts17` | 243.040 |
| `fame15` | 216.605 |
| `creation` | 147.967 |
| `leisure14` | 127.198 |
| `ag18` | 125.000 |
| `deleg31` | 117.769 |
| `relics9` | 115.390 |
| `attn` | 103.136 |
| `fame16` | 99.735 |
| `fest8` | 93.746 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

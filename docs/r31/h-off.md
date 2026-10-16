# Medição de referência — h-off (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 245 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 147 | 226 | 218 | 270 | 3,75 MB | 0,72 MB | 41 | 273 |
| 1955 | 4 | 251 | 532 | 546 | 600 | 5,96 MB | 1,20 MB | 61 | 274 |
| 1990 | 4 | 358 | 1.053 | 1.045 | 1.190 | 9,49 MB | 1,97 MB | 106 | 274 |
| 2012 | 4 | 551 | 1.618 | 1.619 | 1.836 | 13,39 MB | 2,62 MB | 154 | 274 |
| 2030 | 4 | 818 | 1.894 | 1.748 | 2.204 | 13,22 MB | 2,52 MB | 145 | 274 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 129 mil | 4,82 mi | 28 | 3 | 1,83 mi | 0 |
| 1955 | -7 mil | 244 mil | 16 | 3 | 281 mil | 2 |
| 1990 | -4 mil | 695 mil | 16 | 4 | 264 mil | 2 |
| 2012 | 576 mil | 10,96 mi | 20 | 5 | 4,49 mi | 0 |
| 2030 | 360 mil | 10,58 mi | 21 | 4 | 3,36 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 232/303/386 | 3,73 MB | 0,72 MB | 273 | 98 mil | 6,26 mi | 32 | 25/81 | 3 | 23 | 19 | 1900: 66 mil · 1901: 601 mil · 1902: 2,20 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 230/327/431 | 3,85 MB | 0,74 MB | 273 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 222/287/336 | 3,63 MB | 0,72 MB | 272 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 218/334/425 | 3,77 MB | 0,71 MB | 272 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 07/1956 | 504/701/735 | 5,25 MB | 1,15 MB | 273 | -25 mil | -129 mil | 15 | 51/38 | 3 | 12 | 0 | 1955: 138 mil | insolvency |
| 1955 | `r31-base-1` | 01/1958 | 563/753/838 | 5,95 MB | 1,18 MB | 273 | 53 mil | 837 mil | 19 | 63/47 | 2 | 10 | 0 | 1955: 62 mil · 1956: 288 mil · 1957: 505 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 549/701/1005 | 6,08 MB | 1,21 MB | 274 | -4 mil | 570 mil | 17 | 66/43 | 3 | 12 | 0 | 1955: 57 mil · 1956: 271 mil · 1957: 366 mil | não |
| 1955 | `r31-base-3` | 06/1957 | 490/634/703 | 5,97 MB | 1,29 MB | 275 | -9 mil | -82 mil | 15 | 62/38 | 3 | 9 | 0 | 1955: 101 mil · 1956: 196 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1166/1630/1849 | 10,38 MB | 2,08 MB | 274 | 144 mil | 4,06 mi | 17 | 58/42 | 3 | 10 | 0 | 1990: 239 mil · 1991: 595 mil · 1992: 1,45 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 814/1123/1147 | 8,60 MB | 1,85 MB | 273 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1113/1532/1885 | 10,45 MB | 2,10 MB | 273 | 9 mil | 1,52 mi | 19 | 55/47 | 3 | 8 | 0 | 1990: 221 mil · 1991: 304 mil · 1992: 436 mil | não |
| 1990 | `r31-base-3` | 04/1991 | 864/1208/1327 | 8,61 MB | 1,85 MB | 275 | -17 mil | -135 mil | 14 | 37/35 | 4 | 9 | 0 | 1990: 76 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 1664/2337/3015 | 13,65 MB | 2,67 MB | 274 | 1,01 mi | 19,22 mi | 21 | 76/53 | 5 | 36 | 0 | 2012: 142 mil · 2013: 1,76 mi · 2014: 7,52 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1521/1954/2508 | 13,18 MB | 2,59 MB | 276 | 86 mil | 9,31 mi | 19 | 72/47 | 3 | 24 | 0 | 2012: 59 mil · 2013: 459 mil · 2014: 2,32 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1626/2317/2810 | 13,44 MB | 2,64 MB | 273 | 187 mil | 9,05 mi | 19 | 75/49 | 5 | 33 | 1 | 2012: 113 mil · 2013: 550 mil · 2014: 2,90 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1661/2259/2890 | 13,34 MB | 2,61 MB | 274 | 965 mil | 12,61 mi | 21 | 85/53 | 5 | 34 | 0 | 2012: 92 mil · 2013: 1,05 mi · 2014: 6,08 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2331/3509/3804 | 13,45 MB | 2,54 MB | 274 | 513 mil | 13,26 mi | 22 | 80/54 | 5 | 21 | 0 | 2030: 82 mil · 2031: 2,25 mi · 2032: 3,68 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 1814/2207/2387 | 13,09 MB | 2,49 MB | 274 | 100 mil | 5,87 mi | 19 | 71/47 | 3 | 13 | 0 | 2030: 49 mil · 2031: 646 mil · 2032: 1,62 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 1841/2334/2788 | 13,32 MB | 2,54 MB | 274 | 1,44 mi | 15,41 mi | 22 | 78/54 | 5 | 57 | 0 | 2030: 143 mil · 2031: 991 mil · 2032: 8,32 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1590/2106/2486 | 13,11 MB | 2,50 MB | 274 | 206 mil | 7,91 mi | 19 | 71/46 | 3 | 29 | 0 | 2030: 115 mil · 2031: 786 mil · 2032: 3,03 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 489.703 |
| `chron9` | 310.219 |
| `facts17` | 253.124 |
| `fame15` | 228.143 |
| `creation` | 151.222 |
| `st28` | 132.099 |
| `leisure14` | 126.352 |
| `relics9` | 116.078 |
| `deleg31` | 113.279 |
| `ag18` | 112.512 |
| `attn` | 111.109 |
| `fame16` | 97.219 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

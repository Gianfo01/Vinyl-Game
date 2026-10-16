# Medição de referência — onda3 junta + bal31.mercy (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 554 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 192 | 305 | 288 | 302 | 3,75 MB | 0,72 MB | 61 | 272 |
| 1955 | 4 | 311 | 716 | 710 | 687 | 6,03 MB | 1,20 MB | 75 | 273 |
| 1990 | 4 | 497 | 1.543 | 1.492 | 1.463 | 10,43 MB | 2,11 MB | 181 | 273 |
| 2012 | 4 | 685 | 2.309 | 2.266 | 2.173 | 13,40 MB | 2,63 MB | 512 | 273 |
| 2030 | 4 | 1.092 | 2.700 | 2.654 | 2.390 | 13,36 MB | 2,54 MB | 310 | 273 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 132 mil | 4,80 mi | 28 | 3 | 1,87 mi | 0 |
| 1955 | 45 mil | 482 mil | 17 | 3 | 372 mil | 0 |
| 1990 | 39 mil | 3,25 mi | 17 | 3 | 1,10 mi | 1 |
| 2012 | 209 mil | 9,59 mi | 21 | 5 | 2,78 mi | 0 |
| 2030 | 634 mil | 11,53 mi | 22 | 5 | 5,23 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 322/431/683 | 3,73 MB | 0,72 MB | 272 | 116 mil | 5,41 mi | 33 | 25/83 | 3 | 23 | 21 | 1900: 66 mil · 1901: 599 mil · 1902: 2,12 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 298/421/607 | 3,81 MB | 0,73 MB | 272 | 114 mil | 4,19 mi | 27 | 22/67 | 3 | 20 | 10 | 1900: 88 mil · 1901: 294 mil · 1902: 1,62 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 325/428/725 | 3,63 MB | 0,72 MB | 271 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 277/388/613 | 3,77 MB | 0,71 MB | 271 | 149 mil | 5,75 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 110 mil · 1901: 895 mil · 1902: 2,28 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 780/1111/1254 | 6,34 MB | 1,25 MB | 273 | 54 mil | 1,01 mi | 17 | 57/42 | 3 | 4 | 0 | 1955: 138 mil · 1956: 477 mil · 1957: 577 mil | não |
| 1955 | `r31-base-1` | 01/1958 | 668/918/1158 | 5,83 MB | 1,16 MB | 272 | 31 mil | 239 mil | 19 | 65/46 | 3 | 13 | 0 | 1955: 61 mil · 1956: 205 mil · 1957: 283 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 694/1020/1197 | 5,98 MB | 1,19 MB | 273 | 63 mil | 453 mil | 17 | 67/43 | 3 | 10 | 0 | 1955: 57 mil · 1956: 273 mil · 1957: 318 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 723/1007/1454 | 6,08 MB | 1,21 MB | 274 | 36 mil | 511 mil | 17 | 72/43 | 3 | 10 | 0 | 1955: 101 mil · 1956: 196 mil · 1957: 426 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1610/2193/2917 | 10,36 MB | 2,07 MB | 273 | -36 mil | 3,05 mi | 16 | 59/41 | 3 | 19 | 0 | 1990: 239 mil · 1991: 597 mil · 1992: 1,09 mi | não |
| 1990 | `r31-base-1` | 01/1993 | 1716/2521/3024 | 10,56 MB | 2,11 MB | 272 | 95 mil | 4,03 mi | 19 | 57/46 | 3 | 23 | 0 | 1990: 108 mil · 1991: 584 mil · 1992: 1,10 mi | não |
| 1990 | `r31-base-2` | 01/1993 | 1497/2140/2343 | 10,50 MB | 2,11 MB | 272 | 92 mil | 3,45 mi | 18 | 51/45 | 3 | 22 | 0 | 1990: 199 mil · 1991: 274 mil · 1992: 1,40 mi | não |
| 1990 | `r31-base-3` | 10/1991 | 1214/1663/1817 | 9,95 MB | 2,17 MB | 274 | -13 mil | -106 mil | 15 | 37/37 | 4 | 12 | 0 | 1990: 80 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 2301/3453/4134 | 13,58 MB | 2,66 MB | 273 | 1,07 mi | 18,54 mi | 21 | 83/53 | 5 | 37 | 0 | 2012: 142 mil · 2013: 1,78 mi · 2014: 7,81 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 2114/2995/3913 | 13,26 MB | 2,61 MB | 275 | 213 mil | 11,54 mi | 23 | 75/57 | 5 | 26 | 1 | 2012: 60 mil · 2013: 466 mil · 2014: 2,79 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2340/3217/3977 | 13,42 MB | 2,65 MB | 272 | 168 mil | 7,29 mi | 18 | 72/46 | 5 | 32 | 1 | 2012: 113 mil · 2013: 689 mil · 2014: 2,78 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2481/3093/3669 | 13,38 MB | 2,62 MB | 273 | 204 mil | 7,64 mi | 21 | 81/53 | 5 | 27 | 0 | 2012: 92 mil · 2013: 1,15 mi · 2014: 2,52 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2961/4005/4473 | 13,45 MB | 2,55 MB | 272 | 1,03 mi | 14,89 mi | 23 | 81/58 | 5 | 25 | 0 | 2030: 82 mil · 2031: 2,00 mi · 2032: 7,25 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2999/3701/4060 | 13,28 MB | 2,53 MB | 274 | 238 mil | 7,72 mi | 21 | 75/52 | 5 | 32 | 0 | 2030: 49 mil · 2031: 754 mil · 2032: 2,54 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2512/3678/4021 | 13,60 MB | 2,58 MB | 273 | 1,54 mi | 15,25 mi | 23 | 79/59 | 5 | 35 | 0 | 2030: 144 mil · 2031: 2,01 mi · 2032: 8,78 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2327/3080/3589 | 13,24 MB | 2,52 MB | 273 | 81 mil | 8,17 mi | 19 | 73/47 | 5 | 30 | 0 | 2030: 115 mil · 2031: 909 mil · 2032: 3,21 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 490.789 |
| `chron9` | 307.386 |
| `facts17` | 258.801 |
| `fame15` | 229.152 |
| `creation` | 155.316 |
| `st28` | 147.068 |
| `ag18` | 126.907 |
| `leisure14` | 125.785 |
| `attn` | 120.277 |
| `relics9` | 116.219 |
| `deleg31` | 115.877 |
| `fame16` | 94.640 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

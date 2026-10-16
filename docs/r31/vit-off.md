# Medição de referência — vit desligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 276 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 161 | 265 | 260 | 316 | 3,78 MB | 0,72 MB | 40 | 287 |
| 1955 | 4 | 277 | 633 | 627 | 717 | 6,08 MB | 1,20 MB | 67 | 288 |
| 1990 | 4 | 465 | 1.164 | 1.159 | 1.278 | 9,60 MB | 1,99 MB | 122 | 288 |
| 2012 | 4 | 593 | 1.778 | 1.770 | 2.005 | 13,41 MB | 2,63 MB | 305 | 288 |
| 2030 | 4 | 834 | 1.980 | 1.952 | 2.313 | 13,42 MB | 2,55 MB | 264 | 288 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 129 mil | 4,82 mi | 28 | 3 | 1,83 mi | 0 |
| 1955 | 16 mil | 647 mil | 17 | 3 | 413 mil | 0 |
| 1990 | -18 mil | 1,20 mi | 16 | 4 | 551 mil | 2 |
| 2012 | 415 mil | 12,57 mi | 22 | 5 | 3,73 mi | 0 |
| 2030 | 455 mil | 8,29 mi | 21 | 5 | 3,50 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 275/370/399 | 3,76 MB | 0,72 MB | 287 | 98 mil | 6,26 mi | 32 | 25/81 | 3 | 23 | 19 | 1900: 66 mil · 1901: 601 mil · 1902: 2,20 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 271/377/538 | 3,88 MB | 0,74 MB | 287 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 276/371/394 | 3,66 MB | 0,72 MB | 286 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 240/317/488 | 3,80 MB | 0,72 MB | 286 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 649/842/1115 | 6,16 MB | 1,22 MB | 287 | 31 mil | 222 mil | 15 | 61/37 | 2 | 4 | 0 | 1955: 130 mil · 1956: 229 mil · 1957: 198 mil | não |
| 1955 | `r31-base-1` | 01/1958 | 627/888/1025 | 5,94 MB | 1,17 MB | 287 | -34 mil | 1,91 mi | 19 | 62/48 | 3 | 20 | 0 | 1955: 62 mil · 1956: 280 mil · 1957: 824 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 630/872/1032 | 6,08 MB | 1,21 MB | 288 | 1 mil | 347 mil | 18 | 71/44 | 3 | 13 | 0 | 1955: 57 mil · 1956: 271 mil · 1957: 285 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 625/890/1184 | 6,08 MB | 1,20 MB | 289 | 78 mil | 946 mil | 16 | 59/39 | 2 | 14 | 0 | 1955: 102 mil · 1956: 123 mil · 1957: 541 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1267/1656/2019 | 10,46 MB | 2,09 MB | 288 | -25 mil | 2,54 mi | 18 | 57/44 | 3 | 18 | 0 | 1990: 239 mil · 1991: 340 mil · 1992: 1,04 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 907/1208/1243 | 8,63 MB | 1,86 MB | 287 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1259/1689/2214 | 10,50 MB | 2,10 MB | 287 | 86 mil | 2,69 mi | 16 | 54/40 | 3 | 22 | 0 | 1990: 220 mil · 1991: 324 mil · 1992: 1,01 mi | não |
| 1990 | `r31-base-3` | 04/1991 | 931/1275/1473 | 8,75 MB | 1,89 MB | 289 | -16 mil | -134 mil | 14 | 37/35 | 4 | 9 | 0 | 1990: 76 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 1802/2313/3027 | 13,26 MB | 2,61 MB | 288 | 495 mil | 11,59 mi | 22 | 77/55 | 5 | 27 | 0 | 2012: 104 mil · 2013: 546 mil · 2014: 3,57 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1747/2275/2683 | 13,31 MB | 2,62 MB | 289 | 106 mil | 9,22 mi | 18 | 71/44 | 3 | 17 | 0 | 2012: 61 mil · 2013: 420 mil · 2014: 2,39 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1783/2267/3569 | 13,53 MB | 2,66 MB | 287 | 335 mil | 13,56 mi | 21 | 70/52 | 5 | 28 | 2 | 2012: 113 mil · 2013: 575 mil · 2014: 3,90 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1780/2445/2658 | 13,51 MB | 2,64 MB | 288 | 1,33 mi | 18,03 mi | 22 | 81/55 | 5 | 22 | 1 | 2012: 92 mil · 2013: 1,49 mi · 2014: 7,64 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2043/2848/3084 | 13,61 MB | 2,58 MB | 288 | 414 mil | 8,53 mi | 21 | 84/54 | 5 | 33 | 0 | 2030: 82 mil · 2031: 3,43 mi · 2032: 3,67 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2006/2611/3211 | 13,25 MB | 2,52 MB | 289 | 100 mil | 5,51 mi | 22 | 68/54 | 5 | 34 | 0 | 2030: 49 mil · 2031: 831 mil · 2032: 2,80 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2042/2506/2638 | 13,60 MB | 2,59 MB | 288 | 1,07 mi | 12,65 mi | 21 | 82/52 | 5 | 59 | 0 | 2030: 138 mil · 2031: 1,50 mi · 2032: 7,52 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1830/2320/3388 | 13,13 MB | 2,50 MB | 288 | 496 mil | 8,06 mi | 21 | 76/53 | 5 | 31 | 0 | 2030: 112 mil · 2031: 887 mil · 2032: 3,33 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 491.097 |
| `chron9` | 313.725 |
| `facts17` | 250.926 |
| `fame15` | 228.260 |
| `creation` | 150.465 |
| `leisure14` | 129.493 |
| `st28` | 128.215 |
| `ag18` | 120.116 |
| `attn` | 116.776 |
| `relics9` | 115.974 |
| `deleg31` | 108.326 |
| `fame16` | 95.833 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

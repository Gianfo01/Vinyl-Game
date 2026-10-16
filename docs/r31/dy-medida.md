# Medição de referência — onda 3 · D+Y (padrão) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 409 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 165 | 273 | 258 | 275 | 3,74 MB | 0,71 MB | 50 | 266 |
| 1955 | 4 | 238 | 629 | 628 | 616 | 6,03 MB | 1,19 MB | 65 | 266 |
| 1990 | 4 | 418 | 1.247 | 1.222 | 1.200 | 10,17 MB | 2,02 MB | 111 | 266 |
| 2012 | 4 | 548 | 1.672 | 1.592 | 1.672 | 12,69 MB | 2,50 MB | 146 | 267 |
| 2030 | 4 | 795 | 1.782 | 1.768 | 2.015 | 12,62 MB | 2,40 MB | 212 | 267 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 130 mil | 4,62 mi | 30 | 3 | 1,79 mi | 0 |
| 1955 | 44 mil | 658 mil | 17 | 3 | 474 mil | 1 |
| 1990 | -4 mil | 5,00 mi | 18 | 3 | 1,67 mi | 1 |
| 2012 | 145 mil | 8,43 mi | 18 | 3 | 2,16 mi | 0 |
| 2030 | 210 mil | 5,63 mi | 19 | 4 | 1,96 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 279/450/536 | 3,66 MB | 0,70 MB | 266 | 134 mil | 4,42 mi | 29 | 23/72 | 3 | 23 | 13 | 1900: 58 mil · 1901: 755 mil · 1902: 1,72 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 263/377/468 | 3,76 MB | 0,72 MB | 266 | 126 mil | 3,65 mi | 22 | 23/56 | 3 | 17 | 8 | 1900: 91 mil · 1901: 470 mil · 1902: 1,34 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 304/409/655 | 3,91 MB | 0,74 MB | 265 | 78 mil | 4,82 mi | 30 | 9/75 | 3 | 28 | 13 | 1900: 108 mil · 1901: 356 mil · 1902: 1,86 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 246/316/459 | 3,71 MB | 0,69 MB | 265 | 301 mil | 5,67 mi | 30 | 15/75 | 3 | 15 | 13 | 1900: 111 mil · 1901: 832 mil · 1902: 2,17 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 653/907/1009 | 6,37 MB | 1,25 MB | 266 | 97 mil | 3,51 mi | 19 | 70/46 | 3 | 15 | 0 | 1955: 140 mil · 1956: 666 mil · 1957: 1,39 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 616/911/995 | 5,88 MB | 1,16 MB | 266 | 64 mil | 536 mil | 17 | 66/43 | 3 | 18 | 0 | 1955: 75 mil · 1956: 242 mil · 1957: 418 mil | não |
| 1955 | `r31-base-2` | 10/1956 | 528/660/835 | 5,28 MB | 1,15 MB | 266 | -18 mil | -123 mil | 14 | 59/36 | 2 | 5 | 0 | 1955: 55 mil | insolvency |
| 1955 | `r31-base-3` | 01/1958 | 678/992/1142 | 6,18 MB | 1,22 MB | 268 | 24 mil | 781 mil | 17 | 67/43 | 2 | 11 | 0 | 1955: 118 mil · 1956: 432 mil · 1957: 530 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1268/1683/2437 | 10,13 MB | 2,02 MB | 267 | -2 mil | 5,01 mi | 20 | 63/49 | 3 | 24 | 0 | 1990: 145 mil · 1991: 319 mil · 1992: 1,68 mi | não |
| 1990 | `r31-base-1` | 01/1993 | 1354/1947/2327 | 10,21 MB | 2,03 MB | 266 | -54 mil | 5,00 mi | 17 | 56/41 | 2 | 17 | 0 | 1990: 176 mil · 1991: 606 mil · 1992: 1,67 mi | não |
| 1990 | `r31-base-2` | 01/1992 | 1060/1380/1692 | 8,76 MB | 1,75 MB | 266 | -6 mil | -92 mil | 15 | 41/38 | 3 | 7 | 0 | 1990: 137 mil · 1991: 183 mil | insolvency |
| 1990 | `r31-base-3` | 01/1993 | 1243/1768/2416 | 10,22 MB | 2,03 MB | 266 | 167 mil | 7,86 mi | 18 | 47/45 | 3 | 25 | 0 | 1990: 72 mil · 1991: 827 mil · 1992: 2,55 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 1552/2297/2850 | 12,91 MB | 2,53 MB | 267 | 64 mil | 15,26 mi | 19 | 84/48 | 3 | 21 | 0 | 2012: 174 mil · 2013: 1,11 mi · 2014: 2,93 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1556/2368/3824 | 12,70 MB | 2,50 MB | 267 | 126 mil | 9,54 mi | 17 | 71/42 | 3 | 26 | 0 | 2012: 54 mil · 2013: 499 mil · 2014: 1,91 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1782/2408/3477 | 12,68 MB | 2,50 MB | 266 | 164 mil | 3,40 mi | 16 | 67/40 | 3 | 27 | 0 | 2012: 61 mil · 2013: 373 mil · 2014: 1,40 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1797/2367/2711 | 12,67 MB | 2,50 MB | 266 | 255 mil | 7,32 mi | 19 | 76/47 | 4 | 25 | 0 | 2012: 73 mil · 2013: 503 mil · 2014: 2,41 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 1826/2382/2611 | 12,73 MB | 2,42 MB | 266 | 297 mil | 4,73 mi | 14 | 75/36 | 3 | 27 | 0 | 2030: 54 mil · 2031: 450 mil · 2032: 1,75 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 1855/2687/3002 | 12,38 MB | 2,36 MB | 268 | 68 mil | 2,81 mi | 19 | 63/47 | 3 | 31 | 0 | 2030: 97 mil · 2031: 516 mil · 2032: 1,33 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 1772/2634/2966 | 12,99 MB | 2,49 MB | 267 | 811 mil | 12,32 mi | 21 | 75/54 | 5 | 49 | 0 | 2030: 48 mil · 2031: 2,31 mi · 2032: 4,79 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1675/2326/2543 | 12,51 MB | 2,38 MB | 267 | 123 mil | 6,53 mi | 18 | 67/44 | 4 | 19 | 0 | 2030: 99 mil · 2031: 956 mil · 2032: 2,16 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 492.261 |
| `chron9` | 310.479 |
| `facts17` | 242.393 |
| `fame15` | 217.346 |
| `creation` | 144.696 |
| `ag18` | 128.486 |
| `leisure14` | 127.100 |
| `relics9` | 115.628 |
| `attn` | 105.015 |
| `st28` | 94.115 |
| `fame16` | 93.723 |
| `fest8` | 93.723 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

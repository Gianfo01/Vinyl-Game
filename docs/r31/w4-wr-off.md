# Medição de referência — w4-wr (desligado) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 402 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 208 | 244 | 237 | 270 | 3,76 MB | 0,72 MB | 37 | 282 |
| 1955 | 4 | 204 | 558 | 579 | 615 | 5,97 MB | 1,20 MB | 70 | 283 |
| 1990 | 4 | 390 | 1.100 | 1.135 | 1.209 | 9,50 MB | 1,97 MB | 120 | 283 |
| 2012 | 4 | 567 | 1.837 | 1.847 | 1.986 | 13,40 MB | 2,62 MB | 170 | 283 |
| 2030 | 4 | 712 | 2.083 | 1.970 | 2.300 | 13,22 MB | 2,52 MB | 178 | 283 |

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
| 1900 | `r31-base-0` | 01/1903 | 250/357/694 | 3,74 MB | 0,72 MB | 282 | 98 mil | 6,26 mi | 32 | 25/81 | 3 | 23 | 19 | 1900: 66 mil · 1901: 601 mil · 1902: 2,20 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 245/327/419 | 3,85 MB | 0,74 MB | 282 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 254/345/455 | 3,64 MB | 0,72 MB | 281 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 229/284/424 | 3,78 MB | 0,71 MB | 281 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 07/1956 | 488/693/801 | 5,25 MB | 1,15 MB | 282 | -25 mil | -129 mil | 15 | 51/38 | 3 | 12 | 0 | 1955: 138 mil | insolvency |
| 1955 | `r31-base-1` | 01/1958 | 580/772/940 | 5,96 MB | 1,18 MB | 282 | 53 mil | 837 mil | 19 | 63/47 | 2 | 10 | 0 | 1955: 62 mil · 1956: 288 mil · 1957: 505 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 581/811/831 | 6,08 MB | 1,21 MB | 283 | -4 mil | 570 mil | 17 | 66/43 | 3 | 12 | 0 | 1955: 57 mil · 1956: 271 mil · 1957: 366 mil | não |
| 1955 | `r31-base-3` | 06/1957 | 547/723/934 | 5,97 MB | 1,29 MB | 284 | -9 mil | -82 mil | 15 | 62/38 | 3 | 9 | 0 | 1955: 101 mil · 1956: 196 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1232/1644/1870 | 10,39 MB | 2,08 MB | 283 | 144 mil | 4,06 mi | 17 | 58/42 | 3 | 10 | 0 | 1990: 239 mil · 1991: 595 mil · 1992: 1,45 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 941/1202/1230 | 8,61 MB | 1,86 MB | 282 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1135/1571/1658 | 10,45 MB | 2,10 MB | 282 | 9 mil | 1,52 mi | 19 | 55/47 | 3 | 8 | 0 | 1990: 221 mil · 1991: 304 mil · 1992: 436 mil | não |
| 1990 | `r31-base-3` | 04/1991 | 847/1156/1187 | 8,61 MB | 1,85 MB | 284 | -17 mil | -135 mil | 14 | 37/35 | 4 | 9 | 0 | 1990: 76 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 1918/2681/3555 | 13,66 MB | 2,67 MB | 283 | 1,01 mi | 19,22 mi | 21 | 76/53 | 5 | 36 | 0 | 2012: 142 mil · 2013: 1,76 mi · 2014: 7,52 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1721/2406/3077 | 13,19 MB | 2,59 MB | 285 | 86 mil | 9,31 mi | 19 | 72/47 | 3 | 24 | 0 | 2012: 59 mil · 2013: 459 mil · 2014: 2,32 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1800/2359/3133 | 13,44 MB | 2,64 MB | 282 | 187 mil | 9,05 mi | 19 | 75/49 | 5 | 33 | 1 | 2012: 113 mil · 2013: 550 mil · 2014: 2,90 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1909/2530/3505 | 13,35 MB | 2,61 MB | 283 | 965 mil | 12,61 mi | 21 | 85/53 | 5 | 34 | 0 | 2012: 92 mil · 2013: 1,05 mi · 2014: 6,08 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2603/4176/4866 | 13,46 MB | 2,54 MB | 283 | 513 mil | 13,26 mi | 22 | 80/54 | 5 | 21 | 0 | 2030: 82 mil · 2031: 2,25 mi · 2032: 3,68 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2089/2771/3484 | 13,09 MB | 2,50 MB | 283 | 100 mil | 5,87 mi | 19 | 71/47 | 3 | 13 | 0 | 2030: 49 mil · 2031: 646 mil · 2032: 1,62 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 1827/2393/2862 | 13,33 MB | 2,54 MB | 283 | 1,44 mi | 15,41 mi | 22 | 78/54 | 5 | 57 | 0 | 2030: 143 mil · 2031: 991 mil · 2032: 8,32 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1814/2388/2721 | 13,12 MB | 2,50 MB | 283 | 206 mil | 7,91 mi | 19 | 71/46 | 3 | 29 | 0 | 2030: 115 mil · 2031: 786 mil · 2032: 3,03 mi | não |

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

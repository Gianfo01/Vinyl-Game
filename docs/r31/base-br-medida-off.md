# Medição de referência — base-br-off (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 4 partidas em paralelo; tempo total 270 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 206 | 305 | 294 | 323 | 3,84 MB | 0,73 MB | 38 | 287 |
| 1955 | 4 | 314 | 759 | 755 | 737 | 6,21 MB | 1,21 MB | 71 | 288 |
| 1990 | 4 | 516 | 1.514 | 1.472 | 1.469 | 10,62 MB | 2,12 MB | 133 | 288 |
| 2012 | 4 | 780 | 2.167 | 2.139 | 2.118 | 13,67 MB | 2,69 MB | 174 | 289 |
| 2030 | 4 | 1.231 | 2.400 | 2.350 | 2.343 | 13,14 MB | 2,50 MB | 180 | 288 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 128 mil | 4,68 mi | 32 | 3 | 1,65 mi | 0 |
| 1955 | 46 mil | 1,87 mi | 19 | 3 | 904 mil | 0 |
| 1990 | -40 mil | 2,80 mi | 19 | 3 | 963 mil | 0 |
| 2012 | 263 mil | 14,72 mi | 21 | 5 | 4,43 mi | 0 |
| 2030 | 97 mil | 7,39 mi | 20 | 3 | 2,57 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 299/431/542 | 3,65 MB | 0,70 MB | 288 | 4 mil | 2,41 mi | 33 | 31/82 | 3 | 20 | 22 | 1900: 41 mil · 1901: 308 mil · 1902: 699 mil | não |
| 1900 | `r31-base-1` | 01/1903 | 336/444/513 | 4,20 MB | 0,77 MB | 287 | 138 mil | 6,36 mi | 35 | 11/87 | 3 | 29 | 25 | 1900: 89 mil · 1901: 875 mil · 1902: 2,15 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 301/429/492 | 3,87 MB | 0,74 MB | 287 | 118 mil | 3,02 mi | 30 | 30/75 | 3 | 22 | 14 | 1900: 90 mil · 1901: 208 mil · 1902: 1,14 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 284/375/574 | 3,81 MB | 0,71 MB | 287 | 292 mil | 6,33 mi | 27 | 15/67 | 3 | 24 | 8 | 1900: 88 mil · 1901: 723 mil · 1902: 2,58 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 811/1192/1379 | 6,59 MB | 1,29 MB | 288 | 49 mil | 3,94 mi | 16 | 71/39 | 2 | 16 | 0 | 1955: 194 mil · 1956: 572 mil · 1957: 2,38 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 668/885/1184 | 5,76 MB | 1,15 MB | 288 | 44 mil | 190 mil | 19 | 63/47 | 2 | 6 | 0 | 1955: 79 mil · 1956: 193 mil · 1957: 195 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 762/999/1186 | 6,06 MB | 1,19 MB | 288 | 17 mil | 117 mil | 20 | 67/50 | 3 | 7 | 0 | 1955: 104 mil · 1956: 368 mil · 1957: 166 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 795/1088/1252 | 6,35 MB | 1,24 MB | 289 | 111 mil | 3,55 mi | 18 | 75/45 | 3 | 21 | 0 | 1955: 112 mil · 1956: 987 mil · 1957: 1,61 mi | não |
| 1990 | `r31-base-0` | 01/1993 | 1559/2165/2599 | 10,65 MB | 2,13 MB | 289 | -55 mil | 5,80 mi | 19 | 68/47 | 3 | 19 | 0 | 1990: 106 mil · 1991: 260 mil · 1992: 1,84 mi | não |
| 1990 | `r31-base-1` | 01/1993 | 1505/2227/2324 | 10,61 MB | 2,13 MB | 288 | 61 mil | 2,05 mi | 20 | 45/49 | 3 | 7 | 0 | 1990: 114 mil · 1991: 366 mil · 1992: 661 mil | não |
| 1990 | `r31-base-2` | 01/1993 | 1436/1945/2077 | 10,45 MB | 2,09 MB | 288 | -24 mil | 2,29 mi | 16 | 58/39 | 3 | 11 | 0 | 1990: 114 mil · 1991: 301 mil · 1992: 614 mil | não |
| 1990 | `r31-base-3` | 01/1993 | 1556/2173/2773 | 10,62 MB | 2,12 MB | 288 | -56 mil | 3,31 mi | 18 | 51/45 | 3 | 19 | 0 | 1990: 111 mil · 1991: 220 mil · 1992: 1,26 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 2058/2525/3092 | 13,56 MB | 2,67 MB | 289 | 236 mil | 13,92 mi | 21 | 77/52 | 4 | 11 | 0 | 2012: 174 mil · 2013: 984 mil · 2014: 2,71 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 2064/2805/3448 | 13,41 MB | 2,64 MB | 289 | 290 mil | 15,52 mi | 21 | 75/53 | 4 | 28 | 0 | 2012: 81 mil · 2013: 836 mil · 2014: 3,84 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2254/2961/4021 | 13,77 MB | 2,70 MB | 289 | 192 mil | 11,39 mi | 19 | 73/48 | 5 | 24 | 1 | 2012: 81 mil · 2013: 851 mil · 2014: 5,02 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2291/3121/3285 | 14,00 MB | 2,71 MB | 288 | 1,38 mi | 20,20 mi | 22 | 88/54 | 5 | 38 | 0 | 2012: 181 mil · 2013: 2,73 mi · 2014: 8,76 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2328/2860/3262 | 13,21 MB | 2,50 MB | 288 | 57 mil | 9,67 mi | 19 | 76/49 | 3 | 47 | 0 | 2030: 45 mil · 2031: 1,25 mi · 2032: 2,61 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2432/3069/3765 | 13,04 MB | 2,48 MB | 289 | 330 mil | 7,08 mi | 21 | 61/53 | 5 | 27 | 0 | 2030: 64 mil · 2031: 777 mil · 2032: 2,71 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2415/2916/3226 | 13,36 MB | 2,55 MB | 288 | 136 mil | 7,70 mi | 21 | 73/53 | 2 | 13 | 0 | 2030: 77 mil · 2031: 633 mil · 2032: 2,52 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2424/3012/3785 | 13,07 MB | 2,50 MB | 288 | -14 mil | 2,13 mi | 18 | 68/45 | 3 | 20 | 0 | 2030: 65 mil · 2031: 255 mil · 2032: 782 mil | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 489.864 |
| `chron9` | 318.524 |
| `facts17` | 250.052 |
| `fame15` | 229.963 |
| `creation` | 150.599 |
| `ag18` | 128.064 |
| `leisure14` | 122.853 |
| `relics9` | 116.253 |
| `festivals` | 99.155 |
| `attn` | 99.091 |
| `fame16` | 95.012 |
| `st28` | 94.644 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

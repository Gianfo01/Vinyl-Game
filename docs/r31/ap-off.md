# Medição de referência — AP-desligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 669 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 282 | 391 | 345 | 240 | 3,81 MB | 0,72 MB | 60 | 271 |
| 1955 | 4 | 526 | 976 | 937 | 556 | 6,01 MB | 1,21 MB | 116 | 272 |
| 1990 | 4 | 538 | 1.617 | 1.466 | 1.053 | 9,67 MB | 2,00 MB | 139 | 273 |
| 2012 | 4 | 1.126 | 3.011 | 2.595 | 1.815 | 13,47 MB | 2,65 MB | 209 | 274 |
| 2030 | 4 | 1.502 | 3.496 | 3.174 | 2.252 | 13,34 MB | 2,53 MB | 405 | 272 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 94 mil | 4,76 mi | 27 | 3 | 1,87 mi | 1 |
| 1955 | 12 mil | 348 mil | 17 | 3 | 294 mil | 1 |
| 1990 | 12 mil | 396 mil | 16 | 3 | 260 mil | 2 |
| 2012 | 467 mil | 11,56 mi | 21 | 5 | 4,69 mi | 0 |
| 2030 | 391 mil | 9,99 mi | 21 | 4 | 3,24 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 368/605/830 | 3,79 MB | 0,72 MB | 272 | 124 mil | 4,78 mi | 27 | 21/67 | 3 | 24 | 11 | 1900: 58 mil · 1901: 757 mil · 1902: 1,86 mi | não |
| 1900 | `r31-base-1` | 12/1901 | 380/722/968 | 2,74 MB | 0,59 MB | 271 | -19 mil | -128 mil | 20 | 34/51 | 3 | 10 | 4 | 1900: 88 mil | insolvency |
| 1900 | `r31-base-2` | 01/1903 | 465/764/1189 | 3,90 MB | 0,74 MB | 271 | 63 mil | 4,74 mi | 27 | 9/67 | 3 | 28 | 9 | 1900: 108 mil · 1901: 355 mil · 1902: 1,88 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 348/493/979 | 3,83 MB | 0,71 MB | 271 | 173 mil | 6,32 mi | 30 | 16/75 | 3 | 27 | 13 | 1900: 111 mil · 1901: 918 mil · 1902: 2,56 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 1066/1746/1979 | 6,46 MB | 1,26 MB | 272 | 27 mil | 3,18 mi | 17 | 62/43 | 3 | 23 | 0 | 1955: 140 mil · 1956: 492 mil · 1957: 1,37 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 976/1369/1591 | 5,83 MB | 1,16 MB | 272 | 39 mil | 478 mil | 19 | 66/48 | 3 | 7 | 0 | 1955: 82 mil · 1956: 148 mil · 1957: 330 mil | não |
| 1955 | `r31-base-2` | 11/1956 | 731/1192/1283 | 5,50 MB | 1,21 MB | 272 | -24 mil | -126 mil | 14 | 58/35 | 2 | 6 | 0 | 1955: 55 mil | insolvency |
| 1955 | `r31-base-3` | 01/1958 | 1034/1668/1759 | 6,19 MB | 1,21 MB | 274 | -4 mil | 218 mil | 16 | 70/40 | 3 | 18 | 1 | 1955: 87 mil · 1956: 515 mil · 1957: 258 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1548/2151/4027 | 10,28 MB | 2,05 MB | 273 | 75 mil | 905 mil | 16 | 57/40 | 3 | 9 | 0 | 1990: 231 mil · 1991: 349 mil · 1992: 435 mil | não |
| 1990 | `r31-base-1` | 02/1991 | 1191/1518/2105 | 7,94 MB | 1,61 MB | 272 | -15 mil | -132 mil | 14 | 35/36 | 4 | 10 | 0 | 1990: 85 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1877/3047/5411 | 10,49 MB | 2,11 MB | 272 | 27 mil | 4,17 mi | 18 | 60/44 | 3 | 22 | 0 | 1990: 195 mil · 1991: 416 mil · 1992: 1,51 mi | não |
| 1990 | `r31-base-3` | 06/1991 | 1540/2106/2513 | 9,06 MB | 1,96 MB | 273 | -3 mil | -114 mil | 15 | 38/36 | 3 | 8 | 0 | 1990: 81 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 4142/7390/10150 | 13,62 MB | 2,67 MB | 274 | 1,15 mi | 19,68 mi | 22 | 84/54 | 5 | 36 | 1 | 2012: 136 mil · 2013: 1,93 mi · 2014: 8,16 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 3130/4566/5870 | 13,25 MB | 2,59 MB | 274 | 61 mil | 10,08 mi | 17 | 73/43 | 3 | 23 | 0 | 2012: 67 mil · 2013: 420 mil · 2014: 2,37 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2226/3306/4790 | 13,33 MB | 2,63 MB | 273 | 187 mil | 7,92 mi | 21 | 77/53 | 5 | 30 | 1 | 2012: 116 mil · 2013: 656 mil · 2014: 2,65 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2547/4144/6742 | 13,61 MB | 2,66 MB | 274 | 748 mil | 13,05 mi | 21 | 85/52 | 5 | 26 | 2 | 2012: 81 mil · 2013: 1,73 mi · 2014: 6,74 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 3943/8429/10505 | 13,45 MB | 2,54 MB | 272 | 532 mil | 12,71 mi | 24 | 80/61 | 5 | 42 | 0 | 2030: 69 mil · 2031: 1,42 mi · 2032: 3,59 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2914/3890/6921 | 13,22 MB | 2,52 MB | 272 | 170 mil | 6,81 mi | 21 | 69/53 | 3 | 27 | 0 | 2030: 67 mil · 2031: 491 mil · 2032: 2,50 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 3615/5662/6107 | 13,54 MB | 2,58 MB | 273 | 1,38 mi | 13,47 mi | 21 | 85/54 | 5 | 37 | 0 | 2030: 136 mil · 2031: 1,77 mi · 2032: 8,54 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 3511/5280/6154 | 13,14 MB | 2,50 MB | 272 | 250 mil | 7,26 mi | 18 | 69/46 | 3 | 31 | 0 | 2030: 101 mil · 2031: 821 mil · 2032: 2,88 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 491.266 |
| `chron9` | 315.389 |
| `facts17` | 252.830 |
| `fame15` | 228.796 |
| `st28` | 165.643 |
| `creation` | 154.689 |
| `ag18` | 129.330 |
| `leisure14` | 129.216 |
| `relics9` | 116.083 |
| `attn` | 113.591 |
| `deleg31` | 112.640 |
| `fame16` | 97.040 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

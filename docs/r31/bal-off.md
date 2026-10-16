# Medição de referência — onda3 junta (W0-BASE) — bal31.mercy desligado (antes da correção)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 605 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 239 | 304 | 280 | 352 | 3,75 MB | 0,72 MB | 44 | 272 |
| 1955 | 4 | 267 | 737 | 761 | 755 | 5,87 MB | 1,17 MB | 84 | 273 |
| 1990 | 4 | 417 | 1.386 | 1.415 | 1.583 | 9,50 MB | 1,97 MB | 153 | 273 |
| 2012 | 4 | 684 | 2.415 | 2.357 | 2.296 | 13,46 MB | 2,64 MB | 220 | 273 |
| 2030 | 4 | 1.433 | 3.785 | 3.427 | 2.859 | 13,36 MB | 2,54 MB | 257 | 273 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 132 mil | 4,80 mi | 28 | 3 | 1,87 mi | 0 |
| 1955 | 10 mil | 41 mil | 16 | 3 | 186 mil | 2 |
| 1990 | -18 mil | 252 mil | 16 | 4 | 170 mil | 2 |
| 2012 | 627 mil | 11,25 mi | 20 | 5 | 4,68 mi | 0 |
| 2030 | 634 mil | 11,53 mi | 22 | 5 | 5,23 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 344/532/651 | 3,73 MB | 0,72 MB | 272 | 116 mil | 5,41 mi | 33 | 25/83 | 3 | 23 | 21 | 1900: 66 mil · 1901: 599 mil · 1902: 2,12 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 307/475/610 | 3,81 MB | 0,73 MB | 272 | 114 mil | 4,19 mi | 27 | 22/67 | 3 | 20 | 10 | 1900: 88 mil · 1901: 294 mil · 1902: 1,62 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 288/356/610 | 3,63 MB | 0,72 MB | 271 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 278/465/602 | 3,77 MB | 0,71 MB | 271 | 149 mil | 5,75 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 110 mil · 1901: 895 mil · 1902: 2,28 mi | não |
| 1955 | `r31-base-0` | 07/1956 | 558/761/923 | 5,26 MB | 1,15 MB | 272 | -29 mil | -132 mil | 15 | 51/38 | 3 | 12 | 0 | 1955: 138 mil | insolvency |
| 1955 | `r31-base-1` | 01/1958 | 779/1140/1268 | 5,77 MB | 1,15 MB | 273 | 28 mil | 163 mil | 19 | 62/46 | 3 | 6 | 0 | 1955: 61 mil · 1956: 205 mil · 1957: 175 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 813/1127/1416 | 5,98 MB | 1,19 MB | 273 | 63 mil | 453 mil | 17 | 67/43 | 3 | 10 | 0 | 1955: 57 mil · 1956: 273 mil · 1957: 318 mil | não |
| 1955 | `r31-base-3` | 06/1957 | 702/923/1287 | 5,97 MB | 1,29 MB | 274 | -9 mil | -82 mil | 15 | 62/38 | 3 | 9 | 0 | 1955: 101 mil · 1956: 196 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1536/2129/2815 | 10,36 MB | 2,07 MB | 273 | -36 mil | 3,05 mi | 16 | 59/41 | 3 | 19 | 0 | 1990: 239 mil · 1991: 597 mil · 1992: 1,09 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 1152/1613/1656 | 8,60 MB | 1,85 MB | 272 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1475/1967/2177 | 10,39 MB | 2,10 MB | 272 | 26 mil | 638 mil | 17 | 49/43 | 2 | 9 | 0 | 1990: 199 mil · 1991: 274 mil · 1992: 249 mil | não |
| 1990 | `r31-base-3` | 04/1991 | 1031/1651/1817 | 8,63 MB | 1,86 MB | 274 | -17 mil | -135 mil | 14 | 33/35 | 4 | 10 | 0 | 1990: 80 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 2687/4192/4506 | 13,58 MB | 2,66 MB | 273 | 1,07 mi | 18,54 mi | 21 | 83/53 | 5 | 37 | 0 | 2012: 142 mil · 2013: 1,78 mi · 2014: 7,81 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 2385/3476/4857 | 13,26 MB | 2,61 MB | 275 | 213 mil | 11,54 mi | 23 | 75/57 | 5 | 26 | 1 | 2012: 60 mil · 2013: 466 mil · 2014: 2,79 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2251/3110/3222 | 13,42 MB | 2,65 MB | 272 | 168 mil | 7,29 mi | 18 | 72/46 | 5 | 32 | 1 | 2012: 113 mil · 2013: 689 mil · 2014: 2,78 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2335/3015/4759 | 13,50 MB | 2,64 MB | 273 | 1,04 mi | 10,97 mi | 19 | 82/49 | 5 | 27 | 0 | 2012: 92 mil · 2013: 1,15 mi · 2014: 6,57 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 4781/7131/7951 | 13,45 MB | 2,55 MB | 272 | 1,03 mi | 14,89 mi | 23 | 81/58 | 5 | 25 | 0 | 2030: 82 mil · 2031: 2,00 mi · 2032: 7,25 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 4765/7398/8338 | 13,28 MB | 2,53 MB | 274 | 238 mil | 7,72 mi | 21 | 75/52 | 5 | 32 | 0 | 2030: 49 mil · 2031: 754 mil · 2032: 2,54 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2855/4249/4626 | 13,60 MB | 2,58 MB | 273 | 1,54 mi | 15,25 mi | 23 | 79/59 | 5 | 35 | 0 | 2030: 144 mil · 2031: 2,01 mi · 2032: 8,78 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2741/3718/5383 | 13,24 MB | 2,52 MB | 273 | 81 mil | 8,17 mi | 19 | 73/47 | 5 | 30 | 0 | 2030: 115 mil · 2031: 909 mil · 2032: 3,21 mi | não |

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

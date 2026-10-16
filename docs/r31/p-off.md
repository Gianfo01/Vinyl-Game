# Medição de referência — P-desligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 383 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 144 | 243 | 232 | 289 | 3,85 MB | 0,73 MB | 37 | 270 |
| 1955 | 4 | 276 | 589 | 590 | 657 | 5,99 MB | 1,24 MB | 64 | 270 |
| 1990 | 4 | 450 | 1.172 | 1.120 | 1.291 | 10,00 MB | 2,03 MB | 125 | 270 |
| 2012 | 4 | 456 | 1.582 | 1.601 | 1.754 | 12,94 MB | 2,55 MB | 172 | 271 |
| 2030 | 4 | 769 | 1.707 | 1.685 | 1.964 | 12,70 MB | 2,43 MB | 180 | 271 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 102 mil | 4,58 mi | 29 | 3 | 1,82 mi | 0 |
| 1955 | -10 mil | 206 mil | 16 | 2 | 199 mil | 2 |
| 1990 | 9 mil | 1,31 mi | 17 | 3 | 805 mil | 1 |
| 2012 | 185 mil | 11,00 mi | 18 | 5 | 2,80 mi | 0 |
| 2030 | 216 mil | 4,08 mi | 18 | 3 | 1,52 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 256/391/448 | 3,74 MB | 0,72 MB | 270 | 128 mil | 4,45 mi | 31 | 27/76 | 3 | 23 | 16 | 1900: 58 mil · 1901: 756 mil · 1902: 1,78 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 241/331/374 | 3,93 MB | 0,74 MB | 270 | 45 mil | 2,87 mi | 24 | 23/61 | 3 | 19 | 10 | 1900: 91 mil · 1901: 451 mil · 1902: 896 mil | não |
| 1900 | `r31-base-2` | 01/1903 | 250/345/363 | 3,92 MB | 0,74 MB | 269 | 76 mil | 4,71 mi | 28 | 14/69 | 3 | 28 | 10 | 1900: 108 mil · 1901: 355 mil · 1902: 1,85 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 223/339/416 | 3,78 MB | 0,71 MB | 269 | 220 mil | 6,34 mi | 30 | 18/75 | 3 | 25 | 13 | 1900: 111 mil · 1901: 836 mil · 1902: 2,25 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 666/911/1090 | 6,45 MB | 1,26 MB | 270 | 34 mil | 4,02 mi | 18 | 64/46 | 3 | 16 | 0 | 1955: 140 mil · 1956: 666 mil · 1957: 1,77 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 588/849/940 | 5,71 MB | 1,13 MB | 270 | -18 mil | 481 mil | 16 | 62/41 | 2 | 9 | 0 | 1955: 82 mil · 1956: 170 mil · 1957: 272 mil | não |
| 1955 | `r31-base-2` | 11/1956 | 520/704/834 | 5,50 MB | 1,21 MB | 270 | -24 mil | -126 mil | 14 | 58/35 | 2 | 6 | 0 | 1955: 55 mil | insolvency |
| 1955 | `r31-base-3` | 08/1957 | 551/759/784 | 6,27 MB | 1,37 MB | 272 | -1 mil | -70 mil | 15 | 59/38 | 2 | 7 | 1 | 1955: 84 mil · 1956: 126 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1207/1565/2111 | 10,01 MB | 2,01 MB | 271 | 26 mil | 729 mil | 16 | 60/40 | 3 | 12 | 0 | 1990: 145 mil · 1991: 264 mil · 1992: 486 mil | não |
| 1990 | `r31-base-1` | 01/1993 | 1261/1789/1987 | 10,29 MB | 2,05 MB | 270 | -51 mil | 4,92 mi | 17 | 56/42 | 2 | 17 | 0 | 1990: 176 mil · 1991: 606 mil · 1992: 1,65 mi | não |
| 1990 | `r31-base-2` | 11/1991 | 965/1219/1451 | 9,84 MB | 2,18 MB | 270 | -9 mil | -104 mil | 14 | 44/35 | 2 | 6 | 0 | 1990: 137 mil | insolvency |
| 1990 | `r31-base-3` | 01/1993 | 1173/1794/2500 | 9,99 MB | 1,99 MB | 270 | 86 mil | 1,89 mi | 19 | 53/47 | 3 | 14 | 0 | 1990: 126 mil · 1991: 217 mil · 1992: 1,12 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 1642/2127/3169 | 13,02 MB | 2,56 MB | 272 | 240 mil | 11,35 mi | 17 | 78/43 | 5 | 33 | 0 | 2012: 174 mil · 2013: 1,51 mi · 2014: 3,36 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1546/2043/2919 | 12,76 MB | 2,51 MB | 271 | 179 mil | 10,65 mi | 17 | 74/44 | 3 | 26 | 0 | 2012: 54 mil · 2013: 500 mil · 2014: 2,16 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1619/2198/2893 | 13,10 MB | 2,58 MB | 270 | 187 mil | 13,28 mi | 22 | 75/56 | 5 | 31 | 5 | 2012: 82 mil · 2013: 453 mil · 2014: 3,14 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1523/1947/2117 | 12,86 MB | 2,53 MB | 270 | 182 mil | 8,23 mi | 19 | 77/47 | 4 | 26 | 0 | 2012: 73 mil · 2013: 503 mil · 2014: 2,46 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 1697/2100/2281 | 12,87 MB | 2,46 MB | 270 | 185 mil | 4,68 mi | 16 | 73/39 | 3 | 17 | 0 | 2030: 54 mil · 2031: 545 mil · 2032: 1,68 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 1777/2323/3302 | 12,54 MB | 2,39 MB | 272 | 222 mil | 2,89 mi | 20 | 59/49 | 3 | 29 | 0 | 2030: 97 mil · 2031: 482 mil · 2032: 1,34 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 1745/2701/2950 | 12,96 MB | 2,48 MB | 271 | 1,60 mi | 15,66 mi | 21 | 80/52 | 5 | 53 | 0 | 2030: 48 mil · 2031: 2,38 mi · 2032: 8,62 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1611/2101/2445 | 12,52 MB | 2,40 MB | 271 | 209 mil | 3,48 mi | 16 | 62/41 | 3 | 17 | 0 | 2030: 99 mil · 2031: 956 mil · 2032: 1,36 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 487.037 |
| `chron9` | 307.214 |
| `facts17` | 252.426 |
| `fame15` | 215.290 |
| `creation` | 147.954 |
| `ag18` | 125.897 |
| `leisure14` | 124.702 |
| `st28` | 121.308 |
| `relics9` | 116.207 |
| `attn` | 102.211 |
| `deleg31` | 96.369 |
| `fest8` | 93.889 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

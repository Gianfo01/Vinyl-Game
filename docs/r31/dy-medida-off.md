# Medição de referência — onda 3 · D+Y desligados (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 1717 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 1.123 | 1.119 | 977 | 332 | 3,30 MB | 0,65 MB | 156 | 263 |
| 1955 | 4 | 2.227 | 3.169 | 2.942 | 788 | 5,94 MB | 1,17 MB | 370 | 263 |
| 1990 | 4 | 3.276 | 6.928 | 6.544 | 1.530 | 9,35 MB | 1,96 MB | 905 | 264 |
| 2012 | 4 | 4.483 | 11.059 | 9.987 | 2.259 | 12,67 MB | 2,49 MB | 975 | 264 |
| 2030 | 4 | 7.194 | 13.416 | 12.708 | 2.482 | 12,41 MB | 2,36 MB | 1.150 | 264 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 36 mil | 1,34 mi | 26 | 3 | 650 mil | 2 |
| 1955 | 26 mil | 1,38 mi | 19 | 3 | 720 mil | 0 |
| 1990 | -6 mil | 383 mil | 15 | 3 | 217 mil | 2 |
| 2012 | 346 mil | 10,24 mi | 20 | 5 | 3,00 mi | 0 |
| 2030 | 214 mil | 6,07 mi | 20 | 4 | 2,16 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 11/1901 | 1017/1614/2392 | 2,64 MB | 0,56 MB | 263 | -21 mil | -125 mil | 31 | 39/78 | 3 | 7 | 19 | 1900: 39 mil | insolvency |
| 1900 | `r31-base-1` | 03/1902 | 1043/1682/2608 | 2,92 MB | 0,60 MB | 262 | -6 mil | -101 mil | 23 | 30/58 | 3 | 12 | 6 | 1900: 66 mil · 1901: 166 mil | insolvency |
| 1900 | `r31-base-2` | 01/1903 | 1280/1962/3036 | 3,70 MB | 0,71 MB | 262 | 78 mil | 2,77 mi | 25 | 28/62 | 3 | 18 | 6 | 1900: 46 mil · 1901: 518 mil · 1902: 1,13 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 1076/1811/2457 | 3,67 MB | 0,70 MB | 263 | 273 mil | 4,65 mi | 26 | 25/66 | 3 | 22 | 10 | 1900: 47 mil · 1901: 398 mil · 1902: 1,46 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 3984/5676/7345 | 6,33 MB | 1,23 MB | 263 | 548 mil | 3,24 mi | 18 | 73/46 | 3 | 11 | 0 | 1955: 149 mil · 1956: 1,25 mi · 1957: 1,71 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 3209/5169/6263 | 5,83 MB | 1,15 MB | 263 | 6 mil | 1,90 mi | 23 | 60/57 | 3 | 21 | 0 | 1955: 105 mil · 1956: 332 mil · 1957: 915 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 2772/4188/4851 | 5,90 MB | 1,16 MB | 263 | 27 mil | 860 mil | 20 | 72/49 | 3 | 10 | 0 | 1955: 70 mil · 1956: 336 mil · 1957: 525 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 2711/4626/6210 | 5,98 MB | 1,17 MB | 265 | 25 mil | 753 mil | 16 | 68/41 | 3 | 15 | 0 | 1955: 133 mil · 1956: 406 mil · 1957: 512 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 7650/12294/13777 | 9,79 MB | 1,95 MB | 264 | 20 mil | 1,13 mi | 17 | 60/42 | 3 | 13 | 0 | 1990: 93 mil · 1991: 238 mil · 1992: 508 mil | não |
| 1990 | `r31-base-1` | 06/1991 | 6020/8115/9161 | 8,92 MB | 1,97 MB | 263 | -10 mil | -114 mil | 13 | 35/34 | 3 | 12 | 0 | 1990: 139 mil | insolvency |
| 1990 | `r31-base-2` | 01/1992 | 6812/9452/15135 | 8,60 MB | 1,71 MB | 263 | -9 mil | -90 mil | 14 | 43/35 | 3 | 5 | 0 | 1990: 172 mil · 1991: 159 mil | insolvency |
| 1990 | `r31-base-3` | 01/1993 | 6712/9077/9858 | 9,88 MB | 1,96 MB | 264 | -3 mil | 856 mil | 15 | 55/38 | 2 | 8 | 0 | 1990: 137 mil · 1991: 120 mil · 1992: 276 mil | não |
| 2012 | `r31-base-0` | 01/2015 | 10086/15084/16301 | 12,74 MB | 2,51 MB | 264 | 607 mil | 15,64 mi | 20 | 80/51 | 5 | 32 | 0 | 2012: 110 mil · 2013: 906 mil · 2014: 5,19 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 10101/14385/24963 | 12,56 MB | 2,47 MB | 264 | 12 mil | 6,05 mi | 18 | 68/46 | 3 | 26 | 0 | 2012: 59 mil · 2013: 345 mil · 2014: 1,51 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 11895/19009/26114 | 12,67 MB | 2,50 MB | 264 | 190 mil | 12,64 mi | 19 | 71/48 | 5 | 28 | 0 | 2012: 78 mil · 2013: 613 mil · 2014: 3,28 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 12152/18510/28040 | 12,67 MB | 2,49 MB | 263 | 503 mil | 7,84 mi | 20 | 74/49 | 5 | 32 | 0 | 2012: 102 mil · 2013: 617 mil · 2014: 2,73 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 13648/18240/21763 | 12,49 MB | 2,38 MB | 264 | 166 mil | 4,19 mi | 17 | 68/42 | 2 | 7 | 0 | 2030: 19 mil · 2031: 306 mil · 2032: 1,45 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 14389/19761/25233 | 12,33 MB | 2,35 MB | 265 | 262 mil | 7,96 mi | 22 | 59/55 | 4 | 27 | 0 | 2030: 77 mil · 2031: 686 mil · 2032: 2,87 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 15992/21891/30156 | 13,02 MB | 2,48 MB | 264 | 644 mil | 14,94 mi | 21 | 83/52 | 5 | 34 | 0 | 2030: 76 mil · 2031: 3,05 mi · 2032: 8,63 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 9635/13723/16773 | 12,27 MB | 2,34 MB | 264 | 22 mil | 1,38 mi | 18 | 62/46 | 3 | 17 | 0 | 2030: 44 mil · 2031: 299 mil · 2032: 476 mil | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 481.823 |
| `chron9` | 315.272 |
| `facts17` | 246.843 |
| `fame15` | 210.995 |
| `creation` | 147.913 |
| `leisure14` | 126.237 |
| `ag18` | 116.104 |
| `attn` | 97.613 |
| `fame16` | 97.028 |
| `fest8` | 93.673 |
| `deleg31` | 90.155 |
| `st28` | 83.294 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

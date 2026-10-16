# Medição de referência — e (interruptor desligado) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 756 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 335 | 575 | 559 | 280 | 3,69 MB | 0,72 MB | 114 | 262 |
| 1955 | 4 | 509 | 1.395 | 1.376 | 575 | 5,47 MB | 1,15 MB | 189 | 264 |
| 1990 | 4 | 885 | 2.051 | 1.911 | 1.219 | 9,91 MB | 1,97 MB | 467 | 264 |
| 2012 | 4 | 847 | 3.122 | 3.016 | 1.845 | 12,58 MB | 2,47 MB | 304 | 264 |
| 2030 | 4 | 1.094 | 3.300 | 3.125 | 2.100 | 12,49 MB | 2,39 MB | 287 | 264 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 62 mil | 3,50 mi | 30 | 3 | 1,17 mi | 1 |
| 1955 | -1 mil | 308 mil | 16 | 3 | 274 mil | 2 |
| 1990 | 39 mil | 1,61 mi | 18 | 3 | 667 mil | 0 |
| 2012 | 40 mil | 6,14 mi | 17 | 4 | 1,69 mi | 0 |
| 2030 | 175 mil | 4,19 mi | 20 | 4 | 1,73 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 568/945/995 | 3,77 MB | 0,70 MB | 264 | 117 mil | 4,28 mi | 29 | 23/72 | 3 | 24 | 13 | 1900: 67 mil · 1901: 552 mil · 1902: 1,64 mi | não |
| 1900 | `r31-base-1` | 10/1902 | 619/967/1179 | 3,56 MB | 0,74 MB | 262 | -18 mil | -87 mil | 21 | 26/54 | 3 | 15 | 4 | 1900: 64 mil · 1901: 311 mil | insolvency |
| 1900 | `r31-base-2` | 01/1903 | 563/968/1319 | 4,06 MB | 0,77 MB | 262 | 31 mil | 3,98 mi | 30 | 30/74 | 3 | 24 | 16 | 1900: 88 mil · 1901: 529 mil · 1902: 1,39 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 555/825/1439 | 3,60 MB | 0,68 MB | 262 | 92 mil | 3,03 mi | 33 | 18/81 | 3 | 15 | 18 | 1900: 72 mil · 1901: 340 mil · 1902: 955 mil | não |
| 1955 | `r31-base-0` | 01/1958 | 1594/2344/2670 | 6,22 MB | 1,22 MB | 264 | 7 mil | 2,77 mi | 18 | 70/46 | 3 | 23 | 0 | 1955: 121 mil · 1956: 693 mil · 1957: 1,47 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 1534/2465/3135 | 5,76 MB | 1,14 MB | 263 | 172 mil | 729 mil | 19 | 68/47 | 3 | 11 | 0 | 1955: 86 mil · 1956: 261 mil · 1957: 473 mil | não |
| 1955 | `r31-base-2` | 10/1956 | 1200/1694/1957 | 5,18 MB | 1,15 MB | 263 | -10 mil | -113 mil | 14 | 53/36 | 3 | 7 | 0 | 1955: 66 mil | insolvency |
| 1955 | `r31-base-3` | 08/1956 | 968/1319/2645 | 4,90 MB | 1,09 MB | 265 | -9 mil | -118 mil | 14 | 54/35 | 3 | 4 | 0 | 1955: 75 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1975/3351/4016 | 10,03 MB | 1,99 MB | 265 | 76 mil | 2,18 mi | 19 | 61/47 | 3 | 16 | 0 | 1990: 93 mil · 1991: 370 mil · 1992: 1,01 mi | não |
| 1990 | `r31-base-1` | 01/1993 | 1966/3165/4468 | 10,07 MB | 2,01 MB | 263 | 52 mil | 2,24 mi | 18 | 66/44 | 3 | 12 | 0 | 1990: 132 mil · 1991: 437 mil · 1992: 798 mil | não |
| 1990 | `r31-base-2` | 01/1993 | 2114/3412/4861 | 9,78 MB | 1,94 MB | 264 | 27 mil | 1,02 mi | 16 | 51/40 | 3 | 9 | 0 | 1990: 104 mil · 1991: 151 mil · 1992: 535 mil | não |
| 1990 | `r31-base-3` | 01/1993 | 2150/3689/4281 | 9,72 MB | 1,93 MB | 263 | 2 mil | 1,05 mi | 17 | 65/42 | 3 | 5 | 0 | 1990: 314 mil · 1991: 331 mil · 1992: 418 mil | não |
| 2012 | `r31-base-0` | 01/2015 | 3302/5531/6893 | 12,73 MB | 2,50 MB | 264 | 628 mil | 15,42 mi | 24 | 79/59 | 5 | 30 | 2 | 2012: 110 mil · 2013: 896 mil · 2014: 5,43 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 2970/4958/5175 | 12,52 MB | 2,46 MB | 265 | 54 mil | 5,28 mi | 16 | 69/41 | 3 | 25 | 0 | 2012: 58 mil · 2013: 368 mil · 2014: 1,29 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 3156/3964/5249 | 12,48 MB | 2,47 MB | 264 | 27 mil | 2,66 mi | 17 | 60/42 | 3 | 12 | 0 | 2012: 48 mil · 2013: 203 mil · 2014: 593 mil | não |
| 2012 | `r31-base-3` | 01/2015 | 3061/4085/5309 | 12,63 MB | 2,48 MB | 263 | -13 mil | 7,00 mi | 17 | 74/42 | 4 | 17 | 0 | 2012: 102 mil · 2013: 987 mil · 2014: 2,08 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 4133/5912/7170 | 12,49 MB | 2,39 MB | 263 | 191 mil | 4,03 mi | 20 | 68/51 | 3 | 16 | 0 | 2030: 25 mil · 2031: 468 mil · 2032: 1,68 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 3923/5121/6653 | 12,28 MB | 2,34 MB | 264 | 71 mil | 3,70 mi | 20 | 63/51 | 4 | 20 | 0 | 2030: 77 mil · 2031: 489 mil · 2032: 1,58 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2618/4497/5503 | 13,01 MB | 2,47 MB | 264 | 955 mil | 16,64 mi | 21 | 83/51 | 5 | 26 | 0 | 2030: 131 mil · 2031: 2,80 mi · 2032: 7,28 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2525/3933/5135 | 12,49 MB | 2,39 MB | 263 | 160 mil | 4,35 mi | 17 | 69/43 | 3 | 31 | 0 | 2030: 60 mil · 2031: 462 mil · 2032: 1,79 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 490.401 |
| `chron9` | 310.224 |
| `facts17` | 252.949 |
| `fame15` | 215.259 |
| `creation` | 150.857 |
| `leisure14` | 126.349 |
| `deleg31` | 121.110 |
| `ag18` | 116.879 |
| `attn` | 102.984 |
| `fame16` | 98.617 |
| `fest8` | 93.773 |
| `people` | 83.028 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

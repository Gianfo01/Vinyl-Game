# Medição de referência — onda 3 · D+Y (padrão) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 1275 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 690 | 1.343 | 1.140 | 429 | 3,72 MB | 0,70 MB | 156 | 263 |
| 1955 | 4 | 1.504 | 3.244 | 3.018 | 944 | 5,81 MB | 1,19 MB | 251 | 263 |
| 1990 | 4 | 1.449 | 5.151 | 5.389 | 1.569 | 9,07 MB | 1,92 MB | 482 | 263 |
| 2012 | 4 | 2.520 | 8.671 | 7.743 | 2.917 | 12,72 MB | 2,51 MB | 832 | 264 |
| 2030 | 4 | 2.958 | 9.644 | 9.223 | 3.148 | 12,50 MB | 2,40 MB | 803 | 264 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 169 mil | 4,83 mi | 27 | 3 | 1,81 mi | 0 |
| 1955 | 40 mil | 491 mil | 17 | 3 | 290 mil | 1 |
| 1990 | -9 mil | -113 mil | 15 | 3 | 86 mil | 4 |
| 2012 | 125 mil | 11,95 mi | 18 | 4 | 3,11 mi | 0 |
| 2030 | 312 mil | 4,49 mi | 18 | 4 | 2,19 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 1337/2599/3645 | 3,52 MB | 0,68 MB | 263 | 1 mil | 3,20 mi | 26 | 16/64 | 3 | 19 | 11 | 1900: 28 mil · 1901: 193 mil · 1902: 1,27 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 1601/2808/4461 | 3,98 MB | 0,75 MB | 263 | 145 mil | 5,16 mi | 31 | 13/77 | 3 | 24 | 15 | 1900: 162 mil · 1901: 1,05 mi · 1902: 1,87 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 1328/1933/3016 | 3,68 MB | 0,71 MB | 262 | 193 mil | 4,51 mi | 24 | 34/59 | 2 | 10 | 7 | 1900: 75 mil · 1901: 309 mil · 1902: 1,75 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 1104/1413/2438 | 3,76 MB | 0,70 MB | 262 | 248 mil | 6,09 mi | 27 | 20/68 | 3 | 26 | 10 | 1900: 119 mil · 1901: 855 mil · 1902: 2,42 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 3788/5569/5994 | 6,28 MB | 1,22 MB | 263 | 222 mil | 2,72 mi | 17 | 69/43 | 3 | 19 | 0 | 1955: 263 mil · 1956: 472 mil · 1957: 1,13 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 3185/4490/6210 | 5,73 MB | 1,14 MB | 263 | 68 mil | 322 mil | 18 | 65/46 | 3 | 2 | 0 | 1955: 99 mil · 1956: 200 mil · 1957: 225 mil | não |
| 1955 | `r31-base-2` | 04/1957 | 2566/4417/5459 | 5,62 MB | 1,21 MB | 263 | -2 mil | -84 mil | 16 | 51/41 | 3 | 13 | 0 | 1955: 57 mil · 1956: 147 mil | insolvency |
| 1955 | `r31-base-3` | 01/1958 | 3270/4931/8321 | 5,88 MB | 1,16 MB | 265 | 12 mil | 659 mil | 15 | 69/39 | 2 | 8 | 0 | 1955: 94 mil · 1956: 278 mil · 1957: 355 mil | não |
| 1990 | `r31-base-0` | 06/1991 | 4788/6486/8407 | 8,78 MB | 1,90 MB | 263 | -6 mil | -122 mil | 15 | 44/39 | 3 | 10 | 0 | 1990: 68 mil | insolvency |
| 1990 | `r31-base-1` | 03/1992 | 4804/7377/8936 | 9,37 MB | 1,93 MB | 263 | -9 mil | -81 mil | 15 | 52/38 | 3 | 15 | 0 | 1990: 176 mil · 1991: 197 mil | insolvency |
| 1990 | `r31-base-2` | 03/1991 | 4814/6401/8091 | 8,13 MB | 1,76 MB | 263 | -24 mil | -144 mil | 14 | 40/34 | 3 | 7 | 0 | 1990: 66 mil | insolvency |
| 1990 | `r31-base-3` | 10/1991 | 6100/9530/11699 | 9,55 MB | 2,08 MB | 264 | -9 mil | -103 mil | 15 | 44/37 | 2 | 7 | 0 | 1990: 103 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 7528/11211/15788 | 12,65 MB | 2,50 MB | 264 | -5 mil | 12,34 mi | 17 | 78/42 | 3 | 21 | 0 | 2012: 84 mil · 2013: 987 mil · 2014: 2,41 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 8001/14673/20232 | 12,78 MB | 2,51 MB | 264 | 195 mil | 14,68 mi | 22 | 79/54 | 5 | 33 | 3 | 2012: 69 mil · 2013: 706 mil · 2014: 3,83 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 8619/12982/15774 | 12,55 MB | 2,47 MB | 263 | 55 mil | 4,04 mi | 16 | 66/41 | 2 | 6 | 0 | 2012: 56 mil · 2013: 256 mil · 2014: 848 mil | não |
| 2012 | `r31-base-3` | 01/2015 | 10536/18353/37331 | 12,86 MB | 2,53 MB | 263 | 548 mil | 11,57 mi | 19 | 75/47 | 5 | 29 | 0 | 2012: 149 mil · 2013: 1,26 mi · 2014: 3,82 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 9874/15496/17053 | 12,54 MB | 2,40 MB | 264 | 438 mil | 5,33 mi | 17 | 72/42 | 4 | 16 | 0 | 2030: 37 mil · 2031: 497 mil · 2032: 2,55 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 9883/13010/19610 | 12,31 MB | 2,35 MB | 265 | 72 mil | 3,21 mi | 19 | 55/48 | 3 | 22 | 0 | 2030: 47 mil · 2031: 403 mil · 2032: 1,33 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 10862/16501/19202 | 12,83 MB | 2,44 MB | 264 | 1,01 mi | 13,03 mi | 23 | 78/57 | 5 | 28 | 0 | 2030: 73 mil · 2031: 2,05 mi · 2032: 6,82 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 7959/13318/16352 | 12,47 MB | 2,39 MB | 263 | 186 mil | 3,65 mi | 17 | 59/44 | 3 | 28 | 0 | 2030: 30 mil · 2031: 304 mil · 2032: 1,83 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 485.200 |
| `chron9` | 307.473 |
| `facts17` | 240.007 |
| `fame15` | 216.926 |
| `creation` | 147.738 |
| `leisure14` | 123.700 |
| `ag18` | 121.831 |
| `attn` | 104.496 |
| `st28` | 99.653 |
| `fame16` | 96.562 |
| `fest8` | 94.412 |
| `deleg31` | 85.146 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

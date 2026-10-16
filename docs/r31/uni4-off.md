# Medição de referência — UNI-4-desligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 308 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 152 | 300 | 292 | 352 | 3,66 MB | 0,71 MB | 39 | 274 |
| 1955 | 4 | 253 | 704 | 714 | 768 | 6,08 MB | 1,19 MB | 74 | 275 |
| 1990 | 4 | 429 | 1.312 | 1.343 | 1.460 | 10,11 MB | 2,07 MB | 125 | 275 |
| 2012 | 4 | 526 | 1.955 | 1.917 | 2.195 | 13,34 MB | 2,62 MB | 197 | 276 |
| 2030 | 4 | 875 | 2.303 | 2.213 | 2.653 | 13,45 MB | 2,56 MB | 212 | 275 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 122 mil | 3,38 mi | 27 | 3 | 1,02 mi | 1 |
| 1955 | 56 mil | 265 mil | 18 | 3 | 356 mil | 1 |
| 1990 | -7 mil | 225 mil | 16 | 3 | 195 mil | 2 |
| 2012 | 186 mil | 9,06 mi | 19 | 5 | 2,93 mi | 0 |
| 2030 | 423 mil | 11,82 mi | 20 | 5 | 4,54 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 09/1902 | 302/444/500 | 3,34 MB | 0,70 MB | 275 | -17 mil | -90 mil | 17 | 39/43 | 3 | 15 | 3 | 1900: 40 mil · 1901: 182 mil | insolvency |
| 1900 | `r31-base-1` | 01/1903 | 338/492/641 | 4,04 MB | 0,74 MB | 274 | 150 mil | 5,36 mi | 35 | 19/86 | 3 | 25 | 24 | 1900: 89 mil · 1901: 943 mil · 1902: 1,64 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 288/387/510 | 3,56 MB | 0,70 MB | 274 | 94 mil | 1,59 mi | 28 | 27/69 | 3 | 9 | 12 | 1900: 90 mil · 1901: 240 mil · 1902: 404 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 272/363/445 | 3,76 MB | 0,71 MB | 274 | 208 mil | 5,17 mi | 25 | 26/64 | 3 | 25 | 7 | 1900: 106 mil · 1901: 923 mil · 1902: 2,05 mi | não |
| 1955 | `r31-base-0` | 08/1956 | 625/754/834 | 5,34 MB | 1,16 MB | 275 | -15 mil | -116 mil | 11 | 54/28 | 3 | 12 | 0 | 1955: 194 mil | insolvency |
| 1955 | `r31-base-1` | 01/1958 | 705/872/1254 | 6,02 MB | 1,18 MB | 275 | 162 mil | 1,82 mi | 20 | 65/49 | 3 | 17 | 0 | 1955: 86 mil · 1956: 578 mil · 1957: 1,08 mi | não |
| 1955 | `r31-base-2` | 01/1958 | 709/974/1226 | 6,15 MB | 1,20 MB | 275 | 22 mil | 222 mil | 18 | 74/45 | 3 | 14 | 0 | 1955: 88 mil · 1956: 296 mil · 1957: 355 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 740/1021/1110 | 6,32 MB | 1,24 MB | 276 | 90 mil | 307 mil | 18 | 73/44 | 3 | 17 | 0 | 1955: 112 mil · 1956: 415 mil · 1957: 357 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1417/1828/1925 | 10,42 MB | 2,09 MB | 276 | -0 mil | 1,23 mi | 20 | 58/50 | 2 | 9 | 0 | 1990: 187 mil · 1991: 214 mil · 1992: 611 mil | não |
| 1990 | `r31-base-1` | 06/1991 | 1078/1344/1768 | 9,18 MB | 1,98 MB | 275 | -6 mil | -103 mil | 14 | 34/34 | 4 | 14 | 0 | 1990: 137 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1420/1944/2322 | 10,25 MB | 2,05 MB | 275 | -14 mil | 554 mil | 17 | 58/42 | 3 | 11 | 0 | 1990: 141 mil · 1991: 299 mil · 1992: 253 mil | não |
| 1990 | `r31-base-3` | 10/1991 | 1134/1444/1809 | 9,97 MB | 2,18 MB | 275 | -8 mil | -111 mil | 15 | 40/37 | 3 | 11 | 0 | 1990: 124 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 1934/2544/2740 | 13,39 MB | 2,63 MB | 276 | 665 mil | 21,40 mi | 18 | 76/45 | 5 | 25 | 0 | 2012: 69 mil · 2013: 1,31 mi · 2014: 6,09 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1890/2399/3167 | 13,28 MB | 2,61 MB | 276 | 34 mil | 8,29 mi | 19 | 82/47 | 3 | 26 | 1 | 2012: 78 mil · 2013: 587 mil · 2014: 2,11 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2152/2769/5537 | 13,49 MB | 2,65 MB | 275 | 128 mil | 8,98 mi | 19 | 73/47 | 4 | 31 | 1 | 2012: 91 mil · 2013: 711 mil · 2014: 3,38 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1846/2385/2585 | 13,23 MB | 2,59 MB | 276 | 245 mil | 9,14 mi | 21 | 87/54 | 5 | 21 | 0 | 2012: 62 mil · 2013: 515 mil · 2014: 2,48 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2352/2975/3407 | 13,62 MB | 2,58 MB | 275 | 681 mil | 12,89 mi | 20 | 84/49 | 5 | 26 | 0 | 2030: 45 mil · 2031: 2,74 mi · 2032: 6,05 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2284/2806/3635 | 13,17 MB | 2,51 MB | 276 | 539 mil | 12,26 mi | 20 | 68/51 | 5 | 24 | 0 | 2030: 110 mil · 2031: 1,08 mi · 2032: 4,27 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2486/3202/3861 | 13,52 MB | 2,57 MB | 275 | 237 mil | 11,38 mi | 22 | 82/55 | 5 | 31 | 0 | 2030: 131 mil · 2031: 2,07 mi · 2032: 3,51 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2091/2916/3351 | 13,38 MB | 2,55 MB | 275 | 306 mil | 8,83 mi | 19 | 65/48 | 5 | 36 | 0 | 2030: 49 mil · 2031: 2,42 mi · 2032: 4,81 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 492.275 |
| `chron9` | 315.371 |
| `facts17` | 245.896 |
| `fame15` | 230.300 |
| `creation` | 154.834 |
| `st28` | 142.444 |
| `leisure14` | 126.755 |
| `ag18` | 123.890 |
| `relics9` | 115.993 |
| `attn` | 113.056 |
| `deleg31` | 111.000 |
| `festivals` | 99.934 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

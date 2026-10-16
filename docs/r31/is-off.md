# Medição de referência — is desligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 280 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 143 | 237 | 232 | 279 | 3,77 MB | 0,72 MB | 37 | 274 |
| 1955 | 4 | 219 | 575 | 586 | 645 | 5,97 MB | 1,18 MB | 61 | 275 |
| 1990 | 4 | 420 | 1.189 | 1.179 | 1.270 | 9,59 MB | 1,98 MB | 130 | 275 |
| 2012 | 4 | 667 | 1.885 | 1.808 | 1.933 | 13,39 MB | 2,62 MB | 439 | 275 |
| 2030 | 4 | 951 | 2.076 | 1.954 | 2.199 | 13,41 MB | 2,54 MB | 279 | 275 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 129 mil | 4,82 mi | 28 | 3 | 1,83 mi | 0 |
| 1955 | 1 mil | 710 mil | 17 | 3 | 435 mil | 0 |
| 1990 | -18 mil | 1,20 mi | 16 | 4 | 551 mil | 2 |
| 2012 | 415 mil | 12,57 mi | 22 | 5 | 3,73 mi | 0 |
| 2030 | 455 mil | 8,29 mi | 21 | 5 | 3,50 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 248/386/423 | 3,75 MB | 0,72 MB | 274 | 98 mil | 6,26 mi | 32 | 25/81 | 3 | 23 | 19 | 1900: 66 mil · 1901: 601 mil · 1902: 2,20 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 238/319/450 | 3,86 MB | 0,74 MB | 274 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 241/293/427 | 3,65 MB | 0,72 MB | 273 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 223/346/393 | 3,79 MB | 0,71 MB | 273 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 598/781/854 | 6,03 MB | 1,19 MB | 275 | 40 mil | 122 mil | 16 | 64/40 | 3 | 2 | 0 | 1955: 130 mil · 1956: 229 mil · 1957: 163 mil | não |
| 1955 | `r31-base-1` | 01/1958 | 588/841/1050 | 5,92 MB | 1,17 MB | 274 | -34 mil | 1,91 mi | 19 | 62/48 | 3 | 20 | 0 | 1955: 62 mil · 1956: 280 mil · 1957: 824 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 548/759/923 | 5,72 MB | 1,13 MB | 274 | -6 mil | 99 mil | 14 | 65/35 | 1 | 5 | 0 | 1955: 57 mil · 1956: 229 mil · 1957: 122 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 566/782/1106 | 6,22 MB | 1,22 MB | 276 | 8 mil | 1,30 mi | 17 | 69/42 | 3 | 18 | 0 | 1955: 102 mil · 1956: 279 mil · 1957: 706 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1358/1679/1795 | 10,44 MB | 2,09 MB | 275 | -25 mil | 2,54 mi | 18 | 57/44 | 3 | 18 | 0 | 1990: 239 mil · 1991: 340 mil · 1992: 1,04 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 891/1141/1357 | 8,62 MB | 1,86 MB | 274 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1260/1867/2208 | 10,48 MB | 2,10 MB | 274 | 86 mil | 2,69 mi | 16 | 54/40 | 3 | 22 | 0 | 1990: 220 mil · 1991: 324 mil · 1992: 1,01 mi | não |
| 1990 | `r31-base-3` | 04/1991 | 893/1263/1279 | 8,74 MB | 1,88 MB | 276 | -16 mil | -134 mil | 14 | 37/35 | 4 | 9 | 0 | 1990: 76 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 1952/3017/3752 | 13,24 MB | 2,60 MB | 275 | 495 mil | 11,59 mi | 22 | 77/55 | 5 | 27 | 0 | 2012: 104 mil · 2013: 546 mil · 2014: 3,57 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1839/2805/3155 | 13,29 MB | 2,61 MB | 276 | 106 mil | 9,22 mi | 18 | 71/44 | 3 | 17 | 0 | 2012: 61 mil · 2013: 420 mil · 2014: 2,39 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1861/2623/3979 | 13,51 MB | 2,66 MB | 274 | 335 mil | 13,56 mi | 21 | 70/52 | 5 | 28 | 2 | 2012: 113 mil · 2013: 575 mil · 2014: 3,90 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1887/2577/2849 | 13,49 MB | 2,64 MB | 275 | 1,33 mi | 18,03 mi | 22 | 81/55 | 5 | 22 | 1 | 2012: 92 mil · 2013: 1,49 mi · 2014: 7,64 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2110/2957/3153 | 13,59 MB | 2,58 MB | 275 | 414 mil | 8,53 mi | 21 | 84/54 | 5 | 33 | 0 | 2030: 82 mil · 2031: 3,43 mi · 2032: 3,67 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2163/2874/3456 | 13,23 MB | 2,51 MB | 276 | 100 mil | 5,51 mi | 22 | 68/54 | 5 | 34 | 0 | 2030: 49 mil · 2031: 831 mil · 2032: 2,80 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2113/3060/4255 | 13,58 MB | 2,59 MB | 275 | 1,07 mi | 12,65 mi | 21 | 82/52 | 5 | 59 | 0 | 2030: 138 mil · 2031: 1,50 mi · 2032: 7,52 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1917/2723/3412 | 13,11 MB | 2,50 MB | 275 | 496 mil | 8,06 mi | 21 | 76/53 | 5 | 31 | 0 | 2030: 112 mil · 2031: 887 mil · 2032: 3,33 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 491.097 |
| `chron9` | 313.503 |
| `facts17` | 250.926 |
| `fame15` | 228.260 |
| `creation` | 150.465 |
| `leisure14` | 129.493 |
| `st28` | 128.215 |
| `ag18` | 120.116 |
| `attn` | 116.776 |
| `relics9` | 115.976 |
| `deleg31` | 108.326 |
| `fame16` | 95.833 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

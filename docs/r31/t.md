# Onda 4 · T — Aeroporto, transporte e leilões: resumo da medição

Interruptores: `auction31` (casa de leilões), `cruise31` (temporadas no mar), `holo31` (show por holograma). Medição: `measure.ts`
(4 sementes × 5 eras, 36 meses, robô playbot16) LIGADO (`docs/r31/t.json`, tabelas abaixo) × DESLIGADO (`docs/r31/t-off.json`,
`--sw auction31=false,cruise31=false,holo31=false`).

| Era | Caixa (lig./desl.) | Patrimônio (lig./desl.) | Receita do último ano (lig./desl.) | Fama |
|---|---:|---:|---:|---:|
| 1900 | 63 mil / 129 mil | 4,72 mi / 4,82 mi | 1,84 mi / 1,83 mi | 27 / 28 |
| 1955 | −10 mil / −7 mil | 324 mil / 244 mil | 256 mil / 281 mil | 16 / 16 |
| 1990 | −18 mil / −4 mil | 1,14 mi / 0,69 mi | 515 mil / 264 mil | 16 / 16 |
| 2012 | 521 mil / 576 mil | 9,25 mi / 10,96 mi | 4,52 mi / 4,49 mi | 20 / 20 |
| 2030 | 700 mil / 360 mil | 9,78 mi / 10,58 mi | 5,36 mi / 3,36 mi | 21 / 20 |

O que mudou e por quê: o robô não dá lance, não consigna, não embarca nem transmite holograma — nenhuma regra nova toca a
economia dele. As diferenças vêm só do caos do sorteio: com a casa de leilões ligada, os lotes de relíquia são fechados pelo
martelo do pregão (conta determinística por pessoa) em vez do `relics9.fate`, que tirava números do sorteio mensal comum; a
sequência dos outros sistemas no mês se desloca. Prova de que não há efeito sistemático: por partida, a razão de receita
ligado/desligado tem média de log +0,08 com sinais mistos (9 para cima, 6 para baixo, 5 iguais), e caixa e patrimônio mudam de
lado entre as eras. Fama igual (±1). Goldens r27-p2a, r27-p2b, r27-m3 e r16-playbot IGUAIS (as partidas de referência não têm
peça em pregão no trecho medido). Desempenho: ms/mês dentro do ruído (pregões e plateia só existem com lote; plateia em cache por
semana). Save: +1 chave em x4 por sistema (`auction31`, `travel31`).

---

# Medição de referência — onda 4 T (ligado) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 580 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 233 | 345 | 328 | 426 | 3,76 MB | 0,72 MB | 53 | 283 |
| 1955 | 4 | 324 | 794 | 818 | 948 | 5,93 MB | 1,18 MB | 95 | 284 |
| 1990 | 4 | 498 | 1.600 | 1.608 | 1.909 | 9,56 MB | 1,98 MB | 170 | 284 |
| 2012 | 4 | 658 | 2.740 | 2.703 | 3.098 | 13,38 MB | 2,62 MB | 254 | 284 |
| 2030 | 4 | 904 | 2.884 | 2.719 | 3.384 | 13,30 MB | 2,53 MB | 435 | 284 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 63 mil | 4,72 mi | 27 | 3 | 1,84 mi | 0 |
| 1955 | -10 mil | 324 mil | 17 | 3 | 256 mil | 1 |
| 1990 | -18 mil | 1,14 mi | 16 | 4 | 515 mil | 2 |
| 2012 | 521 mil | 9,25 mi | 20 | 5 | 4,52 mi | 0 |
| 2030 | 700 mil | 9,78 mi | 21 | 5 | 5,36 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 329/461/640 | 3,74 MB | 0,72 MB | 283 | 98 mil | 6,26 mi | 32 | 25/81 | 3 | 23 | 19 | 1900: 66 mil · 1901: 601 mil · 1902: 2,20 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 309/430/521 | 3,73 MB | 0,72 MB | 283 | 110 mil | 3,65 mi | 25 | 21/62 | 3 | 21 | 7 | 1900: 88 mil · 1901: 403 mil · 1902: 1,33 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 419/648/840 | 3,91 MB | 0,75 MB | 282 | 3 mil | 3,29 mi | 26 | 21/64 | 3 | 25 | 7 | 1900: 102 mil · 1901: 426 mil · 1902: 1,47 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 322/457/660 | 3,78 MB | 0,71 MB | 282 | 29 mil | 5,78 mi | 28 | 18/71 | 3 | 27 | 12 | 1900: 111 mil · 1901: 903 mil · 1902: 2,31 mi | não |
| 1955 | `r31-base-0` | 07/1956 | 684/912/1121 | 5,21 MB | 1,14 MB | 283 | -20 mil | -123 mil | 15 | 51/38 | 3 | 12 | 0 | 1955: 138 mil | insolvency |
| 1955 | `r31-base-1` | 01/1958 | 826/1119/1469 | 5,94 MB | 1,18 MB | 283 | 21 mil | 850 mil | 19 | 66/48 | 3 | 11 | 0 | 1955: 62 mil · 1956: 288 mil · 1957: 514 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 834/1161/1346 | 6,08 MB | 1,21 MB | 284 | -4 mil | 570 mil | 17 | 66/43 | 3 | 12 | 0 | 1955: 57 mil · 1956: 271 mil · 1957: 366 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 777/1015/1186 | 5,92 MB | 1,17 MB | 285 | -17 mil | 78 mil | 16 | 67/41 | 3 | 15 | 0 | 1955: 101 mil · 1956: 306 mil · 1957: 146 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1734/2280/2616 | 10,51 MB | 2,10 MB | 284 | 51 mil | 2,42 mi | 18 | 63/45 | 3 | 11 | 0 | 1990: 239 mil · 1991: 791 mil · 1992: 938 mil | não |
| 1990 | `r31-base-1` | 03/1991 | 1296/1648/1769 | 8,61 MB | 1,86 MB | 283 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1741/2376/3146 | 10,57 MB | 2,12 MB | 283 | -88 mil | 4,44 mi | 17 | 54/43 | 3 | 23 | 0 | 1990: 221 mil · 1991: 440 mil · 1992: 1,58 mi | não |
| 1990 | `r31-base-3` | 04/1991 | 1226/1594/1728 | 8,61 MB | 1,85 MB | 285 | -17 mil | -135 mil | 14 | 37/35 | 4 | 9 | 0 | 1990: 76 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 2895/4191/4848 | 13,58 MB | 2,66 MB | 284 | 1,46 mi | 19,25 mi | 20 | 80/51 | 5 | 34 | 0 | 2012: 142 mil · 2013: 1,75 mi · 2014: 8,47 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 2605/3387/4436 | 12,98 MB | 2,57 MB | 285 | 177 mil | 5,71 mi | 19 | 70/48 | 3 | 22 | 0 | 2012: 59 mil · 2013: 471 mil · 2014: 1,44 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2724/3956/4589 | 13,33 MB | 2,63 MB | 283 | 162 mil | 7,19 mi | 17 | 78/43 | 5 | 32 | 0 | 2012: 113 mil · 2013: 637 mil · 2014: 2,65 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2734/4079/5158 | 13,42 MB | 2,62 MB | 284 | 864 mil | 11,31 mi | 21 | 82/51 | 5 | 28 | 0 | 2012: 92 mil · 2013: 1,20 mi · 2014: 6,39 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 3079/4708/5171 | 13,63 MB | 2,59 MB | 284 | 1,15 mi | 11,65 mi | 22 | 83/55 | 5 | 28 | 0 | 2030: 82 mil · 2031: 2,64 mi · 2032: 7,49 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2909/4124/4628 | 13,22 MB | 2,51 MB | 284 | 114 mil | 6,59 mi | 20 | 67/51 | 3 | 23 | 0 | 2030: 49 mil · 2031: 650 mil · 2032: 2,17 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2628/3631/4405 | 13,39 MB | 2,55 MB | 284 | 1,24 mi | 14,43 mi | 22 | 76/55 | 5 | 24 | 0 | 2030: 143 mil · 2031: 1,21 mi · 2032: 8,32 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2919/4057/7331 | 13,09 MB | 2,50 MB | 284 | 250 mil | 7,91 mi | 20 | 68/50 | 5 | 27 | 0 | 2030: 115 mil · 2031: 944 mil · 2032: 3,22 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 495.648 |
| `chron9` | 315.491 |
| `facts17` | 250.091 |
| `fame15` | 228.098 |
| `st28` | 176.227 |
| `creation` | 154.140 |
| `leisure14` | 125.802 |
| `ag18` | 121.196 |
| `relics9` | 116.116 |
| `attn` | 112.579 |
| `deleg31` | 111.795 |
| `fame16` | 95.484 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

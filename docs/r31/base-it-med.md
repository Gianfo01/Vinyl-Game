# Medição de referência — base-it (ligada) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (2 sementes × 4 eras, 24 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`. Eras de início: 1955, 1975, 1995, 2015 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 4 partidas em paralelo; tempo total 108 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1955 | 2 | 525 | 828 | 821 | 927 | 5,48 MB | 1,09 MB | 75 | 287 |
| 1975 | 2 | 659 | 1.479 | 1.510 | 1.474 | 8,39 MB | 1,69 MB | 187 | 288 |
| 1995 | 2 | 1.069 | 2.215 | 2.188 | 2.137 | 10,84 MB | 2,18 MB | 225 | 287 |
| 2015 | 2 | 1.330 | 3.078 | 3.067 | 2.950 | 14,03 MB | 2,77 MB | 539 | 287 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1955 | 2 mil | 500 mil | 16 | 3 | 301 mil | 0 |
| 1975 | 10 mil | 1,02 mi | 18 | 3 | 526 mil | 0 |
| 1995 | 40 mil | 735 mil | 16 | 3 | 398 mil | 0 |
| 2015 | 160 mil | 11,01 mi | 17 | 4 | 2,94 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1955 | `r31-base-0` | 01/1957 | 881/1108/1193 | 5,65 MB | 1,13 MB | 287 | 1 mil | 609 mil | 14 | 61/36 | 3 | 18 | 0 | 1955: 177 mil · 1956: 296 mil | não |
| 1955 | `r31-base-1` | 01/1957 | 776/1017/1197 | 5,31 MB | 1,06 MB | 287 | 3 mil | 390 mil | 18 | 62/44 | 3 | 12 | 0 | 1955: 92 mil · 1956: 306 mil | não |
| 1975 | `r31-base-0` | 01/1977 | 1504/1841/1911 | 8,40 MB | 1,69 MB | 288 | 9 mil | 1,05 mi | 19 | 38/49 | 2 | 9 | 0 | 1975: 93 mil · 1976: 569 mil | não |
| 1975 | `r31-base-1` | 01/1977 | 1454/1779/1819 | 8,38 MB | 1,69 MB | 288 | 11 mil | 999 mil | 16 | 49/39 | 3 | 15 | 0 | 1975: 298 mil · 1976: 482 mil | não |
| 1995 | `r31-base-0` | 01/1997 | 2121/2630/2950 | 10,79 MB | 2,17 MB | 287 | 47 mil | 1,02 mi | 16 | 50/40 | 3 | 10 | 0 | 1995: 226 mil · 1996: 471 mil | não |
| 1995 | `r31-base-1` | 01/1997 | 2310/2782/2847 | 10,89 MB | 2,20 MB | 287 | 34 mil | 447 mil | 15 | 47/37 | 3 | 12 | 0 | 1995: 81 mil · 1996: 324 mil | não |
| 2015 | `r31-base-0` | 01/2017 | 3084/3984/4550 | 13,93 MB | 2,76 MB | 287 | 385 mil | 10,60 mi | 18 | 62/44 | 3 | 23 | 0 | 2015: 251 mil · 2016: 2,68 mi | não |
| 2015 | `r31-base-1` | 01/2017 | 3071/3785/4318 | 14,14 MB | 2,79 MB | 287 | -65 mil | 11,43 mi | 16 | 69/41 | 5 | 21 | 0 | 2015: 261 mil · 2016: 3,20 mi | não |

## Maiores blocos de `x4` no save (era 2015, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 465.071 |
| `chron9` | 345.323 |
| `facts17` | 246.143 |
| `fame15` | 220.737 |
| `creation` | 211.924 |
| `st28` | 140.517 |
| `attn` | 115.993 |
| `fame16` | 109.868 |
| `ag18` | 109.023 |
| `leisure14` | 98.479 |
| `festivals` | 87.886 |
| `hype12` | 82.531 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

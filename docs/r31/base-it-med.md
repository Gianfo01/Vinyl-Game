# Medição de referência — base-it (ligada, 566) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (2 sementes × 4 eras, 24 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`. Eras de início: 1955, 1975, 1995, 2015 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 4 partidas em paralelo; tempo total 102 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1955 | 2 | 596 | 787 | 747 | 887 | 5,48 MB | 1,09 MB | 83 | 289 |
| 1975 | 2 | 629 | 1.440 | 1.449 | 1.431 | 8,51 MB | 1,71 MB | 178 | 290 |
| 1995 | 2 | 1.161 | 2.194 | 2.156 | 2.157 | 11,27 MB | 2,26 MB | 342 | 289 |
| 2015 | 2 | 1.407 | 3.053 | 2.997 | 2.901 | 14,81 MB | 2,94 MB | 582 | 289 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1955 | 103 mil | 1,28 mi | 17 | 3 | 621 mil | 0 |
| 1975 | -3 mil | 366 mil | 16 | 3 | 248 mil | 0 |
| 1995 | 47 mil | 2,93 mi | 16 | 3 | 1,08 mi | 0 |
| 2015 | 78 mil | 9,67 mi | 18 | 4 | 2,41 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1955 | `r31-base-0` | 01/1957 | 833/1001/1264 | 5,66 MB | 1,12 MB | 289 | 186 mil | 2,43 mi | 17 | 65/43 | 3 | 13 | 1 | 1955: 188 mil · 1956: 972 mil | não |
| 1955 | `r31-base-1` | 01/1957 | 742/1081/1322 | 5,29 MB | 1,06 MB | 289 | 21 mil | 125 mil | 17 | 61/42 | 2 | 10 | 0 | 1955: 75 mil · 1956: 271 mil | não |
| 1975 | `r31-base-0` | 01/1977 | 1468/1912/2525 | 8,53 MB | 1,72 MB | 290 | 4 mil | 140 mil | 16 | 38/39 | 3 | 12 | 0 | 1975: 89 mil · 1976: 254 mil | não |
| 1975 | `r31-base-1` | 01/1977 | 1412/1773/1873 | 8,50 MB | 1,71 MB | 290 | -11 mil | 593 mil | 16 | 41/40 | 3 | 16 | 0 | 1975: 177 mil · 1976: 242 mil | não |
| 1995 | `r31-base-0` | 01/1997 | 2157/2738/2833 | 11,22 MB | 2,24 MB | 289 | 34 mil | 4,00 mi | 16 | 47/41 | 2 | 9 | 0 | 1995: 821 mil · 1996: 1,38 mi | não |
| 1995 | `r31-base-1` | 01/1997 | 2230/2566/2811 | 11,32 MB | 2,27 MB | 289 | 60 mil | 1,86 mi | 15 | 45/37 | 3 | 14 | 0 | 1995: 524 mil · 1996: 773 mil | não |
| 2015 | `r31-base-0` | 01/2017 | 3056/3711/3751 | 14,68 MB | 2,92 MB | 289 | -34 mil | 7,31 mi | 18 | 59/45 | 3 | 23 | 0 | 2015: 106 mil · 2016: 1,37 mi | não |
| 2015 | `r31-base-1` | 01/2017 | 3049/3761/3904 | 14,94 MB | 2,96 MB | 289 | 190 mil | 12,04 mi | 17 | 70/43 | 5 | 23 | 1 | 2015: 148 mil · 2016: 3,45 mi | não |

## Maiores blocos de `x4` no save (era 2015, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 456.489 |
| `chron9` | 357.951 |
| `facts17` | 238.373 |
| `creation` | 236.847 |
| `fame15` | 232.019 |
| `st28` | 128.191 |
| `fame16` | 114.440 |
| `ag18` | 105.243 |
| `attn` | 98.038 |
| `leisure14` | 92.978 |
| `rw` | 91.745 |
| `festivals` | 87.958 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

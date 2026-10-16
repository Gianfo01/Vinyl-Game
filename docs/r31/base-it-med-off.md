# Medição de referência — base-it (desligada) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (2 sementes × 4 eras, 24 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`. Eras de início: 1955, 1975, 1995, 2015 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 4 partidas em paralelo; tempo total 90 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1955 | 2 | 449 | 786 | 779 | 856 | 5,16 MB | 1,03 MB | 58 | 287 |
| 1975 | 2 | 718 | 1.359 | 1.315 | 1.318 | 7,77 MB | 1,56 MB | 227 | 288 |
| 1995 | 2 | 1.167 | 1.950 | 1.895 | 1.884 | 9,75 MB | 1,95 MB | 261 | 287 |
| 2015 | 2 | 1.166 | 2.680 | 2.586 | 2.584 | 12,74 MB | 2,51 MB | 419 | 288 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1955 | 23 mil | 817 mil | 15 | 3 | 382 mil | 0 |
| 1975 | -15 mil | 1,00 mi | 16 | 3 | 505 mil | 0 |
| 1995 | 1 mil | 1,04 mi | 16 | 3 | 486 mil | 0 |
| 2015 | 80 mil | 8,39 mi | 18 | 4 | 2,69 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1955 | `r31-base-0` | 01/1957 | 819/998/1243 | 5,41 MB | 1,08 MB | 287 | 43 mil | 1,40 mi | 13 | 62/33 | 3 | 16 | 0 | 1955: 194 mil · 1956: 572 mil | não |
| 1955 | `r31-base-1` | 01/1957 | 753/941/1071 | 4,91 MB | 0,98 MB | 287 | 3 mil | 230 mil | 16 | 59/41 | 2 | 9 | 0 | 1955: 79 mil · 1956: 193 mil | não |
| 1975 | `r31-base-0` | 01/1977 | 1403/1709/2200 | 7,78 MB | 1,56 MB | 288 | -21 mil | 1,34 mi | 16 | 45/40 | 3 | 15 | 0 | 1975: 97 mil · 1976: 734 mil | não |
| 1975 | `r31-base-1` | 01/1977 | 1315/1801/2031 | 7,76 MB | 1,56 MB | 288 | -9 mil | 666 mil | 15 | 41/37 | 2 | 9 | 0 | 1975: 213 mil · 1976: 276 mil | não |
| 1995 | `r31-base-0` | 01/1997 | 1945/2431/2917 | 9,59 MB | 1,92 MB | 287 | 1 mil | 1,63 mi | 16 | 55/40 | 3 | 11 | 0 | 1995: 178 mil · 1996: 647 mil | não |
| 1995 | `r31-base-1` | 01/1997 | 1955/2383/2545 | 9,91 MB | 1,98 MB | 287 | 1 mil | 444 mil | 16 | 42/39 | 3 | 13 | 0 | 1995: 167 mil · 1996: 326 mil | não |
| 2015 | `r31-base-0` | 01/2017 | 2613/3088/3594 | 12,53 MB | 2,48 MB | 287 | 32 mil | 4,58 mi | 17 | 55/43 | 3 | 16 | 0 | 2015: 119 mil · 2016: 892 mil | não |
| 2015 | `r31-base-1` | 01/2017 | 2747/3256/3865 | 12,96 MB | 2,53 MB | 288 | 128 mil | 12,20 mi | 18 | 72/44 | 5 | 26 | 0 | 2015: 281 mil · 2016: 4,48 mi | não |

## Maiores blocos de `x4` no save (era 2015, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 460.202 |
| `chron9` | 335.562 |
| `facts17` | 249.635 |
| `fame15` | 190.526 |
| `creation` | 177.985 |
| `st28` | 120.865 |
| `ag18` | 111.500 |
| `fame16` | 110.097 |
| `attn` | 109.065 |
| `leisure14` | 91.075 |
| `festivals` | 87.685 |
| `people` | 82.177 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

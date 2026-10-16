# Medição de referência — base-hits desligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (2 sementes × 3 eras, 24 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`. Eras de início: 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 137 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1990 | 2 | 493 | 1.462 | 1.400 | 1.838 | 9,39 MB | 1,88 MB | 138 | 287 |
| 2012 | 2 | 564 | 1.935 | 1.990 | 2.569 | 12,05 MB | 2,40 MB | 217 | 288 |
| 2030 | 2 | 952 | 2.043 | 1.950 | 2.922 | 12,03 MB | 2,30 MB | 196 | 288 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1990 | 36 mil | 343 mil | 17 | 3 | 313 mil | 0 |
| 2012 | 47 mil | 2,97 mi | 19 | 3 | 910 mil | 0 |
| 2030 | 64 mil | 3,33 mi | 18 | 3 | 1,01 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1990 | `r31-base-0` | 01/1992 | 1484/2097/2275 | 9,36 MB | 1,87 MB | 287 | 20 mil | 232 mil | 16 | 52/40 | 3 | 14 | 0 | 1990: 106 mil · 1991: 260 mil | não |
| 1990 | `r31-base-1` | 01/1992 | 1441/2084/2421 | 9,41 MB | 1,89 MB | 287 | 51 mil | 453 mil | 17 | 41/42 | 3 | 14 | 0 | 1990: 114 mil · 1991: 366 mil | não |
| 2012 | `r31-base-0` | 01/2014 | 1983/2745/3217 | 12,16 MB | 2,41 MB | 288 | 69 mil | 3,21 mi | 18 | 62/46 | 3 | 15 | 0 | 2012: 174 mil · 2013: 984 mil | não |
| 2012 | `r31-base-1` | 01/2014 | 1888/2697/3165 | 11,95 MB | 2,38 MB | 287 | 25 mil | 2,73 mi | 19 | 65/46 | 3 | 15 | 0 | 2012: 81 mil · 2013: 836 mil | não |
| 2030 | `r31-base-0` | 01/2032 | 2007/2735/3145 | 12,12 MB | 2,31 MB | 287 | 121 mil | 3,49 mi | 17 | 57/41 | 3 | 35 | 0 | 2030: 45 mil · 2031: 1,25 mi | não |
| 2030 | `r31-base-1` | 01/2032 | 2078/2868/3247 | 11,95 MB | 2,29 MB | 288 | 7 mil | 3,16 mi | 18 | 55/45 | 3 | 20 | 0 | 2030: 64 mil · 2031: 777 mil | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 446.403 |
| `chron9` | 306.963 |
| `facts17` | 240.403 |
| `fame15` | 182.138 |
| `creation` | 136.308 |
| `fame16` | 103.730 |
| `leisure14` | 95.774 |
| `attn` | 92.979 |
| `festivals` | 89.246 |
| `ag18` | 86.441 |
| `relics9` | 83.965 |
| `hype12` | 78.258 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

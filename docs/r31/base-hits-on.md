# Medição de referência — base-hits ligado (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (2 sementes × 3 eras, 24 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`. Eras de início: 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 201 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1990 | 2 | 478 | 1.490 | 1.574 | 1.953 | 9,64 MB | 1,94 MB | 151 | 287 |
| 2012 | 2 | 849 | 3.103 | 2.906 | 3.861 | 17,09 MB | 3,47 MB | 334 | 288 |
| 2030 | 2 | 1.059 | 3.069 | 3.112 | 4.221 | 17,01 MB | 3,35 MB | 393 | 288 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1990 | 18 mil | 334 mil | 16 | 3 | 286 mil | 0 |
| 2012 | 313 mil | 5,71 mi | 22 | 5 | 1,96 mi | 0 |
| 2030 | 50 mil | 1,92 mi | 16 | 3 | 620 mil | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1990 | `r31-base-0` | 01/1992 | 1492/2077/2293 | 9,58 MB | 1,92 MB | 287 | 25 mil | 214 mil | 17 | 51/43 | 3 | 15 | 0 | 1990: 151 mil · 1991: 270 mil | não |
| 1990 | `r31-base-1` | 01/1992 | 1489/1889/1972 | 9,70 MB | 1,95 MB | 287 | 11 mil | 453 mil | 14 | 41/35 | 3 | 16 | 0 | 1990: 151 mil · 1991: 302 mil | não |
| 2012 | `r31-base-0` | 01/2014 | 3314/4152/13538 | 17,12 MB | 3,48 MB | 288 | 279 mil | 5,05 mi | 23 | 69/58 | 5 | 19 | 4 | 2012: 104 mil · 2013: 1,91 mi | não |
| 2012 | `r31-base-1` | 01/2014 | 2891/4152/4681 | 17,07 MB | 3,45 MB | 287 | 347 mil | 6,36 mi | 20 | 67/51 | 4 | 17 | 4 | 2012: 58 mil · 2013: 2,02 mi | não |
| 2030 | `r31-base-0` | 01/2032 | 3086/3783/4459 | 17,16 MB | 3,37 MB | 287 | 32 mil | 2,32 mi | 16 | 66/41 | 3 | 15 | 0 | 2030: 54 mil · 2031: 757 mil | não |
| 2030 | `r31-base-1` | 01/2032 | 3052/3797/4831 | 16,86 MB | 3,32 MB | 288 | 68 mil | 1,53 mi | 16 | 51/39 | 3 | 9 | 0 | 2030: 65 mil · 2031: 484 mil | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 461.387 |
| `chron9` | 398.088 |
| `fame15` | 302.870 |
| `creation` | 257.028 |
| `facts17` | 231.141 |
| `rw` | 125.531 |
| `fame16` | 107.565 |
| `ag18` | 104.732 |
| `leisure14` | 98.928 |
| `attn` | 97.243 |
| `hype12` | 90.642 |
| `ability18` | 90.033 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

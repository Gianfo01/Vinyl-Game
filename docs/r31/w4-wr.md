# W4 · W + R — mecânicas em cena 2, resultados e aprendizados (resumo da medição)

- **Ligado × desligado** (`--sw w31.jaba=false,w31.antitrust=false`, 4 sementes × 5 eras, 36 meses): todos os números de
  JOGO iguais nas 20 partidas (caixa, patrimônio, fama, reputação, atos, lançamentos, nº 1, receita por ano). A única
  diferença é o tamanho do save (+18 a +38 bytes: os dois interruptores gravados em `x4.sw31`). Motivo: os robôs não
  pagam jabá (payDJs) nem compram negócios (buy31) — as duas regras novas só agem quando o jogador escolhe.
- **Aprendizados** (`x4.learn31`) só lê os lançamentos: não muda nenhum número; ocupa pouco no save (não aparece entre as
  maiores chaves de `x4`).
- **Contra a base da versão 30** (`base30.json`): as diferenças vêm das ondas 1–3 já juntadas (caixa real médio
  170 mil → 259 mil, patrimônio 5,53 → 5,89 milhões, save 8,3 → 8,7 MB); nada delas é desta entrega.
- Cenas novas e faixa de elenco são interface: não entram na simulação.

# Medição de referência — w4-wr (ligado) (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 387 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 145 | 248 | 236 | 288 | 3,76 MB | 0,72 MB | 41 | 282 |
| 1955 | 4 | 267 | 576 | 593 | 623 | 5,97 MB | 1,20 MB | 74 | 283 |
| 1990 | 4 | 396 | 1.165 | 1.204 | 1.228 | 9,50 MB | 1,97 MB | 169 | 283 |
| 2012 | 4 | 511 | 1.737 | 1.658 | 1.892 | 13,40 MB | 2,62 MB | 223 | 283 |
| 2030 | 4 | 658 | 1.928 | 1.796 | 2.230 | 13,22 MB | 2,52 MB | 341 | 283 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 129 mil | 4,82 mi | 28 | 3 | 1,83 mi | 0 |
| 1955 | -7 mil | 244 mil | 16 | 3 | 281 mil | 2 |
| 1990 | -4 mil | 695 mil | 16 | 4 | 264 mil | 2 |
| 2012 | 576 mil | 10,96 mi | 20 | 5 | 4,49 mi | 0 |
| 2030 | 360 mil | 10,58 mi | 21 | 4 | 3,36 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 263/369/542 | 3,74 MB | 0,72 MB | 282 | 98 mil | 6,26 mi | 32 | 25/81 | 3 | 23 | 19 | 1900: 66 mil · 1901: 601 mil · 1902: 2,20 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 245/355/494 | 3,85 MB | 0,74 MB | 282 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 249/325/453 | 3,64 MB | 0,72 MB | 281 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 234/359/449 | 3,78 MB | 0,71 MB | 281 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 07/1956 | 527/736/779 | 5,25 MB | 1,15 MB | 282 | -25 mil | -129 mil | 15 | 51/38 | 3 | 12 | 0 | 1955: 138 mil | insolvency |
| 1955 | `r31-base-1` | 01/1958 | 602/804/1054 | 5,96 MB | 1,18 MB | 282 | 53 mil | 837 mil | 19 | 63/47 | 2 | 10 | 0 | 1955: 62 mil · 1956: 288 mil · 1957: 505 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 600/767/880 | 6,08 MB | 1,21 MB | 283 | -4 mil | 570 mil | 17 | 66/43 | 3 | 12 | 0 | 1955: 57 mil · 1956: 271 mil · 1957: 366 mil | não |
| 1955 | `r31-base-3` | 06/1957 | 544/712/951 | 5,97 MB | 1,29 MB | 284 | -9 mil | -82 mil | 15 | 62/38 | 3 | 9 | 0 | 1955: 101 mil · 1956: 196 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1331/1798/2140 | 10,39 MB | 2,08 MB | 283 | 144 mil | 4,06 mi | 17 | 58/42 | 3 | 10 | 0 | 1990: 239 mil · 1991: 595 mil · 1992: 1,45 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 927/1212/1235 | 8,61 MB | 1,86 MB | 282 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1192/1690/1772 | 10,45 MB | 2,10 MB | 282 | 9 mil | 1,52 mi | 19 | 55/47 | 3 | 8 | 0 | 1990: 221 mil · 1991: 304 mil · 1992: 436 mil | não |
| 1990 | `r31-base-3` | 04/1991 | 925/1243/1458 | 8,61 MB | 1,85 MB | 284 | -17 mil | -135 mil | 14 | 37/35 | 4 | 9 | 0 | 1990: 76 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 1817/2761/3285 | 13,66 MB | 2,67 MB | 283 | 1,01 mi | 19,22 mi | 21 | 76/53 | 5 | 36 | 0 | 2012: 142 mil · 2013: 1,76 mi · 2014: 7,52 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1683/2411/2847 | 13,19 MB | 2,59 MB | 285 | 86 mil | 9,31 mi | 19 | 72/47 | 3 | 24 | 0 | 2012: 59 mil · 2013: 459 mil · 2014: 2,32 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1709/2292/2922 | 13,44 MB | 2,64 MB | 282 | 187 mil | 9,05 mi | 19 | 75/49 | 5 | 33 | 1 | 2012: 113 mil · 2013: 550 mil · 2014: 2,90 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1740/2695/3162 | 13,35 MB | 2,61 MB | 283 | 965 mil | 12,61 mi | 21 | 85/53 | 5 | 34 | 0 | 2012: 92 mil · 2013: 1,05 mi · 2014: 6,08 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2334/4151/4336 | 13,46 MB | 2,54 MB | 283 | 513 mil | 13,26 mi | 22 | 80/54 | 5 | 21 | 0 | 2030: 82 mil · 2031: 2,25 mi · 2032: 3,68 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 1837/2549/2877 | 13,09 MB | 2,50 MB | 283 | 100 mil | 5,87 mi | 19 | 71/47 | 3 | 13 | 0 | 2030: 49 mil · 2031: 646 mil · 2032: 1,62 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 1773/2515/2618 | 13,33 MB | 2,54 MB | 283 | 1,44 mi | 15,41 mi | 22 | 78/54 | 5 | 57 | 0 | 2030: 143 mil · 2031: 991 mil · 2032: 8,32 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1767/2417/3094 | 13,12 MB | 2,50 MB | 283 | 206 mil | 7,91 mi | 19 | 71/46 | 3 | 29 | 0 | 2030: 115 mil · 2031: 786 mil · 2032: 3,03 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 489.703 |
| `chron9` | 310.219 |
| `facts17` | 253.124 |
| `fame15` | 228.143 |
| `creation` | 151.222 |
| `st28` | 132.099 |
| `leisure14` | 126.352 |
| `relics9` | 116.078 |
| `deleg31` | 113.279 |
| `ag18` | 112.512 |
| `attn` | 111.109 |
| `fame16` | 97.219 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

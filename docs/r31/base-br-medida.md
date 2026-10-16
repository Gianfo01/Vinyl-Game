# Medição de referência — base-br (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 4 partidas em paralelo; tempo total 310 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 214 | 305 | 293 | 323 | 3,84 MB | 0,73 MB | 48 | 287 |
| 1955 | 4 | 310 | 814 | 815 | 789 | 6,47 MB | 1,28 MB | 97 | 288 |
| 1990 | 4 | 494 | 1.695 | 1.708 | 1.653 | 11,71 MB | 2,35 MB | 163 | 288 |
| 2012 | 4 | 758 | 2.496 | 2.486 | 2.436 | 15,20 MB | 3,01 MB | 242 | 289 |
| 2030 | 4 | 1.264 | 2.928 | 2.820 | 2.841 | 14,79 MB | 2,84 MB | 218 | 288 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 128 mil | 4,68 mi | 32 | 3 | 1,65 mi | 0 |
| 1955 | 40 mil | 1,60 mi | 18 | 3 | 787 mil | 0 |
| 1990 | 25 mil | 1,59 mi | 20 | 3 | 673 mil | 0 |
| 2012 | 779 mil | 14,02 mi | 22 | 5 | 5,39 mi | 0 |
| 2030 | 329 mil | 12,34 mi | 21 | 5 | 4,50 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 302/402/541 | 3,65 MB | 0,70 MB | 288 | 4 mil | 2,41 mi | 33 | 31/82 | 3 | 20 | 22 | 1900: 41 mil · 1901: 308 mil · 1902: 699 mil | não |
| 1900 | `r31-base-1` | 01/1903 | 321/452/569 | 4,20 MB | 0,77 MB | 287 | 138 mil | 6,36 mi | 35 | 11/87 | 3 | 29 | 25 | 1900: 89 mil · 1901: 875 mil · 1902: 2,15 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 313/441/688 | 3,87 MB | 0,74 MB | 287 | 118 mil | 3,02 mi | 30 | 30/75 | 3 | 22 | 14 | 1900: 90 mil · 1901: 208 mil · 1902: 1,14 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 284/375/441 | 3,81 MB | 0,72 MB | 287 | 292 mil | 6,33 mi | 27 | 15/67 | 3 | 24 | 8 | 1900: 88 mil · 1901: 723 mil · 1902: 2,58 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 881/1175/1429 | 6,97 MB | 1,37 MB | 288 | 46 mil | 1,98 mi | 16 | 75/40 | 3 | 5 | 0 | 1955: 229 mil · 1956: 774 mil · 1957: 1,00 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 786/1173/1293 | 6,36 MB | 1,27 MB | 288 | 35 mil | 1,60 mi | 18 | 67/44 | 2 | 16 | 0 | 1955: 95 mil · 1956: 364 mil · 1957: 753 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 776/1151/1339 | 6,34 MB | 1,27 MB | 288 | 44 mil | 364 mil | 17 | 68/42 | 3 | 12 | 0 | 1955: 40 mil · 1956: 164 mil · 1957: 277 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 812/1061/1349 | 6,57 MB | 1,29 MB | 289 | 12 mil | 1,60 mi | 18 | 62/46 | 2 | 16 | 1 | 1955: 148 mil · 1956: 835 mil · 1957: 820 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1697/2291/2744 | 11,77 MB | 2,36 MB | 289 | 18 mil | 979 mil | 16 | 69/40 | 3 | 6 | 0 | 1990: 97 mil · 1991: 802 mil · 1992: 762 mil | não |
| 1990 | `r31-base-1` | 01/1993 | 1691/2201/2819 | 11,68 MB | 2,35 MB | 288 | 31 mil | 1,23 mi | 22 | 58/56 | 3 | 6 | 0 | 1990: 85 mil · 1991: 283 mil · 1992: 462 mil | não |
| 1990 | `r31-base-2` | 01/1993 | 1678/2517/2910 | 11,61 MB | 2,33 MB | 288 | 79 mil | 1,96 mi | 20 | 48/50 | 3 | 10 | 0 | 1990: 137 mil · 1991: 339 mil · 1992: 585 mil | não |
| 1990 | `r31-base-3` | 01/1993 | 1712/2242/2800 | 11,74 MB | 2,35 MB | 288 | -47 mil | 6,32 mi | 20 | 50/50 | 3 | 21 | 0 | 1990: 77 mil · 1991: 698 mil · 1992: 2,25 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 2608/3517/4111 | 15,57 MB | 3,04 MB | 289 | 1,19 mi | 19,95 mi | 24 | 78/59 | 5 | 25 | 0 | 2012: 113 mil · 2013: 1,50 mi · 2014: 8,13 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 2351/3085/3890 | 15,15 MB | 2,98 MB | 289 | 364 mil | 14,23 mi | 22 | 71/54 | 5 | 29 | 0 | 2012: 73 mil · 2013: 686 mil · 2014: 3,80 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2522/3278/3817 | 15,22 MB | 3,02 MB | 289 | 179 mil | 13,80 mi | 22 | 71/54 | 3 | 20 | 3 | 2012: 85 mil · 2013: 627 mil · 2014: 3,27 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2502/3192/4168 | 15,18 MB | 3,00 MB | 288 | 1,34 mi | 11,88 mi | 20 | 83/50 | 5 | 29 | 1 | 2012: 114 mil · 2013: 868 mil · 2014: 6,97 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 3025/3700/5038 | 15,29 MB | 2,90 MB | 288 | 676 mil | 16,01 mi | 20 | 81/50 | 5 | 43 | 0 | 2030: 36 mil · 2031: 2,63 mi · 2032: 4,62 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2894/3620/4723 | 14,77 MB | 2,83 MB | 289 | 463 mil | 12,02 mi | 21 | 74/52 | 5 | 30 | 0 | 2030: 79 mil · 2031: 1,05 mi · 2032: 4,47 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2869/3586/4029 | 14,68 MB | 2,82 MB | 288 | 195 mil | 12,65 mi | 17 | 75/42 | 4 | 19 | 0 | 2030: 135 mil · 2031: 943 mil · 2032: 4,52 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2923/3787/4183 | 14,80 MB | 2,84 MB | 288 | 196 mil | 7,64 mi | 22 | 74/54 | 5 | 34 | 0 | 2030: 50 mil · 2031: 929 mil · 2032: 3,04 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 494.601 |
| `chron9` | 343.961 |
| `fame15` | 268.282 |
| `facts17` | 235.742 |
| `creation` | 181.517 |
| `ag18` | 128.849 |
| `st28` | 125.646 |
| `leisure14` | 123.697 |
| `relics9` | 116.868 |
| `attn` | 116.000 |
| `festivals` | 100.085 |
| `fame16` | 98.184 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

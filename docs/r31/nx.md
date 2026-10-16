# R31 · onda 4 — N (Extras) e X (Nomes e obras reais): resumo da medição

Medição: `npx tsx scripts/r31/measure.ts --out docs/r31/nx` (tudo ligado) e `--out docs/r31/nx-off --sw fic31=false,pop31.freq=0,extras31=false`
(N desligado), 4 sementes × 5 épocas × 36 meses, comparadas com `docs/r31/base30.json`. Médias por época (US$ 2020):

| início | base30 patrimônio | N desligado | N ligado | fama (base30 / desl. / lig.) |
|---|---|---|---|---|
| 1900 | 1.590.741 | 4.354.139 | 4.354.139 | 26 / 28 / 28 |
| 1955 | 697.650 | 299.113 | 1.089.029 | 16 / 17 / 18 |
| 1990 | 2.866.543 | 1.327.466 | 2.085.966 | 18 / 16 / 18 |
| 2012 | 11.852.653 | 12.545.368 | 11.062.872 | 19 / 20 / 19 |
| 2030 | 10.647.026 | 10.611.778 | 8.124.921 | 20 / 21 / 19 |

O que mudou e por quê:
- **X não mexe em número nenhum**: o interruptor "Nomes e obras reais" é só exibição (o padrão da Nova partida não mudou).
- **Cultura pop, memes, bolhas e fracassos** são só notícia; Arara, filme e token só agem por botão do jogador (o robô não usa).
  Com só esses ligados os goldens r27-p2a/p2b ficam iguais (conferido).
- **Bandas de ficção no mundo (`fic31`)** são atos novos: em 1900 nada muda (a primeira história é de 1937); a partir de 1955
  entram 3–10 atos por partida (~22 a mais no mundo, média 959 → 982) e a trajetória do robô muda — para cima em 1955/1990,
  para baixo em 2012/2030 (2030: as bandas de anime/K-pop de 2015–25 entram de uma vez no começo e disputam as paradas).
  Diferenças do tamanho do ruído entre sementes; a fama média fica igual (±1). Desempenho por mês igual dentro do ruído da máquina.
- Diferença "N desligado × base30": mudanças das ondas 1–4 já juntadas no ramo, não deste item.

---

# Medição de referência — nx (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 527 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 186 | 311 | 303 | 341 | 3,72 MB | 0,72 MB | 60 | 282 |
| 1955 | 4 | 292 | 732 | 720 | 798 | 6,05 MB | 1,20 MB | 101 | 282 |
| 1990 | 4 | 469 | 1.702 | 1.690 | 1.811 | 10,49 MB | 2,10 MB | 217 | 282 |
| 2012 | 4 | 489 | 2.145 | 2.049 | 2.453 | 13,46 MB | 2,63 MB | 296 | 284 |
| 2030 | 4 | 748 | 2.311 | 2.053 | 2.887 | 13,21 MB | 2,52 MB | 198 | 283 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 176 mil | 4,42 mi | 28 | 3 | 1,74 mi | 0 |
| 1955 | 13 mil | 1,04 mi | 18 | 3 | 551 mil | 1 |
| 1990 | -15 mil | 2,19 mi | 18 | 3 | 867 mil | 0 |
| 2012 | 366 mil | 9,33 mi | 19 | 5 | 3,99 mi | 0 |
| 2030 | 221 mil | 8,33 mi | 20 | 4 | 3,13 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 304/434/592 | 3,67 MB | 0,71 MB | 282 | 216 mil | 5,00 mi | 32 | 25/79 | 3 | 23 | 19 | 1900: 61 mil · 1901: 675 mil · 1902: 2,02 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 303/460/628 | 3,85 MB | 0,74 MB | 282 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 318/414/601 | 3,64 MB | 0,72 MB | 281 | 191 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 977 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 317/449/573 | 3,77 MB | 0,71 MB | 281 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 858/1253/1497 | 6,20 MB | 1,23 MB | 282 | 25 mil | 1,15 mi | 16 | 66/41 | 2 | 7 | 0 | 1955: 165 mil · 1956: 212 mil · 1957: 544 mil | não |
| 1955 | `r31-base-1` | 01/1958 | 722/976/1097 | 6,01 MB | 1,19 MB | 282 | -0 mil | 939 mil | 23 | 69/58 | 3 | 13 | 0 | 1955: 105 mil · 1956: 334 mil · 1957: 559 mil | não |
| 1955 | `r31-base-2` | 10/1956 | 575/794/885 | 5,29 MB | 1,15 MB | 282 | -17 mil | -126 mil | 14 | 56/34 | 3 | 11 | 0 | 1955: 57 mil | insolvency |
| 1955 | `r31-base-3` | 01/1958 | 707/1034/1226 | 6,10 MB | 1,21 MB | 284 | 219 mil | 2,40 mi | 19 | 62/48 | 3 | 21 | 1 | 1955: 98 mil · 1956: 475 mil · 1957: 1,20 mi | não |
| 1990 | `r31-base-0` | 01/1993 | 1752/2412/2563 | 10,49 MB | 2,10 MB | 284 | 58 mil | 960 mil | 17 | 61/43 | 3 | 8 | 0 | 1990: 203 mil · 1991: 546 mil · 1992: 553 mil | não |
| 1990 | `r31-base-1` | 01/1993 | 1824/2545/3391 | 10,49 MB | 2,10 MB | 282 | -22 mil | 3,01 mi | 17 | 50/44 | 3 | 25 | 0 | 1990: 176 mil · 1991: 281 mil · 1992: 1,02 mi | não |
| 1990 | `r31-base-2` | 01/1993 | 1625/2448/2652 | 10,57 MB | 2,12 MB | 282 | -10 mil | 2,60 mi | 19 | 48/48 | 3 | 16 | 0 | 1990: 133 mil · 1991: 315 mil · 1992: 1,03 mi | não |
| 1990 | `r31-base-3` | 01/1993 | 1608/2296/2574 | 10,42 MB | 2,09 MB | 282 | -19 mil | 1,77 mi | 18 | 41/46 | 3 | 21 | 0 | 1990: 137 mil · 1991: 278 mil · 1992: 715 mil | não |
| 2012 | `r31-base-0` | 01/2015 | 2129/3105/5113 | 13,69 MB | 2,68 MB | 284 | 530 mil | 20,13 mi | 19 | 81/48 | 5 | 31 | 0 | 2012: 87 mil · 2013: 1,41 mi · 2014: 6,45 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 2093/3245/3506 | 13,15 MB | 2,59 MB | 284 | 75 mil | 5,46 mi | 19 | 67/47 | 3 | 22 | 1 | 2012: 72 mil · 2013: 450 mil · 2014: 1,53 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2096/2945/3506 | 13,45 MB | 2,64 MB | 283 | 203 mil | 8,77 mi | 19 | 74/48 | 5 | 30 | 1 | 2012: 112 mil · 2013: 550 mil · 2014: 3,39 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2264/3784/5380 | 13,46 MB | 2,62 MB | 282 | 549 mil | 9,89 mi | 20 | 80/49 | 5 | 33 | 0 | 2012: 154 mil · 2013: 962 mil · 2014: 4,59 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2045/2922/3972 | 13,04 MB | 2,49 MB | 283 | -46 mil | 3,23 mi | 17 | 70/43 | 3 | 18 | 0 | 2030: 28 mil · 2031: 268 mil · 2032: 1,24 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2120/3127/3704 | 13,16 MB | 2,51 MB | 282 | 101 mil | 4,86 mi | 19 | 68/49 | 3 | 25 | 0 | 2030: 85 mil · 2031: 655 mil · 2032: 1,70 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2041/2663/3461 | 13,25 MB | 2,53 MB | 283 | 414 mil | 11,81 mi | 20 | 83/51 | 5 | 65 | 0 | 2030: 71 mil · 2031: 1,16 mi · 2032: 4,55 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 3040/5316/6161 | 13,43 MB | 2,56 MB | 283 | 342 mil | 12,60 mi | 20 | 70/51 | 5 | 34 | 0 | 2030: 65 mil · 2031: 1,83 mi · 2032: 5,54 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 489.497 |
| `chron9` | 313.520 |
| `facts17` | 253.371 |
| `fame15` | 226.547 |
| `creation` | 155.093 |
| `leisure14` | 129.045 |
| `st28` | 126.278 |
| `ag18` | 121.625 |
| `relics9` | 115.801 |
| `deleg31` | 109.684 |
| `attn` | 107.828 |
| `fame16` | 96.623 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

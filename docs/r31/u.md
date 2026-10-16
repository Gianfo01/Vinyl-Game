# Onda 3 · U (Facções por país) — medição

`npx tsx scripts/r31/measure.ts --out docs/r31/u --label u` (ligado) e `… --sw u31=false --out docs/r31/u-off`
(interruptor `u31` desligado). 4 sementes × 5 eras × 36 meses.

| soma das 20 partidas | base30 (versão 30) | U ligado | U desligado |
|---|---|---|---|
| caixa (US$ 2020) | 3 402 127 | 4 718 367 | 4 718 367 |
| patrimônio (US$ 2020) | 110 618 448 | 117 438 274 | 117 438 274 |
| fama / atos / lançamentos / nº 1 | 395 / 65 / 364 / 45 | 401 / 69 / 433 / 51 | 401 / 69 / 433 / 51 |
| save JSON (bytes) | 174 955 627 | 185 746 265 | 185 704 322 |
| save gzip (bytes) | 34 429 972 | 36 612 099 | 36 593 256 |

- **Ligado × desligado: 0 diferença nos números de jogo.** O robô não contrata facções; as novas facções ficam fora da
  lista padrão `orgs17(s)` (NPCs, mapa, crimenpc17, aff29npc e crimemem23 não as veem); a expansão anual só mexe no
  estado próprio (`x4.fac31`, fluxo rng19 `fac31`) e em fatos raros (abertura de operação, guerra). A regra nova
  (presença por país, intermediário com custo maior, prazo, falha e traição) só age com ação do jogador.
- A diferença para a base30 vem das ondas 0–3 já juntadas (não desta frente). Goldens r27-p2a, r27-p2b, r27-m3 e
  r16-playbot iguais.
- Save: +42 KB nas 20 partidas (≈ +2 KB por partida, +0,02%): operações, crescimento e crônica das facções.
- Tempo por mês: dentro do ruído entre as duas rodadas; `orgs17` ganhou memória por partida porque a lista completa
  passou de ~30 para ~280 facções.

# Medição de referência — u (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.10GHz (4 núcleos), Node v22.22.0, 4 partidas em paralelo; tempo total 247 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 205 | 306 | 295 | 317 | 3,85 MB | 0,73 MB | 55 | 273 |
| 1955 | 4 | 295 | 640 | 661 | 630 | 5,99 MB | 1,24 MB | 60 | 273 |
| 1990 | 4 | 508 | 1.382 | 1.392 | 1.334 | 10,47 MB | 2,09 MB | 136 | 273 |
| 2012 | 4 | 699 | 2.097 | 2.003 | 2.029 | 13,38 MB | 2,62 MB | 192 | 275 |
| 2030 | 4 | 1.300 | 2.373 | 2.295 | 2.281 | 13,14 MB | 2,51 MB | 213 | 274 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 102 mil | 4,58 mi | 29 | 3 | 1,82 mi | 0 |
| 1955 | -10 mil | 206 mil | 16 | 2 | 199 mil | 2 |
| 1990 | -13 mil | 2,68 mi | 18 | 3 | 1,11 mi | 1 |
| 2012 | 644 mil | 13,32 mi | 20 | 5 | 5,42 mi | 0 |
| 2030 | 219 mil | 6,51 mi | 19 | 4 | 2,28 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 356/538/584 | 3,74 MB | 0,72 MB | 273 | 128 mil | 4,45 mi | 31 | 27/76 | 3 | 23 | 16 | 1900: 58 mil · 1901: 756 mil · 1902: 1,78 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 305/382/534 | 3,94 MB | 0,74 MB | 273 | 45 mil | 2,87 mi | 24 | 23/61 | 3 | 19 | 10 | 1900: 91 mil · 1901: 451 mil · 1902: 896 mil | não |
| 1900 | `r31-base-2` | 01/1903 | 321/434/470 | 3,92 MB | 0,74 MB | 272 | 76 mil | 4,71 mi | 28 | 14/69 | 3 | 28 | 10 | 1900: 108 mil · 1901: 355 mil · 1902: 1,85 mi | não |
| 1900 | `r31-base-3` | 01/1903 | 240/319/425 | 3,79 MB | 0,71 MB | 272 | 220 mil | 6,34 mi | 30 | 18/75 | 3 | 25 | 13 | 1900: 111 mil · 1901: 836 mil · 1902: 2,25 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 743/981/1301 | 6,45 MB | 1,26 MB | 273 | 34 mil | 4,02 mi | 18 | 64/46 | 3 | 16 | 0 | 1955: 140 mil · 1956: 666 mil · 1957: 1,77 mi | não |
| 1955 | `r31-base-1` | 01/1958 | 617/807/912 | 5,71 MB | 1,13 MB | 273 | -18 mil | 481 mil | 16 | 62/41 | 2 | 9 | 0 | 1955: 82 mil · 1956: 170 mil · 1957: 272 mil | não |
| 1955 | `r31-base-2` | 11/1956 | 554/704/920 | 5,51 MB | 1,21 MB | 273 | -24 mil | -126 mil | 14 | 58/35 | 2 | 6 | 0 | 1955: 55 mil | insolvency |
| 1955 | `r31-base-3` | 08/1957 | 609/795/1503 | 6,28 MB | 1,37 MB | 275 | -1 mil | -70 mil | 15 | 59/38 | 2 | 7 | 1 | 1955: 84 mil · 1956: 126 mil | insolvency |
| 1990 | `r31-base-0` | 01/1993 | 1388/1832/1886 | 10,39 MB | 2,08 MB | 275 | -18 mil | 1,66 mi | 17 | 64/44 | 3 | 18 | 0 | 1990: 217 mil · 1991: 552 mil · 1992: 666 mil | não |
| 1990 | `r31-base-1` | 03/1991 | 1090/1547/1824 | 8,57 MB | 1,85 MB | 273 | -20 mil | -135 mil | 14 | 38/36 | 4 | 12 | 0 | 1990: 92 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1487/1974/2482 | 10,57 MB | 2,13 MB | 273 | -8 mil | 3,70 mi | 19 | 56/47 | 3 | 17 | 0 | 1990: 220 mil · 1991: 323 mil · 1992: 1,56 mi | não |
| 1990 | `r31-base-3` | 01/1993 | 1384/2064/2805 | 10,55 MB | 2,10 MB | 273 | 32 mil | 6,60 mi | 19 | 60/47 | 2 | 13 | 0 | 1990: 326 mil · 1991: 731 mil · 1992: 2,32 mi | não |
| 2012 | `r31-base-0` | 01/2015 | 2067/2694/3100 | 13,44 MB | 2,64 MB | 275 | 901 mil | 16,45 mi | 20 | 78/51 | 5 | 37 | 1 | 2012: 136 mil · 2013: 1,23 mi · 2014: 5,69 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1969/2422/3948 | 13,14 MB | 2,59 MB | 275 | 318 mil | 12,34 mi | 19 | 76/48 | 5 | 28 | 0 | 2012: 67 mil · 2013: 371 mil · 2014: 2,99 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2309/4472/5596 | 13,64 MB | 2,67 MB | 274 | 773 mil | 14,30 mi | 19 | 71/48 | 5 | 26 | 0 | 2012: 99 mil · 2013: 979 mil · 2014: 6,47 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2042/2703/3577 | 13,32 MB | 2,60 MB | 274 | 515 mil | 9,30 mi | 20 | 81/51 | 5 | 36 | 0 | 2012: 85 mil · 2013: 989 mil · 2014: 5,14 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2246/2706/3346 | 12,99 MB | 2,47 MB | 273 | 197 mil | 6,47 mi | 18 | 76/45 | 3 | 21 | 0 | 2030: 69 mil · 2031: 300 mil · 2032: 1,72 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2279/3143/3214 | 12,99 MB | 2,48 MB | 274 | 29 mil | 3,96 mi | 19 | 69/46 | 3 | 21 | 0 | 2030: 67 mil · 2031: 501 mil · 2032: 1,40 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2464/3252/3667 | 13,53 MB | 2,57 MB | 274 | 1,30 mi | 13,56 mi | 22 | 81/54 | 5 | 33 | 0 | 2030: 136 mil · 2031: 1,55 mi · 2032: 7,68 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 2505/3269/4302 | 13,29 MB | 2,54 MB | 274 | 242 mil | 6,55 mi | 19 | 68/47 | 5 | 38 | 0 | 2030: 101 mil · 2031: 821 mil · 2032: 2,84 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 487.198 |
| `chron9` | 316.892 |
| `facts17` | 246.803 |
| `fame15` | 224.589 |
| `creation` | 155.679 |
| `st28` | 127.294 |
| `leisure14` | 127.178 |
| `relics9` | 116.213 |
| `ag18` | 114.758 |
| `attn` | 110.474 |
| `fame16` | 96.179 |
| `deleg31` | 95.465 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

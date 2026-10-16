# R31 · onda 4 · VIT (vitrine do mês) — resumo e medição

## O que mudou para quem joga

- **Cada lugar tem novidades todo mês**, como a loja de instrumentos já tinha.
  - O conteúdo é sorteado na virada do mês, no motor, e muda com a época, o país, o porte da cidade e o que aconteceu no
    mundo.
  - O jogo inteiro tem uma fonte só: a loja de instrumentos, o beco e os leilões passaram a girar pelo mesmo motor.
- **Prateleira do mês desenhada no interior.** Cada item é clicável, com o motivo do bloqueio antes do clique. Também há
  "Ver como lista".
- **Gente da agenda aparece na cena:** cliente, olheiro rival, jornalista, empresário e executivo.
- **Loja de discos.** Ganhou a feira dos fundos da época: 78 rpm, sebo, fitas, brechó de CDs ou vinil.
- **Aeroporto e casa de leilões.** Ganharam a faixa "Vitrine do mês".
- A tabela completa por lugar está em [vitrine.md](vitrine.md).

## Medição

Comando: `npx tsx scripts/r31/measure.ts --jobs 3 --out docs/r31/vit --label vit` e o mesmo com `--sw vit31=false`
(`vit-off.md`). O desligado é aplicado logo depois de criar a partida, então o sorteio da nova partida já aconteceu.

| Era | Caixa mediana US$ 2020 (ligado / desligado) | Partidas que mudam | ms/mês ligado / desligado | Save |
|---|---|---|---|---|
| 1900 | 129 mil / 129 mil | 0 de 4 | 262 / 265 | igual (+1 KB) |
| 1955 | 16 mil / 16 mil | 0 de 4 | 650 / 633 | igual (+1 KB) |
| 1990 | −18 mil / −18 mil | 0 de 4 | 1.272 / 1.164 | igual (+1 KB) |
| 2012 | 415 mil / 415 mil | 4 de 4 (caixa −3% a +4% por partida) | 1.868 / 1.778 | igual (+1 KB) |
| 2030 | 454 mil / 455 mil | 3 de 4 (caixa < ±1%) | 2.072 / 1.980 | igual |

**Por quê.**

- **O robô não compra nada da vitrine.** Nas partidas, só pesam duas coisas:
  - a regra passiva, o prejuízo da fita pirata do seu disco quando ele está no top 15;
  - as ofertas novas no registro de objetos, que mudam detalhes do patrimônio.
- **Antes de 1990 nada mudou.** O robô não emplaca disco no top 15 nesses 36 meses.
- **Em 2012 e 2030 o efeito é pequeno**, de poucos mil dólares por ano.
- **Uma partida de 2012 mudou mais no patrimônio** (`r31-base-0`: 11,6 → 13,7 mi). O efeito borboleta de uma semana de
  caixa diferente mudou uma compra de negócio do robô; o caixa ficou igual a menos de 1%.
- **O save cresce cerca de 1 KB** (referências, nunca cópias).
- **O mês fica cerca de 5% mais lento**, perto do ruído: 9 lugares × até 5 itens, com leitura de candidatos.

Com `vit31` desligado por padrão, os goldens r27-p2a, r27-p2b, r27-m3 e r16-playbot voltam exatamente aos valores
antigos. Ligado, só muda o retrato do sorteio (fluxo novo `vit31`).

---

# Medição de referência — vit (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 3 partidas em paralelo; tempo total 289 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 162 | 262 | 264 | 322 | 3,78 MB | 0,72 MB | 36 | 287 |
| 1955 | 4 | 271 | 650 | 662 | 729 | 6,08 MB | 1,20 MB | 69 | 288 |
| 1990 | 4 | 396 | 1.272 | 1.274 | 1.422 | 9,61 MB | 1,99 MB | 123 | 288 |
| 2012 | 4 | 578 | 1.868 | 1.875 | 2.093 | 13,41 MB | 2,63 MB | 422 | 288 |
| 2030 | 4 | 929 | 2.072 | 2.054 | 2.408 | 13,42 MB | 2,55 MB | 368 | 288 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 129 mil | 4,82 mi | 28 | 3 | 1,83 mi | 0 |
| 1955 | 16 mil | 647 mil | 17 | 3 | 413 mil | 0 |
| 1990 | -18 mil | 1,20 mi | 16 | 4 | 551 mil | 2 |
| 2012 | 415 mil | 13,63 mi | 22 | 5 | 3,82 mi | 0 |
| 2030 | 454 mil | 8,29 mi | 21 | 5 | 3,50 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 275/358/440 | 3,77 MB | 0,72 MB | 287 | 98 mil | 6,26 mi | 32 | 25/81 | 3 | 23 | 19 | 1900: 66 mil · 1901: 601 mil · 1902: 2,20 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 268/366/592 | 3,88 MB | 0,74 MB | 287 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 263/354/505 | 3,67 MB | 0,72 MB | 286 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 243/374/424 | 3,80 MB | 0,72 MB | 286 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 697/859/1080 | 6,16 MB | 1,22 MB | 287 | 31 mil | 222 mil | 15 | 61/37 | 2 | 4 | 0 | 1955: 130 mil · 1956: 229 mil · 1957: 198 mil | não |
| 1955 | `r31-base-1` | 01/1958 | 643/907/975 | 5,94 MB | 1,18 MB | 287 | -34 mil | 1,91 mi | 19 | 62/48 | 3 | 20 | 0 | 1955: 62 mil · 1956: 280 mil · 1957: 824 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 644/849/983 | 6,08 MB | 1,21 MB | 288 | 1 mil | 347 mil | 18 | 71/44 | 3 | 13 | 0 | 1955: 57 mil · 1956: 271 mil · 1957: 285 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 616/855/1100 | 6,08 MB | 1,20 MB | 289 | 78 mil | 946 mil | 16 | 59/39 | 2 | 14 | 0 | 1955: 102 mil · 1956: 123 mil · 1957: 541 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1425/1779/2216 | 10,46 MB | 2,09 MB | 288 | -25 mil | 2,54 mi | 18 | 57/44 | 3 | 18 | 0 | 1990: 239 mil · 1991: 340 mil · 1992: 1,04 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 988/1253/1506 | 8,63 MB | 1,86 MB | 287 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1334/1840/2047 | 10,50 MB | 2,10 MB | 287 | 86 mil | 2,69 mi | 16 | 54/40 | 3 | 22 | 0 | 1990: 220 mil · 1991: 324 mil · 1992: 1,01 mi | não |
| 1990 | `r31-base-3` | 04/1991 | 1023/1350/1617 | 8,75 MB | 1,89 MB | 289 | -16 mil | -134 mil | 14 | 37/35 | 4 | 9 | 0 | 1990: 76 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 1853/2464/2834 | 13,17 MB | 2,59 MB | 288 | 500 mil | 13,70 mi | 22 | 76/56 | 5 | 27 | 0 | 2012: 104 mil · 2013: 546 mil · 2014: 3,74 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1791/2421/2999 | 13,31 MB | 2,62 MB | 289 | 120 mil | 9,21 mi | 18 | 71/44 | 3 | 17 | 0 | 2012: 61 mil · 2013: 420 mil · 2014: 2,39 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 1908/2555/3370 | 13,53 MB | 2,66 MB | 287 | 331 mil | 13,56 mi | 21 | 70/52 | 5 | 28 | 2 | 2012: 113 mil · 2013: 575 mil · 2014: 3,90 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 1919/2591/2931 | 13,51 MB | 2,64 MB | 288 | 1,33 mi | 18,02 mi | 22 | 81/55 | 5 | 22 | 1 | 2012: 92 mil · 2013: 1,49 mi · 2014: 7,64 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2144/2818/3282 | 13,61 MB | 2,58 MB | 288 | 411 mil | 8,52 mi | 21 | 84/54 | 5 | 33 | 0 | 2030: 82 mil · 2031: 3,43 mi · 2032: 3,67 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2141/2743/3530 | 13,25 MB | 2,52 MB | 289 | 99 mil | 5,51 mi | 22 | 68/54 | 5 | 34 | 0 | 2030: 49 mil · 2031: 831 mil · 2032: 2,80 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2136/2823/3034 | 13,59 MB | 2,59 MB | 288 | 1,07 mi | 12,65 mi | 21 | 82/52 | 5 | 59 | 0 | 2030: 138 mil · 2031: 1,50 mi · 2032: 7,52 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1868/2616/2886 | 13,13 MB | 2,50 MB | 288 | 496 mil | 8,06 mi | 21 | 76/53 | 5 | 31 | 0 | 2030: 112 mil · 2031: 887 mil · 2032: 3,33 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 491.097 |
| `chron9` | 313.725 |
| `facts17` | 250.926 |
| `fame15` | 228.258 |
| `creation` | 150.465 |
| `leisure14` | 129.493 |
| `st28` | 128.215 |
| `ag18` | 120.116 |
| `attn` | 116.776 |
| `relics9` | 115.979 |
| `deleg31` | 108.326 |
| `fame16` | 95.833 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

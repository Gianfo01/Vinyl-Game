# LOTE (onda 4) — registro de lotes da cidade: resumo da medição

**O que mudou para o jogador:** quase todo prédio do mapa "Nosso mundo" tem função: é um negócio que já existe (lugares do
bairro, lugares reais e lojas da época da frente H, festival do mês), um terreno à venda ou seu (placa "VENDE-SE"/"SEU" com
preço e motivo de bloqueio), ou a casa de quem mora na cidade (CEO de gravadora, artista, família Fossati em São Paulo), com
interior em pixel art (apartamento → casa → mansão) e as ações que já existem (conhecer, pôr no radar, negociar em particular).
O botão "Funções" marca a função de cada prédio e mostra a cobertura.

**Cobertura (teste `r31-lotes`, 4 cidades × 4 épocas, depois de 1 mês):** 100% em Nova York, São Paulo, Londres e Rio em 1925,
1975, 2012 e 2036 com `lots31` ligado; desligado: 88–100% (o mapa da frente H já transforma a maioria dos prédios genéricos em
lojas da época; o que sobra são prédios de moradia genéricos, que viram as casas).

**Números (ligado × desligado, `--sw lots31=false`, 4 sementes × 5 eras × 36 meses):** caixa, patrimônio, fama, atos,
lançamentos, nº 1, receita e partidas encerradas **idênticos nas 20 partidas** — o robô não compra terreno, e as casas não mexem
em dinheiro. Só o save cresce ~1 KB (estado `x4.lots31`: moradores e registro de mudanças). A regra econômica (compra de terreno
como investimento, bem sem depreciação no balanço, obra em terreno seu a 85%) só age quando o jogador compra; está atrás do
interruptor e coberta por teste (`r31-lotes`: compra, transação atribuída `lot31:<lote>`, bem, placa "SEU").

Arquivos: `lote.json`/`lote.md` (ligado), `lote-off.json`/`lote-off.md` (desligado).

---

# Medição de referência — lote (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 2 partidas em paralelo; tempo total 470 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 168 | 290 | 295 | 363 | 3,78 MB | 0,72 MB | 47 | 285 |
| 1955 | 4 | 265 | 725 | 741 | 806 | 6,07 MB | 1,20 MB | 80 | 286 |
| 1990 | 4 | 466 | 1.491 | 1.420 | 1.609 | 9,60 MB | 1,99 MB | 209 | 286 |
| 2012 | 4 | 490 | 2.046 | 2.022 | 2.247 | 13,40 MB | 2,63 MB | 387 | 286 |
| 2030 | 4 | 748 | 2.195 | 2.064 | 2.572 | 13,41 MB | 2,55 MB | 267 | 286 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 129 mil | 4,82 mi | 28 | 3 | 1,83 mi | 0 |
| 1955 | 16 mil | 647 mil | 17 | 3 | 413 mil | 0 |
| 1990 | -18 mil | 1,20 mi | 16 | 4 | 551 mil | 2 |
| 2012 | 415 mil | 12,57 mi | 22 | 5 | 3,73 mi | 0 |
| 2030 | 455 mil | 8,29 mi | 21 | 5 | 3,50 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 273/384/479 | 3,76 MB | 0,72 MB | 285 | 98 mil | 6,26 mi | 32 | 25/81 | 3 | 23 | 19 | 1900: 66 mil · 1901: 601 mil · 1902: 2,20 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 282/385/650 | 3,87 MB | 0,74 MB | 285 | 78 mil | 3,84 mi | 27 | 19/66 | 3 | 21 | 9 | 1900: 88 mil · 1901: 295 mil · 1902: 1,46 mi | não |
| 1900 | `r31-base-2` | 01/1903 | 305/384/562 | 3,66 MB | 0,72 MB | 284 | 194 mil | 2,78 mi | 26 | 31/66 | 3 | 18 | 8 | 1900: 102 mil · 1901: 210 mil · 1902: 976 mil | não |
| 1900 | `r31-base-3` | 01/1903 | 302/442/497 | 3,80 MB | 0,72 MB | 284 | 161 mil | 5,80 mi | 28 | 20/69 | 3 | 17 | 11 | 1900: 111 mil · 1901: 903 mil · 1902: 2,30 mi | não |
| 1955 | `r31-base-0` | 01/1958 | 759/1050/1421 | 6,15 MB | 1,21 MB | 285 | 31 mil | 222 mil | 15 | 61/37 | 2 | 4 | 0 | 1955: 130 mil · 1956: 229 mil · 1957: 198 mil | não |
| 1955 | `r31-base-1` | 01/1958 | 728/1028/1082 | 5,93 MB | 1,17 MB | 285 | -34 mil | 1,91 mi | 19 | 62/48 | 3 | 20 | 0 | 1955: 62 mil · 1956: 280 mil · 1957: 824 mil | não |
| 1955 | `r31-base-2` | 01/1958 | 702/881/1256 | 6,07 MB | 1,21 MB | 286 | 1 mil | 347 mil | 18 | 71/44 | 3 | 13 | 0 | 1955: 57 mil · 1956: 271 mil · 1957: 285 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 709/979/1121 | 6,07 MB | 1,19 MB | 287 | 78 mil | 946 mil | 16 | 59/39 | 2 | 14 | 0 | 1955: 102 mil · 1956: 123 mil · 1957: 541 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 1652/2173/3578 | 10,45 MB | 2,09 MB | 286 | -25 mil | 2,54 mi | 18 | 57/44 | 3 | 18 | 0 | 1990: 239 mil · 1991: 340 mil · 1992: 1,04 mi | não |
| 1990 | `r31-base-1` | 03/1991 | 1186/1547/1690 | 8,62 MB | 1,86 MB | 285 | -19 mil | -134 mil | 15 | 36/37 | 4 | 10 | 0 | 1990: 91 mil | insolvency |
| 1990 | `r31-base-2` | 01/1993 | 1604/2553/2745 | 10,49 MB | 2,10 MB | 285 | 86 mil | 2,69 mi | 16 | 54/40 | 3 | 22 | 0 | 1990: 220 mil · 1991: 324 mil · 1992: 1,01 mi | não |
| 1990 | `r31-base-3` | 04/1991 | 1116/1463/1680 | 8,74 MB | 1,88 MB | 287 | -16 mil | -134 mil | 14 | 37/35 | 4 | 9 | 0 | 1990: 76 mil | insolvency |
| 2012 | `r31-base-0` | 01/2015 | 2011/2810/4542 | 13,25 MB | 2,61 MB | 286 | 495 mil | 11,59 mi | 22 | 77/55 | 5 | 27 | 0 | 2012: 104 mil · 2013: 546 mil · 2014: 3,57 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 1936/2439/4090 | 13,30 MB | 2,61 MB | 287 | 106 mil | 9,22 mi | 18 | 71/44 | 3 | 17 | 0 | 2012: 61 mil · 2013: 420 mil · 2014: 2,39 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 2126/2980/5338 | 13,52 MB | 2,66 MB | 285 | 335 mil | 13,56 mi | 21 | 70/52 | 5 | 28 | 2 | 2012: 113 mil · 2013: 575 mil · 2014: 3,90 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 2112/2958/3769 | 13,50 MB | 2,64 MB | 286 | 1,33 mi | 18,03 mi | 22 | 81/55 | 5 | 22 | 1 | 2012: 92 mil · 2013: 1,49 mi · 2014: 7,64 mi | não |
| 2030 | `r31-base-0` | 01/2033 | 2477/3229/4056 | 13,60 MB | 2,58 MB | 286 | 414 mil | 8,53 mi | 21 | 84/54 | 5 | 33 | 0 | 2030: 82 mil · 2031: 3,43 mi · 2032: 3,67 mi | não |
| 2030 | `r31-base-1` | 01/2033 | 2332/3387/4065 | 13,24 MB | 2,51 MB | 287 | 100 mil | 5,51 mi | 22 | 68/54 | 5 | 34 | 0 | 2030: 49 mil · 2031: 831 mil · 2032: 2,80 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 2000/2914/3380 | 13,59 MB | 2,59 MB | 286 | 1,07 mi | 12,65 mi | 21 | 82/52 | 5 | 59 | 0 | 2030: 138 mil · 2031: 1,50 mi · 2032: 7,52 mi | não |
| 2030 | `r31-base-3` | 01/2033 | 1969/3115/3458 | 13,12 MB | 2,50 MB | 286 | 496 mil | 8,06 mi | 21 | 76/53 | 5 | 31 | 0 | 2030: 112 mil · 2031: 887 mil · 2032: 3,33 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 491.097 |
| `chron9` | 313.503 |
| `facts17` | 250.926 |
| `fame15` | 228.260 |
| `creation` | 150.465 |
| `leisure14` | 129.493 |
| `st28` | 128.215 |
| `ag18` | 120.116 |
| `attn` | 116.776 |
| `relics9` | 115.976 |
| `deleg31` | 108.326 |
| `fame16` | 95.833 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

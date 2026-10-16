# Onda 3 · G (Objetos + UNI-3/B.18) — medição

`npx tsx scripts/r31/measure.ts --jobs 2 --out docs/r31/g --label g` (ligado) e
`R31_SW=objects31=false … --out docs/r31/g-off` (interruptor `objects31` desligado). 4 sementes × 5 eras × 36 meses.
`measure.ts` ganhou a variável `R31_SW` ("id=valor,…") para medir interruptores.

| soma das 20 partidas | base30 (versão 30) | G ligado | G desligado |
|---|---|---|---|
| caixa (US$ 2020) | 3 402 127 | 3 005 357 | 3 005 357 |
| patrimônio (US$ 2020) | 110 618 448 | 94 732 793 | 94 732 793 |
| fama / atos / lançamentos / nº 1 | 395 / 65 / 364 / 45 | 399 / 69 / 362 / 54 | 399 / 69 / 362 / 54 |
| save JSON (bytes) | 174 955 627 | 178 181 939 | 178 085 605 |
| save gzip (bytes) | 34 429 972 | 34 990 077 | 34 974 191 |

- **Ligado × desligado: 0 diferenças nos números de jogo.** O robô não compra na loja, não dá presentes e não negocia
  relíquias; níveis, arquivo e sincronia do objeto não sorteiam nada. A regra econômica nova (compras, presentes →
  opinião) só age com ação do jogador.
- A diferença para a base30 vem das ondas 0–2 já juntadas (não desta frente). Os goldens r27-p2a, r27-p2b, r27-m3 e
  r16-playbot continuam iguais com G.
- Save: +96 KB somando as 20 partidas (≈ +4,8 KB por partida, +0,05%) — estoque mensal da loja (11 exemplares com
  história) e objetos individuais das relíquias suas, em leilão ou fixas. Metadados das relíquias só mudaram de lugar
  (`rl.meta`); o arquivo compacto guarda as peças que antes eram descartadas no teto de 90.

# Onda 3 · Z (Família e base nova): medição

Comandos: `npx tsx scripts/r31/measure.ts --jobs 2 --out docs/r31/z --label z` (ligado) e
`R31_SW=fam31=false … --out docs/r31/z-off --label z-off` (interruptor `fam31` desligado). São 4 sementes × 5 eras × 36 meses,
no ramo principal já juntado (E, F e G) mais o Z. Os relatórios completos estão em `z.md` e `z-off.md`. Este resumo fica em
`z-resumo.md` porque `z.md` é o relatório que o script gera.

| soma das 20 partidas | base30 | G (antes de E/F/Z) | Z ligado | Z com `fam31` desligado |
|---|---:|---:|---:|---:|
| caixa (US$ 2020) | 3 402 127 | 3 005 357 | 3 417 876 | 3 417 876 |
| patrimônio (US$ 2020) | 110 618 448 | 94 732 793 | 125 149 942 | 125 149 942 |
| fama / atos / lançamentos / nº 1 | 395 / 65 / 364 / 45 | 399 / 69 / 362 / 54 | 383 / 68 / 419 / 45 | igual |
| receita do último ano (US$ 2020) | 37,6 mi | 36,0 mi | 46,6 mi | igual |
| pessoas / atos do mundo | 38 313 / 18 730 | 38 279 / 18 694 | 39 192 / 19 266 | igual |
| save JSON / gzip (bytes) | — | 178,2 mi / 34,99 mi | 182,5 mi / 35,84 mi | 182,5 mi / 35,84 mi |

- **Família ligada × desligada: nenhuma diferença nos números de jogo.** Os efeitos da família (almoço, lasanha,
  promoção, imprensa, escola de idiomas, Metalmac, voo, tênis) só acontecem por ação do jogador, e o robô não usa
  nenhuma delas. Os papéis por época e o violino não fazem sorteio. O save muda menos de 300 bytes em 182 MB: são
  os papéis da família e o estado `fam31`.
- **A base nova muda o mundo, como era esperado.** Ela traz 68 artistas reais no fim da lista e 28 relíquias reais. O
  mundo ganhou cerca de 570 atos e 900 pessoas nas 20 partidas. O robô lança mais (419 lançamentos contra 362 no G) e
  fatura mais no último ano. A comparação com a coluna G não isola o Z, porque E e F entraram no meio. O efeito do Z
  sozinho foi conferido nos valores de referência: com a base nova desligada, os números de r27-p2a e r27-p2b
  voltam a ser os mesmos de antes (ver `DECISOES.md`).
- Save: cerca de +4,3 MB somando as 20 partidas, ou +2,4%. Vem dos atos e das pessoas a mais e das relíquias reais novas.
- Desempenho: a média de ms/mês por era fica na mesma faixa do G (1900: 183 a 194; 2030: 1 613 a 1 712). A diferença
  está dentro da variação da máquina com dois agentes rodando ao mesmo tempo.

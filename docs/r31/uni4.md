# Onda 4 · UNI-4 (fusões grandes) — medição

`npx tsx scripts/r31/measure.ts --jobs 3 --out docs/r31/uni4 --label UNI-4-ligado` e
`… --out docs/r31/uni4-off --label UNI-4-desligado --sw uni4.links=false` (interruptor `uni4.links` desligado).
Ponto de partida: a integração da onda 4 sem esta frente (bd1631b), mesma medição (`pre-UNI-4`, igual ao AP ligado).
4 sementes × 5 eras × 36 meses. Tabelas completas em `uni4.json` / `uni4-off.json` (e `uni4-tabelas.md`, `uni4-off.md`).

| soma das 20 partidas | pré-UNI-4 | UNI-4 desligado | UNI-4 ligado |
|---|---|---|---|
| caixa (US$ 2020) | 5 170 811 | 3 499 783 | 4 416 200 |
| patrimônio (US$ 2020) | 117 816 158 | 109 023 533 | 115 312 356 |
| receita do último ano (US$ 2020) | 45 660 188 | 40 100 011 | 42 802 408 |
| fama / atos / lançamentos / nº 1 | 406 / 71 / 406 / 48 | 396 / 73 / 399 / 48 | 402 / 74 / 426 / 52 |
| partidas encerradas (insolvência) | 4 | 4 | 2 |
| save JSON (bytes) | 182 893 058 | 185 433 260 | 187 374 648 |
| save gzip (bytes) | 36 191 501 | 36 637 783 | 36 638 901 |
| CPU ms/mês (média) | 1 464 | 1 473 | 1 531 |

Receita do último ano por era (soma das 4 sementes, mi US$ 2020; pré × desligado × ligado): 1900 6,94 × 4,28 × 4,56 ·
1955 1,21 × 1,98 × 1,60 · 1990 2,05 × 1,13 × 2,27 · 2012 18,8 × 14,1 × 19,9 · 2030 16,7 × 18,6 × 14,5.

## O que mudou e por quê

- **A fusão em si (pré → desligado) não é neutra.** Juntar depósitos muda a trajetória do robô mesmo sem regra nova:
  a relação com a praça é uma só (o promotor da turnê roteada partia de 50 e o da cena de residência de 0; agora todos
  de 30 e cada sistema vê o que os outros fizeram), a satisfação do cliente de empresário virou a confiança da ficha
  (recebe os deltas dos dois lados), os shows avulsos e acordos viraram papéis da turnê e a ordem de carga dos módulos
  mudou a ordem dos ganchos do mês. Com 4 sementes, a variação de caixa e receita é dominada pelas partidas de 2012 e
  2030 (centenas de milhares de dólares de mês a mês nessas eras) — o sinal por era troca de lado (2030 sobe, 2012 cai),
  o que indica trajetória diferente, não uma tendência econômica.
- **As ligações novas (desligado → ligado)** devolvem quase todo o caixa e a receita: sua rádio toca seus discos
  (rotação conta nas paradas como qualquer estação), sua plataforma traz descoberta e o estilo em alta do estúdio passa
  a seguir as paradas. Mais lançamentos (426 × 399) e nº 1 (52 × 48), menos insolvências (2 × 4). Segredos da Intriga e
  trunfos do livro podendo vazar mexem em fama de atos do mundo (o robô não usa Intriga, efeito pequeno).
- **Save** ~2% maior: o depósito único de segredos guarda os dossiês, a Intriga e os trunfos do livro (antes os
  trunfos eram só texto no hold) e os shows avulsos ficam como turnês de 1 data. Os estados apagados (fest12, fest18,
  fest8, venue12, venues17, road27, rivals8/12, rivalmind18, rv27, rs28, manager11, campos de relação de cidade)
  compensam parte. **CPU** +4% (média ligada): sua rádio entra no mês da rádio e o filtro `tourList`.
- Goldens r27-p2a/p2b e a semente do r16-playbot re-medidos (DECISOES).

# Onda 3 · AP (Aparência e sex appeal) — medição

`npx tsx scripts/r31/measure.ts --jobs 2 --out docs/r31/ap --label AP-ligado` e
`… --out docs/r31/ap-off --label AP-desligado --sw look31=false` (interruptor `look31` desligado).
4 sementes × 5 eras × 36 meses. Tabelas completas em `ap.json` / `ap-off.json` (e `ap-off.md`).

| soma das 20 partidas | base30 (versão 30) | AP desligado (ponto de partida desta frente) | AP ligado |
|---|---|---|---|
| caixa (US$ 2020) | 3 402 127 | 4 938 053 | 5 170 811 |
| patrimônio (US$ 2020) | 110 618 448 | 115 269 324 | 117 816 158 |
| receita do último ano (US$ 2020) | 37 642 384 | 47 961 169 | 45 660 188 |
| fama / atos / lançamentos / nº 1 | 395 / 65 / 364 / 45 | 398 / 70 / 444 / 42 | 406 / 71 / 406 / 48 |
| partidas encerradas (insolvência) | 2 | 4 | 4 |
| save JSON (bytes) | 174 955 627 | 183 173 578 | 182 830 026 |
| save gzip (bytes) | 34 429 972 | 36 027 111 | 36 167 233 |
| CPU ms/mês (média das partidas) | — | 1 169 | 1 308 |

Por era (receita do último ano, soma das 4 sementes, ligado × desligado): 1900 6,94 mi × 6,39 mi (nº 1: 47 × 37) ·
1955 1,21 mi × 2,02 mi · 1990 2,05 mi × 2,11 mi · 2012 18,8 mi × 19,9 mi (nº 1: 1 × 4) · 2030 16,6 mi × 17,5 mi.

## O que mudou e por quê

- **A imagem deixou de ser fixa.** Antes, "Imagem e visual" era recalculada de palco, vaidade e um sorteio, igual a vida
  toda. Agora o mesmo número parte da mesma base, mas cai com a idade (a partir dos 35; menos para quem envelhece bem),
  com estresse, cansaço, burnout e vício, e sobe com forma e estilo. O robô nunca paga cuidados, então no balanço quase
  só aparece o lado que piora: elencos mais velhos e cansados (turnê) vendem um pouco menos onde o visual pesa (era da
  MTV e das redes; pop) — 2012 e 2030 perdem 5–6% de receita, 1990 3%.
- **Peso por gênero e público.** O peso da era agora é multiplicado pelo gênero (pop, latino, R&B, funk/Brasil muito;
  jazz e sacro pouco) e pela parcela de público casual. Em 1900 (peso pequeno, era da partitura) o efeito líquido foi
  positivo nesta amostra (+8% de receita, mais nº 1): o elenco jovem do robô tem imagem acima de 50 e o gênero de partida
  (rock, peso 1) somado ao público casual rende um pouco mais. 1955 caiu bastante numa semente que quebrou (insolvência)
  com o ligado e não com o desligado — e vice-versa noutra: o número de partidas encerradas é o mesmo (4 × 4); com 36
  meses e 4 sementes, uma partida que vira muda a soma da era.
- **Fora do apelo** (clipe/TV, marcas, merch, publicidade, entrevistas, valor do elenco na bolsa) o fator fica entre
  0,85 e 1,2 e o robô usa pouco esses caminhos; o valor de mercado dos selos rivais muda pouco (peso 0,5 no valor).
- **Acontecimentos**: no máximo um por mês (22%), só com elenco seu, sem tocar no fluxo `events` do diretor de
  histórias; o robô responde com a opção padrão.
- **Save:** só quem mudou é guardado (você e o seu elenco, poucos bytes por pessoa); a diferença de tamanho entre ligado
  e desligado (−0,2% JSON, +0,4% gzip) é do mundo que seguiu outro caminho, não do estado novo.
- **Desempenho:** +12% de CPU por mês nesta medição (máquina compartilhada com outro agente; ruído alto). Parte real: a
  ficha (`per13`) e a barreira de imagem agora incluem a assinatura da aparência no cache (estresse/cansaço em faixas
  de 10), o que gera mais recálculos.

## Goldens

r27-p2a / r27-p2b: caixa 40406 → 257209, turnês 2734588704 → 4026815485, acts 1531685321 → 68287867,
rng 3382588419 → 205718420 (com `look31` desligado voltam os antigos — conferido trocando o padrão). r27-m3 e
r16-playbot iguais. Detalhes em `DECISOES.md`.

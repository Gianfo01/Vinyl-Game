# Onda 3 · bal (equilíbrio da onda junta): resumo

Relatórios gerados pelo script: `bal.md` (com a correção `bal31.mercy`), `bal-off.md` (antes, sem ela) e `bal-fix.md`
(do primeiro agente, com `bal31.press` ligado). Este resumo fica em `bal-resumo.md` porque `bal.md` é o que o script grava.

## O problema

Com as frentes da onda 3 juntas, o robô quebrava cedo começando por volta de 1970 (`r29rel-bot` quebrou em 1971 e o
r29-relics "muitas" ficou com 42 relíquias). No measure.ts quebravam 2 de 4 partidas em 1955 e 2 de 4 em 1990
(base30: 1 e 0).

## A causa (medida)

1. **`bal31.press` (do primeiro agente) quebrava o `r29rel-bot`.** A tiragem sugerida com a verba × a vida do disco
   ficava maior que o caixa livre. Os lançamentos do 2º ano deixavam de sair (`relplan` de −56 mil para −1 mil em 1971)
   e o robô quebrava sem receita. O WIP já tinha desligado a regra, e com ela desligada o r29-relics volta a passar
   (520 relíquias). Testei uma versão limitada pelo caixa (`bal31.pressCash`, 10% do caixa livre): 4/24 falências,
   igual ao padrão, e o `r29rel-bot` continuou quebrando. Por isso fica desligada.
2. **Fora isso, nenhuma frente drena o caixa.** Em 12 partidas de 1955 a 1965, o saldo de 18 meses foi de −332 mil com
   tudo ligado e −320 mil com tudo desligado (US$ 2020). Desligando um grupo por vez (d31, y31, bolsa/know/objetos/
   família/purse, look31), as falências caem de 5 para 3, 3, 4 e 2. Nenhum grupo explica a diferença sozinho.
3. **A sobrevivência no começo era loteria.** O caixa do robô fica negativo por volta do mês 12 a 24 em quase toda
   partida. Quem sobrevive tira do narrador a oferta do fundo (`investor_offer`, 140 a 150 mil). Ela vale em ~25% dos
   meses e sai em ~10% das varreduras em que vale. Com tudo ligado (outros fluxos de rng, mais eventos) ela não saiu
   nenhuma vez em 31 chances; com tudo desligado, saiu 4 vezes em 18 (+745 mil nas 12 partidas). A versão 30 tinha a
   mesma loteria: 11/60 falências contra 13/60 da onda 3 junta.

## A correção

`bal31.mercy` (ligado; `src/sim/economy.ts`, `checkInsolvency`): no **primeiro mês com o caixa no vermelho**, o fundo
bate à porta. A oferta e as condições são as do evento: reputação comercial > 30, sem investidor em vigor e fora do
papel artista. Aceitar custa 15% das vendas por 5 anos. A regra entra na escada de crise que já existia (mês 2: venda de
catálogo; mês 3: reestruturação) e não mexe no sorteio do narrador.

## Números

Falências em 36 meses (robô equilibrado):

| conjunto | v30 (base30) | onda 3 antes | onda 3 + `bal31.mercy` |
|---|---:|---:|---:|
| 24 partidas 1955–1976, nomes reais (A+B) | 8/24 | 4/24 | 3/24 |
| 12 partidas 1955–1965, config. do measure (C) | 1/12 | 5/12 | 1/12 |
| 24 partidas 1955–1996, config. do measure (D+E) | 2/24 | 4/24 | 1/24 |
| **total** | **11/60** | **13/60** | **5/60** |

measure.ts (4 sementes por era, 36 meses):

| era | base30 | antes (`bal-off`) | depois (`bal`) |
|---|---:|---:|---:|
| 1900 | 1/4 | 0/4 | 0/4 |
| 1955 | 1/4 | 2/4 | 0/4 |
| 1990 | 0/4 | 2/4 | 1/4 |
| 2012 | 0/4 | 0/4 | 0/4 |
| 2030 | 0/4 | 0/4 | 0/4 |

A falência que sobra em 1990 (`r31-base-3`) é de outro tipo. A reputação estava abaixo de 30 no primeiro mês no
vermelho; o aporte veio depois, e o robô gastou os 150 mil em um mês.

Partidas de 20 anos (`scripts/r31/long20.ts`, nomes reais, sementes `bal20-0…5` em 1960, 1963, 1966, 1969, 1972 e 1975):
com `bal31.mercy` 6/6 vivas; sem ele 5/6 (bal20-5 quebra em 1976). `relprobe-d` (1970) quebra em 1971 sem a correção.
Quem sobrevive termina com menos caixa com a correção (bal20-0: 3,2 mi contra 4,6 mi), porque o investidor leva 15% das
vendas por 5 anos.

## Ferramentas

`scripts/r31/agg-cash.ts` (caixa por categoria do livro, ligado × desligado), `probe-events.ts` (eventos válidos e
sorteados), `probe-rep.ts` (reputação mês a mês), `long20.ts` / `probe-cash.ts` com `MEAS=1` (a configuração do
measure.ts), `probe-edge29.ts`, `probe-r29seeds.ts` e `pick-r29trio.ts` (arestas da sonda R29 e escolha do trio).

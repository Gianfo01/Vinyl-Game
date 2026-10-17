# R33 · MUNDO — decisões

Arquivo: `src/sim/r33/mundo33.ts` (cartões entram em `events.ts` via `MUNDO33_EVENTS`). Teste: `tests/r33-mundo.test.ts`.
Tudo atrás de interruptores **desligados no código**; desligado = nada muda (sem sorteio no fluxo rng19: sorte por chave `Rng.fromSeed`).

## Interruptores
- `exp33.crise` — crises 1929 (out), 1973 (out), 2008 (set), 2020 (mar).
- `exp33.censura` — pressão do regime + audiência do selo de aviso (EUA).
- `exp33.memes` — memes e bolhas de `pop31` com efeito econômico.

## O que já existia e foi reaproveitado (nenhuma crise/geo nova)
`geo_depression`, `geo_oil_1973`, `geo_2008`, `geo_pandemic` (data/content.ts) dão mercados e nome; seguem movendo `geoDemand`, `liveBlocked`,
`pressingMult` e a recessão. O selo PMRC é o de `world4/laws.ts` (`advisoryOn`, `stickerRelease`, `cleanEdit`); regime/AI-5 vêm de `censorshipIn`.
A camada nova só soma: curva da crise e efeito separado em shows, físico × digital e crédito.

## Crises
- Curva `intensity33`: choque cheio até 60% da duração, depois recuperação linear até 0.
- Shows: modificador `showRevenue` (perda máx. por crise: 30% / 8% / 12% / 35%), só nos mercados do evento geo.
- Vendas: `chartUnits` — perda nas vendas físicas, ganho pequeno nas digitais (2008, 2020), proporcional aos formatos do lançamento.
- Largada (mês de início): liga a recessão existente, notícia no diário e cartão `crise33_<id>` (apertar os cintos × manter a agenda; 2020 ainda tem transmissão ao vivo). Em 1929 e 2008 o banco não empresta nos 6 primeiros meses (reaproveita a trava `m19nolend`).

## Gancho do crédito (INT-2 / banco)
`creditCrisis33(s): { active, ids, rateAdd, limitMult, haircut, freeze }` — somar `rateAdd` à taxa, multiplicar o limite por `limitMult`, cortar a garantia/catálogo por `haircut`, recusar se `freeze`. A estouro de bolha também aperta (leve). `economy.loanOffer` **não** foi editado (arquivo de outra frente): só a trava de empréstimo existente é usada.

## Censura e política
- Pressão do regime por ato (`pressure`): sobe a cada mês em mercado com censura ≥ 0,5 (mais se a banda tem traço engajado/controverso), desce fora disso.
- Cartão `censura33_pressao` (≥ 8): metáfora (65% vira hino: fama, arte; senão vetado), exílio (custo, vai para Londres/Paris/LA; volta com bônus de fama e fãs quando o regime cai ou em 3 anos) ou calar (confiança e moral caem).
- Cartão `pmrc33_audiencia` (1985–90, EUA, só com o selo ligado pela world4): aceitar o selo, versão limpa ou depor contra (50%: fama; senão o disco perde apelo).

## Memes e bolhas
Por `onFact('culture31')` de `extras31` (sem editar `pop31.ts`): meme = +3% nas vendas por 8 semanas (decai); bolha = +5% por 26 semanas, estoura (fato próprio) e vira −7% por 13 semanas, com crédito mais apertado. Gancho de leitura: `mundoNow33(s)`.

## Fica de fora / combinar
- UI: nada (só leitura em `mundoNow33` e `creditCrisis33`).
- `economy.loanOffer` ler `creditCrisis33` (INT-2/GESTÃO); catálogo como garantia (`haircut`) é do CATÁLOGO/INT-2.
- Goldens (r27-p2a, r27-p2b, r27-m3, r16-playbot): não rodados nesta frente; desligado não deve mudar nada (módulo só registra mods/hook/eventos que saem cedo) — a junção confere.

# Rodada 29 — Nível dos rivais na Nova run

> Quantas gravadoras existem no começo, e quantos selos novos aparecem durante a run: ver [gravadoras29.md](gravadoras29.md).

> Pedido do autor: *"no começo, run rápido e completo, permita escolher o nível dos rivais também (do 0, emergentes, etc.)"*.

A Nova run já tinha a escada de **situação inicial** do jogador (`start29`: do zero → emergente → médio → hipster →
estabelecido → top 5 → líder do mercado → em crise). Agora a mesma escada vale para **os outros**: as gravadoras rivais
e os negócios rivais da sua carreira.

| Opção | Status mostrado | Em uma frase |
|---|---|---|
| Do zero | `· rivais do zero` | Selos de garagem, caixa curto, um artista cada — os famosos estão livres no mercado. |
| Emergentes | `· rivais emergentes` | Selos pequenos e locais, poucos nomes, pouco dinheiro para leilão. |
| Médios | `· rivais médios` | Ninguém domina: majors viram selos médios, elencos enxutos, duas ou três praças. |
| Hipsters / indie de prestígio | `· rivais hipsters` | Crítica e músicos os adoram, o rádio não; pouco caixa, elenco pequeno e talentoso. |
| Estabelecidos | `· rivais estabelecidos` | Todos com catálogo, caixa e presença na região — e assinam primeiro os nomes livres. |
| Gigantes (top 5) | `· rivais gigantes` | Cinco majors (menos nas eras antigas) com o mundo, cofres cheios e fome de estrelas. |
| Um líder dominante | `· um rival dominante` | Um gigante absorveu as estrelas e o mercado; os outros vivem das sobras. |
| **Mistura realista (padrão)** | `· rivais em mistura realista` | O mundo de sempre (o comportamento anterior). |

O status completo junta carreira × situação × rivais: **"Selo emergente · rivais gigantes"**, "Artista iniciante · um
rival dominante", "Produtor top 5 · rivais hipsters"…

## Onde está

- **Nova run rápida** (`src/ui/ps/home27.ts`): campo **"Nível dos rivais"** ao lado de "Ponto de partida" (`#h27-rivals`).
  A linha de status embaixo do formulário mostra "Selo emergente · rivais gigantes — … · Rivais: …".
- **Nova run completa** (`src/ui/newgame17.ts`, `rivalsCard29`, etapa 4 *Gravadoras e rivais*): cartão com as 8 opções
  (`[data-rivals29]`), o status no topo e um aviso quando cenário histórico ou "assumir gravadora" anulam a escolha.
  Na revisão: "Situação inicial: Selo emergente · um rival dominante" (grupo Modo) e "Nível dos rivais" (grupo
  Gravadoras); a etapa 4 na barra mostra "32 · Um líder dominante".
- **Avisos** (`notes17`): "Nível dos rivais ignorado" quando o "Como começam" das gravadoras está definido; informação
  quando "assumir gravadora" o ignora.

As duas telas usam o **mesmo setter** `setRivals29(cfg, id)` (`src/sim/rivals29data.ts`) e produzem a mesma `RunConfig`
(`quickRunConfig27` == configuração completa + `draftDefaults27`). "Mistura realista" **apaga** o campo: a configuração
fica idêntica à de quem nunca escolheu. Escolher um nível explícito volta o "Como começam" das gravadoras para "pela
história" (gigantes/novatas/aleatório/virado/todos iguais contradiriam a escolha).

## Como funciona (mundo gerado)

Arquivos: dados puros em `src/sim/rivals29data.ts`; gancho em `src/sim/sys/rivals29start.ts`, registrado em
`src/sim/sys/index.ts` **antes** do `start29` (a mágoa dos "maiores rivais" do top 5 / líder já pega o mercado no porte
escolhido). Campo opcional `config.rivals29` em `RunConfig` (`src/sim/types.ts`).

Para cada selo rival ativo no ano de início, o perfil do nível mexe em:

| Nível | Caixa (× o que a era e o porte deram) | Artística / comercial | Elenco | Alcance do elenco | Porte | Mercados | Agressividade |
|---|---|---|---|---|---|---|---|
| Do zero | ×0,06 | 5–20 / 5–18 | corte em 1 (fica o menos famoso) | fama ×0,6 | B (indie pequeno) | só a casa | ×0,55 |
| Emergentes | ×0,22 | 20–40 / 18–38 | corte em 3 (os menos famosos) | ×0,8 | B | só a casa | ×0,75 |
| Médios | ×0,55 | 35–55 / 35–55 | corte em 6 (sorteados) | — | major → C | casa + América do Norte + Europa | ×0,88 |
| Hipsters | ×0,35 | **72–90 / 12–28** | corte em 4 (maior potencial − fama) | ×0,85 | B; arquétipo boutique/cena; A&R "desenvolver/nicho" | só a casa | ×0,65 |
| Estabelecidos | ×1,6 | 45–68 / 52–75 | +2 nomes livres cada | — | o de sempre | os de sempre + região | ×1,08 |
| Gigantes — os 5 maiores | ×3,2 | 55–75 / 80–94 | +15 nomes livres cada (os mais famosos) | ×1,12 | A; império/hit; A&R "estrelas/catálogo" | o mundo da era | ×1,25 |
| Gigantes — os demais | ×1,3 | 45–65 / 55–75 | +2 cada | — | o de sempre | + região | ×1,08 |
| Líder — o maior | ×10 | 70–85 / 92–98 | +45 (absorve as estrelas que os outros soltaram) | ×1,15 | A; império; "estrelas" | o mundo da era | ×1,4 (teto 0,98) |
| Líder — os demais | ×0,35 | 25–48 / 20–40 | corte em 4 (os menos famosos) | ×0,8 | B | só a casa | ×0,7 |
| Mistura realista | — | — | — | — | — | — | — |

- **Reputação artística × comercial**: guardada em `x4.rivals29.rep` (só quando um nível foi escolhido) e lida por
  `rivalRep29(s, id)`; a reputação única do selo (`Label.reputation`, usada no peso do selo nas ofertas,
  `offers12.labelClout`) vira a média das duas. Sem nível, `rivalRep29` deriva as duas da reputação e do arquétipo.
- **Elenco e fama**: o corte devolve os atos ao mercado livre (o contrato é apagado — retcon do mundo, não gera mágoa no
  `rivals27`); as assinaturas extras pegam os nomes livres mais famosos, com preferência pelo foco e pelo mercado do selo,
  e nunca os atos que já estão no seu radar. "Do zero" = mercado aberto: os famosos ficam livres para você.
- **Agressividade e perfil**: `Label.aggression` (lida pelo `rivalmind18`, leilões e ofensivas), arquétipo
  (temperamento do `rivals27` quando o selo não tem líder ativo) e estratégia de A&R. A dificuldade detalhada
  (`diff17.rivals`) continua valendo por cima.
- **Sede/equipe**: selos rivais não têm sede nem equipe no modelo; o "porte" deles é a família A–D e os mercados
  (escritórios por praça) — é isso que o nível escala.

### Eras

- O caixa é um **multiplicador sobre o caixa da era** (já em dólares nominais do ano): 1889 nunca ganha cofres de 1990.
- **Quantos gigantes a era comporta**: até 2 antes de 1920, 3 antes de 1950, 5 depois (`eraBig29`).
- **Crescimento menor nas eras antigas**: multiplicadores acima de 1 valem pela metade antes de 1920 e ¾ antes de 1950
  (`eraGrow29`; o líder dominante de 1889 é ×5,5, não ×10).
- **"O mundo" da era**: antes de 1920 = casa + América do Norte + Europa; antes de 1950, + América Latina e Brasil;
  depois, todos os mercados (`eraWorld29`).

### Outras carreiras

Os negócios rivais de `ventures9.npc` (estúdios, festivais, agências de shows, editoras, mídia, plataformas) são a
concorrência das carreiras de negócio (`studioComp19`, `rivalFest19`, assinantes da plataforma…). Com um nível escolhido:

- os que já existirem mudam de reputação na proporção do nível;
- abrem no começo, **do tipo da sua carreira principal** e só se o tipo existe no ano (`VKINDS.from`: estúdio 1920,
  agência 1930, festival 1950, plataforma 2005…): do zero 0; emergentes / médios / hipsters 1 (reputação 15–30 / 30–45 /
  45–60); estabelecidos 2 (50–65); gigantes 3 (70–85, dos maiores); líder dominante 1 do gigante (90) + 1 pequeno
  (18–32). O primeiro abre na sua cidade.
- Gravadora, artista e as demais carreiras disputam com os selos rivais — que são escalados em qualquer carreira.

### Precedência e determinismo

- **Cenário histórico** (`scenario17`) apaga o campo no `buildRun27` (como o `start29`) e o gancho o ignora;
  **assumir gravadora** (`takeover`) e um **"Como começam" explícito** das gravadoras (`labels.start` ≠ história) também.
- RNG próprio: `Rng.fromSeed('rivals29:' + semente + ':' + nível)`. O sorteio principal (`s.rng`) termina igual ao do
  mundo padrão (testado). Sem campo ou com "mix", o gancho retorna antes de qualquer coisa e nada é gravado em `x4`:
  os valores-ouro de `r27-p2a`, `r27-p2b` e `r27-m2` ficam intactos.
- Uma lembrança importante na memória da partida: "Nível dos rivais: Gigantes (top 5). …".

## Números medidos

Semente `r29r-<ano>`, carreira principal estúdio, situação "emergente", dificuldade normal. Caixa em milhões de dólares
de 2020 (`toReal`). "Fatia" = atos ativos do mundo que estão no elenco de um rival. "Negócios rivais" = estúdios rivais
abertos no começo (estúdio só existe a partir de 1920).

### 1889

| Nível | Rivais ativos | Caixa total (US$ mi de 2020) | Maior selo (% do caixa) | Atos nos elencos | Fama somada | Fatia dos atos ativos | Artística / comercial (média) | Agressividade média | Grandes | Negócios rivais (estúdio) |
|---|---|---|---|---|---|---|---|---|---|---|
| Do zero | 5 | 1.1 | 60% | 5 | 46 | 4% | 12 / 12 | 0.28 | 0 | 0 |
| Emergentes | 5 | 4.1 | 60% | 15 | 232 | 13% | 25 / 26 | 0.38 | 0 | 0 |
| Médios | 5 | 10.2 | 60% | 28 | 647 | 24% | 44 / 40 | 0.44 | 0 | 0 |
| Hipsters / indie de prestígio | 5 | 6.5 | 60% | 20 | 397 | 17% | 85 / 22 | 0.33 | 0 | 0 |
| Estabelecidos | 5 | 24.1 | 60% | 41 | 940 | 35% | 57 / 62 | 0.54 | 0 | 0 |
| Gigantes (top 5) | 5 | 34.5 | 68% | 67 | 1462 | 57% | 61 / 72 | 0.57 | 2 | 0 |
| Um líder dominante | 5 | 64.0 | 96% | 67 | 1443 | 57% | 48 / 43 | 0.43 | 1 | 0 |
| Mistura realista (padrão) | 5 | 18.5 | 60% | 31 | 712 | 26% | 53 / 56 | 0.50 | 0 | 0 |

### 1962

| Nível | Rivais ativos | Caixa total (US$ mi de 2020) | Maior selo (% do caixa) | Atos nos elencos | Fama somada | Fatia dos atos ativos | Artística / comercial (média) | Agressividade média | Grandes | Negócios rivais (estúdio) |
|---|---|---|---|---|---|---|---|---|---|---|
| Do zero | 17 | 6.5 | 12% | 17 | 124 | 5% | 12 / 11 | 0.28 | 0 | 0 |
| Emergentes | 17 | 23.7 | 12% | 51 | 700 | 15% | 30 / 27 | 0.39 | 0 | 1 |
| Médios | 17 | 59.2 | 12% | 102 | 3963 | 29% | 46 / 49 | 0.45 | 0 | 1 |
| Hipsters / indie de prestígio | 17 | 37.7 | 12% | 68 | 1289 | 19% | 80 / 21 | 0.33 | 0 | 1 |
| Estabelecidos | 17 | 172.3 | 12% | 293 | 10509 | 84% | 58 / 62 | 0.56 | 0 | 2 |
| Gigantes (top 5) | 17 | 238.0 | 17% | 342 | 11414 | 98% | 57 / 71 | 0.58 | 5 | 3 |
| Um líder dominante | 17 | 158.9 | 79% | 122 | 5271 | 35% | 38 / 33 | 0.39 | 1 | 2 |
| Mistura realista (padrão) | 17 | 107.7 | 12% | 259 | 9881 | 74% | 51 / 58 | 0.51 | 0 | 0 |

### 1990

| Nível | Rivais ativos | Caixa total (US$ mi de 2020) | Maior selo (% do caixa) | Atos nos elencos | Fama somada | Fatia dos atos ativos | Artística / comercial (média) | Agressividade média | Grandes | Negócios rivais (estúdio) |
|---|---|---|---|---|---|---|---|---|---|---|
| Do zero | 31 | 12.5 | 10% | 31 | 382 | 5% | 11 / 11 | 0.31 | 0 | 0 |
| Emergentes | 31 | 45.8 | 10% | 92 | 1770 | 15% | 28 / 28 | 0.42 | 0 | 1 |
| Médios | 31 | 114.6 | 10% | 180 | 8739 | 29% | 45 / 46 | 0.50 | 0 | 1 |
| Hipsters / indie de prestígio | 31 | 72.9 | 10% | 122 | 3025 | 20% | 81 / 19 | 0.37 | 0 | 1 |
| Estabelecidos | 31 | 333.3 | 10% | 591 | 26786 | 95% | 58 / 63 | 0.61 | 0 | 2 |
| Gigantes (top 5) | 31 | 437.8 | 16% | 617 | 27804 | 99% | 56 / 69 | 0.62 | 5 | 3 |
| Um líder dominante | 31 | 261.0 | 75% | 182 | 7812 | 29% | 37 / 32 | 0.40 | 1 | 2 |
| Mistura realista (padrão) | 31 | 208.3 | 10% | 529 | 25859 | 85% | 49 / 53 | 0.57 | 0 | 0 |

### 2020

| Nível | Rivais ativos | Caixa total (US$ mi de 2020) | Maior selo (% do caixa) | Atos nos elencos | Fama somada | Fatia dos atos ativos | Artística / comercial (média) | Agressividade média | Grandes | Negócios rivais (estúdio) |
|---|---|---|---|---|---|---|---|---|---|---|
| Do zero | 34 | 10.6 | 7% | 34 | 365 | 4% | 13 / 12 | 0.31 | 0 | 0 |
| Emergentes | 34 | 38.8 | 7% | 102 | 1795 | 12% | 29 / 27 | 0.42 | 0 | 1 |
| Médios | 34 | 97.0 | 7% | 204 | 10068 | 24% | 46 / 45 | 0.50 | 0 | 1 |
| Hipsters / indie de prestígio | 34 | 61.7 | 7% | 136 | 2953 | 16% | 81 / 20 | 0.37 | 0 | 1 |
| Estabelecidos | 34 | 282.3 | 7% | 840 | 39077 | 97% | 57 / 64 | 0.61 | 0 | 2 |
| Gigantes (top 5) | 34 | 335.0 | 12% | 855 | 40024 | 99% | 55 / 68 | 0.62 | 5 | 3 |
| Um líder dominante | 34 | 185.6 | 69% | 201 | 8132 | 23% | 37 / 32 | 0.40 | 1 | 2 |
| Mistura realista (padrão) | 34 | 176.4 | 7% | 772 | 38116 | 89% | 50 / 56 | 0.56 | 0 | 0 |

Leitura: caixa, fama e fatia sobem monotonicamente em **do zero < emergentes < médios < estabelecidos < gigantes** nas
quatro eras; a mistura realista fica entre médios e estabelecidos; hipster tem a maior razão artística/comercial
(≈ 4:1) com caixa abaixo do padrão; o líder dominante concentra 69–96% do caixa dos rivais num só selo e os demais
ficam com até 4 artistas. Em 1889 os "gigantes" são só 2 e crescem pela metade.

## Testes

`tests/r29-rivals-start.test.ts` (13 testes): escada monotônica (caixa / fama / fatia) em 1889, 1962, 1990 e 2020;
hipster com razão artística/comercial > 2,5 e maior que todas; líder com > 50% do caixa e o maior elenco; gigantes
limitados pela era e com os mercados da era; "do zero" com no máximo 1 artista por selo; agressividade; padrão (sem
campo / "mix") idêntico byte a byte; determinismo e `s.rng` intacto; rápida == completa (6 combinações carreira ×
situação × rivais); cenário histórico, "assumir gravadora" e "Como começam" com precedência; as 7 opções nas 12
carreiras × 4 eras e as 8 opções aplicadas a cópias do mesmo mundo para cada carreira (elencos, contratos e donos
coerentes).

Rodados: `tsc --noEmit` limpo; `r29-rivals-start`, `r27-home`, `r29-fixes`, `r29-reorg`, `r28-f4`, `r17-start`,
`r23-scenarios`, `r27-p2a`, `r27-p2b`, `r27-m2` — todos verdes.

## Capturas (`docs/shots29rivais/`, Playwright, pt-BR, 1440×900 e 390×844)

Script: `node scripts/r29/rivals.mjs docs/shots29rivais 5181` (com `npx vite --port 5181`).

- `rapida-gigantes-{desk,mob}.png` — Nova run rápida, "Selo emergente · rivais gigantes" na linha de status.
- `rapida-hipster-{desk,mob}.png` — mesma tela com "Hipsters / indie de prestígio".
- `completa-rivais-{desk,mob}.png` — configuração completa aberta a partir da rápida (gigantes já marcado), etapa 4.
- `completa-lider-{desk,mob}.png` — "Um líder dominante" escolhido no cartão (barra lateral e etapa atualizadas).
- `completa-revisao-{desk,mob}.png` — revisão: "Situação inicial: Selo emergente · um rival dominante" e "Nível dos rivais".
- `jogo-lider-desk.png` — a partida começa com o nível escolhido (sem erro de página).

## O que fica de fora / lacunas

- **Empresários rivais** (`managers14`) são pessoas reais com dados fixos; o nível não mexe neles.
- **Casas de shows** rivais são as casas reais de `venues17` (lotação e prestígio históricos); não são escaladas.
- Selos **fundados depois** do ano de início nascem como sempre (o nível descreve o mercado do começo; quem chega depois
  é concorrência nova).
- A reputação artística × comercial separada é guardada e exposta (`rivalRep29`), mas a simulação mensal continua usando
  a reputação única do selo (a média das duas); a separação aparece no perfil (arquétipo / estratégia) e no peso das
  ofertas pela média. Ainda não há uma tela de rival que mostre os dois números.
- O "Como começam" das gravadoras (gigantes / novatas / …) continua existindo na etapa 4: escolher um nível o desliga; se
  o jogador o religar depois, o nível é ignorado e a revisão avisa.

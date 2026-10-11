# Revisão H — Contratos, scouting, negócios e carreiras

Escopo lido: `src/sim/contracts.ts`, `contracts2.ts`, `scouting.ts`, `scout20.ts`, `sys/scout11.ts`, `sys/discover18.ts`, `sys/contracts18.ts`, `sys/deals18.ts`, `sys/offers12.ts`, `sys/deal360_17.ts`, `business.ts`, `brands.ts`, `sublabels.ts`, `sys/stakes8.ts`, `sys/sale17.ts`, `sys/manager11.ts`, `sys/managers14.ts`, `sys/careers12/19.ts`, `sys/services12.ts`, `sys/merch17.ts`, `sys/license17.ts`, `sys/heirs8.ts`, `sys/hq6.ts`, `sys/hq8.ts`, `sys/campus18.ts`, `sys/school18.ts`, `sys/schools19.ts`, `sys/dossier8.ts`, `sys/dossier13.ts`, `sys/crew8.ts`, `sys/deleg16.ts`, `mine19.ts`, `sys/bandpay19.ts`, `sys/prof19.ts`, `sys/odds19.ts`, `sys/dispute15.ts`, `sys/cancel19.ts`, `sys/policy18.ts`, `sys/society18.ts`, `sys/image17.ts`, `sys/notify19.ts`, `pool19.ts`, `sys/gate14.ts`, `caps18.ts`, mais os pontos de contato em `market.ts` (distribute), `tick.ts`, `hooks.ts`, `rights.ts`, `sys/rights8.ts`, `sys/moneyb19.ts`, `sys/market19a.ts`, `sys/npc17.ts`, `sys/artist18.ts`, `sys/intra19.ts`, `sys/why18.ts`, `sys/explain12.ts`, `tours.ts`, `sys/live18.ts`, `sys/live/state.ts`, `sys/route8.ts` e as telas `ui/ficha.ts`, `ui/sys/offer20.ts`, `ui/sys/offers12.ts`, `ui/panels/people.ts`.

Nenhum arquivo do repositório foi editado. `Math.random`/`Date.now` não aparecem em nenhum arquivo da área (único `Date.now` em `src/sim/balance19.ts:145`, só para medir tempo).

---

## 1. Bugs e erros concretos

### Prioridade ALTA

**1.1 [CONFIRMADO] Lançamento de subselo nunca paga royalty nem abate o recoupment do artista (e não gera fãs)**
- `src/sim/market.ts:443` — `distribute()` sai antes de qualquer conta quando o master é de subselo:
  `if (s.subLabels.some((x) => x.id === rel.owner)) return;`
- `src/sim/sublabels.ts:215-223` — a liquidação do subselo só credita o caixa dele: `const gross = Math.round(w * money(s, ...) * 0.8); if (gross > 0) slog(sl, s.week, gross, ...)`. Não existe `artistShare`, `recoupBalance -=`, `act.cash +=`, `postRoyAP18`, nem `act.fans.* +=` (que em `distribute` vêm depois do `return`).
- O contrato do ato continua `party: 'player'` (`sublabels.assignAct:67-76` não toca no contrato; `stakes8.makeSubLabel:398-409` idem), então o adiantamento jamais é recuperado por discos do subselo e o artista nunca vê um centavo deles. Mesmo efeito para selos rivais convertidos em subselo (`stakes8.ts:409` manda os masters para `sl.id`).

**1.2 [CONFIRMADO] Masters de subselo fechado ou falido ficam "mortos" para sempre**
- `src/sim/sublabels.ts:200` — `if (sl.status === 'closed' || sl.status === 'bankrupt') continue;` (a liquidação do subselo não roda) e `market.ts:443` continua devolvendo cedo (o `some` inclui subselos fechados). Resultado: nenhum dos dois caminhos liquida.
- `closeSubLabel` (`sublabels.ts:166-183`) diz "elenco volta à matriz" mas não muda `rel.owner`; a falência (`:280-286`) diz "masters ficam com os credores" e só limpa `roster`. Texto sem efeito.

**1.3 [CONFIRMADO] `endContract` não limpa o roster do subselo: o subselo segue gerindo (e lançando) um ato que já é de rival**
- `src/sim/contracts.ts:369-386` — `endContract` não toca em `s.subLabels`; `moneyb19.moveAct19:117-124` idem. Só `assignAct/unassignAct/closeSubLabel` mexem no roster (grep).
- `src/sim/sublabels.ts:214-238` — o mês do subselo itera `sl.roster` sem checar `act.owner === 'player'`: desenvolve integrantes, soma fãs e, na estratégia de catálogo, chama `composeSongs/recordSongs/launchNpcRelease(..., sl.id, ...)` e marca `rel.owner = sl.id` para um ato que pode estar em outro selo.

**1.4 [CONFIRMADO] Cláusulas unilaterais depois da assinatura (opção, cross-collateral, multa de saída) — exploit**
- `src/sim/contracts2.ts:17-38` — `setClauses` grava `k.options`, `k.exitFee` e `k.crossCollat` sem consentimento do artista (cross custa só `trust −4`; opção e multa custam zero).
- `src/ui/panels/people.ts:105-108` expõe os botões: "+1 opção de renovação", "Definir multa de saída" (= `advance*0.5 + $1.000`), "Cross-collateral". O jogador tranca o ato e cria uma multa que ele nunca negociou.
- Há um segundo sistema que define a mesma cláusula com regras diferentes (`sys/moneyb19.setClause19:222-231`, com custo de confiança e cooldown de 26 semanas). Dois gravadores do mesmo campo.

### Prioridade MÉDIA

**1.5 [CONFIRMADO] Rescisão/saída sem multa na maioria dos caminhos**
- `k.exitFee` só é cobrado em `contracts2Month` (`contracts2.ts:138-142`, artista com `trust < 25` e caixa paga e sai, 20 %/mês) e em `moneyb19.clausePaid:233-249` (rival paga na janela).
- Todas as outras saídas chamam `endContract(s, a, 'left')` sem olhar a cláusula: `tick.ts:158` (`trust < 12`), `sys/rights8.ts:79` (`flags.leaving`), `business.ts:355` (auditoria perdida), `sys/moneyb19.ts:488`, `sys/stories8.ts:424`, `sys/dispute15.ts:117`.

**1.6 [CONFIRMADO] "Rival não pode contratar quem está em desenvolvimento/bolsa" não é garantido**
- O veto fica em `SIGN_VETO` (`sys/gate14.ts:91-99`) e só é consultado em `signWithRival` quando `force === false` (`contracts.ts:350`). `discover18.ts:250` assina o "rival quente" com `force = true`; o mesmo em `npc17.ts:199/327/344/364/584/647`, `tv18.ts:180`, `market19a.ts:632`, `rivalmind18.ts:305`, `manager11.ts:186`, `rivals2.ts:42`, `sitsworld17.ts:563`.
- Bolsistas: `school18.ts:127-129` promete "sem rival na disputa", mas a única proteção é apagar `disc18.hot` (`:147-148`); `rivals.ts:44`, `contracts.ts:195` (rival na mesa) e `rivals8` podem assiná-los normalmente.

**1.7 [CONFIRMADO] Elegibilidade "única" (R20 B9) tem pelo menos seis caminhos distintos**
- Regra central: `scout20.scoutEligible20` (usada em `makeOffer`, `acceptCounter`, `resolveOne`).
- Fora dela: `sys/scout11.ts:73` (`!a.owner && live(...)` — aceita `hiatus` e ato sem integrante vivo); `sys/discover18.ts:85` (`free` = só `emerging`); `sys/deals18.devCandidates18:74`; `discovery.ts:259` (leilão: `acceptOffer` direto, caixa cru, sem `useMeeting`); `sys/manager11.acceptDeal:170-173` (`acceptOffer` direto, `s.player.cash` cru); `sys/deals18.exerciseDev18:103` (`acceptOffer` direto).

**1.8 [CONFIRMADO] Fatia 360 calculada de três maneiras diferentes para o mesmo contrato**
- Com alavanca + teto anual (`take360`): `tours.ts:286`, `sys/route8.ts:357`, `world4/milestones.ts:664`.
- Com alavanca sem teto (`eff360`): `sys/live/state.ts:198`, `sys/route8.ts:368`.
- Fatia crua `c.share360`: `sys/live18.ts:359, 396, 475` (post-mortem e kit), `live.ts:65`, `events.ts:345`, `brands.ts:104/168`, `sys/merch17.ts:116`. O post-mortem da turnê mostra um "resultado do selo" diferente do que o razão lançou para uma estrela em 360.
- Merch invertido: `sys/merch17.ts:116` — `c?.model === '360' ... ? Math.max(0.3, c.share360) : 0.7` → o selo que banca o estoque leva 30 % num 360 e 70 % num mero acordo de imagem.

**1.9 [CONFIRMADO] Recuperável que ignora as cláusulas negociadas (r18)**
- `sys/intra19.ts:140` e `:199` — `k.recoupBalance += pay` direto (você produzindo/gravando no próprio estúdio) sem `addRecoup18`; um pacote "Pró-artista" (`rec: 0`) passa a recuperar gravação.
- Verba prometida nunca entra no recuperável: `sys/offers12.payPledges:332` posta com chave `pledge12:…`, que `contracts18.actOfKey:226-238` não reconhece; cláusula `tour: true`/`mkt` do pacote "Major" fica sem efeito sobre o apoio de turnê prometido.
- Teto por projeto (`sys/contracts18.addRecoup18:111-121`): quando o artista não autoriza, `return 0` derruba a despesa inteira, não "o excedente" como diz a mensagem.

**1.10 [CONFIRMADO] Três auditorias de royalties concorrentes sobre o mesmo ato**
- `business.ts:321` (trust < 30, `recoupBalance > 0`, 4 %/mês), `sys/contracts18.ts:289-312` (março, até 40 %), `sys/dispute15.ts:70-78` (trust < 28, 6 %+). Nenhum conhece o outro: processos e custas podem empilhar na mesma situação.

**1.11 [CONFIRMADO] Compra de selo: recoupment tratado como passivo e vira credor**
- `business.ts:32` — `liabilities = … + recoupBalance * 0.2`; `transferLabel:57-59` cria `s.creditors.push({... owed: v.liabilities})`. O comprador paga a um credor pelo direito de abater royalties futuros (um ativo), e o roster chega com `delegated` mas sem checar capacidade/caixa de adiantamentos.
- `business.sellCompany:395-404` vende a "empresa" de um selo adquirido e o jogador fica com elenco, contratos e catálogo; vender a fábrica não remove `'own_plant'` de `equipment`.

**1.12 [CONFIRMADO] A % "escondida" da negociação é dedutível e aparece em outras telas**
- `sys/why18.ts:104-115` ("offer.chance") mostra `Placar {p} pontos (meio da curva = 58)`; com `contracts.ts:142` (`p = 1/(1+exp(-(score-0.58)*8))`) a probabilidade exata sai numa calculadora.
- `sys/explain12.forecastSigning` + `rangeAround:91-96` entregam faixa numérica de 8 p.p. com analista (ex.: "62–70 %").
- `src/ui/sys/artist18.ts:81` "Contrapropor ({p}%)" (contraproposta ao selo), `sys/careers19.ts:377` "a chance de renovar é {p}%", `sys/deals18.ts:registerExplain('deal.dev')` com `fmt: 'pct'`, `sys/odds19.ts` (por desenho, r19). Contradiz "a leitura é uma faixa, nunca uma %" do README para a *mesma família* de decisão.

**1.13 [CONFIRMADO] Comissão do jogador-empresário: dinheiro criado e cobrada duas vezes**
- `sys/ventures9.managementMonth:729-735` — `vpay(mg.owner, mgGross(a) * rate)`; `mgGross` (`:643`) é fórmula de fama/embalo, nada é debitado do ato.
- `sys/intra19.ts:179-182` cobra de novo sobre o cachê de festival (`a.cash -= com`), e `sys/manager11.acceptDeal:196` cobra sobre o adiantamento; quando o selo é o seu, `pay()` (`manager11.ts:49-56`) posta `+amount` em `business` sem débito em lugar nenhum.

**1.14 [CONFIRMADO] Caixa reservado (R20 B4) ignorado por vários gastos de contrato**
- Usam `s.player.cash` cru: `contracts.renewContract:393`, `scouting.requestScout:215`, `sys/offers12.payPledges:324`, `events.ts:488` (bônus do aliciamento), `discovery.ts:259` (leilão), `sys/manager11.ts:170`, `business.ts:158` (leilão de catálogo), `sys/deals18.endJv18:273`. Já `acceptOffer` não checa nada (depende do chamador).

**1.15 [CONFIRMADO] Relatório de scouting que (quase) não envelhece; duas réguas para o mesmo talento**
- Único envelhecimento: `scouting.ts:204` (8 %/mês de perder um grau depois de 52 semanas). `estimate()` (`scouting.ts:44-65`) não usa `updatedWeek`: o intervalo mostrado cinco anos depois tem a mesma largura do dia do relatório.
- `scouting.estimate` centra o intervalo em `v + k.bias` (viés do RNG); `sys/ability18.est18` centra em `A.pa + hash` (viés por `hu`). A ficha mostra duas faixas desalinhadas para o mesmo ato (`discover18.estTxt18` usa a segunda; o radar usa a primeira).

### Prioridade BAIXA

**1.16 [CONFIRMADO] Evento `rival_poach` → "Renovar com bônus"** (`events.ts:488`): `if (s.player.cash < bonus) return;` silencioso; bônus pago e somado ao `recoupBalance` mesmo quando a renovação falha (ato sai no fim, saldo nunca recuperado); `a.trust += 5` sem `clamp`.

**1.17 [CONFIRMADO] Opções de renovação morrem com o contrato** — `tick.contractsMonth:149-152` encerra sem olhar `c.options`; `policy18.renewals` não exerce opções; só botão manual (`ui/panels/people.ts:106`). `Contract.crossCollat` (contracts2) nunca é lido pelo recoupment (`recoupable18` só vê `clauses18.cross`): é um pill na ficha.

**1.18 [CONFIRMADO] Texto só em PT gravado no save** — `contracts.ts:186, 215, 236` (`o.note = … .pt`), `business.ts:58` (nome do credor `.pt`), memos do razão (padrão do projeto, mas `Offer.note` é exibido na UI em EN).

**1.19 [CONFIRMADO] `c18_shelved` → "Liberar"** (`sys/contracts18.ts:325`) só faz `k.endWeek = s.week`; o ato fica "do selo" até `contractsMonth` do fechamento. `market19a.answer360('match'):478` vira 360 sem `publishing = true` nem cláusulas, diferente de `acceptOffer:316-317`.

**1.20 [CONFIRMADO] license17 'in'**: o adiantamento que você paga (`acceptLic:46`) nunca é recuperado contra `estIn` (`:113`); e `lic17in` posta em `'sales'`, inflando `catalogMonthlyRevenue` (securitização) com receita de terceiros.

**1.21 [CONFIRMADO] Duplicado "o que escapou"**: `sys/dossier8.ts:330-337` e `sys/discover18.ts:256-271` notificam o mesmo caso.

**1.22 [CONFIRMADO] Teste de recoupment é tautológico** — `tests/sim.test.ts:63-76` recalcula `min(balance, share)` à mão, não exercita `distribute`. Nenhum teste cobre subselo, cross-collateral de `contracts2`, 360 nos três caminhos, nem a multa de saída.

---

## 2. Melhorias de código

**Qual é o modelo único?** `Contract` (`types.ts:381`) é o único registro persistido, mas carrega quatro camadas sobrepostas que não se leem:
1. campos base (advance/royalty/term/recoupBalance),
2. `rights: RightsTerms` (rodada 8 — master, reversão, pubShare, opções, escopo),
3. `clauses18` + `rb18/rp18/spent18` via cast `C18` (`contracts18.ts:46`),
4. campos de `contracts2` (`territories/ceded/crossCollat/options/exitFee/buyout`) e `pk12` na oferta (`offers12.ts:65-68`).
E a mesma coisa é gravada por dois sistemas: opções (`rights.options` × `contracts2.options`), cross (`clauses18.cross` × `crossCollat`), multa (`contracts2.setClauses` × `moneyb19.setClause19`).

**Oferta**: `Offer` (`types.ts:520`) é a proposta do selo; `DealPackage` (`offers12.ts:39`) é a mesma coisa em outro formato (conversão `packageFromOffer`); `Offer18` (`artist18`) é a terceira (lado do artista); `DealOffer` (`manager11`) a quarta; `Bid` do leilão (`discovery.ts`) a quinta.

Sugestões concretas:
- **Um `signAct(s, act, terms, via)`** que faça elegibilidade (`scoutEligible20`), caixa livre, reunião (`useMeeting`), hooks e `acceptOffer`; trocar os 6 chamadores diretos (1.7). **Um `transferAct(s, act, to, reason)`** usado por `endContract`, `moveAct19`, `transferLabel`, `npcAbsorb`, `sellLabel`, `makeSubLabel`, `assignAct` — que também limpe `subLabels[].roster`, `agenda`, `delegated`, dossiê e missões de olheiro.
- **Um `recoup(s, c, kind, amount, relId)`** (hoje `addRecoup18`) e proibir `recoupBalance +=` fora dele (17 ocorrências diretas: `intra19`, `production.ts:263`, `events.ts:488/588`, `rights.ts:416`, `market19a`, `npc17`, `people/life.ts:212`, `negotiation.ts:242`, `paths18`, etc.).
- **Um `labelTake(s, act, stream, gross)`** para 360/merch/marcas/sync, substituindo as 12 leituras de `share360` (1.8).
- **Um lugar para a multa de saída** (`moneyb19.setClause19` já tem custo/cooldown) e cobrança dentro de `endContract` conforme o `reason`.
- Fundir as três auditorias (1.10) num só pipeline de "disputa de contrato" (`dispute15` já tem cartão, custas e histórico).
- `business.startJointVenture` (companies) × `deals18.startJv18` (x4): duas JVs; `brands.produceMerch`/`s.merch` × `merch17` lines: dois merches; `discovery.ts` auctions × `npc17.bidding` × `offers12.rivalPackages` × `rivals12 outbid`: quatro leilões. Escolher um de cada e aposentar o outro (ou pelo menos fazer um ler o outro).
- Testes: um teste de integração que assine um ato, lance um disco, rode `distribute` e confira `recoupBalance`, `postRoyAP18`, `act.cash`; o mesmo com o ato num subselo; o mesmo com `exitFee` e saída por `trust < 12`.
- `evaluateOffer` devolve `p` e `score` exatos para quem quiser; a camada de explicação deveria receber só `band` + partes relativas (ver 1.12).

---

## 3. O que pode ser aprofundado

- **Advogados/agentes do artista**: hoje `advisor18` (`contracts18.ts:146-148`) é 0/1/2 por fama ou caixa, e `managers14` só muda o delta da oferta. Falta o advogado como pessoa (custo, habilidade, estilo) que lê as letras miúdas, pede auditoria, e que o *selo* também contrata (hoje `legal` é um perk de `hq6`).
- **Renegociação por sucesso**: só o artista pede (`rights8.ts:60-71`, 35 % quando `artistPower ≥ 0,45`, a cada 2 anos). Falta o selo iniciar (renegociar para baixo depois de um fracasso, estender depois de um hit, pick-up de opção com bônus automático via `policy18`).
- **Key-man**: existe só na venda do selo (`sale17.cutList:166-172`). Pode ser cláusula do contrato (se o A&R/dono sair, o artista pode sair) e de empresário (`managers14`).
- **Leilões reais com rivais**: `discovery.ts:236-275` leiloa só adiantamento+royalty; `offers12.rivalPackages` já gera pacotes completos dos rivais mas é virtual (não assina). Unir: rival faz lance de pacote de verdade, artista compara com `comparePackages`, o vencedor assina.
- **Publishing como negócio separado**: `ownPublishing` é flag (`business.ts:115-124`) e a fatia é 50 % fixa em `distribute` (`market.ts:514`); `ventures12` tem a editora como carreira. Falta: catálogo de obras com cessão por obra, adiantamento de edição recuperável contra edição (hoje só no lado artista, `artist18.ts:605`), administração para terceiros, co-publishing.
- **Distribuição como serviço**: `license17 'in'` já distribui um rival num mercado; `supply18` tem distribuidoras e a fábrica (`buildPlant`) tem receita fixa. Juntar: vender P&D para outros selos (capacidade da fábrica, prazo, taxa), com o rival aparecendo nas suas vendas e você no risco de devolução.
- **Fusões e aquisições**: `stakes8` + `transferLabel` já cobrem compra/absorção; faltam earn-out para o comprador (o `sale17` só tem para o vendedor), antitruste para quem compra (`stakes8.antitrust` existe só para participação), período de integração (roster duplicado por gênero, saídas), dívida transferida de verdade (`npcAbsorb` ignora `target.debt`).
- **Subselo como empresa real** depende de consertar 1.1–1.3: depois disso, contrato pode apontar para o subselo (party = `sl.id`) com royalties, recoupment e falência de verdade (masters indo a credores).

---

## 4. Sistemas que não se conversam (verificado por grep)

- **Olheiro × cenas por cidade**: `s.scenes[city:genre]` (alimentado em `market.ts` e `scenes12/17/19`) não é lido por `scouting.ts`, `scout11.ts`, `discover18.ts` nem `scout20.ts` (grep: só a *string* "scene" como nome de fonte em `scouting.ts:152`). `scout11.missionWeek:75` pesa só `potential/fame`; `monthlySignals:172-176` pesa só mercado-sede e fama.
- **Fama → valor de mercado → oferta**: quatro avaliadores desconexos — `expectedAdvance` (fama², `contracts.ts:33-39`), `moneyb19.value19`, `contracts2.buyoutPrice:60-65`, `business.labelValuation:31` (`fame × $2.500`). Oferta, cláusula de saída, buyout e preço do selo usam réguas diferentes para o mesmo artista.
- **Relação pessoal → aceitação**: `evaluateOffer` só usa `act.trust` e reputação; o grafo de relações (`agency18.relOf18`, `social8`, `persona13.opinionOf`) entra apenas via empresário (`managers14.ts:130-147`). A relação do dono com o líder da banda não pesa.
- **Equipe sobrecarregada → qualidade das decisões**: `cap14.strain/over` (`gate14.ts:24-25`) é lido só por `capacity14`; `evaluateOffer` (`contracts.ts:144`: `fuzz` só pelo número de analistas), `scouting.widthFor` e `addRecoup18` não sabem que a equipe está no limite.
- **Escola/coral → pool**: ligado (`school18.graduate → addLead18`, `schools19.ts:72-73`), mas a "primeira opção" não liga com os caminhos de assinatura dos rivais (1.6).
- **Empresário do artista × ofertas do jogador**: ligado (`managers14` offer mod; `contracts18.advisor18`). ✔
- **Sucesso do disco → renegociação**: ligado num sentido (`rights8.artistPower`). ✔ Falta o inverso (fracasso → o selo renegocia/engaveta é só `moneyb19` e `contracts18.shelved`).
- **Verba prometida (`offers12`) × recuperável (`contracts18`)**: não ligados (1.9).
- **Cross-collateral de `contracts2` × `recoupable18`**: não ligados (1.17).
- **`deal360_17` × `live18`/`merch17`/`brands`/`events`**: não ligados (1.8).
- **Multa de saída × `endContract`**: não ligados (1.5).
- **Subselo × `distribute`/royalties/fãs/`endContract`**: não ligados (1.1–1.3).
- **Hooks**: todos os módulos da área com `registerSimHook` estão em `src/sim/sys/index.ts` (`scout11`, `offers12`, `deals18`, `discover18`, `contracts18`, `dispute15`, `policy18`, `rights8`, `dossier8`, `merch17`, `license17`, `image17`, `society18`, `bandpay19`, `odds19`, `prof19`, `notify19`, `cancel19`, `stakes8`, `sale17`, `heirs8`, `hq6/hq8`, `campus18`, `school18`, `schools19`, `manager11/12`, `managers14`, `careers12/19`, `services12`, `crew8`, `deleg16`). `deal360_17` e `dossier13` não estão no index, mas o primeiro é importado por `tours.ts`/`route8`/`live/state` (registra `Ext4` no import) e o segundo é só funções puras — ok. `resolveOffers/syncPipeline/checkPromises/monthlySignals` são chamados em `tick.ts:96-105`; `contracts2Month/businessMonth/brandsMonth/subLabelsMonth` em `hooks.ts:51-59`; `resolveThinking` via `lifecycle7.ts:362`. ✔

---

## 5. Ideias para o jogo a partir desta área

1. **Mesa de negociação com rodadas**: hoje é "oferta → aceita/recusa/contra só no adiantamento" (`resolveOne:224-233`). Contraproposta por bloco (`offers12.DIMS`): o artista devolve o pacote com o bloco que mais pesa marcado ("quero os masters de volta em 10 anos, não 20"), com o empresário dele falando (`managers14` já tem estilo e exigência).
2. **Advogado do artista como personagem**: contratável pelo artista (ou pago pelo selo, conflito de interesse), que descobre cláusulas escondidas, pede auditoria e some com estrelas (`dispute15` ganha um ator).
3. **Opções e pick-ups como decisão com prazo**: `calendar19` já lista "opção de renovação"; faltam o cartão "exercer/deixar sair" 8 semanas antes, o bônus de opção automático (como `artist18` faz para selos NPC) e a política em `policy18`.
4. **Subselo com contrato próprio** (party = subselo): royalties, recoupment, P&D para a matriz com taxa, e falência que entrega masters aos credores de verdade — vira uma mini-gravadora jogável por delegação.
5. **Leilão aberto**: quando um ato "esquenta" (`discover18.hot`, `npc17.bidding`), abrir uma tela de lances com 2–3 rivais reais e pacotes completos, prazo de 2 semanas, e a leitura do artista por faixa.
6. **Distribuidora e editora como empresas vendidas a terceiros**: receita de outros selos no seu razão, risco de devolução, cláusula de exclusividade (`license17` já tem a multa) e o rival crescendo com a sua infraestrutura.
7. **Scouting ligado à cena**: olheiro enviado para `city:genre` com calor alto encontra mais e melhor; cena explodindo atrai rivais e encurta o prazo da disputa.
8. **Fama regional → oferta**: usar `fame16` (fama por país) para o adiantamento esperado por território e para ofertas com escopo regional, em vez de fama global única.
9. **Carga de gestão visível nas ofertas**: com a equipe estourada, a faixa de leitura fica mais larga e o artista percebe ("ninguém respondeu minha ligação") — `cap14.strain` já existe, só precisa ser lido.
10. **Renegociação iniciada pelo selo** após flop: cortar royalty em troca de liberar um disco devido ou devolver masters — espelho do que `rights8` faz pelo artista.

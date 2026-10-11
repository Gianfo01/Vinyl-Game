# Revisão G — Rivais, IA, eventos e narrativa (Masters)

Escopo lido: `src/sim/{rivals,rivals2,rivals19,bot,botartist18,botmedia18,botr19,playbot16,playbot17,director,director17,events,events_more,events_more11,takeover,decide18,narrator13,legacy,neural,future,facts17,factmatrix19}.ts` e `src/sim/sys/{rivals8,rivals12,rivalmind18,ai18,intrigue,arcs12,story12,stories8,saga18,sits17,sitsworld17,situations17,dm18,dmsits18,decide18,decnew18,lifeevents10,final18,paths18,wins19,npc17,crime17,crimenpc17,feud18,leaders10,scenarios17,history15,history19,echoes18,echoes19,factlink19}.ts`, mais `tick.ts`, `ext4.ts`, `sys/index.ts`, `contracts.ts` (pontos de contato).

Validação em massa: `scratchpad/check-events.ts` (rodar `MONTHS=36 npx tsx scratchpad/check-events.ts` na raiz). Ele importa o catálogo real (796 eventos / 2.232 opções / 436 com `find` / 360 `forcedOnly`), faz checagens estáticas (placeholders PT×EN, PT==EN, ids duplicados, opção padrão, chaves de ctx usadas × fornecidas) e dinâmicas: 7 partidas (1889, 1925, 1955, 1975, 1995, 2015, 2030) com o playbot, chamando `find()` de todos os eventos a cada mês e formatando título/texto com `ctxParams` (placeholders sobrando, ato/pessoa em estado incompatível, anacronismo por palavra-chave). Saída completa em `scratchpad/reports/events-check.json`.

Resultado geral do script: **0 placeholders não substituídos** em 247 eventos disparados, **0 `find` lançando exceção**, 0 ids duplicados, 0 textos só em PT. Os problemas estão na semântica (opção padrão, estado do alvo, efeitos colaterais do `find`), não na formatação.

---

## 1. Bugs e erros concretos

### ALTA

**B1 [CONFIRMADO] Opção padrão = última opção, e em 83 eventos a última é a pior.**
`src/sim/tick.ts:34` resolve *todas* as decisões pendentes com `defaultOption` ao abrir o mês; `src/sim/events.ts:892` define `defaultOption: def.options[def.options.length - 1].id`; `src/sim/sys/situations17.ts:187` idem para situações. A convenção documentada em `events_more.ts:6-7` ("a ÚLTIMA opção é a mais neutra") é violada em `events.ts` e em `sits17.ts`. O script classificou (com `optTone19`) a última opção de **83 eventos como agressiva/enganosa/arriscada** e **23 com custo ou dano explícito**. Exemplos (jogador que avança sem responder):
- `events.ts:84` `burnout` → `push`: ressentimento +15, 35 % de `health = 'burnout'`.
- `events.ts:100` `voice_strain` → `push`: 50 % de perda permanente de voz (−6..−15).
- `events.ts:176` `child_born` → `insist`: ressentimento +20, confiança −8.
- `events.ts:381` `stage_accident` → `fight`: −$4.000 e 50 % de −$15.000.
- `events.ts:415` `sampling_claim` → `fight`; `events.ts:428` `royalty_audit` → `stall` (confiança −15); `events.ts:457` `payola_exposed` → `deny` (institucional −18, 50 % de multa $40k); `events.ts:207` `member_leaves` → `convince` (paga $3.000 e 45 % sai mesmo assim); `events.ts:736` `neural_vote` → `oppose` (decide a divergência do Arco Neural por omissão).
- `sits17.ts:51` `burnout` → `push` (35 % de surto público); `sits17.ts:139` `blackmail` → `call_bluff` (60 % vaza); `sits17.ts:113` `favor_due` → `refuse` (mágoa forte + rivalidade +15); `sits17.ts:188` `relapse` → `cover`.
Isto contraria "machuca, mas não mata" e a política de `lifeevents10` (`def` explícito e brando). Correção: campo explícito `neutral`/`defaultId` no `EventDef` e no `SituationDef`, com teste que exige tom `cautious` via `optTone19`.

**B2 [CONFIRMADO] Filtro de conteúdo aplica a pior opção em silêncio.**
`src/sim/events.ts:872-875`: evento filtrado (tag em `contentFilters` ou ato com regra RS) → `def.options[def.options.length - 1].apply(s, r, ctx)` sem mostrar nada. Combinado com B1: jogador com filtro `health` recebe o `push` do `burnout` (colapso 35 %); filtro `violence` paga o `fight` de `stage_accident`; filtro `drugs` sofre o `deny` de `coverup_exposed` (institucional −12). O filtro, que deveria proteger, pune sem explicar.

**B3 [CONFIRMADO] `find()` com efeito colateral antes do sorteio ponderado.**
`storyteller` (`events.ts:937-963`) chama `find` de todos os candidatos e só depois sorteia um. `coverup_exposed.find` (`events.ts:122-126`) faz `delete s.flags[k]` ao ser *avaliado*: se outro evento vencer o sorteio (ou se `n` ≥ 2 varrer de novo), o caso abafado some para sempre — `coverup_exposed` nunca disparou nas 7 partidas. `recession.find` (`events.ts:631-632`) seta `s.flags.crash1930 = 1` ao avaliar: no modo histórico o crash de 1930 (48 meses) é perdido se a recessão não for a escolhida naquele mês. Regra "find só lê o estado" existe no comentário de `events_more.ts:6`, mas não em `events.ts` nem em teste.

**B4 [CONFIRMADO] 20 finais: pontuações sobrepostas/dominantes e dois finais dependentes de um sorteio.**
`src/sim/legacy.ts:142-176`:
- `eternal_archivist: 45 + L.catalog*0.15 + s.player.reissues` — `reissues` não tem teto (`market.ts:219` incrementa a cada reedição; `paths18.ts:414` também). Com ~25 reedições supera `voice_scandal` (70) e `creative_singularity` (66): um selo que reedita muito cai sempre no mesmo final.
- `famous_ghost: 58` basta `ghostVoice`, que `startHologramShow` (`neural.ts:110`) liga em qualquer holograma; domina todos os finais de 45–52 (house_of_masters, live_stage, analog_manifesto, last_vinyl, licensed_choir, two_worlds, neural_empire, infinite_catalog, white_noise, the_bridge).
- `the_silence: 62` para qualquer gravadora sem lançamento em 5 anos (bate quase tudo).
- `neural_empire` e `human_renaissance` exigem `s.divergence.neural`, que só `neural_vote` (`events.ts:730-738`) define; a tecnologia `neural` chega em 2036 ± 2 (`rules.ts:37`, `worldgen.ts:39`) e o evento concorre no sorteio ponderado com `n = 0` quando a mesa tem ≥ 4 cartões (`events.ts:929`). [SUSPEITO] que em boa parte das partidas a divergência nunca seja decidida e esses dois finais sejam inatingíveis.
- `fragile_balance: 45` constante e `end_of_bar: 60` (comercial < 25 e indústria < 20) funcionam como ralos.

**B5 [CONFIRMADO] Regra RS e filtros de conteúdo só valem no motor de `events.ts`.**
`a.rs` é lido apenas em `events.ts:866`, `sits17.ts:176`, `media.ts:317`, `people/breakdowns.ts:54`, `bridge17.ts:207`; `contentFilters` só em `events.ts`, `sits17.ts`, `lifeevents10`, `kids17`, `love17`, `sex17`, `vices`, `breakdowns`, `bridge17`. Nenhum dos dois é consultado em `feud18.ts` (tiros/morte, `feud18.ts:199-225`), `crimenpc17.ts` (`assault`/`murder`, linhas 91, 294, 300), `dmsits18.ts` (caso amoroso/`affair`, `tape` com segredo, linhas 103, 252), `sitsworld17.ts` (`muse` → escândalo `sex`, `paparazzi` → `violence`, `tax_exile`), `npc17.ts:608` (briga). Um ato com regra RS reforçada, ou uma partida com filtro `violence`/`death`, continua recebendo escalada de rixa até "Tiros" e cadáver.

### MÉDIA

**B6 [CONFIRMADO] Arco "traição" emite o mesmo cartão duas vezes.** `src/sim/director.ts:212-214`: `case 'betrayal': if (a0) emitEvent(s, r, 'arc_betrayal', …); next(4);` sem checar `arc.stage`, e o arco nasce com `stages = 2` (`director.ts:138`). A opção `amends` cobra `3000 + fama×200` nas duas vezes.

**B7 [CONFIRMADO] "Velhas feridas" lembram qualquer decisão, inclusive boas.** `director.ts:105-110`: `NEGATIVE_KINDS.includes(m.kind) || m.kind.startsWith('decision:')` — toda memória `decision:*` conta como negativa. `memory_return` ("{person} trouxe de volta: '{memText}'") e o arco `betrayal` podem citar "Convite: TV → Aceitar" como mágoa.

**B8 [CONFIRMADO] Rivais usam informação privada do jogador (README §19 promete só pública).**
- `src/sim/sys/rivalmind18.ts:77-98` `dependence18` soma `r.revenue` dos lançamentos do jogador (receita exata) para escolher o alvo.
- `rivalmind18.ts:148-153` e `rivals2.ts:121` leem `a.trust` (confiança do artista no selo) para decidir aliciamento; `rivalmind18.ts:152` ainda *altera* `a.trust`.
- `rivals12.ts:135-145` lê `o.advance` da oferta pendente do jogador para cobrir "+8..18 %".
Proxies públicos existem (paradas, certificações, `rivalReport`, fim de contrato, boatos de `holds17`), mas não são usados.

**B9 [CONFIRMADO] Economia dos rivais não é a mesma do jogador.** `rivals.ts:27` cobra despesa mensal; só quebra abaixo de −$300k (`rivals.ts:79`) e `npcProduction` exige `lb.cash > 0` (`lifecycle.ts:121`): selo negativo passa anos "ativo" sem gravar, só pagando aluguel. Enquanto isso, `rivals8.ts:398-401, 550-552, 570-572, 683-686, 728-731, 784-787` somam `lb.cash += v; lb.revenueYear += v` sem lançamento por trás (reissue, gospel_circuit, sync_deal, royalty_yield, import_license, budget_comp). Esse `revenueYear` fictício alimenta a meta da Carta `emperor` (`legacy.ts:113-116`) e a demissão de líderes por "ano ruim" (`leaders10.ts:352`). `rivals8.ts:421` ainda apaga o produtor de `s.professionals` para sempre quando um rival o "contrata".

**B10 [CONFIRMADO] Eventos escolhem atos em hiato, aposentados ou mortos.** `pickMine` (`events.ts:52-55`) e `pick` (`events_more.ts:42-45`) não filtram `status`; na simulação, 45 eventos dispararam para atos em `hiatus` (`d18_flash_gig` "quer {act} AMANHÃ", `voice_strain`, `grief`, `leak`, `sync_offer`, `paparazzi`, `clone_without_consent`…). `events_more11.ts:633` `r11_intern_demo` sorteia em `Object.values(s.acts).slice(-40)` sem filtrar `status`/`deceased`: em 1925 trouxe "a fita" de um ato `retired` e `deceased`.

**B11 [CONFIRMADO] Decisão consumida sem efeito nem aviso quando falta caixa.** `events.ts:488` (`rival_poach` → `counter`: `if (s.player.cash < bonus) return;`) e `events.ts:588` (`reunion` → `sign`). O cartão some, nada acontece, nenhuma notificação; `catalog_for_sale` tem portão (`decnew18.ts:233`), estes não.

**B12 [CONFIRMADO] Sete motores de "cartão" ignoram narrador, filtros e cooldown.** `narrate()` só é chamado em `events.ts:880,888`. `situations17.ts:185-189`, `dm18.ts:500-503`, `lifeevents10.ts:216-224`, `inbox18` (ai18, rivalmind18, artist18), `rivals12.add()` e `crimenpc17.warn` criam cartões/mensagens sem voz do narrador, sem `filtered()` e sem `eventCooldowns`.

**B13 [CONFIRMADO] Dois sistemas de rivalidade entre atos sem estado comum.** O arco `rivalry` do diretor (`director.ts:127-128`, escolhe `other` por gênero+fama) e a escada `feud18` (`feud18.ts:349-362`) podem correr para o mesmo par ao mesmo tempo; `npc17.beefs` (`npc17.ts:591-609`) e `crimenpc17.streetMonth` (`crimenpc17.ts:259-306`) mantêm um terceiro e um quarto contador (`st.beef`, `st.feud`) — o `feud18` só ouve os fatos de `statement/feud` para "semear", não para sincronizar.

**B14 [CONFIRMADO] `catalog_sale` entrega masters de graça ao rival.** `src/sim/sys/paths18.ts:417-427`: `r.owner = buyer?.id ?? 'indie'` sem debitar `buyer.cash`; o jogador recebe `catFundBid` ("fundos"), mas quem fica com o master é um selo que não pagou.

**B15 [SUSPEITO] Dimensão "inovação" do legado quase sempre ≈ 0.** `legacy.ts:25`: `L.innovation = L.innovation*0.995 + (synthActs > 0 ? 0.2 : 0)`; a única outra fonte é adoção de equipamento em ≤ 2 anos (`economy.ts:190`). Decai 0,5 %/mês e nunca registra formatos/tecnologias adotadas cedo, parcerias de plataforma, etc. `the_bridge` depende dela.

### BAIXA

- **B16 [CONFIRMADO]** `dm18.ts:365-368` fio `feud`: `th.st--; return null` reexecuta a batida de clímax (estágio 1) → notificação "A rixa chegou a '{st}'" repetida a cada ciclo por até 3 anos.
- **B17 [CONFIRMADO]** `events.ts:605` `scene_explosion` fala em "clubes e rádios" e disparou em 1889 (rádio só em 1920).
- **B18 [CONFIRMADO]** `intrigue.ts:207` e `:273` apagam `s.contracts[...]` direto em vez de `endContract` → sem memória `left`, sem `holds17`, sem `rivals8.log`, sem relatório.
- **B19 [CONFIRMADO]** `rivals2.ts:107` deduplica a linha do relatório por `dec.length + lb.roster.length` (colide → linha perdida ou repetida).
- **B20 [CONFIRMADO]** `rivalmind18.ts:305-306` cobra o adiantamento duas vezes (`signWithRival` já debita em `contracts.ts:359`).
- **B21 [SUSPEITO]** `neural.ts:132` repassa ao espólio só quando `rights === 'owned'` (direitos já comprados) e nunca no uso não autorizado (`estateFee` é guardado e nunca cobrado).
- **B22 [CONFIRMADO]** `paths18.ts:408` `dirty_tricks` usa `((s.week*7 + s.year) % 10) < 3` como "sorteio" — previsível e manipulável pela semana.
- **B23 [SUSPEITO]** `events.ts:945` só impede que o personagem do jogador seja alvo em `cat === 'people'`; em papel híbrido `burnout`/`voice_strain` (`health`) podem recair sobre ele.
- **B24 [CONFIRMADO]** `events.ts:805-824` `mergeLabelsSync` não dá baixa no líder (`leaders10` só percebe no fechamento do ano), não limpa `rivalmind18.target/pact` nem avisa quem tem participação (`stakes8`) no selo absorvido.
- **B25 [SUSPEITO]** `rivalmind18.hunt` (`:119`) exige `dep.total ≥ $150k` em centavos convertidos; em 1889–1920 isso raramente acontece → o "rival que aprende" não existe nas eras antigas.
- Math.random / Date.now: **nenhum** no `src/sim` (só `balance19.ts:145` para medir tempo). ✔
- Textos só em PT: nenhum evento; 3 hints iguais em PT/EN são numéricos (`era8_fm`, `era8_disco`, `era8_download`). ✔
- Observação lateral: nas 7 partidas de 36 meses, o playbot `balanced` quebrou em 1889, 1925 e 1975 (`ended = insolvency`) — fora da minha área, mas vale cruzar com a revisão de economia.

---

## 2. Melhorias de código

1. **Motor único de cartões.** Hoje há oito produtores de "decisão com opções": `events.ts` (EventDef), `situations17` (SituationDef → embrulha em EventDef `sit17:*` só para reaproveitar `resolveDecision`), `lifeevents10` (Def/Ch com cooldown, pendências e cutscene próprios), `dm18` (beats com `ask` via inbox), `decide18/echoes` (conseq + inbox), `inbox18` com `actions` (ai18, rivalmind18, artist18), `rivals12.add/respond`, `crimenpc17.warn/replyWarn`, `intrigue.DECISIONS` e `paths18.LABEL_DECS18`. O **motor de fato único** é `Decision` em `s.decisions` + `resolveDecision` (`events.ts:901-921`): é o único que passa por narrador, filtros/RS, cooldown, tensão, `DEC_GATE18`, `runDecisionListeners` (ecos de `decide18`, `arcs12`, `history19`). Proposta: (a) `EventDef` vira o contrato canônico com `neutralId`, `era?: [from,to]`, `techs?: string[]`, `needs?: 'act'|'label'|…`; (b) `situations17`, `lifeevents10` e os `ask` do `dm18` geram `EventDef`/ctx por adaptador e entram em `emitEvent`; (c) mensagens com `actions` do `inbox18` passam por um `emitCard()` que aplica narrador e filtros; (d) `respond` de `rivals12` e `replyWarn` de `crimenpc17` viram opções de cartão.
2. **Pré-condições baratas antes do `find`.** `storyteller` chama `find` de 436 eventos por sorteio (até 2–3 sorteios/mês), e muitos `find` varrem `Object.values(s.acts)`/`allReleases17` *antes* de rolar `r.chance(p)` (`demo_tape`, `reunion`, `catalog_for_sale`, `skiffle_craze`, `r11_intern_demo`…). `situations17.runSituations` ainda itera ~110 `SituationDef` com `actorsPick` embaralhando atos (`dmsits18.pool` faz `r.shuffle(Object.values(s.acts))` 32×). Proposta: campos declarativos `era`/`tech`/`role`/`minFame` avaliados uma vez por mês num bucket (`eligible[def.id]`), `cooldown` já filtra; rolar `chance` antes das varreduras; uma varredura por mês gera a lista de candidatos e os `n` sorteios tiram dela sem repetir `find` (também elimina B3). Índices já existem (`actidx17`, `relidx17`): usá-los nos `find` que ainda fazem `Object.values`.
3. **`find` puro, garantido.** Congelar `s` (Proxy somente leitura) em testes/dev ao chamar `find`, e mover os efeitos (`delete s.flags`, `crash1930`) para `apply`.
4. **Opção padrão explícita + teste.** `defaultOption` positional → `neutralId`; teste `tests/*` que falha se `optTone19(def.id, neutral)` ∉ {cautious, null} ou se o `apply` da opção padrão contém `pay(`/`post(…, -`/`trust -=`.
5. **Pipeline único dos rivais.** `rivalsMonth` (tick), `rivals2Month` (hooks), `rivals8` (hook month+week+year), `rivals12` (week+month), `rivalmind18` (month), `npc17` (month) recalculam `Object.values(s.acts).filter(free)`/`Object.values(s.labels)` várias vezes por selo por mês e escrevem em `lb.cash` sem conciliação. Um `rivalTurn(s, lb, brain)` com candidatos pré-calculados (atos livres por família/mercado), um só ponto de débito/crédito (`labelPost(lb, amount, cat)` → extrato do rival) e a fachada `rivals19` como única API de leitura.
6. **Helpers duplicados** (`pickMine`/`pick`, `members`/`crew`, `pay`/`gain`/`rep`/`mood`/`hiatus`) em `events.ts`, `events_more.ts`, `events_more11.ts`, `decnew18.ts`, `sits17.ts`, `sitsworld17.ts`, `dmsits18.ts` → `sim/events/helpers.ts`.
7. **Exports sem uso** (varredura por nome em `src`+`tests`): `npc17.moveCount`, `crime17.jailPerson`, `crime17.glutN19`, `rivals19.intents19`/`rivalView19` (fachada "para a UI" que a UI não chama). Ou liga à UI ou remove.
8. **`check-events.ts` como teste.** O script do relatório já cobre placeholders, PT×EN, estado do alvo e anacronismos; vale virar `tests/events-catalog.test.ts` (sem a simulação longa, com 12 meses × 3 eras).

---

## 3. O que pode ser aprofundado

- **IA de rivais que aprende de verdade.** `rivalmind18` guarda só quatro memórias (leilões perdidos, alvo de dependência, famílias abandonadas, pacto). Nada aprende *o que funcionou*: o selo não sabe o retorno das próprias apostas por família/mercado, nem o perfil do jogador (paga acima do mercado? renova cedo? deixa contratos vencerem?). Proposta: tabela de crenças por selo (`belief[fam|mercado] = EMA de pico/unidades dos próprios lançamentos`; `playerModel = {overpay, renewLead, dropRate}` estimado de fatos públicos) alimentando `playbookOf` dinâmico e as linhas "porquê" já existentes em `logMove`.
- **Guerras de lances reais.** `rivals12.bidWar` é um contra-lance reativo (+8–18 %) sem orçamento nem preferência do artista. Fazer o artista avaliar as duas ofertas com o mesmo `evaluateOffer` (visão dele), rival limitado por `lb.cash`/playbook, e o "sniped" sair desse mesmo caminho — o jogador perde porque a proposta do outro era melhor *para o artista*, não porque um dado caiu.
- **Estratégia por era.** `playbookOf` é `hash(lb.id)` fixo (`rivals8.ts:204-208`); só `techBettor` e a sucessão de líderes mexem. Tabela de doutrinas por época (anos 50 majors `catalog/tech`; 70 `conglomerate`; 90 `copycat/viral`; 2010 `royalty/platform`) com transições ligadas a `techDates`, e leitura disso no "O que os rivais fizeram".
- **Diretor que lê o estado real do jogador.** `storyteller` só olha tensão e caixa; `dm18.phaseStep` mede rixas/fios/fatos ruins/caixa. Nenhum lê `paths18.main`/doutrinas, a distribuição de `trust` do elenco, os ecos pendentes (`dec18.q`), a meta do cenário ou a ambição (`careers12` só no fio `journey`). Um `DirectorView` mensal (caminho, doutrina, risco de caixa, elenco instável, metas) ponderando `def.weight` por categoria daria eventos coerentes com a partida.
- **Arcos de longo prazo.** `director.ts` fecha em ≤ 30 semanas; `dm18` em 3–4 batidas; só `stories8.cult` dura 4–8 anos. Faltam arcos de década: "o que deixei passar" (ato recusado que vira lenda → tributo/biopic/reunião 20 anos depois, aproveitando `knowledge` e `tribute19`), dinastias de líderes rivais (`leaders10` já tem carreira e sucessão), ciclo de cena nascimento→auge→revival (`movements9` + `revival19`), e a Casa (`saga18`) com mandatos que o diretor cobre.

---

## 4. Sistemas que não se conversam (confirmado por grep/leitura)

1. **Rivais × hype × paradas × produção.** Rivais mexem em `fame/momentum/fans` direto (`rivals8.ts:433-435, 533-534, 561-562, 696-698`) sem `hype12`; lançam com `launchNpcRelease(…, budget)` (escalar) sem `mkt18` (canais/saturação), `media18` (rádio por formato, clipes), `rollout` ou `outlets17`. O jogador e o rival não usam o mesmo motor de produção/divulgação — "campos diferentes" literalmente (`lb.cash`/`revenueYear` × ledger/`fin18`).
2. **Eventos que mudam estado fora do ledger/notificação.** Os cartões do jogador usam `post()` ✔; mas todo o dinheiro dos rivais (`rivals8`, `npc17.priceWars/merch/poaching`, `rivals12.producerFight`, `intrigue.useHook('cash')`) é `lb.cash ±` sem extrato — por isso o relatório mensal não consegue dizer quanto custou uma guerra de preços. `rivalmind18.pressTargets` altera `a.trust` do jogador sem aviso nem fato quando `r.chance(0.4)` falha (`:153`).
3. **Diretor ignora relações e famílias.** `director.candidates` (`director.ts:120-149`) usa só fama/pico/contrato/`rivalries`; não lê `social8` (laços), `kin15`/`heirs8` (famílias), `holds17` (mágoas), `feud18`. `arcs12` e `dm18` leem `holds17`/`social8` mas não conversam com `s.arcs`.
4. **Crime × imprensa × fãs.** `crimenpc17` → `emitFact` → `npc17.onTrouble` (selo larga/banca) ✔ e `bridge17` (manchete genérica) ✔; mas `fans18`/`fan15` não ouvem `arrest`/`crime`/`shooting` (ver `factmatrix19.WILDCARD19`: só `dm18`, `agency18`, `tutorial18`), e a venda de "disco de dentro da cadeia" (`crimenpc17.ts:351`) só mexe em `momentum`, não em hype/paradas.
5. **Finais ignoram os sistemas novos.** `endingScores` (`legacy.ts:142`) lê só `legacy/neural/stats/totals`. Há um *segundo* sistema de final: `paths18.pathEnding18`/`saga18.legacy18` (caminhos com marcos e texto de final próprio) que não entra em `finishArc`. Também ignorados: `ai18` (clones, processo, IA escondida exposta), `post18` (espólios/herdeiros), mortes de `feud18`, `crime17.heat/jail`, escolhas de `history19`, doutrinas de `paths18`, Casa/gerações de `saga18`.
6. **Três sistemas de segredos/espionagem.** `intrigue.secretsOf` (segredos por hash, ganchos), `people/secrets` + `holds17` (segredos "vivos" usados por `sits17.blackmail`, `dm18.secret`, `dmsits18.fear`) e `crime17` (`wiretap`, `blackmail`, `sabotage`). `rivals2.spyOnRival` não usa nenhum deles. `flags.securityUntil` é o único fio comum (`intrigue.ts:146`, `crimenpc17.ts:148`).
7. **Narrador/filtros/RS × outros motores** — ver B5 e B12.
8. **Quatro rivalidades entre atos** sem estado comum — ver B13.
9. **Hooks em `sys/index.ts`:** todos os módulos da área estão importados (`intrigue, rivals8, stories8, lifeevents10, leaders10, rivals12, arcs12, story12, scenarios17, situations17, sits17, sitsworld17, npc17, crime17, crimenpc17, feud18, dm18, dmsits18, decide18, echoes18, decnew18, rivalmind18, ai18, paths18, saga18, final18, factlink19, echoes19, history19, wins19, history15`); `director/rivals/rivals2/neural/legacy` são chamados em `tick.ts`/`hooks.ts`; `takeover.ts` em `worldgen`. O que **não** está ligado: `rivals19.intents19/rivalView19` (ninguém chama), `npc17.moveCount`, `crime17.jailPerson/glutN19`.

---

## 5. Ideias para melhorar o jogo (a partir desta área)

1. **Opção padrão sempre "a mais neutra" + prazo visível** no cartão ("se você não responder até o dia 30, vale: *Esperar*"), com o Conselheiro listando os cartões cuja omissão custa dinheiro. Transforma B1/B2 em mecânica legível.
2. **Rival com rosto e aprendizado explicável.** Cada selo mostra na ficha "o que ele acha que sabe de você" (modelo público: paga caro, deixa vencer, protege estrelas) e "no que ele acredita que dá dinheiro" (crenças por família/era). As decisões citam a crença ("comprou X porque acha que soul vende em Detroit desde 1964").
3. **Leilão do artista como cena.** O artista recebe as propostas na mesa e explica a escolha ("preferi o selo Y: liberdade criativa"), com chance de contrapropor aos dois — a mesma função para jogador e rival.
4. **Uma só escada de rixa** (feud18) alimentada por diretor, npc17, crime17 e arcos: com "foto" na ficha dos dois atos, mediadores em comum (`social8`) e consequências nas paradas via `hype12`.
5. **Finais compostos**: o final do Arco Neural (20) como *capítulo* final do caminho (`paths18`), e epílogo por sistema (espólios, clones, Casa, rixas, crimes) — cada um com uma linha, sem pontuação dominante única.
6. **Rivais com extrato e falência real**: receita só de lançamentos/shows/sync reais; `revenueYear` deixa de ser fictício; "O que os rivais fizeram" ganha "e quanto custou".
7. **Arcos de década** (seção 3) com cartões de "memória que volta" usando `facts17` e `knowledge` (a demo que você recusou em 1962 e virou nº 1 em 1965).
8. **Diretor que respeita a época nos cartões de todos os motores**: `era`/`tech` declarativos também em `SituationDef`/`dmsits18.SETTINGS`/`lifeevents10.Def` (hoje só `lifeevents10` e parte de `sitsworld17` têm).

# Revisão E — Criação, produção, direitos e lançamentos

Escopo lido: `src/sim/production.ts`, `studio.ts`, `repertoire.ts`, `rollout.ts`, `covers.ts`, `rights.ts`, `market.ts` (launch/distribute), `finance.ts` (payAuthors), `sys/rights8.ts`, `rights18.ts`, `creation/core.ts`, `music/*`, `sound.ts`, `project8/12/13.ts`, `session18/19.ts`, `producers15.ts`, `writers19.ts`, `remix19.ts`, `tribute19.ts`, `sync15.ts`, `adsync19.ts`, `quality18.ts`, `recipe12.ts`, `supply16/18.ts`, `industry/*`, `studio12.ts`, `gear19.ts`, `camps18.ts`, `vocals10.ts`, `songsale.ts`, `relinfo.ts`, `relidx17.ts`, `reviews.ts`, `review18.ts`, `explain8.ts`, `why18.ts`, `era1889.ts`, `consent8.ts`, `post18.ts`, `neural.ts`, além de `hooks.ts`, `tick.ts`, `agenda.ts`, `business.ts` (processos), `heritage17.ts` (sample), `events.ts` (reprensagem), `util.ts` (`post`). Nenhum arquivo foi editado.

Legenda: **[CONFIRMADO]** = lido no código, com caminho:linha; **[SUSPEITO]** = provável, depende de caminho de execução. Prioridade: alta / média / baixa.

---

## 1. Bugs e erros concretos

### 1.1 [CONFIRMADO][alta] A sessão de estúdio nunca dispara o hook `'record'`
- `runSimHooks('record', …)` só existe em `src/sim/production.ts:138` (`recordSongs`, caminho da agenda/"gravar agora").
- O caminho principal do jogador — `startSession` → `sessionDay` → `resolveTake` → `fixSong` (`src/sim/studio.ts:199-229`) — fecha a faixa (`song.recorded = true`) sem chamar hook nenhum.
- 20 sistemas registram `'record'` (grep): `rights18.ts:399` (cadastro da obra / split sheet / **autorização de cover fora dos EUA**), `industry/hqedit.ts:134` (bônus de sala/mesa), `furnish.ts:135`, `union20.ts:178`, `regions19.ts:456` (greve), `ability18.ts:532`, `instruments.ts:237`, `talent.ts:39`, `temper.ts:52`, `life.ts:666`, `links19b.ts:121`, `intra19.ts:190`, `ai18.ts:105`, `world4/milestones.ts:440`, `project12.ts:311`, `project13.ts:243`, `music.ts:13`, `sound.ts:1050`.
- Só quatro compensam com varredura ("sweepSessions"): `sound.ts:1052-1062`, `music.ts:18-32`, `project12.ts:364`, `project13.ts:263` — prova de que a lacuna é conhecida, mas parcial.
- Consequências visíveis: a política "split sheet no estúdio" (`rights18.pol.split`) nunca marca `reg=2` para faixas de sessão → o hook de `launch` (`rights18.ts:415`) grava `reg ??= 1` → disputas de crédito acontecem e `courtOdds18` fica em 0,45 em vez de 0,80 (`rights18.ts:481`); covers gravados em sessão fora dos EUA nunca entram em `st.clr` (não há "autorização da editora"); equipamento de sala (`hqedit`) e mobília (`furnish`) não melhoram faixas de sessão.
- Correção: chamar `runSimHooks('record', s, r, { song })` no fim de `fixSong` e remover as varreduras duplicadas.

### 1.2 [CONFIRMADO][alta] Fase *deluxe* do rollout cobra o marketing duas vezes
- `src/sim/rollout.ts:147` `pay('ro_deluxe:…')` lança `-ph.budget` como marketing; na linha 148 o mesmo `ph.budget` entra em `marketing: [{channel, budget: ph.budget}]` do `scheduleRelease`, cujo `releaseCost` (`production.ts:230-233`) soma a verba de novo e lança `relplan:…` (`production.ts:259`).
- As fases `single` (109) e `album` (131) **não** chamam `pay()` — padrão correto. Só o deluxe paga em dobro.

### 1.3 [CONFIRMADO][alta] Cover/regravação: a edição da obra alheia é dividida como se fosse do ato que regravou
- `src/sim/market.ts:490-500` (`distribute`): `publishing = 10% do bruto`; `pubToPlayer` vem de `terms.pubShare` do **contrato do ato que gravou o cover**; `act.cash += publishing*(1-pubToPlayer)*0.5` vai para o **ato que fez o cover**; só `payAuthors(…, publishing*0.5)` (`finance.ts:16-35`) chega aos autores originais.
- Resultado: o selo cobra "sua fatia da edição" de uma composição que não é sua; o detentor/editora original não recebe nada além dos 5% dos autores pessoas físicas (que são `personalCash`, fora da economia dos selos). O cabeçalho de `rights18.ts:2-3` promete "a edição de toda versão paga os autores da obra" — paga metade.
- Mesmo problema de fonte: `makeCover` (`studio.ts:311-314`) cobra licença mecânica fixa de $300 para qualquer dono; `makeRemix` (`318-326`) e `planTribute` (`340-355`) não cobram licença alguma; `rerecord18` (`rights18.ts:647`) usa `makeCover`. Para tributos, `tribute19.license19` só paga quando o **jogador** é o dono do original — tributo do jogador sobre obra de NPC nunca paga o NPC.

### 1.4 [CONFIRMADO][média] Sample sem liberação: dois sistemas processam o mesmo sample; outros nunca processam
- `src/sim/business.ts:302-308` (`suitsMonth`): `fileLawsuit` para `unclearedSamples` (status `!== 'cleared'`) até 4 semanas após o lançamento.
- `src/sim/sys/heritage17.ts:93-110` (`sampleSuits`): para `status === 'uncleared'`, acordo pago imediato e `req.status = 'cleared'`. Os dois podem disparar para o mesmo sample (pagamento duplo: acordo + processo).
- Inversamente, `studioCleanup` (`studio.ts:360`) corta `s.samples` para os últimos 80 → um sample não liberado antigo some e nunca gera processo nem congela edição (`frozen18` lê `s.samples`, `rights18.ts:224`). [SUSPEITO quanto à frequência]
- `requestSample` (`studio.ts:273`) usa `s.player.cash >= fee` em vez de `freeCash20` (todos os outros gastos da área usam `freeCash20`).

### 1.5 [CONFIRMADO][média] Estúdio da sede (tier 0) sem limite de salas nem exigência de sede
- `startSession` (`studio.ts:92-128`) não confere `s.player.hq >= 1` nem `hqCaps(s).sessions`; só bloqueia **uma sessão por ato** (linha 95). N atos podem gravar simultaneamente na "garagem" com `STUDIO_TIERS[0].cost = 0`.
- A agenda faz a checagem certa (`agenda.ts:277`: `tier === 0 && (s.player.hq < 1 || !takeSession())`) e a UI (`ui/panels/studio.ts:73`) oferece todos os tiers. Dois caminhos, duas regras.

### 1.6 [CONFIRMADO][média] Produtor com agenda em dois lugares
- `cancelSession` (`studio.ts:243-248`) não libera `s.producerBusy[producerId]`; e `sessionDay` pausa a sessão em hiato (`studio.ts:151`) enquanto `producerBusy` (fixado em `startSession`, linha 122, pela duração nominal) expira → o produtor "sai" de uma sessão ainda aberta e pode ser contratado por outro ato/rival (`rivals12.ts:282`, `producers15.ts:159`).
- Há dois registros de agenda (`s.producerBusy` e `p15.book`, `producers15.ts:166-168`), escritos juntos mas lidos separadamente (`bookedBy` vs `startSession`).

### 1.7 [CONFIRMADO][média] Créditos/royalties de autoria que não chegam a quem tem direito
- Topliners de camp: `camps18.ts` guarda `topShare[sg.id]` ("ficam com x% da edição") mas o valor só desconta o cachê de pitch (`pitchSong18`: `pt.fee*(1-top)`); nunca entra em `song.splits`/`payAuthors`. Grep: `topShare` não é lido fora de `camps18.ts`.
- Compositor contratado creditado: `creation/core.ts:328` `(songX).credit = w.name` — "leva parte da edição" — jamais deduzido.
- Participação (feat) pelo caminho `inviteFeature` (`creation/core.ts:350-357`): `share: 0.2` armazenado em `features`, nunca pago; o caminho `feats8` tem contrato próprio com `lastRev/paid`. Dois sistemas de feat com economias diferentes. Em `distribute`, os `guestPts` (`rights.ts:188`, `market.ts:472-474`) são lançados como `pts` sem beneficiário (`postRoyAP18(s, undefined, …)`) — o convidado não recebe. [SUSPEITO]
- `pitchSong` (`repertoire.ts:353`) manda 100% da taxa para o selo; `closeSale` (`songsale.ts:89-91`) divide com os autores. Mesma ação, duas políticas.

### 1.8 [CONFIRMADO][média] Fonte de verdade de Q é ambígua e há dupla contagem no bônus de engenheiro
- Fórmula canônica: `production.ts:18-23` (com renormalização para instrumental). `events_more.ts:1886` reimplementa inline **sem** o caso instrumental.
- Após gravar, `song.q = applyMods('songQ', songQ(song))` (`production.ts:123-125`, `studio.ts:221-223`) pode ser **maior** que `songQ(song)` (perks de banda da casa, `session18.ts:95`). Qualquer lugar que depois faça `song.q = songQ(song)` apaga esse bônus silenciosamente: `events_more.ts:1886`, `neural.ts:158,196`, `vocals10.hireSessionSinger` (que tenta compensar com delta), `music/state.refreshQ`.
- `studio12.ts:229-231` (mod `songQ`): aumenta `song.production += add` **e** soma `(delta)*0.4` ao Q. O peso da produção na fórmula é 0,20 — o engenheiro da casa conta em dobro (e o `song.production` já alterado será recontado por qualquer `songQ(song)` posterior).
- A estimativa de Q de faixa não gravada (`songQ({...song, performance: melody*0.6, production: 30})`) está copiada em ≥10 lugares (`production.ts:59`, `studio.ts:265,300`, `repertoire.ts:209`, `creation/core.ts:331`, `sound.ts:460`, `writers19.ts:139,224`, `camps18.ts`), apesar de existir `refreshQ` em `music/state.ts`.
- Fórmula de produção na gravação diverge entre os dois caminhos: `production.ts:121` (`own = ownStudioProduction + hqCaps.sessions*2`, produtor `staffSkill*0.22`, ruído σ5) vs `studio.ts:214` (`own + 2`, produtor `pr.skill*0.25*fit`, ruído σ4). O número de salas da sede melhorar a produção (`hqCaps(s).sessions*2`) é estranho. [SUSPEITO quanto à intenção]

### 1.9 [CONFIRMADO][média] Autópsia/"Por que deu nisso?" omite fatores que mexeram no apelo depois do lançamento
- `rel.autopsy` é fechada em `market.ts:201`. Depois, alteram `rel.appeal` sem registrar: crítica em `media.ts:114` (`×(0.92+avg/60)`), re-pontuação pela sonoridade em `sound.ts:1030`, cópia de timbre `sound.ts:921` (`×0.97`), deluxe `rollout.ts:149` (`×1.15`), sync `sync15.ts:171`, vazamento de white label `remix19.ts:269`. Só capa (`covers.ts:293`) e capa×som (`sound.ts:1012`) são anotados.
- `explain8.ts` reconstrói o fator "crítica" com `(score-62)/60` — fórmula diferente da que realmente entrou (`0.92+avg/60`). O fator `marketing` guardado (`1+2.5E`) também não é o termo semanal real (`market.ts:318`: `1+2.5E·e^(-age/9)+0.3E`); `explain8` normaliza por 1,75 — aproximação.

### 1.10 [CONFIRMADO][média] Cancelar lançamento não devolve a capa
- `releaseCost` (`production.ts:232`) inclui `coverCost`; `cancelRelease` (`275`) e `project8.unscheduleProject` (`295`) devolvem só prensagem + marketing. Viola "cancelar não cobra" (GDD §27) para `COVER_STYLES` de $500–1400.

### 1.11 [CONFIRMADO][média] Sync "ressuscita" o disco mudando `rel.week`
- `sync15.ts:170`: `rel.week = s.week - 53`. `dealOfRelease` (`rights.ts:184`) escolhe o contrato pela `base.week` → um disco de 1975 passa a ser liquidado pelo contrato vigente em "semana atual-53" (ou por nenhum); `explain8`/`review18`/`chartUnits` por idade também mudam. `rel.year` fica antigo (week/year inconsistentes).

### 1.12 [CONFIRMADO][média] Sessões de músicos de estúdio só "tocam" em músicas compostas há ≤5 semanas
- `session19.ts:216-219` (`playMonth`) e `session18.ts:124` filtram `so.createdWeek > s.week-5` — `createdWeek` é a semana da **composição**, não da gravação. Música escrita há 2 meses e gravada hoje nunca recebe ás nem crédito → a cadeia documentário→rancor→processo raramente dispara para o fluxo normal.

### 1.13 [CONFIRMADO][baixa] Remasterização: três caminhos, e o primeiro cobra antes de garantir o lançamento
- `creation/core.ts:503-514`: cobra `remaster:…`, faz `remasters.push(relId)` e só então `scheduleRelease` — se falhar (caixa para prensagem), o custo foi pago e o disco fica "já remasterizado nesta geração" para sempre (`remasters` nunca é limpo por tecnologia).
- Outros dois caminhos: `post18.ts` projeto `remaster` (receita fixa, sem lançamento) e `ui/panels/misc.ts:112` (reedição "(Remaster)" com `reissueOf`). Três custos e três efeitos para a mesma ação.

### 1.14 [CONFIRMADO][baixa] Chave única do ledger descarta cobranças legítimas (e silenciosamente)
- `util.ts:57-60`: chave = `${week}:${key}`; duplicata na mesma semana retorna `false` e **nada é cobrado**, mas a ação acontece. Chaves sem id único: `cover:${act}:${src}` (`studio.ts:313` — segundo cover da mesma música na semana sai de graça), `transl:${src}:${lang}` (335), `rec:${act}:${ids}` (`production.ts:132`), `p12rush:${p.id}` (`project12.ts:200`), `clrs18/clrc18:${id}:${week}` (`rights18.ts:597,606` — tentar de novo na mesma semana é grátis e, pela seed `clr:${id}:${week}`, dá o mesmo resultado).

### 1.15 [CONFIRMADO][baixa] Reprensagem: dois preços, nenhum checa caixa
- Evento `events.ts:552`: `units*1.1+400` (ignora `pressingCost`: matéria-prima, grau, fábrica, desconto de escala) e não confere caixa (pode negativar). `scenes/life.ts:287` (`factoryOvertime`): `pressingCost×1.25` com `freeCash20`. Não existe ação de reprensar fora de evento/cena (UI só menciona em `ficha.ts:115`).

### 1.16 [CONFIRMADO][baixa] Formato indisponível na era não é validado na API
- `validateRelease` (`production.ts:209-221`) não confere `p.formats ⊆ availableFormats(s)`. Hoje todos os chamadores passam `availableFormats`, mas um `PendingRelease` pode ficar até 26 semanas na fila (`project8.planOf`) e cruzar a troca de formato; `launchPending` não revalida.

### 1.17 [CONFIRMADO][baixa] Equipamento comprado sem efeito
- `EQUIPMENT.effect.catalog` (cofre de masters $6k, arquivo digital $15k) e `effect.performance` (câmara de eco) **nunca são lidos** (grep: só `production`, `pressing`, `marketing`, `fatigue` são consumidos — `production.ts:79,181`, `live.ts:47`, `market.ts:89`).

### 1.18 [CONFIRMADO][baixa] Outros
- Rollout: `planRollout` exige só 30% do orçamento (`rollout.ts:61`) e `pay()` usa `s.player.cash` (88), ignorando a reserva de ofertas do r20 (`freeCash20`).
- Masters revertidos (`rights8.ts:42` → `owner='indie'`): `dealOfRelease` devolve `undefined` e `hasExploit` responde `true` ("sem ficha, o selo administra") → `scheduleAnniversary` (`rollout.ts:179`) aceita reeditar master que já não é do selo (a UI filtra candidatos por `owner`, a API não). [SUSPEITO]
- `coverCriticBonus` (`covers.ts:235`): `(hash%3)-1 > 0` → +0,3 em 1/3 dos casos, −0,3 em 2/3; o comentário sugere moeda.
- Remix de catálogo que pega: `remix19.ts:214` soma `v` inteiro a `rel.revenue` mas o selo recebe `v*split` → `annualRevenue`/`catalogValue`/`recoupTail20` inflados pela parte do DJ.
- `session18` mês: `busy` = "faixa gravada e composta há <5 semanas" (`session18.ts:124`), mesma confusão de 1.12.
- `Math.random`/`Date.now`: nenhum uso na simulação (só `balance19.ts:145` para cronometrar) ✓. Estoque negativo: não encontrado (`market.ts:369` limita por `rel.stock`) ✓. Fases do rollout fora de ordem: não ocorre — `rolloutsWeek` roda toda semana (`tick.ts:75`) e `video` (w+2) sempre encontra o single lançado em w+1 ✓.

---

## 2. Melhorias de código

1. **Uma função de gravação.** `recordSongs` (production.ts) e `fixSong` (studio.ts) são a mesma conta com constantes diferentes (1.8). Extrair `closeTrack(s, r, act, song, ctx: {tier, approach, producer?, perf})` que: calcula produção/performance/originalidade, aplica `applyMods('songQ')`, grava `studioTier/approach/producerId`, **dispara `'record'`**. Os dois caminhos passam a chamá-la; as quatro `sweepSessions` somem.
2. **Fonte de verdade de Q.** Regra: `song.q` só é escrito por `closeTrack`/`refreshQ`; proibir `song.q = songQ(song)` solto (lint/grep). Perks que querem mexer em Q devem mexer nos atributos (`production`, `performance`) e deixar `refreshQ` recalcular — isso elimina a dupla contagem de `studio12`. Mover a estimativa "não gravada" para `refreshQ` e apagar as 10 cópias.
3. **Quem está gravando — um só contexto.** Hoje a resposta está espalhada: `s.sessions` (studio), slot `record` da agenda, `project8.projectSession`, `session19.on[sid]`, `ag17.sess` (coletivos), `sess18.hb` (banda da casa), `studio12` (engenheiros), `gear19.main` (instrumentos), `hqedit` (salas), `recipe12.studioContext`. Criar `recordingContext(s, song)` que resolve tier/produtor/engenheiro/músicos/sala/equipamento uma vez e é lido por Q, por `quality18.computeDims18` e por `sound.recordPulls`.
4. **Edição de obra ≠ master.** Em `distribute`, derivar a edição de `song.writers`/`splits` e do **dono da obra** (`coverOf`/`sampleOf`/`remixOf` → obra original), não do contrato do ato que gravou. `payAuthors` já recebe a obra; falta a parte do selo/editora original (1.3).
5. **Um tipo `EditionPlan`** para deluxe/limitada/box/aniversário/remaster. Hoje: rollout `deluxe`/`limited` (`rollout.ts`), `project12.chooseNext('deluxe')`, `project13.EDITIONS` (deluxe/limited/box — só multiplicadores, sem lançamento), `post18` (box/remaster — receita fixa), `creation/core.remaster`, `misc.ts` remaster, `supply18` variantes. Cada um com custo, tiragem e efeito próprios.
6. **Três sistemas de capa**: `covers.ts` (7 estilos, censura por mercado), `project13.ARTS` (5 artes, "lojas recusam"), `creation/core.setCover` (nota 0–100 → museu). Um disco pode levar penalidade "provocativa" duas vezes. Unificar em `covers.ts` e fazer `project13` apenas escolher o estilo.
7. **Chaves do ledger**: padronizar `post(s, key, …)` com id único (`nextId`) ou `${week}:${seq}`; ter um helper `charge(s, key, cost, …)` que retorne erro quando a chave já existe em vez de "executar de graça".
8. **`bumpAppeal(rel, mult, key, label, confidence)`** que multiplica `rel.appeal` **e** anota em `rel.autopsy`; substituir os seis `rel.appeal *= …` soltos (1.9). `explain8` passa a ler só a autópsia, sem reconstruir a crítica.
9. **`validateRelease`** deve validar formatos (`availableFormats`) e `launchPending` revalidar; `scheduleRelease` deve ser o único criador de `Release` (hoje `tribute19.sign19` monta um `Release` à mão com `formats: []`, `live: false`).
10. **`rel.week` imutável**: para "reviver" catálogo (sync15, revival19) usar `rel.revivedWeek` e fazer `decay`/`chartUnits` lerem `max(week, revivedWeek)`; `dealOfRelease` continua lendo `week`.
11. **Dois avaliadores de catálogo** (`rights.catalogValue` e `rights18.catVal18`) com fórmulas diferentes — manter só `catVal18` e fazer a ficha de Direitos usá-lo.
12. **`cancelSession` deve liberar `producerBusy`**; `sessionDay` deve estender `producerBusy` quando pausar por hiato.

---

## 3. O que pode ser aprofundado

- **Mixagem e masterização como decisões.** `music/data.ts` ainda tem as etapas `comp/arr/rec/mix` e o foco (`setFocus`/`focusFit`), mas os mini-jogos saíram (`music.ts:1-2`) e "master" é só um campo morto em `SongComp.master`. Falta: mono×estéreo (1958–68), *loudness war* (1995–2010, afeta `quality18.dur` e crítica), Atmos (2019+, hoje só em `post18.tech18`). A dimensão `tech` do `quality18` já é o lugar natural para receber isso.
- **Estúdio lendário.** `project13.LOCS.legendary` é um +3/+1 fixo. `gear19.studioKits19` (`STUDIOS19` + `STUDIO_KIT19` com `dims`) é só informativo (UI `gear19.ts`). Conectar: escolher um estúdio real em `startSession` → tier, `recordPulls`, dimensões `quality18`, fila/agenda (reaproveitar `studio12` bookings, que hoje só existem para o estúdio **próprio**), engenheiro da casa (ex.: "o som daquela sala").
- **Direção artística de álbum.** `quality18.sequence18/bestOrder18` e `cohesion` existem (UI `art18.ts`); faltam: conceito/tema consistente (`songTheme` por faixa já existe), faixa-título, interlúdios, "lado A/lado B" por era, escolha de faixa de trabalho com efeito real no `hook` (hoje o single do rollout é escolhido automaticamente em `project8.rolloutProject`).
- **Edição musical como negócio.** `rights18` já tem sociedades, caixa preta, subeditoras e administração de catálogos (`adm`); `writers19` tem ghostwriters/ofertas; `camps18`/`songsale` vendem canções. Faltam: contratar compositores com adiantamento e prazo (hoje `hireWriter` é aluguel mensal sem obra registrada), covers de NPCs sobre o seu catálogo gerando mecânicos (hoje só `heritage17.COVERS17` reais e tributos), e o detentor original recebendo quando o jogador faz cover (1.3).
- **Catálogo antigo em streaming.** `market.ts:321` dá uma cauda fixa (`appeal·0.012·(1+fame/40)`); `revival19`, `remix19` e `tribute19.catalogLift19` injetam unidades à mão. Aprofundar: playlists de catálogo (`stream18` por fonte de descoberta), remaster/reedição que realmente muda `appeal` do original, aniversários automáticos de NPCs, sync sem "reviver" hackeando `rel.week`.
- **Remasterização e box sets.** Unificar (2.5) e dar substância: qualidade do remaster dependente de fitas preservadas (ligar `EQUIPMENT.effect.catalog`, hoje morto — 1.17), *bonus tracks* do cofre (`s.vault`), encarte/fotos (`post18.box`), colecionadores (`supply13.collYear`) e variantes (`supply18`).
- **Produtor como pessoa.** `producers15` (reais), `studio12.prod` (você como produtor), `quality18.chemistry18` e `recipe12.SIG_TILT` descrevem o produtor quatro vezes. Um produtor com agenda, ego e química únicos, que também é "contratável como engenheiro".

---

## 4. Sistemas que não se conversam (mas deveriam)

Todos os módulos da área estão importados em `src/sim/sys/index.ts` (creation, music, sound, project8/12/13, session18/19, producers15, writers19, remix19, tribute19, sync15, adsync19, quality18, recipe12, supply16/18, industry, studio12, gear19, camps18, songsale, explain8, why18, era1889, consent8, post18, review18, rights8, rights18); `covers.ts` registra o hook `launch` por ser importado de `production.ts`; `vocals10` entra por `production.ts`. Os hooks estão registrados — o problema é o que **não é lido**:

| Ligação esperada | Estado | Onde |
|---|---|---|
| Traços/humor do artista → qualidade da sessão | Parcial: `takeQuality` lê só moral/fadiga (`studio.ts:134`); persona (abertura, perfeccionismo) e `lifeMoments` só mexem nos **eixos sonoros** (`sound.ts:338-350`), não em Q; `big_ego` só briga com produtor ego>70 (`studio.ts:217`). `stress17`/`moodOf` não entram no take. | ligar `moodOf`/`stressOf` em `takeQuality`; `openness` em originalidade |
| Equipamento comprado → qualidade | `EQUIPMENT.production` só no tier 0 (`ownStudioProduction`); `catalog`/`performance` nunca lidos (1.17); `gear19.main` → `quality18` ✓; `hqedit`/`furnish` só pelo hook `record` que a sessão não dispara (1.1) | — |
| Engenheiro/produtor contratado → som | `staffSkill('engineer')` só reduz chance de `techIssue`; produtor → `sound.recordPulls` ✓ e `quality18.prodFit18` ✓; engenheiro de `studio12` só via mod `songQ` com dupla contagem (1.8) | engenheiro deveria puxar eixo "polido" e `tech` |
| Capa → censura por país | `covers.ts:279` codifica mercados "conservadores" à mão (asia/africa/latam<1990); não lê `GEOPOLITICS.censorshipLevel`, `regions19` (censura/exílio) nem `movements9` (fase `repression`) | usar o nível de censura do país da época |
| Projeto → rollout → marketing | `project8.rolloutProject` ✓, mas `rollout.mainChannel` (`rollout.ts:72-77`) ignora os canais que o jogador escolheu no projeto; só o clipe passa por `mkt18.addChannel18` (saturação/público) — singles e álbum usam o `marketing[]` antigo | rollout deve usar `p.marketing` e `addChannel18` |
| Direitos vendidos/revertidos → receita do catálogo | Reversão ✓ (`distribute` paga só o artista); venda/leilão de catálogo (`money19`/`sale17`) fora do escopo; dois avaliadores (`catalogValue` × `catVal18`) divergem | — |
| Cover → relação com autor original | `makeCover` não toca `opine`/`holds17`/fama do original; só tributos (`tribute19`) e regravações pelo próprio artista (`rights18 rr`) têm efeito; autorização de cover só via hook `record` (1.1) | cover de hit alheio deveria gerar `catalogLift` e opinião |
| Sessão → quem tocou (créditos) | `session19.playMonth` só anota ases em faixas compostas há ≤5 semanas (1.12) | ler a semana de gravação |
| Produtor real → `quality18.chem` | `chemistry18` conta discos juntos ✓, mas `producers15.opine` (relação com você) não entra na química nem na recusa de sessão (`refuses` só <−35) | — |
| Camps/topliners → royalties | `topShare` morto (1.7) | — |
| Feats (dois sistemas) → royalties | `creation.features.share` morto; `feats8` paga; `guestPts` sem beneficiário (1.7) | fundir em `feats8` |
| Sync ↔ direitos | `sync15.candidates` respeita `USE_BLOCK18` ✓ e `syncMasterShare` ✓; mas o sync "revive" quebrando `dealOfRelease` (1.11) | — |
| Era 1889 → gravação | `acousticFit1889` só mexe no **apelo** (perks); não altera `song.production/performance` nem os eixos `po/el` da sonoridade; `electronicCap` cobre o eletrônico, não a corneta | perk `production` por gênero na era acústica |
| IA/consentimento → crítica e paradas | `consent8` ✓ apelo/chartUnits; `neural.aiVoiceSongs` e `post18.ai_album` são dois caminhos de "voz IA" com regras diferentes (`post18` chama `posthumousRelease` só para `vault`) | — |

Exportados sem uso relevante: `camps18.topShare`, `creation.features[].share`, `creation.songX.credit`, `EQUIPMENT.effect.catalog/performance`, `music/state.refreshQ` (existe, ninguém usa), `SongComp.master/mix` (campos mortos), `rights.catalogValue` (UI antiga) vs `catVal18`.

---

## 5. Ideias de jogo a partir desta área

1. **Mesa de mixagem como decisão de 3 cliques por disco** (voz na frente/atrás, cru/polido, alto/dinâmico) que alimenta `quality18` (`acc`, `tech`, `dur`) e a crítica de cada era; o engenheiro contratado decide a qualidade da execução.
2. **Estúdios reais reserváveis** (Abbey Road, Muscle Shoals, Hansa, Sunset Sound — já em `STUDIOS19`): fila, preço por dia, "som da sala" (eixos), engenheiro da casa, e a chance de cruzar com um ato rival gravando ao lado (feat/rixa).
3. **Produtor como relação** única: opinião (`producers15.opine`) + química (`quality18`) + ego → aceita/recusa, cobra mais, impõe assinatura (`recordControl`), pode largar no meio (sessão pausada de verdade, com `producerBusy` coerente).
4. **Editora como jogo próprio**: contratar compositores com adiantamento e cota de canções; registrar obras; covers de NPCs sobre o seu catálogo pagando mecânicos; "standard" que vira renda perpétua; a **outra ponta** — ao fazer cover de obra alheia, pagar o detentor certo (1.3) e ganhar/perder relação com ele.
5. **Catálogo vivo**: reedição de aniversário com *bonus tracks* do cofre, box com encarte e variantes, remaster que exige fitas preservadas (cofre de masters passa a valer), playlists de catálogo e sync sem truques — cada um mudando o apelo do **mesmo** disco, anotado na autópsia.
6. **Capa com consequência real por país**: a censura usa o nível do país/época e o escândalo da capa tem data e manchete (`press`), não só `×0.92`.
7. **Direção de álbum**: escolher faixa-título, single de trabalho (o jogador decide, não `rolloutProject`), ordem (`bestOrder18` como sugestão, não imposição), e "lado A/B" por era com efeito em `coh`/`seq`.
8. **Créditos como moeda social**: split sheets assinados de verdade na sessão (hoje a política não funciona para sessões — 1.1), topliners/feats/ghostwriters/ases com participação que paga e com rancor quando não paga (as cadeias já existem; falta o dinheiro e o hook).

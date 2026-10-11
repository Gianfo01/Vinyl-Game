# Revisão A — Núcleo de tempo e capacidade (Masters)

Escopo lido integralmente: `src/sim/tick.ts`, `hooks.ts`, `ext4.ts`, `ext.ts`, `sys/index.ts`, `agenda.ts`, `capacity.ts`, `calendar19.ts`, `slots19.ts`, `sys/agenda7.ts`, `sys/agenda17.ts`, `sys/calendar19.ts`, `sys/capacity14.ts`, `core/rng.ts`, `rng19.ts`, `util.ts`, `types.ts` (GameState), `xtypes.ts` (Plan/ExtState), `travel.ts`, `travelAdapter.ts`, `worldgen.ts`, `worldpolicy20.ts`, `start17.ts`, `sys/start17.ts`, `past20.ts`, `prov20.ts`, `era.ts`, `era19.ts`, `core/save20.ts`, mais `ui/app.ts` (doAdvance/tx20), `ui/store.ts` (migrate), `sys/pacing8.ts` (advanceUntil).

Verificação por execução (scripts em `scratchpad/cap_audit.ts` e `scratchpad/prof_audit.ts`, rodados com `npx tsx`):
- `[A] loadNow=131` (agenda > 100% com plano) · `[B] personLoad=81, overbooked=0` para o mesmo ato · `[C]` plano do mês corrente vira `started` e nunca entra em `planSlots` · `[D]` determinismo 4 meses OK (JSON idêntico, 2,75 MB) · perfil: 1 432 ms/mês em 1975, 73 % em ganchos.
- `tests/r14-capacity.test.ts` passa (5/5) — os testes não cobrem planos.

---

## 1. Bugs e erros concretos

### 1.1 [CONFIRMADO] [alta] Agenda passa de 100 % quando há plano iniciado e agenda manual
`src/sim/agenda.ts:92`
```ts
const capLeft = freeCapacity(s, act) + agendaLoad(s.agenda[actId] ?? []);
```
`freeCapacity` (agenda.ts:40-46) já devolve `100 − (carga da pessoa − carga da própria agenda)`, ou seja, já exclui a agenda do ato. Somar `agendaLoad(own)` de novo dá `100 − outros + própria`. Com agenda manual de 81 % (gigs 12 datas + entrevista) e plano `record` (50 %) começando no mês seguinte, o script mediu `s.loadNow = 131`. O comentário na linha 89 ("a agenda é cortada até caber em 100%") descreve a intenção, não o que acontece. O caminho delegado não sofre porque `defaultAgenda` já desconta os planos (agenda.ts:51).
Correção: `const capLeft = freeCapacity(s, act);` (e `kept` começa pelos planos, como já faz).

### 1.2 [CONFIRMADO] [alta] Plano iniciado no mês corrente é invisível para `personLoad` (e para tudo que depende dele)
`src/sim/capacity.ts:67-68`
```ts
// plano já iniciado no mês atual entra pela agenda
if (p.status === 'started' && idx === monthIndex(s)) continue;
```
Mas o plano **não** entra em `s.agenda`: `processPlayerAgendas` mescla `planSlots` só na variável local `slots` (agenda.ts:90-96) e grava a carga real apenas em `s.loadNow`. Resultado medido: ato com carga real 131 % aparece com `personLoad = 81`, `actCapacity.max = 81`, `overbookedActs = 0`. Afeta: gancho mensal de cansaço/esgotamento (`sys/capacity14.ts:351`), `busyWhy`/`actCapacity`/`overbookedActs` (UI), `checkCapacity` para reservas e sessões no mês corrente (capacity.ts:103-128) e `fitOverAgenda` (capacity.ts:218). Só `freeCapacity`/`setAgenda`/`defaultAgenda` compensam somando `agendaLoad(planSlots(...))` à mão (agenda.ts:51, 71).
Correção: em `personLoad`, não pular o plano iniciado (remover a linha 68) e, em `freeCapacity`/`setAgenda`, parar de somar `planSlots` separadamente — uma única fórmula (ver §2.1).

### 1.3 [CONFIRMADO] [média] Reserva para o mês corrente com o mês já aberto "vaza": nunca executa, nunca cobra, ocupa capacidade
- `reservePlan` aceita `startMonth === now` (capacity.ts:137 só recusa `< now`).
- `startPlans` roda apenas em `openMonth` (tick.ts:42), que já passou quando o jogador avançou por semana (`doAdvance('week')`, ui/app.ts:263).
- No mês seguinte o plano vira `started` (capacity.ts:188-201), mas `planSlots` exige `now < startMonth + months` (capacity.ts:176) → lista vazia; no outro mês vira `done` (capacity.ts:184-187).
Medido: `[C] mês=23521 plan.status=started planSlots=[]` → `done`, sem lançamento no extrato. Durante esse tempo a reserva conta em `checkCapacity` de outros meses.
Correção: em `reservePlan`, se `startMonth === now && s.clock.opened`, recusar ("mês já em curso") ou iniciar imediatamente e enfileirar em `ag7`.

### 1.4 [CONFIRMADO] [média] Cancelar plano iniciado não para a fila semanal e libera o mês atual
`capacity.ts:152-156` marca `done` e encurta `months`. Dois efeitos: (a) `personLoad`/`planSlots` deixam de contar o mês corrente na hora (contradiz o comentário "o atual não volta"); (b) as semanas 2–4 do plano já foram enfileiradas em `x4.ag7.queue` por `processPlayerAgendas` (agenda.ts:105) e `runQueued` (sys/agenda7.ts:99-114) não consulta `s.plans` → a ação continua acontecendo depois de "cancelada".

### 1.5 [CONFIRMADO] [média] `registerSimHook` substitui em silêncio; `live-festival` registrado duas vezes
`src/sim/ext4.ts:225-230` troca o gancho pelo mesmo id sem aviso. `registerSimHook('month', 'live-festival', …)` existe em `sys/live/festival.ts:328` e em `sys/fest12.ts:829`; como `sys/index.ts` importa `./live` (linha 8) antes de `./fest12` (linha 102), o de fest12 vence. O comentário em fest12 diz que é proposital, mas: depende só da ordem de import, `runEdition` de live/festival.ts virou código morto (único chamador é o gancho substituído) e nenhum teste garante que só um roda. Os outros 424 registros têm id único (verificado por grep).
Sugestão: `registerSimHook` lançar/avisar em duplicata e um `replaceSimHook` explícito; teste que lista ids.

### 1.6 [CONFIRMADO] [baixa] `freeCapacity` subtrai slots por pessoa de forma diferente de `personLoad`
`agenda.ts:42` usa `agendaLoad(todos os slots)`; `personLoad` (capacity.ts:76) ignora slots `scope:'person'` de outra pessoa. Para um slot pessoal de um membro, `free` fica inflado para os demais membros pelo valor daquele slot.

### 1.7 [CONFIRMADO] [baixa] Documentação × código dos slots
`agenda.ts:1` e `README.md:28` dizem "4 slots (3 para iniciantes)"; `slotsFor` (agenda.ts:27-29) devolve 6 / 5.

### 1.8 [CONFIRMADO] [baixa] Campo morto no estado
`types.ts:685` `undo?: string` nunca é lido/escrito (o desfazer vive em `store.undoSnapshot`, ui/app.ts:195-253).

### 1.9 [CONFIRMADO] [baixa] Avisos de calendário no `tick.ts`
- `contractsMonth` (tick.ts:153): janela `8 < left ≤ 13` conferida por mês; com meses de 4 semanas, `left` 13 → 9 cai duas vezes na janela ("vence em ~3 meses" repetido).
- `genresMonth` (tick.ts:185): gênero com `born === startYear` recebe "Surge um novo gênero" e `genrePop = 0.55` no fecho de janeiro do 1.º ano, sobrescrevendo o valor semeado em `worldgen.ts:308`.
- `techMonth` (tick.ts:216): tecnologia cujo ano é o próprio `startYear` nunca é anunciada (o "mês 0" do ano inicial nunca chega por `closeMonth`).

### 1.10 [SUSPEITO] [média] Migração de `x4` só preenche a chave de topo
`ext4.ts:207-211` (`ensureExt4`) cria o estado de um sistema só se `x4[key] === undefined`; campos novos dentro de um estado antigo não ganham default. Alguns sistemas se defendem (`cal19` calendar19.ts:289, `rng19` rng19.ts:383, `era9` era.ts:29-30), mas `ag7` (sys/agenda7.ts:41) acessa `templates`, `combos`, `done`, `queue` sem guarda. Um save em que `ag7` nasceu sem `combos` dá `TypeError` em `before()` (agenda7.ts:78) → tx20 reverte o turno todo e o save fica inavançável. `MIG20` (save20.ts:217) está vazio, então nada corrige isso.
Sugestão: `ensureExt4` fazer merge raso `st.x4[key] = { ...init(), ...st.x4[key] }` quando ambos forem objetos simples.

### 1.11 [SUSPEITO] [baixa] Nenhuma validação de coerência `day` ↔ `week` ↔ `year/month` ↔ `clock`
`schemaProblems20` (save20.ts:235-247) só confere `year`/`month`; `migrate` (ui/store.ts:215-227) não toca em `day`/`week`/`clock`. Se `day` faltar ou estiver inconsistente, `daysInCurrentMonth` (tick.ts:46-49) vira `NaN`, o `while` não entra e `closeMonth` propaga `NaN` para `s.day`/`s.year`. `s.week` é derivável de `s.day + clock.dayInMonth` (semana absoluta = `floor(dia/7)`, consistente com `weekOfMonth19`), logo é estado duplicado que a migração poderia recalcular.

### 1.12 [SUSPEITO] [baixa] "Semana 1–4" da agenda não é a semana do mês
As semanas são absolutas desde 1/jan do ano inicial (`tick.ts:66`: `(day + 1) % 7 === 0`); um mês tem 4 ou 5 fechamentos e o primeiro pode cair no 1.º dia. `ag7.weekNo` (sys/agenda7.ts:117-121) incrementa por fechamento, então a "semana 2" pode rodar no 2.º dia do mês e a "semana 4" pode sobrar para o fecho (`runQueued(99)`). Além disso `slotWeek` (agenda.ts:121-124) usa o índice na lista: quando planos entram primeiro (agenda.ts:93), slots manuais sem `week` deslizam para semanas posteriores, mudando combos e `releaseWeek`.

### 1.13 [CONFIRMADO] Determinismo e transação — sem bug encontrado (registro do que foi checado)
- Sem `Math.random`/`Date.now`/`new Date()` no sim (`balance19.ts:145` usa `Date.now` só para medir tempo; `cloud17.ts` só para ids de nuvem; `ext4.ts:56` `performance.now` só com `__hookProf`).
- `Rng` sfc32 muta o array do save no lugar (rng.ts:259); `rng19` cria fluxos por chave com `seedState(seed|rng19|key)`; `cap14`/`agenda17` usam `Rng.fromSeed(seed|…|ano|mês)`. Script `[D]`: duas partidas iguais, 4 meses, JSON idêntico.
- Ordem de ganchos = ordem de import em `sys/index.ts`; todas as 9 fases têm exatamente 1 ponto de chamada; `DEC_GATE18`, `CTXFX19`, `CS_HOOK19`, `NOTIFY19`, `rentOn19`, `setEventRegistrar`, `setAgendaHooks`, `setDelegationHooks`, `setActionNameLookup` são todos atribuídos (grep).
- Iteração `for..in`/`Object.keys` sobre `s.acts`/`s.persons` após `delete` (prune) é estável porque os ids têm prefixo (nunca inteiros) e `JSON.stringify` preserva a ordem de inserção.
- Turno transacional: `tx20` (save20.ts:312-317) tira `JSON.stringify(g)` antes e restaura via `migrate(JSON.parse)`; o mesmo snapshot serve de desfazer (ui/app.ts:195-199). Estado de módulo mutado no meio do turno é seguro nos casos existentes: `facts17.depth` e `hype17.QUICK` com `try/finally`, `paCache` com `try/finally`, `GENRES` ressincronizado por `registerMovementGenres` no `migrate`, caches por identidade (`WeakMap<GameState>`, `sound.CACHE {s, day}`) invalidam porque o objeto restaurado é novo. Vale escrever essa regra ("estado de módulo só com try/finally ou chave por identidade") no cabeçalho de `ext4.ts`.
- `any`: nenhum nos arquivos da área. Mas há dezenas de casts `s as unknown as { x4: … }` (agenda7.ts:41, rng19.ts:381, calendar19.ts:287, era.ts:27, start17.ts:19) que escondem erro de tipo — um `x4Of<K extends keyof Ext4>(s, key)` tipado em `ext4.ts` eliminaria todos.

---

## 2. Melhorias de código/arquitetura

### 2.1 Fonte de verdade da capacidade — hoje são três fórmulas e quatro lugares de estado
| Lugar | O que guarda | Lido por |
|---|---|---|
| `s.agenda[actId]` (agenda.ts) | slots do mês, persiste entre meses quando manual | personLoad, UI |
| `s.plans` (capacity.ts) | reservas futuras (% por pessoa) | personLoad (exceto mês atual!), planSlots |
| `x4.ag7.queue/done` (sys/agenda7.ts) | o que ainda vai rodar nas semanas 2–4 | só ag7 |
| `s.loadNow[actId]` (agenda.ts:97) | carga real do mês depois de mesclar planos | `dynasty.ts:133,147`, `sys/leisure14.ts:443` — e mais ninguém |

Três cálculos de "quanto o ato tem livre": `freeCapacity` (agenda.ts:40-46), `capLeft` (agenda.ts:92) e `personLoad` (capacity.ts:61-85). Os bugs 1.1/1.2/1.6 são consequência direta. Proposta: uma função `loadOf(s, personId, idx)` = agenda efetiva (slots + planos iniciados, filtrando escopo por pessoa) + planos futuros + turnês, e `freeOf(s, act, idx)`; `freeCapacity`, `setAgenda`, `checkCapacity`, `actCapacity`, `cap14` e a UI (`ui/actions20.ts:294-299`) passam a usar só isso; `s.loadNow` some (derivável).

### 2.2 Dois limitadores paralelos para a mesma agenda
`slotsFor`/`usedSlots` (6 slots, `record` = 2) **e** `agendaLoad ≤ 100 %`. A UI aplica os dois (`ui/actions20.ts:294-299`, `ui/panels/artists.ts:222,257`); `setAgenda` (agenda.ts:68-75) só aplica o segundo; `defaultAgenda` os dois. Um deles é redundante — a carga em % é a régua que o resto do jogo (planos, turnês, cap14) entende.

### 2.3 Nomes que enganam
- `src/sim/slots19.ts` contém apenas `rentOn19` (aluguel da sede) — nada de slots; mover para `economy`/`careers19`.
- `sys/agenda17.ts` é o tempo do **jogador** (bolinhas, carreiras, contratação, músicos de sessão — 536 linhas, 4 assuntos); `sys/capacity14.ts` mistura três orçamentos (membros %, bolinhas, carga por função). Separar "tempo do dono" (life/agenda17/gate14) de "tempo dos atos" (capacity) e "carga da equipe" (capacity14 WORK) em módulos com nome do que medem.
- `calendar19.ts` + `sys/calendar19.ts` estão bem divididos (leitura pura × provedores) — é o modelo a seguir.

### 2.4 Performance do tick (medido: 1975, 677 atos, 1 191 pessoas, 2 043 músicas)
- 1 432 ms/mês; 73 % em ganchos registrados (372 ganchos). Top: `week:charts7` 2,05 s/12 meses (12 %), `compose:sound` 5 %, `month:fame16` 4,9 %, `week:hype12` 4 %, `month:situations17` 2,3 %, `month:npc17` 2,1 %, `month:lineup16` 2,1 %. Fase `month` = 6,9 s, `week` = 3,0 s, `day` = 8 ms (o passo diário é barato; a granularidade diária não é o custo).
- Snapshot `JSON.stringify` para tx20: 77 ms por avanço (5 MB) — e `saveGame('auto')` serializa de novo logo depois (ui/app.ts:233). Reaproveitar a string do snapshot pós-turno para o autosave, ou serializar uma vez por avanço.
- `tourDaysInMonth` (capacity.ts:53) cria `new Date` por parada × pessoa × chamada; `personLoad` é chamado por membro em `cap14` e na UI a cada render. Pré-calcular `monthIdx` por parada ao agendar a turnê.
- `registerMovementGenres` roda a cada `advanceWeek` (tick.ts:59) e de novo em `monthlyExt` (hooks.ts:47): varre `GENRES` inteiro 5–6× por mês; basta no `openMonth` e no `migrate`.

### 2.5 Infra de ganchos
- `registerSimHook`: modo estrito contra id duplicado (1.5); teste que compara a lista de ids com um snapshot.
- `ensureExt4`: merge raso de defaults (1.10).
- `tx20`: hoje a UI é a única a usar; `bot.ts`, `playbot16.ts`, `balance19.ts`, `pacing8.advanceUntil` chamam `advanceMonth/advanceWeek` cru — ok para headless, mas `advanceUntil` dentro do `tx20` da UI está coberto (ui/app.ts:206).

---

## 3. O que pode ser aprofundado (stubs, valores fixos, "simplificado")

- **Semana da agenda é cosmética** (1.12): marcar `week: 3` só muda a ordem de execução dentro do mês; não há dia, nem conflito real com datas de turnê (que são diárias em `tourDay`). O tick já é diário (`dailyStep`), então a agenda poderia ter dia e cruzar com `s.tours[].stops[].day`.
- **Planos** (capacity.ts): `months` e `load` vêm fixos de `actionMeta`; `costEst` é só estimativa e `startPlans` bloqueia por caixa sem olhar inflação (`money()` do ano da reserva); um plano é apenas "repetir a ação N meses" — sem efeito acumulado nem progressão.
- **Travel** (travel.ts) é rico e determinístico, mas o sim usa só `legInfo` (`km/days/cost/visa.denyChance/boycott` em tours.ts:111,224-225). `Visa.processingDays`/`RoutePlan.leadDays` só aparecem na UI (`ui/map.ts`, `ui/panels/misc.ts`): o prazo de visto nunca entra no tick nem no calendário (`calendar19`). `planRoute` usa "30 dias por mês" (travel.ts:387, 406) enquanto o resto do jogo usa calendário real.
- **Capacidade de equipe** (capacity14.ts:262-279): `per` fixos por função; esgotamento com `r.chance(0.3/0.4)`; `p.health = 'burnout'` é curado por outros sistemas (life.ts:820, leisure14.ts:404, health.ts:148) sem relação com a carga que o causou.
- **era.ts**: 6 novidades; `seed()` (era.ts:37-42) desbloqueia de graça tudo que já existia — sem custo, sem escolha para quem começa em 2000 com tudo "comprado".
- **rng19**: 32 fluxos nomeados, mas a agenda (`r.chance` em agenda.ts:88, 225, 268), lifecycle e boa parte do fecho do mês seguem no fluxo único `s.rng`; uma ação a mais do jogador desloca os sorteios de tudo que vem depois no mesmo mês — o objetivo do rng19 ("um fluxo por sistema") está pela metade.
- **interruptReason** (tick.ts:259-267) é uma heurística de 4 linhas sobre notificações; `calendar19` já sabe o que "pede ação" (`Deadline19.act`) e `decide18` sabe o prazo dos cartões.
- **worldpolicy20**: `simDeath20`/`simCareer20` são distribuições uniformes (62–95 anos; 6–39 anos de carreira) sem relação com gênero/época/vícios — honesto como v2, mas raso.

---

## 4. Sistemas que não se conversam

1. **processPlayerAgendas × personLoad** — a carga real do mês (planos mesclados) vive em `s.loadNow`; `personLoad`/`cap14`/`checkCapacity` não a veem (1.2). Medido: 131 vs 81.
2. **cancelPlan × ag7.queue** — cancelar não tira da fila semanal (1.4).
3. **interruptReason/advance('quarter'|'event') × calendar19/decide18** — o avanço longo para em qualquer `notify(..., 'event')` (ex.: "Nova tecnologia", "Novo movimento") e ignora prazos com `act: true` do calendário único; `askAdvance19` (UI) já usa decide18 antes de avançar, mas o laço interno não.
4. **s.loadNow** — escrito por agenda.ts, zerado por hooks.ts:64, lido só por `dynasty.ts:133,147` e `leisure14.ts:443`; todo o resto usa `personLoad`. Dois "quanto esse ato está ocupado" com respostas diferentes.
5. **slotsFor/usedSlots × agendaLoad** — dois limites para a mesma lista (2.2).
6. **live/festival.ts `runEdition` × fest12 `runEdition12`** — duas edições de festival; a primeira só sobrevive como gancho substituído (1.5).
7. **travel.ts × tick** — `processingDays`/`leadDays`/`boycott` calculados e mostrados na UI, mas só `denyChance` e `boycott` têm efeito no sim (tours.ts); nenhum prazo de visto no `calendar19`.
8. **yearOfWeek (util.ts:28, aproximado por `week*7`) × weekOfMonth19/dayOfDate (exatos)** — duas conversões semana↔data; `yearOfWeek` ainda é usado em `sys/industry/supply13.ts`, `ui/rightsView.ts`, `ui/sys/rights8.ts`, `audio/spec.ts`.
9. **s.week × s.day + clock.dayInMonth** — estado duplicado sem validação (1.11).
10. **Exportações sem uso externo** (grep em src+tests): `tourDaysInMonth` (só interno), `GameState.undo` (nada), `live/festival.runEdition` (só o gancho morto). O resto da área (`fitOverAgenda`, `movePlan`, `crunch19`, `nextMonthWeek19`, `noteDeadline19`, `dropDeadline19`, `scoutInPerson`, `deskLines`, `staffRows`, `withPlayerActsCache`, `settleCash`) tem pelo menos um chamador.
11. **ag7 "semana" × calendário real** — `releaseWeek` (agenda7.ts:64-70) e `crunch(…)` de agenda17.ts:89 calculam "semana do lançamento" cada um à sua maneira (`pr.week − monthStartWeek + 1` vs `pr.week ∈ [s.week−1, s.week+5)`).

---

## 5. Ideias para o jogo a partir desta área

1. **Agenda diária de verdade**: cada ação com dia (ou faixa), conflitos reais com datas de turnê e sessões, viagens com dias de deslocamento (travel.ts já dá `days`) — a "semana 1–4" vira calendário que o jogador vê no `calendar19`.
2. **Uma régua de tempo para todo mundo**: membros (%), você (bolinhas) e equipe (carga por função) na mesma unidade e no mesmo painel; conflito explica "quem, quando, por quê" como `checkCapacity` já faz para membros.
3. **Vistos com prazo**: `leadDays` vira prazo no calendário (kind `tour`), com negativa sorteada no dia do consulado e plano B (trocar cidade, pagar despachante) — hoje é só um número no planejador.
4. **Planos encadeados como projeto**: compor → gravar → prensar → lançar com dependências, datas previstas no calendário e risco de atraso (fábrica, visto, esgotamento), em vez de reservas soltas que repetem uma ação.
5. **"Avançar até o próximo prazo que pede ação"**: modo de avanço dirigido por `calendar19` (`act: true`) em vez de notificações — menos paradas falsas ("Nova tecnologia") e nenhuma decisão vencendo por padrão sem querer.
6. **Semana cheia e picos como mecânica visível**: `crowdedWeeks`/`before()` já cansam mais; mostrar o pico (semana de lançamento, festival) consumindo capacidade automaticamente e permitir "adiar uma semana" como decisão.
7. **Esgotamento ligado à causa**: `cap14.over[id]` (meses seguidos acima de 100 %) poderia alimentar a recuperação (quanto mais tempo acima, mais lento volta) em vez de `health='ok'` vindo de três sistemas sem memória.
8. **Novidades de época com escolha** (era.ts): quem começa depois herda tudo desbloqueado; alternativa: começar com um orçamento de "modernização" e decidir o que adotar primeiro.

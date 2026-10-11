# F — Shows, turnês e festivais (revisão de código)

Escopo lido: `src/sim/{live,livesnap20,tours,route16,tourhook18,travel,travelAdapter,tick,hooks,capacity,agenda}.ts`, `src/sim/sys/{live,live18,live19,shows20,showops20,clash17,route8,tour12,tour12,fest12,fest18,fests8,venue12,venues17,circuit17,circuits18,union20,exch20,insure19,crew8,ceremonies8,merch17,charity19,contests19,idols18}.ts`, `src/sim/sys/live/*.ts`, `src/ui/panels/tours.ts`, `src/ui/sys/{live,live18,tour12,route8}.ts`, e grep de hooks/mods em todo `src/`.
Além da leitura, rodei dois scripts (`scratchpad/estvsreal.ts`, `scratchpad/cancels.ts`, via `npx tsx`) que criam partidas (1975/1990/2005/2015), marcam uma turnê de 6 datas e comparam previsão × acerto.

Legenda: **[C]** = confirmado lendo o código (e, quando indicado, medido); **[S]** = suspeito. Prioridade: alta / média / baixa.

---

## 1. Bugs e erros concretos

### 1.1 [C][alta] Previsão de bilheteria ≠ acerto — continua diferente (R20 só igualou kit e concorrência)
- Previsão (`src/sim/tours.ts:106`): `sold = min(cap, demand·(1+PB)/priceMult^1.2)`; receita = `sold·price·clash` (`:115-117`).
- Acerto (`src/sim/tours.ts:259-269`): `sold = min(cap, (demand + partnerDraw)·quality/priceMult^1.2·ruído)`, onde
  `quality = clubBonus·(0,75 + q/200 + stage/250)·coverPenalty·(1+PB)·outdoorFactor·TOUR18.q` (`:262`), e depois `gross = applyMods('showRevenue', …)` (`:269`) com **~25 modificadores** registrados (fame15, fame16, talent, ability18, identity, sound, audience8, era8, soc18, scene12, stress17, crime17, union20, live-tickets, traj18, instruments, fan15, af19, proj12, links18, eras18, artist18, shared18, clash17…). A previsão aplica **só** o `clash`.
  Todos esses fatores (setlist q, talento de palco, covers, clube, clima do mês, elasticidade pp18, mods de fama/talento) são **conhecidos no momento do planejamento**.
- Medido (`estvsreal.ts`, 4 seeds headline, pay='door'): público real = **77–80 % do previsto**; fatores do post‑mortem no 1.º show: "Qualidade do show = 0,75; Setlist (covers) = 0,75". O próprio `registerExplain('live18.show')` (`live18.ts:493`) admite: "Fatores multiplicam a previsão do planejador".
- Há **quatro cópias** da fórmula de público esperado: `tours.ts:106`, `live18.ts:145-148` (`expSold`), `showops20.ts:85-91` (`soldEst`, **sem** `clash`, apesar do comentário "mesma fórmula do planejamento"), `explain12.ts:152` (`forecastTour`, **sem** bônus de produção nem papel `co`). E `tour12.ts:122-163` (`demandOf/predict`) é um quinto estimador, com outra base (`localDraw`).
- UI (`src/ui/panels/tours.ts:42-47`): o painel vivo mostra **"Saldo previsto" = bilheteria bruta (100 %) + merch − logística**, enquanto o acerto paga ao artista 65 % da porta (`tours.ts:272`) e ao selo só a `share` (`:285-292`). Na mesma tela, `labelTourNet16` (`route16.ts:187`) usa 0,65 → dois números incompatíveis lado a lado.

### 1.2 [C][alta] Abertura (opening): cachê previsto × pago e público "emprestado"
- Previsão de cachê (`live18.ts:149-151 expPay`) usa a fórmula de porta para qualquer papel; o acerto paga fixo `150 + fame·20` (`tours.ts:273`). Medido: cachê previsto **$44.520 → real $1.098 (2 %)**.
- Público do opener soma o draw do headliner **inteiro** (`tours.ts:261,264`: `partnerDraw·(opening ? 1 : 0.5)`), e a previsão só usa `demand·0.3` → medido **222 % do previsto**. Esse público inflado vira fãs do opener em `tours.ts:294-296` **e de novo** em `live18.ts:243-247` (+3 % "abertura para {p}") — conversão em dobro.

### 1.3 [C][alta] Planejador deixa marcar cidade em mercado com shows proibidos → cancelamento garantido e logística perdida
- `estimateTour/planTour` não consultam `liveBlocked` (só `route8.ts:164` filtra). No dia, `tours.ts:214-219` cancela com `note = blocked.name` e **não devolve nada**.
- Dados agravam: `src/data/content.ts:555` (Guerra do Vietnã 1964–75) e `src/data/hist19.ts:399` (Guerra do Golfo 1990–91) têm `touringBlocked: true` com `markets: ['asia','na']` → **nenhum show na América do Norte entre 1964 e 1975** (Woodstock impossível) nem em 1990–91.
- Medido (`cancels.ts`): turnê NY→SF/Austin em 1975 → 3/6 datas "cancelled (Guerra do Vietnã)"; Londres→NY/Toronto/LA em 1990 → 3/6 "Guerra do Golfo".

### 1.4 [C][média] Visto cobrado e sorteado **por perna**, não por país; prazo de visto ignorado
- `tours.ts:95,108-112` (estimativa) e `:222-230` (acerto) chamam `legInfo` perna a perna; cada entrada no mesmo país paga `visa.cost` de novo e rola `denyChance` de novo. `travel.ts:389-401 planRoute` já deduplica ("Visto já obtido nesta turnê") e expõe `processingDays` — **não é usada pelas turnês**. Uma turnê de 7 dias pode exigir visto de 120 dias.
- Medido: Londres→NY/Toronto/LA = 3 vistos de $2.080 (8 pessoas) e 3 sorteios independentes.

### 1.5 [C][média] Visto negado / mercado bloqueado: o ato "chega" à cidade mesmo assim
- `tours.ts:212` faz `s.location[act.id] = st.cityId` **antes** de `liveBlocked` (`:214`) e da rolagem de visto (`:225`). O ato fica localizado numa cidade onde não entrou; a perna seguinte parte dali.

### 1.6 [C][média] `costReserved` inclui o que o promotor cobriu → reembolso/seguro/alteração sobre dinheiro que o selo não pagou
- `route8.ts:336-339` lança `r8cover` (promotor paga casas e produção) mas **não reduz `t.costReserved`**. Depois: `cancelTour` devolve 50 % de `costReserved` (`tours.ts:180`), seguro paga 90 % de `costReserved/stops` por data cancelada (`live18.ts:397`), `changeTour20` recalcula sobre ele (`showops20.ts:159`) e `closeTour` usa como custo do selo (`live18.ts:360`).

### 1.7 [C][média] O mesmo ato em dois lugares: `planTour` só olha `s.tours`
- `tours.ts:138` impede duas turnês, mas ignora: datas de agente/promotor (`c12.shows`, `tour12.ts`), festivais (`fest8.lineup`), residência de cassino (`live/venue.ts:140-152`, só reserva 55 % de capacidade), residência em casa própria (`venues17.ts` policy `residency`, `venue12.ts` noite `residency`), intercâmbio (`exch20.ts`). O inverso (`tour12.actBusy`, `tour12.ts:80`) olha turnês. `showConflict20.hard` (`shows20.ts:255`) só avisa na UI.
- Status `hiatus` (`types.ts:204`) não impede nada: `tourDay` (`tours.ts:207`) e `fests8.runEditions` (`:237`) só pulam `retired/split`.

### 1.8 [C][média] Fadiga: 4 camadas numa turnê, **zero** fora dela; gancho `show` só dispara em `tours.ts`
- Por show de turnê: `tours.ts:304` (+2,5 + viagem − equipe), `live18.ts:258` (kit), `live/notes.ts:200` (nota de cansaço ≥ 60), `route8.ts:396` (intensidade). Não é "2× do mesmo", mas o post‑mortem não discrimina.
- `runSimHooks('show')` só existe em `tours.ts:268`. Logo: shows de agente/promotor (`tour12.ts:264-325`), shows da agenda (`live.ts:52-101`), festivais (`fests8.ts:223-259`, `fest12.ts:672`), residências e cerimônia **não** aplicam fadiga a pessoas (tour12 usa `c.fat` abstrato), não alimentam saúde (`people/health.ts:169`), talento (`talent.ts:59`), fãs por região (`terr20.ts:211`), cambistas (`clash17.ts:174`) nem o snapshot do prêmio "Ato ao Vivo do Ano" (`livesnap20.ts:22`) — o prêmio só vê turnês de `tours.ts`.

### 1.9 [C][média] Merch sem estoque e em triplicata
- `tours.ts:275-282`: receita de merch por show com `mq = s.merch[act]?.quality ?? 40` — **vende mesmo sem lote nenhum**; quando há lote, faz `sold += sold·0,12` **sem checar nem decrementar `stock`**.
- `brands.ts:156-171` vende do mesmo `s.merch` todo mês; `merch17.ts:58` dobra a demanda "Banca na turnê" com estoque próprio. Três sistemas de merch somam receita do mesmo público.

### 1.10 [C][baixa] Cachê de festival vai 100 % ao selo, mesmo em contrato clássico
- `fests8.ts:245` `post(... slot.fee, 'live')` para qualquer ato "meu"; na turnê (`tours.ts:285-292`) a bilheteria é do artista no clássico e dividida no 360. Inconsistente (e `fest12` usa um gancho próprio `ownPaid19`).

### 1.11 [C][baixa] Seguro de pessoa‑chave paga "shows cancelados" sem show cancelado
- `insure19.ts:105,112-115`: qualquer fato `breakdown/health/rehab` com gravidade ≥ 35 paga 20 % da cobertura com o texto "cobre {v} dos shows cancelados de {a}" — não verifica nenhuma parada cancelada. O seguro de turnê (`live18.ts:394-398`) está correto: só paga com `st.note` (sinistro real).

### 1.12 [C][baixa] Turnê cancelada por ato aposentado/separado deixa paradas `scheduled`
- `tours.ts:207-209` seta `t.status='cancelled'` sem marcar as paradas; `closeTour` (`live18.ts:351`) não vê cancelamentos, seguro não paga, `cancelTour` não devolve nada.

### 1.13 [C][baixa] Intercâmbio (`exch20`) ignora o caixa reservado e o calendário
- `exch20.ts:91` compara com `s.player.cash` em vez de `freeCash20` (regra R20 "gastos respeitam o caixa reservado a ofertas"). A residência não muda `s.location`, não reserva capacidade (`checkCapacity`) e não impede turnê simultânea (só `tourRisk +0,01`, `:122-127`).

### 1.14 [S][baixa] Brasil penalizado duas vezes
- `live/notes.ts:132`: `market === 'br' && year ≥ 1940 → ×0,85` em `showRevenue`, além da elasticidade/poder de compra de `pp18` (`live18.ts:179,233`). Também: o mod lê `lv.cur` (estado global setado no gancho `show`, `:170`) — um canal lateral frágil.

### 1.15 [S][baixa] Promotor "dividindo receita negativa"
- `route8.ts:385`: `amount = fee + (doorShare − 0,65)·gross`; `doorShare` pode chegar a 0,35 (`:301`) → `amount` negativo → `payAct` lança `post` negativo em `live` e, no clássico, `a.cash += negativo` (o artista devolve dinheiro ao promotor) sem aviso. Em `tour12.ts:120` o `prom` negativo é esperado (o promotor é o jogador).

### 1.16 Itens checados e **OK**
- **Dia 7 da semana** [C]: `tick.ts:62-66` (`day = s.day + dayInMonth`, `s.week` só sobe depois do `dailyStep`) e `clash17.ts:107-111` leem `weekOfDay(dia)` nos dois lados — corrigido. Resíduo cosmético: `post()` grava o show do 7.º dia na semana anterior do extrato (`util.ts:59-67`).
- **Math.random** [C]: nenhum na área (só o comentário em `live/notes.ts:315`); incidentes da agenda usam `r` (`live.ts:88`), show ao vivo usa `Rng.fromSeed` por `${tourId}:${dia}` (`notes.ts:319`).
- **Público > capacidade** [C]: `tours.ts:264`, `live.ts:55`, `tour12.ts:280`, `fests8.ts:232`, `fest12.ts:690` todos limitam; `live19.ts:186` permite até 1,3×cap de propósito (festival grátis).
- **id `turnê:dia`** [C]: sem colisão (dia avança ≥ 1 por parada, `tours.ts:98-122`). Frágil: `route8.ts:378` acha a parada por `cityId && sold === sh.sold`; `notes.ts:165` cai em "última jogada nesta cidade".
- **Festival com mortos** [C]: morte seta `retired + deceased` (`lifecycle7.ts:150`) e `fests8.ts:237`/`fest12.ts:87` filtram `retired/split`. Falha só para `hiatus` e para `ceremonies8.ts:158-171` (toca mesmo aposentado/morto) [S].
- **Cancelamento × ingressos** [C]: `tours.ts` não tem pré‑venda real (nada a devolver); `fest12` devolve (`:628,679`); `tour12.cancelShow` devolve só depósito. "Esgotou em X minutos" (`notes.ts:176`) e "cambistas lucraram" (`clash17.ts:174-184`) não movem dinheiro — são só texto.
- **Preço por mercado 2×** [C]: aplicado uma vez (`live18.ts:179` no `q`, `:233` no merch); a previsão não o aplica nenhuma vez.
- **Hooks registrados** [C]: `sys/index.ts` importa `live`, `fests8`, `ceremonies8`, `crew8`, `route8`, `tour12`, `fest12`, `venue12`, `venues17`, `clash17`, `merch17`, `circuit17`, `live18`, `fest18`, `circuits18`, `idols18`, `insure19`, `live19`, `charity19`, `contests19`, `scenes19`, `exch20`, `union20`, `showops20`. `fest12` substitui o gancho `live-festival` de `live/festival.ts` pelo mesmo id (sem edição dupla).

---

## 2. Melhorias de código (duplicação e fonte da verdade)

1. **Um `showmath.ts`** com `expectedSold(s, act, stop, ctx)` e `settleStop(...)` compartilhados por `estimateTour` (`tours.ts:106`), `expSold` (`live18.ts:145`), `soldEst` (`showops20.ts:85`), `forecastTour` (`explain12.ts:152`), `predict` (`tour12.ts:148`) e `gigEstimate` (`live.ts:30`). Hoje são **seis** fórmulas; a previsão deveria chamar exatamente a função do acerto com `noise = 1` e `applyMods('showRevenue')` (existe até `previewShowRevenue` em `notes.ts:397`, usada só em teste).
2. **Um único evento de show**: toda rota que faz um show (tours, tour12, agenda `gigs`, fests8, fest12, residências, cerimônia, festival grátis) deveria emitir `runSimHooks('show', …)` com o mesmo `arg.show`. Assim fadiga/saúde/talento/terr20/live20/cambistas valem para todos, sem reimplementar.
3. **Um único calendário de compromissos**: `clash17.playerShows` (`clash17.ts:39-50`) já unifica a *leitura* (tours + tour12 + festivais). Falta unificar a *escrita/validação*: `planTour`, `bookRoute`, `pitchAct/acceptInvite`, `startResidency`, `setVenue17(residency)`, `startRes20` deveriam passar pelo mesmo `isBusy(act, week/day)`.
4. **Logística por parada** extraída de `estimateTour` (`tours.ts:94-123`) — `showops20.restLogistics` (`:94-115`) é cópia; `route8.bookRoutedTour` (`:333-343`) recalcula outra vez para saber o que o promotor cobre. Devolver `stopCost` por parada e reduzir `costReserved` ao que o selo de fato pagou (bug 1.6).
5. **Visto**: trocar `legInfo` perna a perna por `travel.planRoute` (dedup por soberania, `processingDays`, `boycott`) e expor `minStartInDays` no planejador.
6. **Residência**: quatro implementações (`live/venue.ts residencies`, `venues17 policy 'residency'`, `venue12 night 'residency'`, `events.ts:367 'resid'`). Escolher uma.
7. **Merch**: `brands.ts s.merch` + `merch17` + banca de turnê em `tours.ts` → uma só linha de estoque; a banca da turnê consome estoque e informa `merch17` (ou vice‑versa).
8. **Papel/abertura**: `role` e `partnerActId` tratados em 3 lugares com pesos diferentes (`tours.ts:101` 0,3/1,2; `:259-264` 0,3/0,8·0,5/1; `live18.ts:147` 0,3/1,2). Centralizar `roleFactor()`.
9. **`tourhook18.TOUR18`** (injeção para evitar ciclos) é bom padrão; estender com `TOUR18.expected` para a previsão ler os mesmos ganchos (`q`, `settle`) em modo determinístico.
10. **Código morto / no‑ops**: `tourEligibleLive`, `canHologram`, `tourMonthIdx` (`tours.ts:340-350`), `venueNights` (`venues17.ts:194`), `clashLog` (`clash17.ts:186`), `previewShowRevenue` (só teste), `festivalSlot` (`live.ts:104`, duplica `fests8.festTierFor`), `live.ts:82` `/ Math.max(1, 1)`, `merch17.ts:124` `u = 0` sem efeito.
11. **`live/notes.ts` 'live-tickets'** lê `liveOf(s).cur` (global) — passar `tier/ratio` no `ctx` do mod.

---

## 3. O que pode ser aprofundado

- **Setlist com músicas reais**: hoje só média de `q` (`tours.ts:192-198`) e curva de energia (`notes.ts:17-90`). Dá para: setlist por cidade (hits locais via paradas por país `charts7`), pedido do público (`INCIDENTS 'request'`) ligado a um hit antigo real, músicas novas "crescendo" (já em `live18.ts:263-269`) virando versão ao vivo, e **ao vivo gravado**: não existe `Release` do tipo live — `liveLog20`/`finishLiveShow` já têm `energy` por show; gerar um disco ao vivo de uma data ≥ 85.
- **Residências** (já há Vegas 1946+ em `live/venue.ts:122`): unificar e adicionar residência de clube para iniciantes (noite fixa, público de bairro) e residência de estádio/arena pós‑2010 (Sphere‑like, 2023+).
- **Turnê de estádio × streaming (2010+)**: `TICKET = [12,25,45,70,95]` é fixo por tier (`tours.ts:22`) e só passa por `money()`; a receita de turnê não muda de peso por era. Sugestão: tabela de preço por década (1970 ≈ $6 → 2019 ≈ $95 real), VIP/packages, taxa do gigante crescendo (já em `giant18`), e um "peso da turnê no faturamento" que o relatório anual mostre.
- **Cambistas/dynamic pricing**: `TIX` (`clash17.ts:165-171`) e `clash17:scalp` só logam; transformar em dinheiro real (perda para o fã, receita recuperada com `dynamic`, escândalo já existe) e em decisão por turnê, não por ato.
- **Logística**: kit18 cobre transporte/hospedagem/diárias/seguro/segurança; faltam carnê ATA/alfândega de equipamento em pernas internacionais (`gear: 'own'`), jet lag (`fly` em pernas > 6 fusos), estrada à noite (acidente de ônibus — risco real), e clima já calculado (`climateInfo`) **mostrado** no planejador.
- **Equipe de estrada com nomes**: `crew8` tem chefe de estrada com especialidades; `union20` negocia piso. Faltam roadies/FOH/LD nomeados com erro/lealdade — a carta "Equipe troca o microfone" (`notes.ts:244`) poderia ler a pessoa.
- **Acidentes**: 4 tipos em `tours.ts:239-245` + `crowd()` em `live18`. Ligar `kit.move === 'van'` a acidente de estrada com ferido (hoje só +12 % de risco genérico).

---

## 4. Sistemas que não se conversam (mas deveriam)

| Ligação | Estado | Evidência |
|---|---|---|
| Turnê → vendas na cidade / fãs por região | **Parcial** | `terr20.ts:211` grava fãs por mercado só pelo gancho `show` (só `tours.ts`); `route8.ts:424-436` dá +4 % em `chartUnits` **só** para turnês com acordo route8, não para `planTour` direto. Festivais, tour12, agenda não alimentam o livro regional. |
| Show → fadiga / saúde / vícios | **Só turnê** | `people/health.ts:169` (voz, audição) e `talent.ts:59` dependem do gancho `show`; `vices.ts` não reage a shows. |
| Festival → hype → paradas | **Não** | `fests8.runEditions` (`:223-259`) dá fama/fãs/momentum mas **não** chama `addHype` (`hype12/hype17`) nem `emitFact` → `media17` não noticia; `fest12` emite `remember`/cutscene mas também não `addHype`. |
| Turnê → relações da banda | **Sim** | `live18.ts:270-282` (`adjRel18`, brigas), `band18.chem`. |
| Clima / geopolítica → show | **Clima sim, geopolítica mal** | `climateInfo` em `tours.ts:233,262`; geopolítica bloqueia mercados inteiros (1.3) e o planejador não avisa; `regions19:visa` só em `cityDemand`. |
| Cenas por cidade → público | **Sim** | `cityDemand` lê `s.scenes` (`tours.ts:56`); show devolve cena (`:298`); residência venues17 (`:159`). |
| Merch → marcas | **Não** | `brands.ts` (deals `merch/sponsor`) e `merch17` (licença de loja) não se leem; patrocínio de turnê não reduz logística nem aparece no kit. |
| Agenda `gigs` → tudo | **Não** | `live.ts:52-101` não usa `cityDemand`, `clash17`, `TIX`, mods nem hooks; é um terceiro simulador paralelo. |
| tour12 (agente/promotor) → tudo | **Não** | `tour12.resolve` não dispara hook, não mexe em fadiga de pessoas, não grava `played:` em terr20, não entra em `livesnap20`. |
| Festival (fests8) × turnê | **Só leitura** | `festWeeks` entra em `clash17` (raio) e em `playerShows`; `pitchAct/acceptInvite` não checam turnê na semana. |
| Sindicato / intercâmbio → turnê | **Sim** | `union20.ts:164-177` (`tourRisk`, `showRevenue`), `exch20.ts:122-133`. |
| Seguro de turnê × seguro de pessoa‑chave | **Não se veem** | `live18` paga por data cancelada; `insure19` paga por fato de saúde; um ferimento em turnê (`tours.ts:249-252` `health='recovering'`) não gera fato → nenhum dos dois reage. |

---

## 5. Ideias para o jogo (a partir desta área)

1. **Previsão honesta com intervalo**: mostrar público previsto como faixa (já há `forecastTour` com `lo/hi`) **derivada da mesma função do acerto** e com os "porquês" (setlist, palco, clube, clima, concorrência) antes de marcar — e o post‑mortem compara contra essa mesma faixa.
2. **Planejador que recusa o impossível**: cidade bloqueada por geopolítica, visto com prazo maior que `startInDays`, ato em hiato/residência/festival na semana — tudo recusado (ou marcado como "data em risco") com o motivo, em vez de cancelar no dia.
3. **Abertura como investimento visível**: cachê fixo pequeno, público do headliner, conversão de fãs compatíveis — mostrar "você perde $X agora e ganha ~Y fãs" (os dados já existem em `live18.ts:241-247`).
4. **Disco ao vivo e "noite lendária"**: um show com `energy ≥ 85` vira oferta de gravação ao vivo (release `live`), com direitos de master e lançamento 2–6 meses depois.
5. **Economia de turnê por era**: pré‑1960 (circuito de teatros/bailes, cachê fixo), 1965–1995 (porta + promotores locais), 1997+ (gigante, garantia alta, taxas), 2010+ (turnê como principal receita, VIP, dynamic pricing e revolta dos fãs) — hoje só o promotor gigante muda com a época.
6. **Turnê de reunião como turnê de verdade**: `circuit17.stageReunion` (`:102-124`) é um lance único de caixa; marcar uma `Tour` real com stops, fadiga de veteranos e risco de briga (`holds17`).
7. **Equipe de estrada nomeada**: tour manager, FOH e chefe de segurança como pessoas com lealdade e cansaço; roubo de equipe por rivais; greve da estrada (`union20`) com nomes.
8. **Cambistas como decisão**: por turnê, escolher política de ingresso com o número de ingressos "perdidos" para cambistas e o efeito nos fãs (já medido em `clash17:scalp`, hoje só texto).
9. **Unificar as residências** em um só modelo (cassino, clube próprio, casa comprada) com uma ficha única: noites/mês, público fiel, fadiga baixa, mas inspiração em queda — e impedir turnê simultânea.
10. **Festival do jogador → mídia e hype**: edição boa gera fato público, manchete e `addHype` para os atos do line‑up; edição ruim gera fato ruim e queda de relação com promotores.

# Revisão D — Mercado, paradas, fãs, hype e mídia

Escopo lido: `src/sim/market.ts`, `charts2.ts`, `sys/charts7.ts`, `fandom.ts`, `fandom19.ts`, `hype17.ts`, `sys/hype12.ts`, `media.ts`, `sys/media12.ts`, `sys/media17.ts`, `sys/media18.ts`, `sys/media19*.ts`, `media18hook.ts`, `sys/outlets17.ts`, `sys/stream18.ts`, `sys/radio18.ts`, `sys/press9.ts`, `sys/press18.ts`, `sys/market19a.ts`, `sys/fans18.ts`, `sys/fan15.ts`, `sys/audience8.ts`, `sys/relevance8.ts`, `data/relevance*.ts`, `sys/regions18.ts`, `sys/regions19.ts`, `sys/terr20.ts`, `sys/reach17.ts`, `sys/reachhook17.ts`, `sys/platform12.ts`, `sys/trends17.ts`, `sys/awards15.ts`, `sys/awards18.ts`, `awards19.ts`, `awardcal19.ts`, `genretime20.ts`, `culture.ts`, `sys/culture19.ts`, `sys/movements9.ts`, `sys/revival19.ts`, `sys/kpop18.ts`, `sys/zines19.ts`, `sys/tv18.ts`, `sys/screen18.ts`, `sys/cine18.ts` (parcial). Além disso `tick.ts`, `hooks.ts`, `relidx17.ts`, `sys/mkt18.ts` (saturação), `sys/world4/charts.ts` (cabeçalho) e `sys/index.ts` para conferir ordem e registro de hooks.

Verificação empírica: script `scratchpad/check-d.ts` (rodado com `npx tsx`), resultados citados como **[script N]**.

---

## 1. BUGS / ERROS concretos

### Alta

**B1 [CONFIRMADO] `rel.hypeBoost` tem duas semânticas incompatíveis → seis ligações "X → vendas" estão mortas.**
- `src/sim/market.ts:201-204`: `rel.hypeBoost = hype * fans` (multiplicador ≥ 1, tipicamente 1,0–1,6) e `rel.appeal = appeal * rel.hypeBoost`.
- `src/sim/sys/hype12.ts:137` lê como multiplicador: `((rel.hypeBoost ?? 1) - 1) * 80`.
- Seis sistemas escrevem como se fosse um bônus aditivo 0–0,5: `sys/market19a.ts:252` (`Math.min(0.5, (rel.hypeBoost ?? 0) + 0.05)` — "vitrine" da certificação), `sys/revival19.ts:250` (relançamento +0,15), `sys/remix19.ts:252` (+0,2, comentário diz "stream18 lê hypeBoost" — não lê), `sys/adsync19.ts:154` (+0,15), `sys/score19.ts:164,218`, `sys/charity19.ts:248`.
- `grep -rn hypeBoost src` mostra que **nenhum sistema lê `hypeBoost` depois do lançamento** (só o hook `launch` do hype12). Resultado: certificação, relançamento, sync, remix, trilha e beneficente *acreditam* esquentar as vendas e não fazem nada; de quebra corrompem o valor (1,3 → 0,5, **[script 3]**).
- Correção: trocar essas escritas por um modificador real (`registerMod('chartUnits', …)` com janela de semanas) ou por `addHype(s, 'r:'+rel.id, …)`; e documentar `hypeBoost` como "só no lançamento".

### Média

**B2 [CONFIRMADO] `rel.weekly` não registra semanas com 0 unidades → série desalinhada e leituras erradas.**
- `src/sim/market.ts:365` `if (units <= 0) continue;` vem antes de `rel.weekly.push(units)` (`:378`). **[script 2]**: 12 semanas de idade, `weekly.length = 0`.
- Consumidores que supõem "índice = semana": `sys/radio18.ts:202-204` (tendência `w[n-1]+w[n-2] ≥ (w[n-3]+w[n-4])·0,95` decide subir rotação), `sys/outlets17.ts:123` (margem dos canais sobre `slice(-4)` = "últimas 4 semanas"), `sys/stream18.ts:305`, `sys/media18.ts:289`, `market.ts:395` (devoluções só quando `weekly.length > 6`), `sys/charts7.ts:219`, `src/ui/ficha.ts:76` (sparkline "vendas por semana").
- Correção: `rel.weekly.push(0)` para todo lançamento vivo (e manter o `continue` só para receita/parada).

**B3 [CONFIRMADO] A previsão (`forecastUnits`) ignora os tetos que o mercado aplica → "Por que deu nisso?" compara com previsão inflada.**
- `src/sim/market.ts:566-580` soma `pool·h/(H+MARKET_TAIL+h)` por 10 semanas sem `maxShare` (`:354`), sem a penalidade de escala `k` (`:359-361`), sem `fragmentation` (`:330`), sem `focusCap` (`:333`) e com `MARKET_TAIL` sem o ×0,6 pré-1950 (`:344`). **[script 4]**: superastro em 2015, `mid = 2,36 M`, teto físico ≈ 0,91 M (2,6×).
- `rel.fc` (`:208`) guarda isso e alimenta a autópsia (`explain8`).

**B4 [CONFIRMADO] Receita de "sucesso tardio" (revival19) contorna todo o mercado.**
- `src/sim/sys/revival19.ts:191-196`: `rel.totalUnits += u; rel.revenue += v;` e `post(…, v, 'sales')` com 100 % para o caixa do selo — sem `distribute()` (`market.ts:437`): sem taxa de distribuição, sem royalty/recoupment do artista, sem edição/autores (`payAuthors`), sem pirataria, sem entrada nas paradas nem em `marketUnitsYear`, mas **conta para certificação** (`lateCert19`, `:202`). Os outros "ressurgimentos" (`audience8` e `media18`) usam o caminho certo (`chartUnits` mod) — inconsistente.

**B5 [CONFIRMADO] Censura só atinge o jogador e não muda as vendas globais.**
- `src/sim/media.ts:337` chama `censorCheck` apenas para `rel.owner === 'player' || playerBand`.
- `censorCheck` (`:283`) remove o território *depois* do lançamento, mas o apelo já embutiu `coverage(rel.territories)` (`market.ts:132`, calculado uma vez em `computeAppeal`). Só a divisão por país (`charts7.countryWeights`) muda; as unidades mundiais são iguais. `grep s\.bans src/sim` → nenhum leitor na simulação (só UI e `scenes/awards.ts` que escreve). Rádio (`radio18`), streaming (`stream18`) e regiões ignoram a proibição.

**B6 [CONFIRMADO] Duas fontes de "fãs por região" e dois sistemas de visto empilhados no mesmo modificador.**
- `cityDemand` recebe `links19a:region` (`sys/links19a.ts:371`, usa `fansByRegion19` = fama regional, ×0,9–1,5) **e** `terr20` (`sys/terr20.ts:205`, livro regional, ×0,92–1,12) — ambos registrados (lista completa de 29 mods `cityDemand` via grep). Também `regions18` (`:183`, barreira de visto `barMult18(…, shows=true)`) e `regions19:visa` (`:323`, `visaMult19` ×0,9/×0,6) — duas contas de visto no mesmo show.

**B7 [SUSPEITO] Unidades não são conservadas: modificadores multiplicam a fatia do bolo sem renormalizar.**
- `market.ts:355` divide o `pool` pela atenção e **depois** `applyMods('chartUnits')` aplica ~40 modificadores (viral ×3,2 `media18.ts:126`; `audience8.ts:140` soma bônus absoluto `pool·0,0005·power…`; `st18` ×1,3; `kpop18` ×1,3; `aw18` ×1,15; `outlets17` produto de alcances; etc.). Só `cap = pool·maxShare` limita por lançamento. **[script 5]**: top-100 chegou a 75 % do pool em 1985 (não estourou nesse caso, por isso SUSPEITO), mas o desenho permite > 100 % e `marketShare` do jogador infla com os próprios mods.

### Baixa

**B8 [CONFIRMADO] `fansByRegion19` não soma o total** (R20 diz que soma). `src/sim/fandom19.ts:55` arredonda por mercado; **[script 1]**: 199/405 atos com soma ≠ total (±2). O `terr20` (`apportion20`) conserva, mas só para atos do jogador; `links19a.ts:358` (`regShare19`) continua lendo `fansByRegion19`.

**B9 [CONFIRMADO] `charts2.chartsWeek` calcula `s.regionCharts` e é sobrescrito na mesma semana.** `hooks.ts:42` roda `chartsWeek(s)` antes de `runSimHooks('week')`; `sys/charts7.ts:309` reescreve `s.regionCharts[m]`. Trabalho morto, e três fórmulas diferentes de "fora do território" (0,08 em `charts2.ts:23` e `market19a.ts:151`; 0,04 em `charts7.ts:122`).

**B10 [CONFIRMADO] Empates nas paradas sem desempate explícito.** `market.ts:521` `sort((a,b)=>b.units-a.units)`; a ordem é a de inserção em `s.releases` (`relidx17.ts:39`, `Object.values`) → determinístico, mas o lançamento mais antigo sempre fica na frente. `charts7.topN/rankIdx` (`:163-200`) idem (`<` estrito). **[script 6]**: 6 empates adjacentes em 84 posições. Sugestão: desempatar por `lastPos` (quem já estava) e depois `id`.

**B11 [CONFIRMADO] Devoluções do varejo não revertem unidades.** `market.ts:395-400`: `rel.stock += back`, receita cai, mas `units`/`rel.totalUnits`/entrada na parada/`playerUnits` mantêm as devolvidas → certificação e fatia de mercado contam devoluções.

**B12 [CONFIRMADO] `stats.platinum` incrementado várias vezes pelo mesmo disco.** `market19a.ts:253` soma +1 a cada degrau `n ≥ 2` (2×, 3×… platina) por entidade ≠ 'na'; `market.ts:424` (AMIF) e `revival19.ts:165` (certificação tardia) também somam. Não é "certificação repetida" visível, mas o contador vira lixo.

**B13 [CONFIRMADO] Gênero anacrônico escolhido por evento.** `worldgen.ts:308` cria `genrePop` para **todos** os gêneros (futuros = 0,4); `sys/decnew18.ts:202` faz `r.pick(Object.keys(s.genrePop))` sem `genreAvailable20`. **[script 7]**: 218 gêneros com `born > 1960` em `genrePop` em 1960 (ex.: disco, funk). Nos arquivos da minha área (`culture.ts:162`, `trends17.ts:60`, `zines19.ts:86`, `regions18`) o filtro existe.

**B14 [CONFIRMADO] Limpeza de resenhas apaga as do jogador.** `media.ts:340-341` ("limpa resenhas antigas de terceiros") remove as 400+ mais antigas por ordem de inserção, incluindo as do jogador.

**B15 [CONFIRMADO] Rollout conta duas vezes na estreia.** `market.ts:204` multiplica `appeal` por `hypeBoost` (permanente) e `hype12.ts:137,162` inclui o mesmo `hypeBoost` em `exp` e aplica `1 + exp/100·0,35` nas semanas 0–1 (e −10 %·exp nas semanas 2–6). O comentário em `:136` só protege o `extra`.

**B16 [CONFIRMADO] `radio18` e `outlets17` excluem a banda do jogador em selo NPC.** `radio18.ts:129,187` e `outlets17.ts:98,110,120` testam `rel.owner === 'player'`; o resto do mercado usa `mineRel` (owner ou `playerBand`).

**B17 [CONFIRMADO] Lançamentos do jogador ficam `live` para sempre.** `market.ts:320` só desliga NPC após 60 semanas → `marketWeek` e `certify` percorrem todo o catálogo do jogador toda semana (custo cresce linearmente com a partida).

**B18 [SUSPEITO] Prêmios nacionais podem ir a ato morto/encerrado.** `charts7.ts:385-407` (`give`) só checa `s.acts[actId]`; `actRank` inclui atos `deceased`/`split`. Para "Artista do ano" é defensável (póstumo), para "Revelação" não.

**Itens pedidos e NÃO encontrados (verificado):**
- `Math.random`/`Date.now` na simulação: nenhum na área (o único `Date.now` é `balance19.ts:145`, cronômetro de ferramenta; `tick.ts:48`/`util.ts:19` usam `Date` só para calendário determinístico).
- Pirataria duas vezes: aplicada uma vez na receita (`market.ts:392`); `crime17` bootlegs e `world4` são efeitos separados. **Gap** (ver §4): a postura antipirataria do `world4` (`piracy.stance`) não entra em `piracyLoss` (`market.ts:281-288`), só em `links19a.ts:219`.
- Marketing com retorno decrescente duplicado: não. `marketingE` (`market.ts:79-96`) aplica a saturação (`MEDIA18.eff`) por canal dentro da soma linear e `1−exp` uma vez; `mkt18.profile18` recupera o linear com `−ln(1−E)`.
- NaN com mercado vazio: não encontrado (`H+B>0`, `Math.max(1,tot)`, `den>0` em `coverage`, `Math.max(1e-9, den)` em `charts2`). Único risco teórico: `Math.log10(1 + fans.core)` com `core < −1` — todos os escritores usam `Math.max(0, …)`.
- Unidades do jogador contadas duas vezes no `marketShare`: não — `playerUnits` ⊂ `marketUnits` (`market.ts:381,402`; `tick.ts:109`).
- Estoque: físico do jogador respeita `rel.stock` (`market.ts:369-376`); NPC = `Infinity` por desenho (`stock20.ts`).

---

## 2. MELHORIAS de código

**2.1 Fonte da verdade das vendas semanais (hoje há 6 contas da "fatia por região/país").**
- `market.ts` produz `units` por lançamento; `charts2` reparte por mercado (peso gosto×tamanho, fora = 0,08) e é descartado (B9); `charts7` recalcula a diferença de `totalUnits` (`lastTotal`) e reparte por 128 países (fora = 0,04, `softPower`, `localPref`); `market19a.mkW19` reparte de novo por mercado para certificar; `relevance8.reachMult` pondera países no apelo; `terr20.relConv20` reparte as unidades novas para fãs. Proposta: `marketWeek` devolve, por lançamento, `{ units, byMarket: Float64Array(7) }` (uma única fórmula de peso com `fameIn`/`terr20`), e `charts7`, `market19a`, `terr20` e `charts2` consomem isso. Elimina 3 fórmulas divergentes e o `lastTotal` indireto (`charts7.ts:219`), que hoje precisa do `weekly` desalinhado (B2).

**2.2 Custo.** `marketWeek` é O(lançamentos vivos) com ~40 mods `chartUnits` por lançamento por semana; a maioria devolve `null` quando `!mineRel`, mas só depois de montar contexto e, em alguns, varrer coleções (`aw18.relAdj18` filtra `s.awards` inteiro; `identity`, `supply18`, `terr20:price` chamam `share20/salesSplit20`). Sugestões: `registerMod(kind, id, fn, { mineOnly: true })` e pré-filtrar por dono; mover `certify` (`market.ts:405`) para mensal; desligar `live` de lançamentos do jogador sem unidades por 52 semanas (mantendo o caminho de cauda). `charts7.weekCharts` é O(≤350 × 128) com matrizes planas — bem feito. Varreduras mensais de `Object.values(s.releases)`: `media.ts:333`, `revival19.ts:180` (×10 chaves), `market19a.ts:169`, `press18.queue18`, `reg19 hitOfMine`, `audience8.yearlyRediscovery` — vale um índice "lançamentos do jogador" (`relidx17` já tem `releasesOfYear17`).

**2.3 Duplicações de sistema.**
- "Viral": 4 conceitos (`audience8.isViral`/`viral8`, `media18.viral`, `reach17.viral` global, `revival19` tipos `viral`/`short`), cada um com gatilho e efeito próprios.
- "Catálogo que volta": 3 (`audience8.startRevival` só jogador/anual, `media18.viralMonth` só jogador/≥52 sem., `revival19` todos) — e só o terceiro tem decisão do dono.
- Fãs por região: `fandom19.fansByRegion19` (sem estado) × `terr20` (livro).
- Vistos: `regions18.barMult18` × `regions19.VISA19`.
- Censura: `media.CENSOR_RULES` × `data/content.censorshipIn` (usado por `movements9`) × `society18.regimeAt18` × `world4/laws`.
- Críticos: `media.CRITICS` + `data/critics8` + `data/media17.CRITICS17` fundidos em runtime por `ensureCritics17` (`media17.ts:36`); `zines19` só olha `CRITICS17`.
- Limiares de certificação repetidos: `market.ts:416` e `revival19.ts:157` (mesmos números); `market19a.CB19` por país.
- Taxas de conversão de fã repetidas: `0,1/0,006` em `market.ts:512-513`, `terr20.ts:163` e (com pesos) `stream18.ts:131-133`.
- `mineRel/mineAct/mine` redefinidos em ~15 arquivos; vale `util.mineRel`.

**2.4 Pequenos.** `emitFact` com tag `''` (`screen18.ts:196`); `tv18.startSeason(s, r, f)` ignora `r`; `charts7.nationalAwards` `void r`; `media12.ts:252` `void nextId; void cityById` (imports mortos); `hype12` DECAY por prefixo com `key[0]` (quebra se vier chave sem prefixo).

---

## 3. O QUE PODE SER APROFUNDADO

1. **Playlists e algoritmo (2008+).** `stream18` só existe para o jogador (pitch editorial 8 semanas, "algoritmo gostou" +12 %, estratégia pico/base). NPCs não disputam vagas: não há escassez de playlist, nem "cauda longa" algorítmica que explique por que um disco antigo de NPC toca. `platform12`/`ventures9` (plataforma própria) só mexem em `momentum`. Proposta: N vagas editoriais por mercado e semana disputadas por todos os lançamentos (score = apelo×retorno×relação com curador), e `baseMix18` por mercado (`regions18.plats18` já lista plataformas locais, mas só altera `access`).
2. **Rádio por formato.** `radio18` tem 9 formatos, 3 estações cada, consultores — mas só o jogador faz pitch; NPCs nunca estão na rádio, rotação não alimenta `fameIn` regional nem a parada "songs" de `charts7`, e a regra `airplay` de `aw18` é só um multiplicador. Uma "parada de airplay" por formato com rotações de NPC fecharia o ciclo (e daria sentido ao `needle time` de `regions19`).
3. **TikTok/viral 2016+.** `media18.viralMonth` só sorteia catálogo do jogador com ≥52 semanas; lançamento novo só "viraliza" via canal `short_clips`/outlet `short_video` (multiplicador fixo). `audience8` detecta viral só nas 8 primeiras semanas de single. Falta: viral de faixa nova de qualquer ato, com gancho (`songProfile.hook`) e sem campanha, que puxe `genrePop` e o país de origem (`reach17` já faz para nº 1 em 4+ países).
4. **Vinil revival 2010+.** Só `audience8.collectorShare` (+0,05 fixo ≥2008) e `outlets17.vinyl_special`. Nada em `physShareRel18`/`eras18` distingue vinil de CD depois de 2010; RSD aparece só em `live19`. Dá para ter uma fatia de vinil por família de gênero e idade do público (os ganchos `AGE_LAG18` já existem).
5. **Paradas por país rasas.** `charts7` reparte **uma** unidade global por pesos estáticos (tamanho, gosto, `softPower`, `localPref`); um disco não pode ser nº 1 no Brasil e invisível nos EUA a não ser pelo peso. Nenhuma fama regional (`fame16.fameIn`), show (`terr20.sw`), rádio ou censura entra em `countryWeights` (grep: zero referências). Proposta mínima: `w *= 0.6 + 0.8·fameIn/100` e `×(1 + 0,3·show recente)`.
6. **Mídia própria.** Três sistemas separados (`media12` ventures, `press18` veículo do crítico, `zines19` revista comprada/fanzine) com efeitos pequenos e desconexos (momentum, +4 % apelo, credibilidade). Nenhum deles dá "rotação" em `radio18` nem vaga de playlist.
7. **Streaming pró-rata de verdade.** `stream18.payout18` é um multiplicador (ARPU×assinantes×skew); não há bolo por território dividido pelos streams de todos (o "pool" não é conservado — ligado a B7). Um bolo real tornaria a chegada de majors/faixas sem rosto (`market19a.ghN`) uma diluição mecânica em vez de um −25 % fixo.

---

## 4. SISTEMAS QUE NÃO SE CONVERSAM (ou conversam mal)

| Ligação | Estado | Evidência |
|---|---|---|
| Hype → paradas | parcial | `hype12.ts:157` só usa a expectativa congelada no lançamento (`hy.rel[id]`, 40 semanas). Hype do **ato** (`a:`), do **selo** (`l:player`) e da **cena** (`s:`) não entram em nenhum `chartUnits`/`appeal`; `l:`/`s:` não têm consumidor fora da UI (grep). Medidores mortos. |
| Críticas → vendas de longo prazo | fraca | `media.ts:116` ×(0,92+avg/60) uma vez; `creation/core.ts:275` ±15 % só 8 semanas; `press18.infl` 26 semanas; `audience8.yearlyRediscovery` +0,025 se `critic ≥ 70`. Não há "lista de melhores do ano → catálogo" nem efeito em turnê. |
| Turnês → vendas na cidade/país | **não** | `terr20` converte fãs por praça (`:211`), mas `charts7.countryWeights` ignora `terr20.sw`/`share20` e `fameIn` → o show não move a parada do país. |
| Sync → streaming | parcial | `links16:sync` (`chartUnits`) funciona; `adsync19`/`score19`/`remix19`/`charity19` escrevem `hypeBoost` morto (B1); `revival19 'sync'` só para faixas ≥10 anos. |
| Fãs por região → shows | **dupla** | B6: `links19a:region` + `terr20`, mais `fans18`, `audience8`, `fame16`, `hype12`, `press9` no mesmo `cityDemand`. |
| Censura → rádio/streaming/apelo | **não** | B5; `s.bans` sem leitor; `regions19.lawAppeal19` trata cotas só como apelo. |
| Revivals → catálogo antigo | parcial | `revival19` ✔ (mas fora do mercado, B4); `movements9` fase `revival` (`:262`) só sobe `strength`, nenhum efeito nos discos do movimento; `audience8`/`media18` só jogador. |
| Prêmios → vendas | fraca | `ceremonies8.ts:164-166` dá fama/fãs/`momentum +10` (→ `h *= 0,85 + momentum/300`, `market.ts:325`); `charts7` nacionais só fama +1,2; nenhum mod `chartUnits` por prêmio/indicação; `hype12` EV `award` (+14) morre em `a:` (linha 1). |
| Certificação → mercado | **não** | `market19a` emite `cert_award` → manchete, júri, `hypeBoost` morto. |
| Rádio (`radio18`) → fama regional / paradas por país | **não** | `spins18` só entra em `chartUnits`; consumidores externos: `links18`, `links19a`, `botmedia18` (grep). |
| Postura antipirataria (`world4`) → `piracyLoss` | **não** | `market.ts:281-288` só olha tech e mutator; `piracyLevel` só em `links19a.ts:219`. |
| Geopolítica → mercado | ✔ | `culture.ts:235` → `s.flags.geoDemand` → `weeklyPool`; `liveBlocked` em `tours.ts:214`/`route8`. |
| Tendências ↔ paradas | ✔ | `trends17` fecha o ciclo com `genrePop`. |
| Regiões: hits → afinidade | ✔ | `regions18.hits` lê `ch7.peaks`. |
| K-pop vitórias semanais → vendas | não | `kpop18.ts:285-288` só fama/`nudge16`. |
| Programa de TV (`tv18`) → paradas | não | só fama/fãs casuais; `tvFame` decai se não houver hit, mas o hit não é facilitado. |
| Plataforma própria (`platform12`) → repasse do selo | não | `effPayout` só move o caixa da venture; `streamPayout`/`payout18` do selo não sabem que o dono é o jogador. |
| Hooks registrados | ✔ | todos os módulos da área estão em `sys/index.ts` (linhas 17, 48, 53, 72, 84-85, 105, 130, 150, 158, 166-167, 211, 220-224, 227, 229, 232, 234-235, 255, e r19/r20: `revival19`, `regions19`, `market19a`, `media19*`, `zines19`, `culture19`, `terr20`). Exportações sem chamador: `hype12.ranking`/`tracked` só UI; `audience8.readAudience` UI; `media18.togglePool18` UI; `charts7.marketKeys` UI — OK (interface). |

---

## 5. IDEIAS para o jogo (a partir desta área)

1. **Parada de airplay + vagas de playlist disputadas por todos** (NPC inclusive): cria escassez real, dá uso ao `radio18` dos NPCs e faz o "jabá"/pitch valer contra alguém. Alimenta `charts7` por país com rotação local.
2. **Bolo de streaming conservado por território**: receita = assinantes×ARPU dividida pelos streams de todos; majors, faixas sem rosto e IA diluem de verdade; "user-centric" da `platform12` vira escolha com efeito mensurável no seu repasse.
3. **Parada por país com memória local**: pesos dinâmicos (fama regional, shows, rádio, censura, idioma) em vez de tabela estática; "nº 1 na Coreia e nada nos EUA" passa a ser possível — e a certificação por país (`market19a`) ganha sentido.
4. **Hype de cena/selo com efeito**: `s:cidade:gênero` alto → mais chances de contrato aceito e +apelo para quem lança daquela cena; `l:player` alto → melhor pitch em playlist/rádio e curadores respondendo mais rápido.
5. **Prêmio com "Grammy bump"**: indicação +X % por 6 semanas, vitória +Y % por 10, decaindo; catálogo do vencedor reativado (já existe `st18` "disco novo reativa o catálogo" — basta reaproveitar).
6. **Censura jogável**: proibição em país → rádio local fora, streaming geobloqueado, mercado negro (já há `links19a banned_song`) com fãs de culto; recurso/edição censurada (versão "limpa" como em `media18` vídeos).
7. **Crítica com cauda**: listas de fim de ano (críticos de `media17`) e "clássico tardio" que puxam `revival19` e preço de catálogo; crítico individual com memória do ato (já há `criticrel`).
8. **Turnê que vende disco**: show na cidade → +unidades no país por 2–4 semanas (merch/loja no show), fechando `terr20 → charts7`.
9. **Vinil 2010+**: fatia de vinil por gênero e idade do público, RSD anual com edição limitada, fábrica (já há `supply18`) com fila de prensagem.
10. **Previsão honesta**: `forecastUnits` com os mesmos tetos do mercado e uma faixa que mostra "teto do mercado" — melhora a confiança do jogador na autópsia (B3).

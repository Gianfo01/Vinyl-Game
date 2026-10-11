# Revisão C — Pessoas e ciclo de vida (Masters)

Escopo lido: `src/sim/people.ts`, `lifecycle.ts`, `members20.ts`, `dynasty.ts`, `stress17.ts`, `perks.ts`, `sys/people.ts` + `sys/people/*`, `people16`, `talent` + `talent/attrs`, `persona`, `persona13`, `life` (+ `life/data`), `life12`, `life20`, `lifecycle7`, `lifeevents10` (+ data), `kin15`, `love17`, `kids17`, `vices`, `ability18`, `fame15`, `fame16`, `notoriety14`, `looks15/17`, `sex17`, `beliefs10` + `sim/beliefs.ts`, `heirs8`, `afterlife19`, `gone16`, `lineup16`, `soul9`, `temper`, `instruments`, `moments16`, `realworld`, dados `people.ts`, `people18.ts`, `kin15.ts`, `lineups16.ts`, estrutura de `realacts_*`.

Método: leitura do código + script de invariantes (`scratchpad/audit_people.ts`, `dup_check.ts`) rodado com `npx tsx` sobre `createGame` + `advanceMonth` em 3 configurações (1963 real/historic 60 meses; 1980 fictício/free 240 meses; 1995 real/historic 200 meses — as runs do bot terminam por insolvência em ~2 anos, então as verificações do lado do jogador têm cobertura curta; as de NPC cobrem o estado inteiro). Linhas citadas são do estado atual do repositório. Nenhum arquivo do repositório foi editado.

Registro das execuções (resumo):
- 1980 free/fictício: `range_skill` 6 (instr 101–104), `alive_over_100` 4 (pessoas de 107–110 anos vivas em ato `split`), `rel_asym_in_act` 1.
- 1995 historic/real: `range_skill` 8 (Ice Cube instr=104, Cass Elliot 101…), `alive_over_100` (S. H. Dudley 123–124 anos, William F. Hooley), `dup_real_person` (Tony Iommi ×2 no mesmo Black Sabbath; Roger Taylor Queen × Duran Duran).
- 1963 historic/real: `dup_real_person` (Eugene Wright/Joe Morello em "Dave Brubeck Quartet" e "The Dave Brubeck Quartet"), `hiatusUntil_on_ended_act`.
- Nenhum `Math.random`/`Date.now` nos arquivos da área (só `balance19.ts` para cronometrar). Sem NaN em moral/estresse/fadiga; nenhum valor de moral/estresse/fadiga/ressentimento fora de 0–100 observado na simulação (mas há escritas sem clamp — item 1.9).

---

## 1. Bugs e erros concretos

### 1.1 [CONFIRMADO] alta — Pessoa real duplicada no mesmo ato (e entre catálogo clássico e listas novas)
- Observado no estado em `createGame` (1995, real, historic): Black Sabbath tem dois `Person` "Tony Iommi" (`p1n` b1948 e `p1o` b1949) ambos em `act.members`. Em 1963: "Dave Brubeck Quartet" (catálogo clássico nº 21, `src/data/realnames.ts:35`) e "The Dave Brubeck Quartet" (`REAL_ALL`) coexistem com Eugene Wright e Joe Morello duplicados — o dedupe `taken16` em `src/sim/sys/realworld.ts:39` (`norm16`) não ignora o artigo "The".
- Causa provável do Iommi: em `decorate` (`src/sim/sys/realworld.ts:251`) a reutilização dos integrantes gerados é **por índice** `old[i]` da lista `d.m`, mas `d.m` tem linhas repetidas para segunda passagem (`realacts_classic.ts:129`: Ozzy ×2; também Jackson 5/Jermaine, Van Halen/Roth, Genesis/Collins, Iron Maiden/Dickinson, Take That/Robbie, Guns N' Roses/Slash e Duff — 8 casos no dataset). A linha extra desloca os índices; o `old[1]` já nomeado pelo `worldgen` (`src/sim/worldgen.ts:210-211` dá os nomes de `REAL_ACTS[no].members`) e o `old[2]` renomeado acabam ambos como "Tony Iommi", e `canonical()` (`realworld.ts:202`) só funde se `|born−born| ≤ 1`.
- Efeito: README promete "pessoa única"; a identidade (`people16.ix16`, `kin15.graph`, `rw.pid`) por nome escolhe um dos dois e o outro vira fantasma com fama/relações próprias.

### 1.2 [CONFIRMADO] alta — Artistas reais sem data de morte nunca morrem (vivos com 120+ anos)
- `dynasty.ts:45` `realSafe = catalogNo && year < 2026 && history === 'strict'` bloqueia a morte sorteada de **toda** pessoa de ato real, inclusive quem não tem `died` nos dados (era 1889: `src/data/era1889.ts:32` "S. H. Dudley:v|William F. Hooley:v" sem nascimento/morte). Resultado observado: S. H. Dudley vivo aos 124 anos em 1997 e aos 135 em 2010; no modo fictício/free também (os arquétipos mantêm `catalogNo`): "Della Sutter, 107 anos" em ato `split`.
- Agrava: `makeRealPerson` (`realworld.ts:145`) sorteia `born = formed − 18..26` para quem não tem data — a idade aparece nas fichas, no Hall e em `comebacks()` (`lifecycle7.ts`, que só barra `Math.min(ages) > 82`).
- Correção sugerida: `realSafe` só quando a pessoa tem `died` documentado (ou `died > 2026`); senão aplicar `deathRisk` com teto por idade (ex.: ≥ 95 anos → morte certa em 1–3 anos).

### 1.3 [CONFIRMADO] alta — Assinar um NPC viciado o cura no primeiro mês
- `sys/people/health.ts:296`: `if (p.health === 'addiction') { … if (h.dependency < 40) p.health = 'ok'; }`. `healthOf` cria `dependency: 0` (`health.ts:~177`) para quem acabou de entrar no elenco; `lifecycle7.npcVices` (`lifecycle7.ts:~250`) e `soul9` só marcam `p.health = 'addiction'` sem tocar em `dependency`. Logo, todo NPC viciado contratado pelo jogador vira `ok` no primeiro `healthMonth` — sem clínica, sem custo. O escândalo/“luta contra a dependência” registrado no diário fica sem continuação.
- Sugestão: ao criar o registro de saúde de alguém com `health === 'addiction'`, iniciar `dependency` em 60–75 (e `history = true`).

### 1.4 [CONFIRMADO] média — Habilidade acima de 100 na geração (atual > potencial)
- `people.ts:55`: `skills[k] = clamp(v, 3, Math.max(10, opts.potential + 5))` — para potencial 96–99 o teto é 101–104. Observado: Ice Cube `instr=104`, Cass Elliot 101, Kenney Jones 101, Jon Moss 103 (1995), e 3 fictícios em 1980. `attrValue` (`talent/attrs.ts`) e `ability18.caOf18` propagam >100; `growPerson` (`people.ts:256`) então "reduz" silenciosamente para `potential+4`. O conceito de potencial como teto é contradito já na criação.

### 1.5 [CONFIRMADO] média — Morte gera memória falsa "{a} volta da pausa" e `hiatusUntil` órfão em atos encerrados
- `dynasty.personDies` (`dynasty.ts:58`) põe `hiatusUntil = week+4` em todo ato do morto sem mudar `status`. Um mês depois `lifecycle.monthlyPeople` (`lifecycle.ts:23-27`) vê `hiatusUntil <= week`, força `status = 'active'` (até para ato `emerging`), soma +25 de momento e registra `remember('return', 'volta da pausa')`. Para atos `retired/split` a checagem vem depois do `continue`, então o campo fica para sempre (observado: Haydn Quartet `split` com `hiatusUntil`), e um `comeback`/`reunion` futuro dispara o mesmo "volta da pausa" espúrio.

### 1.6 [CONFIRMADO] média — `launchHeir`/`startSoloCareer` clonam campos errados do ato de origem
- `dynasty.ts:197` `...structuredClone(parentAct)` e `dynasty.ts:377` `...structuredClone(act)` copiam `deceased`, `hiatusUntil`, `cancelledUntil`, `gigSat`, `image`, `movementId`, `rs`, `formed/debutYear/careerEnd` (solo) sem sobrescrever. Um herdeiro lançado a partir de um ato cujo pai morreu nasce com `deceased: true` (a fama póstuma de `fame15` e o `isEstate` de `image17` passam a tratar o novo ato como espólio); o solo herda `careerEnd` da banda (aposenta junto) e `contractId` compartilhado (`dynasty.ts:381`).
- Compartilhar `contractId` entre banda e solo faz `lifecycle.prune` (`lifecycle.ts:183`) apagar `s.contracts[a.contractId]` da banda quando o solo é podado, e `endContract` de um encerra o outro.

### 1.7 [CONFIRMADO] média — Relações românticas assimétricas entre sistemas
- O jogador pode namorar um artista (`life.ts meetPeople` 'party' / `life12 r12_artist_crush` guardam `partner.personId`), mas `dynasty.familyMonth` (`dynasty.ts:122`) dá a esse mesmo artista um `families[pid].partner` novo e `sys/people/life.ts romanceMonth` (`:49`) o coloca em romance dentro da banda sem olhar `life(s).partner.personId` — o "segredo de caso" (`life.ts:72`) só é criado se existir `families[p].partner`, nunca em relação ao jogador. O artista "ama" o jogador só do lado do jogador.
- `romanceMonth` (`people/life.ts`) ignora `sex17` (0 referências a `sexOf`): pares são formados sem considerar orientação/sexo, ao contrário de `love17` (jogador), que respeita.

### 1.8 [CONFIRMADO] média — Família de músico (dynasty) invisível para `kin15`
- `dynasty.familyMonth` cria filhos como `s.families[pid].kids` → `s.lineage` + `child.parentId`; `kin15.graph` (`kin15.ts:69-98`) só lê `KIN15` (dados reais, por nome) e `st.g`. Logo luto (`grief`), rixas e indicações de família (`tips`) não enxergam os filhos de dinastia; e `kin15.generate` (`kin15.ts:201`) cria **outro** modelo de filhos (`st.kids`) para NPCs famosos. Três modelos de filhos sem ponte.

### 1.9 [CONFIRMADO] baixa — Escritas sem clamp em moral/ressentimento/confiança
- `src/sim/events.ts:84,100,116,148,176,220` (`p.resentment += 15; p.morale -= 10`, `a.trust -= 10`, etc.). O relatório de invariantes não pegou valor fora de 0–100 porque os clamps mensais corrigem depois, mas no mês do evento a interface pode mostrar `resentment=108` / `trust=−3` (e `trust < 12` dispara saída negociada em `tick.contractsMonth`).

### 1.10 [CONFIRMADO] baixa — Sexo/gênero gramatical ignora o nome
- `persona13.sexFor` (`persona13.ts:122`) deriva sexo por hash do id (ou barba do look) sem olhar o primeiro nome; `FIRST_NAMES` (`data/people.ts:170`) mistura nomes claramente femininos e masculinos (Ruth, Maria, Simone…). "Maria Silva" pode ser `sex: 'm'`, e `orientName`/`love17.candSex`/barreiras de `persona13` seguem o sexo errado. Textos usam "(a)" quase sempre, mas `dynasty.ts JOBS` ("professora", "enfermeiro") e `people16 JOBS` dão profissão com gênero fixo ao parceiro sorteado, sem relação com o sexo do par (`love17.psx`).
- Nomes gerados colidem dentro da mesma banda (pools de 6–14 primeiros nomes para a maioria dos idiomas): observado "Nikos Dimitriou ×2" em Tidal Cathedral e "Imelda Reyes ×2" em Electric Satellite já no `createGame` (1975). Como `people16.ix16`, `kin15.graph` e `rw.pidIndex` indexam por nome canônico, homônimos viram a mesma identidade (também Roger Taylor do Queen × Roger Taylor do Duran Duran).

### 1.11 [CONFIRMADO] baixa — Idade de herdeiro-funcionário nunca avança e muda a cada chamada
- `heirs8.ts:71`: `born: s.year - 30 - (sf.skill % 20)` — recalculado em toda chamada de `heirCandidates`; o funcionário tem sempre 30–49 anos, e ao assumir (`applyHeir`) o novo dono nasce com essa idade sintética.

### 1.12 [CONFIRMADO] baixa — Índice pessoa→atos não invalidado em solos/supergrupos de NPC
- `lifecycle7.ts:202` `solo.members = [p.id]` e `:221` `sg.members = [pa.id, pb.id]` trocam a formação sem `actsTouched17(s)`; `actsOfPerson17` fica errado até a semana seguinte (o índice é refeito por semana). Mesmo padrão em `soul9.formAct` corrige com `actsTouched17`, mostrando que a regra existe mas não é aplicada uniformemente.

### 1.13 [SUSPEITO] média — Laço O(atos × integrantes² × traços) todo mês em `monthlyPeople`
- `lifecycle.ts:35,37`: `traitMod(s, act, 'stress')` e `traitMod(s, act, 'morale')` são chamados **dentro** do laço por integrante, e `traitMod` (`people.ts:234`) varre todos os integrantes e faz `TRAITS.find` linear (36 traços) por traço, embora `traitById` exista (`data/people.ts:108`). Para ~1.100 atos × 3 integrantes é ~1–3 M de comparações por mês; a função não é um hook e por isso não aparece no `__hookProf` (os hooks da área ficaram todos abaixo de 10 ms/mês; `fame16` 9–33 ms/mês é o mais caro da área).
- `lifecycle.prune` (`lifecycle.ts:180`): para cada ato podado, para cada integrante, `Object.values(s.acts).some(...)` — O(atos) por integrante; aceitável porque só roda nos podados, mas pode usar `actsOfPerson17`.

### 1.14 [SUSPEITO] média — `prune` apaga pessoa ainda referenciada fora de `s.acts`
- `lifecycle.ts:180` só checa `isPlayer` e participação em outro ato. Não checa `s.families[...]` (parceiro/filhos com `personId`), `s.lineage`, `s.vault`, `s.imageRights`, `rw.former`, `l16.free`, `kin15.g`, `P(s).romances`, `ab18.mt` (mentor), `love17.affair.pid`, `life.partner.personId`. Na simulação de 240 meses nenhum dangling apareceu (os podados raramente têm esses vínculos), mas `life.partner.personId` do jogador e `kin15.g` (irmãos em bandas de fundo) são candidatos reais: a pessoa namorada pelo jogador some do mundo quando a banda obscura dela é podada.

### 1.15 [SUSPEITO] média — Morte não encerra contrato diretamente; depende da ponte de fatos
- `personDies` (`dynasty.ts:48-78`) marca `retired/deceased` quando todos morrem mas não chama `endContract`; quem encerra é `afterlife19.onFact('death')` (`afterlife19.ts:123`) via `endContract19`, que só existe porque `bridge17` converte `remember('death')` em `Fact`. Funciona hoje, mas é um acoplamento invisível (um `remember` com `kind` diferente, ou um filtro de conteúdo, deixa o contrato aberto e cobrando/pagando). `tick.contractsMonth` só olha `playerActs` (atos ativos), então o contrato do ato morto nunca vence por lá.

### 1.16 [SUSPEITO] baixa — Catálogo "volta a tocar" reescrevendo a semana do disco
- `dynasty.ts:67` `rel.week = s.week - 53; rel.live = true; rel.appeal *= 0.3` falsifica a data de lançamento (usada por `market.ts:305,314` como idade do disco e por `people/thoughts` para detectar "flop na semana 8"); `releasesTouched17` não é chamado. Comentário em `afterlife19.endContract19` admite o truque. Melhor: campo `relaunchWeek`/`postMortemBoost`.

### 1.17 [SUSPEITO] baixa — Ex-integrante vira "produtor" por nome, não por pessoa
- `lifecycle7.ts:236` e `soul9.pursueDream 'producer'`: `genStaff(...)`, `st.name = p.name`, dedupe por `name` — o profissional não guarda `personId`; a pessoa passa a existir duas vezes (artista aposentado + produtor homônimo), fora do `canon16` (que só liga `pd:` reais).

### 1.18 [CONFIRMADO] baixa — Duas funções `moodOf` com semânticas diferentes
- `sys/people/thoughts.ts:121` (pilha de pensamentos, ±40) e `sys/soul9.ts:209` (memórias de anos, soma sem teto). Ambas exportadas com o mesmo nome; `dynasty`, `persona13` e UI importam uma ou outra. Risco de import errado silencioso.

### 1.19 [CONFIRMADO] baixa — Substituto não entra com relações nem é registrado uniformemente
- `events.ts:203` (`member_leaves`→`replace`) e `lifecycle7.replaceMember` criam pessoa com `rel: {}` e não semeiam relação com os colegas (ao contrário de `lineup16.joinBand`, que faz `??= 10`); `events.ts:203` também não chama `exitMember20`/`fixLeader20` nem `formerPush` (o ex-integrante não aparece na linha do tempo do ato até o `diff` mensal de `lineup16`). Observado 1 par assimétrico na simulação.

---

## 2. Melhorias de código (duplicação e fonte de verdade)

| Conceito | Onde é escrito/derivado | Problema |
|---|---|---|
| **Mortalidade** | `dynasty.deathRisk` (`:37`) e `lifecycle7.deathRisk` (`:28`) **idênticas**; `people16.lifeMonth` (tabela própria `pd`), `owner.ts:301` (dono), `heirs8` (parentes, `:~330`) | 4 tabelas de risco por idade, nenhuma com era/país/sexo. Unificar em `mortality(age, health, year)` em um módulo puro. |
| **Vício/dependência** | `Person.health='addiction'` escrito por `lifecycle.monthlyPeople` (recuperação 12%/mês), `lifecycle7.npcVices`, `soul9` (prazer+impulsividade), `people/health.ts` (`dependency` 0–100 só para elenco), `bridge17`, `leisure14`, `sits17`, `extras17`; `people16.Life16.dep` (indústria); `vices.ts.dep` (jogador) | 3 escalas (`health.dependency`, `Life16.dep`, `vices.dep`) e 2 máquinas de estado (`Person.health` enum × `St16`). Ver bug 1.3. Fonte de verdade sugerida: `dependency` numérico em toda pessoa; `health` derivado. |
| **Humor/moral** | `Person.morale` puxado por `lifecycle.monthlyPeople` (alvo 25%/mês), `thoughts.thoughtsMonth`, `soul9` (memórias), `temper`, `fame15`, `beliefs10`, `kin15.grief`, `dynasty`, `persona.perkSum`, eventos | Pilha de pensamentos (r4) e memórias da alma (r9) são dois modelos do mesmo humor, somados ao alvo paramétrico de r1. Escolher um (sugestão: thoughts para curto prazo, soul9 para memórias longas, e `monthlyPeople` só aplica o alvo). |
| **Estresse** | `Person.stress` (curto) + `stress17.l` (longo) — bom —, mas `soul9` sobrescreve o estresse de NPC por alvo (`:386`), `life.ts:817` copia `owner.stress` para a pessoa do jogador todo mês (qualquer `addStress` no jogador-pessoa é perdido) | `addStress` deveria ser a única entrada; `owner.stress` e `person.stress` do jogador precisam ser o mesmo campo. |
| **Idade / nascimento** | `Person.born`; `owner.born` (sincronizado em 2 lugares: `life.ts:818` e `persona13.syncPlayerPerson13`); `people16.born16` (hash) para não-artistas; `leaders10.born`; `heirs8` staff (bug 1.11); filhos: `owner.kids[].born`, `families[].kids[].born`, `kin15.kids[].born`, `kids17` (chave `nome|born`) | Idade de não-artistas é derivada e nunca envelhece "de verdade" (fórmula fechada em `ability18.npDelta18`). OK, mas documentar que `per13.born` é a fonte. |
| **Fama** | `Act.fame` → `fame15.personFame` (derivada) → `fame16.fameIn` (regional) → `life.fame` (jogador, separada) → `notoriety14` (carreiras) → `hype12` | Camadas coerentes; só `life.fame` não é `personFame(playerPerson)`. |
| **Parceiro/romance** | `life.partner` (jogador) + `love17` (extras do jogador), `families[pid].partner` (artistas: `dynasty`, `leisure14`; indústria: `people16`), `P(s).romances` (dentro da banda), `sex17.lav` (fachada), `kin15` aresta `spouse` (reais) | 5 representações sem ponte (bug 1.7). |
| **Filhos** | `owner.kids` (+`life.kidsX` + `kids17`), `families.kids` (+`lineage`, `parentId`), `kin15.kids` | 3 modelos (bug 1.8). |
| **Saída/entrada de integrante** | `exitMember20` centraliza a saída (bom), mas há 8 pontos de **entrada** ad hoc (`push`+`actsTouched17`); `formerPush` duplicado em `lifecycle7.ts:35` (dedupe por pessoa) e `lineup16.ts:78` (dedupe por pessoa+ano) | Criar `joinMember20` e um único `formerPush`. |
| **Criar ato com pessoas existentes** | `dynasty.startSoloCareer` (clone), `lifecycle7.careerMoves`, `lineup16.goSolo16/newBand16`, `soul9.formAct`, `stories8`, `bonds9`: padrão "makeAct gera N pessoas → `delete s.persons[...]` → troca `members`" | Gasta ids/RNG, deixa `rel` inicial inconsistente e índice stale (1.12). `soul9.formAct` já é a versão boa: exportar e usar nas outras cinco. |
| **Morte** | `dynasty.personDies`, `people16.die`, `realworld.monthly` ('fate' de ex-integrante faz `p.alive=false` direto, sem `personDies`), `heirs8.endDynasty/applyHeir` | Ex-integrante real morre sem cofre/direitos de imagem/luto. |
| **Instrumentos** | `talent/attrs.otherInstruments` + `talent.learnInstrument` (`talent.ts:111`) e `instruments.ts` (`startLessons :143`) | Dois sistemas de instrumentos secundários; `life.ts learnNewInstrument` usa o de `talent`, a UI (`ui/sys/instruments.ts`) usa o de `instruments.ts`. |
| **Identidade por nome** | `people16.ix16.byName`, `kin15.graph.idx`, `realworld.pidIndex`, `lifecycle7` produtor por nome | Todas por `canonKey(name)`; homônimos e colisões de nomes gerados viram uma pessoa (1.10). |
| Pequenos | `TRAITS.find` em vez de `traitById` (`people.ts:234`); `dynastyYear` vazio (`dynasty.ts:438`); `openVote` nunca chamado (`dynasty.ts:285`; a votação da banda do README não roda); `actOfPerson17` reexportado por `love17.ts` como varredura O(atos) com o mesmo nome do índice de `actidx17`. |

---

## 3. O que pode ser aprofundado (mecânicas rasas, stubs, valores fixos)

1. **Mortalidade** sem época, país, sexo nem causa estruturada: `deathRisk` é a mesma tabela em 1890 e 2040; causa é texto. Sem acidentes de estrada ligados a turnê (`tour_accident` existe só como memória em `soul9`), sem overdose derivada de `dependency` para artistas (só para indústria em `people16`).
2. **Aposentadoria**: individual só por idade (`retireAge ?? 70`) com 2%/mês; não olha saúde da voz, estresse longo, família, dinheiro (`P(s).wealth`).
3. **Família do artista** (`dynasty.familyMonth`): parceiro é um nome com `trust/wellbeing/agenda`; a agenda do parceiro (6 textos fixos) não tem efeito mecânico além de ±trust; filhos têm só `bond` e `musical`. `kids17` (fases, temperamento, caminho aos 18) existe só para os filhos do jogador — poderia ser reaproveitado para artistas.
4. **Votação da banda** (`openVote/resolveVote`) implementada e nunca disparada; **facções** só geram um aviso aos 70 de tensão — nada de racha/saída/mediação automática.
5. **Reunião negociada** (`reunionTerms`): chance = relação média + ressentimento + flag `reunionPrep`; não considera idade/saúde dos membros, fama de pico (`fame15.comebackPot`) nem o mercado de nostalgia (`fame15` já calcula).
6. **Supergrupos** (`lifecycle7.careerMoves`): dois sorteios na mesma família de gênero; não usa `bonds9`/`social8` (laços reais entre pessoas) nem `soul9.dreamOf('supergroup')` — há duas implementações independentes (lifecycle7 e soul9).
7. **Instrumentos**: aprendizado de NPC existe, mas `instrumentBonus` só olha instrumentos típicos do gênero; não há "troca de instrumento principal" por evolução, nem lesões por instrumento ligadas a `health.strain` (que já existe por função).
8. **Looks**: `looks15` só aplica visual real a famosos; `looks17.ageism17` é um multiplicador fixo. Envelhecimento do retrato (`Appearance.ag/gy/bl`) é derivado na UI, sem efeito de saúde/vícios no visual.
9. **Beliefs**: visões políticas/religiosas derivadas uma vez; nunca mudam para NPCs (conversão, radicalização, era).
10. **Ability18** já é rico; falta ligar `band` (faixa juvenil) com o scouting (`knownLevel`) e a passagem do tempo (a faixa é resolvida na geração e nunca "revelada" gradualmente).
11. **afterlife19**: herdeiros com opinião, mas `estate18.heirs` não são pessoas (`pid` opcional) — não envelhecem, não morrem, não herdam de novo.
12. Valores fixos espalhados: custo do substituto `$6.500`/`$4.000` (`events.ts:198`, `lifecycle7.ts:138`) em dois lugares; `CAP16 = 30` pessoas/mês da indústria; `trackedPersons` apenas elenco do jogador para saúde/pensamentos (NPCs famosos não têm voz/audição/lesão).

---

## 4. Sistemas que não se conversam (verificado por grep/registro em `sys/index.ts`)

Todos os módulos da área estão importados em `src/sim/sys/index.ts` e registram hooks (`looks17` e `gone16` são só mods/ganchos passivos, correto). Pontos de desconexão:

1. **Vícios × saúde × shows** — `lifecycle7.npcVices`/`soul9` marcam `health='addiction'` sem `dependency`; `people/health.ts` cura ao assinar (1.3). `healthPenalty` (bilheteria) só vale para atos do jogador; NPC viciado não perde público nem cancela show.
2. **Fama × notoriedade × fãs** — `fame15`/`fame16` (atos) e `notoriety14` (carreiras do jogador) nunca se leem; `fame15.personFame` não alimenta `people16` (um produtor que também é artista famoso não tem demanda maior).
3. **Família × agenda** — `dynasty.familyMonth` lê `s.loadNow`/turnês (ok), mas a agenda não sabe da família: nascimento/separação não geram slot nem `addThought('family_strain')` (existe em `THOUGHTS` e é usado só por `secrets`). `kids17`/`love17` só para o jogador.
4. **Morte × espólio × catálogo** — funciona via `remember('death')`→`bridge17`→`Fact`→`afterlife19` (1.15). Ex-integrante real que morre por 'fate' (`realworld.ts:~520`) não passa por `personDies`: sem `imageRights`, sem cofre, sem luto de `kin15`/`bridge17` (o fato é emitido pelo `remember('death')`, mas `dead` em `bridge17` só olha `actors` = ato).
5. **Traços × composição** — `temper.ts` e `talent.ts` só nos atos do jogador (`isMine`); `soul9` facetas entram em `ability18.drive`, mas não em `composeSongs` (q das músicas de NPC ignora personalidade).
6. **Família real (`kin15`) × família gerada (`dynasty`) × herdeiros do jogador (`heirs8.relatives`)** — três grafos sem arestas entre si (1.8). `people16.REAL_KIN16` é um quarto dataset de parentesco real.
7. **sex17 × romances de banda** (1.7) e **sex17 × dynasty.familyMonth** (parceiro sem sexo/orientação).
8. **stress17 × soul9**: `soul9` força o estresse do NPC a um alvo todo mês (`:386`), apagando o que `addStress` (fatos ruins, armário, luto) acumulou — para NPCs o `stress17.l` praticamente nunca cresce.
9. **lineup16 × events.member_leaves** — a saída do evento clássico (`events.ts:192-209`) não usa `leaveBand16`/`freeUp` nem registra `former`; quem sai assim não entra no mercado de músicos livres até o `diff` mensal, e nunca recebe `why`.
10. **prune × todos os registros por `personId`** (1.14).

---

## 5. Ideias para o jogo (a partir desta área)

1. **Um "registro civil" único** (`persons` para todo mundo: artistas, produtores, empresários, CEOs, parceiros, filhos, herdeiros). `people16` já faz metade disso com chaves `p:/pd:/e:/l:`; completar transformaria parceiros e filhos em pessoas com idade, morte, carreira e laços — e resolveria 1.7, 1.8, 1.10, 1.17 de uma vez.
2. **Curva de vida por era**: mortalidade e aposentadoria por década/país (gripe de 1918, guerras, AIDS nos anos 80 para cenas específicas, opioides 2010+), ligadas a `history19`/`regions19`. Mortes de NPCs famosos virariam eventos de mercado (catálogo, tributos já existem em `tribute19`).
3. **Dependência como mecânica de risco visível**: barra única por pessoa com gatilhos (turnê longa, fama alta, parceiro de banda viciado, era) e um "mês de reabilitação" que bloqueia agenda — hoje isso existe só para o jogador (`vices.ts`) e para o elenco com clínica.
4. **Votação/facções com dentes**: usar `openVote` em decisões reais (gravar com produtor X, aceitar turnê, trocar gênero) com a facção do líder puxando, e racha automática quando `tension > 85` (hoje só avisa).
5. **Ciclo de vida da banda como história**: unificar `careerEnd` (relógio), aposentadoria individual, hiato e reunião num só "estado de carreira" com causas (`why`) e previsões na caixa de entrada (`life20` já avisa um ano antes).
6. **Herdeiros do espólio como pessoas** (`afterlife19`): filhos reais/gerados do morto assumem o espólio, envelhecem, brigam, podem virar artistas (já há `lineage`).
7. **Scouting de potencial que amadurece**: a faixa juvenil `band` de `ability18` revelada progressivamente com os anos/convivência, e "late bloomer" como surpresa narrativa.
8. **Instrumentos únicos** (um só sistema): instrumento-ícone ligado a `gear19`, lesão por instrumento (`health.strain`), troca de função principal ao envelhecer (baterista → produtor).
9. **Gênero gramatical e nomes**: separar `FIRST_NAMES` em masculinos/femininos por idioma e derivar `sex` do nome; gerar textos com `{ele/ela}` em vez de "(a)".
10. **Relatório mensal de "vidas"**: `people16.news`, `fame15.log`, `kin15.log`, `love17.log`, `lineup16.ev` são cinco diários paralelos — um feed único por pessoa (com `Fact`) daria a sensação de mundo vivo que o README promete.

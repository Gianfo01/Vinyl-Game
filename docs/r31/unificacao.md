# Masters 31 — Unificação de motores e de estados duplicados (plano 30)

Leitura só de código, sem edições. Repo `/home/user/Vinyl-Game`. Os caminhos são relativos ao repo.
Números de linha conferidos no código atual (HEAD do momento da auditoria).

> **Decisão do dono (vale para todo este documento): NÃO precisamos manter compatibilidade com saves antigos.** O jogo
> ainda está em teste e os saves antigos podem ser descartados. Por isso as propostas abaixo **não trazem migração de
> save nem apelidos (aliases) permanentes**. A regra é substituir de forma limpa: cria-se a fonte única, os leitores
> passam a usá-la e **os módulos antigos são apagados**. Um adaptador só existe *dentro de uma onda*, enquanto o código
> é trocado, e sai antes de a onda fechar. Bônus: dá para apagar também o código que só existe por causa de saves velhos
> (ex.: o fluxo único de `s.rng` em `rng19.ts` e os `??=` de reparo espalhados pelos `fresh()`).

---

## Parte A — Resumo para o dono

**O problema numa frase:** o jogo cresceu em rodadas, e muitas rodadas criaram um sistema novo *ao lado* do antigo em
vez de trocar o antigo. Hoje há vários lugares guardando a mesma coisa, e eles não concordam entre si. O jogador vê um
número numa tela e outro número em outra, e às vezes o jogo decide usando o número que a tela não mostra.

**Os 6 casos que mais causam bug (fazer primeiro):**

1. **Opinião das pessoas sobre você — 5 lugares, valores diferentes.** A ficha mostra um número, mas a oferta de
   contrato e o desempenho da equipe usam outro. Exemplo real: um funcionário pode aparecer "leal" na ficha e, mesmo
   assim, render menos por estar "desmotivado com você", porque cada parte lê de uma gaveta. **Uma gaveta só.**
2. **O que você sabe sobre cada artista — 5 regras.** A fama de um artista estrangeiro aparece exata numa tela e como
   "?" em outra. A auditoria `conhecimento.md` já detalha. **Uma regra só, com um único "grau de conhecimento".**
3. **Avisos e caixa de entrada — 3 "orçamentos de atenção" e 4 canais.** Cada um corta mensagens por um critério
   diferente, e o jogador não sabe por que uma notícia apareceu e outra sumiu. **Um funil só.**
4. **Relação com cidades e promotores — 3 números por cidade** (começam em 0, 30 e 50). A mesma cidade pode gostar e
   não gostar de você ao mesmo tempo. **Um número por cidade.**
5. **Segredos — 4 depósitos.** Os segredos da Intriga (rodada 6) **não entram** na camada de "O que sabemos" (rodada
   23): a imprensa nunca descobre esses segredos. **Ligar ou apagar.**
6. **Casa própria — 2 sistemas.** A casa comprada na ficha do dono e os imóveis da Loja aliviam o estresse *em
   dobro*, e a casa da ficha **não conta no patrimônio**. **Um sistema de imóveis só.**

**Os que mais pesam no tamanho do código (fazer em seguida):** festivais (5 motores), casas de show (3 depósitos
atrás de uma fachada), turnês (5 motores), rivais (8 módulos), empresário (4 camadas), metas e finais (2 motores de
"final de partida"), diário e histórico (o Diário do jogador é guardado **duas vezes** e uma das cópias cresce sem
limite no save).

**O que NÃO é problema (verificado):** dinheiro da empresa. Toda entrada e saída de caixa passa por uma porta só
(`post`); fora dela só há 5 atalhos de teste e de cenário. Os "vários livros" são *visões* do mesmo lançamento, não
cópias. O dinheiro **pessoal** do dono, porém, não tem livro nenhum (81 pontos mexem nele direto) — isso entra na lista.

**Custo e risco:** tirar a compatibilidade de save corta o custo pela metade. O risco que sobra é de **equilíbrio e
determinismo** (os testes que comparam partidas com a mesma semente vão mudar de resultado) — por isso cada
unificação troca os números esperados dos testes na mesma onda, de propósito, e registra o porquê.

**Quem faz o quê (R31):** onda 0 cria os contratos (as "gavetas únicas" vazias e as regras de quem pode escrever);
31.1 cuida do que o jogador lê (conhecimento, avisos, menus); 31.3 cuida de dinheiro, dados e estados; 31.4 cuida do
mundo (festivais, casas, turnês, rivais, crime, relíquias); 31.2 só consome (cenas leem a fonte única); 31.5 apaga o
que sobrou e fecha os testes.

---

## Parte B — Técnico

### B.0 Como medir "duplicado" e "desconectado"

- 248 chaves `registerExt4` (estado em `s.x4`), em ~240 arquivos. 145 arquivos têm um vetor próprio de log/hist/notas.
- **Desconectado** = escrito e nunca lido para decidir, ou lido e nunca escrito, ou duas fontes que deveriam ser uma e
  nunca se sincronizam.
- Convenção usada abaixo: **SSOT** = fonte única da verdade. **Tam.** S (até 1 dia de agente), M (2–4), L (5+).

### B.1 Tabela de prioridade

| # | Cluster | Impacto em bug/coerência | Custo | Tam. | Onda / dono |
|---|---|---|---|---|---|
| 1 | Opinião sobre o jogador | **Alto** (contradição já ativa nas ofertas e no rendimento da equipe) | médio | M | 0 (contrato) + 31.3 |
| 2 | Conhecimento/visibilidade | **Alto** (telas contraditórias) | médio | M | 0 + 31.1 |
| 3 | Relação com cidade/promotor | Alto (3 escalas) | baixo | S | 31.4 |
| 4 | Segredos | Alto (Intriga desligada) | médio | M | 31.4 |
| 5 | Notificações/atenção | Alto (UX) | médio | M | 31.1 |
| 6 | Imóveis/casa | Médio (alívio em dobro, patrimônio errado) | baixo | S | 31.3 |
| 7 | Diário/histórico | Médio (save cresce; cópia dupla) | médio | M | 31.3 |
| 8 | Calendário/agenda | Médio (prazos faltando) | baixo | S–M | 31.1 |
| 9 | Metas e finais | Médio (2 finais) | médio | M | 31.5 |
| 10 | Festivais | Médio | alto | L | 31.4 |
| 11 | Casas de show | Médio | médio | M | 31.4 |
| 12 | Turnês | Médio | alto | L | 31.4 |
| 13 | Reputação/fama | Médio | médio | M | 31.3 |
| 14 | Empresário | Médio | médio | M | 31.4 |
| 15 | Delegação/políticas | Médio | médio | M | 31.3 |
| 16 | Dinheiro pessoal do dono | Médio | baixo | S | 31.3 |
| 17 | Relíquias | Baixo | baixo | S | 31.4 |
| 18 | Rivais | Baixo (fachada já existe) | alto | L | 31.4 (só apagar) |
| 19 | Crime/escândalo | Baixo–médio | alto | L | 31.4 |
| 20 | Pessoas (lojas de pessoa) | Baixo agora, alto a longo prazo | alto | L | 0 + 31.3 |
| 21 | Rádio/streaming/mídia | Baixo | médio | M | 31.4 |
| 22 | RNG | Baixo (limpeza) | baixo | S | 0 |
| 23 | Fatos × diário × eventos | Baixo | médio | M | 0 |
| 24 | Menus (7 modelos de navegação) | já no plano de enxugar | — | — | 31.1 |

---

### B.2 Opinião sobre o jogador (prioridade 1)

**Módulos e estados**

| Fonte | Arquivo | Estado | Escala |
|---|---|---|---|
| Líderes de selo | `src/sim/sys/leaders10.ts` | `x4.leaders10.L[id].rel.player` | −100..100 |
| Críticos | `src/sim/criticrel.ts` | `x4.critrel.rel[critic]` | −100..100 |
| Equipe | `src/sim/sys/people/staff.ts` (`careerOf().loyalty`) | carreira do funcionário | 0..100 |
| Pessoas | `src/sim/types.ts:218` `Person.rel` | `s.persons[id].rel[playerPid]` | −100..100 |
| Ficha unificada | `src/sim/sys/persona13.ts` | `x4.persona13.op[key] = {v, w[]}` | −100..100 + motivos |
| Confiança do ato no selo | `actsNow27(...).trust` (atos do jogador) | `a.trust` | 0..100 |
| Outros "rel" com o jogador | `media17.rel[outlet]`, `services12.rel`, `hype12.rel`, `supply18.rel`, `supply13.rel`, `agency18.rel` (NPC↔NPC), `venue12.rel[act]`, `bonds9` (laços), `people/state.bonds` | vários | vários |

**Como funciona hoje.** `opinionOf()` (`persona13.ts:496-504`) lê a fonte nativa por prefixo (`l:`, `c:`, `s:`, `p:`) e
só cai em `p13.op` para os demais. `opine()` (`persona13.ts:507-536`) escreve nas **duas**: soma `v` em `op[key].v`
e soma uma versão **escalada** na nativa (crítico ×0,6; equipe ×0,5 e em escala 0..100; pessoa ×1 e ainda ×0,25 em
`a.trust`).

**Contradições confirmadas**

- `staffAdj13` (`persona13.ts:327`) usa `op['s:id'].v` (≤ −25 ⇒ "desmotivado(a) com você", −3 no rendimento), mas a
  ficha usa `opinionOf('s:id')` = `(loyalty − 50) × 2`. Os 17 arquivos que mexem em `loyalty` direto (`culture19`,
  `crew8`, `board27`, `burnout27`, `kin27`, `shark27`, `favors27`, `links16/19b/23`, `manager12`, `insure19`,
  `identity8`, `crisis27`…) **nunca** atualizam `op`. Resultado: ficha "leal", rendimento "desmotivado".
- Modificador de oferta `persona13op` (`persona13.ts:361-368`) usa `op['p:id'].v`, mas a ficha mostra
  `persons[id].rel[me]`. Quem escreve `rel` direto (`scandal17.ts:152`, `featp29.ts:258`, `member29.ts:449`,
  `aud27/reach27.ts:167`, `crime17`, `soul9`, `fame15`, `kin15`, `family29`, `npc17`, `dynasty.ts:396`) não muda a oferta.
- `critic27.ts:124` lê `op['c:…']`, o resto lê `critRel`. `media17.ts:436,445` escreve `critRel` direto.
- `rel.player` dos líderes é escrito direto em `heist27`, `rivals12`, `insure19`, `songmkt27`, `crimenpc17` (sem `op`).
- Escalas diferentes para a "mesma" opinião (−100..100 × 0..100), com conversões ad hoc em cada leitor.

**Alvo.** `src/sim/opinion.ts` (novo, onda 0): **um** registro `x4.op[key] = { v, w[] }` com chave canônica
(`p:`, `l:`, `c:`, `s:`, `e:`, `o:` veículo…), API `opinionOf/opine/setOpinion`. Os campos nativos **deixam de existir**
como armazenamento: `leaders10.rel.player`, `critrel.rel`, `loyalty` da equipe e `Person.rel[playerPid]` viram leituras
de `opinionOf` (a lealdade da equipe passa a ser `50 + op/2` calculada, não guardada). `Person.rel` continua só para
NPC↔NPC. `a.trust` vira derivada (média da opinião dos membros + contrato) ou fica como único campo de *contrato*, mas
não recebe mais `opine`. Apagar `criticrel.ts` (estado) e o espelhamento em `opine`.
**Regra de lint (onda 0):** proibido escrever `.rel.player`, `critrel.rel[`, `.loyalty =`, `.rel[pid0` fora de `opinion.ts`.
**Risco:** muda equilíbrio de ofertas e da equipe (testes `r11-opinions`, `r13-persona`, `r14-*`); determinismo
preservado (nada sorteia). **Tam. M.** Onda 0 (contrato + lint) e 31.3 (troca dos ~45 escritores).

### B.3 Conhecimento e visibilidade (prioridade 2)

Já auditado em `plano30/conhecimento.md`; aqui só o resumo de unificação.

| Regra | Arquivo | Escala |
|---|---|---|
| `s.knowledge[actId].degree` + `estimate()` | `src/sim/scouting.ts:45-74` | 0..5 + viés |
| `visibleFields(degree)` | `src/sim/scouting.ts:76` | por grau |
| `knownLevel/canSee/NEED/fameText` | `src/sim/sys/fame15.ts:120-170` | 0..5 (pub/priv) |
| `KNOW27` | `src/sim/sys/knownacts27.ts:49,218` | 0..3 |
| larguras `w13` | `src/ui/sys/persona13.ts:51` (regra **na UI**) | [99,30,18,10,4,0] |
| segredos `LVL23` | `src/sim/sys/secrets23.ts:106` | 0..4 por observador |
| `fuzzy18` | `src/sim/decide18.ts:143` | probabilidade em palavras |

**Contradições:** `estimate('fame')` mostra a fama **exata** quando `act.fame ≥ 30` (fama global), mas `fameText` usa a
exposição vista **do país do jogador** (`fameAt(s,a,'@me')`, fame16): um estrangeiro com fama global 35 aparece exato no
diretório e como faixa/"?" na ficha. `estimate` ignora o relacionamento (`relDeg`); `knownLevel` não. As larguras das
faixas existem em 3 tabelas (`scouting.widthFor`, `fameText` 6/12, `w13` na UI).
**Alvo:** `src/sim/know.ts` com `know(s, id) → { deg 0..5, pub, priv, width(field) }` e `estimate()` reescrito por cima
dele; `visibleFields`, `KNOW27`, `w13` viram leituras (KNOW27 vira só rótulo). Segredos continuam em `secrets23`
(é o modelo multi-observador e fica como está). **Tam. M.** Onda 0 (API) + 31.1.

### B.4 Relação com cidade/promotor (prioridade 3)

- `tour12.ts:44` `c12.rel[city]` padrão **30**, 0..100, decai a 30.
- `route8.ts:122` `route8.rel[cityId]` padrão **50**, 0..100.
- `exch20.ts:64` `exch20.rel[city]` padrão **0**, 0..100 (desconto de residência).
- Mais `venue12.rel[actId]` (casa ↔ ato) e `tour12.heat/fat/sat` (calor e cansaço por cidade).

Três números para "como a praça me vê". **Alvo:** `x4.city.rel[city]` (0..100, padrão 30) num módulo `city.ts`; os três
leem e escrevem nele; apagar os três campos. **Risco:** equilíbrio de turnês (route8 começava em 50). **Tam. S.** 31.4.

### B.5 Segredos (prioridade 4)

Depósitos: `sys/intrigue.ts` (`x4.intrigue.secrets`, r6), `sys/people/secrets.ts` (`P.secrets`), `holds17.ts`
(`kind: 'secret'`), `sys/secrets23.ts` (camada de quem sabe, com adaptadores `registerSecretSource23`: `native`, `people`,
`crime23`, `sex17`, `fakes19`, `st18`, `assumed`). **Desconectado:** `intrigue` **não** é fonte do `secrets23`
(nenhum adaptador): segredos da Intriga nunca vazam para imprensa/rivais e não aparecem em "O que sabemos".
**Alvo:** `secrets23` vira o **único** depósito (`own[]` já existe); `people/secrets` e `intrigue.secrets` passam a criar
via `secrets23`; `holds17` guarda só o *uso* (chantagem) apontando para o id do segredo. Apagar `intrigue.secrets` e
`P.secrets`/`secretsSeeded`. **Tam. M.** 31.4.

### B.6 Notificações, caixa e atenção (prioridade 5)

| Peça | Arquivo | O que faz |
|---|---|---|
| `notify()` | `src/sim/util.ts:128` | `s.notifications` (120) + gancho `NOTIFY19` |
| `budget19` | `src/sim/sys/budget19.ts:91` | define `NOTIFY19.f` (dobra avisos de baixo valor) + orçamento global de conflitos |
| `notify19` | `src/sim/sys/notify19.ts` (`x4.ib19`) | orçamento **por categoria/mês** + "Boletim da semana" |
| `story28` | `src/sim/sys/story28.ts` | **outro** orçamento de atenção (cenas 2/avanço e 3/mês, dicas 3/mês) |
| `interrupt23` | `src/sim/interrupt23.ts` | regra de quando a cena interrompe |
| Caixa | `src/sim/inbox18.ts` + `sys/inbox18.ts` (tipos) e `sys/people/inbox.ts` (`P.inbox`) | duas caixas |
| Feed | `sys/people/feed.ts` (`P.feed`) | rede social |
| UI | toasts em `src/ui/advisor.ts`, `tutorial18.ts`, `act27/*` | |

**Problema:** três cortes independentes (categoria, conflito global, atenção de cena) + duas caixas. **Alvo:**
`src/sim/attention.ts` com **uma** fila priorizada (`push(item, prio, cat, decide?)`) e **um** orçamento; `notify`,
`people/inbox`, mensagens de `inbox18` e cenas viram itens; boletim e álbum de cenas são *vistas* da fila. Apagar
`NOTIFY19`, o orçamento do `notify19` e o do `story28`. **Tam. M.** 31.1.

### B.7 Imóveis e casa (prioridade 6)

- `sys/people/owner.ts:43-55,154-164` `HOUSES` + `owner.house` (índice), compra com `owner.wealth`, `relief` aplicado em
  `owner.ts:274`.
- `sys/goods8.ts:82-93` bens `cat: 'home'` (por cidade, valorização, aluguel), `relief` somado em `goods8.ts:710`.
- `campus18.ts` lê `HOUSES` para a cena.

**Contradições:** os dois aliviam estresse (soma); `netWorth()` (`goods8.ts:350`) **não** inclui a casa de `HOUSES`
(revenda a 70% existe só no `owner.ts`). **Alvo:** imóveis = `goods8` (`cat:'home'`, com flag `primary` para a
residência). `HOUSES` vira itens de `goods8` sem cidade; `owner.house` vira o id do bem primário. Apagar `HOUSES`.
**Tam. S.** 31.3.

### B.8 Diário, histórico, crônica (prioridade 7)

| Log | Arquivo | Limite |
|---|---|---|
| `s.memory` (Diário) | `util.ts:96 remember` | 1500 → 1400, mantém `important` |
| `act.history` | idem | 40 por ato |
| `story28.dia` | `story28.ts:84` copia **toda** entrada do jogador | **sem limite** (cresce no save) |
| `chron9` | `sys/chron9.ts` (ouvinte do diário) | crônica do mundo |
| `facts17` | `facts17.ts` anel + índice | `INDEX_CAP` |
| `saga18`, `story12`, `end28` | leituras (ano em revista, retrospectiva, epitáfio) | — |
| `history19`, `hist27`, `realhist19`, `history15` | marcos reais (não são log; são roteiro) | — |
| ecos | `decide18`, `sys/echoes18`, `sys/echoes19`, `dm18` (fios) | — |
| 14 módulos com `log: []` próprio no `fresh()` e ~145 arquivos com algum vetor de log | | |

**Alvo:** `s.memory` como **único** diário, sem corte para entradas do jogador (o corte vale só para entradas do
mundo); `story28.dia` apagado (vira filtro de `s.memory`). Logs por módulo viram `remember(kind)` + filtro, salvo os que
são *dados de jogo* (ex. histórico mensal de uma casa). `chron9` fica como vista. **Tam. M.** 31.3.

### B.9 Calendário e agendas (prioridade 8)

- `src/sim/calendar19.ts` (núcleo, "calendário único") + `sys/calendar19.ts` (provedores) — 33 provedores
  `registerDeadline`.
- **Faltam no calendário:** shows do agente/promotor (`tour12.c12.shows`), roteiros de `route8`/`road27`, festival
  próprio (`fest12`: mês definido em `setCal12`), line-ups do mundo (`fests8`), agenda de concorrência (`clash17`,
  chave `cal17`), passos do rollout (`rollout.ts`), bolinhas do mês (`agenda17`). Prêmios: só os Gramofones entram
  (`sys/calendar19.ts:133-139`); os outros 4 de `awardcal19.ts` não.
- Três modelos de "tempo": `agenda.ts` (4 slots do **artista**), `agenda7.ts` (4 semanas + combos, por cima do
  `agenda.ts`), `agenda17.ts` (bolinhas do **dono**). Os dois primeiros são o mesmo conceito; o terceiro é outro.

**Alvo:** todo sistema com data registra um provedor (regra de onda 0: "sem provedor, sem data"). Fundir `agenda7`
dentro de `agenda.ts`. `agenda17` fica (outro conceito), mas renomear para `time.ts` para não confundir. **Tam. S–M.** 31.1.

### B.10 Metas e finais (prioridade 9)

- **Dois motores de final:** `legacy.ts:108 endingScores` (finais com tema neural/analógico, lido por `end28.ts:29`) e
  `sys/paths18.ts:239-272` (`pathScore18`/`pathEnding18`, caminhos de vitória; estendido por `wins19`).
- Metas: `legacy.ts:103 nextGoals` (marcos), `sys/ux19.ts:46 Goal19` (meta escolhida), `careers12.ts:313
  ambitionGoal`, `manager12` (`PlanGoal`, ambições do artista), `manager11` (`Goal`), `policy18` (`Goal18` por artista),
  `capital.ts:452` (meta do investidor), `venue12` (`Goal` da casa), `journey23` (próximo passo).

**Alvo:** `goals.ts` com tipo único `Goal { owner, kpi, target, due, src }`; `paths18` vira o **único** motor de final
(os finais de `endingScores` entram como caminhos); `Goal19`, `ambitionGoal`, metas da casa e do investidor viram
instâncias. **Tam. M.** 31.5 (mexe no fim de partida).

### B.11 Festivais

`sys/fest12.ts` (864 linhas; dono de festival, já "unifica" ventures9 + live), `sys/live/festival.ts` (terreno),
`sys/live/state.ts` (`liveOf(s).fests`, lido pelo calendário), `sys/fest18.ts` (curadoria/patrocínio), `sys/fests8.ts`
(festivais do mundo com line-up), `sys/circuit17.ts` (guerra de headliners), `sys/circuits18.ts` (circuitos regionais),
`ventures9` (`kind:'festival'`). **Alvo:** `festival/` com um registro `festivals[id]` (do mundo e seus), terreno e
negócio como partes do mesmo objeto; `fest18`/`circuit17` viram regras. **Tam. L.** 31.4.

### B.12 Casas de show

`venues27.ts` já é uma fachada ("um modelo só"), mas declara que "os dados de cada casa continuam onde nasceram":
`live/venue.ts` (construída), `venue12.ts` (`x4.venue12.v`, **uma** casa só), `venues17.ts` (reais). **Alvo:** um
registro `venues[key]` (`lv:`/`ve:`), programação do `venue12` aplicável a qualquer casa; apagar os 3 estados. Sem
save a manter, isso fica barato. **Tam. M.** 31.4.

### B.13 Turnês

`tours.ts` (núcleo diário, `s.tours`), `travel.ts`+`travelAdapter.ts` (puro, fica), `route16.ts` (rota sugerida),
`sys/road27.ts` (rota no mapa — **segunda** sugestão de rota), `sys/route8.ts` (turnê de terceiros com promotor, estado
próprio), `sys/tour12.ts` (agente×promotor, `c12.shows` **paralelo** a `s.tours`), `sys/live18.ts`+`tourhook18.ts`
(logística), `show27`, `showops20`, `shows20`/`clash17` (conflitos — estes já leem `tour12`). **Alvo:** `s.tours` como
registro único de datas (show avulso = turnê de 1 data); `route8` e `tour12` viram *papéis* (quem banca) sobre a mesma
turnê; fundir `route16` + `road27`. **Tam. L.** 31.4.

### B.14 Reputação e fama

- Ato: `Act.fame` (global) + `fame16` (por país) + `reach17`/`reachhook17` (peso mundial) + `relevance8` (peso de
  vendas por mercado — sobrepõe `fame16`) + `hype12` (hype por entidade).
- Pessoa: `fame15` (`pf`).
- Selo: `s.player.reputation{artistic,commercial,artists,institutional}`, `standing9` (rec/pop/mom/crit/trust para
  todos os selos), `offers12.labelClout` (jogador = `reachOf`, NPC = `lb.reputation`+família+`clout28`/`labelrep28`),
  `notoriety14` (por carreira), `identity8`, `culture19` e `aud27/culture27` (cultura — o próprio cabeçalho de
  `culture27` diz que `culture19` duplicava o perfil do `identity`).

**Contradição:** o artista avalia o jogador por `reachOf` e o rival por `lb.reputation` — escalas diferentes, e
`standing9` (que existe para todos) não entra. **Alvo:** `standing9` vira a reputação de selo única (jogador e rivais);
`labelClout` lê dela; `s.player.reputation` vira derivada; fundir `culture19` em `culture27`. `relevance8` passa a usar
`fame16`. **Tam. M.** 31.3.

### B.15 Empresário

`ventures9` (`mg.clients[]` com `sat`), `manager11` (metas e comissão), `manager12` (`c[actId].trust`, plano, agentes),
`managers14` (empresários reais, chave `e:`), `agency18` (NPCs agem). Satisfação (`sat`) e confiança (`trust`) do mesmo
cliente vivem em dois lugares. **Alvo:** `manager/` com `clients[actId] = { trust, mandate, plan }`; `sat` apagado;
`manager11` dentro do `manager12`. **Tam. M.** 31.4.

### B.16 Delegação e políticas

`agenda.ts` (`s.delegated[actId]`, agenda do artista), `sys/deleg16.ts` (ordens permanentes), `sys/policy18.ts` (regras:
teto, reserva, descanso), `sys/agenda17.ts` (envolvimento à frente/normal/delegado por carreira), `quarter28.ts`
(o Mestre lê a delegação). **Alvo:** `policy18` como contrato único ("o que a equipe pode fazer sem você"); `deleg16`
vira executor; `s.delegated` vira uma regra de `policy18`. **Tam. M.** 31.3.

### B.17 Dinheiro

**Caixa da empresa está bem:** `post()` (`util.ts:59`) é a porta única (dedupe por chave, DRE via `book18`/`ledger18`,
seção `noteSect23`). Só 5 escritas diretas em `player.cash`, todas em sondas/cenários (`probe29all.ts`,
`scenarios23.ts:275`, `live/scenarios.ts:77`). `oblig20` já é o registro de obrigações (fontes: `loans`, `creditors`,
`ap18`, `offers`, `plans`, `bond19`; reserva `prom28`).
**Falta:** (a) `owner.wealth` (dinheiro pessoal) tem **81** escritas diretas e nenhum livro — não há extrato pessoal;
(b) dívidas do agiota (`mob29` cria `loans` + `holds17`) e dívidas de vícios (`vices.ts`) entram por caminhos
próprios; (c) "Legado" com dois significados já tratado em `fin20` (B21). **Alvo:** `postPersonal()` espelhando `post`
para o bolso do dono; registrar `mob29`/`vices` em `oblig20`. **Tam. S.** 31.3.

### B.18 Relíquias

`sys/relics9.ts` (estado e lista **únicos**: `x4.relics9.list`, preço `relicPrice` com `relicHook`), `relics17.ts`
(catálogo real; `x4.relics17.done`), `sys/relics18.ts` (meta `x4.relics18.m`, valor por legado), `sys/relics28.ts` (sem
estado), `sys/relics29.ts` (meta `x4.relics29.m`; liga `relicKeep9/relicGone9`), `hype12.ts:212` (liga `relicHook`).
Está mais organizado do que parece (uma lista), mas há **3 metadados** por peça e **2 definições** de `interface Relic`
(`relics9` e `relics17.ts:22`). Contradição leve: o "porquê" do valor (`relics18.ts:161`) mostra `rl.v`, mas o preço
cobra `rl.v × 1,25–1,3 × hype`. **Alvo:** uma meta `rl.meta` dentro da própria relíquia; apagar `rel18.m`/`rel29.m`;
o "porquê" inclui o hype. **Tam. S.** 31.4.

### B.19 Rivais, crime e escândalo

- Rivais: `rivals.ts`, `rivals2.ts`, `rivals19.ts` (**fachada única já existe**), `sys/rivals8`, `rivals12`, `rivals27`,
  `rivalmind18`, `rivalsense28`, `rivals29data`. Sem save, dá para **fundir os estados** atrás da fachada e apagar.
  **Tam. L.** 31.4.
- Crime: `crime17` (núcleo), `crimenpc17`, `crimemem23`, `crimetargets29`, `heist27` (operação jogável), `mob29`
  (famílias), `aff29`/`aff29npc` (facções×gêneros). São camadas, não cópias; o problema é dívida/favor
  (`holds17`) e opinião (`rel.player` em `heist27`/`crimenpc17`) — resolvidos por B.2 e B.17. **Tam. M** (só limpeza).
- Escândalo: `scandal17.ts` é o pipeline (bom); `fanscandal28`, `cancel19`, `media17` (imprensa), `media.ts` (crise de
  RP antiga), `crisis27` reagem. Duplicado real: **crise de RP do `media.ts`** × **onda de cancelamento `cancel19`** ×
  **crise com relógio `crisis27`** — três relógios de crise. **Alvo:** `crisis27` como relógio único. **Tam. M.** 31.4.

### B.20 Pessoas

`s.persons` (núcleo), `s.player.staff` + `careerOf` (`people/staff.ts`), `s.professionals` (mercado), `leaders10`
(líderes de selo com estado próprio), `managers14` (`e:`), `producers15` (`pd:`), `writers19`, `crew8`
(especialistas), `goods8` `PSTAFF` (equipe pessoal), `manager12.agents`, `people16` (identidade única), `roles21`,
`npc17`/`npc29`. `per13` monta a ficha de qualquer chave (`p:` 193 usos, `l:` 62, `c:` 44, `s:` 40, `e:` 25, `pd:` 9,
`o:` 11 …). **Alvo de longo prazo:** toda pessoa é `Person` em `s.persons`; equipe, líderes, empresários e produtores
viram *papéis* (`roles21`) com dados do papel ao lado. Começar pela onda 0 (tipo `Role`), migrar líderes e equipe em
31.3; o resto depois de R31. **Tam. L.**

### B.21 Rádio, streaming e mídia

`sys/radio18.ts` (rádio como mercado: estações, PDs, consultores), `sys/media12.ts` (você **dono** de mídia, por cima de
`ventures9 kind:'media'` com `MediaKind` incluindo `radio` e `playlist`), `sys/scenes/radio.ts` (minijogo), `sys/stream18`
(fontes de descoberta), `sys/platform12` (você dono de plataforma), `media17`/`outlets17` (imprensa), `media.ts`
(críticos antigos), `media18`/`media19` (clipes; ligações). **Duplicado real:** a rádio que *você possui* (`media12`)
não é uma estação do `radio18`, e a playlist que *você possui* não é uma fonte do `stream18`. **Alvo:** sua estação
vira `Station18` com dono; sua plataforma vira fonte de descoberta. **Tam. M.** 31.4.

**`hotStyle`** (`sys/studio12.ts:209`): não é "lido e nunca escrito" — é função pura sorteada pela semente a cada 3
anos. Mas é **desconectado do mercado**: o "estilo em alta" do estúdio ignora `trends17` (gêneros em alta saem das
paradas). **Alvo:** derivar de `trends17`. **Tam. S.** 31.4.

### B.22 RNG (limpeza)

`Rng.fromSeed(...)` em 170 arquivos (315 usos, sorte pura por chave — o padrão bom), `rng19` (fluxo por sistema) em 37
arquivos, `rngOf(s)` (fluxo único legado, `util.ts:12`) em 17 arquivos (27 usos), `hashString` como dado em 49
arquivos, `Math.random` em 0. **Sem compatibilidade de save:** apagar o caminho `perSystem19 === false` em
`rng19.ts:58-69` e trocar os 27 `rngOf` por `rng19(s, chave)`. **Risco:** muda todas as sementes de teste uma vez.
**Tam. S.** Onda 0.

### B.23 Fatos × diário × eventos

`emitFact` 549 chamadas, `remember` 475, `notify` 544, `onFact` 292 (+7 ouvintes do diário). Muitos sistemas chamam os
três em sequência para o mesmo acontecimento. 57 tipos de fato só têm ouvinte curinga (`agency18`, `bridge17`,
`cine18`, `post18`, `dm18`, `balance19`); os 21 tipos que parecem "ouvidos e nunca emitidos" são emitidos por variável
(conferido: `fan_split`, `union_clash` etc. existem). **Alvo (contrato da onda 0):** `emitFact` é a única chamada; o
diário (`remember`) e o aviso (`notify`/atenção) passam a ser **ouvintes** do fato conforme `visibility`/`severity`.
Ganho: 3 chamadas viram 1, e o diário fica coerente com a crônica. **Tam. M.** Onda 0 (contrato) e aplicação gradual.

### B.24 Menus

Sete modelos de navegação (`nav15`, `navcore15`, `nav17`, `careernav13/14/16`, `hubs8`, `hubs20`, `registry`,
`blocks19`) — já está no plano de enxugar telas (31.1); só registrar aqui que a navegação deve ler **os mesmos
registros únicos** acima (ex.: um hub de Shows lê `s.tours` e não `c12.shows`).

---

### B.25 Plano por onda

| Onda | Entregas desta auditoria |
|---|---|
| **0 — contratos** | `opinion.ts` (API + lint de escrita), `know.ts` (API), `attention.ts` (tipos), tipo `Role`, regra "sem provedor, sem data", `emitFact` → `remember`/`notify` por ouvinte, limpeza do RNG legado. Testes de contrato: um teste por gaveta única verificando que ninguém escreve fora dela (grep no CI). |
| **31.1 clareza/UI** | B.3 conhecimento, B.6 atenção, B.9 calendário, B.24 menus. |
| **31.2 cenas** | Só consome: cenas leem `opinionOf`, `know`, `venues`, `s.tours`. Nada de estado novo em cena. |
| **31.3 economia/dados** | B.2 opinião (escritores), B.7 imóveis, B.8 diário, B.14 reputação, B.16 delegação, B.17 bolso do dono, B.20 (líderes e equipe). |
| **31.4 mundo/conteúdo** | B.4 cidades, B.5 segredos, B.11 festivais, B.12 casas, B.13 turnês, B.15 empresário, B.18 relíquias, B.19 rivais/crise, B.21 mídia/hotStyle. |
| **31.5 fechamento** | B.10 metas e finais; apagar módulos órfãos; trocar os números esperados dos testes de semente uma vez só; medir tamanho do save antes/depois. |

### B.26 Riscos transversais

- **Determinismo/goldens:** toda unificação que muda ordem de sorteio ou valor inicial (ex. cidade 50→30) muda os
  resultados por semente. Fazer a troca de expectativas **na mesma onda** e anotar no commit; nunca "consertar" teste
  sem anotar.
- **Desempenho:** `opinionOf` hoje é barata (lê campo); a versão única também (um mapa). `know()` deve ter cache por
  semana como `relDeg` já tem. A fila de atenção não pode varrer `s.memory` a cada tique.
- **Save:** sem compatibilidade, o risco de save é zero; ao contrário, apagar `story28.dia`, os três `rel` de cidade e
  as metas duplicadas reduz o save.
- **Paralelismo de agentes:** B.2 e B.20 tocam os mesmos arquivos (`persona13`, `people/staff`) — o mesmo agente.
  B.11–B.13 tocam `live/*` — o mesmo agente ou em sequência.

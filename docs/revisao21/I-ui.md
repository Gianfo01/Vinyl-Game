# Revisão I — Interface (src/ui, src/i18n, estilos)

Escopo lido: `app.ts`, `registry.ts`, `store.ts`, `dom.ts`, `common.ts`, `vis.ts`, `nav17.ts`, `hq.ts` (ciclo), `map.ts` (ciclo), `panels/*` (artists, business, people, misc, world), `sys/actmenu20.ts`, `sys/hubs20.ts`, `sys/ux19.ts`, `sys/ui20.ts`, `explain18.ts`, `tutorial*.ts`, `help18*.ts`, `actions20.ts`, loops de canvas (`pixel/*`, `sys/live/*`, `sys/campus18.ts`), `i18n/strings.ts`. Script de auditoria i18n em `scratchpad/i18n_check.ts` (rodado com `npx tsx` a partir da raiz; 792 arquivos, 34.069 chamadas `l('pt','en')`).

Legenda: **[CONFIRMADO]** = lido no código, com caminho:linha · **[SUSPEITO]** = padrão visto, consequência não executada. Prioridade: alta / média / baixa.

---

## 1. Bugs e erros concretos

### 1.1 Atalhos globais disparam dentro do menu Ações ▾, das cenas e do tour — **[CONFIRMADO] alta**
- `src/ui/app.ts:136-166` (`onKey`): só ignora `INPUT/SELECT/TEXTAREA` e `document.querySelector('.overlay')`.
- O menu `Ações ▾` (`src/ui/sys/actmenu20.ts:132-162`) é anexado a `document.body`, seus itens são `div[role=menuitem]` e o ramo de type-ahead (`:144-148`, `e.key.length === 1`) **não chama `stopPropagation`/`preventDefault`**. Resultado: digitar `a` para ir ao item "Agenda…" também executa `areaOfKey17('a')` → `go('directory')` (Todos os artistas) e re-renderiza a página por baixo; `w` → Mundo, `4` → Artistas etc.
- Cenas em tela cheia usam a classe `.scene-overlay` (`src/ui/registry.ts:165`), não `.overlay`; o tour é `.tour18`. Logo, com uma cerimônia/entrevista aberta, **Ctrl+Enter avança o mês** (`app.ts:141-145`) e as teclas de página trocam a área atrás da cena. `ux19` já define o seletor certo (`src/ui/sys/ux19.ts:119` `BUSY19 = '.overlay, .scene-overlay, .tour18, aside.tutorial'`), mas `app.ts` não o usa.
- Correção: em `onKey`, ignorar quando `e.target.closest('[role=menu], [role=dialog], .scene-overlay, .am20')` ou `document.querySelector(BUSY19)`; no `actmenu20`, `stopPropagation()` no ramo de type-ahead.

### 1.2 Listener `keydown` do `modal()` vaza quando o overlay é removido "por fora" — **[CONFIRMADO] média**
- `src/ui/common.ts:95-113`: `modal()` registra `document.addEventListener('keydown', onKey)` e só o remove dentro de `close()`.
- Fecham o modal com `document.querySelector('.overlay')?.remove()` (sem `close()`): `src/ui/app.ts:606-608` (fim de run: Diário / Sandbox / Nova run), `src/ui/sys/ux19.ts:126`, `src/ui/sys/hq8.ts:88,131,133,155`, `src/ui/sys/hq12.ts:30,67`, `src/ui/sys/mapinfo17.ts:176`.
- Efeito: um `onKey` órfão por modal fechado assim; a cada Esc futuro ele chama `close()` de um modal morto → `opts.onClose?.()` (re-render, callbacks) e `prev?.focus()` roubam o foco. Acumula ao longo da sessão.

### 1.3 Loop `requestAnimationFrame` da Sede continua no menu inicial — **[CONFIRMADO] média**
- `src/ui/hq.ts:170-199` (`start/stop`), singleton em `src/ui/panels/misc.ts:507-528`; `stopHq()` só é chamado em `app.ts:360,362,370` (dentro de `panel()`).
- "Menu inicial" (`app.ts:514`) e "Nova run" no fim (`app.ts:608`) fazem `store.game = null; titleScreen()`; `render()` (`app.ts:405`) retorna antes de `panel()`. O loop segue a ~FPS_MS fazendo `resize()` + `blitOut()` (`hq.ts:586-604`, `draw()` guarda `!s`, então não quebra) com a tela de título aberta.

### 1.4 Anúncio para leitor de tela é apagado pelo render — **[CONFIRMADO] média (a11y)**
- `src/ui/app.ts:224` `announce(g.briefing…)` escreve em `#sr-live`; em seguida `render()` (`:233/:237`) → `renderApp` substitui a árvore inteira e cria um novo `#sr-live` vazio (`app.ts:444-447`). O briefing do mês nunca é anunciado. Mover `announce` para depois do `render()` (ou manter `#sr-live` fora de `root`).

### 1.5 Ctrl+K e o índice de ajuda navegam para "áreas" que não existem — **[CONFIRMADO] média**
- `src/ui/tutorial18.ts:120` (`paletteCmds18`) e `:289,:307` (página Ajuda e tutorial) listam `helpIds18()` e chamam `go(id)`; `go()` (`app.ts:318`) não passa por `areaExists`.
- O script confirma 16 ids de `H()` que não são áreas: `bulletin19, links19a, echoes19, era19, realhist19, links19b, history19 (é aba do worldHub), bandpay19, world19, ctx19, prof19, exch20, union20, cockpit20, offer20, review20`. Clicar "? Boletim" → `store.area = 'bulletin19'` → `basePanel` cai no `default` (Mesa/Cockpit, `app.ts:393`), migalhas do grupo 0 e rota `#bulletin19` gravada no endereço.
- Áreas sem ajuda: `artist18`, `shared18` (e `desk`, que é alias).

### 1.6 Página Empresa usa abas fora do padrão `tabs()` — **[CONFIRMADO] média**
- `src/ui/panels/misc.ts:334-341`: barra própria com `store.companyTab`, botões sem `role=tab`, sem `data-tabs`.
- Consequências: `{`/`}` não trocam aba (`app.ts:168-174` procura `main [data-tabs]`), a aba não entra na rota/memória (`saveTabs15`/`syncRoute15`), Ctrl+K não lista "Empresa › Equipe" (`app.ts:542` lê `[data-tabs]`), a ajuda por aba (`helpFor18(openTabs())`) não acha nada, e a aba "Sede" dentro de Empresa duplica a área Sede. `store.marketTab` (`store.ts:47`) é estado morto (nenhum uso).

### 1.7 Subabas dos hubs r20 não entram no Ctrl+K — **[CONFIRMADO] baixa**
- `src/ui/app.ts:552` lista hosts fixos `[charts, market, media, catalog, world]`; `showsHub` (`sys/hubs20.ts:231`), `hqHub` (`:368`), `artists20` (`SUB20`) e os hosts `creation`/`business` (`registry.ts` `TabHost`) só aparecem quando a página já está aberta (varredura do DOM, `app.ts:542`).

### 1.8 Foco: diálogos não prendem Tab — **[CONFIRMADO] baixa (a11y)**
- `common.ts:95-113` (`modal`) e `registry.ts:154-176` (`openScene`) focam o primeiro botão mas não interceptam `Tab`; o foco sai para a página atrás (que continua operável por teclado). Combinado com 1.1, é possível avançar o mês "por trás" de um diálogo.

### 1.9 Botão aninhado em elemento interativo — **[CONFIRMADO] baixa (a11y)**
- `src/ui/panels/people.ts:58-59`: `header role=button tabindex=0 onclick` contém `h('button', { class: 'link', type: 'button' }, p.name)` sem handler — só funciona por bubbling; leitores de tela anunciam dois controles.

### 1.10 Strings fora do i18n / dependência do texto PT — **[CONFIRMADO] baixa**
- `'Erro'` cru em `src/ui/app.ts:511` e `src/ui/saves17.ts:239` (toast).
- `src/ui/sys/furnish.ts:42`: lógica depende do texto PT (`blk.pt.startsWith('A sede')`).
- 43 usos de `confirm()/prompt()/alert()` nativos (ex.: `newgame.ts:78` colar save via `window.prompt`, `sys/campus18.ts:123-126`, `sys/life17.ts:75-104`, `sys/venue12.ts:94`, `sys/eras8.ts:49`, `sys/instruments.ts:31`): sem tema, sem i18n nos botões, bloqueiam a thread e, no `prompt`, limitam o tamanho do save colado em alguns navegadores. **[SUSPEITO]** quanto ao limite.
- Resultado do script (resto está bom): 0 chaves de `S` sem EN; 3 `l()` com EN idêntico ao PT (`Café`, `Café / coworking`, `Haçienda (Manchester)` — nomes, aceitável); 20 EN com acento (nomes próprios, ok). Os 26 "hits" em `tracks18.ts`/`route8.ts` são falsos positivos (pares `(pt, en)` em helpers).

### 1.11 Placeholders diferentes entre PT e EN — **[CONFIRMADO] baixa**
- 11 chamadas (script). Perda real de informação em EN: `src/sim/sys/media17.ts:330` (EN perde `{v}`, o valor da indenização); `src/sim/sys/love17.ts:402`, `src/sim/sys/npc17.ts:587`, `src/sim/sys/sitsworld17.ts:94,136,138` (EN perde o nome `{p}/{b}/{c}`). Os demais (`fan15.ts:80,106`, `links16.ts:377`, `persona13.ts:748`, `people/inbox.ts:144`) usam chaves distintas por idioma com ambos os params fornecidos (verificado em `inbox.ts:144`).

### 1.12 Loops de canvas sem controle de visibilidade — **[CONFIRMADO] baixa**
- `src/ui/sys/live/stage.ts:164-171` (repinta o buffer inteiro com `putImageData` a cada 3 frames), `src/ui/sys/live/festival.ts:214-225`, `src/ui/pixel/places/view.ts:95-108`, `src/ui/pixel/cine18.ts:297-310`: rodam enquanto `isConnected`, mesmo fora da viewport ou com a aba em segundo plano. `sys/campus18.ts:62-77` e `pixel/scenes14.ts:111-125` fazem certo (IntersectionObserver + `document.hidden`).
- `src/ui/map.ts` é correto (`schedule()` sob demanda, `destroy()`), mas as três instâncias são singletons nunca destruídos (`panels/world.ts:322`, `panels/misc.ts:256`, `sys/tour12.ts:61`) — aceitável.

### 1.13 Timers/observadores globais permanentes — **[CONFIRMADO] baixa**
- `src/ui/sys/ux19.ts:395`: `setInterval(…, 1500)` para sempre (polling do cartão de abertura), inclusive no título.
- `src/ui/sys/ux19.ts:420-431`: `MutationObserver` em `documentElement` que, a cada lote de mutações, faz `querySelectorAll('button:not([aria-label])')` + regex por botão e `[role=tablist]`. Como todo clique é um re-render completo, cada clique dispara uma varredura O(n) do DOM inteiro.
- `src/ui/sys/ux19.ts:256`: listener de clique (captura) em todo botão calcula `snapNow` (soma de fãs de todos os atos) — barato, mas roda em todo clique.

### 1.14 Caches que só crescem — **[SUSPEITO] baixa**
- Sem teto: `pixel/avatar.ts:979` (`spriteCache`, chave look+era+pose+dir+frame+papel), `:1024-1025` (retratos e dataURLs), `hq.ts:1098` (`canvasCache`), `art.ts:9-10` (logos/capas em dataURL), `pixel/sprites.ts:111`, `pixel/tiles.ts:162,220`, `pixel/icons17.ts:69`, `pixel/places/index.ts:95`. Só `pixel/scenes14.ts:53` limita (40). Numa run de 150 anos com ~740 atos reais + procedurais, sprites por era (12 eras × 4 direções × 4 quadros × poses) e capas/logos não são liberados. Vale um LRU simples (ex.: 500 entradas).

### 1.15 Teclas — **[CONFIRMADO] baixa**
- `nav17.ts:91-96` (`KEY17`) usa `'`, `;`, `\`, `[`, `]`, `,`, `.`, `-`, `=`; `/` abre a paleta e `?` a ajuda (`app.ts:147-152`). Sem conflito real, mas `'`/`;` mudam de posição em layouts ABNT2/internacionais. O campo `key` de `registerArea` é só decorativo (`app.ts:303` usa `KEY17[a.id] ?? ''`) e tem duplicatas (`e` inbox/careers, `j` festivals, `p` people) — enganoso para quem lê o registro.

### 1.16 Tutorial antigo com texto desatualizado — **[CONFIRMADO] baixa**
- `src/ui/tutorial.ts:28`: passo "Estúdio e lançamentos" aponta `area: 'creation'` (hoje "Compor"; estúdio e lançamentos são `studio`/`releases` dentro do `studioHub`). `area: 'desk'` resolve via `ALIAS14` (ok).

### 1.17 Navegação direta sem `areaExists` — **[SUSPEITO] baixa**
- 18 lugares fazem `store.area = 'x'; rerender()` (ex.: `panels/artists.ts:48` → `'market'`). Para carreiras sem selo, `market` é `LABEL_ONLY17` (`nav17.ts:130`) e some do menu, mas a página abre assim mesmo, sem grupo nas migalhas (`groupOf17` devolve `gs[0]`).

### O que está certo (vale registrar)
- Sem XSS: `h()` só cria text nodes (`dom.ts:28-33`); os 9 `innerHTML` são SVG com números ou texto traduzido (`vis.ts:139,160`, `common.ts:137`, `story12.ts:29`, `home18.ts:40`, `finance18.ts:61-67`, `fame15.ts:48`, `bolsa10.ts:42`, `live/stage.ts:85`); `bonds9.ts:28` tem `esc()`. Não há `esc()` central — se algum dia um nome entrar num SVG via string, não há proteção.
- Campos de save antigo: tudo passa por `migrate()` → `ensureExt` (`sim/ext.ts:9-72`) + `ensureExt4`; nos painéis não há `s.x4.a.b` sem a chave inicializada; 0 asserções `!` sobre o estado em `src/ui`.
- `tx20` (avanço transacional) e `saveChip20` são sólidos; `tutorial18` remove o `keydown` do tour (`:156-160`); `campus18` e `actmenu20` removem seus listeners quando o elemento sai do DOM.

---

## 2. Melhorias de arquitetura e UX

1. **Re-render total × diff.** `renderApp` (`app.ts:411-456`) refaz topo, menu, main e tutorial a cada clique (`root.replaceChildren`), com `scroll15`/`stickyFix15`/foco remendando depois. Sem framework dá para: (a) manter `topbar` e `nav` como instâncias atualizadas por `update(g)`; (b) renderizar só `main`; (c) usar `data-key` por seção e `replaceWith` cirúrgico. Isso também elimina 1.4 e reduz o custo de 1.13.
2. **Estado da UI misturado com estado do jogo.** `store` (`store.ts:42-52`) mistura `game`, `area`, `selectedAct`, `companyTab`, `marketTab` (morto) e `prefs`; filtros vivem em módulos (`panels/artists.ts:41 filt`, `panels/world.ts:51 layers`, `panels/tours.ts:145`, `sys/mapinfo17.ts:202`, `sys/deleg16.ts:17 drafts`) e `tabState` em `vis.ts:127`. Nada disso é limpo ao carregar outro save (filtros e rascunhos vazam entre partidas). Centralizar num `uiState` com `reset()` chamado em `startGame()`.
3. **Uma só abstração de abas.** Além de 1.6, existem três mecanismos: `tabs()`/`setTab` (vis), `store.companyTab` (Empresa) e `studioHub` com `'write'|'studio'|'release'` por área. Unificar para que rota, Ctrl+K, `{ }`, ajuda e tour funcionem em toda página.
4. **Coerência de números.** Topo mostra `g.player.cash` (`app.ts:252`); ofertas, ações e Finanças → Posição usam `freeCash20()` (reservas de adiantamento, `sim/oblig20.ts:54`; `sys/fin20.ts:48`). O jogador vê "Caixa 50.000" e a ação diz "caixa livre insuficiente". Mostrar no topo `livre / total` (ou badge "−X reservado" com `data-why`). Reputação no topo é a média das 4 dimensões (`app.ts:254`) sem rótulo nem "por quê" — virar `why18('rep.avg')`.
5. **Profundidade.** 57 áreas registradas + 17 base, 42 abas extras e 42 seções extras, mais hubs r20 com subabas e fichas com abas de página. Há 14 ids que caem em "Mais" (`agenda17, biz17, careers, identity, inbox, management, outlets16, platform16, publishing16, studio12, tour12, tut18, ventures, desk`). Sugestão: orçamento de ≤ 3 níveis (Grupo › Página › Aba) e uma auditoria automática (teste) que falhe quando uma página/aba não é alcançável por Ctrl+K.
6. **Celular.** CSS total 2.491 linhas com 14 `@media` (`max-width` 640/700/860/900 misturados, `styles.css`). O menu vira barra (`subnav`) mas páginas largas (Artistas com `col-side`+`col-main`, Finanças tabelas, Sede canvas) não têm layout em coluna única verificado; o `actmenu20` tem modo "sheet" (`:109`), as cenas não. Padronizar breakpoints (ex.: 640/960) e usar `container queries` nos cartões.
7. **Diálogos.** Substituir `confirm/prompt` nativos (1.10) por `confirmBox18`/`modal` e adicionar focus-trap + `inert` no fundo (resolve 1.1/1.8 de uma vez).
8. **Registro de listeners.** Criar `onDoc(ev, fn)` que devolve `off()` e um `disposables` por tela, chamado em `renderApp` antes de trocar a árvore — resolve 1.2, 1.3 e futuros vazamentos de uma vez.

---

## 3. O que pode ser aprofundado na UI

1. **Gráficos.** Só há sparklines/linhas simples (`common.sparkline`, `vis.lineChart`, `finance18` barras, `fame15`, `story12`). Faltam: caixa × obrigações por mês (Posição), vendas semanais por lançamento sobreposto ao rollout, fãs por região empilhado, comparativo ano a ano no Diário. Todos têm dados (`fin18.m`, `charts7`, `audience8`).
2. **Comparativos.** `compareActs` existe (Ctrl+K "Comparar carreiras"); não há comparação de lançamentos (previsão × resultado de dois discos), nem de turnês (orçamento × acerto), nem "você × rival" (fama, catálogo, receita).
3. **Histórico.** `lastMonthLedger` e `fin18.m` guardam meses, mas a Finanças mostra 12 meses só no gráfico de barras; sem tabela ano a ano exportável. Diário tem só "fatos marcantes" (`misc.ts:497`), sem filtro por tipo/artista — a ajuda promete "Filtre por tipo" (`help18data.ts:26`).
4. **"Por quê" ausente.** `data-why` cobre 12 chaves (`cash.month`, `chart.pos`, `act.hype`, `act.fame`, `stress`, `show.demand`…). Faltam nas decisões mais caras: custo de prensagem e previsão de vendas (Lançamentos), leitura da negociação (Mercado, a ajuda diz que existe hover: `help18data.ts:85`), reputação do topo, valor de catálogo/selo, custo da turnê por cidade.
5. **Onboarding.** Três camadas (tutorial.ts cartão de 8 passos, tutorial18 tours + dicas + trilhas, ux19 cartão de abertura) com três chaves de preferência (`tut18`, `noTut19`, `tutorial.done`). Consolidar numa só trilha com objetivos verificáveis (`tracks18` já faz isso por carreira) e aposentar o cartão antigo.

---

## 4. Sistemas que não se conversam na UI

1. **Ações ▾ (registro único) × mutações diretas.** `actions20.ts` tem 24 ações, mas `panels/artists.ts:224-225,269,290,301` ainda mudam `s.agenda[id]`/`s.delegated[id]` direto (delegar, aplicar modelo, "Copiar esta agenda para todos"), sem passar por `runAction20` (sem revalidação de caixa/capacidade nem recibo `ux19`). `agenda.delegate`/`agenda.manual` existem no registro e fazem o mesmo por outro caminho. `quick18.actQuick18` também tem atalhos próprios.
2. **Ctrl+K × telas novas.** Ver 1.5 e 1.7: Ctrl+K lista ajuda de páginas que não existem e não lista subabas de Shows/Sede/Artistas/Negócios/Criação a menos que a página esteja aberta.
3. **Ajuda (help18data) × código — 15 itens conferidos:**
   | id | afirmação | código | veredito |
   |---|---|---|---|
   | cockpit (`:7-9`) | ignorar aplica a **última** opção | `sim/events.ts:892` `defaultOption = options[last]` | OK |
   | cockpit (`:8`) | "Caixa para 3 meses" em **amarelo** | `sys/home18.ts:140` `run < 3 → 'bad'` (vermelho), texto "fôlego de n meses" | divergente (cor/termo) |
   | artists (`:75`) | "clique no nome abre a ficha" | `panels/artists.ts:84-86` clique **seleciona**; ficha é subaba "Ficha completa"/ação `sheet.full` | **desatualizado** |
   | artists (`:74`) | 100% capacidade/mês | `sim/capacity.ts:33-42` | OK |
   | team (`:48`) | "analista libera relatório mensal" | `data/rules.ts:166` + `sys/explain12.ts:68-70`: analista só **estreita faixas** | **não existe** |
   | labels (`:161`) | estratégias "inundar, desenvolver, abandonar" | `common.ts STRATEGY` = develop/buy_catalog/niche/stars; `rivals8.ts:28` moves sem "flood" | **divergente** |
   | diary (`:26`) | "Filtre por tipo" | `panels/misc.ts:497` só "Só fatos marcantes" | **não existe** |
   | finance (`:52`) | empréstimo não é receita; recebíveis | `sys/fin20.ts` DRE × caixa | OK (lag "março→maio" não verificável no `ledger18`) |
   | market (`:83`) | feiras e dossiês | `sys/world4.ts:29` aba Feiras; `dossier13` | OK |
   | market (`:85`) | chance da oferta tem "por quê" no hover | `data-why` não cobre `offer.*` (12 chaves, `explain18`) | **[SUSPEITO] ausente** |
   | hq (`:38`) | estúdio próprio corta custo | `data/rules.ts:217` tier 0 custo 0; `production.ts:100` | OK |
   | charts (`:157`) | hype por artista | `registerTab('chartsHub', 'hype12')` | OK |
   | releases (`:112`) | saturação de canal | `sim/market.ts:91` `MEDIA18.eff` | OK |
   | people (`:78`) | aba "Relações" | `sys/people/area.ts:204` | OK |
   | shows (`:117`) | políticas de descanso | `hubs20` "Políticas e operação" | OK |
   Mais: `help18data` descreve `campus18` ("leva 4 meses") e `studio` ("ganho por take < 1 ponto") com números que não localizei no sim (`session18/19` não expõem ganho por take) — **[SUSPEITO]**.
4. **Tutorial × nomes de tela.** `tutorial.ts:28` ("Estúdio e lançamentos" → `creation`), `tutorial18` tour da página Artistas depende de `.am20-btn` (some com elenco vazio; o passo é pulado silenciosamente).
5. **Empresa › Sede × área Sede × hub Sede (r20).** Três entradas para o mesmo conteúdo (`misc.ts:334` aba `hq`, área `hq`, `hubs20.ts:368`), com estados de aba diferentes.
6. **Caixa do topo × caixa livre** (ver 2.4) e **reputação do topo × Empresa** (média sem rótulo × 4 dimensões).
7. **Teclas registradas × teclas reais.** `registerArea.key` (66 registros) é ignorado em favor de `KEY17`; a ajuda de atalhos (`shortcutsHelp15`) mostra `KEY17`, então pelo menos é coerente para o jogador, mas o código engana.
8. **Preferências de tutorial em três lugares** (`prefs.tut18`, `prefs.noTut19`, `g.tutorial.done`) — "Sem tutoriais" não zera `tutorial.done`, "Reiniciar tutoriais" (`app.ts:502`) toca nos três manualmente.

---

## 5. Ideias para melhorar o jogo a partir da UI

1. **Topo com "caixa livre / total" e fôlego em meses** sempre visível, com `data-why` — a decisão mais frequente (gastar ou não) ganha contexto sem abrir Finanças.
2. **Painel "Antes de avançar"** (já existe `askAdvance19`): mostrar as 3 ações pendentes do registro `actions20` por artista (ex.: "2 artistas sem agenda, 1 contrato vence") com botão direto — transforma o catálogo único em lista de tarefas.
3. **Previsão × realizado como mecânica de aprendizado**: todo lançamento/turnê guarda a previsão; a UI mostra o erro acumulado do jogador ("você superestima vendas em 30%") e a contratação de analista reduz a faixa — liga `explain12` ao "por quê".
4. **Recibos de decisão (ux19) como timeline navegável** no Diário, filtrável por artista/tipo, com link para a cena/notícia (`showKey20` já liga turnê↔incidente↔notícia).
5. **Comparador "você × rival"** usando `rivals12` (motivos registrados) — uma tela com fama, catálogo, receita, cenas dominadas e os últimos 5 movimentos de cada um.
6. **Modo foco por carreira no celular**: uma página única com 4 cartões (hoje/decidir/dinheiro/próximo evento) e Ações ▾ em sheet — o `hubs20` já reparte por intenção, falta a versão de bolso.
7. **"Por quê" em ofertas e turnês** (chaves `offer.read`, `tour.city.demand`) — as duas decisões com mais dinheiro em jogo são as menos explicadas.
8. **Teste de alcançabilidade** (vitest, sem DOM): para cada área/aba/seção registrada, garantir que existe caminho pelo menu, pelo Ctrl+K e uma entrada de ajuda; para cada `H()`/`T()`, que o id existe. Evita 1.5/1.6/4.2 voltarem.

---

### Anexo — como reproduzir a auditoria i18n
```
cd /home/user/Vinyl-Game && npx tsx /tmp/claude-0/-home-user-Vinyl-Game/71710196-a457-534a-b632-d16c040d2bc4/scratchpad/i18n_check.ts
```
Saída resumida: S com en===pt: 0 · l() com EN=PT: 3 · l() de 1 argumento: 0 · `{pt}` sem en: 0 · placeholders divergentes: 11 · literais PT suspeitos em src/ui: 42 (a maioria falso positivo; reais: `'Erro'` ×2 e `furnish.ts:42`) · ajuda sem área: 16 · áreas sem ajuda: 3.

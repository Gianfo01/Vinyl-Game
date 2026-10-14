# Menus de ações e dados crus (R29)

Pedidos do autor:

1. "faça os dropdowns dos menus clicando com botão direito começarem todos minimizados"
2. "adicione ações com botão direito onde falta"
3. "onde não tiver ações desabilite o botão"
4. "estamos com alguns dados aparecendo como não deveriam" (ficha da pessoa › Vida e relações › Vida e fatos mostrava
   "Mais dados · person", "real27 · prov: c", "roles27: rhythm, piano, harmonica", "Mais dados · ability18.p")

Só interface: o motor não mudou (os goldens r27-p2a/p2b/m2/m3 seguem iguais). Nos sistemas da simulação mudaram apenas
TEXTOS que já iam para a tela com a chave interna (nome do gênero em vez de `pop_rock`, cidade em vez de `los_angeles`,
descrições sem o nome do módulo).

## 1. Seções do menu sempre recolhidas

`src/ui/ps/ctx27.ts` (`openCtx27`):

* Menus grandes (mais de 9 itens e mais de uma seção) mostram as seções — Ver / Abrir, Carreira e contrato, Música e
  projetos, Ao vivo, Relação e vida pessoal, Imprensa e imagem, Submundo, Atalhos — **todas recolhidas a cada abertura**.
  Acabou a memória de seções abertas entre aberturas (`folded29` saiu). O foco cai no primeiro cabeçalho.
* Menus pequenos continuam uma lista corrida (com separadores): não há dropdown para recolher. Com uma seção só, idem.
* Teclado e a11y: ↑/↓/Home/End andam pelo que está visível; → abre a seção e entra no 1º item; ← fecha e volta ao
  cabeçalho; PageUp/PageDown pulam de cabeçalho em cabeçalho; Enter/Espaço executam; cada cabeçalho tem
  `aria-expanded` e `aria-controls` (o corpo da seção tem `id`).
* **Filtro digitado** (novo): em menus com seções, digitar filtra pelos rótulos (sem acento, sem caixa). As seções com
  resultado se abrem sozinhas, as sem resultado somem e o foco vai para o 1º resultado; uma faixa mostra
  "Filtro: “…” · N resultados — Backspace apaga, Esc limpa". Esc com filtro limpa (e as seções voltam como estavam:
  recolhidas); Esc sem filtro fecha. No cabeçalho do menu aparece "digite para filtrar". Em menus pequenos, a letra
  continua pulando para o item que começa com ela.

## 2. Clique direito onde faltava

### Tipos novos de entidade (`ps/ent27.ts`, `ps/ctx27model.ts`, `ps/ctx27.ts`)

| Tipo | Id | Ações (todas levam às telas de sempre — um caminho só) |
|---|---|---|
| `festival` | índice em `FESTIVALS` | Abrir página do festival · Inscrever um artista seu (na página do festival) · Ver a cidade · Abrir festivais. Antes do ano de criação: desabilitado com "Ainda não existe (começa em…)". |
| `award` | id da premiação | Abrir página da premiação (`openCeremonyPage`) · Ver todas as premiações |
| `relic` | id da relíquia | Abrir a relíquia (`openRelic`: comprar, leiloar…) · Ver o artista · Ver a pessoa · Lendas › acervo |
| `movement` | id do movimento | Abrir página do movimento (`openMovementPage`: entrar, sair, fundar) · Relações e movimentos |

### Rede de segurança pelo nome exato

`nameIndex29` / `nameHit29` (`ps/ctx27model.ts`): quando o clique direito (ou toque longo, Shift+F10) cai num texto SEM
marca `data-ent` cujo conteúdo é exatamente o nome de UMA entidade (artista, gravadora, pessoa, lançamento, casa de shows
ou cidade), o menu dessa entidade abre. Nome repetido no mesmo tipo é ambíguo e **não** abre nada (melhor o menu nativo do
que a pessoa errada); artista solo (nome do ato = nome da pessoa) abre o artista. Abas, migalhas, menus, títulos de
página e rótulos de KPI ficam de fora. O índice é recalculado só quando a semana ou a quantidade de entidades muda.

### Marcas explícitas adicionadas (`data-ent`/`data-id`)

* **Clique em nome que abria ficha** — 62 elementos em 34 arquivos que abriam a ficha de artista, pessoa (incl.
  produtor `pd:`, empresário `e:`, crítico `c:`), gravadora, lançamento, festival ou premiação pelo `onclick` e não
  tinham a marca (pages, dossierView, quick18, insp29, knownacts27, project8/12, story12, managers14, realref20,
  people16, hubs20, bonds9, mundo27, directory, hq8, ability18, lineup16, life, hubs8, place27ui, leisure14, retro8,
  careerpages17, prof19, home18, lendas9, talentos23, producers15, ventures9, round8, panels/people, panels/misc,
  panels/artists).
* **Músicas** (`song`): repertório, Obras (Direitos), sincronização, faixas do lançamento (ficha), estúdio
  (gravação/créditos), projeto, Criação (escritas), som.
* **Pessoas e atos nas tabelas/cartões**: Dinâmica (hierarquia e tabela — atos, integrantes e equipe), cartões de
  "Saúde e relações" (pessoa), remetente da Caixa de entrada (pessoa/artista/selo), Diário do Mestre (quem → quem),
  produtores do estúdio (só os reais, `pd:`), estoque da cadeia física (disco e artista), diário da run (lançamento).
* **Lendas**: cartões de figura (artista/pessoa) e de relíquia; **festivais** e **premiações** (listas de Festivais e
  Premiações, convites); **movimentos** (Relações e movimentos, botão de movimento).
* `tile()` (`ui/vis.ts`) ganhou a opção `ent` (marca o cartão inteiro).

## 3. Sem ações → botão desabilitado, sem menu vazio

* `liveCount29(menu, skip)` + `NO_ACTIONS29` ("Nenhuma ação disponível agora.") em `ps/ctx27model.ts`: conta o que dá
  para fazer agora; "Copiar nome" não conta.
* **Clique direito**: menu com zero ações possíveis não abre — o navegador mostra o menu nativo. Submenus ("Ações com
  {líder} ›", "Oferecer a {nome}… ›", "Contratar {família}…") avisam com um toast em vez de abrir vazio (`sub27`).
* **"Ações com esta pessoa"** (ficha de pessoa e página única de quem não é artista) e **"Ações"** da página do artista
  (por integrante): sem ação possível fora de "Ver / Abrir" → botão desabilitado com `title`/`aria-label` explicando
  (`hasActions29`, `offBtn29` em `sys/personact18.ts`; marca `data-noacts29`).
* Com quem **já morreu** só vale a homenagem (`pa:funeral`): "Mandar presente" e as demais ações de pessoa aparecem
  desabilitadas com "Já morreu." (antes dava para mandar presente ou instigar um morto). Depois da homenagem (espera de
  10 anos) não sobra ação — é o caso real da captura `acoes-desabilitado-*.png`. O painel da ficha usa o mesmo bloqueio.
* **Inspetor** (aba Resumo / painel do Elenco): "Ações" desabilitado com o motivo.
* **`Ações ▾`** do artista (`actionsButton20`) e o clique direito no card do elenco (`bindContext20`): sem nenhuma ação
  do registro sem bloqueio → desabilitado / menu nativo (`live20`).

## 4. Dados crus corrigidos

| Onde | Antes | Agora |
|---|---|---|
| Ficha da pessoa › Vida e relações › Vida e fatos (e Vida pessoal do artista) | "Mais dados · person", "real27 · prov: c", "roles27: rhythm, piano, harmonica", "Mais dados · ability18.p", "ovation_balladeer" | o despejo genérico saiu (`sys/dossier13.ts`); o que importa já tem aba própria |
| Artistas › Saúde e relações (cartões) | "· guitar", "· keys", "· drums" | função traduzida ("Guitarra", "Teclado", "Bateria") |
| Artistas › Dinâmica (Elenco) | papel = "new_wave", "arena_rock" | nome do gênero |
| Caixa de entrada / Calendário | "Convite: residência na cena pop_rock de Liverpool" | "…na cena Pop rock de Liverpool" (`sim/sys/exch20.ts`, também o diário da residência) |
| Mundo › Mundo vivo e Notícias | "Guerra de preços: … discos de blues_jazz …", "(blues_jazz)" | "Blues e jazz" (`sim/sys/npc17.ts`, `ui/sys/npc17.ts`) |
| Lendas/Sociedade › viés das premiações | "country_folk +1" | "Country e folk +1" |
| Empresa › Finanças (por categoria, livro-caixa, resumo do avanço) | "other_income", "misc", "capex"… | 40 categorias novas traduzidas; desconhecida vira texto sem sublinhado |
| Você › Investimentos | "Selo rival (los_angeles)" | "Selo rival (Los Angeles)" (`sim/sys/bolsa10.ts`) |
| Diário do Mestre | "Paul McCartney → p:p5y:" | nomes sempre (chave sem nome vira "alguém"), com clique direito |
| Prêmios (ficha › Mais, Conexões, prêmios do selo, retrospectiva, página da premiação) | "1979 · euro_stage · Prêmios Palco Europeu / Prêmios Palco Europeu: …" | "1979 · Prêmios Palco Europeu: …" (só a língua da tela, sem o id) |
| Ficha do lançamento › Divulgação | "tv_show, radio_plug" | "Programa de TV, Divulgação em rádio" |
| Descrições de ações e ajudas | "(bonds9)", "(media17)", "love17:", "(press9)", "(screen18)", "(crime17)", "(image17)", "(fans18)", "(session19)", "(writers19)", "(lineup16)", "(radio18)", "(rights18)", "(post18)", "(revival19)", "decide18", "more19", "society18" | sem o nome interno do módulo (28 textos) |

Funções novas de nome (`ps/raw29.ts`): `roleName29`/`rolesTxt29` (funções de integrante, inclusive as extras de
`roles27`), `genre29`/`gfName` (gênero **ou** família — `data/world.ts`), `keyName29`/`keyEnt29` (chave de pessoa/ato/
selo → nome + marca), `awardTxt29` (prêmio do livro único).

## Como conferir

* `scripts/r29/rawscan.mjs` — Playwright (Chromium de `/opt/pw-browsers/chromium`, sem `playwright install`): abre o
  jogo (`npx vite --port 5293`), faz o bot realista jogar 6 anos (1975, nomes reais), passa por **todas as áreas** do
  menu e as abas de cada uma, e pelas fichas (artista do elenco e rival, integrantes, produtor, empresário, chefe,
  crítico, gravadora, lançamento, cidade, casa), abrindo o painel "Ações". Procura dado cru com o MESMO detector do
  teste (`ps/raw29.rawHits29`) e lista nomes sem marca, separando os cobertos pela rede de segurança dos que não têm
  clique direito nenhum. `--strict` sai com erro se achar dado cru.
  Uso: `node scripts/r29/rawscan.mjs [porta] [anos] [saída.json] [--strict]`.
* `scripts/r29/menushots.mjs` — capturas em `docs/shots29menus/`.
* `tests/r29-ui-raw.test.ts` — o detector (pega o que o autor viu, não acusa texto normal), nomes traduzidos, nenhum
  texto `l(…)` do jogo cita módulo interno, o despejo saiu do dossiê, menu recolhido/filtro (fonte), `liveCount29`,
  botões desabilitados, tipos novos (festival/premiação/relíquia/movimento) com handler, índice de nomes (único,
  ambíguo, artista solo).

Resultado da varredura final (partida de 1981, 79 áreas e suas abas, 14 fichas com todas as abas e o painel "Ações"):
**0 dado cru** (antes: 36 ocorrências distintas); 47 lugares mostram nomes sem marca explícita mas com clique direito
pela rede de segurança; restam 3 sem menu, todos sem entidade a abrir: o seletor de músicas do Rollout (caixa de
seleção), produtor genérico do estúdio (não é pessoa da partida) e faixa de lançamento da história real sem música
registrada.

## Capturas (`docs/shots29menus/`)

* `menu-recolhido-desk.png` / `-mob.png` — clique direito numa pessoa: todas as seções recolhidas.
* `menu-filtro-desk.png` / `-mob.png` — o mesmo menu filtrando "pres": só as seções com resultado, abertas.
* `acoes-desabilitado-desk.png` / `-mob.png` — ficha de alguém que já morreu e a quem você já prestou homenagem:
  "Ações com esta pessoa" desabilitado (tooltip e nome acessível: "Nenhuma ação disponível agora.").

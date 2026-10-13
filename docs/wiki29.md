# R29 WIKI — a wiki completa do jogo

Ramo `claude/r29-wiki`, a partir de `claude/friendly-brown-vpsmfl` (Masters_29b). Pedido do autor: "criar uma wiki completa
do jogo, com personagens com fotos, mecânicas e como funcionam etc."

Resumo:
- **Utilidade global "Wiki"**, ao lado de Índice e Campanha (barra de utilidades). Não é macromenu novo. Abre também pelo
  Ctrl+K ("Wiki do jogo" e "Buscar na wiki: …"), por `#/wiki` e `#/wiki/<tipo>/<id>` (inclusive na tela de título, sem
  partida) e por **"Ver na wiki"** na seção *Atalhos* do menu de contexto (ctx27) de pessoa, artista, selo, cidade,
  gênero, relíquia e organização.
- **7 seções**: Início, Personagens, Mecânicas, Mundo, Objetos, Glossário, Perguntas frequentes.
- **12.056 artigos** no catálogo estático (sem partida); com partida, Personagens passa a listar as pessoas, os artistas e os
  selos **da partida** (gerados ou reais).
- Pacote principal **+6,3 kB** (+2,9 kB gzip). A wiki é um pedaço separado carregado na primeira abertura:
  **230 kB** de JS (87 kB gzip) + 6,5 kB de CSS.
- Nada novo no save. O "Revelar história real" só vale enquanto a janela está aberta.
- `tests/r29-wiki.test.ts`: 20 testes verdes. `r29-reorg`, `r27-ux`, `r27-ctx` e `r29-fixes` continuam verdes.
- Capturas: `docs/shots29wiki/` (17 telas × computador 1440×900 e celular 390×844).

---

## 1. Onde mora e como abre

| Entrada | O que faz |
|---|---|
| Barra de utilidades: **❖ Wiki** (entre Campanha e Opções) | abre no Início |
| **Ctrl+K** → "Wiki do jogo (personagens, mecânicas, mundo)" | abre no Início |
| **Ctrl+K** → digitar qualquer coisa → "Buscar na wiki: <texto>" | abre já com a busca |
| `#/wiki`, `#/wiki/mech`, `#/wiki/mech/money`, `#/wiki/person/p12`, `#/wiki/city/rio`… | abre no artigo (também sem partida) |
| Clique direito / toque longo num nome → *Atalhos* → **Ver na wiki** | abre o artigo da entidade |

A janela usa o mesmo padrão do Índice e da Central da campanha (por cima da tela atual, Esc fecha). Ela tem busca, botões
◀ ▶ (voltar/avançar dentro da wiki), migalhas (Início › Seção › Lista), abas das seções e o botão "Revelar história real".
Ao navegar, o endereço vira `#/wiki/<tipo>/<id>` (replaceState, sem mexer no histórico do roteador do jogo). Ao fechar, o
endereço volta ao de antes.

Mudanças em arquivos compartilhados (todas mínimas e aditivas):
- `src/ui/app.ts`: 1 import, `bindWiki29`/`initWikiHash29`, o botão na barra, 2 comandos no Ctrl+K.
- `src/ui/ps/ctx27model.ts`: item `wiki` (seção *Atalhos*) nos menus de ato, pessoa, selo, cidade e organização. Tipos novos
  `genre` e `relic` com menu mínimo (Ver na wiki · Copiar nome).
- `src/ui/ps/ent27.ts`: `Ent27` ganha `genre` e `relic`.
- `src/ui/ps/ctx27.ts`: `case 'wiki'`.
- `src/ui/sys/knownacts27.ts` (coluna de gênero) e `src/ui/sys/talent18.ts` (nome de relíquia real): marcam `data-ent`
  para o menu chegar a gênero e relíquia.

## 2. Estrutura do código

`src/ui/wiki29/`:

| arquivo | papel |
|---|---|
| `wiki29open.ts` | porta leve (pacote principal): `openWiki29`, `bindWiki29`, `#/wiki`, id da wiki para cada entidade do ctx27 |
| `wiki29.ts` + `wiki29.css` | interface (sob demanda): janela, abas, busca, migalhas, ◀ ▶, lista virtualizada, arte, diagrama SVG |
| `wiki29types.ts` | tipos: `MechArt29`, `Term29`, `Faq29` e o **documento puro** (`Page29` / `Block29` / `Art29W`) |
| `wiki29core.ts` | endereços ↔ hash, contexto (partida × catálogo), regra de spoiler, texto com links `[[id\|rótulo]]`, catálogo real |
| `wiki29people.ts` | Personagens: pessoa/ato/selo da partida, pessoa/artista real, produtor, empresário, executivo, crítico |
| `wiki29world.ts` | Mundo e Objetos: cidade, país, gênero, movimento, era, tecnologia, casa, veículo de imprensa, organização, relíquia, equipamento, merch, veículo de turnê |
| `wiki29model.ts` | registro: listas por seção, títulos, despachante id → página, busca, links fixos |
| `wiki29sys.ts` | cobertura: cada um dos 289 sistemas de `src/sim/sys/index.ts` → artigo |
| `mech29w_a..d.ts` | os 18 artigos de mecânica, verbetes do glossário e perguntas (texto pt/en tirado do código e dos docs) |

As páginas são **montadas como documento puro** (blocos: título, parágrafo com links, lista, chave/valor, artes, "Na sua
partida", aviso, lista longa, botões de página do jogo, spoiler, diagrama). A interface só desenha os blocos, e os testes
"renderizam" todas as seções em várias eras sem navegador.

Endereços: `<tipo>:<id>`. Os tipos são `mech`, `glossario`, `faq`, `person`, `act`, `label`, `rp` (pessoa real), `ract`
(artista real), `prod`, `mgr`, `exec`, `critic`, `city`, `country`, `genre`, `move`, `era`, `tech`, `venue`, `outlet`,
`org`, `relic`, `gear`, `merch` e `vehicle`, mais `idx:<lista|seção>` e `home`.

## 3. Seções e contagens

Catálogo estático (sem partida), medido:

| lista | artigos | fonte (reaproveitada, sem duplicar) |
|---|---|---|
| Pessoas reais | 6.480 | integrantes e solistas de `REAL_ALL` + `REAL_CLASSIC` |
| Artistas e bandas reais | 3.515 | `REAL_ALL` (3.415) + 100 clássicos do catálogo |
| Gravadoras | 207 | `CATALOG_LABELS` + `EXTRA_LABELS` (nome real de `REAL_LABELS`) |
| Produtores | 209 | `REAL_PRODS` + `PRODS18` |
| Empresários | 120 | `REAL_MGRS` + `MGRS18` |
| Executivos | 67 | `REAL_EXECS` |
| Críticos | 93 | `CRITICS17` + `REGIONAL_CRITICS` |
| Mecânicas | 18 | `mech29w_a..d` |
| Cidades | 249 | `CITIES` |
| Países | 128 | `COUNTRY_INFO` + `COUNTRY_INFO19` |
| Gêneros | 371 | `GENRES` |
| Movimentos | 21 | `MOVEMENTS` |
| Eras | 15 | `ERA_SHIFTS` |
| Tecnologias | 21 | `TECHS` |
| Casas de shows | 114 | `VENUES17` |
| Veículos de imprensa | 71 | `OUTLETS17` |
| Organizações do submundo | 26 | `ORGS17` |
| Relíquias | 107 | `RELICS17` + `RELICS18` |
| Equipamento | 159 | `GEAR19` |
| Merch | 10 | `SKUS` (merch17) |
| Veículos de turnê | 3 | van / ônibus / avião (live18) |
| Glossário | 34 | 3 próprios + 8 de cada arquivo de mecânica (sem repetir) |
| Perguntas frequentes | 18 | 2 próprias + 4 de cada arquivo |
| **Total** | **12.056** | (Gravadoras aparece em Personagens e em Mundo; contada uma vez) |

Com partida carregada (semente `wcount`, 1975, nomes reais): base pequena = 764 pessoas no save, 754 visíveis, 396 atos
visíveis; base **enorme** = 2.393 pessoas, 2.384 visíveis, 1.268 atos. Montar a lista leva 7 ms, a 1ª busca 33 ms (é ela que
monta o índice; as seguintes reaproveitam) e uma página de pessoa 16 ms. A lista de pessoas é **virtualizada** (linhas de
44 px; só as visíveis ± 6 existem no DOM), com filtro próprio.

### Personagens
- **Pessoa da partida** (`person:<pid>`): retrato procedural (visual famoso via `looks15` para reais, `looks27/29` para os
  demais), nascimento/idade/morte, funções (principal + `ROLES27` com ano), **bandas e carreira com períodos** e
  "atual/ex"/solo (de `careerActs29`, a mesma fonte da ficha), família e laços (`kinOf15`/`kinLabel15`), prêmios e
  relíquias dos atos da carreira, crônica (`biography29`, só o que já aconteceu). **Na sua partida**: banda agora, relação
  com você (−100..100 com rótulo), se está no seu elenco, se está viva. Em nomes reais, a caixa "Na história real" com as
  bandas reais e os períodos (fatos futuros escondidos).
- **Ato da partida** (`act:<id>`): logo procedural, gênero, cidade, formação, estreia, situação, contrato (selo com link),
  integrantes com funções, **ex-integrantes** (`exMembers29`, com motivo e ano), lançamentos até o ano atual, prêmios,
  relíquias. Na sua partida: se é seu, fama, fãs, sucessos e, se for seu, a confiança em você. Em nomes reais, a formação
  real, a discografia e o fim/volta reais (com spoiler).
- **Selo**: logo, cidade, fundação, foco, territórios, elenco visível. Na sua partida: rivalidade com você, tamanho do
  elenco, se está ativo. A estratégia/intenção do rival **não** aparece.
- **Sem partida**: pessoas e artistas reais (bio, papéis, bandas com períodos, discos marcantes, procedência "não
  conferido"), produtores (som, faixa de cachê, obras), empresários (estilo, comissão, clientes), executivos e críticos
  (rosto de bastidor `people29` com o adereço da função).

### Mecânicas (18 artigos, um por sistema pedido)
`money`, `contracts`, `scouting`, `music`, `live`, `fame`, `reputation`, `hq`, `life`, `press`, `underworld`, `world`,
`awards`, `story`, `start`, `careers` (as 12), `modes` e `connections`.

Cada artigo tem: resumo; o que faz; **o que afeta este sistema** (entradas); **o que ele afeta** (saídas); **regras e
fórmulas** em palavras simples com as constantes reais; **números lidos do código agora** (a função `nums` importa as
constantes exportadas e as formata, em dólares da época quando há partida); dicas; **onde se controla no jogo** (botões que
fecham a wiki e abrem a página pelo caminho do menu); veja também; e os **sistemas do código** (`src/sim/sys/...`) e os
documentos de origem.

Algumas constantes importadas: `INSOLVENT_AT`, `loanOffer`, `monthlyCosts` (economy), `freeCash20` (oblig20), `DEGREES`,
`scoutCost` (scouting), `STARTS28`, `SITS29`, `DIFF17`, `RANKS17`, `EQUAL_START_REAL`, `STUDIO_TIERS`, `VENUE_TIERS`,
`CHANNELS`, `PAYOLA_TIERS`, `MOD_CAP18`, `PERK_CAP18`, `TICKET`, `PRODUCTION_COST`, `HQ_LEVELS`, `DEPTS`, `ROOM_DEFS27`,
`LUNCH_COST`, `GIFT_COST`, `CRIMES17`, `CANCEL_FROM19`, `TECHS`, `ENDINGS`, `LEGACY_DIMS`, `HALL_WAIT`, `DB_SIZES`,
`PRESETS17`, `PRESETS29`, entre outras.

**Como os sistemas se conectam** usa o mapa de dependências e a matriz de mecanismos da R29 CONNECT
(`docs/connect29.md` §4, `src/sim/audit29.ts`, `scripts/probe29mech.ts`). As 23 arestas medidas (E1a…E16) viram um
**diagrama SVG** (nós = artigos, clicáveis; cor/traço = conectada / religada na R29 / fraca / de propósito) e uma tabela.

### Mundo
Cidade (brasão `geo29`, horizonte da época `skylineThumb`, bandeira do país, cenas, casas, selos, movimentos. Na sua
partida: se é a sua cidade-base e os artistas na ativa dali), país (bandeira, parada nacional e prêmio com nome real ou do
jogo, população no ano, fatos por época), gênero (selo `badge29`, família, ano, de onde vem, o que gerou, cenas,
movimentos. Na sua partida: popularidade e maiores atos agora), movimento (selo, época, visual, descrição, os movimentos
vivos da partida), era (o que dá dinheiro, a pergunta, as posturas), tecnologia (chegada, dependências, variação nos modos
Livre/Caos), casa de shows (arte `places29`, capacidade, prestígio, preço), veículo de imprensa, organização do
submundo (emblema `emblem28`, negócios, laços documentados).

### Objetos
Relíquias (`relic28/29`: história, valor, onde está, caminho; na partida, onde está agora), equipamento (`things29`; nome
genérico sem nomes reais; som), merch (`merchImg29`: época, custo, preço, quem compra) e veículos de turnê (van, ônibus e
avião em 4 épocas, efeito na fadiga, `FLY_FROM18`).

### Glossário e Perguntas frequentes
34 verbetes e 18 perguntas, com links cruzados.

## 4. Segredo e spoiler (regras da Bíblia)

- **Nunca** mostra: atributos/talento/potencial ocultos (`skills`, `potential`), fim de carreira previsto (`careerEnd`),
  romances, a estratégia ou intenção secreta de selo rival, o mínimo escondido de uma negociação (os artigos dizem que
  existe e que é oculto).
- **Futuro real**: com partida carregada, todo fato real depois do ano da partida fica escondido (discos, mortes, fins,
  voltas, passagens de integrantes, obras de produtores, clientes de empresários, passos de relíquias, fatos de país, laços
  de organizações, gêneros/movimentos/casas/veículos/críticos que ainda não começaram). Textos livres (bio, história,
  descrição) que citam um ano futuro também ficam escondidos. Cada página mostra "🔒 N fatos da história real estão
  escondidos" com o botão **Revelar história real**, que fica desligado por padrão e não vai para o save.
- **Agenda secreta do mundo**: em história alternativa, a data de cada tecnologia/era é sorteada na criação do mundo. A
  wiki mostra a data da partida só quando ela chega. Revelando, mostra a data **real**, nunca a sorteada.
- Atos que ainda não estrearam (e que você não conhece) e pessoas que ainda não nasceram ficam fora das listas e da busca.
  O link direto mostra "Ainda não chegou na sua partida".

## 5. Busca

Sem acento (`norm29`), todas as palavras precisam casar. A ordem é: nome exato > começo > começo de palavra > trecho, com um
pequeno peso para mecânicas e glossário. Os resultados vêm **agrupados por tipo** e têm teto (60 no total, 8 por grupo, com
"+N" para o resto). O índice é montado na 1ª busca e refeito quando muda a semana ou o "revelar".

## 6. Testes

`tests/r29-wiki.test.ts` (20 testes, verdes):
- os 18 temas têm artigo completo (o quê, entradas, saídas, regras, dicas, páginas, pt e en);
- **todo sistema registrado** em `src/sim/sys/index.ts` (289 módulos) está em `SYS_OF_MECH29`. Um sistema novo sem artigo
  derruba o teste;
- `nums` não quebra com e sem partida;
- todo link dos artigos fixos resolve; toda página do jogo citada está no catálogo único (`ALL_AREAS29`); links das páginas
  geradas resolvem (amostra de cada lista, com e sem partida); `#/wiki/...` vai e volta;
- **pessoa ↔ connect29**: os atos da carreira na página da pessoa = `careerActs29`, e os ex-integrantes na página do ato =
  `exMembers29` (40 pessoas e 40 atos);
- nada de potencial/talento oculto na página; "Ver na wiki" na seção Atalhos dos 7 tipos;
- **spoilers**: partida de 1962 sem revelar → nenhum ano > 1962 em 300+ páginas (atos reais, pessoas, relíquias, gêneros,
  produtores, empresários, Beatles, Pink Floyd, Lennon, grunge, streaming, Brasil); revelando, aparece 1970 nos Beatles;
  lista e busca de 1958 não trazem "grunge";
- **busca**: "joao gilberto" = "João Gilberto"; teto e agrupamento; mecânica "contrato"; pessoa da partida;
- **todas as seções montam** (Início, índices e amostras de cada lista, revelado e não) em partidas de 1925, 1955, 1978
  (nomes gerados), 1999 e 2018, e no catálogo sem partida.

Rodados em lotes pequenos (`npx vitest run <arquivos> --poolOptions.forks.maxForks=2`): `r29-wiki` (20/20), `r29-reorg` +
`r27-ux` (41/41), `r27-ctx` + `r29-fixes` (26/26). `tsc --noEmit` limpo (`NODE_OPTIONS=--max-old-space-size=6144`).

## 7. Capturas

`docs/shots29wiki/` (`scripts/shots29wiki.mjs`, Chromium, pt-BR, partida rápida pela tela inicial "NOVA RUN" →
"COMEÇAR MINHA HISTÓRIA", que caiu em 1962). Sufixo `-desktop` (1440×900) e `-mobile` (390×844):

01 início sem partida · 02 banda real (Beatles) · 03 pessoa real (John Lennon, visual famoso) · 04 lista virtualizada de
pessoas · 05 mecânica "Como os sistemas se conectam" com o diagrama · 06 início com partida · 07 pessoa da partida (Na sua
partida) · 08 ato da partida · 09 mecânica Dinheiro (números do código) · 10 cidade (brasão, horizonte, bandeira) ·
11 gênero · 12 relíquia · 13 spoiler escondido (Nirvana em 1962) · 14 spoiler revelado · 15 busca sem acento ("joao") ·
16 Objetos · 17 menu de contexto com "Ver na wiki" (só computador).

## 8. Lacunas

- **Nível de rival na Nova run**: outro agente está criando o seletor em paralelo. O artigo "Escada de início e níveis de
  rival" descreve o que existe hoje (situação inicial dos selos, quantidade de rivais, eixo de dificuldade "Rivais").
  Precisa de atualização quando o seletor entrar. O mesmo vale para a contratação de integrantes avulsos (outro agente),
  que o artigo de Contratos ainda não cita.
- Algumas constantes não são exportadas ou só carregam dentro do tick (ciclo de imports em Node: `producers15`, `fame15`,
  `hype12`, `eras8`, `careers12`…). Esses números aparecem no texto das regras, citando o arquivo, e não nos "números lidos
  agora". Se mudarem no código, o texto precisa ser revisto.
- Os artigos de mecânica foram escritos à mão a partir do código e dos docs. Eles não acompanham sozinhos uma mudança de
  regra, só as constantes lidas em `nums`.
- **Equipe e profissionais gerados** da partida (técnicos, publicitários, líderes de selo gerados) não têm página própria.
  O menu "Ver na wiki" de chaves `s:`/`l:`/`c:` cai na página da pessoa, se houver, ou em "não encontrado" com a busca.
  Produtores (`pd:`) e empresários (`e:`) caem nas páginas da base real.
- Movimentos da partida têm nome próprio e não guardam o id do modelo (`MOVEMENTS`). A wiki os associa ao modelo por
  gênero de origem e época.
- O nome das funções (Voz, Guitarra…) usa uma tabela local. A principal vem dos dados, e por isso John Lennon aparece com
  "Voz" à frente de "Guitarra base".
- A busca não indexa músicas e lançamentos (milhares por partida). Eles aparecem na página do ato.
- Só o gênero (Artistas conhecidos) e a relíquia real (Talentos › relíquias) ganharam a marca `data-ent` nesta rodada.
  Outras telas que citam gênero ou relíquia ainda não abrem o menu.

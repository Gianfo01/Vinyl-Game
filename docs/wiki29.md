# R29 WIKI — a wiki completa do jogo

Ramo `claude/r29-wiki`, a partir de `claude/friendly-brown-vpsmfl` (Masters_29b). Pedido do autor: "criar uma wiki completa
do jogo, com personagens com fotos, mecânicas e como funcionam etc."

Resumo:
- **Arquivo separado do jogo**: `wiki.html` (entrada própria do Vite, `src/wiki/main.ts`). Não fica dentro do jogo, nem
  na partida, nem no save. Abre direto no navegador, ao lado de `index.html` (no `dist/`: `dist/wiki.html`). Ajuste
  pedido pelo autor depois da 1ª versão ("a ideia não é estar no save… na verdade, faça um arquivo separado do jogo"):
  o botão na barra do jogo, o Ctrl+K, o "Ver na wiki" do menu de contexto e as caixas "Na sua partida" saíram. Os
  arquivos do jogo voltaram a ser exatamente os do ramo base.
- **7 seções**: Início, Personagens, Mecânicas, Mundo, Objetos, Glossário, Perguntas frequentes. **12.053 artigos**, todos
  do catálogo de dados do jogo e do código (nada de partida).
- Endereços próprios: `wiki.html#/mech/money`, `#/city/rio`, `#/ract/the-beatles`, `#/idx/persons`… Voltar/avançar do
  navegador funcionam. Botões PT/EN; idioma e tema claro/escuro iniciais vêm das preferências do jogo (só leitura).
- Pacote: o jogo e a wiki compartilham um pedaço comum (dados e motor, 7,8 MB). A wiki soma **228 kB** de JS próprio
  (86 kB gzip) e 7,4 kB de CSS. O jogo continua com o mesmo código; dividir em dois pacotes custou +58 kB no total de JS do
  jogo (+29 kB gzip), porque nomes exportados entre pedaços não são encurtados.
- Atualizado depois com as frentes novas do base: **relíquias procedurais** (`relics29`, artigo Prêmios e legado + catálogo de 23 arquétipos), **famílias do Submundo** (`mob29`/`orglinks29`, artigo Submundo + catálogos), **formação inicial** (`lineup29`), **pessoa sem banda**, **gravadoras no início e ao longo da partida** (`labels29`, artigo Escada de início), **nível dos rivais** (`rivals29`, artigo Escada de início) e **oferta a
  um integrante** (`member29`, artigo Contratos) e **feat de pessoa específica** (`featp29`, artigo Projetos), com verbetes no
  glossário. E os **acordos especiais** (`contracts29`/`terms29`: empresariamento, produção e joint venture), no artigo
  Contratos (regras, números lidos de `terms29.ts`), no catálogo "Modelos de contrato e papéis" e em 3 verbetes.
- `tests/r29-wiki.test.ts`: 23 testes verdes. `r29-reorg`, `r27-ux`, `r27-ctx` e `r29-fixes` continuam verdes.
- Capturas: `docs/shots29wiki/` (16 telas × computador 1440×900 e celular 390×844).

---

## 1. Onde mora e como abre

`wiki.html` na raiz do projeto, com o próprio `<div id="wiki">` e o script `src/wiki/main.ts`. Em desenvolvimento:
`npx vite` e abrir `http://localhost:5173/wiki.html`. No build (`npx vite build`), sai `dist/wiki.html` ao lado de
`dist/index.html`. O jogo não tem link para a wiki. Se o autor quiser, dá para pôr um link na tela inicial que abra
`wiki.html` em outra aba.

**Arquivo único para mandar/abrir sem servidor**: `npx vite build -c vite.wiki.config.ts && node scripts/inline-wiki29.mjs`
gera `dist-wiki/Masters-Wiki.html` (≈7,2 MB, JS, CSS e fontes embutidos). Abre com dois cliques, sem internet.

Página: topo (marca "Masters Wiki" + PT/EN), barra fixa com ◀ ▶ e a busca, abas das seções e o artigo (migalhas, arte,
blocos). Cada link é um endereço `#/<tipo>/<id>`, então dá para guardar ou mandar o link de um artigo.

## 2. Estrutura do código

| arquivo | papel |
|---|---|
| `wiki.html` + `src/wiki/main.ts` | página separada: estilos e fontes do jogo, ícones em pixel art, idioma/tema das preferências, `mountWiki29` |
| `vite.config.ts` | build com duas entradas (`index.html` e `wiki.html`) |
| `src/ui/wiki29/wiki29.ts` + `wiki29.css` | interface: abas, busca, migalhas, ◀ ▶ (histórico do navegador), lista virtualizada, arte, diagrama SVG |
| `src/ui/wiki29/wiki29types.ts` | tipos: `MechArt29`, `Term29`, `Faq29` e o **documento puro** (`Page29` / `Block29` / `Art29W`) |
| `src/ui/wiki29/wiki29core.ts` | endereços ↔ hash, texto com links `[[id\|rótulo]]`, catálogo real (montado uma vez) |
| `src/ui/wiki29/wiki29people.ts` | Personagens: pessoa/artista real, gravadora, produtor, empresário, executivo, crítico |
| `src/ui/wiki29/wiki29world.ts` | Mundo e Objetos |
| `src/ui/wiki29/wiki29model.ts` | registro: listas por seção, títulos, despachante id → página, busca, links fixos |
| `src/ui/wiki29/wiki29sys.ts` | cobertura: cada um dos 288 sistemas de `src/sim/sys/index.ts` → artigo |
| `src/ui/wiki29/mech29w_a..d.ts` | os 18 artigos de mecânica, glossário e perguntas (pt/en, tirados do código e dos docs) |

As páginas são **montadas como documento puro** (blocos). A interface só desenha os blocos, e os testes montam todas as
seções sem navegador.

Observação: o modelo ainda aceita um estado de partida (`W29.s`, com páginas de pessoa/ato da partida, valores vivos e
regras de spoiler por ano), da 1ª versão. A página separada sempre passa `s: null`. Os testes continuam cobrindo esse
caminho, que não aparece para o jogador. Se o autor não quiser mais essa possibilidade, ele pode ser removido.

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
| Glossário | 32 | 1 próprio + 8 de cada arquivo de mecânica (sem repetir) |
| Perguntas frequentes | 17 | 1 própria + 4 de cada arquivo |
| **Total** | **12.053** | (Gravadoras aparece em Personagens e em Mundo; contada uma vez) |

Desempenho: a lista de pessoas (6.480) é **virtualizada** (linhas de 44 px; só as visíveis ± 6 existem no DOM), com
filtro próprio. A 1ª busca monta o índice (≈30 ms) e as seguintes o reaproveitam; uma página leva ≈15 ms.

### Personagens
- **Pessoas e artistas reais**: retrato procedural com o **visual famoso** da época (`looks15`); para bandas, o logo
  procedural. Bio, funções (principal + `ROLES27`), bandas e carreira com períodos, formação real com todas as passagens,
  discos marcantes, fim e voltas, procedência "não conferido". A pessoa ↔ banda vem dos mesmos dados que o jogo usa para
  montar as formações reais.
- **Produtores** (som, faixa de cachê, estúdio, obras), **empresários** (estilo, comissão, clientes), **executivos** e
  **críticos**: rosto de bastidor `people29` com o adereço da função.
- **Gravadoras** do catálogo, com o nome real (`REAL_LABELS`) e o nome do jogo.

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
Cidade (brasão `geo29`, horizonte da época `skylineThumb`, bandeira do país, cenas, casas, selos, movimentos e artistas
reais dali), país (bandeira, parada nacional e prêmio com nome real ou do
jogo, população no ano, fatos por época), gênero (selo `badge29`, família, ano, de onde vem, o que gerou, cenas,
movimentos e artistas reais), movimento (selo, época, visual, descrição), era (o que dá dinheiro, a pergunta, as posturas), tecnologia (chegada, dependências, variação nos modos
Livre/Caos), casa de shows (arte `places29`, capacidade, prestígio, preço), veículo de imprensa, organização do
submundo (emblema `emblem28`, negócios, laços documentados).

### Objetos
Relíquias (`relic28/29`: história, valor, onde está, caminho), equipamento (`things29`; nome
genérico sem nomes reais; som), merch (`merchImg29`: época, custo, preço, quem compra) e veículos de turnê (van, ônibus e
avião em 4 épocas, efeito na fadiga, `FLY_FROM18`).

### Glossário e Perguntas frequentes
32 verbetes e 17 perguntas, com links cruzados.

## 4. Segredo

A wiki não lê partida nenhuma, então não pode revelar nada de uma partida: talento/potencial ocultos, intenções de rivais,
mínimo de negociação e datas sorteadas do mundo não existem fora do save. Os artigos de mecânica dizem que esses valores
existem e são escondidos, sem números. O que a wiki mostra é a história real e as regras do jogo. Ela não esconde datas
reais, porque não há "ano da partida" para comparar.

## 5. Busca

Sem acento (`norm29`), todas as palavras precisam casar. A ordem é: nome exato > começo > começo de palavra > trecho, com um
pequeno peso para mecânicas e glossário. Os resultados vêm **agrupados por tipo** e têm teto (60 no total, 8 por grupo, com
"+N" para o resto). O índice é montado na 1ª busca e refeito quando muda a semana ou o "revelar".

## 6. Testes

`tests/r29-wiki.test.ts` (19 testes, verdes):
- os 18 temas têm artigo completo (o quê, entradas, saídas, regras, dicas, páginas, pt e en);
- **todo sistema registrado** em `src/sim/sys/index.ts` (288 módulos) está em `SYS_OF_MECH29`. Um sistema novo sem artigo
  derruba o teste;
- `nums` não quebra;
- todo link dos artigos fixos resolve; toda página do jogo citada está no catálogo único (`ALL_AREAS29`); links das páginas
  geradas resolvem (amostra de cada lista); os endereços vão e voltam;
- busca: "joao gilberto" = "João Gilberto"; teto e agrupamento; mecânica "contrato";
- todas as seções montam, e o catálogo tem milhares de pessoas e artistas (Lennon com retrato e link para os Beatles);
- o caminho com partida que o modelo ainda guarda (§2) também segue testado: pessoa ↔ connect29, spoilers por ano, várias
  eras.

Rodados em lotes pequenos (`--poolOptions.forks.maxForks=2`): `r29-wiki` (19/19); `r29-reorg`, `r27-ux`, `r27-ctx`,
`r29-fixes` (67/67). `tsc --noEmit` limpo. `npx vite build` gera `index.html` e `wiki.html`.

## 7. Capturas

`docs/shots29wiki/` (`scripts/shots29wiki.mjs`, Chromium, pt-BR, `wiki.html`). Sufixo `-desktop` (1440×900) e
`-mobile` (390×844):

01 início · 02 Personagens · 03 lista virtualizada de pessoas · 04 banda real (Beatles) · 05 pessoa real (John Lennon,
visual famoso) · 06 produtor (George Martin) · 07 Mecânicas · 08 Dinheiro · 09 "Como os sistemas se conectam" (diagrama) ·
10 cidade (brasão, horizonte, bandeira) · 11 gênero · 12 era · 13 relíquia · 14 Objetos · 15 Glossário · 16 busca sem
acento ("joao").

## 8. Lacunas

- **Sem link no jogo**: a wiki é um arquivo à parte. Se quiser, um link na tela inicial pode abrir `wiki.html` em outra aba.
- **Peso**: a wiki usa os dados e o motor do jogo para os números lidos ao vivo, então quem abre só a wiki baixa também o
  pedaço comum (7,8 MB, ~2,9 MB gzip). Ele é o mesmo arquivo do jogo e fica no cache do navegador.
- **Nível de rival na Nova run**: outro agente está criando o seletor. O artigo "Escada de início e níveis de rival"
  descreve o que existe hoje e precisa de atualização quando o seletor entrar. O mesmo vale para a contratação de
  integrantes avulsos (outro agente), que o artigo de Contratos ainda não cita.
- Algumas constantes não são exportadas ou só carregam dentro do tick (`producers15`, `fame15`, `hype12`, `eras8`,
  `careers12`…). Esses números aparecem no texto das regras, citando o arquivo, e não nos "números lidos agora".
- Os artigos de mecânica foram escritos à mão a partir do código e dos docs. Eles só acompanham sozinhos as constantes
  lidas em `nums`.
- Personagens são só os dos dados reais. Pessoas e bandas geradas existem apenas dentro de cada partida.
- A busca não indexa músicas.

## 9. Bíblia (aprofundamento pedido pelo autor)

Pedido: *"aprofundar mais a wiki, mostrando os atributos dos personagens, talento inicial e potencial, história real e
tudo mais… a ideia é ser uma bíblia com TUDO do jogo"*. Como a wiki é separada do jogo, ela mostra também o que o jogo
esconde do jogador (potencial, fim de carreira previsto).

- **Ficha de jogo de referência** (`wiki29ref.ts`). Atributos, talento inicial (7 habilidades), potencial, idade,
  ambição, origem, traços, objetivo, persona, atributos de ofício e alma (20 facetas e 12 valores). No jogo esses números
  são sorteados a cada partida. A wiki gera, só quando a página pede, uma **partida de referência** com o mesmo código:
  semente `wiki29`, nomes reais, base enorme, Vida real exata, começando no **ano da estreia** do artista (≈0,5 s por ano,
  com cache). A ficha do ato mostra potencial, fama, momento, fãs, imagem e fim de carreira previsto. As faixas do
  sorteio também aparecem: potencial 90–99 / 80–93 / 68–84 por porte, fração inicial 0,66, +2 por ano de carreira.
- **História real ampliada** (`wiki29lore.ts`):
  - visual famoso **por fase** (um retrato procedural por fase de `looks15`);
  - família documentada (KIN15/KIN27/KINR27/KIN25);
  - obras com autores (WORKS27);
  - covers e samples (COVERS17), sucesso mundial (GLOBAL17), década que ajudou a definir (ERAS17);
  - relíquias e mês documentado de entradas e saídas (MONTHS27).
- **Profissionais completos**:
  - produtores: habilidade, ego, efeito do som, famílias e os 5 atributos de ofício;
  - empresários: famílias, atributos e facetas;
  - críticos: o que não gostam, gosto, rigor, prestígio e região;
  - executivos: formação e estilo de gestão.
- **Linha do tempo** (`time29.ts` + `wiki29bible.ts`): **2.884 marcos** de 27 tipos em 17 páginas por década (antes de
  1880 … depois de 2029). Inclui história, gêneros, gravadoras, imprensa, relíquias, fronteiras, prêmios, casas de shows,
  festivais, marcos urbanos, covers, geopolítica, cenas, estúdios, paradas, hits globais, fatos por país, sociedade,
  formatos, crimes documentados, tecnologias, movimentos, eras, décadas e cartões de decisão. A busca acha cada marco e
  leva à década.
- **Regras e dados** (`cat29_a.ts`, `cat29_b.ts`): **59 catálogos, 1.560 itens**, cada um com página própria. Todos são
  lidos das tabelas do jogo na hora.
  - Pessoas e personalidade: habilidades, traços, ambições, origens, personalidade, sonhos, atributos, instrumentos,
    vícios e saúde, ações com pessoas, agenda, estilos de empresário, assinaturas de produtor, parentesco, eventos de
    vida, funções, temperamentos rivais, origens e traços do jogador, estilos de vida, vida pessoal.
  - Regras: formatos, canais, estúdios, abordagens, casas, níveis da sede, departamentos, salas, mobília, andares, foco
    de filiais, situações iniciais, níveis de rival, começos sorteados, dificuldade, predefinições, bases, finais, legado,
    crimes, jabá, campanhas de prêmio, produção de shows, pacotes iniciais, conquistas.
  - Mundo: festivais, plataformas, mídia, estúdios reais, prêmios.
  - História: cenários, posturas de era, regras de paradas, ovos de páscoa (marcados como spoiler), cenas interativas,
    cenas animadas.
  - Objetos: merch, marcas de equipamento.
- Contagem nova: **13.691 páginas** (12.055 da base + 59 catálogos + 1.560 itens + 17 décadas).
- `tests/r29-wiki.test.ts`: 23 testes. Os novos cobrem a ficha de referência (Lennon em 1962), a história ampliada
  (família de Michael Jackson, covers dos Beatles), todas as décadas com links válidos e todo catálogo com itens e
  páginas que montam.
- Arquivo único: `dist-wiki/Masters-Wiki.html` (≈7,5 MB).
- Lacunas: a ficha é de uma partida de referência (outra semente dá outros números dentro das faixas); quem só entra na
  base pequena/média ou como substituto pode não aparecer nela; algumas explicações dos catálogos são texto escrito a
  partir do código (os números são lidos ao vivo).

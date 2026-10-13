# Bíblia de arte — "Nosso mundo" (cidade isométrica em pixel art) · r27 (I2)

Código: `src/ui/pixel/campus18px.ts` (cena), `src/ui/pixel/lmiso27.ts` (marcos), `src/ui/pixel/city27.ts` (decisões
puras, testadas em `tests/r27-city.test.ts`), `src/ui/sys/campus18.ts` + `campus18.css` (painel e marcadores).

## 1. Auditoria (antes)
- Marcos eram silhuetas cinzentas de 20–40 px coladas no horizonte (Torre de Tóquio parecia um "A"; Cristo = cruz
  num disco). Sydney herdava os morros com favela do Rio (todas as "baías" eram o Rio).
- Árvores, chafariz, piscina, cúpulas, jardineiras e caixas-d'água eram `disc/ellipse` soltos, sem contorno: liam
  como bolinhas de marcador. Sem sombras projetadas; prédios sem contorno se fundiam com o chão.
- A sede no mapa não batia com o interior: "torre" de vidro em 1962, número de andares aleatório, garagem/quarto
  trocados pelo "lugarzinho".
- Placas "À VENDA" grandes demais; somem atrás do prédio da frente. Letreiro de neon de dia = retângulo preto.
- Botão desabilitado "Comprar o imóvel" com rótulo + custo + etiqueta de tipo espremidos num botão dourado opaco.

## 2. Escala e grade
- Isométrico 2:1. Uma célula da grade = 8 px na horizontal, 4 px na vertical (lote de 4×4 = 64×32 px).
- Tela lógica 300×226, ampliada por CSS com `image-rendering: pixelated`. Nunca suavizar.
- Pessoa = 2×7 px; carro = 7×4; porta = 3×5; um andar = 6–9 px (7 é o padrão).
- Marcos ficam em 4 "bastidores" atrás do mapa (gx < 0 ou gy < 0): altos nos dois do fundo (base ~80 px),
  largos (pontes, morros, ópera) nos laterais. Altura de marco: 40–80 px (o maior prédio do mapa tem ~60).

## 3. Luz, sombra e contorno
- Sol do alto à esquerda (oeste-noroeste). Parede da esquerda (frente-esquerda) = cor base; parede da direita
  = base −22%; telhado = base +10–18%; aresta superior da parede +12%.
- Sombra projetada para a direita/baixo (leste): hexágono = pegada + pegada deslocada (+gx) em `min(3, H/14)`
  células, azul-marinho `#141828` a ~28%. Árvores e postes fazem sombra curta (elipse NÃO: losango de 3–5 px).
- Contorno seletivo de 1 px em volta de cada prédio e marco: tom escuro da paleta (`#1c1824`, alfa ~170), não
  preto puro. Nada de contorno em pessoas, carros e chão.
- Noite: véu `rgba(8,12,40,0.74)`; só a camada emissiva (janelas, neon, postes, luzes dos marcos) brilha.

## 4. Paleta por época
| Época | Paredes | Telhados | Vidro | Rua | Letreiro |
|---|---|---|---|---|---|
| 1889–1919 | tijolo fuligem `#874430`, pedra `#c8b8a0` | ardósia `#5a4a46` | nenhum (janelas de guilhotina) | terra/paralelepípedo | pintado |
| 1920–1945 | calcário creme `#dccaa0`, bronze `#c8a040` | cobre verde `#7aa898` | nenhum | paralelepípedo | neon vermelho/verde |
| 1946–1967 | branco modernista `#e8e4d6`, pastéis | cascalho `#a8a8a0` | **nenhuma pele de vidro** (fita de janelas) | asfalto + faixa branca | neon |
| 1968–1989 | concreto `#9a968e`, pastéis pós-modernos | cascalho escuro | vidro fumê bronze `#5a5040` | asfalto + faixa amarela | neon 80 (rosa/ciano) |
| 1990–2019 | aço `#8a9aa8` | cinza | vidro azul `#4a7aa8` | asfalto | telão |
| 2020+ | branco `#e8e6dc`, madeira | telhado verde `#5a9a48` | vidro claro teal | asfalto azulado + faixa ciano | holograma |

Regra dura: **sem pele de vidro antes de 1968** (sede, prédios comuns e marcos).

## 5. Clima (paleta e vegetação)
- Trópico: grama `#3fa443` saturada, palmeiras, telhas `#c4643c`, paredes pastel; nunca neve.
- Árido: chão ocre `#cdb070`, telhados planos, poucas árvores (copa oliva).
- Ameno: grama `#52aa46`, chuva frequente, árvores caducas (outono âmbar, primavera com flor rosa).
- Frio: neve branca `#f4f8fc` com sombra azul `#c8d8ec` nos telhados; árvores nuas no inverno; pinheiros.
- Baía (Rio, Sydney, Salvador…): o mapa é cercado de mar: areia de 1 célula, linha de espuma de 1 px, faixa
  rasa (+25% luz) e mar fundo com brilhos de 2 px esparsos. Favela nos morros só no Rio/Salvador.

## 6. Prédios e a sede
- Proporção: largura de 2–5 células; andares visíveis como faixas (laje = linha de 1 px mais clara).
- A sede segue a casca do interior (`hqpx27.ts`): garagem (1 andar) → sala alugada sobre loja (2) → loft (2,
  tijolo industrial) → prédio (3) → torre (5) → campus (5). Função pura `hqExt27({level, year, floorsOpen,
  building})` decide casca, andares, fachada da época, telhado, letreiro e guindaste.
- Obra: o andar de cima vira estrutura crua com andaime amarelo `#c89838`; guindaste a partir do prédio.
- Placa com a sigla do selo na porta (todas as cascas) e letreiro no telhado a partir do prédio.

## 7. Marcos
- Desenhados em pixel isométrico com volume (faces esquerda/direita/topo), contorno, sombra e luz noturna.
- Respeitam o ano de construção/demolição (`from`/`to`): sem Ópera de Sydney antes de 1973, sem Torre de TV de
  Berlim antes de 1969, sem MASP antes de 1968, Torres Gêmeas só 1973–2001.
- Cada cidade escolhe até 4 marcos pelo peso de ícone (Big Ben e Tower Bridge antes de Abbey Road em Londres).
  Cidade sem marco cadastrado: catedral / ponte / estádio / torre de TV genéricos, pela época.

## 8. Vegetação e mobiliário
- Proibido círculo solto: árvore = copa em 3 camadas de pixels (sombra, base, luz) com contorno escuro e tronco
  de 1×3; palmeira = 5 folhas em leque; pinheiro = triângulos empilhados.
- Praça: piso em xadrez de 2 tons, bancos 3×1, canteiros em losango com contorno; chafariz isométrico (borda
  em losango, água com brilho). Piscina = losango azul com borda clara.

## 9. Marcadores (UI)
- Chip de 16 px (11 px no celular): ícone num quadrado arredondado com anel escuro de 1,5 px e haste curta que
  aponta para o telhado; fica 3 px acima do telhado, nunca sobre a fachada.
- Sede: anel dourado. Vizinho: chip redondo cinza (nome só no hover). Rival: vinho. Obra: listras amarelas.
- Placa "À VENDA" pequena (quadro creme, faixa na cor do tipo sugerido). Se um prédio da frente cobrir o lote,
  a placa sobe acima do telhado dele, com haste de 1 px até o lote, e é desenhada por cima de tudo.

## 10. Movimento e desempenho
- ~8 quadros/s só com o mapa visível (IntersectionObserver + `document.hidden`); "reduzir movimento" = quadro
  parado. Tudo que não se mexe (chão, sombras, marcos, prédios, contornos) é pré-desenhado uma vez por cena.

## 11. Lugares e interiores (CITY2)
- **Tudo é lugar.** Todo prédio do mapa que não é seu vira um lugar com dono, gente e ações (`sim/sys/place27.ts`):
  vizinhos do hood19 (`nb:<lote>`) e a cidade comum (`pl:<lote>`). Nada é só decoração; o ponto clicável é o prédio.
- **Básicos da música sempre presentes, pela época:** casa de shows (teatro de variedades → salão de baile → clube de
  jazz → casa de rock → casa de shows; casa REAL da cidade quando existe em venues17), loja (partituras e pianos antes
  de 1920 → 78 rpm → LPs → CDs de 1985 a 2007 → vinil para colecionador), rádio (só a partir de 1922), estúdio
  (cornetas → elétrico → fita → multipista → digital), bar (pub em Londres, botequim em cidade lusófona, speakeasy nos
  EUA 1920–33) e redação (coluna de jornal → revista → redação de site). Se faltar lote, o básico divide um prédio
  ("Também neste prédio"). O que já é seu conta como presente.
- **No mapa:** os lugares da música ganham chip pequeno sem nome (cor do tipo); prédios comuns (apartamentos,
  escritórios, hotel) só o contorno de foco. O prédio é desenhado com o tipo do lugar (marquise, toldo, antena).
- **Interior** (`ui/pixel/interior27.ts`): o mesmo corte lateral da sede (primitivas `prim27` de `ps/hqpx27.ts`), um
  andar de 92 px com fachada da época, letreiro com o nome, luz da época e a rua. Palco com cortina de veludo antes de
  1968 e refletores coloridos depois; plateia de costas NA FRENTE dos bonecos (só com alguém no palco); caixotes com
  partituras/78/LP/CD/vinil; cabine de rádio com luz "NO AR"; técnica + vidro + sala de gravação; balcão com garrafas
  e palquinho; máquinas de escrever até 1989, monitores depois. As pessoas são as reais (dono, funcionários, artistas
  da cidade no palco, os seus quando estão lá — destacados em dourado).
- **Um lugar só:** "Sua sede | Nosso mundo" em abas nas duas telas; "Ver a cidade −", Ctrl + roda ou pinça fechando
  saem da sede e o mapa abre aproximado na sede e se afasta (560 ms). Clicar na sede aproxima e entra. Nos lugares,
  "Entrar" aproxima e abre o interior; "Voltar à cidade", Esc, Ctrl + roda ou pinça afastam. Reduzir movimento = sem
  animação. O interior é pintado uma vez (sem laço de animação).
- **Filial/escritório estrangeiro nunca no bairro:** o vizinho "rival" é só gravadora da cidade (ou do país) da sede.

## 12. Céu, horizonte e marcos por cidade (r27 I2b)
Código: `src/ui/pixel/skyline27.ts` (plano puro `skyPlan27` + pintura `renderSky27`/`paintSky27`), `src/ui/pixel/lmdata27.ts`
(marcos só do mapa, com ano real), `src/ui/pixel/lmiso27.ts` (desenhos), `src/ui/pixel/cenas20.ts` (rampas do estilo
oficial, trazidas do ramo `claude/arte-cenas`). Testes: `tests/r27-skyline.test.ts`.
- **Estilo oficial** (skill `masters-artist-sprites`): cada cor vira rampa de 6 tons (sombra arroxeada → luz quente;
  tom 5 só em material brilhante — vidro, latão); face direita no tom 2, topo e cornija no tom 4, quina vertical como
  linha interna escura (tom 1); contorno dos marcos `#170e12`; sombra projetada arroxeada `#2a1838`. (Isto atualiza
  o §3 para os marcos e o horizonte.)
- **Camadas** (de trás para a frente): céu em 9 faixas pontilhadas (sem degradê liso) → nuvens de pixel (cúmulos de
  3–6 bolhas com base reta; chuva/neve = teto com festões e bancos baixos) → serras distantes → horizonte distante →
  água → morros → horizonte médio + assinaturas → casario perto → linha de árvores/palmeiras.
- **Perspectiva aérea**: longe = mistura com a névoa do horizonte puxada para o violeta (`#b4a4cc`); névoa ~0,5 longe,
  ~0,3 no meio, ~0,14 perto; chuva/neve somam +0,1. Céu claro com luz quente no horizonte (`#fff0d8`).
- **Época**: altura máxima do centro por cidade e ano (Nova York 1913 → 1931 → 1973; Los Angeles baixa até 1957; Tóquio
  baixa até 1964; Paris sempre baixa, com La Défense ao lado). Material pela época: tijolo/pedra → art déco → modernista
  e concreto → **vidro só a partir de 1968** (bronze) → vidro azul (1990) → teal/branco (2020). Fuligem amarelada no céu
  das cidades industriais antes de 1960; guindastes nos anos de expansão; mastros de TV só de 1955 a 1990.
- **Assinaturas** (cada uma com ano): Woolworth 1913, Chrysler 1930, Citicorp 1977, One WTC 2014; St Paul's 1711,
  Battersea 1935 (4 chaminés a partir de 1955), NatWest 1980, Canary Wharf 1991, Gherkin 2004, Shard 2012; Notre-Dame
  (flecha 1859–2019 e de 2024), Invalides, Montparnasse 1973, La Défense crescendo desde 1966; Reichstag (cúpula até
  1945, de vidro desde 1999), Gedächtniskirche (quebrada depois de 1943, torre azul 1961); Wrigley, Tribune, Marina City,
  Hancock, Aon, Trump; Prefeitura de LA 1928; Copan, Banespa, Martinelli e antenas da Paulista; A Noite (Rio, 1929); e
  ícones de Moscou, Dubai, Xangai, Kuala Lumpur, Taipé, Seul, Hong Kong, Cidade do México e Buenos Aires. As
  assinaturas desviam (até ±40 px) dos marcos altos desenhados na frente.
- **Relevo e água** pela geografia: San Gabriel (LA), Blue Mountains (Kingston), Fuji (Tóquio), Rainier (Seattle), Table
  Mountain (Cidade do Cabo), Vesúvio (Nápoles), vulcões (Cidade do México), Andes (Santiago), montes de rejeito dourados
  (Joanesburgo)…; água entre a cidade e o horizonte em baías, rios e lagoas (Nova York, Memphis, Detroit, Lagos).
  Cidade sem cadastro: genérico pela região (igreja colonial de duas torres na América Latina, minaretes no Oriente
  Médio e no Sahel, pagodes no Leste Asiático, cúpulas de cebola no Leste Europeu, gasômetros no Reino Unido).
- **Marcos novos** (só no mapa, `lmdata27.ts`, ano real): Capitol Records 1956, Stax 1960–1989, Renaissance Center 1977,
  Water Tower 1869, Sacré-Cœur 1914, Arcos da Lapa 1750 (bonde desde 1896), Devon House 1881, 56 Hope Road/Tuff Gong 1975,
  Ponte Carter 1901, Teatro Nacional de Lagos 1976, Ponte do Terceiro Continente 1990, Torre de Sydney 1981, Partenon de
  Nashville 1897. Redesenhados: letreiro de Hollywood (HOLLYWOODLAND até 1949), Griffith, Hollywood Bowl, Hitsville,
  Budokan, Skytree.
- **Noite**: janelas, luzes de aviação (≥1950), estrelas e lua vão para a camada de luz; marcos e prédios tapam o que
  fica atrás. Entardecer/amanhecer (`dusk27`) no ciclo dia/noite.
- **Escala**: tudo é pintado na largura real da cena (`G.mw`, de 300 a 436 px), sem larguras fixas. Cache por (cidade,
  ano, clima, estação, tempo, tamanho, semente); ~7 ms por faixa sem cache.

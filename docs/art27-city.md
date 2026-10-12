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

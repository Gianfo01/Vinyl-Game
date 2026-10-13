# Rodada 28 — Arte: relíquias, capas, emblemas do submundo, logos e extras

Pedido do autor: "coloque um agente para trabalhar em artes de mais relíquias, capas de álbuns e outras coisas como
símbolos para organizações do submundo, novos logos de bandas etc."

Restrição de estilo: o autor prefere o **desenho antigo**. Nada de acabamento "finish/iconkit" nem sprites HD.
Tudo foi feito no mesmo estilo de `icons.ts` e `art.ts`:
- paleta curta;
- contorno escuro quente de 1 px;
- 2 ou 3 tons por material;
- pontilhado Bayer e ruído determinístico;
- fonte bitmap 3×5.

Tudo é procedural e semeado: a mesma entrada sempre dá os mesmos pixels. Não há imagem externa.
Pessoas e avatares ficaram de fora, porque outro agente cuida deles.

## O que entrou (contagem por categoria)

| Categoria | Antes | Agora | Arquivo |
|---|---|---|---|
| Relíquias | emoji (14 categorias) | **48 desenhos** 24×24, cada um com modelo por época (6 faixas) e cores e detalhes pela semente | `src/ui/pixel/relic28.ts` |
| Categorias de relíquia (sim) | 14 | **26** (+setlist, cartaz, ingresso, contrato, baquetas, caderno, jukebox, amplificador, foto, disco emoldurado, sopro, sintetizador) | `src/sim/sys/relics9.ts` (união + rótulos), `src/sim/sys/relics28.ts` (nascimento) |
| Capas | 9 estilos por era | 9 estilos + **27 composições novas** por gênero e época + desgaste (aro do vinil, adesivo "HIT") | `src/ui/pixel/cover28.ts` |
| Logos de banda | 9 estilos por era | 9 + **18 estilos por gênero** + **letreiro** 64×16 com o nome inteiro | `src/ui/pixel/logo28.ts` |
| Emblemas do submundo | nenhum (só texto) | brasões 32×32 com **10 formas**, **9 divisões de campo**, **25 cargas** e **22 paletas por região**, para **11 tipos** (5 de organização + 6 de golpe) | `src/ui/pixel/emblem28.ts` |
| Marcas de gravadora | logo de ato reaproveitado | **10 marcas** pela época de fundação | `src/ui/pixel/extras28.ts` |
| Festivais | texto | **cartaz** 32×44 (4 épocas, com headliner) e **bottom** 16×16 | `extras28.ts` |
| Revistas, jornais e mídia | texto | **mastro** 64×12 em **8 tipos** (tabloide, revista, jornal, fanzine, online, rádio, TV, revista do setor) | `extras28.ts` |
| Troféus e ingressos | ícone genérico | reuso das relíquias `trophy` (gramofone, astronauta, taça, estrela) e `ticket` | `relic28.ts` |

### Relíquias (48)

**Instrumentos e equipamento:**
- guitarra sólida, semiacústica, Flying-V, violão, baixo (e o baixo-violino);
- bateria (e pele de bumbo pintada), baquetas;
- microfone (fita → "Elvis" → bola → condensador → neural) e pedestal com lenços;
- piano, sintetizador (Moog → digital → controlador, e teremim);
- sopro (trompete ou sax), violino, toca-discos, fones, laptop, mesa de som, núcleo neural.

**Gravações e prêmios:**
- fita master de rolo → cassete → HD/pendrive, conforme a época;
- disco de ouro e de platina emoldurados;
- disco raro (78, 45, LP, acetato, vinil colorido) e CD;
- troféu.

**Papel:** letra manuscrita (com rasura e marca de café), caderno, setlist com fita silver tape, cartaz (letterpress,
psicodélico, xerox punk, neon, minimalista), ingresso (impresso → Ticketron → térmico → código de barras),
contrato (com selo de cera, ou guardanapo), foto (P&B serrilhada, polaroide).

**Figurino:** macacão (águia ou Ziggy), jaqueta (couro com tachas, ou cardigã), vestido de paetê,
botas plataforma, tênis, sapatinhos de rubi, chapéu (turbante de frutas, cowboy, fedora, cartola, boina),
óculos (redondos, de aro grosso, aviador, coração, gatinho), luva.

**Objetos grandes:** carro (anos 40, rabo de peixe, psicodélico, esportivo, limusine, SUV), ônibus de turnê,
jukebox, amplificador (tweed, combo, stack), porco inflável, objeto de cena, quadro, globo espelhado.

O tipo sai da categoria da peça mais as palavras do nome. Exemplos:
- "Lucille" vira semiacústica;
- "Martin D-18E" vira violão;
- "Höfner" vira baixo-violino;
- "ruby slippers" vira sapatinhos;
- "turbans" vira turbante de frutas;
- "framed platinum" vira disco de platina.

No museu, o papel do músico também define o instrumento: DJ vira toca-discos, produtor vira fita, mesa ou laptop
conforme a época.

### Capas (27 composições)

| Origem | Composições |
|---|---|
| Época | jazz tipográfico dos 50, retrato em duotom, moldura art déco, letras ondulantes psicodélicas, colagem de bilhete de resgate punk, Memphis dos 80, foto granulada dos 90, bolha 3D dos 2000, pontos minimalistas, forma de onda, glitch digital, polaroide de quarto |
| Gênero | pôr do sol country, folhas tropicais (latina/Brasil), moldura clássica, paisagem prog (lombada de gatefold), glitter disco, metal escuro (caveira ou raio, letras pontiagudas), grafite (rap), cromado synth, foto de rua com selo "explicit", smiley de rave, corrente de ouro, sol rastafári, kente, ondas e sol nascente |
| Título | palco ao vivo, quando o título tem "live", "ao vivo" etc. |

Como a capa é escolhida:
- Cerca de 1/3 das capas continua no desenho original de `art.ts`. A escolha depende só da semente.
- Nas outras, o gênero manda em cerca de 70% dos casos e o repertório da época no resto.
- A escolha de estilo do jogador (retrato, conceito…) continua valendo, porque mapeia para o estilo da época.

Desgaste:
- A marca de aro do vinil aparece em discos com 12 anos ou mais de estante, lançados até 2007.
- O adesivo de loja aparece em cerca de 12% das capas a partir de 1962.

### Logos (18 estilos) e letreiro

| Gênero | Estilo do logo |
|---|---|
| Metal | pontiagudo, escudo de asas |
| Punk | estêncil sobre spray |
| Disco | script inclinado com brilho |
| Britpop/mod | alvo |
| Rap | grafite em bolha com coroa |
| Synth | cromado com horizonte |
| Indie | rabisco em papel com fita |
| Country | ferradura |
| Jazz | bloco tipográfico |
| Reggae | círculo rasta |
| Eletrônica | matriz de LEDs |
| Soul | selo de compacto |
| Latina/Brasil | sol |
| Clássico | coroa de louros |
| Ásia | carimbo hanko |
| África | escudo com padrão |
| Pop | adesivo de coração ou estrela |
| Rock | raio |

Os estilos respeitam a época. Metal antes de 1969 vira raio. Rap antes de 1979 vira selo de compacto.

Cerca de 45% dos atos seguem no logo original. O **letreiro** (wordmark) escreve o nome inteiro na tipografia do gênero.

### Emblemas do submundo

| Tipo | Forma |
|---|---|
| Máfia | escudo ou cartela, às vezes com coroa |
| "Firma" | medalhão |
| Sindicato | kamon no Japão, losango em Hong Kong e na China |
| Cartel | estrela ou sol |
| Gangue | emblema de colete com faixas e iniciais |
| Pirataria | carimbo |
| Jabá | moeda |
| Banda-fantasma | ingresso "FAKE" |
| Dublagem e voz de IA | carimbo riscado |
| Fraude | carimbo |

As cores vêm da região: Itália em verde, vinho e ouro; Japão em preto e vermelho; Brasil em verde e ouro; e assim por diante.

A carga sai do negócio da organização em cerca de 55% dos casos (jukebox, rádio do jabá, cassete pirata, ingresso,
mão negra, moeda e saco de dinheiro da lavagem, punhal, máscara de carnaval, sanfona dos corridos). No resto é um
bicho ou símbolo do tipo (lobo, cobra, águia, touro, corvo, aranha, escorpião, caveira, rosa, chave, dados, ás).

Tudo é inventado: nenhuma insígnia real foi copiada.

## Onde aparece no jogo

| Arte | Onde aparece | Arquivo |
|---|---|---|
| Relíquias | Lendas › Relíquias: cartões e ficha da peça (emoji trocado por arte 48 e 96 px) | `src/ui/sys/lendas9.ts` |
| Relíquias | Lendas › Acervo vivo | `src/ui/sys/talent18.ts` |
| Relíquias | Submundo › Mercado negro | `src/ui/sys/crime17.ts` |
| Relíquias | Museu do selo: discos de ouro/platina e instrumentos das lendas (emoji trocado) | `src/ui/sys/live/museum.ts` |
| Emblemas | Submundo › Organizações (cartão de cada organização) e lista de prensas piratas | `src/ui/sys/crime17.ts` |
| Emblemas | Fraudes › Bandas-fantasma (selo "FAKE") e voz-fantasma ativa (carimbo) | `src/ui/sys/media19.ts` |
| Capas | todas as miniaturas que usam `cover()`/`coverUrl` (ficha do disco, catálogo, museu, retrospectiva, mídia…), com desgaste por idade | `src/ui/art.ts`, `src/ui/common.ts` |
| Logos | todos os lugares que usam `logo()`/`logoUrl` | `src/ui/art.ts` |
| Letreiro | cabeçalho da página do artista | `src/ui/pages.ts` |
| Marca do selo | cabeçalho do dossiê do selo | `src/ui/sys/dossier13.ts` |
| Festivais | bottom na tabela de festivais e cartaz da edição na página do festival | `src/ui/sys/hubs8.ts` |
| Troféus | tabela de premiações e página da cerimônia | `src/ui/sys/hubs8.ts` |
| Mastros | tabela de críticos | `src/ui/sys/hubs8.ts` |
| Mastros | cartões de crítica | `src/ui/reviewView.ts` |
| Mastros | revistas à venda e a sua revista | `src/ui/sys/media19.ts` |

A regra da R27 foi respeitada: só entraram imagens. Nenhum botão ou fluxo novo.

### Relíquias novas que nascem de fatos (`src/sim/sys/relics28.ts`)

| Fato | Relíquia |
|---|---|
| Certificação sua | disco de ouro ou platina emoldurado |
| Festival com ato famoso | cartaz |
| Show histórico ou megaevento | ingresso e setlist |
| Volta da banda / retorno | ingresso / setlist |
| Morte de baterista | baquetas |
| Lenda ou Hall da Fama | amplificador, sintetizador ou sopro, pelo instrumento do líder |
| Clube que fechou | jukebox |
| Canção do fim | caderno |
| Supergrupo | foto |

Regras:
- Há dedupe por ano e um limite por ato.
- O modo exato não inventa nada para ato real intocado.
- Não há estado novo: tudo usa a lista de `relics9` e a meta e o dedupe de `relics18`.

## Desempenho e save

- A arte é gerada sob demanda. O `Px` fica em memo em `art.ts`, e a data URL fica em memo em `pxUrl28`, por chave
  de semente/tipo/época, com teto de 1.500 entradas.
- Nada novo vai para o save, a não ser as relíquias que nascem de fatos (entradas comuns da lista existente, com o teto de 90 de `relics9`).
- Custo no pacote: cerca de 130 KB de fonte nos 6 módulos novos. Minificados juntos dão cerca de 75 a 85 KB
  (cerca de 25 a 30 KB com gzip, já descontando a duplicação de px/fonte que o teste de esbuild isolado conta).

## Testes

`tests/r28-art.test.ts` tem 13 testes:
- determinismo de todas as categorias (mesmos pixels e mesmas escolhas puras);
- variedade:
  - relíquias variam por semente e época;
  - 40 organizações dão 36 ou mais brasões e 10 ou mais cargas;
  - 60 discos dão 55 ou mais capas e 12 ou mais composições;
  - cerca de 55% dos logos são novos;
- cobertura:
  - toda relíquia × época;
  - todo tipo de emblema × região e todas as organizações do jogo;
  - toda composição cobre o quadro;
  - todo gênero × época tem capa e logo;
  - todos os estilos de logo, letreiro, gravadora, festival e mastro;
- classificação de peças reais;
- nascimento das relíquias novas.

Também rodaram, em lotes, sem regressão:
- `r11-lendas`, `r18-talent`, `r17-crime`;
- `r9-world`, `r19-media`, `r27-art`;
- `r17-data`, `r13-hype`, `r19-afterlife`;
- `r17-nav`, `r27-ctx`, `r23-crime-members`;
- `r18-tutorial`, `r19-history`.

`tsc --noEmit` está limpo.

## Capturas (`docs/shots28art/`)

Folhas de contato, geradas por `tools/artsheet28` (`npx vite tools/artsheet28` e `?part=…`):
- `sheet-relics.png`: 48 relíquias em 6 épocas e 4 sementes.
- `sheet-covers.png`: 27 composições, desgaste e capas finais por gênero, de 1952 a 2034.
- `sheet-emblems.png`: as 26 organizações do jogo e os 11 tipos × 10 regiões.
- `sheet-logos.png`: 18 estilos, letreiros e logos finais.
- `sheet-extras.png`: marcas de gravadora, cartazes e bottons de festival, mastros, troféus e ingressos.

Telas do jogo, geradas por `scripts/shots28art.mjs`:
- `game-lendas-reliquias.png`, `game-reliquia-ficha.png`, `game-acervo-vivo.png`;
- `game-submundo-organizacoes.png`, `game-fraudes.png`;
- `game-festivais.png`, `game-festival-cartaz.png`;
- `game-premiacoes.png`, `game-criticos.png`;
- `game-ficha-selo.png`, `game-pagina-artista.png`, `game-lancamentos.png`.

## Lacunas

- **Facções de fãs e placas de casas de show:** não entraram. Não há tela natural para elas hoje. As placas
  ficariam bem no mapa da cidade (`city27`), mas é uma área compartilhada.
- **Texto pequeno na arte:**
  - Mastros a 64 px e letreiros de nome comprido, em escala 1, ficam pequenos.
  - Funcionam como "cor e forma" do veículo ou da banda, mas a leitura do nome depende do texto ao lado.
  - Nomes longos de festival são cortados no cartaz (até duas linhas).
- **Coerência de época do cartaz de festival:** a época vem do ano da edição. A identidade do festival (vibe, foco)
  ainda não muda o desenho, só a cor.
- **Ícones 16×16** (`icons.ts`/`icons17.ts`): não foram tocados. Os emblemas, relíquias e troféus novos são maiores e
  entram ao lado do texto. Ícones novos de menu não foram pedidos.
- **Nomes reais:** no modo de nomes reais, o mastro desenha o nome real do veículo em layout inventado (como o texto já
  fazia). Emblemas de organizações reais também são inventados (heráldica genérica), e nenhum símbolo real foi copiado.
- **`hq.ts` (cartazes da sede) e `posterPx`:** seguem no desenho antigo. Não entraram composições novas ali.

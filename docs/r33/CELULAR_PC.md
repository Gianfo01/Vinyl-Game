# Celular e computador (versão 33) — proposta para o POL33

Mocks: `docs/r33/mocks/mock33-celular.png`, `mock33-celular-compras-epoca.png`, `mock33-computador.png`.

Pedidos do dono (2026-10-17):
- Um botão **CELULAR** no menu de baixo, o último (depois de MUNDO), atalho 5, que só aparece quando o celular é lançado
  (1983). Ele abre uma tela interativa que representa o aparelho.
- O mesmo para o **computador**, usando o PC que já está na mesa do escritório (upgrade "Computador com planilha" do
  livro-caixa, 1982+), sem atalho no menu de baixo.
- "Devemos ter mais coisas e tudo deve ser integrado ao que já existe": por exemplo, ver vídeos e descobrir um artista
  novo assim.
- Também deve dar para **comprar objetos**.

## Regras

- **Nenhuma regra nova paralela.** Cada app é uma porta para um sistema que já existe: chama a mesma função, abre o
  mesmo cartão de ações (ACOES5) ou leva ao lugar certo. Os custos são os do sistema de origem (dinheiro, bolinhas).
  Se o sistema de origem estiver desligado, o app não aparece.
- O celular abre por cima da cena atual, sem trocar de lugar (EXP-13). O "!" do botão soma os "!" dos apps.
- **Época manda.** Cada app tem um ano de entrada (e às vezes de saída). O aparelho e o visual mudam com a época, mas
  o botão e a posição dos apps ficam no mesmo lugar.

  | Ano | Celular | Computador |
  |---|---|---|
  | 1982 | — | tela verde |
  | 1983 | tijolão | — |
  | 1995 | — | janelas |
  | 1997 | flip | — |
  | 2003 | — | portal |
  | 2007 | primeiro smartphone | — |
  | 2012 | smartphone | tela plana |
  | 2032 | holograma | vidro |

- Pixel art pelas regras do PLANO (Px, contorno INK, luz de cima à esquerda, paleta da época), sem nomes reais de
  marcas: "Vídeos", "Redes", "Streaming".
- Interruptor `exp33.aparelhos`, ligado por padrão.

## Apps do celular (ano em que aparecem → sistema que já existe)

| App | Desde | Faz | Liga em |
|---|---|---|---|
| Ligar | 1983 | falar com artista, empresário, rádio, imprensa de qualquer lugar | `managers14`, objeto Telefone, `social31` (contatos) |
| Recados | 1983 (SMS 1997) | a caixa de entrada de sempre | `inbox18` |
| **Vídeos** | 2006 | ver vídeos em alta e **descobrir artista novo** (cover no quarto, clipe caseiro, dança viral); assistir revela o grau como no canal; "mandar olheiro", "seguir", "fazer proposta"; rival também vê (visibilidade pública) → disputa | `discover18` canais `youtube` (2006+) e `tiktok` (2018+) via `dig18`; `scoutRace18`; clipes do seu elenco com views (`stream18`, fonte "vídeo") |
| Redes | 2004 | postar bastidor, anunciar lançamento, live, responder crítica; meme do momento | `hype12`, `fans18`, `rollout` (pré-save), `vida33` reputação pessoal, memes de `mundo33` |
| Streaming | 2008 | ouvintes por cidade, playlists, pedir vaga em playlist | `stream18`, `car31plat`, paradas `charts7` |
| Rádio | 1983 | ouvir as rádios da cidade, ligar para o programador | `radio18` |
| Notícias | 1999 | notícias e boatos sobre você e o mundo | `press18`, `zines19`, Jornal na mesa |
| Banco | 2000 | saldo, empréstimo, catálogo como garantia | banco da INT-2, `finance`, `bonds9` |
| Bolsa | 1999 | comprar e vender ações de selos, plataformas e fabricantes | `bolsa10` |
| **Compras** | 1999 | **comprar objetos**: decoração, upgrades da sede e da casa, instrumentos, carro; entrega a distância com prazo da época | `decoshop31` (compra a distância), `deco31`, `items31`, `gear19` |
| Leilão | 2000 | lances em relíquias e merch exclusivo fora de casa | `auction31`, `bauc31`, `relic31`, merch do POL33 |
| Ingressos | 2000 | ver shows da semana; ir a um show para ver quem abre (descoberta) | `watchShow18` de `discover18`, `show27`, `tours` |
| Mapa | 2007 | ir até um lugar da cidade, chamar transporte | `city31`, `travel31`, `place27` |
| Agenda | 1983 | bolinhas do mês e compromissos | `agenda17`, `calendar19` |
| Câmera | 2002 | foto que vira post; flagras de paparazzi | `vida33` paparazzi, Redes |
| Encontros | 2012 | chamar alguém para sair (família Fossati nunca aparece) | `amor31`, `love17`, `life` |
| Família | 1983 | falar com a família, Fossati e herdeiros | `fossati31`, `heirs8`, `kids17` |
| Imóveis | 2005 | lotes, casas e aluguéis da cidade | `lots31`, CIDADE (`cidade33`) |
| Saúde | 2014 | estresse, sono, marcar médico ou férias | `vida33`, `stress17` |
| Fã-clube | 2004 | falar com os fãs, ver motivos e lealdade | `fans18`, `fan15` |
| Toques | 1997–2009 | vender toques de celular das suas músicas: um formato novo | `formats33` (formato "toque") |

## Apps do computador

| App | Desde | Faz | Liga em |
|---|---|---|---|
| Planilha | 1982 | livro-caixa com previsão de vendas | `finance`, `learn31`/`learn33` |
| E-mail | 1995 | a caixa de entrada de sempre | `inbox18` |
| Site e fã-clube | 1995 | lista de fãs, notícias do selo | `fans18`, `fan15` |
| Fórum e P2P | 1999–2010 | ver a pirataria de discos; denunciar ou ignorar | pirataria do mundo (`events_more11`, cartório da INT-2) |
| Demos online | 2003 | ouvir demos de perfis (MySpace 2003–10, SoundCloud 2009+) | `discover18` canais `myspace`/`soundcloud`, `demo29` |
| **Vídeos** | 2006 | o mesmo app do celular, com tela maior e filtro por gênero e país | `discover18` (`youtube`, `tiktok`) |
| Painel do artista | 2012 | ouvintes por cidade → "montar turnê por aqui"; pedir playlist | `stream18`, `car31plat`, `tours` |
| Editor de áudio | 1999 | demo caseira (1 bolinha, sem custo, qualidade baixa) → mandar à rádio ou subir na rede | `compose27`, `studio`, `radio18` |
| **Compras** | 1997 | o mesmo app do celular, com catálogo completo e comparar | `decoshop31`, `deco31`, `items31`, `gear19` |
| Loja online | 1997 | vender merch e vinil direto ao fã | `merch17`, `vitrine31` |
| Anúncios | 2000 | campanha online segmentada por cidade | `media`/`rollout`, outdoors do POL33 |
| Leilão | 1997 | lances em relíquias | `auction31`, `bauc31`, `relic31` |
| Bolsa | 1997 | home broker | `bolsa10` |
| Contratos | 1985 | ver contratos e cláusulas | `contracts19`, `rights18` |
| Relatórios | 1990 | relatórios dos diretores | `deleg31`, `dir33` |
| Jogo | 1982 | pausa que baixa o estresse | `leisure14`, `stress17` |

## As ações mudam com a época (pedido do dono)

O ano não decide só quais apps existem: dentro do mesmo app, as ações também mudam com a época. Cada ação tem um
intervalo de anos, e o cartão mostra só as ações do ano da partida.

| Área | Linha do tempo das ações |
|---|---|
| Ligar | **1983** só de carro ou na rua, caro por minuto → **1997** de qualquer lugar → **2012** chamada de vídeo (a conversa rende mais na relação) → **2032** holograma na sala |
| Mensagens | **1997** SMS curto → **2009** grupo do elenco (fofoca e briga aparecem ali) → **2015** áudio → **2032** assistente responde por você (pode errar e virar crise) |
| Música | **1997** vender toque → **2003** MP3 e P2P (pirataria) → **2008** streaming e playlists → **2030** faixa gerada por IA |
| Vídeos e redes | **2004** perfil → **2006** cover no quarto → **2010** post e foto → **2018** dança curta viral → **2030** avatar |
| Compras | **1889–1996** catálogo pelo correio (semanas) → **1999** loja online (dias) → **2015** entrega no dia → **2030** drone |
| Dinheiro | **2000** ver saldo → **2010** pagar e transferir → **2020** Pix e carteira digital (Brasil 2020) → **2021–22** bolha das NFTs |
| Computador | **1982** planilha e jogo → **1995** e-mail, site e compras → **1999–2010** fórum e P2P → **2003** demos em perfis → **2006** vídeos → **2012** painel do artista, loja online e anúncios → **2030** IA (demo gerada, relatório que prevê vendas) |

## Antes do celular e do computador

Sem botão (antes de 1983) e sem PC (antes de 1982), as mesmas portas continuam nos objetos de sempre: telefone de
mesa, jornal, rádio, livro-caixa. Compras antes da internet: "Catálogo pelo correio" na mesa (1889+), que usa a
mesma compra a distância de `decoshop31`, com prazo de entrega maior.

## Teste

Teste do tipo `r33-aparelhos`:
- todo app aponta para uma função ou área que existe;
- os anos de entrada são respeitados;
- o app some quando o sistema de origem está desligado;
- assistir a um vídeo gera o mesmo lead de `dig18('youtube')`;
- comprar pelo app chama a compra a distância de `decoshop31`.

# Celular e computador (versão 33) — proposta para o POL33 / frente própria

Mocks em `docs/r33/mocks/`:
- `mock33-celular.png`: tela inicial com 20 apps e o app de Vídeos;
- `mock33-celular-compras-epoca.png`: Compras e o celular de 1997;
- `mock33-celular-jogos-encontros.png`: cobrinha e Encontros;
- `mock33-computador.png`: o computador.

Fonte HTML dos mocks: `mock33-celular-pc.html`.

Pedidos do dono (2026-10-17):
- **Botão CELULAR** no menu de baixo, o último, atalho 5, só depois que o celular é lançado (1983). Ele abre uma tela
  interativa que representa o aparelho.
- **Computador** usando o PC da mesa (upgrade "Computador com planilha" do livro-caixa, 1982+), sem atalho no menu de
  baixo.
- Mais apps, e **tudo ligado ao que já existe**: ver vídeos e descobrir artista novo, comprar objetos, cobrinha
  jogável, Encontros no estilo Tinder com NPCs.
- **As ações mudam com a época**, e **cada uma das 5 versões do aparelho tem conteúdo próprio**.

## Regras

1. **Nenhuma regra nova paralela.** Cada ação chama uma função que já existe (nome entre crases nas tabelas). A ação
   faz ali mesmo, ou abre o mesmo cartão de ações (ACOES5), ou leva ao lugar certo. Custos e chances são os da função.
2. **Sistema desligado = app escondido.** Ação sem dinheiro ou sem bolinha aparece cinza, com o motivo (o mesmo
   bloqueio da função: `askLock31`, `lotLock31`, `shopLock33`…).
3. **Época manda em três níveis:**
   - o aparelho (5 versões);
   - os apps que existem;
   - as ações dentro de cada app (cada ação tem `de`–`até`).
4. O celular abre por cima da cena, sem trocar de lugar (EXP-13). O "!" do botão soma os "!" dos apps, que vêm das
   mesmas pendências de hoje (`pendattn`).
5. Pixel art pelas regras do PLANO. Nomes genéricos ("Vídeos", "Redes"); nomes reais só no modo de nomes reais.
6. Interruptor `exp33.aparelhos`, ligado por padrão. A família Fossati segue intocada: nunca aparece em Encontros e não
   envelhece.

## As 5 versões de cada aparelho

### Celular (botão 5)

| Versão | Aparelho | Apps |
|---|---|---|
| **1983** | tijolão de antena, tela verde de 1 linha | Ligar, Agenda (nomes e números), Recados (caixa postal de voz) |
| **1997** | flip com SMS | Ligar, Recados (SMS), Agenda, **Toques**, **Jogo (cobrinha)**, Rádio (FM no fone), Família |
| **2007** | primeiro smartphone (tela de toque, poucos apps) | Ligar, Recados, Agenda, Música (MP3), **Vídeos**, Notícias, Mapa, Câmera, Jogo (quebra-cabeça de blocos), Banco (saldo), Redes (perfil), Fã-clube |
| **2012** | smartphone com loja de apps | os 20 apps: Ligar, Recados, **Vídeos**, Redes, Streaming, Rádio, Notícias, Banco, Bolsa, **Compras**, Leilão, Ingressos, Mapa, Agenda, Câmera, **Encontros**, Família, Imóveis, Saúde, Fã-clube; Jogo (toque rápido) |
| **2032** | holograma no pulso | os mesmos 20, mais ligação em holograma, assistente de IA (responde e agenda por você; pode errar) e encontro em holograma |

### Computador (item da mesa do escritório)

| Versão | Máquina | Apps |
|---|---|---|
| **1982** | tela verde, disquete | Planilha, Contratos (editor de texto), Relatórios (impressos dos diretores), Jogo (tênis de dois traços e labirinto) |
| **1995** | janelas, modem discado | os de 1982, mais E-mail, Site e fã-clube, **Compras** (catálogo online), Bolsa (cotações), Editor de áudio (gravação no PC) |
| **2003** | portal, banda larga | os de 1995, mais **Fórum e P2P** (pirataria), **Demos online** (perfis com 4 músicas), Leilão online, Notícias, Loja online (CD e merch) |
| **2012** | tela plana | os de 2003 (sem P2P depois de 2010), mais **Vídeos**, **Painel do artista** (streaming), Anúncios (campanha online), Demos online (rap e eletrônica) |
| **2032** | vidro e holograma | os de 2012, mais IA de produção (demo gerada, risco de "conteúdo sintético" das plataformas) e relatório que prevê vendas (aprendizados no máximo) |

## O que tem em cada app

Formato: **ação** (anos) → função que já existe.

### Ligar
- Ligar para artista do elenco (1983+) → abre a ficha e as ações da pessoa (`people`, `personact18`); conversa conta como
  encontro (`meet31`, `shiftTie31`).
- Ligar para empresário ou agente (1983+) → `managers14` (fila de propostas do Telefone).
- Ligar para o programador da rádio (1983+) → `pitchRadio18`; 1983–1996 custa minuto caro (dinheiro).
- Ligar para a imprensa: dar furo ou pedir embargo (1983+) → `scoop18`, `embargo18`.
- Pedir apresentação a um amigo em comum (1997+) → `askIntro31`.
- Chamada de vídeo (2012+): a relação sobe mais → `shiftTie31` com peso maior.
- Holograma (2032+): reunião sem viajar → conta como presença em reunião (`long18`, `car31`).

### Recados
- Caixa postal de voz (1983–1996), SMS (1997+), grupo do elenco (2009+), áudio (2015+) → a mesma caixa (`inbox18`):
  ler, responder, arquivar e marcar (`archive18`, `star18`).
- Grupo do elenco mostra fofoca e briga antes de explodir (2009+) → `dyn18`, `ego33` (química da banda).
- Assistente responde sozinho (2032+) → resposta padrão da caixa; pequena chance de erro que vira crise (`openCrisis27`).

### Agenda
- Ver as bolinhas do mês e o que está reservado (1983+) → `ag17`, `balls`, `reserved`.
- Marcar ou desmarcar compromisso (1983+) → `calendar19`.
- Rotina: sono, viagem, hobby (2007+) → `setRoutine33` (VIDA).

### Toques (1997–2009)
- Transformar um hit em toque e vender (1997+) → formato "toque" no ciclo de formatos (`formatLife33`, `formatFit33`).
- Ver ranking de toques (2002–2009) → paradas (`charts7`).

### Jogo
- 1982 (PC): tênis de dois traços e labirinto. 1997: **cobrinha**. 2007: quebra-cabeça de blocos. 2012: jogo de toque
  rápido. 2032: jogo em holograma.
- Todos jogáveis com teclado. Cada partida baixa o estresse até um limite por mês → `stress17`, `stressDot33`. O recorde
  vira fato do diário (`dm18`).

### Rádio (1997+)
- Ouvir as rádios da cidade e ver o que toca (1997+) → `fmtsNow18`, `stationCity18`, `spins18`.
- Pedir para tocar a sua música (1997+) → `pitchRadio18`. Almoço com o programador (1997+) → `lunchPd18`.

### Música e Streaming
- Ouvir o seu catálogo e as faixas do elenco (2007+, MP3) → `repertoire27`.
- Ouvintes por cidade e retenção (2008+) → `st18`, `retOf18`.
- Pedir vaga em playlist (2008+) → `pitchPlaylist18`, `pitchOdds18`. Com plataforma própria (2008+): pôr ou tirar
  faixa das suas playlists → `addList31`, `dropList31`.
- Ver risco de streams falsos (2015+) → `farmRisk18`.

### Vídeos (2006+)
- **Ver vídeos em alta e descobrir artista novo** (2006+, cover no quarto; 2018+, dança curta) → `dig18('youtube')` e
  `dig18('tiktok')`, com o mesmo custo, ruído e visibilidade.
- Mandar olheiro conferir → `watchAct` (scouting). Seguir → `toggleWatch`. Fazer proposta → contrato (`defaultOffer`,
  `evaluateOffer`).
- Rival também viu → `scoutRace18` (aviso na caixa com prazo).
- Ver os clipes do seu elenco e as views (2006+) → `videoOpen18`, `makeVideo18`; encomendar coreografia → `choreoFee18`.
- Usar o meme do momento no clipe (2010+) → memes do MUNDO (`memes33On`, `pulse33`).

### Redes (2004+)
- Perfil do selo e dos artistas (2004+) → hype (`addHype`, `hy`).
- Postar bastidor ou foto (2010+) → `addHype` pequeno; foto da Câmera.
- Anunciar lançamento e pré-save (2010+) → `planRollout`, `canPresave`.
- Live com o artista (2016+) → fãs (`fansMonth18`); gasta 1 bolinha.
- Responder crítica ou polêmica (2010+) → reputação pessoal (`addRep33`) e chance de escândalo (`scandal33`).
- Avatar e show virtual (2030+) → `fansLaunch18` com público online.

### Notícias (2007+; no PC 2003+)
- Ler notícias e boatos (2007+) → `press18`, `zines19`, Jornal na mesa.
- Ver crítica de disco (2007+) → `review18`.
- Ver a crise do momento (crash, censura) (2007+) → `mundoNow33`, `creditCrisis33`.
- Comprar um fanzine ou site de música (2003+) → `buyable19`, `buyOutlet19`.

### Banco (2007+ saldo; 2010+ completo)
- Ver saldo e dívida (2007+) → `balanceSheet`, `totalDebt`.
- Pedir empréstimo (2010+) → `loanOffer`, `takeLoan` (o banco da INT-2).
- Dar relíquia como garantia, ou soltar a garantia (2010+) → `pledge33`, `unpledge33`.
- Pix e carteira digital (Brasil 2020+) → só muda o texto do pagamento.
- Seguro do artista-chave (2010+) → `insureKey19`, `setPlan19`.

### Bolsa (2012+ no celular; 1995+ no PC)
- Cotações das empresas que existem no ano (1995+) → `bolsa`, `listed`, `change12`.
- Comprar e vender ações; ver quem controla cada empresa (1995+) → `sharesOf`, `holdingsOf`, `controlShare`.
- Defender o selo de compra hostil (1995+) → `raiders`, `repelRaider`.
- Bolha das NFTs (2021–22) → item de época (`merch17`, NFT de 2021–22).

### Compras (PC 1995+; celular 2012+; antes, catálogo pelo correio na mesa, 1889+)
- **Comprar objetos de decoração e upgrades** da sede, da casa e dos seus lugares, com prazo de entrega da época →
  `remotePrice31`, `decol31` (compra a distância de `decoshop31`); peças vintage → `vintage31`.
- Instrumentos e equipamento (1995+) → `gear19`.
- Escolher onde colocar → manda para "Arrumar" (`deco31`).
- Entrega: semanas (correio) → dias (1999) → no dia (2015) → drone (2030). Muda só o prazo.

### Leilão (2003+)
- Ver as sessões e os lotes (2003+) → `openSessions31`, `sessionOf31`, `assignLots31`.
- Dar lance de longe (2003+) → `writeBid31` (leilão às cegas de `bauc31`); ver o risco de falsificação → `fakeOdds31`.
- Vender relíquia ou merch exclusivo (2003+) → `noteSale31`, merch do POL33.

### Ingressos (2012+)
- Ver os shows da semana na cidade (2012+) → `showsNow18`.
- Ir a um show para ver quem abre (descoberta) (2012+) → `watchShow18`.
- Vender ingressos dos seus shows e ver o choque de preço (2012+) → `ticketShock18`, turnês (`tourList`).

### Mapa (2007+)
- Ir até um lugar da cidade (2007+) → `place27` e o cartão do lugar no mapa.
- Chamar transporte e ver as partidas do aeroporto (2007+) → `departures31`, `travel31`.
- Ver em que bairro o preço está subindo (2012+) → `districtStage33` (CIDADE).

### Câmera (2007+)
- Foto que vira post (2010+) → Redes (`addHype`).
- Flagra de paparazzi aparece aqui (2007+) → `papChance33`; montar segurança → `setGuard33`, `buildWall33`.

### Encontros
Por época:

| Ano | Onde | Como funciona |
|---|---|---|
| 1889 | anúncio no jornal | "coração solitário" |
| 1965 | computador | encontro por cartão perfurado |
| 1996 | PC | sala de bate-papo |
| 2003 | PC | site de namoro |
| 2012 | celular | arrastar para o lado |
| 2032 | holograma | encontro em holograma |

- Perfis = gente de verdade: quem trabalha nos lugares da cidade (`gente31`, `jobOf31`: enfermeira do hospital,
  bartender, vendedora da loja de discos, professor da escola de música…), artistas, executivos e críticos solteiros.
- Curtir, passar e super curtida. O match usa `askOdds31`/`askRoll31` e o bloqueio `askLock31`. Mostra amigos em comum
  (`introVia31`).
- Encontro (1 bolinha pessoal) → namoro (`life.partner`), caso (`startAffair`, `affairRisk17`), fofoca (`papChance33`).
- Nunca: menores e família Fossati (`isFossati31`).

### Família (1997+)
- Falar com a família Fossati (1997+) → `famNow31`, `luciaLunch31`, `lasagna31`, `soniaPromo31`, `antonellaPress31`.
- Ver herdeiros e a sucessão (1997+) → `heirCandidates`, `inheritancePreview`.

### Imóveis (2012+)
- Lotes e casas à venda na cidade (2012+) → `lotPrice31`, `buyLot31`, `lotLock31`.
- Valor dos seus terrenos, quem é vizinho e o estágio do bairro (2012+) → `lotValue33`, `neighbourOf33`,
  `districtStage33`.
- Abrir loja própria (2012+) → `openShop33`, `shopLock33`.

### Saúde (2014+)
- Estresse, saúde e sono (2014+) → `vida33`, `stressDot33`, `frail33`.
- Marcar médico ou reabilitação (2014+) → `treatOwner33` (hospital da INT-2).
- Doar e abrir fundação (2014+) → `donate33`, `foundFoundation33` (reputação pessoal).

### Fã-clube (2007+; site no PC 1995+)
- Ver os motivos e as facções dos fãs (2007+) → `fans18`, `factions18`.
- Equipe e fornecedor do fã-clube (2007+) → `setTeam18`, `setSupplier18`.
- Merch: fazer lote, licenciar, combater pirata (2007+) → `makeBatch`, `toggleLicense`, `toggleFight`.

### Só no computador
- **Planilha** (1982+): livro-caixa (`finance`, `balanceSheet`); previsão de vendas com aprendizados (`calib33`,
  `lessons31`); a partir de 2032, a previsão chega quase no exato (`learnWidth33`).
- **Contratos** (1982+): pacotes e cláusulas (`pkg18`, `clausesOf`), direitos e sociedades (`r18`, `socOptions18`),
  pedidos de sampling (`answerReq33`) e processos (`resolveCase33`, `registerLegalCase33`).
- **Relatórios** (1982+): relatórios dos diretores e modo de delegação (`respView31`, `setMode31`, `setDir31`); diretor de
  imprensa, jurídico e RH (`pressPick33`, `legalPick33`, `peoplePick33`).
- **E-mail** (1995+): a caixa (`inbox18`).
- **Site e fã-clube** (1995+): ver o Fã-clube acima.
- **Editor de áudio** (1995+): demo caseira (`startCompose27`, `playRound27`, `finishCompose27` em modo "caseiro", 1
  bolinha) → mandar à rádio (`pitchRadio18`).
- **Fórum e P2P** (1999–2010): ver o quanto se perde com pirataria (`pirateLoss31`); denunciar no cartório (processo) ou
  deixar passar.
- **Demos online** (2003+): perfis com 4 músicas (2003–10) e produtores de quarto (2009+) → `dig18('myspace')`,
  `dig18('soundcloud')`.
- **Loja online** (2003+): vender CD, vinil e merch direto ao fã → `merch17` (`canSell`, `unitPrice`), `vitrine31`.
- **Painel do artista** (2012+): ouvintes por cidade → "montar turnê por aqui" (`cityDemand`, `planTour`); pedir playlist
  (`pitchPlaylist18`).
- **Anúncios** (2012+): campanha online por cidade → `adsync19` e mídia (`takeAd19`); outdoors do POL33.
- **IA** (2030+): demo gerada e conteúdo sintético → regra de conteúdo sintético da plataforma (`platform12`) e risco
  de fraude (`fakes19`).

## O que seria mecânica NOVA (pedir aprovação do dono antes)

Quase tudo acima só chama o que já existe. Estes pontos criam regra nova, mesmo que pequena:

| # | Mecânica | Por que vale | Liga em |
|---|---|---|---|
| 1 | **Minijogos jogáveis** (tênis, cobrinha, blocos, toque rápido, holograma) | diversão e pausa real; baixa o estresse | `stress17`, diário |
| 2 | **Toque de celular como formato** (1997–2009) | foi um mercado real enorme | ciclo de formatos (`formats33`) |
| 3 | **Demo caseira** (gravar sem estúdio: barata e fraca) | porta para artista pobre e para teste | `compose27` em modo novo |
| 4 | **Live e post nas redes** com ganho próprio de fãs e hype | hoje o hype vem só de alavancas do lançamento | `addHype`, `fansMonth18` |
| 5 | **Curtir em Encontros** (interesse antes de chamar para sair) | deixa o app de arrastar diferente do "chamar" direto | camada sobre `askOdds31` |
| 6 | **Ligação cara por minuto** (1983–96) e **chamada de vídeo/holograma** valendo mais na relação | dá peso à época | `shiftTie31` |
| 7 | **Assistente de IA** que responde por você (2032+) e às vezes erra | tempo livre × risco | `inbox18`, `openCrisis27` |
| 8 | **Denunciar pirataria** no fórum/P2P (processo no cartório) | dá ação à perda que hoje só aparece | `pirateLoss31`, cartório da INT-2 |

Ideias novas que combinam com os aparelhos, para o dono decidir:

| # | Mecânica | Desde | O quê | Liga em |
|---|---|---|---|---|
| 9 | **Assinatura de fãs** | 2013 | fãs pagam por mês por conteúdo exclusivo; renda pequena e estável; depende da lealdade | `fans18` |
| 10 | **Viralizar um trecho** | 2018 | post com um trecho do refrão pode estourar antes do lançamento e puxar o single | `trends17`, memes do MUNDO, `planRollout` |
| 11 | **Vazamento do álbum** | 1999 | disco aparece no P2P ou na rede antes da hora; escolher entre lançar às pressas, processar ou usar a seu favor | o vazamento que já existe em eventos (`events_more11`) vira ação |
| 12 | **Cambistas e preço dinâmico** | 2012 | ingressos revendidos caro; decidir preço dinâmico (mais dinheiro × fã irritado) | `ticketShock18`, cambistas de `fans18` |
| 13 | **Golpe e invasão de conta** | 2010 | conta do artista hackeada posta besteira; segurança digital custa | `addRep33`, escândalo |
| 14 | **Deepfake de voz** | 2023 | música falsa com a voz do seu artista circula; derrubar ou licenciar | `fakes19`, `ai18` |

## Antes do celular e do computador

Sem botão (antes de 1983) e sem PC (antes de 1982), as mesmas funções continuam nos objetos de sempre (telefone de
mesa, jornal, rádio, livro-caixa). Compras antes da internet: "Catálogo pelo correio" na mesa (1889+), que usa a
mesma compra a distância (`decoshop31`), com prazo de semanas.

## Teste (`r33-aparelhos`)

- Toda ação aponta para uma função que existe (teste importa o nome).
- Para cada uma das 5 versões de cada aparelho, a lista de apps e de ações bate com a tabela.
- App some quando o sistema está desligado; ação cinza mostra o motivo do bloqueio.
- Assistir a um vídeo gera o mesmo lead de `dig18`; comprar pelo app chama a compra a distância.
- Cobrinha: lógica pura (passo, colisão, comida), com seed fixa.
- Encontros nunca mostra a família Fossati nem menores.

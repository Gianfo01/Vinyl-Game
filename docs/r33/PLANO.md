# Masters: Music Industry Tycoon · versão 33 — plano

Pedido do dono (2026-10-17): tudo o que saiu da conversa de ideias (mecânicas soltas, prédios com interior, conexões
de vida real) vai para a 33. Começa quando o TUT (tutorial EXP-12) e o QA5 da onda 5 estiverem juntos e a build
`Masters_32.html` tiver sido enviada.

Regras de sempre: estilo pixel antigo, sem emoji, nada flutuando, sem placeholder, sem selo "simulado"; família
Fossati sempre presente, não envelhece nem morre (Sonia só se aposenta), nunca romance; foco PC; toda tela no padrão
dos mocks aprovados; EXP-13 (ações no objeto, o mínimo de telas). Cada mecânica nova atrás de um interruptor próprio
(`exp33.*`); goldens só mudam com explicação no teste e em DECISOES.

TESTES MÍNIMOS (dono, 2026-10-17 — o QA completo fica para o fim): cada frente roda só `tsc` e o PRÓPRIO teste
novo (um arquivo, poucos casos, sem rodar jogo longo). Nada de suíte, goldens ou fumaça dentro da frente; prints só nas
frentes de arte (INT-1, INT-2, MAPA33), um por lugar novo. Na junção o coordenador roda tsc + o teste da frente +
uiwords; os goldens (r27-p2a, r27-p2b, r27-m3, r16-playbot) só nas frentes que mexem na simulação (VIDA, CIDADE,
CATÁLOGO, GESTÃO, PESSOAS, MUNDO), e se mudarem fica anotado para o QA33 conferir.

## Regras de pixel art (valem para TODO objeto, prédio, interior, fachada e peça nova da 33)
Seguir o padrão atual do jogo (`docs/r31/onda5-arte.md`, sede `hqpx27`/`salas31px`, interiores `props31`/`inside31`,
prédios `pred31px`, decoração `deco31px`, objetos `exp5px`):
- **Desenhado por código** em `Px` (`src/ui/pixel/px`), sem imagem externa, sem emoji, sem texto de sistema por cima;
  letras só na fonte do jogo (`pixel/font`, `drawTextOutlined`), sem acento.
- **Luz de cima à esquerda**, sombra arroxeada, **contorno escuro quente** (INK) via `inked()`, tons por `lv()`
  (rampa de ~6 tons por material); luz (cones, halos, telas acesas) numa camada própria, sem contorno.
- **Paleta da época** pelas 6 faixas `ep5Of` (1889–1919, 1920–49, 1950–69, 1970–89, 1990–2009, 2010–2040): o mesmo
  objeto muda de forma e material com a época (ex.: rádio de válvula → transistor → smart speaker).
- **Escala** dos pixels lógicos da sede: boneco 24×34, porta 22×38, mesa na cintura (26), objetos pequenos cabem
  sobre a mesa; fachada do prédio na grade e altura de `pred31px`, letreiro sem sobrepor (regra do POL2).
- **Estados** de objeto clicável: `idle`, `new` (selo "!"), `lit` (anel dourado), como em `obj5Px`; tudo que é clicável
  abre o cartão de ações (ACOES5), não uma tela nova.
- **Nada flutuando** (tudo apoiado no chão, na parede ou na mesa), **nada de placeholder** (bloco de uma cor, caixa
  vazia, "TODO"), nada cortado; animação leve e respeitando "movimento reduzido".
- **Teste**: cada peça nova entra num teste do tipo `r31-exp5-art` (desenha no tamanho certo, épocas e estados
  diferentes entre si, nenhum bloco de uma cor só) e numa galeria com print para aprovação.
- Bonecos de artistas reais: skill `masters-artist-sprites`.

## Frentes

| Frente | O quê | Dono dos arquivos (principal) |
|---|---|---|
| **VIDA** | (1) saúde/estresse do dono passam a pesar: estresse alto tira 1 bolinha pessoal, saúde baixa piora gravação e negociação, férias/médico recuperam; (9) paparazzi na mansão ligado com muro/segurança; rotina leve (sono, viagens, hobby); reputação pessoal separada da empresa (escândalo × caridade/fundação); filhos que herdam talento/interesse (Fossati intocados) | sim/sys/people/owner, life, heirs8 |
| **CIDADE** | (2) lojas da época mexem nas vendas do formato na cidade; abrir loja própria = canal de venda; (3) imóveis em outras cidades viram base de turnê (hospedagem, cansaço, escritório regional para A&R); (4) terrenos valorizam, vendem e alugam, lote vizinho dá parceria; bairros que mudam (boêmio → moda → caro); cenas locais por época (Seattle grunge, Memphis rock, Rio bossa) | lots31, city31, biz31, tours (só leitura de custo) |
| **CATÁLOGO** | (5) relíquias com efeito musical pequeno + imprensa, entram em leilão e como garantia; sampling e regravação (liberar rende, negar pode virar processo); catálogo que reaparece (filme, novela, comercial, TikTok — liga a pop31 e vitrine); royalties em cadeia (compositor, editora, intérprete, produtor); ciclos de formato (vinil morre e volta, CD morre) | relics, rights18, sealed31, auction31, pop31 |
| **GESTÃO** | (6) aprendizados (learn31) melhoram previsão de vendas e as escolhas dos diretores; (7) diretores de imprensa/crises, jurídico e equipe/RH; (10) robôs usam jabá, leilões, lotes/casas e vitrine | learn31, deleg31, bots |
| **PESSOAS** | ego e química na banda (solo pode romper; negociar "dar um tempo"); mentor e aprendiz; turnê de abertura (novato ganha fãs, veterano ganha frescor); ciclo de vida do artista (auge, declínio, volta, despedida, homenagem póstuma com o catálogo disparando) | acts, people, tours (abertura) |
| **MUNDO** | crises econômicas reais (1929, 1973, 2008, 2020) em shows, crédito e vendas; censura e política (ditadura no Brasil, selo de aviso dos pais nos EUA; metáfora × exílio/fama); (8) memes e bolhas com efeito econômico | events, pop31, rollout |
| **INT-1** (arte + ações) | interiores próprios dos prédios que hoje emprestam outro: escola de música, fábrica de discos (prensa por época, custo/defeito, prensar para terceiros), museu (relíquias, discos de ouro, ingresso), plataforma (servidores, curadoria), agência e filial; ações no lugar para hotel, escritório, apartamentos e sede rival | inside31, place27, pred31 (só estes tipos) |
| **INT-2** (arte + ações) | prédios novos com interior: banco (empréstimo, catálogo como garantia, crises de crédito), cartório/tribunal (plágio, rescisão, direitos), hospital/reabilitação (vício, burnout, sua saúde), estádio, clube de jazz e boate por época, igreja/coral, estúdio de TV e cinema (programas de calouros/auditório por época, trilhas), agência de publicidade (jingles, sincronização), escola de samba (Rio, Carnaval), gráfica/estúdio de arte (capa pesa no físico), rádio pirata/garagem (submundo), estação de trem e porto (viagem antes do avião); interiores simples das lojas da época; **terreno do festival com cena própria** (decisão do dono, QA5) | novos arquivos r33/, city31 (registro dos tipos) |

| **MAPA33** | expandir a cidade quando faltar lote para os prédios novos, seguindo as regras atuais (geografia real do GEO, lotes do LOTE, arte por tipo do PRED, letreiros sem sobrepor do POL2, zoom e cartão do MAPA/ACOES5): bairros novos na borda ou adensamento, sem mudar o que já existe; cada tipo novo ganha lote coerente (estádio na periferia, banco no centro, porto só em cidade com água, escola de samba só no Rio) | city31, lots31, geo/layout da cidade |

INT-1/INT-2 desenham os lugares e expõem ganchos; as regras de banco, hospital, cartório e fábrica que mexem em
dinheiro e pessoas ficam com GESTÃO/VIDA/CATÁLOGO (combinar pelo gancho, sem editar o arquivo do outro).

## Fechamento da 33 (depois que todas as frentes estiverem juntas)
| Frente | O quê | Modelo |
|---|---|---|
| **QA33** | suíte inteira e goldens re-medidos com explicação; robô jogando 1889→2040 em várias carreiras com todos os `exp33.*` ligados; abrir cada prédio e interior novo; save/load com o estado novo; consertar tudo que quebrar (sem desligar teste); relatório com o que ficou | Opus |
| **POL33** | polimento visual depois do QA (inclui: interiores antigos pequenos com vazio em volta, achado do QA5; terreno do festival da INT-2 aparece dentro de uma moldura de prédio com teto — virar campo aberto com céu, palco grande e plateia em campo): varrer telas, cenas e interiores novos em 1962 e 2025 (e 1889/2035 nos novos), textos cortados ou sobrepostos, padrão pixel, letreiros, cartão de ações; prints antes/depois | Sonnet |

Pedidos do dono para o POL33 (2026-10-17, vistos no mapa de Londres 1962):
- **Outdoors**: hoje poucos e amontoados no centro. Espalhar pela cidade (avenidas, esquinas, estação, estádio,
  beira-rio, periferia), sem sobrepor letreiro (regra POL2), e criar mais. Cada outdoor é objeto clicável (ACOES5):
  **alugar** por meses (preço pelo movimento do bairro e da época) para anunciar disco/turnê/artista — dá hype e
  vendas na cidade; **comprar** o outdoor para ter renda alugando a terceiros (rivais também alugam); arte por época
  (cartaz pintado/lambe-lambe → painel iluminado → luminoso de neon → telão de LED → holograma 2030+). Interruptor
  `exp33.outdoors`, ligado por padrão.
- **Merch e itens exclusivos**: no festival e em outros lugares (estádio, clube de jazz, boate, museu, show de
  artista, aeroporto/loja de souvenir, leilão), comprar ou ganhar merch e itens exclusivos usando o MESMO sistema das
  relíquias (`relic31`/`relic33`: raridade, valor que muda, vitrine, leilão, garantia no banco, efeito pequeno). Itens
  por época (lista no relatório do coordenador): camiseta de turnê, pôster autografado, pulseira/ingresso de festival,
  baqueta e palheta de show, setlist do palco, passe de backstage, fita/vinil de edição limitada, jaqueta de equipe,
  bilhete de festival histórico (Woodstock 69, Rock in Rio 85, Live Aid 85), boneco/brinquedo de artista. Interruptor
  `exp33.merch`, ligado por padrão. Cada artista grande também tem uma peça própria (guitarra quebrada no palco,
  figurino de clipe) que dá notícia na imprensa ao ser comprada.
- **Mais 6 ideias aprovadas pelo dono** (mesmo interruptor `exp33.merch`, exceto a 4, que fica em `exp33.outdoors`):
  1. **Marca própria de merch**: abrir uma linha do selo ou do artista; vende mais quando o artista está em alta.
  2. **Banca de merch no show**: escolher quanto levar na turnê; se sobrar fica encalhado, se faltar perde venda.
  3. **Pirataria de merch**: camisetas falsificadas perto de shows grandes; denunciar no cartório ou deixar passar.
  4. **Anúncio pago na rádio e na TV**: além do outdoor, comprar o intervalo da rádio/TV, por época.
  5. **Vitrine para a rua**: disco ou relíquia exposto na fachada da sua loja/sede dá um pouco de movimento ao bairro.
  6. **Colecionadores rivais**: NPCs que disputam o mesmo item no leilão e às vezes oferecem compra direta.

Ordem: frentes → junção → QA33 → POL33 → build `Masters_33.html` + fumaça → enviar ao dono.

## Fica para a onda 6 (fechamento), não para a 33
(11) começar tarde rende pouco (meta 3× × hoje ~1,1×) e o padrão de cada interruptor; metas e fim de jogo num motor
só; save do estado novo; acessibilidade; apagar telas antigas; gênero infantil (adiado em "M · estilos por época").

## Modelo por frente (dono, 2026-10-17: usar modelos mais baratos onde der)
- **Opus** (regras que mexem em dinheiro, pessoas e goldens, mais risco): CATÁLOGO, PESSOAS, GESTÃO.
- **Sonnet** (mais barato): VIDA, CIDADE, MUNDO, INT-1, INT-2, MAPA33.
- Haiku fica de fora: o código é grande demais para ele seguir as regras do projeto sem retrabalho.
Se uma frente em Sonnet travar ou sair do padrão, a correção vai para uma sessão Opus curta, só com o que faltou.

# Masters: Music Industry Tycoon · versão 33 — plano

Pedido do dono (2026-10-17): tudo o que saiu da conversa de ideias (mecânicas soltas, prédios com interior, conexões
de vida real) vai para a 33. Começa quando o TUT (tutorial EXP-12) e o QA5 da onda 5 estiverem juntos e a build
`Masters_32.html` tiver sido enviada.

Regras de sempre: estilo pixel antigo, sem emoji, nada flutuando, sem placeholder, sem selo "simulado"; família
Fossati sempre presente, não envelhece nem morre (Sonia só se aposenta), nunca romance; foco PC; toda tela no padrão
dos mocks aprovados; EXP-13 (ações no objeto, o mínimo de telas). Cada mecânica nova atrás de um interruptor próprio
(`exp33.*`); goldens só mudam com explicação no teste e em DECISOES. TESTES LEVES: tsc, testes do tema, goldens
r27-p2a, r27-p2b, r27-m3, r16-playbot e fumaça.

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
| **INT-2** (arte + ações) | prédios novos com interior: banco (empréstimo, catálogo como garantia, crises de crédito), cartório/tribunal (plágio, rescisão, direitos), hospital/reabilitação (vício, burnout, sua saúde), estádio, clube de jazz e boate por época, igreja/coral, estúdio de TV e cinema (programas de calouros/auditório por época, trilhas), agência de publicidade (jingles, sincronização), escola de samba (Rio, Carnaval), gráfica/estúdio de arte (capa pesa no físico), rádio pirata/garagem (submundo), estação de trem e porto (viagem antes do avião); interiores simples das lojas da época | novos arquivos r33/, city31 (registro dos tipos) |

INT-1/INT-2 desenham os lugares e expõem ganchos; as regras de banco, hospital, cartório e fábrica que mexem em
dinheiro e pessoas ficam com GESTÃO/VIDA/CATÁLOGO (combinar pelo gancho, sem editar o arquivo do outro).

## Fica para a onda 6 (fechamento), não para a 33
(11) começar tarde rende pouco (meta 3× × hoje ~1,1×) e o padrão de cada interruptor; metas e fim de jogo num motor
só; save do estado novo; acessibilidade; apagar telas antigas; gênero infantil (adiado em "M · estilos por época").

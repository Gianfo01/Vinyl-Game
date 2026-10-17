# CENARIOS33 — lugares, interiores, objetos e gente inspirados em filmes e séries

Pedido do dono (17/10): prédios com interiores, objetos e NPCs **inspirados** em filmes e séries, um **cassino com
mecânicas**, e frentes que **liguem tudo** — coisas novas que se conectem às que existem e ligações entre as que já
existem. Frente própria, depois do POL33 (não atrasa a 33).

## Regras

- **Inspirar, não copiar:** nome trocado (naming19), sem logo, sem rosto de ator, forma mudada. Quem conhece pega
  a piada; quem não conhece vê só um lugar bom do jogo.
- **Mesma arte do resto do jogo** (interior27, props, cine18). Sem emoji, nada flutuando, sem placeholder.
- **Nada de regra paralela:** cada lugar é um **lote com função** no registro único (lots31) e cada ação chama uma
  função que já existe. Coisa nova só quando liga duas ou mais coisas que já existem.
- **Ação no objeto (EXP-13):** um verbo principal por lugar, no próprio prédio/interior.
- **Época e país:** cada lugar só aparece quando faz sentido (abaixo).
- **Interruptores:** `exp33.cenarios.lugares`, `exp33.cenarios.cassino`, `exp33.cenarios.servicos`,
  `exp33.cenarios.negocios` (ligados por padrão depois do teste, como os exp33.*).
- Fossati continuam fora de romance; temas pesados (crime, drogas, morte) só como risco, multa e escândalo, sem
  violência explícita — dentro do submundo que já existe (crime17/under31/heist27/mob29).

## 1. Onde cada coisa entra no jogo

| Peça | Sistema que já existe | O que muda |
|---|---|---|
| Prédio | `lots31` (lote com função), `cidade33` (terreno, loja, aluguel), `hood19` (vizinhos, bairro) | novo **tipo de lote** com época/país; compra e aluguel pelos fluxos de lote |
| Interior | `interior27` (props por tipo), `place27` | novo conjunto de props por lugar |
| NPC | `gente31` (trabalho, ciclo bartender↔artista), GENTE33 (pessoas fixas e camadas), `leisure14` (pontos de encontro) | o dono/frequentador do lugar vira **pessoa fixa** com camada completa |
| Objeto | `relic31`/`relic33`, `decoshop31`, `items31`, `under31` (mercado negro) | objeto comprável/relíquia com efeito pequeno e dono registrado |
| Cena | `cine18`, `night27`, `show27` | storyboards curtos no lugar |
| Notícia | `facts17` → REDES33 e Jornal | toda visita/acontecimento relevante vira fato |

## 2. Lugares (inspiração → lugar no jogo → época → verbo → sistema)

**Filmes**
| Inspiração | Lugar | Época | Verbo | Liga com |
|---|---|---|---|---|
| De Volta para o Futuro / Grease | lanchonete com jukebox e pista | 1950–65 | baile e concurso de talento | discover18, night27 |
| Mad Men | agência de publicidade | 1958–75 | contratar anúncio rádio/TV, outdoor | adsync19, outdoors do POL33 |
| O Grande Gatsby | mansão de festas | 1920–30 e retorno | festa de gala | board27, bolsa10, favors27 |
| O Iluminado | hotel isolado na serra | qualquer | retiro de composição | compose27, stress17 |
| Blues Brothers | bar de estrada com tela no palco | 1970–90 | show difícil | show27, crime17 (confusão) |
| Cheers | bar onde todos sabem seu nome | 1980–95 | balcão do ciclo bartender↔artista | gente31 |
| Stranger Things | fliperama | 1978–92 | minijogos, público jovem | APARELHOS33 jogos, audience8 |
| Friends | café com sofá | 1994–2005 | noite acústica | night27, discover18 |
| Alta Fidelidade | loja de discos | 1970–2010 | compra/venda de vinil | relic31, colecionadores rivais (POL33) |
| Blade Runner | prédio neon na chuva | 2030+ | holograma, voz de IA | ai18, deepfake de voz |
| Quase Famosos | ônibus de turnê (interior) | 1965+ | eventos de estrada | tour12, road27 |

**Séries**
| Inspiração | Lugar | Época | Verbo | NPC | Liga com |
|---|---|---|---|---|---|
| Breaking Bad | lava-carros de fachada | 1990+ | lavar dinheiro | professor químico | crime17.toggleLaunder, under31 |
| Better Call Saul | advogado nos fundos de um salão de manicure | 1980+ | resolver caso barato e arriscado | advogado espalhafatoso | under31.lawyer31, caseWay31, contracts18, rights18; outdoor dele no mapa |
| Sopranos | clube na estrada e açougue | 1980–2010 | pagar/recusar proteção | chefão em terapia | mob29 favores, under31 fachada |
| Boardwalk Empire | cassino-hotel no calçadão | 1920–33 (EUA) | bar clandestino na Lei Seca | tesoureiro político | crime17, license17 |
| Mr. Robot | fliperama abandonado (QG hacker) | 2005+ | contratar hacker | hacker solitário | conta hackeada, vazamento, denúncia de pirataria (APARELHOS33) |
| Lost | escotilha com computador | evento raro | retiro isolado / avião da turnê cai | homem dos números | tour12, compose27 |
| Dexter | laboratório forense da polícia, barco | 1990+ | investigar/encobrir | analista forense com segredo | crime17.forensic, scandal17 |
| Californication | casa de praia, carro velho | 1990+ | escrever letras | escritor em crise | compose27, amor31 (escândalo) |
| Entourage | mansão em Hollywood | 1995+ | levar a turma | agente agressivo, amigos do astro | equipe pessoal (GENTE33), sync15, cine |
| House | hospital universitário | 1950+ | diagnóstico raro | médico genial e grosso | saúde/vices (rehab), Encontros (médicos, enfermeiras) |
| How I Met Your Mother | bar embaixo do apartamento | 2000+ | mesa cativa | solteiro de terno | leisure14, Encontros |
| How to Make It in America | ateliê de roupas | 2005+ | coleção de merch própria | dupla de amigos | merch17, marca própria (POL33) |
| Studio 60 | teatro de humor ao vivo | 1975+ | tocar ao vivo na TV | produtor em guerra com a emissora | tv18, media19 |
| The Americans | casa de subúrbio com garagem secreta | 1947–91 | espionagem | casal de espiões vizinhos | rivalmind18, secrets23 |
| Atlanta | estúdio caseiro e barbearia | 2005+ | descobrir rapper local | rapper e primo empresário | discover18, demo caseira |
| The Bear | lanchonete que vira restaurante | 1990+ | jantar de negócios / restaurante próprio | chef estressado | nego27, ventures12, gente31 |

## 3. O CASSINO (núcleo que liga palco, dinheiro, vício, crime e poder)

Hoje: o cassino existe como **fachada de facção** (`under31`, com props em `interior27`) e como **residência de
veterano** (`live/venue.ts`: residencyEligible/residencyNight/startResidency). A proposta junta tudo num lugar só,
com época e país:

| Época / país | Como aparece |
|---|---|
| 1920–33 EUA | cassino-hotel do calçadão + bar clandestino (Lei Seca) |
| 1933–46 Brasil | grandes cassinos com palco para cantores de rádio |
| 1946 Brasil | jogo proibido: os cassinos fecham e viram clandestinos (vira fachada do under31) |
| 1946+ EUA (Vegas), Mônaco, Macau | cassino legal com palco e residência |
| 2010+ | apostas no celular (APARELHOS33) e patrocínio de bets |

**Mecânicas do cassino** (todas usando o que já existe):

1. **Palco e residência:** contrato de temporada (pagamento fixo + parte do bar) pelo `startResidency`; agora também
   para artista em alta, não só veterano. Casino da época de rádio lança cantor (fama, discover18).
2. **Mesa de jogo do personagem:** jogar como vício igual a bebida/drogas em `vices.ts` (traço "Jogador",
   dependência, recaída). Ganhar dá dinheiro rápido; perder gera **dívida de jogo**.
3. **Dívida e agiota:** dívida não paga vira favor devido à facção (mob29/under31): tocar no baile, emprestar o
   estúdio, assinar artista indicado. Saída: pagar, negociar (favors27), denunciar (denounce31) com risco.
4. **Artista seu que joga:** dívida de artista vira pedido de adiantamento (bandpay19), escândalo (scandal17) ou
   saída do selo; "tratar o vício" igual ao rehab.
5. **Lavagem:** comprar o cassino (ou o lava-carros) como **fachada própria** (lots31 + crime17.toggleLaunder):
   lava dinheiro do submundo, mas aumenta o calor (addHeat) e o risco de investigação (forensic, Dexter).
6. **Apostas da indústria:** a casa de apostas aceita palpites em parada, prêmio e programa de talentos (charts7,
   awards, tv18). Informação de dentro (favors27, secrets23) aumenta a chance — e a chance de escândalo de
   manipulação, como o voto comprado do tv18.
7. **A baleia:** apostador rico frequentador vira investidor (bolsa10/board27) ou membro do conselho (GENTE33).
8. **Golpe no cofre:** o cofre do cassino vira alvo de operação (heist27), com equipe, traição e encobrimento.
9. **Patrocínio de bets (2018+):** dinheiro alto por campanha; fãs jovens e imprensa reagem (fans18, press18);
   regra por país (proibição e regulamentação viram fato público).

## 4. "Quem resolve" — serviços dos NPCs inspirados

Os NPCs fixos viram **serviços** pagos com dinheiro ou favor (favors27), cada um ligado a um sistema:

| NPC | Serviço | Sistema |
|---|---|---|
| advogado espalhafatoso | caso barato, chance de dar errado; fiança | under31.lawyer31/bail31, caseWay31, contracts18 |
| médico genial | salvar artista doente, diagnóstico raro | vices (saúde), life |
| hacker | rastrear pirataria, recuperar conta, vazar o rival (risco) | piracy (APARELHOS33), crime17 cyber |
| analista forense | descobrir quem vazou / sumir com indício (risco alto) | crime17.forensic, scandal17 |
| agente de Hollywood | trilha de filme/série para o artista | sync15, cine18 |
| produtor de TV | vaga ao vivo (visibilidade + chance de gafe) | tv18, media19 |
| espiões vizinhos | informação sobre a próxima jogada do rival | rivalmind18, secrets23 |
| chef | jantar de negociação (melhora a chance na mesa) | nego27, odds19 |
| tesoureiro político | licença, alvará, vista grossa | license17, corruption |
| chefão | proteção das casas de show | mob29 |
| escritor em crise | parceria de letra | compose27 |

Cada serviço gera **laço** (gente31/social31) e **fato** (facts17) — a pessoa lembra e cobra.

## 5. Negócios paralelos (novos, sobre o que existe)

- **Restaurante próprio** (The Bear), **bar próprio** (Cheers/HIMYM), **ateliê de roupa** (How to Make It),
  **lava-carros** (Breaking Bad): comprados em lote (lots31/cidade33), rendem por mês, empregam gente da cidade
  (gente31 — o ciclo bartender↔artista acontece *no seu bar*), viram palco de cena e de descoberta.
- Base: `ventures12` (negócios do jogador) + `cidade33` (loja/aluguel). Um negócio ruim fecha, um bom vira
  ponto de encontro (leisure14) e entra no mapa de quem frequenta.

## 6. Ligações entre o que JÁ existe (sem nada novo)

- **Mural de ligações** (under31.mural31) passa a mostrar também lugares: quem frequenta, quem é dono, quem deve.
- **Pontos de encontro** (leisure14) usam os lugares novos: romances, rixas e parcerias nascem no bar, no café, no
  cassino.
- **Outdoors** (POL33) mostram anúncios dos lugares (o advogado, o cassino, o restaurante) e os seus.
- **Sync** (sync15): séries e filmes do mundo do jogo pedem música; o agente e o produtor de TV trazem esses pedidos.
- **Noite de olheiro** (night27) passa pelos lugares novos conforme a época.
- **Redes e Jornal** (REDES33): o que acontece nos lugares vira post e manchete, e muda reputação.
- **Celular/PC** (APARELHOS33): ligar para os "quem resolve", app de apostas (2010+), reservar mesa.

## 7. Divisão em duas levas (decisão do dono, 17/10)

Tudo de uma vez seria pesado demais (arte de ~27 interiores, 15 minijogos, mecânicas novas de dinheiro mexendo no
equilíbrio). Fica em duas levas; a leva 2 aproveita o que a leva 1 deixar pronto (motor de minijogos, lotes,
pessoas fixas, cassino).

**LEVA 1 (versão 34)** — duas frentes do tamanho das da 33:

| Frente | Escopo | Simulação |
|---|---|---|
| CENARIOS34-A (lugares) | 10 lugares com interior, NPC fixo e objetos: cassino, bar (Cheers/HIMYM), café (Friends), loja de discos (Alta Fidelidade), lanchonete com jukebox, fliperama, advogado (Saul), hospital (House), restaurante (The Bear), QG hacker (Mr. Robot); todos os objetos/relíquias da seção 2 | pouco (lotes e pessoas fixas); goldens podem mudar com explicação |
| CENARIOS34-B (cassino e serviços) | cassino: residência, vício em jogo, dívida com agiota, a baleia; 6 "quem resolve": advogado, médico, hacker, agente, chef, chefão; 5 minijogos simples: blackjack, caça-níquel, roleta, jukebox, karaokê | sim; goldens re-medidos com explicação; robôs QA |

**LEVA 2 (depois)**
- Lugares restantes: Sopranos, Boardwalk Empire, Breaking Bad, Dexter, The Americans, Lost, Entourage,
  Californication, How to Make It, Studio 60, Atlanta, Gatsby, O Iluminado, Blues Brothers, Mad Men, Blade Runner,
  ônibus de turnê.
- Minijogos difíceis: pôquer com NPCs, sinuca, dardos, dados, corrida de cavalos, bingo, pinball, cozinha sob
  pressão, ritmo no palco.
- Mecânicas: lavagem com fachada própria, apostas da indústria, golpe no cofre, patrocínio de bets, artista seu que
  joga.
- "Quem resolve" restantes: forense, produtor de TV, espiões, político, escritor.
- Negócios paralelos próprios (seção 5) e ligações da seção 6.

Ordem: 33 sai → GENTE33-B (as camadas de pessoas) → CENARIOS34-A → CENARIOS34-B → leva 2.
Testes: `r34-cenarios` (cada lugar só na época/país certos; cada verbo chama a função existente; dívida e minijogos
com Rng fixo; chance mostrada = chance sorteada) + uiwords + goldens.

## 8. Minijogos do cassino e dos lugares

Mesmo motor de minijogos do APARELHOS33 (a cobrinha), na arte do jogo, curtos (30 s a 2 min), sempre opcionais
(dá para "resolver rápido" com o resultado sorteado pelas mesmas chances). O dinheiro sai do caixa pessoal; quem
joga muito ganha o traço "Jogador" (vices). Sorte própria por partida (Rng.fromSeed('cas33|…')).

| Minijogo | Onde / época | Como joga | Liga com |
|---|---|---|---|
| Blackjack | cassino, 1930+ | pedir/parar/dobrar contra a banca; a banca segue regra fixa | dívida, agiota, baleia (sentar na mesa dele = conversa de investimento) |
| Caça-níquel | cassino 1900+; vídeo-pôquer 1975+; app 2010+ | alavanca de 3 rolos com símbolos da época (frutas → discos → ícones de app) | vício, patrocínio de bets |
| Roleta | cassino, qualquer época | apostar em número, cor ou faixa | apostas grandes chamam atenção (calor, imprensa) |
| Pôquer | sala dos fundos (under31) | mão contra NPCs com personalidade (temper/persona: blefa, foge, aposta alto) | ganhar = favor ou informação; perder = dívida com a facção |
| Dados (craps) | calçadão anos 20, bar clandestino | rolar e manter o ponto | Lei Seca, polícia pode chegar (crime17) |
| Bingo | salão de igreja/clube, 1930+ | cartela com sorteio | público mais velho, show beneficente (charity19) |
| Pinball e fliperama | fliperama 1970–95 | máquinas da época, recorde fica no placar com seu nome | público jovem; artistas frequentadores (leisure14) |
| Jukebox | lanchonete 1950+ | escolher a música e ver a pista reagir | qual faixa sua toca mais (tração local, charts) |
| Karaokê | bar 1985+ | acertar o tempo das notas | descobrir talento (o frequentador que canta bem) |
| Sinuca | bar de estrada | mesa vista de cima, tacada com força e ângulo | aposta contra NPC; ganhar respeito = laço |
| Dardos | bar do bairro | mira que treme (mais se bebeu) | laço com o dono do bar |
| Corrida de cavalos / galgos | hipódromo, 1900+ | escolher e torcer | apostas da indústria (o mesmo painel), baleia |
| Bolsa de apostas da indústria | cassino/app | apostar em parada, prêmio, programa de talentos | charts7, awards, tv18; informação de dentro = risco de escândalo |
| Cozinha sob pressão | restaurante (The Bear) | montar pratos na ordem antes do tempo | jantar de negócios melhora a negociação (nego27) |
| Ritmo no palco | casa de shows | apertar no tempo da batida | nota do show (show27) — só se o jogador quiser tocar |

Regras: nada de dinheiro real nem compra no jogo; ganhar demais no mesmo cassino faz a casa te barrar; as chances
aparecem na tela (odds19) e são as mesmas do sorteio.

## 9. LEVA 1 detalhada (versão 34) — o que cada frente faz e onde encaixa

Decisão do dono (17/10): POL33 cancelado; a 33 sai sem polimento; seguimos com a leva 1 (e talvez a 2) e o
polimento vem depois de tudo. Base técnica que a 33 já deixou pronta:
- **Lugares:** `registerSite33` (mapa33: tipo → zona, cidade, época) + o padrão do INT-2 (`src/sim/r33/int2.ts`:
  prédio novo com interior e ações que passam pelos ganchos) + `place27`/`interior27` (props) + `lots31`.
- **Pessoas:** GENTE33 (pessoas fixas, três camadas, talento escondido, ciclo bartender↔artista do gente31).
- **Minijogos:** `src/sim/r33/jogos33.ts` (motor puro com `newGame33`/`step…`, Rng por semente) + a tela do
  APARELHOS33.
- **Celular/PC:** `registerPhoneApp33`/`registerAct33` para ligar para "quem resolve" e o app de apostas (2010+).
- **Redes/Jornal:** tudo vira fato (facts17) e aparece no feed do REDES33.

### CENARIOS34-A — lugares (Opus) · interruptor `exp34.lugares`
| Lugar | Já existe parecido? | O que fazer |
|---|---|---|
| Cassino | fachada `casino` do under31 + residência do venue.ts | prédio legal próprio (1933–46 BRA; 1946+ EUA/MCO/MAC) separado da fachada; interior com mesas, palco, caixa |
| Bar (Cheers/HIMYM) | `bar` do place27 | variação "bar do bairro" com mesa cativa, dono fixo, balcão do bartender↔artista |
| Café (Friends) | — | novo tipo, 1994–2005+, noite acústica (night27) |
| Loja de discos (Alta Fidelidade) | `records` | variação com balcão de colecionador, compra/venda de vinil (relic31), colecionador rival |
| Lanchonete com jukebox | — | novo tipo, 1950–65 (e retrô depois), baile e concurso (discover18) |
| Fliperama | — | novo tipo, 1978–92 (vira QG hacker abandonado depois de 2005) |
| Escritório do advogado | — | novo tipo nos fundos de salão de manicure, 1980+; outdoor dele no mapa |
| Hospital (House) | `hospital` do INT-2 | só o NPC médico fixo e o diagnóstico raro como ação |
| Restaurante (The Bear) | — | lanchonete que vira restaurante, 1990+; jantar de negócios (nego27) |
| QG hacker (Mr. Robot) | — | fliperama abandonado, 2005+; contratar hacker |
Cada lugar: `registerSite33` + interior (props na arte do jogo) + NPC fixo (GENTE33, camada completa) + 1 verbo
principal no objeto + fato no facts17. Objetos/relíquias da seção 2 entram no relic31/decoshop31.
Testes `r34-lugares`: cada lugar só na época/país; o verbo chama a função existente; Fossati fora.

### CENARIOS34-B — cassino, serviços e minijogos (Opus) · `exp34.cassino`, `exp34.servicos`, `exp34.minijogos`
- **Cassino:** residência para artista em alta (startResidency com regra nova de elegibilidade); vício em jogo
  (traço "Jogador" em vices, com recaída e tratamento); dívida com agiota → favor devido à facção (mob29/under31);
  a baleia → investidor/conselho (bolsa10/board27/GENTE33).
- **"Quem resolve" (6):** advogado (lawyer31/bail31/caseWay31/contracts18), médico (saúde/rehab), hacker
  (pirataria/conta hackeada/vazamento do APARELHOS33), agente (sync15), chef (nego27/odds19), chefão (mob29).
  Pagos com dinheiro ou favor (favors27); criam laço e fato. Ligação pelo celular (`registerAct33`).
- **Minijogos (5), no motor do jogos33:** blackjack, caça-níquel (símbolos por época), roleta, jukebox,
  karaokê. Chance mostrada = chance sorteada (odds19); "resolver rápido" disponível; ganhar demais = barrado.
- Goldens re-medidos com explicação; robôs QA rodando 30 anos com os interruptores ligados; desempenho do mês
  antes/depois.

### Ordem e build
33 sai (QA33 + REDES33 juntadas) → CENARIOS34-A e -B em paralelo (A mexe em lugares/interiores, B em regras;
B usa os lugares de A por id, então B registra o cassino só pelo id `casino33` combinado) → junção → build
`Masters_34_previa` → decidir leva 2 → polimento geral → `Masters_34`.

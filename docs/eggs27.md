# Ovos de Páscoa (r27) — lista com spoilers

> **Spoilers.** Para o desenvolvedor. 76 ovos (31 pedidos + 45 próprios), 11 conquistas secretas.

## Arquitetura

- **Catálogo** (metadados, textos pt/en, nota histórica): `src/data/eggs27.ts` (`EGGS27`, `FEATS27`).
- **Simulação**: `src/sim/sys/eggs27.ts`, importado em `src/sim/sys/index.ts`.
  - `RULES27`: `{ id, phase: 'month' | 'show', test(s, show?), p, run(s, ctx, r) }`. Cada ovo roda uma vez por
    partida. No máximo um ovo automático por mês (ou por show).
  - Os sorteios usam um RNG próprio, `Rng.fromSeed(semente|egg27|id|semana)`, e nunca o fluxo comum. Num mundo
    sem gatilhos nada muda. Quando um ovo dispara, cria atos, ids e fatos, como qualquer acontecimento do jogo.
  - Cada ovo publica o fato `easter_egg` (consumidor próprio: diário `eg27(s).log` + conquista "Caçador de
    ovos"), uma memória, um aviso e, às vezes, uma manchete (`headline19`).
  - As escolhas passam pela caixa de entrada (`registerInboxKind('egg27')`). **O último botão é sempre o padrão
    seguro**, aplicado quando a mensagem expira.
  - As conquistas secretas entram em `ACHIEVEMENTS` (`cat: 'company'`, `hidden: true`, id `egg27:<id>`).
  - Perk: o amplificador "vai até 11" dá `showRevenue +3%` à banda dele (`registerPerkSource('eggs27')`).
  - Ganchos usados: `registerSimHook('month'|'show')`, `onFact('contest_final')` (festival da canção),
    `disc18.passed` (Decca), `fest8`/`fest12` (amanhecer), `fk19` (dublagem), `soc18.exile` (Tropicália).
  - Regras de história: com gente real, só referência histórica. A única exceção é o mundo exato, onde o ovo de
    Memphis e o da Decca apontam para o ato real (Elvis Presley, The Beatles), se ainda estiver sem selo. Nos
    outros mundos entra um ato procedural de homenagem. A maldição do baterista só vale para bandas procedurais
    e ninguém morre. Não há letras de música, só títulos.
- **Interface**: `src/ui/sys/eggs27.ts` (+ `eggs27.css`), importado em `src/ui/sys/index.ts`.
  - Funciona sozinho: o código Konami (ouvinte de teclado) e a pele temporária (classe `egg27-phono` /
    `egg27-chip` no `<body>`, sincronizada com `eg27(s).skin`).
  - Já ligado em `src/ui/app.ts` (2 linhas): `undoEgg27` no "Desfazer mês" e `eggCmds27` na busca Ctrl+K.

## Ganchos de uma linha para depois do merge

> **Ligados na integração (r27 INT):** gramofone/toca-discos do lounge com área clicável invisível (`Plan27.gramo`,
> `hq25.ts`); objetos da garagem desenhados por `drawHqCutaway27(..., { props })` na vaga `slotXY27` (dentro da porta
> na garagem; na rua, junto ao meio-fio, nas outras cascas); tremor e sprites do mapa no laço de `mapCanvas`
> (`src/ui/sys/campus18.ts`), com clique em fase de captura (o músico fica perto da porta da sede); título do quinto
> integrante no cabeçalho da ficha (`PAGE16_HEAD`, chaves `e:` e `pd:`).

Os arquivos abaixo são de outras frentes e **não** foram editados. Expõem registros puros:

1. **Sede em pixel (`src/ui/ps/hqpx27.ts`, D1)**:
   - No clique do gramofone: `hqClick27(store.game!, 'gramophone');` (import de `../sys/eggs27`).
   - Ao desenhar a garagem: `for (const f of hqPropEggs27) { const p = f(g); if (p?.slot === 'garage') p.draw(ctx, gx, gy, t); }`.
     O calhambeque ocupa 26×16 px.
2. **Mapa da cidade (`src/ui/pixel/campus18px.ts`, D2)**:
   - Em `drawFrame18` (ou no laço de quem chama), antes de desenhar: `const [dx, dy] = cityShake27(g, city, t); ctx.translate(dx, dy);`.
   - Sprites do mapa: `for (const f of cityEggs27) { const e = f(g, { t, night, city }); if (e) { e.draw(ctx, x, y, t); /* guardar a caixa [x,y,e.w,e.h] para o clique → e.onClick?.(g) */ } }`.
     O músico só aparece à noite, por volta das 3h do ciclo de `nightOf`, e na cidade-sede.
3. **Busca (`src/ui/ps/search25.ts` / `nav25.ts`, B)**: nada obrigatório, porque a paleta de `app.ts` já chama
   `eggCmds27(g, qq)`. Se a busca nova tiver outro caminho: `out.push(...eggCmds27(g, q))` ou `runEggCode27(g, q)`.
4. **Ficha da pessoa (produtor/empresário)**: `fifthTitle27(s, key)`, onde a chave é o id do produtor ou
   `'e:<id do empresário>'`, devolve "O quinto integrante de X (ano)" ou `null`.
5. **Mundo (E2)**: nenhum gancho necessário. Os ovos datados leem só `s.year`/`s.month`.

## Testes

`tests/r27-eggs.test.ts`:
- Cada regra dispara no estado montado e não dispara num estado comum.
- Inclui respostas da caixa, a caça FEX (com ajuda e sem ajuda), o festival da canção, o músico das 3h e a
  cobertura do catálogo (≥ 55 ovos, conquistas escondidas).
- Determinismo: o telhado de 1969 numa partida real.
- Raridade: bot de 2 anos com no máximo 5 ovos.
- Interface: códigos da busca, Konami, desfazer 1959.

## Lista completa

### 1. Um disco para a mãe — `memphis_1953`
- **Tipo:** simulação · **Época:** 1953–54 · **Lugar:** Memphis
- **Gatilho:** Ter sede, filial ou estúdio em Memphis em 1953–54.
- **Efeito:** Um rapaz tímido, motorista, paga para gravar um acetato "de presente para a mãe": vira uma pista de potencial altíssimo (no mundo exato, o ato real; no aleatório, uma homenagem procedural).
- **Referência real:** Julho de 1953: Elvis Presley grava "My Happiness" no Memphis Recording Service (Sun).
- *EN:* A record for his mother — A shy young driver pays to cut an acetate "as a gift for his mother": a very high potential lead (the real act in the exact world; a procedural homage otherwise).

### 2. Grupos de guitarra estão saindo de moda — `decca_1962`
- **Tipo:** simulação · **Época:** 1962 · **Lugar:** Londres / Liverpool
- **Gatilho:** Em 1962, recusar (ou deixar expirar) a audição de um grupo beat de Liverpool, ou passar a demo dele.
- **Efeito:** Manchete histórica e a conquista secreta.
- **Referência real:** 1º de janeiro de 1962: os Beatles fazem audição na Decca, que prefere outro grupo; a frase é atribuída a Dick Rowe.
- **Conquista secreta:** O homem que recusou os Beatles (`decca27`)
- *EN:* Guitar groups are on their way out — A historic headline and the secret feat.

### 3. Show no telhado — `rooftop_1969`
- **Tipo:** simulação · **Época:** jan. 1969 · **Lugar:** Londres
- **Gatilho:** Ter um ato em Londres em janeiro de 1969 e aceitar o show-surpresa no telhado.
- **Efeito:** A polícia encerra o show; fama e manchete.
- **Referência real:** 30 de janeiro de 1969: os Beatles tocam no telhado da Apple, 3 Savile Row, por cerca de 42 minutos.
- *EN:* Rooftop gig — The police shut it down; fame and headlines.

### 4. Segunda-feira de manhã — `dawn_set`
- **Tipo:** simulação · **Época:** 1969+ · **Lugar:** Festivais
- **Gatilho:** Um ato seu fecha (é o último a tocar) uma edição de festival atrasada pela chuva ou por um festival histórico.
- **Efeito:** Toca ao amanhecer para um campo quase vazio: pouco público, lenda grande.
- **Referência real:** 18 de agosto de 1969: Jimi Hendrix fecha Woodstock na segunda de manhã para uma fração do público.
- *EN:* Monday morning — Plays at dawn to a near-empty field: small crowd, big legend.

### 5. A fita pulou — `lipsync_skip`
- **Tipo:** simulação · **Época:** 1989–91 · **Lugar:** Mundo
- **Gatilho:** Em 1989–91, ter uma dupla do selo com voz-fantasma (esquema de dublagem ou faixas com cantor de estúdio).
- **Efeito:** O playback trava ao vivo; escândalo e prêmios cassados.
- **Referência real:** Julho de 1989 (Connecticut): o playback do Milli Vanilli trava; em novembro de 1990 o Grammy é cassado.
- *EN:* The tape skipped — The playback jams live; scandal and revoked awards.

### 6. Este vai até 11 — `amp11`
- **Tipo:** simulação · **Época:** 1984+ · **Lugar:** Metal
- **Gatilho:** Uma banda de metal sua recebe a oferta de um amplificador especial (raro).
- **Efeito:** Perk: +3% na receita de shows da banda.
- **Referência real:** Homenagem a This Is Spinal Tap (1984).
- **Conquista secreta:** Um a mais (`amp11`)
- *EN:* This one goes to 11 — Perk: +3% show revenue for that band.

### 7. Stonehenge em miniatura — `stonehenge`
- **Tipo:** simulação · **Época:** 1984+ · **Lugar:** Palco
- **Gatilho:** Show da banda do amplificador até 11 (raro).
- **Efeito:** O cenário chega em polegadas, não em pés: vergonha, risos e um pouquinho de culto.
- **Referência real:** Homenagem a This Is Spinal Tap (1984).
- *EN:* Miniature Stonehenge — The prop arrives in inches, not feet: embarrassment, laughs and a little cult status.

### 8. A maldição do baterista — `drummer_curse`
- **Tipo:** simulação · **Época:** qualquer · **Lugar:** Banda procedural
- **Gatilho:** Uma banda fictícia sua passa por 3 bateristas diferentes.
- **Efeito:** Lenda de bastidor (só bandas procedurais; ninguém se machuca — eles somem, viram dentistas, abrem padarias).
- **Referência real:** Homenagem a This Is Spinal Tap (1984).
- *EN:* The drummer curse — Backstage legend (procedural bands only; nobody gets hurt — they vanish, become dentists, open bakeries).

### 9. O dia em que a música morreu — `music_died`
- **Tipo:** interface · **Época:** fev. 1959 · **Lugar:** Mundo
- **Gatilho:** Clicar em "Desfazer mês" no mês de fevereiro de 1959.
- **Efeito:** Uma mensagem respeitosa no lugar do desfazer (o segundo clique desfaz normalmente).
- **Referência real:** 3 de fevereiro de 1959: Buddy Holly, Ritchie Valens e J. P. "The Big Bopper" Richardson morrem num acidente aéreo em Clear Lake, Iowa.
- *EN:* The day the music died — A respectful message instead of the undo (a second click undoes normally).

### 10. Sem M&M's marrons — `brown_mms`
- **Tipo:** simulação · **Época:** 1978–92 · **Lugar:** Turnê
- **Gatilho:** Show de uma banda de rock sua com rider exigente (raro).
- **Efeito:** Achou M&M's marrons no camarim? Você confere a estrutura (gasta um pouco, evita acidente) ou ignora (o show dá errado).
- **Referência real:** Rider do Van Halen (1982): a cláusula das M&M's marrons mostrava se o local tinha lido as exigências de segurança.
- *EN:* No brown M&M's — Found brown M&M's backstage? Check the rigging (small cost, no accident) or ignore it (the show goes wrong).

### 11. A fita sem nome — `mystery_tape`
- **Tipo:** simulação · **Época:** qualquer · **Lugar:** Caixa de entrada
- **Gatilho:** Uma demo sem nome chega pelo correio (raro). Lance o disco.
- **Efeito:** Fracasso agora; cerca de 30 anos depois vira clássico cult do outro lado do mundo.
- **Referência real:** Rodriguez, "Cold Fact" (1970): ignorado nos EUA, lenda na África do Sul (documentário "Searching for Sugar Man", 2012).
- **Conquista secreta:** Lenda do outro lado do mundo (`sugar27`)
- *EN:* The unnamed tape — A flop now; about 30 years later it becomes a cult classic on the other side of the world.

### 12. O quinto integrante — `fifth_member`
- **Tipo:** simulação · **Época:** qualquer · **Lugar:** Ficha
- **Gatilho:** Um ato seu fica enorme (fama 75+) com o mesmo produtor ou empresário.
- **Efeito:** O produtor/empresário ganha o título "O quinto integrante" na ficha.
- **Referência real:** "O quinto Beatle": Brian Epstein, George Martin e outros.
- **Conquista secreta:** O quinto integrante (`fifth27`)
- *EN:* The fifth member — The producer/manager earns the title "The fifth member" on their profile.

### 13. payola — `code_payola`
- **Tipo:** busca/teclado · **Época:** Ctrl+K · **Lugar:** Busca
- **Gatilho:** Digite "payola" (ou "jabá") na busca.
- **Efeito:** Mostra todos os boatos do mundo.
- **Referência real:** 1959–60: audiências do Congresso dos EUA sobre jabá; Alan Freed cai.
- *EN:* payola — Shows every rumor in the world.

### 14. hall da fama — `code_hall`
- **Tipo:** busca/teclado · **Época:** Ctrl+K · **Lugar:** Busca
- **Gatilho:** Digite "hall da fama".
- **Efeito:** Abre a galeria: Hall dos Ecos, ovos achados e conquistas secretas.
- *EN:* hall of fame — Opens the gallery: Hall of Echoes, eggs found and secret feats.

### 15. 1889 — `code_1889`
- **Tipo:** busca/teclado · **Época:** Ctrl+K · **Lugar:** Busca
- **Gatilho:** Digite "1889".
- **Efeito:** Visual de fonógrafo (sépia) por um mês de jogo.
- *EN:* 1889 — Phonograph (sepia) look for one game month.

### 16. lado b — `code_sideb`
- **Tipo:** busca/teclado · **Época:** Ctrl+K · **Lugar:** Busca
- **Gatilho:** Digite "lado b".
- **Efeito:** Mostra quantos ovos você já achou (sem spoiler).
- *EN:* side b — Shows how many eggs you have found (no spoilers).

### 17. mixtape — `code_mixtape`
- **Tipo:** busca/teclado · **Época:** Ctrl+K · **Lugar:** Busca
- **Gatilho:** Digite "mixtape".
- **Efeito:** Monta uma fita de 12 faixas do seu catálogo, com dedicatória.
- *EN:* mixtape — Builds a 12-track tape from your catalog, with a dedication.

### 18. quinto beatle — `code_fifth`
- **Tipo:** busca/teclado · **Época:** Ctrl+K · **Lugar:** Busca
- **Gatilho:** Digite "quinto beatle".
- **Efeito:** Lista os "quintos integrantes" do seu selo.
- *EN:* fifth beatle — Lists your label's "fifth members".

### 19. abbey road — `code_abbey`
- **Tipo:** busca/teclado · **Época:** Ctrl+K · **Lugar:** Busca
- **Gatilho:** Digite "abbey road".
- **Efeito:** Quatro bonequinhos atravessam a faixa no topo da tela.
- **Referência real:** 8 de agosto de 1969: a foto da capa de Abbey Road.
- *EN:* abbey road — Four little figures walk across the zebra crossing at the top of the screen.

### 20. scratch — `code_scratch`
- **Tipo:** busca/teclado · **Época:** Ctrl+K · **Lugar:** Busca
- **Gatilho:** Digite "scratch".
- **Efeito:** Um scratch de vinil sintetizado (sem arquivos).
- *EN:* scratch — A synthesized vinyl scratch (no files).

### 21. Trinta vidas — `konami`
- **Tipo:** busca/teclado · **Época:** teclado · **Lugar:** Qualquer tela
- **Gatilho:** Digite ↑↑↓↓←→←→BA em qualquer tela.
- **Efeito:** Liga a pele "selo chiptune" (de novo desliga) e libera a conquista.
- **Referência real:** O código Konami (Gradius no NES, 1986; famoso pelas 30 vidas de Contra).
- **Conquista secreta:** Trinta vidas (`konami27`)
- *EN:* Thirty lives — Toggles the "chiptune label" skin and unlocks the feat.

### 22. Colecionador de 78 — `gramophone_10`
- **Tipo:** interface · **Época:** qualquer · **Lugar:** Sede
- **Gatilho:** Clicar 10 vezes seguidas no gramofone da sede.
- **Efeito:** Toca um chiado de 78 rpm sintetizado e libera o selo de colecionador.
- **Conquista secreta:** Colecionador de 78 (`collector27`)
- *EN:* 78 collector — Plays a synthesized 78 rpm crackle and unlocks the collector badge.

### 23. A carta perdida — `lost_letter`
- **Tipo:** simulação · **Época:** 20+ anos de partida · **Lugar:** Arquivo
- **Gatilho:** Em partidas de 20+ anos, um artista seu já falecido.
- **Efeito:** Uma carta no arquivo muda o legado: fama póstuma e, se já era grande, vira lenda.
- *EN:* The lost letter — A letter in the archive changes the legacy: posthumous fame and, if already big, legend status.

### 24. O músico das 3 da manhã — `street_3am`
- **Tipo:** interface · **Época:** noite · **Lugar:** Mapa da cidade
- **Gatilho:** Clicar no músico de rua que aparece no mapa da cidade por volta das 3 da manhã.
- **Efeito:** Uma pista rara de alto potencial (uma vez por partida).
- *EN:* The 3 AM busker — A rare high-potential lead (once per run).

### 25. Um disco, uma lenda — `one_album_legend`
- **Tipo:** conquista · **Época:** qualquer · **Lugar:** Carreira
- **Gatilho:** Um ato seu com um único álbum vira lenda.
- **Efeito:** Conquista secreta.
- **Conquista secreta:** Um disco, uma lenda (`onealbum27`)
- *EN:* One record, one legend — Secret feat.

### 26. Tudo pela arte — `noise_cult`
- **Tipo:** conquista · **Época:** qualquer · **Lugar:** Catálogo
- **Gatilho:** Um LP seu de 60+ minutos, experimentação 75+ e que vendeu pouco, 8+ anos depois.
- **Efeito:** Vira culto (crítica e vendas tardias) e libera a conquista.
- **Referência real:** Homenagem a "Metal Machine Music" (Lou Reed, 1975).
- **Conquista secreta:** Tudo pela arte (`noise27`)
- *EN:* All for art — Becomes a cult item (late reviews and sales) and unlocks the feat.

### 27. Ciclo completo — `full_circle`
- **Tipo:** conquista · **Época:** qualquer · **Lugar:** Elenco
- **Gatilho:** Assinar o filho/filha de um artista que você lançou.
- **Efeito:** Conquista secreta e confiança do novo artista.
- **Conquista secreta:** Ciclo completo (`circle27`)
- *EN:* Full circle — Secret feat and trust from the new artist.

### 28. O violão quebrado — `guitar_smash`
- **Tipo:** simulação · **Época:** 1965–72 · **Lugar:** Brasil
- **Gatilho:** Um ato seu é vaiado num festival da canção na TV.
- **Efeito:** Opção de quebrar o violão e jogá-lo na plateia: manchete.
- **Referência real:** 21 de outubro de 1967, Festival da Record: vaiado, Sérgio Ricardo quebra o violão e o joga na plateia.
- *EN:* The smashed guitar — Option to smash the guitar and throw it into the crowd: headline.

### 29. Domingo à tarde na TV — `jovem_guarda`
- **Tipo:** simulação · **Época:** 1965–68 · **Lugar:** São Paulo
- **Gatilho:** Ter um ato de jovem guarda/iê-iê-iê no Brasil em 1965–68.
- **Efeito:** Convite para o programa de domingo; um calhambeque aparece na garagem da sede.
- **Referência real:** Jovem Guarda, TV Record, a partir de 22 de agosto de 1965; "O Calhambeque" (1964).
- *EN:* Sunday afternoon on TV — An invitation to the Sunday show; a jalopy appears in the HQ garage.

### 30. Fitas de Londres — `tropicalia_exile`
- **Tipo:** simulação · **Época:** 1969–72 · **Lugar:** Londres
- **Gatilho:** Um artista seu exilado da ditadura brasileira (1969–72).
- **Efeito:** Manda fitas de Londres; o disco sai com outro nome para driblar a censura.
- **Referência real:** Caetano Veloso e Gilberto Gil no exílio em Londres (1969–72); em 1974 Chico Buarque assina como "Julinho da Adelaide".
- *EN:* Tapes from London — Sends tapes from London; the record comes out under another name to dodge the censors.

### 31. Sai do chão! — `sai_do_chao`
- **Tipo:** simulação · **Época:** 1985+ · **Lugar:** Salvador
- **Gatilho:** Show de axé esgotado em Salvador.
- **Efeito:** O chão treme no mapa da cidade por uma semana; fãs e manchete.
- *EN:* Off the ground! — The ground shakes on the city map for a week; fans and headline.

### 32. Mary tinha um carneirinho — `edison_lamb`
- **Tipo:** simulação · **Época:** 1889–90 · **Lugar:** Paris / mundo
- **Gatilho:** Começar a partida em 1889–90.
- **Efeito:** Um agente demonstra o fonógrafo: reputação institucional.
- **Referência real:** 1877: primeiras palavras gravadas por Edison; 1889: fonógrafos na Exposição Universal de Paris.
- *EN:* Mary had a little lamb — An agent demonstrates the phonograph: institutional reputation.

### 33. Dez árias num quarto de hotel — `caruso_hotel`
- **Tipo:** simulação · **Época:** 1902–04 · **Lugar:** Milão
- **Gatilho:** Ter um ato de ópera/clássico na Itália em 1902–04.
- **Efeito:** Gravação improvisada num hotel: fama e prestígio.
- **Referência real:** Abril de 1902: Enrico Caruso grava 10 árias para a Gramophone Company num hotel de Milão.
- *EN:* Ten arias in a hotel room — An improvised hotel-room recording: fame and prestige.

### 34. As sessões de Bristol — `bristol_1927`
- **Tipo:** simulação · **Época:** 1927 · **Lugar:** Sul dos EUA
- **Gatilho:** Ter um ato country/old-time no sul dos EUA em 1927.
- **Efeito:** Um caçador de talentos com gravador portátil passa pela cidade: fama.
- **Referência real:** Julho–agosto de 1927: Ralph Peer grava a Carter Family e Jimmie Rodgers em Bristol (Tennessee/Virginia).
- *EN:* The Bristol sessions — A talent scout with a portable recorder comes to town: fame.

### 35. A encruzilhada — `crossroads`
- **Tipo:** simulação · **Época:** 1930–45 · **Lugar:** Delta do Mississippi
- **Gatilho:** Ter um ato de blues do Delta em 1930–45 (raro).
- **Efeito:** Uma proposta misteriosa à meia-noite: habilidade enorme na guitarra, mas a alma pesa (estresse).
- **Referência real:** A lenda da encruzilhada, associada a Robert Johnson.
- *EN:* The crossroads — A mysterious offer at midnight: huge guitar skill, but the soul gets heavy (stress).

### 36. Motim de Colombo — `sinatra_riot`
- **Tipo:** simulação · **Época:** out. 1944 · **Lugar:** Nova York
- **Gatilho:** Ter um cantor romântico/crooner famoso em Nova York em outubro de 1944.
- **Efeito:** Fãs adolescentes param a Times Square: fãs fiéis.
- **Referência real:** 12 de outubro de 1944: multidão de fãs de Frank Sinatra no Paramount Theatre.
- *EN:* Columbus Day riot — Teen fans stop Times Square: devoted fans.

### 37. Gravado em fita — `crosby_tape`
- **Tipo:** simulação · **Época:** 1947–48 · **Lugar:** EUA
- **Gatilho:** Ter um crooner famoso em 1947–48.
- **Efeito:** O programa de rádio passa a ser gravado em fita magnética: menos estresse.
- **Referência real:** 1947: Bing Crosby passa a gravar o seu programa de rádio em fita magnética.
- *EN:* Recorded on tape — The radio show is now pre-recorded on magnetic tape: less stress.

### 38. O quarteto de um milhão de dólares — `million_quartet`
- **Tipo:** simulação · **Época:** dez. 1956 · **Lugar:** Memphis
- **Gatilho:** Em dezembro de 1956, presença em Memphis e 2+ atos seus de rock'n'roll/rockabilly/country.
- **Efeito:** Uma jam espontânea no estúdio: fama para todos e uma fita lendária.
- **Referência real:** 4 de dezembro de 1956: Elvis, Carl Perkins, Jerry Lee Lewis e Johnny Cash na Sun.
- *EN:* The million dollar quartet — A spontaneous studio jam: fame for all and a legendary tape.

### 39. Uma batida diferente — `chega_de_saudade`
- **Tipo:** simulação · **Época:** 1958–59 · **Lugar:** Rio de Janeiro
- **Gatilho:** Ter um ato de bossa nova no Rio em 1958–59.
- **Efeito:** A batida do violão vira assunto: reputação artística.
- **Referência real:** 1958: "Chega de Saudade" com João Gilberto.
- *EN:* A different beat — The guitar beat becomes the talk of the town: artistic reputation.

### 40. Domingo na TV americana — `sullivan_1964`
- **Tipo:** simulação · **Época:** fev. 1964 · **Lugar:** Nova York
- **Gatilho:** Ter um grupo beat/pop rock britânico com alguma fama em fevereiro de 1964.
- **Efeito:** Aparição na TV dos EUA: fama americana.
- **Referência real:** 9 de fevereiro de 1964: os Beatles no Ed Sullivan Show, cerca de 73 milhões de espectadores.
- *EN:* Sunday on American TV — An appearance on US TV: American fame.

### 41. Ovos mexidos — `scrambled_eggs`
- **Tipo:** simulação · **Época:** 1965+ · **Lugar:** Qualquer lugar
- **Gatilho:** Raro: um compositor seu acorda com uma melodia pronta.
- **Efeito:** Inspiração no máximo (o título provisório é "Ovos mexidos").
- **Referência real:** "Yesterday" (1965): Paul McCartney sonhou a melodia; o título provisório era "Scrambled Eggs".
- *EN:* Scrambled eggs — Maximum inspiration (the working title is "Scrambled Eggs").

### 42. Plugado — `newport_1965`
- **Tipo:** simulação · **Época:** jul. 1965 · **Lugar:** Festival de folk
- **Gatilho:** Ter um ato de folk com alguma fama em julho de 1965.
- **Efeito:** Tocar elétrico: vaias agora, respeito artístico depois.
- **Referência real:** 25 de julho de 1965: Bob Dylan toca elétrico em Newport e é vaiado.
- *EN:* Plugged in — Go electric: boos now, artistic respect later.

### 43. Bacalhau no auditório — `chacrinha`
- **Tipo:** simulação · **Época:** 1967–88 · **Lugar:** Brasil
- **Gatilho:** Ter um ato brasileiro com fama média (1967–88).
- **Efeito:** Convite para o programa de auditório do apresentador que joga bacalhau na plateia: fama no Brasil, imagem mais pop.
- **Referência real:** Chacrinha e seus programas de auditório (1956–88).
- *EN:* Codfish in the studio — An invitation to the variety show whose host throws codfish at the audience: fame in Brazil, a more pop image.

### 44. Leite de graça — `glastonbury_milk`
- **Tipo:** simulação · **Época:** 1970+ · **Lugar:** Reino Unido
- **Gatilho:** Fazer a primeira edição de um festival seu no Reino Unido.
- **Efeito:** Ingresso com leite da fazenda incluído: público fiel.
- **Referência real:** 19 de setembro de 1970: o primeiro Glastonbury (Pilton), ingresso de £1 com leite grátis.
- *EN:* Free milk — Ticket with free milk from the farm: a loyal crowd.

### 45. Na esquina — `clube_esquina`
- **Tipo:** simulação · **Época:** 1970–74 · **Lugar:** Belo Horizonte
- **Gatilho:** Ter um ato de MPB em Belo Horizonte em 1970–74.
- **Efeito:** Rodas de violão na esquina: inspiração e cena.
- **Referência real:** Clube da Esquina (1972), Milton Nascimento e Lô Borges, nome tirado de uma esquina de Santa Tereza.
- *EN:* On the corner — Guitar circles on the street corner: inspiration and scene.

### 46. O último show do personagem — `ziggy_1973`
- **Tipo:** simulação · **Época:** 1972–75 · **Lugar:** Londres
- **Gatilho:** Ter um ato de glam em Londres em 1972–75.
- **Efeito:** Anuncia no palco a "aposentadoria" do personagem: momento e fama (a banda leva um susto).
- **Referência real:** 3 de julho de 1973: David Bowie aposenta Ziggy Stardust no Hammersmith Odeon.
- *EN:* The character's last show — Announces on stage the character's "retirement": momentum and fame (the band gets a fright).

### 47. Festa de volta às aulas — `bronx_1973`
- **Tipo:** simulação · **Época:** ago. 1973 · **Lugar:** Nova York
- **Gatilho:** Ter um ato de funk/soul em Nova York em agosto de 1973.
- **Efeito:** Um DJ estica o break numa festa no Bronx: inspiração.
- **Referência real:** 11 de agosto de 1973: festa de DJ Kool Herc no 1520 da Sedgwick Avenue.
- *EN:* Back-to-school party — A DJ stretches the break at a Bronx party: inspiration.

### 48. Waterloo — `waterloo_1974`
- **Tipo:** simulação · **Época:** abr. 1974 · **Lugar:** Estocolmo
- **Gatilho:** Ter um ato pop de Estocolmo em abril de 1974.
- **Efeito:** Vitória num concurso europeu de canção: fama europeia.
- **Referência real:** 6 de abril de 1974: o ABBA vence o Eurovision com "Waterloo" em Brighton.
- *EN:* Waterloo — Win a European song contest: European fame.

### 49. A senha no rádio — `grandola_1974`
- **Tipo:** simulação · **Época:** abr. 1974 · **Lugar:** Lisboa
- **Gatilho:** Ter um ato em Lisboa em abril de 1974.
- **Efeito:** Uma canção sua toca de madrugada no rádio como senha da revolução: prestígio.
- **Referência real:** 25 de abril de 1974: "Grândola, Vila Morena" (Zeca Afonso) na Rádio Renascença, senha da Revolução dos Cravos.
- *EN:* The radio signal — A song of yours plays on the radio before dawn as the revolution's signal: prestige.

### 50. Um bar no Bowery — `bowery_punk`
- **Tipo:** simulação · **Época:** 1974–78 · **Lugar:** Nova York
- **Gatilho:** Ter um ato de punk em Nova York em 1974–78.
- **Efeito:** Residência num bar sujo do Bowery: fãs fiéis.
- **Referência real:** CBGB (aberto em dezembro de 1973) e a cena punk de Nova York.
- *EN:* A bar on the Bowery — A residency at a dingy Bowery bar: devoted fans.

### 51. O disco racional — `racional`
- **Tipo:** simulação · **Época:** 1974–76 · **Lugar:** Brasil
- **Gatilho:** Ter um ato de soul brasileiro em 1974–76 (raro).
- **Efeito:** O cantor entra numa seita e grava um disco devocional: fracasso agora, culto décadas depois.
- **Referência real:** Tim Maia, "Racional" (1975), gravado na fase da Cultura Racional e redescoberto anos depois.
- *EN:* The rational record — The singer joins a sect and records a devotional album: a flop now, cult decades later.

### 52. Palavrão ao vivo — `grundy_1976`
- **Tipo:** simulação · **Época:** 1976–77 · **Lugar:** Londres
- **Gatilho:** Ter um ato de punk no Reino Unido em dez. 1976–1977.
- **Efeito:** Escândalo na TV: notoriedade enorme, imagem pública em baixa.
- **Referência real:** 1º de dezembro de 1976: os Sex Pistols xingam ao vivo no programa de Bill Grundy.
- *EN:* Swearing live on TV — TV scandal: huge notoriety, public image down.

### 53. Concerto da paz — `peace_1978`
- **Tipo:** simulação · **Época:** abr. 1978 · **Lugar:** Kingston
- **Gatilho:** Ter um ato de reggae em Kingston em abril de 1978.
- **Efeito:** No palco, o cantor junta as mãos de dois rivais políticos: prestígio.
- **Referência real:** 22 de abril de 1978: One Love Peace Concert, Bob Marley com Michael Manley e Edward Seaga.
- *EN:* Peace concert — On stage, the singer joins the hands of two political rivals: prestige.

### 54. Nós somos os robôs — `robots`
- **Tipo:** simulação · **Época:** 1978+ · **Lugar:** Alemanha
- **Gatilho:** Ter um ato eletrônico/krautrock/synth-pop na Alemanha (1978+).
- **Efeito:** Manequins-robôs no lugar da banda numa sessão de fotos: fama e menos estresse.
- **Referência real:** Kraftwerk, "The Man-Machine" e "The Robots" (1978).
- *EN:* We are the robots — Robot mannequins stand in for the band at a photo session: fame and less stress.

### 55. Noite da demolição — `disco_demolition`
- **Tipo:** simulação · **Época:** jul. 1979 · **Lugar:** Chicago
- **Gatilho:** Ter um ato de disco em julho de 1979.
- **Efeito:** Discos explodem num estádio: o momento esfria um pouco, os fãs núcleo se fecham.
- **Referência real:** 12 de julho de 1979: Disco Demolition Night no Comiskey Park, Chicago.
- *EN:* Demolition night — Records blown up in a stadium: momentum cools a bit, core fans close ranks.

### 56. Música no bolso — `walkman`
- **Tipo:** simulação · **Época:** 1979–81 · **Lugar:** Tóquio / mundo
- **Gatilho:** Ter um lançamento em cassete em 1979–81.
- **Efeito:** Um tocador portátil faz o cassete andar: fãs casuais.
- **Referência real:** 1º de julho de 1979: a Sony lança o Walkman no Japão.
- *EN:* Music in your pocket — A portable player gets cassettes moving: casual fans.

### 57. Gravar em casa está matando a música — `home_taping`
- **Tipo:** simulação · **Época:** 1981–84 · **Lugar:** Reino Unido
- **Gatilho:** Ter um lançamento em cassete em 1981–84.
- **Efeito:** A campanha da caveira com fita cassete: manchete (e um pouquinho de curiosidade).
- **Referência real:** 1981: campanha "Home Taping Is Killing Music" da BPI.
- *EN:* Home taping is killing music — The skull-and-cassette campaign: a headline (and a bit of curiosity).

### 58. O primeiro clipe — `mtv_1981`
- **Tipo:** simulação · **Época:** ago. 1981 · **Lugar:** EUA
- **Gatilho:** Ter um ato de new wave/synth-pop em agosto de 1981.
- **Efeito:** Um canal de clipes estreia e o seu vídeo passa no primeiro dia: fama.
- **Referência real:** 1º de agosto de 1981: a MTV estreia com "Video Killed the Radio Star" (The Buggles).
- *EN:* The first clip — A music video channel launches and your clip airs on day one: fame.

### 59. Disco a laser nº 1 — `first_cd`
- **Tipo:** simulação · **Época:** ago.–out. 1982 · **Lugar:** Alemanha / Japão
- **Gatilho:** Ter um lançamento em CD em agosto–outubro de 1982.
- **Efeito:** Uma das primeiras prensagens de CD: colecionadores (prestígio).
- **Referência real:** 17 de agosto de 1982: primeiros CDs prensados (Langenhagen); 1º de outubro: lançamento comercial no Japão.
- *EN:* Laser disc no. 1 — One of the first CD pressings: collectors (prestige).

### 60. Chuva e lama — `rock_in_rio_mud`
- **Tipo:** simulação · **Época:** jan. 1985 · **Lugar:** Rio de Janeiro
- **Gatilho:** Ter um ato famoso de rock ou brasileiro em janeiro de 1985.
- **Efeito:** Show na lama de um festival gigante no Rio: fama no Brasil.
- **Referência real:** 11–20 de janeiro de 1985: o primeiro Rock in Rio, com chuva e lama.
- *EN:* Rain and mud — A show in the mud at a giant festival in Rio: fame in Brazil.

### 61. Via satélite — `live_aid`
- **Tipo:** simulação · **Época:** jul. 1985 · **Lugar:** Londres / Filadélfia
- **Gatilho:** Ter um ato com fama 50+ em julho de 1985.
- **Efeito:** Convite para um slot no megaevento beneficente transmitido por satélite: fama mundial, sem cachê.
- **Referência real:** 13 de julho de 1985: Live Aid em Wembley e no JFK Stadium.
- *EN:* Via satellite — An invitation to a slot at the satellite-broadcast benefit mega-event: world fame, no fee.

### 62. Gravando em Joanesburgo — `graceland`
- **Tipo:** simulação · **Época:** 1985–87 · **Lugar:** Joanesburgo
- **Gatilho:** Ter um ato de mbaqanga/isicathamiya em Joanesburgo/Durban em 1985–87.
- **Efeito:** Uma estrela estrangeira grava com eles: fama mundial e polêmica sobre o boicote cultural.
- **Referência real:** 1985–86: "Graceland", de Paul Simon, gravado em parte em Joanesburgo com músicos sul-africanos.
- *EN:* Recording in Johannesburg — A foreign star records with them: world fame and controversy over the cultural boycott.

### 63. Música no muro — `wall_1989`
- **Tipo:** simulação · **Época:** nov. 1989 · **Lugar:** Berlim
- **Gatilho:** Ter um ato em Berlim em novembro de 1989.
- **Efeito:** Tocam junto ao muro aberto: fama na Alemanha e prestígio.
- **Referência real:** 11 de novembro de 1989: Mstislav Rostropovich toca violoncelo no Checkpoint Charlie.
- *EN:* Music at the wall — They play by the opened wall: fame in Germany and prestige.

### 64. Caranguejos com cérebro — `mangue_1991`
- **Tipo:** simulação · **Época:** 1991–94 · **Lugar:** Recife
- **Gatilho:** Ter um ato em Recife em 1991–94.
- **Efeito:** Um manifesto nasce na cena: força da cena e reputação artística.
- **Referência real:** 1991–92: manifesto "Caranguejos com Cérebro" do manguebeat.
- *EN:* Crabs with brains — A manifesto is born in the scene: scene strength and artistic reputation.

### 65. Flanela no topo — `grunge_1992`
- **Tipo:** simulação · **Época:** 1991–93 · **Lugar:** Seattle
- **Gatilho:** Ter um ato de grunge em Seattle em 1991–93.
- **Efeito:** Um disco de garagem derruba o rei do pop do 1º lugar: fama e momento.
- **Referência real:** 11 de janeiro de 1992: "Nevermind" tira "Dangerous" do 1º lugar da Billboard 200.
- *EN:* Flannel on top — A garage record knocks the king of pop off no. 1: fame and momentum.

### 66. Escrito no rosto — `slave_cheek`
- **Tipo:** simulação · **Época:** 1990+ · **Lugar:** Mundo
- **Gatilho:** Uma estrela sua (fama 60+) com confiança muito baixa no selo.
- **Efeito:** Aparece em público com "escravo" escrito no rosto: renegociar ou encarar a crise.
- **Referência real:** 1993: Prince escreve "slave" no rosto na briga com a Warner.
- *EN:* Written on the face — Shows up in public with "slave" written on the face: renegotiate or face the crisis.

### 67. Um milhão no fogo — `klf_burn`
- **Tipo:** simulação · **Época:** 1994+ · **Lugar:** Reino Unido
- **Gatilho:** Um ato eletrônico britânico seu com muito dinheiro próprio (raro).
- **Efeito:** Queima o próprio dinheiro numa ilha: perde o caixa do ato, ganha lenda e prestígio.
- **Referência real:** 23 de agosto de 1994: o KLF queima £1 milhão na ilha de Jura.
- *EN:* A million on fire — Burns its own money on an island: loses the act's cash, gains legend and prestige.

### 68. Os veteranos de Havana — `buena_vista`
- **Tipo:** simulação · **Época:** 1996+ · **Lugar:** Havana
- **Gatilho:** Ter um ato de son/bolero em Havana com integrantes de 60+ anos.
- **Efeito:** Uma sessão com músicos veteranos vira fenômeno mundial.
- **Referência real:** Março de 1996: o Buena Vista Social Club grava nos estúdios EGREM; disco em 1997.
- *EN:* The Havana veterans — A session with veteran musicians becomes a worldwide phenomenon.

### 69. Capacetes — `helmets`
- **Tipo:** simulação · **Época:** 1997+ · **Lugar:** Paris
- **Gatilho:** Ter uma dupla eletrônica em Paris (1997+).
- **Efeito:** Passam a aparecer só de capacete: menos estresse, imagem artística.
- **Referência real:** Daft Punk e os capacetes de robô (era "Discovery", 2001).
- *EN:* Helmets — They only appear in helmets from now on: less stress, artistic image.

### 70. Vazou — `napster_leak`
- **Tipo:** simulação · **Época:** 1999–2002 · **Lugar:** Internet
- **Gatilho:** Ter um lançamento agendado em 1999–2002.
- **Efeito:** O disco vaza na troca de arquivos: processar fãs ou abraçar o vazamento.
- **Referência real:** 2000: o Metallica processa o Napster depois do vazamento de "I Disappear".
- *EN:* Leaked — The record leaks on file sharing: sue fans or embrace the leak.

### 71. Voto dos fãs — `kpop_vote`
- **Tipo:** simulação · **Época:** 2005+ · **Lugar:** Seul
- **Gatilho:** Ter um grupo de K-pop em Seul com muitos fãs núcleo.
- **Efeito:** Os fãs ganham o troféu de um programa musical no voto: fãs e fama.
- *EN:* Fan vote — Fans win a music show trophy by voting: fans and fame.

### 72. Pague quanto quiser — `pwyw_2007`
- **Tipo:** simulação · **Época:** 2007+ · **Lugar:** Internet
- **Gatilho:** Ter um ato com fama 55+ a partir de 2007.
- **Efeito:** Disco "pague quanto quiser": fãs núcleo e prestígio, pouco dinheiro.
- **Referência real:** 10 de outubro de 2007: Radiohead, "In Rainbows".
- *EN:* Pay what you want — A "pay what you want" record: core fans and prestige, little money.

### 73. Pegadinha do link — `rickroll`
- **Tipo:** simulação · **Época:** 2007+ · **Lugar:** Internet
- **Gatilho:** Ter um single dance-pop/pop de 1985–90 no catálogo a partir de 2007.
- **Efeito:** Um link-pegadinha ressuscita a faixa: fama e streams.
- **Referência real:** 2007: o "rickroll" com "Never Gonna Give You Up" (1987).
- *EN:* Link prank — A prank link revives the track: fame and streams.

### 74. A canção mais misteriosa da internet — `fex_hunt`
- **Tipo:** simulação · **Época:** 2007+ · **Lugar:** Internet
- **Gatilho:** Na era da internet, um fragmento de uma gravação dos anos 80 (sua ou de um ato esquecido) aparece sem créditos.
- **Efeito:** Caçada da comunidade por meses/anos; você ajuda (arquivo, fitas master, ex-integrantes) e a identificação traz revival, valor de catálogo e uma conquista.
- **Referência real:** "Subways of Your Mind", da banda alemã FEX: gravada do rádio numa fita nos anos 80, procurada online por cerca de 17 anos e identificada em novembro de 2024.
- **Conquista secreta:** Fita sem nome (`lostmedia27`)
- *EN:* The most mysterious song on the internet — A community hunt over months/years; you help (archive, master tapes, former members) and the identification brings a revival, catalog value and a feat.

### 75. Trilha de série — `needle_drop`
- **Tipo:** simulação · **Época:** 2016+ · **Lugar:** Streaming
- **Gatilho:** Ter uma faixa synth-pop/new wave/art rock dos anos 80 no catálogo a partir de 2016 (raro).
- **Efeito:** Uma série de TV usa a faixa e ela volta às paradas.
- **Referência real:** 2022: "Running Up That Hill" (Kate Bush, 1985) volta às paradas com "Stranger Things".
- *EN:* Series soundtrack — A TV series uses the track and it climbs the charts again.

### 76. O algoritmo achou — `city_pop_revival`
- **Tipo:** simulação · **Época:** 2017+ · **Lugar:** Tóquio / internet
- **Gatilho:** Ter um lançamento de city pop de 1976–89 no catálogo a partir de 2017.
- **Efeito:** O algoritmo recomenda a faixa a milhões: revival mundial.
- **Referência real:** "Plastic Love" (Mariya Takeuchi, 1984) viraliza no YouTube a partir de 2017.
- *EN:* The algorithm found it — The algorithm recommends the track to millions: a worldwide revival.

## Conquistas secretas

| id | nome | como |
|---|---|---|
| `egg27:decca27` | O homem que recusou os Beatles / The man who turned down the Beatles | Recuse um grupo beat de Liverpool em 1962. |
| `egg27:onealbum27` | Um disco, uma lenda / One record, one legend | Um ato com um único álbum vira lenda. |
| `egg27:noise27` | Tudo pela arte / All for art | Um disco longo de ruído que ninguém comprou vira culto. |
| `egg27:circle27` | Ciclo completo / Full circle | Assine o filho de um artista que você lançou. |
| `egg27:collector27` | Colecionador de 78 / 78 collector | Insista no gramofone da sede. |
| `egg27:konami27` | Trinta vidas / Thirty lives | ↑↑↓↓←→←→BA |
| `egg27:lostmedia27` | Fita sem nome / Untitled tape | Ajude a identificar uma gravação perdida. |
| `egg27:sugar27` | Lenda do outro lado do mundo / Legend on the other side of the world | Um fracasso seu vira clássico 30 anos depois. |
| `egg27:fifth27` | O quinto integrante / The fifth member | Um produtor ou empresário vira parte da banda. |
| `egg27:amp11` | Um a mais / One louder | Tenha um amplificador que vai até 11. |
| `egg27:hunter27` | Caçador de ovos / Egg hunter | Ache 10 ovos de Páscoa numa partida. |
## R31 (onda 4 · N) — mais Edison

| id | Época | Gatilho | Efeito |
|---|---|---|---|
| `edison_tone31` | 1915–25 | um show de artista seu (chance 20%) | "Teste de tom": a plateia não sabe se é a banda ou um disco Edison; fama +1 |
| `edison_cyl31` | até 1930 | qualquer mês (3%) | um senhor de chapéu compra todos os cilindros da loja; um pouco de caixa |
| `edison_mary31` | qualquer | primeiro clique no fonógrafo da Sede | toca o "Mary had a little lamb" original (1877) |
| `egg27:edison31` (secreta) | — | os quatro ovos do Edison (com `edison_lamb`) | conquista "O laboratório de Menlo Park" |
| `egg27:fic31` (secreta) | — | contratar uma banda de filme, série ou desenho | conquista "Saída da tela" |

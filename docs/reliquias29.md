# R29 — Relíquias procedurais: versões dos arquétipos reais para qualquer artista

Pedido do autor: *"bote um agente para trabalhar nas relíquias reais que existem e criar versões aleatórias delas que
podem ocorrer no mundo com qualquer artista, e até mais"*.

O catálogo real (relics17 + `data/relics18` + `data/media19b` + `data/era1889`: **107 peças**) foi lido peça a peça e
classificado em **23 arquétipos**. Cada arquétipo ganhou "versões" que nascem em **qualquer partida**, para **qualquer
artista** (real ou inventado, NPC ou seu), quando um fato que combina passa pelo barramento de fatos. Nada de fluxo
novo: a peça entra na lista de sempre (relics9) e usa os fluxos que já existiam — leilão, negociação com o dono, museu,
empréstimo/exposição, roubo, detetive, mercado negro, perícia, ala-museu (docs/act27.md, um caminho por ação).

Arquivos:
- motor: `src/sim/sys/relics29.ts` (registrado no fim de `src/sim/sys/index.ts`);
- interface: `src/ui/sys/relics29.ts` (pílulas e seção "História da peça"), usada em `src/ui/sys/lendas9.ts` (ficha da
  relíquia), `src/ui/sys/talent18.ts` (Acervo vivo) e `src/ui/sys/live/museum.ts` (museu do selo); dica "Primeira
  relíquia" em `src/ui/tracks18.ts`;
- ganchos pequenos: `relics9.ts` (`addRelic` aceita id próprio; `relicKeep9` para a poda do teto de 90),
  `ui/pixel/relic28.ts` (mesa de som → desenho `mixer`), `ui/pixel/relic29.ts` (título entre aspas não escolhe o
  desenho; `phone` só como palavra, "Gramophone"/"saxophone" não viram telefone), `factmatrix19.ts` (`tour_done` saiu
  da lista de exceções: agora tem consumidor);
- testes: `tests/r29-relics.test.ts`; golden `tests/r27-p2a.test.ts` e `tests/r27-p2b.test.ts` re-medidos;
- medição: `scripts/measure29relics.ts`; capturas: `docs/shots29reliquias/` (`scripts/shots29reliquias.mjs`).

## Arquétipos

Fatores de valor: **F** fama do artista · **R** raridade (quantas peças do ato já existem) · **E** época · **S** peso
da história (gravidade do fato) · **C** estado de conservação · **P** procedência. "Genérico" = pode nascer para ato
real intocado no modo exato (não afirma nada sobre um objeto documentado).

| Arquétipo | Peças reais no catálogo | Exemplos reais | Fatores | Gatilhos (fatos) | Tipo → desenho | Procedência típica |
|---|---|---|---|---|---|---|
| Instrumento com nome (a guitarra com nome) | 42 | Lucille (B.B. King), "Blackie" (Clapton), Black Strat (Gilmour), Höfner de McCartney | FRESP | `show` histórico (líder guitarrista/baixista), `chart` nº 1 (líder guitarrista) | guitar/bass → guitarra, semiacústica, Flying V, violão, baixo | o artista |
| Instrumento do show lendário (quebrado, queimado ou não) | 7 | Strat queimada no Monterey Pop, Strat de Woodstock, Strat de Newport 1965, D-18E do Unplugged, baixo de "London Calling" | FRSC | `show` histórico, `show` + `chron:stage_incident` | guitarra / bumbo / pedestal / teclado (pelo papel) | o artista ou um fã que recolheu os pedaços |
| Figurino icônico | 12 | sapatinhos de rubi, macacão "American Eagle", Ziggy, ABBA no Eurovision, luva do Motown 25, jaqueta de "Thriller" | FESC | `show` histórico, incidente de palco, `retired` (despedida) | outfit → macacão, vestido, chapéu, botas, jaqueta, luva (pela época) | o artista |
| Roupa da cerimônia | 3 | vestido de carne (VMA 2010), vestido Union Jack (BRITs), vestido de cisne (Oscar) | FSE | `award` grave (≥ 60) | outfit → paletó/jaqueta, vestido | o artista; às vezes um museu |
| Letra manuscrita do hit | 6 | "Like a Rolling Stone", "Bohemian Rhapsody", "A Day in the Life", "Hey Jude", "American Pie" | FRSC | `chart` + `chron:number1` | lyrics → letra (guardanapo → papel) | o artista |
| Piano onde o hit nasceu | 3 | Steinway de "Imagine", Yamaha de Freddie Mercury, piano na caixa de areia de Brian Wilson | FSEP | `chart` nº 1 (líder vocalista/tecladista) | piano | o artista |
| Fita master / acetato | 8 | acetato de "My Happiness", prensagem A&M de "God Save the Queen", fita dos Quarrymen | FRSEP | `masterwork` | tape → rolo, cassete, HD (pela época); record → acetato | o selo (o SEU, se o ato é seu) |
| Microfone da sessão | 0 | (fora do catálogo: os Neumann U47 dos grandes estúdios) | FSE | `masterwork`, `session_star` | mic → microfone ou pedestal | o selo |
| Mesa de som | 2 | mesa de "The Dark Side of the Moon", fonógrafo de Edison | SEP | `masterwork`, `session_star` | prop "console" → mixer | o selo |
| Primeiro contrato | 0 | (fora do catálogo: contratos de estreia que vão a leilão) | FRP | `signing` de ato sem lançamento | contract | o selo; o SEU acervo, se você assinou |
| Van / carro da banda | 3 | Cadillac de Elvis, Rolls-Royce de Lennon, Porsche de Janis | FEC | `split` | car → van (ônibus) ou carro | o artista |
| Estatueta | 1 | medalha MBE devolvida por Lennon | FSP | `award` médio de ato seu (o relics18 cobre os grandes) | trophy | o artista |
| Última carta | 0 | (cartas e bilhetes finais guardados pelas famílias) | FS | `death` | lyrics → papel | os herdeiros |
| Cartaz do show histórico | 0 | (fora do catálogo: cartazes do Fillmore, de Woodstock) | FEC | `show` histórico, `retired` (despedida) | poster | um colecionador; o seu, se o ato é seu |
| Pele do bumbo com o logo | 4 | Ludwig de Ringo no Ed Sullivan, bumbo de Sgt. Pepper, Vistalite de Bonham | FRS | `split` | drums | o artista |
| Objeto autografado | 0 | (leilões beneficentes com guitarras autografadas) | FP | `charity_show` | record (banda) / violão (solo) | leilão beneficente |
| Objeto pessoal | 7 | óculos de Buddy Holly, cardigã de Cobain, coroa de Biggie, anel de Tupac, Adidas do Run-DMC | FSC | `death` | glasses, outfit → chapéu, jaqueta, lenço | os herdeiros |
| Peça do estúdio ou da casa | 5 | toldo do CBGB, círculo do Ryman, toco da Árvore da Esperança do Apollo, cabana de Muddy Waters | SEP | `label_sold` (selo vendido/fechado) | prop "neon sign" → letreiro de neon | leilão do estúdio que fechou |
| Peça chamuscada | 0 | (Lucille foi salva de um incêndio; classificada como instrumento com nome) | SC | `crowd_incident` grave, `disaster` com `fire` | guitarra, amplificador ou cartaz | a casa de shows ou o mercado negro (saqueada) |
| Objeto do escândalo | 1 | Algie, o porco de Animals | FSP | `scandal` grave (≥ 60) | prop "phone" → telefone | colecionador ou mercado negro |
| Jaqueta da turnê | 0 | (jaquetas de equipe, comuns nos leilões de memorabilia) | FE | `tour_done` grande (≥ 90 mil ingressos) | outfit "jacket" | o artista |
| Credencial da turnê | 0 | (crachás all-access) | FE | `tour_done` grande | prop "pass" → credencial | um colecionador; o seu, se o ato é seu |
| Arte original | 3 | língua dos Rolling Stones, "His Master's Voice", arpilleras de Violeta Parra | FSP | `catalog_rerelease` (o original aparece no arquivo) | art → quadro | o selo; o seu, se o ato é seu |

A classificação é `realArch29(def)`: os exemplos lidos à mão (`ARCHDEF29[...].ex`) e, para o resto do catálogo, a
categoria + palavras do nome e da história (mesmo critério). 15 dos 23 arquétipos têm peça real no catálogo; os outros
8 são tipos clássicos de memorabilia que o catálogo ainda não tem.

### Nomes no estilo real (pt/en)

`make29` gera nome e tipo pela época, pelo papel do músico e por um sorteio semeado. Exemplos (de partidas reais):
- "A ES-335 "Coruja" de Robert Johnson" / "Robert Johnson's ES-335 "Owl"";
- "Os restos da Rickenbacker que Moacir Leal destruiu em Brasília" / "The remains of the Rickenbacker Moacir Leal smashed in Brasília";
- "A letra de "Stay" em papel de hotel" / "The "Stay" lyrics on hotel stationery";
- "O piano Yamaha CP-70 em que Sofia Rotaru compôs "Lightning"";
- "O acetato de teste de "Quiet Window"" (antes de 1990) / "O HD master de "…"" (depois de 2000);
- "O paletó de Domenico Modugno no Grammy de 1962" (a cerimônia sai da mesma semente da estatueta do relics18);
- "O primeiro contrato de Alceu Valença com {seu selo} (1984)";
- "O cartaz chamuscado da noite do incêndio (Carnegie Hall, 1962)";
- "A credencial all-access da turnê de {ato} (1980)".

A **história** (`story29`) é montada na hora, com o acontecimento, o ato, a pessoa, a casa de shows e a cidade
("No fim do show que entrou para a história, X destruiu a peça no palco (Canecão, Rio de Janeiro, 1978). Os pedaços foram
recolhidos e remontados."). Casa real (venues17, aberta no ano) só com nomes reais; senão, uma casa genérica da cidade.

### Arte

A arte procedural de sempre desenha pelo tipo e pelas palavras do nome (inglês). Cada arquétipo foi conferido em 4
épocas × 5 papéis contra uma lista de desenhos aceitos (teste). Dois ajustes: "console/mixing desk" → `mixer`
(relic28) e, no relic29, o que está entre aspas (título de canção) não escolhe o desenho — "Noite de Neon" não vira
letreiro de neon — e `phone` só vale como palavra.

## Gatilhos

O ouvinte (`onFact`) sorteia com `Rng.fromSeed(seed|relics29|factSeedKey17(fato))` e põe a candidata numa fila curta
(até 12). A peça só nasce no **fechamento do mês** (`flush29`, gancho `month`), depois que relics9/18/28 já criaram as
peças deles: assim não nascem duas peças do mesmo tipo para o mesmo ato no mesmo ano.

| Fato | Condição | Chance | Arquétipos |
|---|---|---|---|
| `show` | `chron:legendary_show`, `chron:liveaid`, `homecoming` ou show jogado (show27) com gravidade ≥ 60 e bom; ato famoso (≥ 35), lenda ou seu | 45% | instrumento do show, figurino, cartaz, (instrumento com nome se o líder toca guitarra/baixo) |
| `show` | `chron:stage_incident` | 30% | instrumento do show, figurino |
| `chart` | `chron:number1`, ato grande, até o 4º nº 1 (ou fama ≥ 70) | 6% | letra do hit, piano (líder vocal/teclas), instrumento com nome (guitarrista) |
| `masterwork` | — | 20% | fita master, microfone, mesa de som |
| `session_star` | — | 40% | microfone, mesa de som |
| `award` | gravidade ≥ 60 | 8% | roupa da cerimônia |
| `award` | ato seu, gravidade 30–59 | 25% | estatueta |
| `death` | ato com fama ≥ 25 ou seu | 55% | objeto pessoal, última carta |
| `split` | banda (≥ 2), fama ≥ 30 ou sua | 45% | pele do bumbo, van |
| `signing` | ato sem lançamento; seu: 35%; NPC com fama ≥ 40: 6% | — | primeiro contrato |
| `scandal` | gravidade ≥ 60, fama ≥ 35 | 15% | objeto do escândalo |
| `tour_done` | gravidade ≥ 40 (≈ 90 mil ingressos) | 35% | jaqueta, credencial |
| `retired` | fama ≥ 30 (aposentadoria que vira fato) | 50% | cartaz e figurino da despedida |
| `crowd_incident` | gravidade ≥ 50 | 50% | peça chamuscada |
| `disaster` | tag `fire` | 50% | peça chamuscada |
| `charity_show` | — | 50% | objeto autografado (vai direto a leilão) |
| `label_sold` | — | 30% | letreiro do estúdio (vai a leilão) |
| `catalog_rerelease` | — | 15% | arte original |

Atos seus têm chance ×1,6 nos gatilhos de carreira (show, nº 1, obra-prima, prêmio, separação, escândalo, relançamento).

**Tetos** (`CAPS29`): 4 peças por ano no mundo, 1 por ato por ano, 3 vivas por ato, 1 de cada arquétipo por ato,
30 vivas no total, fila de 12 por mês, 3 falsificações vivas. Ao passar de 30, sai a peça procedural mais barata que
ninguém disputa (com dono ou em museu, nunca a do seu acervo, em leilão ou roubada; as do ano corrente por último).
A poda do teto de 90 do relics9 passa por cima delas (`relicKeep9`): a poda das procedurais é a própria.

## Valor e "e até mais"

**Valor de origem** (US$ reais; a interface converte pela época com `money()`):
`base do arquétipo × (0,35 + fama/45) × (0,8 + gravidade/150) ÷ (1 + 0,2 × peças vivas do ato) × estado`
(estado: impecável ×1,15, bom ×1, gasto ×0,92, danificado ×0,85, chamuscado ×0,75; o show lendário e o incêndio já
pagam a história na base). A peça entra na meta do relics18 (`o`, `b`), então o **legado** recalcula o valor todo ano
(fama, nº 1, prêmios, lenda, morte, idade, certificado, exposição itinerante) — com o porquê no tooltip de sempre.

Valor que anda (só nas procedurais, por cima do legado):
- **morte** de quem usou a peça: ×1,25 na hora e a base sobe 10%; o que estava com o artista passa aos **herdeiros**;
- **volta/revival** (`comeback`, `revival_hit`): ×1,08 nas peças do ato;
- **escândalo** (`scandal`): ×0,95 — menos o objeto do escândalo, que sobe ×1,2;
- **aniversário** de 10/25/40/50 anos: ×1,12; o colecionador às vezes aproveita e leiloa (30%).

Ligado ao que já existia:
- **Falsificações** (`forge29`, gancho `year`, 15%/ano, só peça procedural ≥ US$ 40 mil com 2+ anos): a cópia é
  idêntica (nome, tipo, donos) e vai ao **mercado negro do crime17** (Submundo → Crime → Mercado negro) com
  "autenticidade estimada" de 45–80%. Comprar, vender ou expor sem perícia é o risco de sempre do crime17/relics18; a
  **perícia** do Acervo vivo (`authenticate18`) desmascara (a peça vira "(falsificação)" e perde 97%) — a original
  certifica (+10%).
- **Roubo e recuperação**: os de sempre (relics9: roubo, incêndio, "reaparece"; crime17: roubar relíquia, esconderijo,
  receptadores, polícia; detetive do relics9). Algumas peças já nascem roubadas (objeto do escândalo, peça chamuscada
  saqueada) e aparecem no mercado negro.
- **Colecionadores e leilões**: os de sempre (relics9: lance fechado, colecionadores arrematam, contraproposta do dono).
  O autografado do show beneficente e o letreiro do estúdio que fechou já nascem em leilão.
- **Museu**: expor na sede, ala-museu do relics18 (visitantes pelo valor das peças expostas), empréstimo a museu e a
  exposições reais (relics17). O museu do selo (Metas → Museu do selo) ganhou a lista "Relíquias do acervo".
- **Herdeiros brigam** (afterlife19): peça procedural com os herdeiros, se o espólio existe, abre uma vez
  `suit19(pid, 'relic')` (30%/ano) — o mesmo processo da guitarra-ícone do gear19.
- **Seu acervo**: peças que o selo guarda (contrato, fitas, microfone, mesa, cartaz, credencial, arte) de um ato SEU
  nascem no seu acervo — guardar, expor, emprestar, doar ou vender, pelos botões de sempre da ficha.

## Modo exato

- Ato real intocado (`histLocked`: modo exato, ato do catálogo que você não contratou nem alterou) só ganha arquétipos
  **genéricos**: cartaz, credencial, autografado, letreiro. A guitarra quebrada ou a carta de um real fica de fora.
- Com nomes reais, em qualquer modo, nenhum ato ganha peça procedural do **mesmo tipo** de uma peça real documentada
  dele (`realKinds29`: Pink Floyd tem guitarra, prop e mesa reais → nada de guitarra procedural de Pink Floyd).
- Atos inventados e o que é claramente da partida (seus atos, atos que você alterou) seguem normalmente.

## Determinismo, ids e goldens

- Sorteios só por `Rng.fromSeed` (chaves `relics29`, `relics29g`, `relics29y`), sem o `s.rng`.
- Ids próprios (`rq1`, `rq2`…): o contador global de ids do jogo não anda por causa delas.
- Mesmo assim o mundo muda nas partidas padrão (é o pedido): as peças viram notícia (`relic` → manchetes do
  factlink19) e fama/fãs/caixa dos atos andam décimos. Re-medido: `r27-p2a` e `r27-p2b` (acts `2817744560` →
  `384561456`; caixa, tours e rng iguais), com comentário. `r27-m2` compara a semente consigo mesma e segue verde sem
  mudança (o fixture r16pb-8 continua com show jogável no 9º mês).

## Números medidos (bot de 20 anos)

Medido com `npx tsx scripts/measure29relics.ts 20 r29rel 1970` (bot equilibrado, nomes reais, história livre,
1970–1989) e `… 10 …` para os 10 primeiros anos.

| | 10 anos (1970–79) | 20 anos (1970–89) |
|---|---|---|
| Peças procedurais nascidas | 37 | 77 |
| Por ano | 4 (teto) todo ano, menos 1975 (1) | idem |
| Vivas no fim | 30 (teto) | 30 (teto) |
| Bytes no save (estado `relics29` + peças vivas) | 8,3 KB | 8,5 KB |
| Comparação: peças nascidas de relics9/18/28 (fatos `relic` + `born`) | — | ≈ 700 (≈ 35/ano) |

Nascidas por arquétipo em 20 anos: roupa da cerimônia 13, figurino 10, objeto pessoal 9, instrumento do show 8,
microfone da sessão 7, objeto do escândalo 7, fita master/acetato 5, cartaz 5, última carta 4, piano do hit 2, letra
do hit 2, mesa de som 2, peça chamuscada 2, estatueta 1. Vivas no fim: 19 com dono, 6 em museus, 3 roubadas, 1 no
seu acervo, 1 em leilão; 1 falsificação viva.

Fatos-gatilho que passaram no barramento nos 20 anos (para dar a escala): nº 1 (`chron:number1`) 540, prêmios 350,
escândalos 564 (75 graves), obras-primas 115, mortes 55, incidentes de palco 52, turnês do jogador 71, separações 4,
incêndios/tumultos 11, shows beneficentes 3, relançamento 1. Nesta semente não houve show lendário, `session_star` nem
aposentadoria que virasse fato — os arquétipos ligados a eles aparecem em outras sementes e nos testes.

**Crescimento do save**: o teto de 30 peças vivas segura o tamanho — ≈ 8,3 KB nos 10 primeiros anos e ≈ 0,2 KB nos
10 seguintes (só o histórico por arquétipo e o contador). As peças entram na lista do relics9 (que já tinha teto de 90),
e a meta do relics18 e o registro compacto (`"arq|estado|proc|cidade|casa|flags"`) saem junto quando a peça sai.

O teste `tests/r29-relics.test.ts` ("run de bot de 20 anos", semente `r29rel-bot`) confere os tetos ano a ano, por
ato, total e de falsificações, a compactação e o limite de 24 KB. Na última execução: 70 nascidas, 30 vivas, 8,7 KB
(≈ 4,3 KB por 10 anos na média dos 20 anos; na prática quase tudo nos 8 primeiros anos, até o teto encher).

## Capturas (`docs/shots29reliquias/`)

- `01-lendas-reliquias.png` — Lendas → Relíquias com peças procedurais (a falsificação aparece "roubada" ao lado da original);
- `02-ficha-reliquia-procedural.png` — ficha: "História da peça", arquétipo, estado, procedência;
- `03-acervo-vivo.png` / `03b-acervo-vivo-nascidas.png` — Acervo vivo (origem, ×legado, história montada na hora);
- `04-mercado-negro-falsificacao.png` — mercado negro com a cópia à venda ("autenticidade estimada");
- `05-museu-do-selo.png` — museu do selo com "Relíquias do acervo".

As capturas usam a partida rápida (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR); o script põe peças na fila e as faz
nascer pelo `flush29` de sempre, com o teto anual aberto só para a captura.

## Lacunas

- Arquétipos sem peça real no catálogo (microfone, primeiro contrato, última carta, cartaz, autografado, chamuscada,
  jaqueta e credencial da turnê): o catálogo pode ganhar exemplos documentados.
- Não há fato de "turnê mundial" de NPC: jaqueta/credencial só nascem das turnês do jogador (`tour_done` do live18).
- A despedida depende do fato `retired` (aposentadoria com importância ≥ 3 na crônica); hiato e "turnê de despedida"
  jogada não geram fato próprio.
- A falsificação copia só peças procedurais; as reais e as do relics18 seguem com as fraudes de antes (8% dos lotes
  não catalogados em leilão, réplica encomendada no Submundo).
- O valor das procedurais é recalculado pelo legado do relics18; os multiplicadores de evento (morte, volta,
  aniversário, escândalo) somam-se a ele e decaem devagar rumo ao alvo do legado.
- `tests/r18-tutorial.test.ts` ("toda aba registrada … tem ajuda") já falhava antes desta rodada por abas de outras
  frentes R29 (`insp29`, `connect29`, `facts29`) sem texto de ajuda — fora do escopo das relíquias.

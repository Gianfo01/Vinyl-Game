# R29 — Relíquias procedurais: versões dos arquétipos reais para qualquer artista

Pedido do autor: *"bote um agente para trabalhar nas relíquias reais que existem e criar versões aleatórias delas que
podem ocorrer no mundo com qualquer artista, e até mais"*.

O catálogo real (relics17 + `data/relics18` + `data/media19b` + `data/era1889`: **107 peças**) foi lido peça a peça e
classificado em **23 arquétipos**. Cada arquétipo ganhou "versões" que nascem em **qualquer partida**, para **qualquer
artista** (real ou inventado, NPC ou seu), quando um fato que combina passa pelo barramento de fatos. Nada de fluxo
novo: a peça entra na lista de sempre (relics9) e usa os fluxos que já existiam — leilão, negociação com o dono, museu,
empréstimo/exposição, roubo, detetive, mercado negro, perícia, ala-museu (docs/act27.md, um caminho por ação).

**Segunda leva — "bem mais relíquias por save"**: a densidade virou configuração (`config.relicDensity`: **poucas /
normal / muitas / tudo**, padrão **muitas**), com tetos que escalam com o tamanho da base e com os atos famosos ativos,
repetição de arquétipo por ato (com nomes distintos), acervo histórico para o save não crescer, leilão famoso do ano,
mais ofertas no mercado negro e filtros/páginas nas telas de relíquias. "Poucas" reproduz a primeira versão exatamente.

Arquivos:
- motor: `src/sim/sys/relics29.ts` (registrado no fim de `src/sim/sys/index.ts`); `config.relicDensity` em `src/sim/types.ts`;
- interface: `src/ui/sys/relics29.ts` (pílulas, seção "História da peça", navegador com filtros e páginas
  `relicBrowser29`, linha do acervo histórico, opção de densidade), usada em `src/ui/sys/lendas9.ts` (ficha e lista de
  relíquias), `src/ui/sys/talent18.ts` (Acervo vivo), `src/ui/sys/crime17.ts` (ofertas do mercado negro),
  `src/ui/sys/live/museum.ts` (museu do selo), `src/ui/app.ts` (Opções) e `src/ui/newgame.ts` (Nova run completa →
  Regras e ritmo → Opções da partida); dica "Primeira relíquia" em `src/ui/tracks18.ts`;
- ganchos pequenos: `relics9.ts` (`addRelic` aceita id próprio; `relicKeep9` e `relicGone9` para a poda do teto de 90),
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
(12/24/48/80 por mês conforme a densidade). A chance da tabela é a de "poucas"; as outras multiplicam (×2 normal, ×5
muitas, ×8 tudo; teto de 95%). A peça só nasce no **fechamento do mês** (`flush29`, gancho `month`), depois que relics9/18/28 já criaram as
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

Gatilhos a mais a partir de "normal" (a densidade "poucas" fica só com os de cima):

| Fato | Condição | Chance (antes do multiplicador) | Arquétipos |
|---|---|---|---|
| `legend` | o ato vira lenda | 35% | instrumento com nome (guitarra/baixo), figurino, objeto pessoal |
| `award` | `chron:hall_of_fame` | 30% | instrumento com nome, figurino |
| `award` | gravidade 40–59, ato grande | 4% | roupa da cerimônia, estatueta |
| `chart` | marco fora do nº 1 (nº 1 num país, top 10 lá fora), gravidade ≥ 60, ato grande | 3% | letra do hit, microfone da sessão |
| `scandal` | gravidade 40–59, fama ≥ 35 | 5% | objeto do escândalo |

## Densidade (`config.relicDensity`)

Fica no config porque muda o mundo. Escolha na Nova run completa (Regras e ritmo → Opções da partida → "Relíquias") e,
durante a partida, nas Opções (vale daqui em diante; as peças que já existem ficam). Ausente = "muitas".

| | Poucas | Normal | Muitas (padrão) | Tudo |
|---|---|---|---|---|
| Teto por ano (mundo médio) | 4 (fixo) | 10 | 24 | 40 |
| Por ato por ano (superestrela) | 1 | 1 | 2 | 3 |
| Vivas por ato (superestrela) | 3 | 6 | 12 | 16 |
| Mesmo arquétipo por ato | 1 | 2 | 3 | 5 |
| Vivas no total | 30 | 150 | 400 | 500 |
| Falsificações vivas | 3 | 6 | 15 | 15 |
| Multiplicador de chance | ×1 | ×2 | ×5 | ×8 |
| Acervo histórico a partir de | — | 10 anos | 6 anos | 5 anos |
| Falsários por ano · leilão do ano | 1 · — | 1 · 30% | 2 · 60% | 3 · 90% |

- **Escala do teto anual** (`caps29`, menos em "poucas"): × tamanho da base (`dbSize`: pequena 0,6 · média 1 · grande
  1,25 · enorme 1,5) × atos famosos ativos (fama ≥ 35, ativos ou em ascensão: n/30, entre 0,5 e 1,6).
- **Por ato** (`actCaps29`): lenda ou fama ≥ 70 levam o teto cheio; fama ≥ 45 ou ato seu, metade; o resto, um quarto
  (mínimo 1). Em "muitas": superestrela 12 vivas e 2 por ano; ato médio 6 e 1; ato pequeno 3 e 1.
- **Repetição com nome distinto**: a segunda e a terceira guitarra/figurino/letra do mesmo ato sorteiam outro modelo,
  apelido, peça ou cidade; se o nome ainda coincidir com uma peça viva do ato (5 tentativas), a peça não nasce.
- **Dedupe com relics9/18/28**: continua (nada procedural do mesmo tipo de uma peça deles para o mesmo ato no mesmo ano).
- **Teto total**: ao passar dele, sai a peça procedural mais barata que ninguém disputa (com dono ou em museu; sem
  opção, uma roubada fora do esconderijo e do mercado). A poda do teto de 90 do relics9 passa por cima delas
  (`relicKeep9`); quando ela tira uma procedural perdida, `relicGone9` limpa o registro compacto na hora (e o fechamento do mês confere).
- **Acervo histórico** (`archive29`, gancho anual): peça procedural com dono comum (ou roubada e sumida), mais velha que
  a idade da tabela e abaixo do 3º quartil de valor sai da lista e vira contagem por ato (`arc`: quantas e valor somado).
  Ficam sempre: o quarto mais valioso, peças de lendas e do seu elenco, em museu, leilão, no seu acervo, falsas. A
  interface mostra "Acervo histórico: N peças antigas de K atos resumidas (valor somado)".

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
  O autografado do show beneficente e o letreiro do estúdio que fechou já nascem em leilão. Com mais peças, há mais
  lotes (o relics9 leiloa 2%/ano das peças com dono e 20% das de quem morreu). A partir de "normal", o **leilão do ano**
  (`famousAuction29`): a peça procedural mais valiosa com colecionador ou herdeiros (3+ anos) vai a pregão, com crônica,
  fato (`relic` + `auction` + `famous`: manchete e fama pelo factlink19) e aviso.
- **Mercado negro maior**: a partir de "normal", uma peça procedural roubada ganha às vezes oferta no mercado de sempre
  do crime17 (até 8 ofertas; as falsas pedem até 10), com a mesma "autenticidade estimada".
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
  factlink19) e fama/fãs/caixa dos atos andam décimos. Primeira leva: `r27-p2a`/`r27-p2b` re-medidos (só acts).
- Segunda leva ("muitas" por padrão: 22 peças em 8 meses de 1975 na semente dos goldens, contra 3): caixa, acts e rng
  mudam, tours igual — `450735 / 2386675548 / 2839816166` → `458975 / 1776542358 / 3652250691` em `r27-p2a` e
  `r27-p2b`, com comentário. Com `relicDensity: 'few'` a mesma semente dá exatamente os valores de antes (conferido).
  `r27-m2` compara a semente consigo mesma e segue verde.

## Números medidos (bot de 20 anos)

Medido com `npx tsx scripts/measure29relics.ts 20 r29rel 1970 real many` (bot equilibrado, nomes reais, história livre,
base média, 1970–1989) e `… 10 … {few|normal|all}` para as outras densidades. "Bytes" = estado `relics29` + peças
procedurais na lista do relics9 + a meta delas no relics18 (o que estas peças pesam no save).

| Densidade | Nascidas por ano | Vivas | Acervo histórico | Bytes em 10 anos | Bytes em 20 anos | Ganchos de relíquia |
|---|---|---|---|---|---|---|
| Poucas | 4 (teto; 1975: 1) | 30 | — | 9,8 KB | — | 4,1 ms/mês |
| Normal | 7–16 (média 10,7) | 105 | — (começa aos 10 anos) | 34,3 KB | — | 4,8 ms/mês |
| **Muitas** | **16–38 (média 22,8)** | 153 (10 anos) · **283 (20 anos)** | 39 · **149 peças de 88 atos** | **48,3 KB** | **91,8 KB** | 6,0–9,5 ms/mês |
| Tudo | 19–36 (média 27,2) | 194 (10 anos) | 68 peças de 49 atos | 62,2 KB | — | 7,0–11,6 ms/mês |

"Muitas", 20 anos: 455 peças nascidas — roupa da cerimônia 67, microfone da sessão 50, figurino 47, letra do hit 44,
mesa de som 41, fita master/acetato 38, objeto do escândalo 37, piano do hit 32, objeto pessoal 23, instrumento do show
17, estatueta 10, cartaz 9, última carta 8, peça chamuscada 7, credencial 6, primeiro contrato 4, autografado 4,
instrumento com nome 4, jaqueta da turnê 3, pele do bumbo 3, arte 1. Vivas no fim: 222 com dono, 14 em museus, 24
roubadas, 14 no seu acervo, 9 em leilão; 6 falsificações vivas; 114 atos com peça, no máximo 12 por ato. 13 leilões do
ano em 20 anos. Nos anos 80 o mundo tem mais atos famosos ativos e o teto anual cresce junto (29–38 peças/ano).

**Custo**: os ganchos de relíquia somados (relics9/17/18/28/29 nos ganchos de mês e ano + os ouvintes de fato do
relics29, medidos com `__hookProf`) ficam em 4–12 ms por mês de jogo, 0,2–0,6% do mês inteiro (2–4,5 s por mês nesta
máquina, com outras runs em paralelo). O relics29 sozinho: ~3–5 ms/mês no fechamento (fila, nascimento, compactação,
mercado) e ~2–3 ms/mês nos ouvintes de fato. Para comparar, o `week:hype12` sozinho custa 35–55 ms/mês.

**Save**: o save inteiro tem 13 MB aos 10 anos e 19 MB aos 20; as relíquias procedurais são ≈ 0,4–0,5% dele (≈ 4,6 KB
por ano em média em "muitas", 91,8 KB em 20 anos — abaixo da meta de 100 KB). Cada peça viva pesa ≈ 320 bytes (nome
pt/en, donos, meta de valor); a história não é guardada (montada na hora), o registro é `"arq|estado|proc|cidade|casa|flags"`
e o multiplicador de legado das procedurais é arredondado a 3 casas. O acervo histórico segura o crescimento: sem ele,
"muitas" passaria de 400 peças vivas e ~130 KB em 20 anos.

O teste `tests/r29-relics.test.ts` confere os tetos de "poucas" (5 anos) e de "muitas" (20 anos, semente
`r29rel-bot`): por ano (≤ 24 × 1,6), por ato e ano (≤ 2), por ato vivas (≤ 12), total (≤ 400), falsas (≤ 15), pelo
menos 150 nascidas e 10 arquétipos, acervo histórico ativo, registro compactado e menos de 100 KB. Na última execução:
453 nascidas, 283 vivas, 137 no acervo histórico, 90,0 KB.

## Interface com centenas de peças

`relicBrowser29` (filtros guardados na sessão, só redesenha a própria lista): busca por peça ou artista, ato (os 80
com mais peças, com a contagem), arquétipo (procedurais pelo registro; reais pela classificação do catálogo; "outras"
para as do relics9/18/28), época (década), dono (com dono, seu acervo, museus, leilão, roubadas), valor mínimo
(US$ 10/50/250 mil em dinheiro de hoje), ordem (mais valiosas, mais novas, mais antigas) e páginas ("‹ Anterior ·
página x de y · Próxima ›", em cima e embaixo). Entra em: Lendas → Relíquias (24 por página, com os chips de estado de
sempre), Acervo vivo (seu acervo acima de 12 e "Nascidas nesta partida", 12 por página — antes eram só as 24 mais
novas), ofertas do mercado negro (acima de 6, 8 por página) e museu do selo (12 por página). A linha do acervo
histórico aparece em Relíquias e no Acervo vivo.

## Capturas (`docs/shots29reliquias/`)

- `01-lendas-reliquias.png` — Lendas → Relíquias com peças procedurais (a falsificação aparece "roubada" ao lado da original);
- `02-ficha-reliquia-procedural.png` — ficha: "História da peça", arquétipo, estado, procedência;
- `03-acervo-vivo.png` / `03b-acervo-vivo-nascidas.png` — Acervo vivo (origem, ×legado, história montada na hora);
- `04-mercado-negro-falsificacao.png` — mercado negro com a cópia à venda ("autenticidade estimada");
- `05-museu-do-selo.png` — museu do selo com "Relíquias do acervo";
- `06-filtros-por-arquetipo.png` — Lendas → Relíquias com ~90 peças e o filtro "O figurino icônico" (9 peças);
- `07-opcoes-densidade.png` — Opções: "Relíquias: Muitas — ~15–30 por ano, até 400 vivas…".

As capturas usam a partida rápida (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR); o script põe peças na fila e as faz
nascer pelo `flush29` de sempre (mais uma leva de 70 peças para os filtros e páginas aparecerem), com o teto anual
aberto só para a captura.

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
- A densidade muda nas Opções só daqui em diante; trocar para "poucas" não apaga o que já nasceu (as peças acima dos
  tetos novos saem aos poucos pela poda própria).
- O acervo histórico guarda só contagem e valor por ato: as peças arquivadas não voltam para a lista (nem para leilão
  ou roubo). Um "leilão do espólio" que as trouxesse de volta ficaria para depois.
- O teto anual escala com os atos famosos ativos, contados no fechamento do mês em que há fila (não há cache por ano).

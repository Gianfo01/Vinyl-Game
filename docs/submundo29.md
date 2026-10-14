# Submundo: ligações, famílias e "contratar a família" (rodada 29)

O autor fez três pedidos:

1. "acho que as ligações dos crimes com personagens não refletem: em uma menciona Frank Sinatra, mas em membros ele
   não aparece";
2. "acho que devemos ter mais opções de interações (com possíveis consequências) com as organizações criminais";
3. "em coisas do submundo (até selecionando com botão direito) devemos ter opções de contratar tal família (com
   consequências e nos fazendo dever favor...)".

## 1. Ligações pessoa ↔ organização: uma fonte só

**Causa raiz.** Cada vista lia um pedaço diferente:

- **Card da organização.** Os laços documentados de `ORGS17.ties` eram só texto por nome ("Frank Sinatra (1960): …")
  e não apontavam para a pessoa do mundo. "Membros conhecidos" lia só o `crimemem23` e "Andam com eles" só o
  `crime17.ties`.
- **Ficha da pessoa.** O bloco Conexões › Submundo mostrava só o laço de rua do ato e o registro de crimes. Não
  aparecia laço documentado, filiação nem dívida.
- **Menu e busca.** Nada.

**Agora.** `src/sim/sys/orglinks29.ts` (`orgLinks29` / `linksOfKey29`) junta tudo:

- os laços documentados, ligados à pessoa pelo nome canônico (artista `p:`, empresário `e:`, produtor `pd:`, líder
  `l:`);
- as filiações do `crimemem23`;
- os atos associados (`crime17.ties`);
- os favores, dívidas, segredos e mágoas do `holds17`;
- a sociedade com o jogador.

Cada ligação tem um rótulo: **ligação**, **membro**, **associado**, **deve favor**, **a família deve a ele(a)**,
**inimizade** ou **sócio(a)**. Até a rodada 29b, o primeiro se chamava "ligação documentada" e havia um selo extra
"nesta partida (simulado)". Os dois saíram da interface na 29c, a pedido do autor (veja a regra de segurança).

As vistas que leem dessa fonte:

- o card da organização (Ligações);
- a ficha do artista (Conexões › Submundo);
- a ficha da indústria (aba Submundo, para Morris Levy, Suge Knight…);
- o menu de ações ("{família}: {tipo} ›");
- a busca (Ctrl+K acha as famílias).

**História.** Segue a mesma regra da crônica `DOC17`. No modo "Vida real exata", valem todos os laços documentados
até o ano atual. Nos modos livres, valem só os anteriores ao início da partida; depois disso a história é simulada
(filiações, laços de rua, favores).

**Auditoria.** `audit29` ganhou o código **R10**: uma ligação que aparece num lado e não no outro, ou o laço
documentado de alguém que existe no mundo mas não está ligado. O resultado é 0 nas sementes e épocas do teste
(1960 exato; 1965, 1975, 1992 e 2006 livres; e 1975 depois de meses simulados com favores).

## 2. Famílias: interações com consequência

Tudo está em `src/sim/sys/mob29.ts`. Cada família tem um **medidor visível** com respeito, medo, dívida e hostilidade.

| Interação | Custo e chance | Consequências |
|---|---|---|
| Aproximar-se | jantar e presente | relação +15, respeito, calor +3 |
| Negociar proteção (pagar pizzo) | taxa mensal | respeito, medo, calor; shows sem depredação |
| Recusar / parar de pagar proteção | — | hostilidade +20, mágoa; ~30% de show depredado por mês durante 6 meses |
| Pedir empréstimo | agiota (vices + shark27) ligado à família | dívida (holds17) e segredo; atrasar traz visita |
| Lavar dinheiro pelo seu selo | — | renda mensal, calor, segredo provado, caso de crime organizado |
| Show na boate deles | cachê com 30% para a casa; chance de não ter batida | embalo; batida = multa, calor, estresse e cena de batida |
| Jukebox / jabá da família | taxa; risco de exposição | +35% nas paradas por 6 semanas; favor devido; exposto = memória "payola" (cena), reputação e caso |
| Proteção de artista | taxa mensal | crimes contra o ato −25%; favor devido |
| Virar sócio | precisa de respeito 50 e relação 30 | renda mensal, sem pizzo, calor, segredo, risco de RICO; sair = hostilidade e mágoa |
| Quitar a dívida | proporcional ao favor | zera os favores e os pedidos; respeito +, hostilidade − |
| Delatar à polícia | — | caso contra eles e reputação; hostilidade +50, medo +25 e vingança |

Os efeitos da época e da região:

- Lei Seca: boates com bônus.
- Anos 1950–79: a era das boates e jukeboxes, com o maior bônus de boate. As jukeboxes acabam depois de 1985 e o
  jabá vira playlist depois de 2005.
- Cartéis nos anos 1980–90.
- Era digital.
- A família só age no próprio país, a menos que tenha poder 85+ (alcance internacional).

## 3. Contratar a família

Os serviços são os crimes de sempre, executados pela organização (`commitCrime` com ator `o:<família>`):

- intimidar ("convencer" um rival, um devedor ou um jornalista);
- cobrar com um segredo;
- sabotar;
- fazer um problema sumir (polícia, testemunha ou juiz);
- pressionar rádio e DJs;
- rodar uma pirataria;
- grampear;
- roubar uma relíquia;
- encomendar uma morte.

Comparado a fazer você mesmo, a família traz:

- mais chance: +8% e a cobertura da organização;
- menos calor para você: 35% do calor; se o serviço vier a público, há 45% de chance de a polícia ligá-lo a você;
- uma taxa;
- um **FAVOR DEVIDO**: uma obrigação no `holds17` (fonte `mob29`) com data de cobrança.

**Cobrança.** Quando chega a data, a família faz um pedido com prazo de 4 semanas, que aparece na caixa de entrada,
no Cockpit e no card. Ela pode pedir para você:

- assinar o afilhado dela;
- escalar um artista seu na boate;
- lavar dinheiro;
- esconder alguém;
- dar uma parte de um lançamento;
- votar como ela quer.

**Cumprir** quita o favor e sobe a confiança. **Recusar**, ou deixar o prazo vencer, mantém a dívida e a família
escala:

1. ameaça;
2. sabotagem do disco;
3. intimidação do líder;
4. incêndio no estúdio.

Com respeito alto, a família também oferece trabalho: dinheiro e calor, e a partir daí ela fica devendo a você.

**Um caminho só** (docs/act27.md). O card da organização, o submenu do clique direito e o planejador do Submundo
chamam as mesmas funções: `doMob29`, `hire29`/`hireOdds29` e `fulfill29`/`refuse29`.

- **Menu da organização:** os pedidos, "Contratar a família para… ›" (abre o planejador com a família como
  executora) e as interações.
- **Menu de uma pessoa, um ato ou um selo:** "Contratar {família} para… ›", com as 3 famílias da área. O submenu traz
  os serviços que cabem naquele alvo, com chance, custo, taxa, calor e o favor devido.
- **Planejador:** o executor pode ser "Contratar {família} (a família executa)".

Os bloqueios sempre mostram o motivo:

- a família não existe na época;
- organização real no modo exato;
- fora da área;
- calor 70+;
- hostilidade alta;
- alvo morto ou inválido (`targetBlock17`);
- caixa.

## 4. Votação de prêmio comprada (`src/sim/sys/rig29.ts`)

"Manipular a votação de um prêmio" agora é uma ação de verdade, com três entradas e um caminho só (`rigAward29`):

- **Ação direta do Submundo** (crime `award_rig`, para qualquer ato, o seu ou outro): no Planos, escolhe-se o prêmio
  e o método. O menu de um ato tem "Manipular a votação de um prêmio…".
- **Serviço de "Contratar {família} para…"**: famílias tradicionais subornam um jurado; o crime digital usa robôs no
  voto popular.
- **Pedido "vote como a gente quer"**: a família indica o protegido dela. Se você tem voto na academia (reputação
  institucional 50+ ou 3+ prêmios), seu voto pesa mais; sem voto, você faz lobby, e isso custa dinheiro.

Os métodos dependem da época:

| Método | Época | Força | Chance base de vazar |
|---|---|---|---|
| Subornar um jurado | sempre | 6 | 22% |
| Lobby na academia | sempre | 4 | 12% |
| Encher as urnas do voto popular | 1950–1999 | 5 | 28% |
| Fazenda de robôs no voto online | 2005+ | 7 | 30%, sobe com os anos |

A compra entra nos prêmios que existem, cada um pelo seu gancho. Sem compra, todos os ganchos devolvem 0 e nada muda.

- **Gramófonos** (`GRAMO_ADJ`): pesa na indicação e na noite.
- **Prêmios do Ofício** (`CRAFT_ADJ28`).
- **Prêmio da Crítica** (`CRITIC_ADJ29`).
- **Prêmios nacionais de júri local** (`juryMemHook`).
- **Hall da Fama** (`HALL_ADJ9`).

**Exposição.** Quando o ato ganha com voto comprado, há um sorteio de exposição (o método mais o calor). Se vazar:

- o prêmio é **cassado** (fato `award_revoked`, que tira fama, gera manchete e estresse);
- sai um escândalo (facções de fãs e imprensa);
- a reputação institucional cai;
- o calor sobe e abre um caso na polícia;
- a cena de escândalo mostra tudo isso.

Se a compra não ganhar nada, ela vence em cerca de um ano, com uma pequena chance de vazar mesmo assim.

## 5. Crime digital (anos 1995+) (`src/data/cyber29.ts`)

São organizações **inventadas** (ids `f…`), como as fictícias de sempre. Elas existem em todos os modos e são
claramente fictícias.

| Organização | Época | Base | Ramo |
|---|---|---|---|
| Cena 0day "Nulo" | 1995–2014 | cidade-base | vazamentos, darknet |
| Coletivo Vazamento Zero | 1999+ | Kiev | vazamentos/ransomware, vozes, lavagem |
| Fazenda de Plays Aurora | 2005+ | Manila | fazendas de streams, robôs |
| Rede Bilhete-Bot | 2008+ | cidade-base | cambismo por robôs |
| Mercado Sombra | 2011+ | Berlim | darknet, pirataria, lavagem |
| Estúdio Espelho | 2015+ | Seul | vozes clonadas por IA, robôs |

Elas agem online, então alcançam qualquer país. O emblema delas é um chip (`emblem28`, tipo `cyber`), com trilhas de
circuito e as cargas chip/robô.

Ficam **fora** da lista padrão `orgs17(s)`, porque os NPCs e o mundo não as usam (mundo sem interação fica igual).
Entram pelo mob29: medidor, interações e serviços.

Os serviços estão ligados às fraudes de sempre:

| Serviço | Como funciona |
|---|---|
| Inflar streams | Fazenda do `stream18`. As plataformas procuram e, se acharem, há derrubada, multa, lista negra e escândalo. |
| Vazar o álbum de um rival | Sabotagem `release`. |
| Invadir um selo (hack/DDoS) | Grampo. |
| Expor um jornalista ou rival (doxxing) | Intimidação. |
| Cambismo por robôs no seu show | Dinheiro. Se vier a público, escândalo com os fãs. |
| Clonar a voz de um astro | Fato `ai_voice_fake` (`fakes19`: pressão pela lei de voz e confiança da vítima). Se vier a público, derrubada, caso e reputação. |
| Pirataria na darknet | Pirataria. |
| Robôs no voto popular de um prêmio | Votação comprada pelo `rig29`. |

## 6. Cockpit "Favores e dívidas" e calendário

O Cockpit ganhou o cartão **Favores e dívidas** (categoria M44 Submundo/Jurídico). Ele só aparece quando há algo e
lista:

- os pedidos com prazo e o nível de escalada;
- o que você deve e quando cobram;
- o que as famílias devem a você;
- os medidores das famílias com que você lida.

As ações rápidas chamam as mesmas funções do card da organização: **Cumprir**, **Negociar prazo** (+4 semanas, uma
vez, com custo e respeito −2), **Recusar** e **Pagar** (quita a dívida).

Os prazos entram no **calendário único** (`registerDeadline('mob29')`), e com isso também na agenda/grade do S03 e no
Cockpit.

## Facções × gêneros e cenas (`src/sim/sys/aff29.ts`)

O autor pediu: "veja como conectar facções a certos artistas, gêneros e movimentos, como o Comando Vermelho com o funk
proibidão". A ligação é **cultural**: uma organização tem afinidade com um gênero ou cena, com época e território (o
país dela). Datas reais só onde são bem documentadas.

| Organização | Gênero / cena | Época | Tipo |
|---|---|---|---|
| Comando Vermelho | funk carioca ("proibidão" nos bailes do Rio) | 1995+ | documentada |
| Bonde da Laje (inventada) | funk carioca (bailes da laje) | 1995+ | de jogo |
| PCC | funk proibidão e ostentação em São Paulo | 2001+ | documentada |
| Cartel de Sinaloa | narcocorridos (norteño), corridos tumbados | 1989+ | documentada |
| Camorra | neomelódicos (canção napolitana) | 1990+ | documentada |
| Yamaguchi-gumi | enka e a promoção de shows (kōgyō) | 1950–1992 (lei antiyakuza) | documentada |
| Sumiyoshi-kai | enka nas casas noturnas | 1958–1992 | de jogo |
| Mob Piru Bloods | gangsta rap da Costa Oeste | 1988+ | documentada (processos públicos) |
| Southside Compton Crips | gangsta rap da Costa Oeste | 1988+ | de jogo |
| Os do Quarteirão (inventada) | drill de Chicago | 2012+ | de jogo |
| Turma do Código Postal (inventada) | drill britânico / road rap | 2014+ | de jogo |
| Shower Posse | dancehall dos "garrisons" de Kingston | 1980–2010 | documentada |
| Chicago Outfit / Família Genovese | boates e jukeboxes (doo-wop, jump blues, jazz e pop) | 1945–1979 | documentada (audiências de 1959) |
| Solntsevskaya Bratva | chanson russo (no jogo, dentro de Estrada) | 1990+ | de jogo |

Uma organização real bem conhecida entrou, com descrição neutra: o PCC (fundado em 1993). As especulativas são
**inventadas** (`STREET29`, como o crime digital, fora da lista padrão).

Efeitos, sempre pelos sistemas de sempre e sobre o que é **seu** (o mundo sem você fica igual):

- **Pedidos da facção** a um ato seu do gênero, no território dela (pedidos do mob29 com prazo):
  - **convite para o baile ou evento**: cachê, fama, embalo e divulgação de rua; risco de batida policial (cena de
    batida) e de pânico moral (escândalo para as facções de fãs e a imprensa);
  - **pedágio** para tocar: recusar escala como uma dívida;
  - **pressão para escrever sobre eles**: o ato passa a andar com a facção. É o laço de rua de sempre
    (credibilidade, rixas), marcado como desta partida, com pânico moral, censura e calor.
- **Movimentos** (`movements9`) de um gênero da facção, no território dela e com ato seu dentro, crescem mais rápido,
  mas carregam estigma (escândalo de vez em quando).
- A **cena** aparece no card da organização e na página do ato (Conexões › "A cena e o submundo"): o nome da cena e a
  nota. Desde a rodada 29c não há selo "cena documentada" / "afinidade de jogo" (pedido do autor).

### Regra de segurança (pessoas reais) — revista na rodada 29c

O autor mudou a regra duas vezes nesta rodada. A versão em vigor:

- A afinidade é de **gênero e cena**, nunca de pessoa. O que vira ligação é o que **acontece** na partida: um ato
  (seu ou do mundo) aceita a facção.
- **Modos livres** (inclusive o padrão de nomes reais, em que tudo depois do início é história desta partida):
  qualquer facção aborda qualquer ato da cena dela, real ou inventado, e o laço que nasce disso aparece na ficha e no
  card como qualquer ligação.
- **Modo "Vida real exata"** (`history: 'strict'`, opção "exato" do Mundo): a facção **não** aborda artista real
  (ato do catálogo ou com integrante real) sem um laço documentado (`ORGS17.ties`) entre ela e alguém da formação.
  Atos inventados podem ser abordados.
- **Sem rótulo na interface.** Ficha, card, menu, feed e busca não distinguem "ligação documentada" de "nesta partida
  (simulado)": mostram só o tipo da ligação (ligação, membro, associado, deve favor…). A marca `OrgLink29.sim` ficou
  só interna, para o filtro do modo exato e para a auditoria R10.
- O `orglinks29` continua escondendo o que é sorteado **em segundo plano** para gente real (filiação do `crimemem23`,
  laço de rua aleatório do `crimenpc17`, dívida com agiota de NPC). Só aparece o documentado e o que aconteceu na
  partida (jogada sua, abordagem aceita). No modo exato, a defesa se repete: laço de abordagem de ato real sem
  documentado com a mesma organização some.

## Facções e artistas do mundo (rodada 29c, `src/sim/sys/aff29npc.ts`)

O autor pediu: "ajuste isso — Limitação: por enquanto, só os seus artistas recebem esses pedidos das facções". Agora
as facções das cenas abordam também os **atos NPC** (de selos rivais e independentes), com os mesmos gatilhos: gênero
ou família na lista da afinidade, cidade no país da organização, época da afinidade, da organização e do gênero.

**Ritmo.** Chance mensal por ato de 1% a 5%: sobe com a fama do ato e o estigma da cena, e cai quando a cena tem
muitos atos (mais de 40). Cada organização faz no máximo 1 abordagem por mês (2 nas cenas de estigma 0,6+), e a mesma
facção espera 1 ano para voltar ao mesmo ato. Organização desmantelada não aborda. Numa partida de 1975 são cerca de
dez abordagens por ano no mundo todo.

**O pedido** é o mesmo sorteio dos seus atos (`pickAsk`): tocar no baile/boate, pagar o pedágio ou escrever sobre eles.

**A decisão do NPC** (`decide29n`, pura, com o porquê):

| Fator | Efeito na chance de aceitar |
|---|---|
| Traços do líder | rua, rebelde, polêmico, oportunista, festeiro + · disciplinado, reservado, religioso, engajado, tímido − · pedágio: ansioso paga, resiliente bate o pé · enraizado topa o baile |
| Personalidade | ambição (baile) +, disciplina −, abertura + |
| Selo | major −25% (mais com estigma alto) · selo de cena +8% · sem selo +12% |
| Época | anos 1945–79 com máfia/sindicato/firma: +10% no convite para a boate |
| Dinheiro e fama | caixa baixo +10% · fama 50+ −12% · fama abaixo de 15 +6% |

**Os desfechos**, sempre pelos sistemas de sempre:

- **Tocou**: cachê no caixa do ato, embalo, fama e fãs fiéis; calor para a facção. Risco de **batida policial** (fato
  `arrest`, estresse da formação, caso no `crime17` contra a facção — fora no modo exato com organização real) e de
  **pânico moral** (`scandal17`). Batida ou escândalo podem fazer o selo **dispensar** o ato.
- **Gravou a faixa**: o laço de rua de sempre (`crime17.ties` → credibilidade de rua e rixas do `crimenpc17`), imagem
  pública menor, **censura** (escândalo com a etiqueta `censorship`) e chance alta de dispensa por major.
- **Pagou o pedágio**: sai do caixa do ato.
- **Recusou o pedágio**: recados para a equipe e shows cancelados no território (fora de cena, sem detalhe), embalo e
  estresse; o ato fica **sob pressão** por 6 meses.
- **Recusou o convite ou a faixa**: profissionalismo sobe; se outro ato da mesma facção e família de gênero topou no
  último ano, nasce uma **rixa de cena** (`crime17.feud`, fato `feud`).
- **Selo dispensa** (`contracts.endContract` + fato `exit`): major quase sempre, selo de cena raramente. O ato
  dispensado fica sob pressão.
- **Movimento** do gênero (`movements9`) com ato que topou cresce mais rápido.
- **Reputação de selo** (`labelrep28`): selo com artista do elenco que topou uma facção nos últimos 3 anos perde peso
  nas ofertas ("2 artistas do elenco ligados a facções").

Cada abordagem gera o fato novo **`faction_approach`**. Ele é público quando o ato topa e boato quando recusa ou paga.
O `labelrep28` é o consumidor, e o teste r19-infra passa. Nenhum modificador de apelo novo, então o `caps18` não muda.

**Onde aparece.**

- **Feed do Mundo**: o resumo do mês trata `faction_approach` como notícia de cena.
- **Ficha do ato** (Conexões): a seção "Facções e o artista" mostra o pedido, a decisão, os desfechos e o selo da
  época, e avisa quando o ato está sob pressão ou foi tirado do esquema por você. A ligação também aparece no bloco
  Submundo.
- **Card da organização**: "Artistas da cena que eles procuraram", e o nome de cada ato abre o menu dele.
- **Ficha do selo rival** (Fatos e rivalidade): "Elenco e facções", com quem topou, quem recusou e quem foi
  dispensado.
- **Aviso**: se você conhece o ato (está no seu radar), recebe a notícia.

**O que você pode fazer** (um caminho só: o menu de ações do ato chama as funções do sistema, e o card leva ao menu):

- **Denunciar a ligação** (`denounce29n`): só depois de o ato topar (tocou ou gravou), uma vez por ano, e nunca contra
  artista real no modo exato. A chance é de 45% mais a reputação institucional/200, e sobe se houve faixa ou laço.
  - Se colar: escândalo para o ato, caso contra a facção, reputação institucional +2, rivalidade com o selo do ato,
    confiança do ato em você cai. A facção guarda mágoa e a hostilidade dela no `mob29` sobe.
  - Se não colar: reputação −1, e a facção fica sabendo de onde veio.
- **Tirar do esquema (oferecer proteção)** (`rescue29n`): para ato com laço ou sob pressão. Você paga o acerto à
  facção; o ato sai do laço, ganha confiança em você e fica **devendo um favor** (`holds17`).
- **Negociação**:
  - Ato sob pressão: a sua proposta pesa +8% ("quer mudar de ares").
  - Ato tirado do esquema por você: a proposta pesa +15%.
  - Ato com selo sob pressão, com laço ou tirado do esquema: o **buyout** sai 25% mais barato e o selo vende mais
    fácil (+20%).

**Determinismo.** O módulo usa `Rng.fromSeed` com a chave `aff29npc` por mês (e por ação do jogador) e não consome
fluxo compartilhado. O gancho vem logo depois do `aff29` e antes do `facades19`. O estado `x4.aff29n` nasce na
primeira abordagem; `OFF29N.all` desliga o módulo para bisecção.

**Testes de referência re-medidos** (o mundo muda de propósito):

- `r27-p2a` e `r27-p2b`: caixa 450735 → 18103, acts 2386675548 → 3004344608, rng 2839816166 → 2202780102; tours
  igual. O caixa do playbot nessa semente oscila centenas de milhares de mês a mês.
- `r27-m2`: o fixture r16pb-8 quebra antes do show e passa a ser r16pb-4.
- `r27-m3` não muda.

## Testes da rodada 29b

O mesmo arquivo `tests/r29-underworld.test.ts` agora cobre:

- **Prêmio comprado:**
  - muda o vencedor dos Gramófonos;
  - ganhou e vazou → prêmio cassado, `award_revoked`, reputação;
  - os outros prêmios leem a compra (Ofício, Crítica, nacionais, Hall);
  - ação direta e métodos por época;
  - o serviço da família;
  - o pedido de voto, com e sem voto na academia.
- **Crime digital:**
  - aparece por época e nunca na lista padrão;
  - streams, vazamento e clone de voz ligados a `stream18` e `fakes19`;
  - fora de época, bloqueia com o motivo.
- **Cockpit e calendário:**
  - linhas, prazos, ações e "negociar prazo";
  - o que a família deve a você;
  - o cartão some sem dívidas.
- **Facções × cenas:**
  - CV ↔ funk (1995+), PCC (2001+), Sinaloa ↔ norteño (1989+), Yamaguchi ↔ enka (até 1992);
  - um ato seu no Rio recebe pedidos da facção;
  - a homenagem vira laço da partida (marca interna), com R10 = 0;
  - laço sorteado em segundo plano para pessoa/ato real nunca aparece (varredura);
  - determinismo.

`tests/r29-aff-npc.test.ts` (rodada 29c) cobre:

- atos NPC abordados no mundo sem o jogador, com o teto por organização e mês;
- decisões que variam com o selo, os traços e a fama;
- desfechos na ficha do ato, no card, na ficha do selo, no `labelrep28`, no feed do Mundo e no menu de ações;
- batida com caso contra a facção, ameaça do pedágio e rixa de cena;
- denunciar, tirar do esquema, proposta e buyout;
- a regra: no modo padrão, ato real pode ser abordado por facção real; no modo exato, só com laço documentado
  (Sinatra × Outfit), com varredura;
- determinismo, e nenhum estado com o módulo desligado.

## Determinismo

- Os sorteios usam `Rng.fromSeed` com a chave `mob29`.
- O estado (`x4.mob29`) só nasce na primeira interação do jogador, e o gancho mensal não faz nada sem ele.
- Os ganchos de chance (proteção de artista) e de pizzo (sócio) também só agem com esse estado.
- Nenhum tipo novo de fato ou fonte de apelo no `mob29`: as cenas são as de sempre (`arrest` → batida; memória
  `payola` → jabá). O `aff29npc` (rodada 29c) criou um tipo: `faction_approach`, ouvido pelo `labelrep28`.
- Os testes de referência `r27-p2a`, `r27-p2b` e `r27-m2` passaram sem remedição na rodada 29b. Na 29c foram
  re-medidos por causa das abordagens aos artistas do mundo (veja "Facções e artistas do mundo").

## Testes e capturas

`tests/r29-underworld.test.ts` cobre:

- Sinatra × Outfit e Morris Levy × Genovese nos dois lados;
- a regra de história;
- R10 = 0;
- cada interação, com custo, chance, consequência ou motivo;
- o favor devido e a cobrança dele;
- a escalada;
- os menus (organização, pessoa, ato, selo e o submenu);
- época, região e calor;
- o determinismo e o mundo sem interação, que fica igual.

As capturas estão em `docs/shots29submundo/` e são geradas por `node scripts/shots29submundo.mjs`, com o servidor em
`npx vite --port 5330`.

As capturas da rodada 29b (10 a 14) são geradas por `node scripts/shots29submundo2.mjs`, com o servidor em
`npx vite --port 5331`:

- `10-cockpit-favores.png`: o cartão "Favores e dívidas" do Cockpit, com as ações rápidas;
- `11-crime-digital-card.png`: o card de uma organização de crime digital, com o emblema de chip;
- `12-cv-cena-funk.png`: o card do Comando Vermelho com a cena do funk;
- `13-planos-premio-comprado.png`: o planejador em "Manipular a votação de um prêmio";
- `14-ato-cena-submundo.png`: a seção "A cena e o submundo" na página do ato.

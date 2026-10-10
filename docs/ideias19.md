# Masters — Ideias para a Rodada 19 (leitura do código + história real da indústria)

Método: README (R1–R18), `docs/rodada17.md`, `ideias18.md` (plano), `integration17/18.md`, `econ18.md`, `strategies18.md`,
`balance17.md`, `audit17.md`, `feedback18.md`; grep em `src/sim/sys/*18.ts`/`*17.ts`; grafo de imports dos módulos R18; 16 buscas web.
Legenda: **[v]** = fato confirmado na busca web desta rodada; **†** = conhecimento geral, NÃO verificado agora (conferir antes de virar dado);
"código:" = confirmado por leitura/grep. Nada abaixo repete o plano 18 (D1–D5, P1, M1–M6, C1, K1–K4, V1–V4, A1–A2, R1–R3, T1–T2, S1–S4, U1–U12),
salvo como **versão mais funda** (marcada "+fundo").

## 0. Diagnóstico em 12 linhas

1. A R18 entregou quase tudo do plano: direitos (`rights18`), cadeia física (`supply18`, 9 fábricas), contratos (`contracts18`), rádio/streaming/clipes
   (`radio18`, `stream18`, `media18`), regiões (`regions18`, `kpop18`, `idols18`, `circuits18`), turnê (`live18`), caminhos de vitória (`paths18`),
   Mestre (`dm18`), rivais que aprendem (`rivalmind18`), habilidade CA/PA (`ability18`), campus (`campus18`), tutorial. O jogo tem ~145k linhas (sim ≈ 27k só em `sys/`).
2. **A camada de História real é fina**: `world4/milestones.ts` tem **43** marcos (1925→2023) para 100 anos de jogo. É o maior multiplicador de conteúdo por linha de código.
3. **Os módulos R18 quase não se tocam diretamente**: pelo grafo de imports, `rights18`, `supply18`, `fest18`, `session18`, `quality18`, `fans18`, `tv18`, `screen18`
   só importam `explain18/facts17/inbox18` (+1–2 vizinhos). Falam pelo barramento de Fatos, mas Fatos têm poucos ouvintes (§3, §4-J9).
4. `neural.ts` (193 linhas; hologramas, voz de IA, póstumo) **não importa** `facts17`, `rights18`, `holds17`, `scandal17`, `heirs8` — carreira póstuma é uma ilha.
5. `fandom.ts` (113 l.) + `fan15` + `fans18` = três modelos de fã; `rivals.ts` + `rivals2` + `rivals8` + `rivals12` + `rivalmind18` = cinco módulos de rival; `awards2/15/18` + `ceremonies8` = quatro de prêmio.
6. `fest18.ts` (210 l.) importa só `fest12`: festival não conversa com boicote (`society18`), multidão (`live18`), imprensa (`press18`), cenas (`scenedefs17`).
7. Código: 359 `registerSimHook`; 64 `registerMod('appeal')`, 30 `chartUnits`, 21 `cityDemand`, 19 `showRevenue` — `caps18` já amortece, mas a fonte de verdade de "quem dá apelo" é ilegível.
8. Código: ~75 tipos de Fato emitidos, ~15 com `onFact` específico (+3 curingas): a maioria vira só notícia/Mestre.
9. Balanço: `balance17` — cauteloso mediana 1,83 mi vs. equilibrado 182 mil vs. agressivo 396 mil; `strategies18` — 0 falências em 21 campanhas de 12 anos. Risco não paga e quebra não assusta.
10. `strategies18`: reputação artística "sempre chega a 100"; nota da crítica "generosa" — pendência declarada, ainda aberta.
11. `long18` não mexe em dinheiro, mas "só os Fatos novos alteram a sequência do sorteio": a comparação de balanço tem ruído de ±2× por semente (balance17).
12. Oportunidade central da R19: **transformar o mundo real em situações jogáveis com consequências** (tabela §5) e **ligar o que já existe** (§3), sem criar 30 telas novas.

---------------------------------------------------------------------------------------------------------------------------

## 1. EXPANDIR — sistemas que continuam finos

- **E1 Linha do tempo histórica 43 → ~150 marcos** (código: `milestones.ts`, 43 `realRef`). Faltam, por ex.: Sun→RCA 1955, Radio Caroline 1964, Lei dos Delitos Marítimos 1967,
  Stax 1975, Sugar Hill 1979, barreira da cor da MTV 1983, Bowie Bonds 1997, Pearl Jam×Ticketmaster 1994, iTunes 2003, Spotify 2008, In Rainbows/Live Nation 2007, Swift 2019.
  Cada marco = Fato + 1–2 `registerSituation` + parâmetro de lei/mercado; no modo "Vida real exata" vira crônica, nos outros vira gatilho com variação.
- **E2 Pós-vida / espólio** (código: `neural.ts` 193 l.): hoje 3 botões (holograma, póstumo, voz). Falta o **espólio como ator** (herdeiros, gestora, disputa), margem de autorização,
  produção de palco digital como empreendimento (capex, recuperação, economia local — ABBA Voyage custou ~£140 mi e a empresa projetava ≥4 anos para recuperar **[v]**), erosão de valor
  (nostalgia vs. "ressuscitar sem consentimento"). Detalhe em N17.
- **E3 Fandom unificado** (código: `fandom.ts`, `fan15`, `fans18`): fundir os três em um modelo com **gerações** (fã que cresce com o artista), **tribos** (colecionador, dançarino, letrista, "completista"),
  poder de compra × mobilização × lealdade (feedback #7), rituais (`ritualFor`) e **economia de fã-clube** (mensalidade, pré-venda, ingresso com prioridade).
- **E4 Crenças e moral pública** (código: `beliefs10.ts` 61 l.): religião/política só pesam em escândalo/censura. Acrescentar **campanhas morais** por país/época: queima de discos após declaração
  religiosa (Beatles 1966 †), pânico satânico/"mensagens invertidas" nos anos 80 †, listas de proibição de rádio, boicote de igrejas a patrocinadores. PMRC 1985 já existe como marco; falta o ciclo "campanha → varejo recua → rádio recua → rebelde sobe".
- **E5 Arte de capa e embalagem** (código: `covers.ts` 105 l., só estilos e bônus de crítica): capa como risco (controvérsia, censura de varejo), assinatura visual de estúdios de design, capa como relíquia. Liga a E4 e `looks17`.
- **E6 Rollout/estratégia de data** (código: `rollout.ts` 190 l.): janelas globais (sexta mundial 2015 †), lançamento-surpresa (já existe como evento do rival), vazamento como risco; depende de `supply18` (data perdida) — ver I6.
- **E7 Ciclo de vida de cenas** (código: `scenedefs17` 29 cenas reais): cena nasce → pico → saque por majors → colapso/gentrificação → turismo (S4). Ver N23.
- **E8 Ciclo de vida de selos rivais** (código: `rivalmind18` quebra/abandono; `rivals.ts:78` falência): adicionar **fundação mítica → apogeu → venda para conglomerado → diluição** (Chess 1969, Motown 1988 †) e **leilão de ativos na falência** (N1).
- **E9 Estúdios nomeados como lugares** (código: `agenda17` lista as house bands; não há estúdio com assinatura): Sun, Stax, Abbey Road, Hansa, Muscle Shoals, Electric Lady † como imóveis alugáveis/compráveis com som próprio (`sound.ts`) e fama que sobe com os discos gravados ali.
- **E10 Turnês icônicas e residências**: Las Vegas †, "turnê de despedida" que não acaba, residência em casa própria (`venues17`) com custo fixo baixo e fadiga baixa; hoje `live18` modela turnê, não residência.
- **E11 Obras órfãs e mercado de raridades** (liga a `rights18` caixa preta): ver N24.
- **E12 Imprensa de nicho** (código: `press18` 245 l.; `outlets17` 28 veículos): fanzines, rádios universitárias, blogs (2000s †): meio barato que cria cultos antes da mídia grande; hoje só 28 veículos fixos.
- **E13 Instituições de fundador** (código: `idols18`, `kpop18` tratam agência como regra, não como pessoa-instituição): ver N25.
- **E14 Biografia/documentário como produto** (código: `saga18.bio18` é texto): transformar em **lançamento** (livro, documentário 2010+, biopic) que gera receita, fama póstuma e processo de quem aparece.

---------------------------------------------------------------------------------------------------------------------------

## 2. POLIR — UX, clareza, ritmo, diversão

- **P1 "Hoje / Ameaças / Funcionando"** (feedback #14): `inbox18` tem categorias; falta o **cabeçalho de 3 perguntas** na Mesa com contagem e ordem de risco (hoje a Mesa mistura tudo). Hook: `items18()` + `advisor`.
- **P2 Calendário único de prazos** de todo o jogo (prestação de contas `contracts18`, repasse de sociedade `rights18`, slot de fábrica `supply18`, opção de contrato `deals18`, festival, turnê): uma faixa de 6 meses clicável. Hoje cada área mostra o seu.
- **P3 "Recibo de decisão"**: toda carta/decisão (Mestre, situações, Doutrinas) registra **efeito esperado** e, em 3/6/12 meses, **efeito real** com "por que" — generalizar `review18` (que só cobre lançamentos).
- **P4 Divulgação progressiva** (215 módulos em `sys/`): ocultar abas avançadas até o gatilho (1ª disputa → aba Disputas; 1ª fábrica → Cadeia física). `tracks18` já guarda "1ª vez"; usar como controle de visibilidade, não só dica.
- **P5 Pausa inteligente configurável**: o "avançar até o próximo evento" para em tudo; permitir regras ("só pare se gravidade ≥ 60, ou pessoa do elenco, ou prazo ≤ 1 mês") dentro de `policy18`.
- **P6 Cobertura do `explain18`**: teste/painel de dev que lista números exibidos sem `why18`; meta "nenhum KPI órfão" (promessa da R18 §U3). Verificar se a auditoria automática existe — só há registros (código: `explain18.ts` 57 l.).
- **P7 Cartões "Isto aconteceu de verdade"**: em marco/situação baseada em fato real, botão "A história real" com 3 linhas + o que mudou no jogo. Transforma conteúdo em aprendizado e dá orgulho de pesquisa. Liga E1.
- **P8 Transição de década**: ao virar 1960/70/80/90/2000/2010/2020 uma tela "o que muda agora" (regras, formatos, canais, o que fica obsoleto). O plano 18 tem "Ano em revista" (dezembro); falta o **olhar para frente**.
- **P9 Ruído de mensagens**: `inbox18` + Conselheiro + `dm18` + `agency18` + `press18` — adicionar **orçamento de notificações por categoria** e "resumo semanal" que funde repetidas (hoje cada módulo empurra o seu).
- **P10 Acessibilidade**: tons good/bad dependem de cor (`pill`, `.k-flop`), fontes pixel pequenas, mapa/campus em canvas 300×226; oferecer ícone+texto, tamanho de fonte, "reduzir animação", teclado completo.
- **P11 Desafio semanal por código**: já há "código de configuração" e cartão-resumo; juntar **semente + cenário + objetivo** em um código curto para desafio entre amigos (sem servidor). Liga `scenarios17` (11 cenários com medalhas).
- **P12 "Por que perdi?"** no fim da run e em cada quase-falência: cadeia de 5 Fatos que levou ao vermelho (usa `factsAbout` + `fin18`). Hoje o fim mostra legado em barras.
- **P13 Glossário automático**: termos de `gloss18` viram link em qualquer texto de situação (marcação `[[termo]]`), para o texto mais técnico (SoundExchange, MFN, caixa preta) não afugentar.

---------------------------------------------------------------------------------------------------------------------------

## 3. INTEGRAR — pares que ainda não conversam (34 ligações)

Formato: **Iₙ** par — regra — gancho (arquivo). "código:" = confirmado que o import direto não existe; a ligação indireta por Fato pode existir.

| # | Par | Regra | Gancho / arquivo |
|---|---|---|---|
| I1 | `neural.ts` póstumo ↔ `rights18` | lançamento póstumo/holograma exige autorização do espólio; sem ela, disputa e bloqueio de uso (`USE_BLOCK18`); conexos continuam a correr | `neural.posthumousRelease` → `rights18` + Fato `deal`/`case_ruling` |
| I2 | `neural.ts` ↔ `heirs8`/`kids17`/`dynasty.ts` | quem aprova é o herdeiro adulto; filho rebelde veta; divisão de herança muda quem é "espólio" | `rightsHolder()` lê `heirs8.lineage` |
| I3 | `neural.ts` ↔ `ai18`/`eras18` | holograma conta como "palco virtual" do ramo especulativo; regra de voz de IA da política da plataforma vale para o póstumo | `ai18` política × `aiVoiceSongs` |
| I4 | `rights18` caixa preta ↔ `crime17`/`holds17` | desvio de repasse vira caso (`feedCase`), auditor externo gera `holds17` favor/chantagem; CPI vira `scandal17` | `rights18.claimBB18` ↔ `crime17.commitCrime('embezzle')` |
| I5 | `rights18` sociedades ↔ `stream18` pró-rata | a edição do streaming paga via sociedade do mercado (taxa + defasagem) e não direto; atraso aparece no caixa | `stream18.payout18` → `pubRoute18` |
| I6 | `supply18` fila ↔ `hype17`/`rollout` | perder a data de lançamento corrói hype e abre janela para o rival; atraso de 8→22 semanas deve mudar o plano de marketing | `supply18.queueOf18` → `hype17.addHype(-)` + `rollout` |
| I7 | `supply18` ↔ `rivalmind18` | rivais reservam fábrica; prioridade por cliente grande tira seu slot; "flood" de rival aparece como Fato `plant` | `clientFactor18` ↔ `rivalmind18.sign('flood')` |
| I8 | `supply18` ↔ `bolsa10` | crise de PVC/fábrica move ações de fabricantes e de varejistas; vinil em falta sobe preço e `Fato` | `supply18.baseQueue18` → `bolsa10` evento |
| I9 | `radio18` ↔ `regions18`/`circuits18` | formato de estação nasce do submercado (jabá regional no Brasil, rádio comunitária, rádio de trens/mercados); consultor local vs. global | `FMT18` ← `regions18` submercado |
| I10 | `radio18` ↔ `society18` censura | banimento nacional/religioso corta adições em todas as estações do país; versão editada ganha vida | `censorOdds18` → `pitchRadio18(edit)` |
| I11 | `tv18` ↔ `kpop18`/`idols18` | programas semanais de música (vitória semanal, Kōhaku) são o "rádio" desses mercados; `sajaegi` e votos passam pelo `tv18` | `tv18` ↔ `kpop18.weeklyWins` |
| I12 | `stream18` funil ↔ `live18` demanda | seguidores/ouvintes recorrentes viram `cityDemand` (conversão baixa em quem veio de playlist de humor) — feedback #3 | `stream18.funnel18` → `registerMod('cityDemand')` |
| I13 | `fans18` ↔ `scandal17.scandalReaction` | cada facção reage diferente (puristas punem "venda", fãs de identidade perdoam); hoje só "fãs núcleo" | `fans18` facção → `scandalReaction().why` |
| I14 | `fans18` ↔ `kpop18`/`idols18` | compra em lote, versões múltiplas, voto: tratar como mobilização legítima × fraude de parada (`crime17`) pelo mesmo medidor | `fans18.mobilize` → `world4/charts.manip` |
| I15 | `fest18` ↔ `society18`/`press18` | boicote de artistas a patrocinador/país (Sun City, Fato 1985 já existe); imprensa amplifica; curadoria perde prestígio | `fest12` ← `society18.boycott` |
| I16 | `fest18` ↔ `live18` segurança | festival grande herda `Segurança de público` e a crônica de tragédias; seguro e plano de evacuação como decisão | `live18.safety` ↔ `fest18.capacity` |
| I17 | `awards18` ↔ `regions18`/`kpop18` | premiações nacionais por submercado (Daesang, prêmios latinos, Oricon) com corpo eleitoral local | `awards18` ← `regions18.submarkets` |
| I18 | `awards18` ↔ `quality18`/`review18` | elegibilidade e categorias pelas dimensões de qualidade (álbum forte sem single → Álbum do Ano; hit imediato → Gravação do Ano) | `quality18.dims` → `awards18.categories` |
| I19 | `screen18`/`tv18` ↔ `sync15`+`rights18` | cobrança de edição por cena, MFN entre master e edição, "one-stop" — fecha o gap que a R18 §2.8 deixou | `sync15.candidates` ← `rights18.modShares18` |
| I20 | `session18` ↔ `rights18` | crédito omitido de músicos de sessão vira `credit_dispute` anos depois (Funk Brothers †); boicote tardio | `session18` → `rights18.splits` + Fato |
| I21 | `session18`/`camps18` ↔ `quality18` | house band e topline entram nas dimensões (química, arranjo) — hoje `quality18` só importa `producers15` | `quality18` ← `session18.roster` |
| I22 | `school18` ↔ `regions18`/`policy18` | escolas como política cultural por país (El Sistema †), bolsa sujeita a orçamento do selo e verba pública | `school18` ← `regions18.fund` |
| I23 | `econ18` câmbio ↔ `regions18`/`circuits18` | exposição real por submercado/circuito (Alaba paga em dinheiro vivo, Lagos corporativo) em vez de região | `econ18.fxExposure` ← `regions18` |
| I24 | `campus18` ↔ `live18`/`fest18`/`society18` | zoneamento e lei do silêncio ameaçam casas do campus; vizinhos reclamam; multa vira Fato | `buildings18` ← `society18` |
| I25 | `policy18` ↔ `dm18` | regras delegadas (descanso, teto) são lidas pelo Mestre: se você delegou demais, o Mestre agrava; se você bloqueou, alivia | `dm18.tension` ← `policy18.active` |
| I26 | `report18` ↔ `rivalmind18` | relatório de mercado traz **sinais de intenção** de rivais (Fatos `sign`) em vez de só números — feedback #13 | `report18` ← `rivalmind18.signs` |
| I27 | `rivalmind18` ↔ `deals18`/`rights18` | rivais fazem JV de gênero e pacto apesar de disputa, e compram sociedade rival; erram financeiramente | `rivalmind18.pact` ↔ `deals18.startJV` |
| I28 | `traj18` ↔ `review18` | fracasso comercial registrado no post-mortem dispara trajetória "reinvenção" (ou vitimismo) com custo/benefício — feedback #5 | `review18` Fato → `traj18` arco |
| I29 | `dm18` ↔ `world4/milestones` | marcos reais viram fios de campanha (`registerThread18`) com estágios, em vez de evento único | `milestones.event` → `dm18.registerThread18` |
| I30 | `contracts18` ↔ `kpop18`/`regions18` | regras regionais viram **cláusulas padrão** do país/ano (teto de 7 anos coreano 2009/2017; preset de Bollywood playback) | `contracts18` pacotes ← `kpop18.rules` |
| I31 | `relics18` ↔ `rights18`/`sale17` | master físico (fita) ≠ direito; leilão de falência vende o objeto e os direitos separadamente (N1) | `relics18` ↔ `rights18.frozen18` |
| I32 | `ability18` ↔ `school18`/`camps18` | aulas e camps aumentam PA efetivo com teto por personalidade; hoje `train18` é botão solto | `ability18.train18` ← `school18` |
| I33 | `sale17` (venda do selo) ↔ `rights18` | masters e sociedades mudam de dono; artista com **direito de preferência** (N5), fãs reagem | `sale17` → `rights18.frozen18` + `fans18` |
| I34 | `ai18` ↔ `stream18` | enxurrada de faixas sintéticas e "ghost artists" diluem o pró-rata; plataforma e selos reagem (N12) | `ai18.policy` → `stream18.payout18` |

---------------------------------------------------------------------------------------------------------------------------

## 4. AJUSTAR — cheiros de equilíbrio, estratégias dominantes, mecânicas mortas, ruído

- **J1 64 fontes de `appeal`** (código: `registerMod('appeal'` ×64). `caps18` limita cada pequeno bônus a +25% com joelho; mesmo assim ninguém sabe quais valem. Fazer **auditoria por partida**: top-8 fontes de `appeal`/`chartUnits`
  por run, e fundir as <2% numa só (`perk` genérico). Meta: nenhum perfil recebe >35% do seu apelo de fontes opcionais.
- **J2 Risco não paga** (`balance17`: cauteloso 1,83 mi vs. agressivo 396 mil; `strategies18`: "pequena e ética" vence em caixa e segurança, 0 falências). Dar **custo de oportunidade ao conservadorismo**: concorrentes
  roubam artistas sub-promovidos (`rivalmind18` 'badsign'/'poach'), elenco envelhece sem renovação, teto de fatia de mercado só sobe com lançamentos. Meta: agressivo ≥ cauteloso em 1 de cada 3 sementes.
- **J3 Quebra não assusta** (21 campanhas, 0 falências; `INSOLVENT_AT = 4` meses, `economy.ts:82`). Acrescentar o **banco que chama a dívida** (Stax: o banco pediu falência por dívida de poucos milhares **[v]**; N1): gatilho por covenant (caixa < X × custo fixo, atraso de prestação), com tela de negociação.
- **J4 Crítica generosa / reputação artística satura em 100** (`strategies18`, pendência). Reparametrizar `quality18`→crítica para média ~62, desvio ~12, viés de época; críticos têm gosto (`critics8`) e "esnobam" quem vende demais.
- **J5 Ruído que impede ajuste**: medianas de célula variam 2× entre lotes (`balance17`). Dar a cada sistema **fluxo de Rng próprio** (semente + id do sistema) para que ligar `long18`/R19 não desloque o resto da corrida; só assim A/B de balanço é pareado.
- **J6 Bots caçadores de exploração**: hoje 3 perfis + estratégias de `long18`. Criar 6 bots adversários: (a) só 360 após 2002, (b) spam de remix/viral "impulsionar" gratuito, (c) ciclo vender-catálogo/recomprar, (d) tudo delegado por `policy18`,
  (e) antecipação automática como crédito barato (3% + 1,5%/mês **[código: econ18.md §2]** vs. juros do banco — checar se algum caso é mais barato que empréstimo), (f) só catálogo + reedição. Falhar o lote se algum passa de 3× a mediana.
- **J7 Tetos fixos em US$** (código: `deal360_17` 50/70/90 mil por ato por faixa de ano): escada artificial. Indexar a **índice de mercado da era** (`eras`), com suavização contínua.
- **J8 Módulos duplicados** (§0.5): criar fachadas `rivalsView`, `fanView`, `awardsView` e migrar leitores; só então remover. Risco de saves — manter adaptador `loadMigrate`.
- **J9 Fatos escritos que ninguém lê** (~75 tipos, ~15 com ouvinte). Teste: "todo `kind` emitido tem ≥1 consumidor mecânico ou é declarado `crônica`". Candidatos órfãos prováveis: `merch_drop`, `street_team`, `remix_contest`, `club_chart`, `release_review`, `doctrine`.
- **J10 Cartas com opção padrão enviesada**: a última opção é o padrão ao expirar (`registerInboxKind`/situações). Auditar se "ignorar" é ótimo em alguma (U12 só tratou as dominantes de ganho). Rodar o bot "sempre ignora" por 12 anos.
- **J11 Orçamento de tempo por fase**: 359 hooks; mês 2005 = 0,36 s, "huge" 0,84 s (limite 1,5 s). Medir custo por `registerSimHook` e impor teto por fase no teste de desempenho.
- **J12 Modo "Vida real exata" empobrece o jogador**: ações que inventam fatos ficam bloqueadas (`realKey18`). Dar alternativas documentadas (cartas "bastidores históricos") para não deixar menos ferramentas que nos outros modos.
- **J13 `STREAM_PAYOUT17 = 0.6`** (`market.ts:263`) segue como botão único apesar de `stream18.payout18` por território: verificar **dupla contagem** (repasse 0,6 × pró-rata por assinantes) e que mudar um não anula o outro.
- **J14 Mecânicas subusadas**: `ADVISOR_EXTRA` (ponto de plug do Conselheiro), `OFF17.reaction` (chave de teste) e `neural.ts` (ramos 2027–2040 sem consumidores mecânicos além de ai18). Decidir: ligar ou cortar.
- **J15 Falta curva de jogo médio**: `strategies18` mostra baixas nos anos 2–5 e platô depois; planejar **objetivos de década** (P8) para não haver anos "vazios" entre 8–20 de uma campanha.
- **J16 Mundo caótico demais?** Orçamento de drama protege o jogador, mas o *Mestre* + `agency18` + `verbs18` empurram 3 fontes de iniciativa de NPC; conferir taxa total de eventos/mês por era e fixar teto global (<N Fatos públicos sobre o jogador por trimestre).

---------------------------------------------------------------------------------------------------------------------------

## 5. ADICIONAR — 28 ideias ancoradas no mundo real

Formato: **Real** (fato; **[v]**/†) · **Era/região** · **Decisões** · **Consequências** · **Liga**. Regra do projeto: pessoas reais nunca vítimas/autoras de assassinato — ideias com crime usam entidade fictícia + crônica real.

**N1 Falência de selo e leilão de masters** — Real: Stax foi levado à falência involuntária em dez/1975 por pedido do Union Planters Bank; o banco ficou com tudo, inclusive as fitas; em 1977 a Fantasy arrematou ativos **[v]**. Atlantic retomou fitas pré-1968 por cláusula de 1968 **[v]**.
Era: EUA anos 70 (e qualquer era). Decisões: resgatar com injeção, vender acervo antes, lançar oferta no leilão, comprar só fitas ou também o catálogo; artista em contrato órfão escolhe ficar ou ir. Consequências: o comprador ganha acervo a preço de ocasião; artistas e fãs reagem; direito de preferência de quem tinha cláusula. Liga: `rivals.ts:78` (falência), `rivalmind18.bankruptcies`, `rights18.frozen18`, `relics18`, `sale17`, `holds17`.

**N2 Venda de contrato de estrela em aperto de caixa** — Real: Sam Phillips vendeu o contrato de Elvis e as gravações da Sun à RCA em 21/11/1955 por US$ 35 mil (divisão exata disputada) **[v]**. Era: 1950s. Decisões: vender o contrato do astro para salvar o selo (carta de aperto hoje só vende catálogo), reter e quebrar, ou pedir *override* sobre vendas futuras. Consequências: caixa agora vs. a lenda que você não terá (Fato no seu `history15` como "arrependimento", relíquia perdida). Liga: `economy.ts` carta de aperto, `contracts2`, `rivalmind18` (oferta), `facts17` kind `deal`.

**N3 O empresário total e seu segredo** — Real: o "Coronel" Parker fechou o acordo da RCA e passou a controlar a carreira **[v]**; é bem conhecido que ele evitou turnês no exterior †. Era: 1950s–70s. Decisões: aceitar contrato de gestão exclusivo (merch, cinema, TV), questionar, trocar. Consequências: renda previsível vs. artista sem passaporte/turnês no exterior; empresário com segredo (`holds17`), exposição vira escândalo. Liga: `managers14` (Parker já existe), `manager11/12`, `holds17` segredo, `tour12` vistos (`map`), `fame16`.

**N4 Cumprir contrato com lixo e mudar de nome** — Real: Prince, em 1993, adotou um símbolo como nome e escrevia "slave" no rosto em disputa com a Warner; recuperou todos os masters em 2014 **[v]**. Era: 1990s. Decisões: parar de entregar, lançar sob outro nome, entregar discos fracos para fechar a obrigação (`lançamentos garantidos` de `contracts18`), processar. Consequências: fãs puristas apoiam, selo sabota promoção, imprensa ri/ataca; masters só voltam com tempo/negociação. Liga: `contracts18` (garantia, engavetamento), `fans18` facções, `press18`, `rights18`, `traj18`.

**N5 Masters como arma: preferência e "Versão do Artista"** — Real: ao comprar a Big Machine, Scooter Braun adquiriu os masters de Taylor Swift; ela regravou seus seis primeiros álbuns **[v]**. Era: 2019+. Decisões: dar direito de preferência ao artista na venda do selo (cláusula), vender a quem pagar mais, embargo de regravação (2–5 anos). Consequências: campanha de fãs migra streams para a regravação (mobilização), valor do catálogo original cai, artista vira rival. Liga: `rights18.rerecord18`, `sale17`, `fans18`, `stream18`, `bolsa10`. +fundo de `rights8`.

**N6 Securitização com risco tecnológico** — Real: Bowie Bonds (1997) levantaram US$ 55 mi sobre royalties de 25 álbuns, cupom 7,9%, quitados em 2004; relatos divergem sobre o rating **[v]**; Pullman repetiu com Marvin Gaye, James Brown, Iron Maiden **[v]**. Era: 1997–2005 (e catálogo 2020+). Decisões: securitizar o seu catálogo (já existe em `business.ts`), prazo, ativo-lastro, comprar títulos de rivais. Consequências: Napster (1999) rebaixa lastro de catálogo físico; streaming depois valoriza; inadimplência vira Fato. Liga: `business.ts` securitização, `bolsa10`, `milestones.napster`, `econ18` (financiamento), `sale17`.

**N7 Rádio pirata offshore e a lei de 1967** — Real: Radio Caroline começou em 28/3/1964 em navios fora das águas territoriais; a Lei de Radiodifusão Marítima passou a valer em 14/8/1967; a BBC criou a Radio 1 seis semanas depois e contratou ex-piratas **[v]**. Era: Reino Unido/Holanda/Escandinávia, anos 60. Decisões: anunciar/fornecer discos à pirata, contratar DJs, fazer lobby, apoiar o fim. Consequências: pirata dá alcance sem controle de "needle time" e sem jabá; a lei fecha o canal e a rede estatal vira novo gatekeeper. Liga: `radio18` (`FMT18`, estações), `world4/laws`, `society18` censura, `press18`, `outlets17`.

**N8 Império do cassete e a "versão"** — Real: T-Series cresceu com versões cover de sucessos de cinema, a receita foi de ₹20 crore (1985) a ₹500 crore (1997), >60% do mercado; o fundador foi morto em 12/8/1997 **[v]** (fatos de pirataria são alegações). Era: Índia 1980s–90s. Decisões: licenciar covers e vender barato, entrar na guerra de preços, pagar proteção, aderir à campanha antipirataria. Consequências: volume e posição dominante vs. extorsão e conflito com rivais. Usar entidade fictícia ("magnata do cassete") e a morte só como crônica documentada. Liga: `regions18` Índia, `circuits18` playback, `crime17`/`crimenpc17`, `rights18` licença mecânica de cover, `supply18` capacidade de fita.

**N9 Boicote ao monopólio de ingressos** — Real: Pearl Jam pediu teto de taxa de US$ 1,80, apresentou queixa ao Departamento de Justiça (6/5/1994), cancelou a turnê de verão, depôs no Congresso; o caso foi arquivado e a banda disse que "usaram a gente" **[v]**. Era: 1994→2022 (Swift/Ticketmaster †). Decisões: tocar só em casas sem o gigante (menos público, logística pior), denunciar, depor, aceitar o teto. Consequências: fãs núcleo fiéis, receita e alcance caem; lei pode não mudar (resultado incerto, como na história). +fundo de V2 (`live18` promotores gigantes). Liga: `live18`, `fans18`, `world4/laws`, `press18`, `venues17`.

**N10 República-comuna e a batida militar** — Real: Fela Kuti, após "Zombie" (1976), teve o complexo Kalakuta atacado por ~1.000 soldados em 18/2/1977, estúdio e casa queimados, mãe morta semanas depois; lançou "Sorrow Tears and Blood" no próprio selo **[v]**. Tropicália: Caetano e Gil presos em dez/1968 após o AI-5, exílio em Londres desde 1969 **[v]**. Era: Nigéria/Brasil 1968–77. Decisões: bancar a comuna (estúdio+selo+casa de shows), tirar as fitas do país, publicizar, calar. Consequências: perda do estúdio e do material, solidariedade internacional (Fato), obra mais política. +fundo de `society18` (hoje exílio/censura por probabilidade). Liga: `campus18` (prédio incendiado), `relics18`, `society18`, `rights18`, `press18`.

**N11 Barreira da cor e alavancagem do catálogo** — Real: em 10/3/1983 "Billie Jean" estreou na MTV; o chefe da CBS Records (Yetnikoff) ameaçou retirar todo o produto da casa e a MTV cedeu **[v]**. Era: 1981–85. Decisões: usar o *poder do seu elenco total* como alavanca contra a emissora (custa relação/caixa), apostar na pressão pública, esperar. Consequências: abre rotação para artistas negros em todos os selos (afeta rivais e `looks17`); retaliação em outras emissoras. Liga: `media18` rotação, `looks17` barreiras, `holds17` favor, `rivalmind18`, `milestones.mtv`.

**N12 "Música perfeita para a playlist" (ghost artists)** — Real: reportagem de dez/2024 (alegações) diz que a Spotify, desde 2017, preenche playlists de humor com faixas de produtoras parceiras sob centenas de perfis, reduzindo royalties **[v]**; a empresa nega. Era: 2017+. Decisões: licenciar seu catálogo/estúdio como "buyout" de baixo valor, recusar, denunciar. Consequências: caixa agora vs. diluição do gênero e escândalo se descoberto. Usar plataforma fictícia (padrão do jogo). Liga: `stream18.mixOf18`, `ai18`, `press18`, `scandal17`, `rights18` (buyout sem royalty).

**N13 Ecossistema do reggae** — Real: Island começou em Kingston (1958/59) e foi para Londres em 1962; Coxsone Dodd fundou o Studio One em 1963; houve disputa de royalties nos anos 90 **[v]**. Era: Jamaica→UK, 1960s–70s. Decisões: produtor-dono-de-sound-system que vende "dub plates" exclusivos ou licencia a exportador; assinar com selo de Londres (alcance vs. identidade). Consequências: direitos ambíguos de gravações repetidas ("versions"), disputas. Liga: `circuits18` sound systems, `regions18`, `rights18` (conflito de titularidade), `deals18` (imprint).

**N14 Selo de rua do hip-hop e dinheiro suspeito** — Real: Sugar Hill (1979) foi financiada por Morris Levy e outros; "Rapper's Delight" foi Top 40, mas a gravadora não pagou a taxa de certificação da RIAA e não ganhou disco de ouro oficial **[v]**. Def Jam/Columbia 1984–85 †. Era: Nova York 1973–86. Decisões: aceitar capital da máfia (Levy já está no `crime17`), pagar certificação, entrar em distribuição de major. Consequências: ascensão rápida vs. controle do dinheiro e da obra; sample vira tema em 1991. Liga: `crime17` (Genovese/Levy), `rights18` (sample/precedentes), `supply18` (distribuidor), `circuits18` (festas de quarteirão).

**N15 Saída das superestrelas do selo** — Real: Madonna assinou com a Live Nation em out/2007 (US$ 120 mi, relato de fontes anônimas; 10 anos, inclui turnês, merch, marca) **[v]**; Radiohead lançou "In Rainbows" com preço livre (2007) **[v]**. Era: 2007+. Decisões: oferecer 360 a superestrela rival (promotora vira selo), contra-oferecer, deixar sair, lançar direto. Consequências: perda de âncora de catálogo; a promotora vira concorrente (`Artist Nation`). Liga: `deal360_17`, `live18` gigantes, `rivalmind18`, `contracts18`, `stream18` direto.

**N16 Briga de gestão e dono dos masters** — Real: Allen Klein comprou os masters dos Stones do ex-empresário Oldham e, após a ruptura, ficou com direitos da maioria das canções pré-1971 **[v]**; os Beatles racharam entre Klein e Eastman (1969) **[v]**. Era: 1965–72. Decisões: quem gerencia, quem assina o que (unanimidade vs. maioria — `dyn18` votação), aceitar transferência de masters como pagamento. Consequências: banda rompe, direitos presos por décadas; D3 (rescisão) vira a saída. Liga: `dyn18`, `bonds9`, `rights18.termination`, `holds17`.

**N17 Palco digital e pós-vida como empreendimento** — Real: ABBA Voyage (2022) custou ~£140 mi, recuperação ≥4 anos, ~US$ 2 mi/semana reportados, 3 milhões de ingressos até dez/2024, ~£103 de gasto local por pessoa **[v]**; Tupac em Coachella 2012 †; "Now and Then" dos Beatles 2023 †. Era: 2012+. Decisões: autorizar, financiar, escolher arena própria, vender ou licenciar o avatar. Consequências: renda alta e longa; erosão de autenticidade, processos do espólio, saturação. Liga: `neural.ts`, `ventures9`, `campus18`, `ai18`, `eras18` palco virtual.

**N18 Dilema do selo regional** — Real: a Motown deixou Detroit para Los Angeles em 1972 e foi vendida à MCA em 1988 †; os Funk Brothers só tiveram crédito décadas depois †. Era: 1960–88. Decisões: mudar a sede para onde está a indústria (cinema/TV) deixando a banda da casa, ou ficar. Consequências: perde o som de assinatura (`session18`), ganha acesso a sync e TV. Liga: `campus18` sede, `session18`, `regions18`, `agenda17` house bands, `sale17`.

**N19 Eurovisão como sistema** — Real: concurso desde 1956 (já em `catalog`), ABBA venceu em 1974 com "Waterloo" (já em relíquias) **[v]/†**; regras de idioma/televoto mudaram ao longo do tempo †. Era: Europa 1956+. Decisões: qual país/representante, língua da letra, encenação, final nacional. Consequências: fama continental imediata, política de votos entre vizinhos †, carreira de "um sucesso só" (`extras17`). Liga: `awards18`, `circuit17`, `tv18`, `regions18`, `fame16`.

**N20 Selo-marca e house band regional** — Real: Fania (Nova York, anos 60–70 †) vendeu "salsa" como marca com a Fania All-Stars e distribuía nos bairros latinos †. Era: 1964–80s. Decisões: contratar um coletivo de músicos como produto, controlar a distribuição de bodegas, ceder direitos. Consequências: marca forte, queixas de contratos duros dos artistas, pirataria. Liga: `circuits18` palenques, `session18`, `deals18`, `regions18`, `rights18`.

**N21 Fusão da era e remédio antitruste** — Real: milestone "mergers" (1998) já existe; em 2012 a compra da EMI exigiu desinvestimentos (Parlophone etc.) †. Era: 1998–2013. Decisões: participar da fusão, comprar os selos que o regulador exige vender, contestar. Consequências: oportunidade de catálogo barato; menos majors, mais poder de barganha em plataformas. Liga: `milestones.mergers`, `sale17`, `rivalmind18`, `bolsa10`, `world4/laws`.

**N22 Vinil, lojas independentes e edições limitadas** — Real: Record Store Day (2008 †) + fila de fábricas 2019–21 (já em `supply18`). Era: 2008+. Decisões: edição exclusiva para lojas independentes (margem menor, hype maior), disputa por slot de fábrica. Consequências: colecionadores (facção `fans18`), cambistas, atritos com fãs de preço baixo. Liga: `supply18`, `fans18`, `merch17`, `industry/retail.ts`.

**N23 Corrida do ouro numa cena** — Real: Seattle em 1991–95 †; a Sub Pop vendeu participação à Warner em 1995 †. Era: 1990s. Decisões: manter-se indie, vender fatia, assinar barato antes da inflação de adiantamentos. Consequências: a cena "morre" quando todos assinam (fama da cena cai, turismo sobe — S4). Liga: `scenedefs17`, `report18` (adiantamento médio), `rivalmind18` ('flood'), `discover18`.

**N24 Obras órfãs e mercado de raridades** — Real: cena Northern Soul no Reino Unido (anos 70 †): 45rpm obscuros viram valiosos; relançadores legítimos vs. bootlegs †. Era: 1970s+. Decisões: localizar titulares, relançar, comprar "órfãs" do caixa preta, ou piratear. Consequências: valor de catálogo sobe do nada; titular aparece e cobra. Liga: `rights18` caixa preta, `relics18`, `crime17` (bootlegs), `catalog`.

**N25 Escândalo de fundador-instituição** — Real: caso da agência japonesa Johnny's (revelações em 2023 †, tema sensível — tratar de forma não gráfica). Era: Japão 2023. Decisões: patrocinador sai, agência renomeia, ato decide ficar/sair, comprar a carteira. Consequências: patrocínio rompe (`scandal17`), reputação da marca, venda forçada. Liga: `idols18`, `scandal17`, `press18`, `sale17`, `fans18`.

**N26 Festival gratuito que vira lenda** — Real: Woodstock 1969 † (portões abertos, prejuízo, filme/álbum cobriram depois †); Altamont 1969 já em `live18`. Era: 1969–70. Decisões: abrir os portões, vender direitos do filme/disco antes, contratar segurança própria. Consequências: deficit imediato, receita de longo prazo, risco de multidão. Liga: `fest18`, `screen18`, `media18`, `live18` segurança, `rights18` (direitos de imagem).

**N27 Dono do nome da banda** — Real: grupos de vocal dos anos 50–60 viraram "franquias" com formações falsas tocando sob o nome †; leis de "verdade na música" nos EUA nos anos 90 †. Era: 1960s–90s. Decisões: registrar a marca, licenciar a turnê com formação nova, processar. Consequências: renda fácil vs. processo, escândalo, fãs. Liga: `lineup16`, `rights18` (marca), `live18`, `scandal17`.

**N28 Especial de TV de volta por cima** — Real: especial de Elvis de 1968 † e "At Folsom Prison" de Johnny Cash 1968 † como retornos de artistas em baixa. Era: 1968. Decisões: formato (íntimo vs. grande), produtor, local incomum (prisão — `crime17` já tem). Consequências: descoberta crítica, `fame15` "retorno devolve parte do pico" vira arco com chance explícita. Liga: `traj18`, `tv18`, `fame15`, `review18`.

---------------------------------------------------------------------------------------------------------------------------

## 6. TOP 30 PRIORIZADO — 8 frentes paralelas

Critério: impacto em decisões × reuso da base R17/R18 × risco de regressão. Esforço S (≤3 dias) / M (≤1,5 sem.) / L (>1,5 sem.).

### Frente A — Infra de qualidade (começa primeiro; todas dependem)
1. **J5 Rng por sistema** (M) — sem dependência; habilita A/B pareado.
2. **J9 matriz Fato→consumidor + teste** (S) — dep.: nenhuma; lista alvos para I-links.
3. **J6 bots adversários + lote** (M) — dep.: J5.
4. **J1 auditoria de fontes de `appeal`** (S/M) — dep.: `caps18`.
5. **J13 verificar dupla contagem de streaming** (S) — dep.: nenhuma.

### Frente B — História como conteúdo (E1/P7)
6. **E1 marcos 43→~150 + `registerThread18`** (L, fatiar por década) — dep.: J9 (S), I29 (S).
7. **P7 "A história real" nos cartões** (S) — dep.: E1.
8. **N11 MTV, N7 rádio pirata, N19 Eurovisão, N26 festival gratuito** (M cada) — dep.: E1; piloto de 4 marcos para validar.

### Frente C — Direitos, masters e finanças
9. **N1 falência/leilão de masters + J3 banco chama dívida** (M/L) — dep.: `rights18.frozen18`, `rivals.ts`; I31.
10. **N2 venda de contrato de estrela + N3 empresário total** (M) — dep.: `contracts2`, `managers14`.
11. **N5 preferência/"Versão do Artista" + I33** (M) — dep.: `rights18.rerecord18`, `sale17`.
12. **N6 securitização com risco tecnológico** (S/M) — dep.: `business.ts`, `bolsa10`.
13. **N16 briga de gestão/masters dos Stones-Beatles** (M) — dep.: `dyn18`, `rights18.termination`.
14. **N4 cumprir contrato com lixo** (S/M) — dep.: `contracts18`, I13.

### Frente D — Pós-vida e espólio
15. **I1–I3 + E2 (espólio como ator)** (M) — dep.: `rights18`, `heirs8`.
16. **N17 palco digital como empreendimento** (M/L) — dep.: I1–I3, `ventures9`, `campus18`.

### Frente E — Ao vivo, fãs e festivais
17. **E3 fandom unificado + I13/I14** (L) — dep.: J8 (fachadas).
18. **N9 boicote ao monopólio de ingressos** (M) — dep.: `live18` promotores, `world4/laws`.
19. **I15/I16 + N26 festival** (M) — dep.: `fest18`, `live18` segurança.
20. **N22 vinil + RSD** (S/M) — dep.: `supply18`, E3.

### Frente F — Regiões, circuitos e sociedade
21. **N10 república-comuna / exílio fundo** (M) — dep.: `society18`, `campus18`.
22. **N8 império do cassete, N13 reggae, N14 selo de rua, N20 Fania** (M cada, uma fatia por vez) — dep.: I9, I23, `regions18`.
23. **I23 câmbio por exposição real de submercado** (S/M) — dep.: `econ18`, `regions18`.
24. **N25 escândalo de fundador-instituição** (S/M) — dep.: `idols18`, `scandal17`.

### Frente G — Mercado, rivais e plataformas
25. **I26/I27 sinais de intenção e pactos** (M) — dep.: `rivalmind18`, `report18`.
26. **N12 "perfeita para a playlist" + I34** (M) — dep.: `stream18`, `ai18`.
27. **N15 saída de superestrelas + N21 remédio antitruste** (M) — dep.: `deal360_17`, `sale17`, `milestones.mergers`.
28. **N23 corrida do ouro numa cena + E7 ciclo de vida de cenas** (M) — dep.: `scenedefs17`, `report18`.

### Frente H — UX, ritmo e consolidação
29. **P1 três perguntas + P2 calendário único + P9 orçamento de notificações** (M, três mãos) — dep.: J9 (consumidores); entregar API do calendário na semana 1.
30. **P3 recibo de decisão + P8 transição de década + P12 "por que perdi?" + J8 fachadas** (M/L) — dep.: P3 ← `review18`; J8 só depois do lote J6 verde.

### Ordem e riscos
- Semana 1: A (J5, J9, J13) e protótipo do calendário (P2). Semana 2–3: piloto B (4 marcos) + C9–C12. Depois D, E, F em paralelo; G e H contínuos.
- Riscos: (1) **J5 muda a sequência dos sorteios** → saves antigos e testes de seed; guardar `rngVersion` no save. (2) **Conteúdo real †** precisa de verificação antes de virar dado; usar nomes fictícios fora do modo "Vida real exata". (3) Cada ideia nova entra com bot de regressão (mediana de caixa final ±20%, como no plano 18). (4) Casos sensíveis (N8, N25, N10): sem violência gráfica, entidades fictícias, crônica real só no modo exato.

---------------------------------------------------------------------------------------------------------------------------

## Fontes (busca web desta rodada)
- Stax 1975 / Fantasy 1977 / Atlantic 1968: https://staxmuseum.com/1969-1975/ · https://www.tnwb.uscourts.gov/PDFs/history/Stax Records and Isaac Hayes case.pdf
- Elvis, Sun→RCA 21/11/1955: https://ultimateclassicrock.com/elvis-presley-leaves-sun-records/ · https://scottymoore.net/article551122.html
- Prince×Warner / Swift×Big Machine: https://www.legalcheek.com/2016/04/prince-hated-contract-law-so-much-he-once-changed-his-name-to-an-unpronounceable-symbol · https://www.cbsnews.com/amp/news/kelly-clarkson-told-taylor-swift-to-re-record-all-of-her-music-following-scooter-braun-drama-could-that-really-work
- Bowie Bonds: https://www.npr.org/sections/thetwo-way/2016/01/12/462815115/david-bowie-also-left-his-mark-on-wall-street · https://www.ifre.com/story/1856007/david-bowie-starman-of-structured-finance
- T-Series / Gulshan Kumar: https://en.wikipedia.org/wiki/T-Series_(company) · https://en.wikipedia.org/wiki/Gulshan_Kumar
- Rádio pirata UK: https://en.wikipedia.org/wiki/Pirate_radio_in_the_United_Kingdom
- Pearl Jam×Ticketmaster: https://www.rollingstone.com/music/music-news/pearl-jam-takes-ticketmaster-to-capitol-hill-188707/ · https://www.kiro7.com/news/local/1994-when-pearl-jam-took-ticketmaster-look-back/UFQFVWKQPJB63FWUAVNRQCMSV4/
- Fela / Kalakuta 1977: https://felakuti.com/story/1977 · https://en.wikipedia.org/wiki/Fela_Kuti
- Billie Jean / MTV / Yetnikoff: https://en.wikipedia.org/wiki/Walter_Yetnikoff · https://blackamericaweb.com/2026/06/04/michael-jackson-mtv-with-billie-jean/
- Spotify "ghost artists" (alegações): https://en.wikipedia.org/wiki/Controversy_over_fake_artists_on_Spotify · https://www.thefader.com/2024/12/19/report-spotify-is-populating-its-playlists-with-ghost-artists
- Tropicália (prisão/exílio): https://theworldelsewhere.com/2015/10/15/london-london-brazils-caetano-veloso-and-gilberto-gil-in-exile-part-1/
- Island / Studio One: https://www.rollingstone.com/music/music-features/chris-blackwell-remembers-making-bob-marleys-catch-a-fire-1358985/ · https://tidal.com/magazine/article/inside-the-rich-history-of-jamaicas-iconic-studio-one-and-clement-coxsone-dodd/1-48596
- Madonna×Live Nation / In Rainbows: https://www.cbsnews.com/news/live-nation-offers-madonna-120m-deal · https://news.pollstar.com/2007/10/18/artist-nation-is-born/
- Klein / Stones / Beatles: https://www.beatlesbible.com/people/allen-klein/ · https://www.uncut.co.uk/?p=54373
- ABBA Voyage: https://www.itv.com/news/london/2024-12-08/abba-chose-the-uk-for-virtual-show-which-brings-14bn-boost-to-economy · https://blooloop.com/immersive/news/abba-voyage-adds-322-million-london-economy/
- Sugar Hill: https://en.wikipedia.org/wiki/Sugar_Hill_Records_(hip-hop_label) · https://www.britannica.com/print/article/1688493
- Itens marcados † (Motown 1972/1988, Chess 1969, Woodstock, Seattle/Sub Pop, Eurovisão e regras, Fania, Johnny's, Northern Soul, Elvis '68/Cash Folsom, Record Store Day, EMI 2012, Tupac 2012, Beatles 2023, Parker/passaporte) vieram de conhecimento geral e devem ser verificados antes de virar dado.

---------------------------------------------------------------------------------------------------------------------------

## 7. Mecânicas que faltam (varredura 2: jogos de gestão × negócio real da música)

Método: comparei o jogo com FM/OOTP (janelas, cessões, arbitragem), CK3/Vic3 (pretexto jurídico, tarifas), Game Dev/Mad Games/Software Inc (pesquisa de público, cultura de equipe) e com cada papel/processo do negócio real.
Cada candidato foi conferido com grep em `src/sim` e `src/data`. **faltando** = nenhuma ocorrência; **parcial: arquivo** = existe só como evento único, constante ou texto.
Não repete §1–§6 (N1–N28, E1–E14, I1–I34). Esforço S/M/L. **[v]** = confirmado em busca web; **†** = conhecimento geral.

**Gestão e contratos (inspirado em FM/OOTP/CK3/Vic3)**

- **M1 Janela de contratação e cessão de artistas entre selos.** Ref.: FM (janela de transferências, empréstimo), OOTP (waivers/free agency); real: cessão de contrato entre selos e *loan-out* de artista a outro selo para um projeto †. Falta: **faltando** (grep "empréstimo de ato/janela" vazio; só leilão de livres em `npc17`). Decisões: emprestar um ato ocioso a um rival por taxa e share (ganha caixa e o ato volta valorizado, ou nunca volta), pegar emprestado um astro para um disco, fechar a "janela" de renovações de fim de ano. Consequência: relação com rival, ciúme do ato, risco de ele não querer voltar. Liga: `contracts2`, `rivalmind18`, `holds17`, `deals18`. **M**.
- **M2 Cláusula de recompra, de rescisão e direito de preferência por artista.** Ref.: release clause do FM; opção de renovação. Falta: **parcial: `deals18.ts`** (só no contrato de desenvolvimento) e `contracts18` sem cláusula de saída. Decisões: aceitar cláusula de saída barata para fechar a assinatura, ou recusar e perder o ato. Consequência: rival "paga a cláusula" e rouba o astro em dia de cobrança; preço de mercado do ato vira visível. Liga: `offers12`, `rivalmind18`, `explain18`. **S**.
- **M3 Pretexto e fases de um processo (dossiê probatório + mediação/arbitragem).** Ref.: CK3 *casus belli*, OOTP arbitragem. Falta: **parcial: `scenes/court.ts`, `dispute15.ts`, disputas de `rights18`** — o processo é um sorteio com chance, sem reunir provas, notificar, tentar mediação do sindicato/associação ou arbitragem privada (mais barata, sigilosa). Decisões: investir em auditoria antes de processar, aceitar mediação, escalar. Consequência: ganha mais com provas; processar sem pretexto vira Fato negativo. Liga: `holds17` (chantagem), `facts17`, `press18`. **M**.
- **M4 Cultura da empresa, treinamento e retenção da equipe.** Ref.: Mad Games Tycoon/Software Inc (cultura, treino, caça de talentos). Falta: **faltando** ("cultura da empresa" 0; só níveis de depto em `hq6.ts` e carga em `capacity14.ts`). Decisões: pagar treinamento e certificações de A&R/jurídico, estilo de gestão (horas × salário), política de remoto/estúdio. Consequência: equipe boa é roubada por rivais; cultura afeta rotatividade, erros de metadados e vazamentos. Liga: `hq6`, `capacity14`, `policy18`, `dyn18`. **M**.
- **M5 Tarifas, cotas e barreiras de importação de discos e instrumentos.** Ref.: Vic3 (tarifas); real: protecionismo cultural, cotas de música nacional (CanCon 1971 †), bloqueios no Leste europeu. Falta: **parcial: `world4/laws.ts:74` (só cota de rádio)**; nada de tarifa, licença de importação, prensagem local obrigatória. Decisões: abrir fábrica/licenciar localmente, pagar a tarifa, ficar fora do mercado. Consequência: submercados protegidos favorecem selo local (`regions18`). Liga: `regions18`, `supply18`, `econ18` (câmbio), `licenças17`. **M**.
- **M6 Calendário sazonal de lançamentos.** Ref.: FM (congestionamento de jogos); real: corrida do Q4/Natal, semana do Grammy. Falta: **parcial** — "disco segurado para o Natal" (evento R17) e janelas de rivais; não há sazonalidade de demanda/atenção por mês e país. Decisões: furar o Q4 caro vs. janela morta de março. Consequência: concorrência por vitrine e por slot de fábrica. Liga: `rollout.ts`, `hype17`, `supply18`, `report18`. **S**.
- **M7 Pesquisa de mercado e teste de faixa.** Ref.: Game Dev Tycoon (público-alvo); real: pesquisa de rádio *call-out*, focus group, lançamento de teste regional †. Falta: **faltando** (grep vazio). Decisões: pagar teste (custa e vaza), lançar single regional antes do álbum, ouvir o resultado ou ignorar. Consequência: reduz incerteza da previsão de lançamento (faixa menor), mas atrasa e pode queimar o hype. Liga: `review18`, `report18`, `mkt18`, `radio18`. **M**.

**Indústria, fornecimento e lei**

- **M8 Certificações por país e era (ouro/platina) e mudança de fórmula.** Real: RIAA contou streams em singles em 9/5/2013 (100 streams = 1 download) e em álbuns em 1/2/2016 (1.500 streams = 1 álbum), com limiares inalterados **[v]**; outros países têm limiares próprios †. Falta: **parcial: `realworld.ts:112`, `stats.gold/platinum`** — um contador global, sem tabela por país/época, sem diamante regional. Decisões: otimizar lançamento para a fórmula (singles × álbuns), pressionar a entidade. Consequência: certificação vira fato com valor de relíquia e de pontos de habilidade. Liga: `world4/charts.ts`, `skillpts13`, `scenarios17`, `awards18`. **S**.
- **M9 Limite de execução de disco no rádio (*needle time*) e sessões ao vivo.** Real: no Reino Unido o BBC podia tocar só 5 h/dia de discos comerciais até 1967 e as regras duraram até 1988, com o sindicato dos músicos no meio **[v]**; isso gerou sessões ao vivo (Peel Sessions †). Falta: **faltando** ("needle time" 0; `radio18` não limita horas). Decisões: gravar sessão exclusiva para a emissora (ganha rádio, perde exclusividade), negociar com o sindicato. Consequência: país com cota empurra para ao vivo, TV e pirata (N7). Liga: `radio18`, `world4/laws`, `session18`, `live18`. **M**.
- **M10 Greve de gravação jogável e Fundo de Execução.** Real: proibição Petrillo 1942–44 e nova greve em jan/1948, que terminou com o Music Performance Trust Fund, pago por parte da venda de cada disco e usado em concertos gratuitos **[v]**. Falta: **parcial: `world4/milestones.ts:86` (`strike42`, só evento) e `w4.union` (interruptor)**. Decisões: estocar masters antes, gravar no exterior, desafiar, pagar o fundo. Consequência: estúdios parados, discos antigos nas rádios, depois taxa permanente por disco. Liga: `session18`, `studio12`, `rights18`, `econ18`. **M**.
- **M11 Cotas de estrangeiros e reciprocidade sindical.** Real: sindicatos de músicos dos EUA/Reino Unido limitaram trocas de artistas na década de 60 †. Falta: **faltando**. Decisões: aceitar troca 1:1 de turnês, contratar músico local, acionar o governo. Consequência: invasão britânica adiada ou barrada; palco com músicos locais "substitutos". Liga: `tour12` vistos, `w4.union`, `live18`, `map13`. **S/M**.
- **M12 Rack jobbers e saldão como atores.** Real: rack jobbers escolhiam seleção, quantidade e displays; ~1/3 das vendas dos anos 60 passava por eles **[v]**; Handleman abastecia 8.000 lojas em 1980 **[v]**. Falta: **parcial: `industry/retail.ts`, evento `r11_cutout_bin` (`events_more11.ts:721`)** — o atacadista não decide a seleção nem negocia devolução. Decisões: pagar para entrar no *rack*, aceitar devolução ilimitada, queimar encalhe como saldão. Consequência: alcance enorme com risco de devolução; o saldão reduz preço de colecionador. Liga: `supply18` Distribuição, `outlets17`, `econ18` (recebíveis). **M**.
- **M13 Valor de catálogo por múltiplo e ciclo de juros.** Real: em 2021 catálogos icônicos saíam a 25–30× o *net publisher share* e masters de superastros a 15–20×; Springsteen vendeu à Sony por ~US$ 500 mi **[v]**; Hipgnosis comprava a ~16× **[v]**. Falta: **parcial: `rights18.ts:855` (múltiplo de mercado por ano), `stakes8.ts:72`**; não há fundo concorrente nem ligação com juros. Decisões: vender no pico, recomprar, lançar fundo; juros altos comprimem múltiplos. Consequência: janela de ouro e ressaca. Liga: `bolsa10`, `sale17`, `econ18`, `rivalmind18`. **M**.
- **M14 Preservação do acervo.** Real: fitas se degradam e incêndio num depósito da Universal em 2008 destruiu matrizes †. Falta: **parcial: `campus18` (fogo na sede), `relics18`** — master não tem risco físico. Decisões: digitalizar (caro) / seguro / cofre. Consequência: perda de reedição e de valor póstumo. Liga: `rights18`, `supply18`, `campus18`. **S**.
- **M15 Masterização por formato e migração de formato.** Real: guerra do volume (milestone 2015 menciona normalização de loudness) e o vinil limita dinâmica †; CD forçou recompra do catálogo nos anos 80–90 †. Falta: **parcial: evento `r11_loudness_war`, tipo `remaster` em `rights18`** — não há dimensão de dinâmica/loudness em `quality18`. Decisões: remasterizar agressivo × dinâmico; remaster para cada formato. Consequência: crítica e streaming premiam coisas diferentes. Liga: `quality18`, `stream18`, `supply18`. **S/M**.
- **M16 Coletâneas de TV e de compilação multiselo.** Real: séries *K-tel* e *Now!* licenciavam hits de vários selos (1983 †). Falta: **parcial** (tipo `compilation` do seu catálogo; sem licenciar de rivais). Decisões: licenciar suas faixas a uma coletânea (queima o single, ganha alcance) ou montar a sua. Consequência: unidades enormes e margem fina. Liga: `charts7`, `rivalmind18`, `rights18`. **S/M**.

**Artista, saúde e imagem**

- **M17 Seguros e saúde: pessoa-chave, vida e plano de saúde.** Ref.: gestão de lesões do FM. Falta: **parcial** — seguro de turnê e cancelamento (`live18`) e eventos (`events_more11.ts:696`); "plano de saúde" 0; sem seguro de pessoa-chave nem custo médico por país (sistema público × privado). Decisões: segurar o astro (prêmio alto, paga se morrer/adoecer), dar plano ao elenco, bancar tratamento. Consequência: um artista doente deixa de ser catástrofe de caixa; custo médico dependente do país. Liga: `stress17`, `people/health`, `live18`, `econ18`. **M**.
- **M18 Rede de apoio e intervenção.** Real: risco concentrado nos 20 e poucos anos (o "clube dos 27") †. Falta: **parcial: `hq6` depto Bem-estar, `personact18` (ajuda/clínica)** — nenhuma *intervenção* organizada com amigos/família/produtor, nem sinais de alerta antes da quebra. Decisões: quando intervir, quem convoca, custo em confiança. Consequência: salva carreira ou rompe o vínculo; sem tom sensacionalista. Liga: `stress17`, `dyn18`, `holds17`, `vices`. **M**.
- **M19 Endosso pessoal de marca com cláusula moral.** Real: Pepsi–Michael Jackson 1984 e Pepsi–Madonna 1989 (cancelado após "Like a Prayer") †. Falta: **parcial: situação `endorsement` em `sitsworld17.ts`; patrocínio de turnê/festival** — sem contrato de endosso do artista. Decisões: aceitar marca, pedir cláusula de conduta, rescindir. Consequência: renda alta com risco de ruptura em escândalo. Liga: `scandal17`, `merch17`, `image17`, `contracts18`. **S/M**.
- **M20 Cancelamento e linchamento digital (2010+).** Falta: **parcial: `scandal17`, `press18`** — escândalo tem reação por país, mas não há *onda* com pico, janela de resposta e perdão. Decisões: pedir desculpas cedo, calar, contra-atacar. Consequência: patrocinadores saem em dias; retorno possível com custo. Liga: `fans18`, `media17`, `dm18`. **M**.
- **M21 Fã-clube oficial pago e lista direta.** Real: fã-clubes de assinatura desde os anos 60 †, K-pop com cartão de membro, plataformas de apoio direto. Falta: **parcial: `clash17` (ingresso `fanclub`), evento `newsletter` (`events_more11.ts:1068`), `circuit17` financiamento coletivo** — sem produto mensal recorrente. Decisões: preço, benefícios, frequência de conteúdo, exclusividade. Consequência: renda estável que reduz dependência de plataforma, mas cansa o artista. Liga: `fans18`, `merch17`, `stream18`. **M**.
- **M22 Pacotes VIP e *meet & greet*.** Falta: **parcial: `fest12.ts`** (1 ocorrência). Decisões: preço, limite, tratamento do artista. Consequência: margem alta; fãs de renda baixa reclamam; estresse. Liga: `live18`, `fans18`, `stress17`. **S**.
- **M23 Política de gravação por fãs.** Real: o Grateful Dead permitiu "tapers" † e o circuito de fitas fidelizou fãs. Falta: **parcial: `fandom.ts` (troca de fitas)**. Decisões: permitir/proibir/oficializar. Consequência: fidelidade vs. bootleg no mercado. Liga: `fans18`, `crime17` bootleg, `rights18`. **S**.
- **M24 Circuito de covers e bandas tributo.** Ref.: nostalgia como mercado †. Falta: **faltando** (grep vazio). Decisões: licenciar e fiscalizar tributos, contratar covers como talent pool, processar. Consequência: renda de nostalgia, mas canibaliza o show original; bons covers viram atos próprios. Liga: `lineup16`, `scouting`, `live18`, N27. **M**.

**Mídia, cultura e política**

- **M25 Aparição semanal na TV e *playback*.** Real: programas de auditório como *American Bandstand* e *Top of the Pops* †. Falta: **parcial: `scenedefs17.ts:38` (programa por época), relíquias** — sem vaga semanal fixa nem política de dublar vs. cantar ao vivo. Decisões: aceitar playback, ensaio, cantar ao vivo e arriscar. Consequência: alcance semanal vs. credibilidade; gafe vira Fato. Liga: `tv18`, `press18`, `fame15`. **S/M**.
- **M26 Registro ao vivo, filme de show e especial acústico.** Real: MTV Unplugged (1989 †); álbuns ao vivo. Falta: **parcial: evento `events_more.ts:945` (álbum ao vivo oficial)** — não há projeto de gravação de turnê, mixagem e filme. Decisões: gravar quais datas, mixar/overdub, filmar. Consequência: produto de catálogo barato, risco de mostrar show ruim. Liga: `live18`, `rollout`, `screen18`, `rights18`. **M**.
- **M27 Mashup, *white label* e remix não autorizado.** Real: *white labels* de DJ e o álbum de mashup *Grey Album* (2004 †). Falta: **parcial: `crime17` bootleg, `media18` remix oficial** — sem a figura do remix que viraliza antes da licença. Decisões: licenciar retroativamente, processar, apropriar-se. Consequência: hit de clube vs. efeito Streisand. Liga: `media18`, `rights18`, `fans18`. **S/M**.
- **M28 Julgamento de obscenidade, letra polêmica e selo de aviso.** Real: PMRC 1985 (já marco), julgamento de obscenidade do 2 Live Crew em 1990 †. Falta: **parcial: `world4/laws.ts`, `society18`** — nenhum processo com defesa de letra, "mensagens invertidas" (grep 0). Decisões: financiar defesa, pedir versão limpa, esconder. Consequência: precedente jurídico (`rights18` precedentes) e pico de vendas pelo proibido. Liga: `society18`, `rights18`, `beliefs10`. **M**.
- **M29 Campanha política e uso não autorizado de música.** Real: música usada por campanhas sem licença (Reagan e "Born in the U.S.A." 1984 †). Falta: **faltando** (grep vazio). Decisões: autorizar, negar, processar, apoiar candidato. Consequência: público dividido, atenção da imprensa, convites (`society18`). Liga: `beliefs10`, `society18`, `press18`, `rights18` (sync). **S/M**.
- **M30 Naming rights de casas e patrocínio de estrutura.** Falta: **faltando**. Decisões: vender o nome da casa (`venues17`) ou do festival; cláusulas de conduta. Consequência: caixa fixo vs. fãs puristas. Liga: `venues17`, `fest12`, `campus18`. **S**.
- **M31 Trade press e anúncios pagos.** Real: Billboard/Cash Box com anúncios de "parabéns" e *tip sheets* †. Falta: **parcial: `outlets17`, `data/critics8.ts`** — imprensa especializada não é canal de anúncio nem de ranking do setor. Decisões: comprar anúncio para pressionar rádios, aceitar manchete. Consequência: percepção do mercado sobe, risco de ser rotulado como hype. Liga: `radio18`, `press18`, `hype17`. **S**.
- **M32 Música em jogos: jogo de ritmo e show virtual.** Real: *Guitar Hero/Rock Band* (2005–07 †) ressuscitaram catálogos; show em videogame (2020 †). Falta: **parcial: evento `events_more11.ts:1052`, `sync15` (jogos)** — sem licença de jogo de ritmo nem receita de show virtual. Decisões: licenciar faixas, fazer show virtual. Consequência: ressurgimento do catálogo, saturação. Liga: `sync15`, `screen18`, `stream18`, `ai18`. **M**.
- **M33 NFT/web3 completo.** Falta: **parcial: `merch17.ts:27` (SKU `nft` 2021–22), `milestones.ts` 'nft'** — sem royalty de revenda, golpe de rival, colapso de preço. Decisões: lançar, vender direitos fracionados, recomprar. Consequência: caixa rápido vs. escândalo e rejeição. Liga: `merch17`, `scandal17`, `bolsa10`. **S/M**.

---------------------------------------------------------------------------------------------------------------------------

### Top 10 desta varredura (impacto ÷ esforço)

1. **M8 Certificações por país/era e fórmula de streams (S)** — dado + fórmula pura; mexe em metas, pontos de habilidade e cenários.
2. **M2 Cláusula de recompra/saída (S)** — fecha o buraco de "contrato blindado" e dá munição aos rivais.
3. **M6 Calendário sazonal de lançamentos (S)** — dá ritmo e escolha ao mês; usa `rollout`/`supply18`.
4. **M1 Janela de contratos + cessão de artistas (M)** — maior mecânica de gestão ausente (FM/OOTP).
5. **M7 Pesquisa de mercado e teste de faixa (M)** — reduz incerteza com custo; liga review18/report18.
6. **M10 Greve de gravação + Fundo de Execução (M)** — transforma marco de 1942/48 em campanha.
7. **M9 *Needle time* + sessões de rádio (M)** — nova razão de existir para `session18` e rádio estatal.
8. **M17 Seguros e saúde (M)** — torna doença/morte tratável e fecha ponta de `live18`/`stress17`.
9. **M20 Cancelamento digital (M)** — usa `scandal17`/`fans18`; relevante de 2010 em diante.
10. **M13 Múltiplos de catálogo × juros (M)** — liga bolsa, juros e venda do selo; cria ciclo.

Dependências: M8/M2/M6 independentes (começar já); M7 depois de J5 (Rng por sistema); M1 depende de M2; M9/M10 compartilham `world4/laws` e `session18`; M17 depende de `people/health`.
Fontes novas: RIAA https://factmag.com/2013/05/09/riaa-adds-streaming-data-to-gold-and-platinum-certification-formula · https://www.thefader.com/2016/02/01/riaa-moves-to-include-streaming-in-certification-system ; rack jobbers https://en.wikipedia.org/wiki/Rack_jobber · https://www.fundinguniverse.com/company-histories/handleman-company-history/ ; AFM/MPTF https://musicpf.org/?p=2321 ; needle time https://en.wikipedia.org/wiki/Needle_time ; catálogos https://www.billboard.com/articles/business/9654308/bruce-springsteen-talks-sony-music-sell-recorded-music-catalog · https://musicbusinessworldwide.com/hipgnosis-songs-fund-now-owns-a-catalog-of-65413-songs-worth-a-combined-2-55bn .

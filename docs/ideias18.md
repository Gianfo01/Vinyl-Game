# Masters — Ideias para a Rodada 18 (pesquisa de design + indústria)

Método: li README (R1-17), docs/rodada17, integration17, balance17 e audit17; confirmei cada ideia por grep no código antes de propor
(o que já existe está marcado **[existe]**). Pesquisa web: ~21 buscas (fontes no fim; os resultados de design de jogos foram
rasos, então as lições combinam fontes + conhecimento geral dos jogos citados). Esforço: S = ≤1 dia de agente, M = 2-4, L = 5+.

Já existe e NÃO deve ser reproposto (confirmado): payola/jabá com DJ e curador (`world4/state.payola`), sociedade de direitos
SCAE/RMR como escolha única (`world4/laws.ts`), sindicato (`w4.union`, greve de 1942 em `milestones.ts`), sistema de trainees
(`w4.trainees`, perfil `idol`), fã-clubes (`w4.clubs`), fábrica de instrumentos (`industry.ts`), sync por briefing (`sync15.ts`),
voz sintética com consentimento (`consent8.ts`), NFT de merch 2021-22 (`merch17.ts`), compositor fantasma (`hireWriter`),
músicos de estúdio/orquestra/coral por contratação (`agenda17`), metodologia de paradas por era (`world4/charts.ts`), Live Aid
como marco, turnê beneficente (decisão em `intrigue.ts`), dano auditivo (`people/state`), censura por país (R11/R17), fila de
prensagem e matéria-prima (`industry/`), seguros só como evento (`events_more11`), Conselheiro (`ui/advisor.ts`, 71 linhas).

---------------------------------------------------------------------------------------------------------------------------

## 1. Lições dos jogos de gestão → mudança concreta em Masters

1. **FM: Dinâmica do vestiário (hierarquia, grupos sociais, "se irritar um, irrita o grupo")** — o jogo mostra o estado social em
   vez de escondê-lo. Masters tem facções, líder e votação (R9/R11) mas nenhuma tela única. → **Painel "Dinâmica"** (pirâmide de
   influência da banda/elenco/equipe, grupos, porta-voz, quem apoia quem), lendo `people/`, `bonds9`, `holds17` e `stress17`.
2. **FM: Caixa de entrada tipada + relatórios de analistas** — tudo chega como mensagem acionável. Masters tem `people/inbox` e a
   Mesa do mês, mas as dicas do Conselheiro só leem estado próprio (máx. 7, sem "por quê"). → **Inbox 2.0**: categorias, filtros,
   botões de resposta na própria mensagem, "relatório do analista" mensal por área (rádio, turnê, direitos).
3. **FM: orçamento de scouting em pacotes + relatório com "visto por quantas vezes"** — incerteza é parte do jogo. Masters já tem
   faixas e graus de conhecimento (R10). → **Pacotes de olheiro por região/gênero com orçamento mensal** e relatório que diz
   "visto 3 vezes, 1 ao vivo" (ligar a `scout11` + novo "Escolas" K3).
4. **CK3: tooltips dentro de tooltips** (cada termo no tooltip é outro tooltip) — a regra é "nenhum número sem origem". Masters
   tem `explain8/12` e autópsia, mas a leitura não é navegável. → **Registro único `explain18`**: qualquer número da UI tem
   `why[]` encadeado; passar o mouse sobre um termo abre o próximo nível (já existe `scandalReaction().why`, `crimeOdds().why`).
5. **CK3: esquemas com fases, chance visível e sigilo** — um objetivo longo que o jogador "arma" e que pode ser descoberto.
   Masters tem crime17 e intriga. → generalizar para **Esquemas legítimos de longo prazo** (lançar uma cena, quebrar um artista
   nos EUA, comprar uma sociedade de direitos) com 3-5 fases, agentes e risco de vazar como Fato.
6. **CK3: estilos de vida/perks e decisões** — **[existe]** (R6). Lição que falta: decisões sazonais **desbloqueadas por traço
   ou contexto** (menu "Decisões" com cooldown), em vez de só cartas aleatórias → **Menu de Decisões do selo** (ver §4).
7. **CK3/Victoria 3: grupos de interesse com peso político** — pops → grupos → lei. Masters tem fãs casuais/ativos/núcleo e
   júris. → **Facções de fandom** (ver V4): fãs viram blocos com agenda (puristas, mainstream, shippers, colecionadores) que
   pesam em paradas, prêmios populares e reação a escândalo.
8. **Victoria 3: leis com tempo de aprovação pela legitimidade e pelo poder dos grupos** — Masters tem `w4.laws` + lobby.
   → leis ganham **tempo de tramitação e coalizão visíveis** (e a Associação do setor vira bloco de grupos: majors, indies,
   sociedades, plataformas) — alimenta A2 e D4.
9. **RimWorld/L4D: narrador com curva de tensão** — **[existe]** (Maestro/Brisa/Acaso, orçamento de drama R17). Falta o
   *feedback visual*: **curva de tensão da run** no Diário ("o narrador está poupando você") e nome do contador de drama.
10. **RimWorld/Dwarf Fortress: humores como pilha de pensamentos e Legends** — **[existe]** (`people/thoughts`, Lendas, Fatos).
    Lição que falta: **qualquer Fato vira capítulo navegável** (uma "história da pessoa" gerada em prosa a partir de `factsAbout`)
    e é compartilhável (cartão-resumo já existe) → **Biografia viva** em cada pessoa/ato/selo.
11. **Frostpunk: leis em ramos mutuamente exclusivos com dois medidores** — cada política custa em um eixo e rende em outro.
    → **Doutrinas do selo** (ramos exclusivos: "gravadora de autor", "fábrica de hits", "plataforma", "arquivo") com 2 medidores
    visíveis (Cultura × Caixa) além do perfil `identity` de R9; escolher fecha caminhos e gera legado distinto.
12. **Game Dev Tycoon/Software Inc: o ciclo "investir aqui → receita ali" sempre legível e metas de marco** — Masters tem metas
    visíveis (R5). → **Árvore de marcos por papel** (da garagem ao Complexo) com 3 metas simultâneas e recompensa nomeada, e
    painel "O que mudou no último mês e por quê" (variação de caixa por causa).
13. **Motorsport Manager: instalações antes de contratar estrelas; sponsor com metas; não deixar o caixa negativo** — Masters:
    sede + patrocínio existem. → **Patrocinadores com metas trimestrais e visita à sede** (o nível de sede libera a categoria do
    patrocinador) e **teto salarial/de equipe vs. instalações** como aviso do Conselheiro.
14. **Capitalism Lab/Kaiser: IA concorrente com todas as regras do jogador, bolsa, preços de mercado** — **[existe]** (rivais,
    bolsa R10/R11). Falta *transparência de concorrência*: **Relatório de mercado trimestral** (quota por gênero, preço médio de
    adiantamento, capacidade das fábricas) lido pelo analista.
15. **Frostpunk/Papers-like: dilemas cuja opção "segura" não vence sempre** (crítica real às escolhas desequilibradas) — auditar
    as 42 situações de `sits17`/`sitsworld17`: toda opção deve ter custo oculto no horizonte de 12 meses (via Fatos/holds).

---------------------------------------------------------------------------------------------------------------------------

## 2. Lacunas nos sistemas existentes (aprofundar antes de criar novos)

**2.1 Direitos/royalties** (`rights.ts` 408 l., `rights8.ts` 85 l., `world4/laws.ts` Society 'scae'|'rmr')
- Sociedades por país: hoje é um interruptor global. Fazer uma sociedade **por mercado** com taxa, prazo de repasse (SACEM paga
  ~3 meses após o trimestre; JASRAC tem defasagem longa), comissão e reputação (ECAD brasileiro é balcão único para autoral +
  conexos e já foi alvo de CPI) — ver D1.
- Dinheiro "não identificado" (caixa preta) que volta como fato quando o seu catálogo tem metadados errados (D2).
- Reversão: `rights8` reverte master por contrato; falta **direito de rescisão legal** (termination rights nos EUA, 35 anos) (D3).
- Auditoria de royalties já existe (processos); ligar a **auditores contratados por artistas** e ao fato `audit`.

**2.2 Rádio e mídia** (`media12.ts`, `world4/industry.ts`, `payola`)
- Rádio é um medidor de relação. Falta **estação/formato/consultor/painel de programação** (M1) e promotor independente como
  intermediário jurídico do jabá (o jabá deixa de ser abstrato: "quem pagou, quem filmou").
- Críticos/veículos (28+33) não têm **carreiras** nem política de embargo/acesso (M5).

**2.3 Cadeia física** (`supply16.ts` tem só 11 linhas; `industry/state.ts`, `supply13.ts`)
- Matéria-prima e fila existem. Falta **fábrica como ator** com capacidade nomeada, prioridade por tamanho do cliente, prazos que
  explodem em eras de pico (1950s vinil, 1979 disco, 2020-22 vinil: espera de 8 para 22 semanas, quem perde a data perde 60-70%
  das vendas de vinil) e **escolha de janela** (street date vs. adiamento) (P1).

**2.4 Turnês** (`tour12.ts` 381 l., `venues17`, `route16`/`travel`)
- Acordo de show é cachê/porta. Faltam **tipos de acordo** (garantia, "versus", garantia + % acima do ponto de equilíbrio),
  **acerto (settlement sheet)** pós-show com despesas contestáveis (25-30% do bruto em custos do local), seguro de cancelamento,
  carnê de equipamento/vistos por país (vistos já existem em `map`), rider (regras do camarim que viram Fato quando absurdas),
  ônibus/caminhões e sindicato de técnicos (V1).

**2.5 Prêmios** (`ceremonies8`, `awards15`, `circuit17`, júri nacional)
- Júri e campanha existem. Falta **corpo eleitoral com blocos** (membros que entram/saem, convite, diversidade), **regras que
  mudam**, boicote público e "esnobada" com custo político (A1).

**2.6 Fandom** (`fan15` 118 l., `audience8`, `w4.clubs`)
- Camadas (casual/ativo/núcleo) são lineares. Introduzir **facções** (V4) e o ciclo "fã que cresce com o artista" (gerações).

**2.7 Contratos** (`contracts.ts/2`, `deal360_17`, `offers12`)
- 5 modelos. Faltam **contrato de desenvolvimento** (opção barata, 2 anos, incubadora), **imprint/selo-vaidade**, **JV de gênero** (D5)
  e as proteções que a lei coreana criou (teto de 7 anos) como regra regional.

**2.8 Sync** (`sync15.ts` 211 l.)
- Falta **MFN** (a taxa master e a de edição se igualam), "one-stop" (música livre de terceiros vende mais), **biblioteca de música
  de produção** como produto de volume, supervisores como NPCs com gosto e memória (liga a `npc17`), e fee 50/50 master-edição.

**2.9 Gente/equipe** (`people/`, `lineup16`, `bonds9`)
- Falta a **tela de Dinâmica** (lição 1), a ficha "o que cada um quer da banda" e **reunião de banda** com pauta (preço, setlist,
  novo integrante) que usa votação existente.

**2.10 Advisor/legado** (`advisor.ts`, `legacy.ts` 186 l.)
- Conselheiro sem consequências estimadas; legado é número 0-100 sem **narrativa**. Ver §4.

**2.11 Sindicatos**
- `w4.union` é interruptor + custo mensal. Fazer a **greve/banimento de gravação** jogável (AFM 1942-44 e 1948: músicos param, selos
  estocam, rádio toca disco antigo, gravações "a cappella" e músicos estrangeiros); fundo de pensão e pagamentos especiais.

**2.12 Streaming** (`market.ts` STREAM_PAYOUT17, trends17)
- Pro-rata único. Acrescentar **centavo por stream por tier de plataforma**, "stream fraud" (fazendas de bots → derrubada, fato
  público), Discovery Mode-like (comissão de ~30% do royalty em troca de alcance algorítmico) (M2).

---------------------------------------------------------------------------------------------------------------------------

## 3. Novas ramificações do negócio (32 ideias)

Convenções: **Decisões** = o que o jogador escolhe; **Liga** = sistemas existentes tocados; **Era/região**; **Esf.** = esforço.

### 3.A Direitos, editora e jurídico

**D1. Sociedades de gestão coletiva + editora de verdade** (Esf. L, fatiável)
O que é: cada país tem a sua entidade (ASCAP/BMI/SESAC nos EUA, PRS+MCPS no Reino Unido, GEMA, SACEM, JASRAC, ECAD no Brasil
com balcão único, SOCAN, APRA). O dinheiro de execução pública, mecânico e conexo passa por elas, com **taxa, defasagem e
reputação**. Editora: contratos de administração, co-publicação, **subeditoras por território**.
Decisões: filiar o selo/artistas a qual sociedade (e a que custo de troca), registrar obras, ceder administração a uma
subeditora, auditar, criar uma sociedade rival (o `rmr` já é rival).
Liga: `rights.ts`/`rights8`, `w4.laws`, `charts7` (execução ≠ venda), `holds17` (favor com diretoria), `facts17` (CPI/escândalo
de desvio de repasse), `crime17` (desvio de royalties já existe).
Era/região: 1914 ASCAP, 1941 BMI (marco já existe), 1851 SACEM (anterior a 1920), ECAD 1973, JASRAC 1939; mecânicos por lei.
**D2. Splits, metadados e créditos** (Esf. S/M)
O que é: "split sheet" assinada no estúdio (quem escreveu o quê), códigos de obra/gravação, **erros que viram dinheiro parado**
(caixa preta que só é reclamado depois de X anos), disputa de crédito (ex.: "cut-in" de DJs/gerentes nos anos 50) e créditos
de coautor tardios.
Decisões: fechar splits no dia (custa tempo da agenda) ou depois (risco), contratar "equipe de royalties" (função de equipe nova),
brigar por crédito.
Liga: `songsale`, `market.ts` (créditos somam 100% já existe), `dispute15`, `facts17` (kind `credit_dispute`), `stress17`.
**D3. Direitos conexos, rescisão e reversão** (Esf. M)
O que é: direito do intérprete (PPL/SoundExchange/GVL), **gravações anteriores a 1972 nos EUA**, e **direito de rescisão** (artista
recupera masters após 35 anos nos EUA) como mecânica de longo prazo do catálogo.
Decisões: renegociar antes do prazo, vender o catálogo antes, ou enfrentar o processo; artista reclama o master e vira rival.
Liga: `rights8` (reversão), fundos de catálogo, `legacy.catalog`, `holds17` (promessa), `npc17`.
**D4. Precedentes jurídicos como cartas** (Esf. M)
O que é: casos históricos que **mudam parâmetros** quando acontecem nas datas reais (Chuck Berry × Morris Levy; Grand Upright 1991
→ sample exige licença; Bridgeport 2005; A&M × Napster 2001; Betamax; Prince × Warner 1993; "Blurred Lines" 2015). O jogador
pode ser parte, financiar um lado ou ficar de fora.
Liga: `w4.laws`, `scenes/court.ts`, `covers.ts` (samples), `consent8` (IA), crime17 (tribunais), `facts17`.
**D5. Contratos de desenvolvimento, imprint e JV** (Esf. M)
O que é: três modelos novos — opção barata de 12-24 meses com A&R e estúdio (incubadora), **selo-vaidade** de um artista famoso
(R17 já tem selos próprios de superestrelas, falta o contrato), joint venture por gênero com uma major.
Liga: `contracts2`, `offers12`, `scout11`, `sublabels.ts`, `stakes8`.

### 3.B Cadeia física e distribuição

**P1. Fábricas, distribuidoras e agregadores** (Esf. M)
O que é: (a) fábricas nomeadas com capacidade e prioridade (grandes clientes furam a fila; 1950 goma-laca → vinil, anos 70, 2020-22
com PVC e peças em falta); (b) distribuidores/racks/one-stops (consignação e devolução já existem), (c) **agregadores digitais DIY**
(2010+) com taxa e derrubada por fraude.
Decisões: reservar slot com antecedência, pagar prêmio de prioridade, comprar parte da fábrica (já há fábrica própria), mudar a data.
Liga: `industry/*`, `rollout.ts`, `outlets17` (canais), `hype17` (data perdida reduz hype), `facts17`.

### 3.C Mídia e descoberta

**M1. Rádio como mercado: estações, formatos e consultores** (Esf. L)
O que é: estações por cidade com **formato** (Top 40, AOR, urbano, country, rádio comunitária), diretor de programação e consultor
(Drake nos anos 60; Burkhart/Abrams com ~1000 estações em AOR nos anos 70), **reunião de programação** semanal, ciclo de adição
de faixas, **promotor independente** (intermediário do jabá, hoje abstrato) e **lei do jabá** como risco.
Decisões: qual faixa empurrar para qual formato; contratar promotor; aceitar versão editada para rádio; recusar jabá.
Liga: `w4.payola`, `media12`, `charts7` (airplay), `fame16` (fama regional), `scandal17`, `crime17` (jabá investigado já existe).
**M2. Playlist, algoritmo e fraude de streams** (Esf. M)
O que é: playlist editorial vs. algorítmica, **pitching com antecedência**, comissão de alcance (estilo Discovery Mode: ~30% do
royalty em troca de empurrão), **fazendas de stream** como crime e fato público (derrubada de faixas e processo).
Decisões: pagar por alcance e aceitar royalty menor; pitchar singles para curadores; denunciar rival.
Liga: `STREAM_PAYOUT17`, `trends17`, `curator` do `payola`, `hype17`, `crime17` (fraude de paradas já existe), `press9`.
**M3. Viral/TikTok e ressurgimento de catálogo** (Esf. S/M)
O que é: som que viraliza com trecho de 15 s (campo "gancho" já existe), **faixa velha volta** (efeito série em `sync15` generalizado:
Fleetwood Mac 2020, Kate Bush 2022); corrida jurídica por quem é dono.
Decisões: liberar trecho para desafio, pagar influenciador, oferecer remix oficial, ou derrubar usos.
Liga: `sync15` (efeito série), `milestones` (`short_video` 2019), `events_more.ts:737`, `catalog` valor do acervo.
**M4. Clipes e coreografia** (Esf. M)
O que é: clipe como projeto próprio (diretor NPC com estilo, orçamento, censura), rotação na TV de clipes (1981+), YouTube/Vevo (2005+);
coreografia como habilidade/contratação (K-pop, boy bands, desafio de dança), figurino.
Decisões: orçamento, diretor autoral vs. de estúdio, versão censurada, coreógrafo fixo.
Liga: `rollout` (passo "clipe" existe, só como etapa), `eras8` (TV de clipes manda em 1981+), `looks17`, `talent/attrs` (condição física).
**M5. Jornalismo musical como carreira** (Esf. M)
O que é: nova carreira (reusa origem `journalist`) — escrever resenhas, furos, manter fonte; revistas sobem e caem (NME, Rolling Stone,
Billboard); **embargo, acesso e compra de capa**.
Liga: `careers12` (novo `CareerId`), `reviews.ts`, `critics8`, `press9`, `outlets17`, `holds17` (favor/segredo).
**M6. Programas de calouros e TV de talentos** (Esf. M)
O que é: concursos (Eurocanção já está em `catalog`), Pop Idol/American Idol (2001-02), Star Academy; **contrato de vencedor**
com o formato do programa; pico de fama e queda.
Decisões: assinar o vencedor, o 3º colocado "com carisma", ou produzir o programa (empreendimento de mídia).
Liga: `discovery.ts` (concursos por era já existem), `ventures9` (mídia), `fame15`, `fan15`, `w4.trainees`.

### 3.D Cena e clube

**C1. DJ, clube, remix e record pool** (Esf. M/L)
O que é: carreira DJ (origem `dj` já existe, carreira não), **record pools** (1975+, DJs recebem de graça para espalhar), disco
de 12" e remixes encomendados, residências, hits de pista que entram nas paradas (disco, house, EDM, baile funk, reggaeton).
Decisões: encomendar remix, financiar clube, dar exclusiva a um DJ.
Liga: `scenedefs17` (clubes por cena), `covers.ts/studio.ts` (remix existe), `movements9`, `charts7`, `merch17`.

### 3.E Criação e ecossistema de talento

**K1. Acampamentos de composição, topline e pitching** (Esf. M)
O que é: camps (já há "camps" em R11) viram **mercado de canções**: topliner contrata, canção "cortada" e oferecida a artistas
(modelo escandinavo/Max Martin), ghostwriter com fim de crédito.
Liga: `creation.ts` (`hireWriter`), `songsale.ts`, `repertoire`, `holds17` (favor de crédito), `events_more11:r11_ghostwriter`.
**K2. Músicos de sessão e "house band"** (Esf. S/M)
O que é: elenco de sessão fixo (Wrecking Crew, Funk Brothers, Muscle Shoals) com reputação, tabela sindical, **crédito omitido** e
revolta tardia (boicote por crédito).
Liga: `agenda17` (já contrata), `w4.union`, `studio12`, `sound.ts` (assinatura sonora), `facts17`.
**K3. Educação musical** (Esf. M)
O que é: escola/conservatório/programa social (El Sistema, Berklee) como **fonte de scouting** e política cultural; bolsas;
professor famoso atrai alunos.
Liga: `scout11`/`scouting` (nova fonte por era), `intrigue.ts` (decisão "escola de música" existe), `instruments.ts` (aulas), `kids17`.
**K4. Instrumentos, endossos e feiras** (Esf. S/M)
O que é: contratos de endosso (modelo-assinatura), NAMM/feiras, **eras de equipamento** (fita → multipista → digital → DAW doméstica)
que mudam o custo de gravar e o som.
Liga: `industry.ts` (fábrica de instrumentos), `sound.ts`, `studio.ts`, `merch17`.

### 3.F Ao vivo

**V1. Logística de turnê completa** (Esf. M/L) — detalhado em 2.4: acordos, settlement, seguro, carnê, rider, ônibus, técnicos.
Decisões: garantia vs. "versus", cancelamento, rota econômica vs. fadiga, quem paga o seguro.
Liga: `tour12`, `route16`, `travel`, `venues17`, `stress17` (turnê), `scandal17` (rider absurdo), `crime17` (extorsão em shows existe).
**V2. Gigantes de promoção e bilhetagem** (Esf. L)
O que é: promotor dominante (estilo Live Nation/AEG) com acordos de exclusividade de casas, taxas de bilhetagem, **escândalo de
preço** (ingressos dinâmicos já existem) e processo antitruste; promotores locais independentes.
Liga: `venue12`, `venues17`, `w4.laws`, `fame16`, `press9`, `holds17` (dívida com promotor).
**V3. Cuidado e responsabilidade (saúde e multidão)** (Esf. M)
O que é: **programa de bem-estar** do selo (terapia, limites de agenda) vs. custo; **segurança de multidão** em shows e festivais
(Altamont 1969, Roskilde 2000, Astroworld 2021) com seguro, investimento e consequência jurídica; "clube dos 27".
Liga: `stress17`, `people/breakdowns`, `vices.ts`, `fests8`, `scandal17`, `crime17` (processos), `facts17`.
**V4. Merch, equipe de rua e facções de fandom** (Esf. M)
O que é: fornecedores de merch (preço × ética; escândalo de trabalho), bootleg; **street teams** voluntárias; fãs em blocos com
agenda (lição 7) que reagem a mudança de som, preço e escândalo.
Liga: `merch17`, `fan15`, `w4.clubs`, `audience8`, `scandal17.reaction`.

### 3.G Premiações e paradas

**A1. Política das premiações** (Esf. M): corpo eleitoral com blocos, regras que mudam, campanha e boicote público.
Liga: `ceremonies8`, `awards15`, `circuit17`, `rockhall9`, `holds17` (voto trocado), `fame16`.
**A2. Lobby da metodologia de paradas** (Esf. S): selos pressionam por regras (SoundScan 1991, peso de streaming, bundle de CD à
la AKB48); brecha explorada vira `manip`. Liga: `world4/charts.ts` (`manip` já existe), `w4.laws`.

### 3.H Mercados regionais

**R1. K-pop completo** (Esf. M): audições globais, **programa de sobrevivência** para debut, contrato de 7 anos (padrão a partir
de ~2009-10) e litígios (TVXQ × SM), serviço militar para homens, fandom que compra em lote. **[trainees existem]**; aprofunda.
Liga: `w4.trainees`, `identity/extra (idol)`, `fan15`, `consent8`, `contracts2`.
**R2. Idols japoneses e kayokyoku** (Esf. M): grupos "que você pode encontrar", CD com ingresso de aperto de mão e voto (cada
unidade conta no Oricon), "graduação" de membros, agências fortes (Johnny's); enka e kayokyoku como mercado maduro.
Liga: `charts7` (Japão), `A2` (bundle como brecha), `w4.trainees`, `fan15`, `crime17` (yakuza já existe).
**R3. Pacote de mercados com regras próprias** (Esf. L, uma fatia por vez)
(a) **Brasil**: sertanejo, forró, funk carioca/baile, ECAD, TV aberta e novela como vitrine, jabá regional;
(b) **Nigéria**: Afrobeats, distribuição por celular, pirataria como canal, diáspora em Londres;
(c) **Índia**: trilhas de cinema dominam (os cantores de *playback* ficam anônimos nos anos 50-70), cassete e T-Series nos anos 80;
(d) **Jamaica**: sound systems, riddims, Studio One/Trojan; (e) **Latina**: reggaeton 2004 → Despacito 2017;
(f) **Gospel/circuito religioso** (igrejas, CCM). Cada um com `Market18` (trainees é o protótipo): regras de renda, canais, gatekeepers.
Liga: `countries.ts`, `relevance.ts`, `worldgen`, `scenedefs17`, `heritage17`, `beliefs10`.

### 3.I Outras artes

**T1. Trilhas, musicais e jogos** (Esf. L): carreira de compositor para telas (cinema, TV, jogos, jingles), **teatro musical**
(Broadway: produção e álbum do elenco), cobrança de edição por cena. `sync15` cobre briefing; falta *carreira* e *produção*.
Liga: `careers12` (novo), `sync15`, `ventures9`, `ceremonies8` (Oscar de trilha).
**T2. Clássica, ópera e orquestras** (Esf. M/L): orquestra como instituição (patronato, regente, temporada), gravações de catálogo
clássico, crossover. Liga: `ventures9`, `catalog`, `heritage17`, `fests8`.

### 3.J Sociedade e tecnologia

**S1. IA: deepfakes, licenças e processos (2023+)** (Esf. M): falso viral de artista, takedown, mercado de licença de voz
(**[consent8 cobre voz/treino]**; aqui: gerador de música "sem artista" que dilui streaming, processos de selos contra geradores,
elegibilidade nas paradas). Liga: `consent8`, `trends17`, `w4.laws`, `scandal17`.
**S2. Censura, exílio e boicote** (Esf. M): exílio forçado (Tropicália 1969), listas negras, **boicote cultural ao apartheid**
(Sun City 1985), circuitos clandestinos (fita no bloco soviético). Liga: `geopolítica`, `beliefs10`, `crime17`, `map` (vistos).
**S3. Filantropia como campanha** (Esf. S/M): single beneficente e megaconcerto montados em etapas (Live Aid, "We Are the World"),
risco de "caridade cínica" e desvio de fundos. Liga: `milestones`, `intrigue` (turnê beneficente), `fame16`, `scandal17`.
**S4. Turismo musical e "Cidade da Música"** (Esf. M): investir na cena local (zoneamento, lei do silêncio, museu, rota turística:
Abbey Road, Graceland) rende receita de visitantes e concessões, e atrai festivais. Liga: `venues17`, `map13`, `relics9`, `heritage17`.

---------------------------------------------------------------------------------------------------------------------------

## 4. UX, legibilidade e motivação de longo prazo

**U1. Painel Dinâmica** (S/M; lição 1) — pirâmide de influência, grupos e porta-voz. Depende de `people/`, `bonds9`, `holds17`.
**U2. Inbox 2.0 + Conselheiro v2** (M) — mensagens tipadas com botões, "analista" por área, cada dica com *por quê* e *efeito
estimado* ("+4 moral, −$2k"); limite de 7 vira ranking com "ver mais". `advisor.ts` já expõe `ADVISOR_EXTRA` para plugar.
**U3. `explain18`: tooltips encadeados** (M) — registro único de `why[]`; passar o mouse num termo abre o próximo nível; auditoria
automática de números sem origem (teste que falha se um KPI da UI não tem explicação).
**U4. Menu "Decisões do selo"** (M; lição 6) — decisões sazonais com requisito, custo, prazo e consequência (assinar a sociedade,
fundar clube, cortar prensagem, anunciar manifesto); reaproveita as decisões grandes de `intrigue.ts`.
**U5. Linha do tempo + "Ano em revista"** (M) — em dezembro, uma tela de balanço (caixa, nº 1, perdas, pessoas, fatos públicos)
com cartão compartilhável; linha do tempo clicável de Fatos por pessoa/ato/selo (já há `chron9`/`facts17`).
**U6. Biografia viva** (M; lição 10) — prosa gerada de `factsAbout` + `remember`, exportável para o Livro da partida.
**U7. Metas de longo prazo por papel e Doutrinas** (M; lições 11-12) — árvore de marcos (garagem → Torre/Campus), 3 metas ativas,
doutrinas exclusivas que alteram legado; conquistas **narrativas** (ex.: "Primeiro disco de ouro do país X"), não de contagem.
**U8. Dinastia/legado jogável** (M) — a passagem do selo (`heirs8`, sucessão) ganha **linhagem** (retratos, árvore, "casa" com
reputação herdada) e metas de geração; fim de run exibe a *saga* em vez de 7 barras.
**U9. Curva de tensão do narrador** (S) — gráfico no Diário com orçamento de drama gasto/poupado (lição 9).
**U10. Relatório de mercado trimestral** (S/M; lição 14) — quota por gênero, capacidade de prensagem, preço médio de adiantamento.
**U11. Dificuldade adaptativa visível** (S) — hoje "dificuldade em 4 eixos"; mostrar o **feedback de risco** (ex.: "caixa
fraco: o narrador alivia a pressão de dinheiro" já existe em `situations17`) como selo discreto na Mesa.
**U12. Auditoria de dilemas** (S; lição 15) — script que lê `sits17`/`sitsworld17` e marca opções dominantes (sempre a "segura"
vence); correção de dados antes de novas situações.

Feedback loops/dificuldade: usar o playbot (`playbot17.ts`) como regressão — cada nova ideia deve passar por um lote de 36
corridas e **não alterar a mediana de caixa final em mais de ±20%** (balance17 ainda tem pendência: 360 decrescente com fama).

---------------------------------------------------------------------------------------------------------------------------

## 5. Top 30 priorizado e frentes paralelas (estilo A-J da Rodada 17)

Critério: impacto em decisões × reuso da fundação R17 × risco. Dependências indicam a ordem.

### Frente A — Direitos, editora e jurídico
1. **D2 Splits/metadados/créditos** (S/M) — base de A; nada antes.
2. **D1 Sociedades por país + editora** (L) — dep.: D2 (caixa preta).
3. **D3 Direitos conexos e rescisão** (M) — dep.: D1.
4. **D4 Precedentes jurídicos** (M) — dep.: `facts17`; consome `w4.laws`.
Entregáveis comuns: nova chave `s.x4.rights18`, Fatos `credit_dispute`, `audit`, `ruling`.

### Frente B — Cadeia física, contratos e A&R
5. **P1 Fábricas/distribuidores/agregadores** (M) — dep.: `industry/`, `rollout`.
6. **D5 Contratos de desenvolvimento/imprint/JV** (M) — dep.: `contracts2`, `offers12`.
7. **U10 Relatório de mercado** (S/M) — lê P1 e D5; independente para começar.

### Frente C — Mídia, descoberta e estilo
8. **M1 Rádio: estações/formatos/consultores** (L) — dep.: `payola`; produz `s.x4.radio18`.
9. **M2 Playlist/algoritmo/fraude** (M) — dep.: M1 para compartilhar "programação" (reutilizar tipos).
10. **M3 Viral/ressurgimento de catálogo** (S/M) — dep.: `sync15`.
11. **M4 Clipes + coreografia** (M) — dep.: `rollout`, `looks17`.
12. **C1 DJ/clube/remix** (M/L) — dep.: `scenedefs17`, `charts7`.

### Frente D — Ao vivo e promoção
13. **V1 Logística de turnê** (M/L) — dep.: `tour12`, `route16`.
14. **V2 Gigantes de promoção/bilhetagem** (L) — dep.: V1 (settlement), `venues17`.
15. **V3 Cuidado e responsabilidade** (M) — dep.: `stress17`, V1 (seguro).
16. **V4 Merch/street teams/facções de fandom** (M) — dep.: `fan15`, `merch17`.

### Frente E — Criação e ecossistema de talento
17. **K1 Camps/topline/pitching** (M) — dep.: D2 (créditos).
18. **K2 Sessão/house band** (S/M) — dep.: `w4.union`.
19. **K3 Educação musical** (M) — dep.: `scout11` (nova fonte).
20. **M6 TV de talentos** (M) — dep.: `discovery.ts`, `ventures9`.

### Frente F — Mercados regionais e idols
21. **R3a Brasil (sertanejo/funk/ECAD)** (M) — dep.: D1 (ECAD) e `Market18`.
22. **R1 K-pop completo** (M) — dep.: `w4.trainees`, D5.
23. **R2 Idols japoneses** (M) — dep.: A2 (bundle).
24. **R3 b-f Nigéria/Índia/Jamaica/Latina/Gospel** (L, fatiar) — dep.: `Market18` do item 21.

### Frente G — Telas, artes irmãs e tecnologia
25. **T1 Compositor de trilhas/Broadway** (L) — dep.: `careers12` novo ID, `sync15`.
26. **S1 IA (deepfake, processo, elegibilidade)** (M) — dep.: `consent8`, D4.

### Frente H — Prêmios, sociedade e imprensa
27. **A1 Política das premiações** (M) + **A2 Lobby de paradas** (S) — dep.: `ceremonies8`, `charts`.
28. **M5 Jornalismo como carreira** (M) + **S2/S3/S4** (censura/exílio, filantropia, cidade da música) — dep.: `careers12`, `fame16`.

### Frente I — UX, legibilidade e motivação (começa primeiro; todas as demais plugam nela)
29. **U1 Dinâmica + U2 Inbox/Conselheiro v2 + U3 `explain18`** (M, três mãos) — dep.: nenhuma; **entregar a API na semana 1**
    (`registerExplain`, `registerInboxKind`, `registerAdvisorTip`) para que A-H registrem seus textos sem conflito.
30. **U4 Decisões do selo + U5 Ano em revista + U6 Biografia + U7 Metas/Doutrinas + U8 Dinastia + U9 curva + U12 auditoria**
    (M cada; sprint 2) — dep.: item 29 e Fatos dos demais.

### Ordem sugerida e riscos
- Semana 1: **I (APIs)** + **A1** (D2) + **B1** (P1). Em paralelo: C (M1) começa só com tipos/dados.
- Semana 2: A (D1), C (M2/M3/M4), D (V1), F (Market18 + Brasil).
- Semana 3: D5, V2/V3, K1-K3, R1/R2, S1/T1 (lotes menores), integração e playbot.
- Riscos: (i) explosão de dados regionais — manter `Market18` com 6-8 campos e dados em arquivos separados por região;
  (ii) conflitos de merge em `careers12.ts`, `ui/sys/index.ts`, `events*.ts`: cada frente cria `*18.ts` próprio e só registra;
  (iii) equilíbrio: M1/M2/V2 mexem na renda do streaming/shows; rodar playbot17 (36 corridas) a cada frente e travar ±20%;
  (iv) conteúdo sensível (IA, desastres de multidão, exílio): respeitar a regra de R17 — pessoas reais só com fatos públicos e
  nada de morte de pessoa real por sorteio; desastres reais só como crônica, nunca como evento com vítimas reais no modo exato.
- Convenção: toda ideia deve emitir Fatos (`emitFact`), usar `addStress`/`grantHold`/`scandal` onde houver custo humano, e expor
  `why[]` para o `explain18`.

---------------------------------------------------------------------------------------------------------------------------

## Fontes (pesquisa web, resultados rasos mas úteis)
- Dinâmica do FM: pcgamer/primagames/fmscout (FM2018) — hierarquia, grupos sociais, pacotes de scouting.
- CK3: primagames/thesixthaxis (estilos de vida, perks, esquemas) e fórum Paradox (visão: personagens e histórias emergentes).
- RimWorld: Wikipedia/rimworldwiki (narrador estilo L4D; Cassandra/Phoebe). Frostpunk: reviews/gamepedia (Esperança × Descontentamento).
- Victoria 3: Paradox Dev Diary #7 e #57 (pops, grupos de interesse, legitimidade e tempo de aprovação de leis).
- Tycoon: vaporlens/Game Dev Tycoon (ciclo e marcos), Capitalism Lab (wikipedia, capitalismlab.com), Steam "CD Market - Music Label Sim".
- Sociedades: completemusicupdate (SACEM 2023), jasrac, merlin.obs.coe.int (Diretiva 2014/26/UE), ecad.org.br/WIPO (ECAD).
- Vinil: CBC/Billboard/Consequence (espera de 8 → 22 semanas, perda de 60-70% por perder a data).
- Turnê: daysheets.com e tseentertainment (garantia, "versus", settlement; custos do local 25-30%).
- K-pop: Wikipedia "Slave contract", Korea Times 2009, ajudaily 2017 (KFTC e contratos de trainees).
- Streaming: Digital Music News/Forbes/CMU (Discovery Mode ~30%, processos 2025). Sync: synchtank/promise.legal (MFN, 50/50).
- IA: ABC/Boston.com (RIAA × Suno/Udio, jun 2024), theplayground. Japão: nippon.com/Martin Cid (AKB48, Oricon).
- Rádio: Wikipedia/radio encyclopedia (Burkhart/Abrams). Prêmios: BuzzFeed/Gulf News (caso Riseborough 2023).

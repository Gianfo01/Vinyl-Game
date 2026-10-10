# Plano da Rodada 19 — "Tudo conversa": aprofundar ligações, história real e mecânicas que faltam

Base: `ideas19.md` (diagnóstico, 34 ligações I1–I34, 16 ajustes J, 28 ideias reais N1–N28, 33 mecânicas que faltam M1–M33),
R18 inteira e os quatro trabalhos que ainda estão sendo integrados: **final18** (equilíbrio/diversão/UX), **era1889**
(1889–1919), **decide18** (decisões com consequência agora/depois/ambas, home e caixa de entrada dinâmicas) e **cine18**
(cenas que mudam com decisões, cerimônia do envelope, hologramas e carreira póstuma). **artist18** (ser contratado por
gravadoras, sociedades) já entrou.

Regra de ouro da R19: **nenhum sistema novo entra sem pelo menos 3 ligações** (lê de 1+, escreve em 2+) e sem consumidor
no barramento de Fatos. Toda mecânica nova aparece no "por quê?" (`explain18`), no tutorial (`help18`) e numa cena ou
manchete quando for marcante.

---

## Frente 0 — Infra para a integração (primeiro; todas dependem)
| # | O quê | Por quê |
|---|---|---|
| 0.1 | **Rng por sistema** (`rngVersion` no save) | Um evento a mais não embaralha o resto; A/B de equilíbrio passa a valer |
| 0.2 | **Matriz Fato → consumidores** + teste que falha se um tipo de fato não tiver ouvinte | ~75 tipos emitidos, ~15 ouvidos hoje |
| 0.3 | **Bots adversários** (6 perfis que caçam exploits) no lote de equilíbrio | Encontrar estratégias dominantes antes do jogador |
| 0.4 | **Auditoria de `appeal`** (64 fontes) com teto por categoria em `caps18` | Bônus empilhados saturam |
| 0.5 | **Dupla contagem de streaming** (`STREAM_PAYOUT17` × `stream18`) — se final18 não resolver | Economia correta |
| 0.6 | **Fachadas únicas**: 3 módulos de fandom → 1, 5 de rivais → 1, 4 de prêmios → 1 (API antiga vira alias) | Menos ruído, ligações num lugar só |

## Frente 1 — Malha de ligações (o coração da rodada)
As 34 ligações de `ideas19` §3 mais as que nascem dos trabalhos em curso. Cada linha = regra + gancho + teste.

**Com sistemas existentes**
- Direitos × espólio × herdeiros × hologramas: `neural` passa a exigir aprovação do espólio (`heirs8`), paga via `rights18`, gera fato e escândalo se for de mau gosto.
- Cadeia física (`supply18`) × hype × rollout: fila na fábrica atrasa lançamento → hype esfria → rádio perde a janela.
- Rádio (`radio18`) × censura (`society18`) × leis da época (`world4/laws`): música banida vira pirataria e rádio pirata.
- Festivais (`fest18`) × segurança de shows (`live18`) × crime: festival lotado sem segurança → tragédia → processo → lei nova.
- Qualidade (`quality18`, 10 dimensões) × sessões (`session18`) × CA/PA (`ability18`): músico de estúdio bom sobe a dimensão certa e ganha experiência.
- Regiões × câmbio (`econ18`): receita em moeda local, crise cambial atinge quem depende do submercado.
- Rivais que aprendem (`rivalmind18`) × relatório (`report18`): espionagem revela intenção; pactos e traições.
- Campus/"Nosso mundo" × moral da equipe × qualidade × atração de talento.
- Prestígio (`paths18`) × críticos × prêmios: júri lê o caminho que você escolheu.

**Com os trabalhos que estão entrando agora**
- **era1889**: cilindro/disco, editoras de partitura, patentes (Edison × Berliner), vaudeville e piano roll alimentam direitos (direito mecânico 1909), cadeia física (prensagem de goma-laca), rádio (só a partir de 1920) e marcos da história.
- **decide18**: toda decisão nova registra a consequência adiada como fato → ouvintes de outros sistemas reagem (promessa quebrada → rancor em `holds17`; investimento → `campus18`; mentira → `scandal17`). A caixa de entrada vira o ponto único de prazos (calendário P2).
- **cine18**: cena lê o estado (roupa, palco, prédio, multidão, idade, formação) e escreve fato ("discurso polêmico" → imprensa). Cerimônia do envelope usa o júri unificado (0.6). Holograma liga a espólio, direitos, ética por país/época.
- **artist18**: ofertas de gravadoras usam a reputação real das gravadoras NPC (honestidade, histórico de processos, falências); sociedade com NPC participa de festivais, campus e venda da empresa.

## Frente 2 — História real como conteúdo
- Marcos 43 → ~150 (fatiado por década, de 1889 a 2023), cada um com escolha e consequência, não só texto.
- Cartão "A história real" ao lado do que aconteceu na sua partida (nos modos alternativos).
- Pilotos (um por fatia): MTV e a barreira de cor, rádio pirata e a lei de 1967, Eurovisão, festival gratuito que deu errado.
- Fora do modo "Vida real exata": nomes fictícios nos casos sensíveis; conferir os itens † antes de virar dado.

## Frente 3 — Direitos, masters e dinheiro
- Falência de gravadora e **leilão de masters** (caso Stax) + banco chamando a dívida (hoje 0 falências em 21 campanhas).
- Venda de contrato de estrela (Sun → RCA), empresário total (Coronel Parker).
- Regravação "Versão do Artista" e direito de preferência (Taylor Swift).
- Securitização de catálogo (Bowie Bonds) com risco tecnológico; **múltiplos de catálogo ligados aos juros** (M13).
- Cumprir contrato com disco ruim de propósito (Prince × Warner); briga de gestão (Klein).
- **Cláusulas de saída e multa rescisória** (M2) e **janelas de transferência / empréstimo de artista** entre gravadoras (M1).

## Frente 4 — Pós-vida e espólio
- Espólio como personagem (herdeiros com opinião, brigas, processos); palco digital como empreendimento (ABBA Voyage) ligado ao campus.
- Prêmios póstumos, discos do baú, cinebiografia ligada a `screen18`.

## Frente 5 — Ao vivo, fãs e festivais
- Fandom unificado (0.6) com motivações; boicote ao monopólio de ingressos (Pearl Jam × Ticketmaster).
- Vinil e Record Store Day; **calendário sazonal** de lançamentos (M6: Natal, verão, festivais).
- Bandas cover/tributo (M24) que mantêm o catálogo vivo e pagam direitos.

## Frente 6 — Regiões, sociedade, política
- República-comuna e exílio (Fela/Kalakuta, Tropicália); império do cassete (T-Series), reggae e soundsystem, salsa (Fania), selo de rua do hip-hop.
- **Cota de músicos estrangeiros / vistos de turnê** (M11), **needle time** e sessões de rádio (M9), música em campanha política (M29).
- **Greve de gravação jogável** (1942/1948) com fundo de músicos (M10), ligada a sindicato e à era1889→1940.

## Frente 7 — Mercado, rivais, plataformas
- **Certificações por país e época** com fórmula de streams (M8) — a de maior impacto por esforço.
- **Pesquisa de mercado / teste de faixa** antes de escolher o single (M7).
- "Perfeita para a playlist" e artistas-fantasma (alegações; tratar como ficção), saída de superestrelas para contratos 360 de promotora (Madonna × Live Nation), remédios antitruste em fusões.
- Corrida do ouro numa cena (Seattle) com ciclo de vida da cena.
- **Ondas de cancelamento digital** (M20); **seguro de pessoa-chave e plano de saúde** (M17); **cultura da empresa** (M4); **naming rights** (M30).

## Frente 8 — UX, ritmo e consolidação
- Três perguntas no topo (Hoje / Ameaças / Andamento), **calendário único de prazos**, orçamento de notificações.
- Recibo de decisão, transição de década, tela "por que perdi?", divulgação progressiva das áreas.
- Tutorial e (?) para tudo que entrar.

---

## Equilíbrio e diversão (metas que todas as frentes respeitam)
- Falência no perfil equilibrado: 10–30%. Estratégia arriscada bem jogada pode superar a cautelosa (com variância maior).
- Carreira de artista: não chegar a fama 80+ e milhões garantidos em 5 anos.
- Prestígio, crítica e reputação sem bater no teto.
- Lote rápido (bots reais que tomam ações) a cada frente; nada do futuro na tela.

## Ordem de execução (agentes em paralelo)
1. **Onda 1**: Frente 0 inteira + protótipo do calendário único.
2. **Onda 2**: Frente 1 (malha de ligações, dividida em 3 agentes por grupo de sistemas) + piloto da Frente 2 (4 marcos).
3. **Onda 3**: Frentes 3, 4, 5, 6, 7 em paralelo (um agente cada).
4. **Onda 4**: Frente 8, integrador final (testes, equilíbrio, Chromium em 1889/1955/1975/2005/2030), documentação e publicação.

---

## Frente 9 — 13 sistemas novos costurados na malha

Cada sistema abaixo cumpre a regra de ouro: **lê** de sistemas existentes, **escreve** em pelo menos dois, **emite fatos** com
ouvintes, tem **cena ou manchete** e aparece no "por quê?" e no tutorial. A última coluna mostra a frente onde entra.

### 9.1 Bandas cover e tributo (`tribute19`)
- **Nasce de**: fama + fãs leais (`fans18`) + ausência do original (separação, morte, hiato — `dyn18`, `life`, `heirs8`). Tipos: tributo-espetáculo, banda de baile/bar, imitador, paródia, versão orquestral/jazz, "ex-integrantes de X".
- **Pessoas**: integrantes com CA/PA (`ability18`); um sósia vocal pode virar substituto oficial (caso Journey).
- **Lê**: direitos (`rights18`), regiões e circuitos (`regions18`, `circuits18`: Las Vegas, cassinos, Japão, pubs do Reino Unido), era (baile 1889+, imitadores 1970+, YouTube 2006+, voz de IA 2020+ → `ai18`).
- **Escreve**: royalties de execução (`ledger18`), demanda do catálogo e valor de venda (`stream18`, `sale17`), concorrência com holograma/reunião (cine18, `live18`), boatos e processos (`press18`, `crime17`).
- **Decisões por carreira**: licenciar/processar/assinar (gravadora), aprovar/ignorar/contratar o sósia (artista), festival de tributos e residência (promotor/casa), começar tocando covers (músico — dinheiro rápido × rótulo).
- **Fatos**: `tribute_born`, `tribute_licensed`, `tribute_sued`, `soundalike_hired`, `fake_farewell`.

### 9.2 Músicos de estúdio e de apoio (`session19`)
- Coletivos reais por época (Wrecking Crew, Funk Brothers, Nashville A-Team, Muscle Shoals, Motown) + fictícios fora do modo exato.
- **Lê/escreve**: `session18` e `quality18` (sobem dimensões específicas), CA/PA, contratação (`hire17`), créditos e royalties (`rights18`).
- **História**: tocou sem crédito em sucessos → décadas depois documentário (`screen18`) → processo por crédito (`holds17` rancor) → pode virar artista ou membro de tributo (9.1).

### 9.3 Camps de composição e créditos divididos (`writers19`)
- Vários compositores por faixa, porcentagens negociadas (`contracts18`), ghostwriter, música feita para outro artista.
- **Escreve**: editoras e direitos de autor (`rights18`), qualidade (`quality18` composição), brigas (`feud18`), processos de plágio (`crime17`/tribunal).
- **História**: o ghostwriter vira estrela e revela quem escreveu o quê → escândalo (`scandal17`).

### 9.4 Remix, DJs e white labels (`remix19`)
- Remix de clube ressuscita um fracasso; white label anônimo testa a pista; residência de DJ (Ibiza, Las Vegas) como carreira e casa de show.
- **Lê**: catálogo e direitos, cenas locais (`scenedefs17`), gêneros em alta.
- **Escreve**: paradas e streaming, hype, `fest18` (palco eletrônico), carreira DJ (`careerpages17`). Liga com 9.5: remix que viraliza.

### 9.5 Sucesso tardio e segunda chance (`revival19`)
- Faixa antiga explode por filme, série, comercial, remix ou vídeo curto. Gatilhos: 9.6, 9.7, 9.4, `screen18`, `media18`.
- **Decisão**: relançar, remasterizar, turnê de volta, licenciar mais, ou deixar quieto (e o artista não gostar). Artista morto → espólio e holograma.
- **Escreve**: catálogo (múltiplos, Frente 3), fãs novos de outra geração (`fans18`), tributos nascem (9.1), certificações tardias (M8).

### 9.6 Música em publicidade e jingles (`adsync19`)
- Ofertas de marcas por época (rádio, TV, internet), jingle encomendado, faixa licenciada; artista desconhecido lançado por comercial.
- **Trade-off**: dinheiro e alcance × credibilidade (`identity`, críticos, fãs puristas). **Escreve**: `license17`, `rights18`, `revival19`.

### 9.7 Trilhas de cinema, séries e games (`score19`)
- Carreira de compositor de trilha, "needle drop" numa série, trilha de jogo (1980+), canção-tema e prêmio de cinema (`awards18`).
- **Lê**: `screen18` (filmes e cinebiografias), estúdios e orquestra (`hire17`). **Escreve**: revival, prestígio (`paths18`), cena de estreia (cine18).

### 9.8 Shows e discos beneficentes (`charity19`)
- Megashow ou single coletivo (Live Aid, We Are the World) disparado por crise mundial (`world4`, `society18`).
- **Escreve**: imagem, prestígio, relações (rivais no mesmo palco → `holds17` favores ou rancor), escândalo se o dinheiro sumir. Cena com todos no palco.

### 9.9 Escolas, conservatórios e igrejas como celeiros (`schools19`)
- Igreja gospel → soul, conservatórios, escolas tipo "Fama", programas de bolsas; você pode fundar uma (campus).
- **Escreve**: descoberta de talento (`discover18`, PA mais alto), regiões, campus18 (prédio novo), reputação local.

### 9.10 Jornalismo musical e fanzines (`zines19`)
- Revista própria, comprar uma revista, fanzines impressos que criam cenas, críticos que viram editores.
- **Lê/escreve**: `press18` (veículos e linha editorial), críticos, cenas (`scenedefs17`), boatos. Conflito de interesse se você resenha seus artistas.

### 9.11 Fraudes, sósias e bandas-fantasma (`fakes19`)
- Dublagem descoberta (Milli Vanilli), bandas-fantasma usando nome famoso (o falso Fleetwood Mac de 1974), voz de IA não autorizada.
- **Liga**: 9.1 (tributo que passa do limite), `crime17`, `scandal17`, prêmios cassados (`awards18`), processos, `ai18`.

### 9.12 Concursos e programas de talentos (`contests19`)
- Concursos de rádio (1920+), festivais da canção de TV (1960+, Brasil incluso), Idol/The Voice (2000+); você pode ser jurado, patrocinar ou produzir.
- **Escreve**: descoberta (`discover18`), contratos prontos (`contracts18`), cenas de final ao vivo e envelope (cine18), carreira TV (`tv18`).

### 9.13 Endosso de instrumentos e instrumento-ícone (`gear19`)
- Assinaturas (guitarra, bateria, sintetizador) por era; instrumento icônico vira relíquia (`relics18`) e entra em leilão e museu.
- **Escreve**: renda (`ledger18`), imagem (`identity`), sonoridade da era (gêneros), relíquias criadas na partida. Fabricante como empresa compravel (`deals18`).

### Cadeias de história (exemplos que o teste deve conseguir reproduzir)
1. Banda se separa → tributos surgem (9.1) → o sósia é contratado pela reunião → os fãs se dividem → documentário (`screen18`) → o músico de estúdio (9.2) processa por crédito.
2. Faixa de 1983 fracassou → remix de clube em 1997 (9.4) → comercial em 2009 (9.6) → série em 2022 (9.7) → revival (9.5) → certificação tardia (M8) → valor do catálogo dispara (Frente 3) → banco aceita como garantia (Bowie Bonds).
3. Garoto do coral da igreja (9.9) → concurso de TV (9.12) → camp de composição (9.3) → ghostwriter de estrela → revela tudo → escândalo → vira solo.
4. Crise mundial → show beneficente (9.8) → rivais no mesmo palco → pacto ou briga (`feud18`) → dinheiro some → investigação (`crime17`).
5. Guitarra do artista vira assinatura (9.13) → artista morre → guitarra vira relíquia → leilão → herdeiros brigam (`heirs8`) → holograma ou tributo oficial (9.1).
6. Fanzine (9.10) cria a cena local → corrida do ouro (Frente 7) → bandas-fantasma e sósias (9.11) → lei nova.

### Onde entram na ordem de execução
- **Onda 1**: nada novo; só a infra (Frente 0) recebe os tipos de fato desses 13 sistemas na matriz.
- **Onda 2**: 9.1, 9.2, 9.3, 9.5 (os de maior reuso) junto com a malha de ligações.
- **Onda 3**: 9.4, 9.6, 9.7 na Frente 7 (mercado); 9.8, 9.12 na Frente 5 (ao vivo); 9.9 na Frente 6; 9.10, 9.11 na Frente 2/3; 9.13 na Frente 4 (relíquias e espólio).
- **Onda 4**: o integrador roda as 6 cadeias acima com bots e confere se cada uma acontece em pelo menos 1 de cada 10 partidas longas.

// Rodada 18 (tutorial18) — ajuda de TODAS as páginas do menu (nav17 + páginas registradas por outras frentes).
// Regra: o quê / como (com exemplo) / 1–3 dicas / páginas ligadas / termos do glossário.

import { H } from './help18';

// ---------------------------------------------------------------- Início
H('cockpit', ['Cockpit', 'Cockpit'],
  ['Sua mesa de comando: caixa, alertas, próximos passos do conselheiro, caixa de entrada e as três perguntas do mês (decidir agora / o que funciona / ameaças).', 'Your command desk: cash, alerts, advisor next steps, inbox and the three questions of the month (decide now / what works / threats).'],
  ['Comece cada mês aqui: resolva o que "pede resposta", leia o topo do ranking do conselheiro e avance. Ex.: "Caixa para 3 meses" em amarelo → corte marketing ou adie um lançamento antes de avançar.', 'Start each month here: handle what "needs a reply", read the top of the advisor ranking and advance. E.g. "3 months of runway" in yellow → cut marketing or delay a release before advancing.'],
  [['Passe o mouse nos números sublinhados: o "por quê" abre em camadas.', 'Hover underlined numbers: the "why" opens in layers.'], ['Mensagens ignoradas aplicam a última opção ao expirar.', 'Ignored messages apply the last option when they expire.'],
    ['Cada opção mostra "Agora" e "Depois": escolhas voltam meses depois (Consequências pendentes). ⏱ = vence na semana; % = aposta; 🔒 = travada (o motivo aparece).', 'Each option shows "Now" and "Later": choices come back months later (Pending consequences). ⏱ = expires this week; % = gamble; 🔒 = locked (reason shown).'],
    ['O topo é vivo: letreiro de notícias e paradas, próximas semanas, grandes momentos, humor do elenco, minigráficos e o holofote (›). "Ligações do mês" mostra um sistema mexendo em outro.', 'The top is live: news and chart ticker, coming weeks, big moments, roster mood, sparklines and the spotlight (›). "This month\'s links" shows one system nudging another.']],
  ['plan', 'finance', 'long18'], ['runway']);
H('plan', ['Central de decisões', 'Decision hub'],
  ['Agenda dos próximos 12 meses: reservas de estúdio, turnês, lançamentos, crises e histórias em andamento.', 'Next 12 months agenda: studio bookings, tours, releases, crises and running stories.'],
  ['Reserve com antecedência (sem custo até começar). Ex.: marque estúdio em março para lançar em setembro e turnê logo depois do lançamento.', 'Book ahead (no cost until it starts). E.g. book studio in March to release in September and tour right after the release.'],
  [['Turnê logo após lançamento aproveita o hype; muito antes, desperdiça.', 'Touring right after a release rides the hype; far before wastes it.']], ['studio', 'releases', 'shows']);
H('goals', ['Metas e conquistas', 'Goals and achievements'],
  ['Objetivos do cenário, conquistas da run e o museu do selo (discos de ouro, prêmios, relíquias).', 'Scenario goals, run achievements and the label museum (gold records, awards, relics).'],
  ['Escolha um cenário no início para ter metas com prazo; as medalhas dependem do tempo. Ex.: "3 top 10 até 1970".', 'Pick a scenario at start for timed goals; medals depend on time. E.g. "3 top 10s by 1970".'], [], ['long18', 'tut18']);
H('diary', ['Diário da run', 'Run diary'],
  ['Tudo o que aconteceu, mês a mês: contratações, lançamentos, mortes, escândalos, recordes. É a memória do jogo.', 'Everything that happened month by month: signings, releases, deaths, scandals, records. The game\'s memory.'],
  ['Filtre por tipo para achar a causa de algo. Ex.: por que o artista saiu? Procure "saída" e veja o fato anterior.', 'Filter by type to find the cause of something. E.g. why did the act leave? Look for "exit" and the fact before it.']);
H('inbox', ['Caixa de entrada', 'Inbox'],
  ['Mensagens tipadas por categoria e prioridade, com "ir para" e resposta.', 'Messages typed by category and priority, with "go to" and reply.'],
  ['Responda primeiro as que pedem resposta. Ex.: proposta de rádio sem resposta em 6 semanas aplica "Recusar" (o último botão).', 'Reply first to those needing an answer. E.g. a radio offer unanswered for 6 weeks applies "Refuse" (the last button).'],
  [['Fios: consequências e mensagens da mesma pessoa ficam juntas ("↳ continuação de…"). O tom (caloroso, seco, irritado) vem da relação e da personalidade de quem escreve.', 'Threads: consequences and messages from the same person stay together ("↳ follow-up to…"). The tone (warm, curt, irritated) comes from the writer\'s relationship and personality.'],
    ['Adiar esconde por 4 semanas; marque várias e arquive ou adie em lote.', 'Snooze hides for 4 weeks; tick several to archive or snooze in bulk.']]);

// ---------------------------------------------------------------- Empresa
H('hq', ['Sede', 'HQ'],
  ['Sua empresa vista de cima em pixel art: cada pessoa faz algo real (gravar, compor, descansar). Melhorias da sede liberam salas.', 'Your company from above in pixel art: everyone does something real (recording, writing, resting). HQ upgrades unlock rooms.'],
  ['Clique numa pessoa para abrir a ficha. Melhore a sede quando a equipe passar do espaço. Ex.: estúdio próprio corta custo de gravação.', 'Click a person to open their sheet. Upgrade the HQ when staff outgrow it. E.g. an in-house studio cuts recording costs.'], [], ['company', 'team']);
H('campus18', ['Nosso mundo', 'Our world'],
  ['Mapa em pixel art de tudo o que você possui: sede, filiais, estúdios, casas de shows, festivais, escola, museu, fábricas, subselos e sua casa. O tamanho segue o nível; o estilo, o ano da construção (tijolo 1889 → vidro → eco 2030); obras, incêndios e vendas aparecem no mapa.', 'A pixel-art map of everything you own: HQ, branches, studios, venues, festivals, school, museum, plants, sub-labels and your home. Size follows level; style follows the year it was built (1889 brick → glass → 2030 eco); works, fires and sales show on the map.'],
  ['Clique num prédio para ver números e abrir a página de gestão. Em Obras escolha obra, lote e empreiteiro; a linha do tempo repete anos passados. Ex.: uma loja do selo na esquina principal com construtora padrão leva 4 meses e rende pela fama do elenco.', 'Click a building to see figures and open its management page. In Construction pick a project, lot and contractor; the timeline replays past years. E.g. a label store on a main corner with a standard builder takes 4 months and earns from roster fame.'],
  [['Empreiteiro barato atrasa e estoura mais; reforma muda a fachada para o estilo atual e conserta incêndios.', 'Cheap contractors run late and over budget more; renovation updates the façade to today\'s style and fixes fire damage.']], ['hq', 'finance', 'wealth'], ['capex']);
H('company', ['Empresa', 'Company'],
  ['Ficha do selo: reputação (artística, comercial, com artistas, institucional), territórios, equipamento e legado.', 'Label sheet: reputation (artistic, commercial, with artists, institutional), territories, gear and legacy.'],
  ['Reputação com artistas pesa nas propostas; a institucional, em prêmios e licenças. Ex.: atrasar royalties derruba "com artistas".', 'Reputation with artists weighs on offers; institutional on awards and licences. E.g. late royalties drop "with artists".'], [], ['finance', 'team']);
H('team', ['Equipe e ritmo', 'Staff and pace'],
  ['Quem trabalha para você (A&R, jurídico, promotor, analista...) e o ritmo de trabalho da empresa.', 'Who works for you (A&R, legal, promoter, analyst...) and the company work pace.'],
  ['Contrate pelo gargalo: sem A&R você vê faixas largas de talento; sem jurídico, contratos piores. Ex.: um analista libera relatório mensal.', 'Hire for the bottleneck: without A&R you see wide talent ranges; without legal, worse contracts. E.g. an analyst unlocks a monthly report.'],
  [['Ritmo alto rende mais e gera estresse na equipe.', 'High pace yields more and stresses the staff.']], ['agenda17', 'dyn18']);
H('finance', ['Finanças', 'Finance'],
  ['DRE (resultado operacional × financeiro × impostos), fluxo de caixa, a receber/a pagar, capital, empréstimos e bolsa.', 'Income statement (operating × financing × taxes), cash flow, receivables/payables, capital, loans and stock market.'],
  ['Olhe o lucro OPERACIONAL: empréstimo entra no caixa mas não é receita. Ex.: vendas de março chegam em maio (recebíveis) — caixa baixo com DRE positiva é normal.', 'Watch OPERATING profit: a loan adds cash but is not revenue. E.g. March sales arrive in May (receivables) — low cash with a positive P&L is normal.'],
  [['O conselho avalia o lucro operacional, não o caixa.', 'The board judges operating profit, not cash.']], ['business', 'rights18', 'supply18'], ['pl', 'receivables', 'advance', 'recoup', 'runway']);
H('business', ['Negócios', 'Business'],
  ['Estratégia por era, subselos, empresas, catálogo, jurídico, marcas e sync, disputas, direitos e adoção de tecnologias.', 'Era strategy, sub-labels, companies, catalog, legal, brands and sync, disputes, rights and technology adoption.'],
  ['Use as abas como um painel de diretoria. Ex.: em 1983, "Adoção e futuro" mostra quanto do mercado já tem CD — prensar CD cedo demais encalha estoque.', 'Use the tabs as a board panel. E.g. in 1983, "Adoption and future" shows how much of the market has CD — pressing CD too early leaves stock unsold.'],
  [], ['finance', 'rights18'], ['sync', 'masters', 'catalog']);
H('rights18', ['Direitos', 'Rights'],
  ['Obras (composição) e gravações (fonograma) de cada lançamento: splits, sociedades de arrecadação, extratos, caixa preta, disputas, autorizações e precedentes reais.', 'Works (composition) and recordings (master) of each release: splits, collecting societies, statements, black box, disputes, clearances and real precedents.'],
  ['Cadastre splits limpos ao lançar para não cair na caixa preta. Ex.: sample sem autorização trava sync e abre disputa com caução.', 'Register clean splits at release to stay out of the black box. E.g. an uncleared sample blocks sync and opens a dispute with escrow.'],
  [['Dinheiro de caixa preta expira em 3 anos: reclame antes.', 'Black-box money expires in 3 years: claim it first.']], ['business', 'cp17-publisher'], ['mechanical', 'performance', 'neighbouring', 'pro', 'ecad', 'blackbox', 'split', 'sample', 'termination']);
H('supply18', ['Cadeia física e acordos', 'Physical supply and deals'],
  ['Prensagem (fábricas, filas, defeitos), distribuição/agregador, estoque, devoluções, acordos (desenvolvimento, selo-vaidade, JV) e relatório de mercado.', 'Pressing (plants, queues, defects), distribution/aggregator, stock, returns, deals (development, vanity imprint, JV) and market report.'],
  ['Reserve a fábrica cedo: em 2020 a fila do vinil chega a 22 semanas. Ex.: lançamento com material atrasado vende só digital até o disco chegar.', 'Book the plant early: in 2020 the vinyl queue hits 22 weeks. E.g. a release with late stock sells digital only until the records arrive.'],
  [['Distribuidora independente: mais barata, mas pode quebrar e segurar 20%.', 'Indie distributor: cheaper, but may go bust and holds 20%.']], ['finance', 'industry'], ['pd', 'aggregator', 'returns', 'cutout', 'distribution']);
H('long18', ['Rumo do selo', 'Label direction'],
  ['Caminhos de vitória com KPIs, doutrinas, políticas de delegação, post-mortems de lançamentos, ano em revista, biografia, dinastia e dificuldade adaptativa.', 'Win paths with KPIs, doctrines, delegation policies, release post-mortems, year in review, biography, dynasty and adaptive difficulty.'],
  ['Escolha até 3 caminhos e acompanhe os marcos (35/65/90). Ex.: "Indie sustentável" pede margem e artistas felizes, não nº 1.', 'Pick up to 3 paths and track milestones (35/65/90). E.g. "Sustainable indie" wants margin and happy artists, not #1s.'],
  [['Leia o post-mortem 12 semanas após cada disco: ele diz o que falhou.', 'Read the post-mortem 12 weeks after each record: it says what failed.']], ['cockpit', 'goals'], ['postmortem']);

// ---------------------------------------------------------------- Artistas
H('artists', ['Artistas', 'Artists'],
  ['Seu elenco: agenda do mês, humor, estresse, contratos, hype, fama por país e ações rápidas.', 'Your roster: monthly agenda, mood, stress, contracts, hype, fame by country and quick actions.'],
  ['Cada pessoa tem 100% de capacidade por mês. Ex.: estúdio 60% + shows 40% é cheio; somar promoção gera estresse.', 'Everyone has 100% capacity a month. E.g. studio 60% + shows 40% is full; adding promo creates stress.'],
  [['Abra a ficha (clique no nome) para ver Desenvolvimento (CA/PA), Trajetória, Rixas e Fãs.', 'Open the sheet (click the name) for Development (CA/PA), Trajectory, Feuds and Fans.']], ['people', 'dyn18', 'talent18'], ['capa', 'hype', 'stress']);
H('people', ['Pessoas', 'People'],
  ['Todas as pessoas do seu mundo: elenco, saúde, relações, segredos, equipe e redes/cartas.', 'Everyone in your world: roster, health, relations, secrets, staff and social/letters.'],
  ['Use "Relações" antes de juntar artistas num feat ou turnê. Ex.: dois com mágoa no mesmo ônibus → briga.', 'Check "Relations" before pairing acts on a feat or tour. E.g. two with a grudge on one bus → fight.'], [], ['artists', 'dyn18']);
H('dyn18', ['Dinâmica', 'Dynamics'],
  ['Hierarquia, grupos, porta-vozes, humor e promessas dentro das bandas, do elenco e da equipe.', 'Hierarchy, cliques, spokespeople, mood and promises inside bands, roster and staff.'],
  ['Fale com o porta-voz: ele move o grupo. Ex.: elogiar o líder sobe o humor de toda a banda; quebrar promessa derruba.', 'Talk to the spokesperson: they move the group. E.g. praising the leader lifts the whole band\'s mood; a broken promise sinks it.'], [], ['artists', 'people']);
H('market', ['Mercado (A&R)', 'Market (A&R)'],
  ['Radar de artistas livres, pipeline de negociação, olheiros/concursos/demos, leilões, feiras e dossiês.', 'Radar of free acts, negotiation pipeline, scouts/contests/demos, auctions, fairs and dossiers.'],
  ['Informação é sempre uma faixa: quanto melhor o A&R, mais estreita. Ex.: "talento 40–80" pede um almoço ou olheiro antes de oferecer muito.', 'Info is always a range: the better your A&R, the narrower. E.g. "talent 40–80" calls for a lunch or a scout before offering big.'],
  [['A chance da oferta tem "por quê": passe o mouse.', 'The offer chance has a "why": hover it.']], ['directory', 'talent18'], ['advance', 'royalty', 'deal360', 'capa', 'option']);
H('directory', ['Todos os artistas', 'All artists'],
  ['Base de todos os artistas visíveis no ano (reais e fictícios), com filtro por gênero, país e fama.', 'Database of every act visible this year (real and fictional), filterable by genre, country and fame.'],
  ['Use para achar parceiros de feat, abrir shows ou espionar rivais. Ex.: filtre seu gênero + país para ver quem disputa sua faixa de público.', 'Use it to find feat partners, openers or to spy on rivals. E.g. filter your genre + country to see who competes for your audience.']);
H('managers14', ['Empresários', 'Managers'],
  ['Empresários reais e fictícios: clientes, estilo (protetor, agressivo...), comissão e reputação.', 'Real and fictional managers: clients, style (protective, aggressive...), commission and reputation.'],
  ['Empresário forte negocia melhor por seu artista — e contra você. Ex.: renovar com quem tem empresário agressivo custa mais royalty.', 'A strong manager negotiates better for your act — and against you. E.g. renewing an act with an aggressive manager costs more royalty.']);
H('producers15', ['Produtores', 'Producers'],
  ['Produtores reais por época: assinatura sonora, química com artistas, agenda e preço.', 'Real producers by era: sonic signature, chemistry with acts, schedule and fee.'],
  ['Repetir uma parceria que deu certo aumenta a química. Ex.: produtor de disco com banda punk → coerência baixa no disco.', 'Repeating a good partnership raises chemistry. E.g. a disco producer on a punk band → low coherence on the record.'], [], ['studio']);
H('talent18', ['Talentos e formação', 'Talent and training'],
  ['Descoberta (pistas de talentos), campos de composição, banda da casa, escolas e TV de talentos.', 'Discovery (talent leads), writing camps, house band, schools and talent TV.'],
  ['Talento cru se desenvolve: PA alto + treino + minutagem. Ex.: um jovem de 17 anos com 3★ potencial pode virar 5★ com mentor.', 'Raw talent develops: high PA + training + playing time. E.g. a 17-year-old with 3★ potential can become 5★ with a mentor.'], [], ['market', 'artists'], ['capa']);

// ---------------------------------------------------------------- Música
H('project', ['Projeto musical', 'Music project'],
  ['O disco em construção: faixas, ordem (sequência), coerência, produtor e qualidade em várias dimensões.', 'The record in progress: tracks, running order, coherence, producer and multi-dimensional quality.'],
  ['Escolha as faixas, ordene (abertura forte, single cedo) e veja a previsão. Ex.: 3 baladas seguidas derrubam a "sequência".', 'Pick tracks, order them (strong opener, early single) and check the forecast. E.g. 3 ballads in a row drop "sequencing".'], [], ['creation', 'studio']);
H('creation', ['Compor', 'Write'],
  ['Composição, direção sonora, temas, receita, capa e vídeo, parcerias, encomendas e remasters.', 'Songwriting, sound direction, themes, recipe, cover and video, partnerships, commissions and remasters.'],
  ['Componha antes de reservar estúdio. Ex.: tema "vivido" (algo que aconteceu ao artista) soa mais verdadeiro para a crítica.', 'Write before booking the studio. E.g. a "lived" theme (something that happened to the act) rings truer to critics.'], [], ['project', 'studio']);
H('studio', ['Estúdio', 'Studio'],
  ['Gravação take a take: escolha estúdio, produtor, músicos de sessão e acompanhe a qualidade.', 'Take-by-take recording: choose the studio, producer, session players and follow quality.'],
  ['Mais takes = mais qualidade e mais custo/cansaço. Ex.: pare quando o ganho por take cair abaixo de 1 ponto.', 'More takes = more quality and more cost/fatigue. E.g. stop when gain per take drops below 1 point.'], [], ['producers15', 'releases']);
H('releases', ['Lançamentos', 'Releases'],
  ['Programe o rollout: teaser, singles, clipe, álbum, formatos, preço, prensagem e marketing por canal.', 'Plan the rollout: teaser, singles, video, album, formats, price, pressing and marketing per channel.'],
  ['Evite semanas com lançamento de gigante do seu gênero. Ex.: single 6 semanas antes do álbum mantém o hype até o dia.', 'Avoid weeks with a giant release in your genre. E.g. a single 6 weeks before the album keeps hype up to the day.'],
  [['Canais saturam: o 3º anúncio na mesma TV rende bem menos.', 'Channels saturate: the 3rd ad on the same TV yields far less.']], ['media', 'supply18', 'charts'], ['rollout', 'pd', 'saturation']);
H('catalog', ['Catálogo', 'Catalog'],
  ['Todos os seus lançamentos, sync, história do selo e retrospectivas. Catálogo é renda de longo prazo.', 'All your releases, sync, label story and retrospectives. Catalog is long-term income.'],
  ['Reedições e sync reativam discos velhos. Ex.: música num filme de sucesso volta às paradas 20 anos depois.', 'Reissues and sync revive old records. E.g. a song in a hit film re-charts 20 years later.'], [], ['business', 'rights18'], ['catalog', 'sync', 'masters']);
H('shows', ['Shows', 'Shows'],
  ['Turnês, shows avulsos, festivais, logística da estrada, post-mortem por show e políticas de descanso.', 'Tours, one-off shows, festivals, road logistics, per-show post-mortem and rest policies.'],
  ['Rote por demanda local (fama no país/cidade). Ex.: casa de 2 mil lugares numa cidade onde você tem 300 fãs = prejuízo.', 'Route by local demand (fame in the country/city). E.g. a 2,000-seat venue in a city with 300 fans = loss.'],
  [['Estrada aumenta entrosamento e cansaço.', 'The road raises tightness and fatigue.']], ['cal17', 'festivals'], ['guarantee', 'doorsplit', 'rider']);
H('cal17', ['Agenda de shows', 'Show calendar'],
  ['Calendário de shows com concorrência: quem toca onde e quando, inclusive rivais.', 'Show calendar with competition: who plays where and when, rivals included.'],
  ['Não marque na mesma cidade e semana de uma atração maior. Ex.: dois shows de rock no mesmo sábado dividem o público.', 'Do not book the same city and week as a bigger draw. E.g. two rock shows on the same Saturday split the crowd.'], [], ['shows']);

// ---------------------------------------------------------------- Mídia
H('news17', ['Notícias e boatos', 'News and rumors'],
  ['Matérias de fatos públicos, vazamentos e fofocas, com origem, veracidade e situação; se espalham por país.', 'Stories from public facts, leaks and gossip, with source, truth and status; they spread by country.'],
  ['Responda: negar, assumir, abafar, processar ou calar. Ex.: negar um boato verdadeiro que depois vaza dobra o escândalo.', 'Respond: deny, own it, hush, sue or stay silent. E.g. denying a true rumor that later leaks doubles the scandal.'],
  [], ['media', 'crime'], ['rumor', 'streisand']);
H('media', ['Imprensa e mídia', 'Press and media'],
  ['Imprensa e crítica, canais e reputação, streaming (descoberta e pró-rata), campanhas, rádio por formato, clipes/virais/pistas, jabá e metodologia das paradas.', 'Press and critics, channels and reputation, streaming (discovery and pro-rata), campaigns, radio by format, videos/virals/clubs, payola and chart methodology.'],
  ['Cada canal tem público, atraso e saturação. Ex.: TV vende rápido e satura; boca a boca demora e dura.', 'Each channel has audience, delay and saturation. E.g. TV sells fast and saturates; word of mouth is slow and lasting.'],
  [], ['releases', 'charts'], ['payola', 'playlist', 'prorata', 'saturation', 'plugger']);
H('critics', ['Críticos', 'Critics'],
  ['Críticos reais e fictícios: gosto, rigor, veículo e histórico com seus artistas.', 'Real and fictional critics: taste, strictness, outlet and history with your acts.'],
  ['Mande o disco para quem gosta do gênero. Ex.: crítico purista do jazz detona fusão pop — mesmo boa.', 'Send the record to those who like the genre. E.g. a jazz purist trashes pop fusion — even a good one.']);

// ---------------------------------------------------------------- Mundo
H('world', ['Mundo', 'World'],
  ['Mapa, cenas, história, leis e lugares, países e cenas locais. O mundo muda: guerras, censura, tecnologia.', 'Map, scenes, history, laws and places, countries and local scenes. The world changes: wars, censorship, technology.'],
  ['Clique em cidades/países para ver cena, censura e público. Ex.: país com censura alta derruba disco "rebelde" e pode banir o show.', 'Click cities/countries to see scene, censorship and audience. E.g. a high-censorship country drops a "rebel" record and may ban the show.'], [], ['regions18', 'world17']);
H('world17', ['Mundo vivo', 'Living world'],
  ['O que os NPCs fazem sozinhos: rompimentos, novos selos, fusões, roubos de artistas, guerras de preço.', 'What NPCs do on their own: splits, new labels, mergers, poaching, price wars.'],
  ['Leia para antecipar. Ex.: rival em guerra de preço → segure seu lançamento de catálogo por um trimestre.', 'Read it to anticipate. E.g. a rival in a price war → hold your catalog release one quarter.'], [], ['labels', 'dm18']);
H('after18', ['Depois do palco', 'After the stage'],
  ['Para onde vão os artistas quando param: produtores, empresários, executivos, professores, políticos, esquecidos.', 'Where acts go when they stop: producers, managers, executives, teachers, politicians, forgotten.'],
  ['Ex-artistas viram contatos. Ex.: um ex-cantor que virou executivo pode facilitar licença. Abra a pessoa e use o menu de ações.', 'Former acts become contacts. E.g. an ex-singer turned executive can ease a licence. Open the person and use the action menu.'], [], ['people']);
H('regions18', ['Mercados regionais', 'Regional markets'],
  ['Submercados por região (Japão, Coreia, Índia, Brasil...): poder de compra, idioma, plataformas, barreiras, circuitos, K-pop e idols, afinidades.', 'Sub-markets by region (Japan, Korea, India, Brazil...): buying power, language, platforms, barriers, circuits, K-pop and idols, affinities.'],
  ['Entre com parceiro local ou versão no idioma. Ex.: licenciar no Japão rende mais que exportar direto; feat com astro local abre a porta.', 'Enter with a local partner or a local-language version. E.g. licensing in Japan pays more than direct export; a feat with a local star opens the door.'], [], ['world', 'charts'], ['licensing']);
H('society18', ['Sociedade', 'Society'],
  ['Prêmios, paradas, IA, censura e exílio, filantropia e a cidade da música.', 'Awards, charts, AI, censorship and exile, philanthropy and the music city.'],
  ['Causas e filantropia constroem reputação institucional. Ex.: artista exilado por censura vira símbolo — e alvo.', 'Causes and philanthropy build institutional reputation. E.g. an act exiled by censorship becomes a symbol — and a target.'], [], ['awards']);
H('dm18', ['Diário do Mestre', 'Master\'s journal'],
  ['O "diretor" da história: curva de tensão (calmaria → tensão → clímax → resolução), fios de campanha, rixas e arcos de NPCs.', 'The story "director": tension curve (calm → tension → climax → resolution), campaign threads, feuds and NPC arcs.'],
  ['Na fase de clímax, NPCs agem mais e rixas escalam: evite riscos. Ex.: "A conta chega" lembra um favor antigo que vão cobrar.', 'In the climax phase NPCs act more and feuds escalate: avoid risks. E.g. "The bill comes" recalls an old favor they will call in.'], [], ['news17', 'crime'], ['feud']);
H('charts', ['Paradas', 'Charts'],
  ['Parada mundial, rádio e outras, por país e formato, e hype de cada artista.', 'World chart, radio and others, by country and format, and each act\'s hype.'],
  ['Compare formato × país antes de prensar. Ex.: em 1995 o Brasil ainda compra muita fita; nos EUA já é CD.', 'Compare format × country before pressing. E.g. in 1995 Brazil still buys many tapes; the US is on CD.'], [], ['media', 'releases'], ['hype', 'chartmeth']);
H('labels', ['Gravadoras', 'Labels'],
  ['Ranking e prestígio, selos rivais, estratégias observadas e líderes.', 'Ranking and prestige, rival labels, observed strategies and leaders.'],
  ['Abra um rival para ver a estratégia (inundar, desenvolver, abandonar...). Ex.: rival que "inunda" lança muito e desiste rápido — seus artistas ficam livres.', 'Open a rival to see its strategy (flood, develop, abandon...). E.g. a "flooding" rival releases a lot and gives up fast — its acts go free.'], [], ['world17'], ['major', 'indie']);
H('industry', ['Indústria', 'Industry'],
  ['Fábricas e suprimentos, lojas, distribuição e preço, pesquisa, mídia e empresas, conselho e câmbio.', 'Plants and supplies, retail, distribution and price, research, media companies, board and FX.'],
  ['Preço e distribuição definem margem. Ex.: câmbio caro encarece exportar; vender para fora fica melhor quando sua moeda cai.', 'Price and distribution set margin. E.g. a strong currency makes exporting dearer; selling abroad improves when yours falls.'], [], ['supply18', 'finance'], ['distribution', 'retail']);
H('movements', ['Relações e movimentos', 'Relations and movements'],
  ['Movimentos culturais (punk, tropicália, grunge...), quem está dentro e a rede de relações entre artistas.', 'Cultural movements (punk, tropicália, grunge...), who is in and the web of relations between acts.'],
  ['Entrar cedo num movimento dá credibilidade; tarde, parece oportunismo. Ex.: banda punk em 1977 × em 1981.', 'Joining a movement early gives credibility; late looks opportunistic. E.g. a punk band in 1977 × in 1981.']);
H('lendas', ['Lendas', 'Legends'],
  ['Panteão, linha do tempo, biografias, relíquias, acervo vivo, cidades e cenas, épocas, jornal e livro do mundo.', 'Pantheon, timeline, biographies, relics, living archive, cities and scenes, eras, newspaper and world book.'],
  ['Relíquias (guitarras, fitas master) podem ser arrematadas e emprestadas a exposições. Ex.: emprestar a um museu dá prestígio sem vender.', 'Relics (guitars, master tapes) can be bought and lent to exhibitions. E.g. lending to a museum gives prestige without selling.'], [], ['rockhall']);

// ---------------------------------------------------------------- Eventos
H('festivals', ['Festivais', 'Festivals'],
  ['Circuito de festivais e inscrições, mapa. Tocar em festival grande dá exposição e fama regional.', 'Festival circuit and applications, map. Playing a big festival gives exposure and regional fame.'],
  ['Inscreva-se cedo: o line-up fecha meses antes. Ex.: palco secundário num festival grande rende mais fãs que headliner num pequeno.', 'Apply early: line-ups close months ahead. E.g. a side stage at a big festival yields more fans than headlining a small one.'], [], ['cp17-festival', 'shows']);
H('awards', ['Premiações', 'Awards'],
  ['Prêmios por época e país, indicações e júris. Prêmio rende vendas, cachê e prestígio.', 'Awards by era and country, nominations and juries. An award brings sales, fees and prestige.'],
  ['Júris evitam quem teve escândalo recente. Ex.: segure a polêmica até depois da cerimônia.', 'Juries avoid acts with a recent scandal. E.g. hold the controversy until after the ceremony.']);
H('rockhall', ['Hall da Fama', 'Hall of Fame'],
  ['Quem entrou no Hall da Fama e os candidatos; mede o legado de longo prazo.', 'Who is in the Hall of Fame and the candidates; measures long-term legacy.'],
  ['Carreira longa + influência + crítica contam mais que vendas. Ex.: banda cult influente entra antes de um sucesso de um verão.', 'Long career + influence + critics count more than sales. E.g. an influential cult band gets in before a one-summer hit.']);

// ---------------------------------------------------------------- Submundo
H('crime', ['Submundo', 'Underworld'],
  ['Organizações reais por época, planos, espionagem, mercado negro, polícia e histórico. Toda ação mostra chance, risco, custo e gravidade.', 'Real organizations by era, plans, espionage, black market, police and history. Every action shows chance, risk, cost and severity.'],
  ['Pense no risco de exposição antes do ganho. Ex.: jabá investigado + informante = indiciamento; guarda-costas reduz extorsão em shows.', 'Weigh exposure risk before the gain. E.g. investigated payola + an informant = indictment; a bodyguard reduces show extortion.'],
  [['No modo "Vida real exata" pessoas reais ficam protegidas.', 'In "Exact real life" mode real people are protected.']], ['news17', 'dm18'], ['payola', 'rico']);

// ---------------------------------------------------------------- Você
H('you', ['Você', 'You'],
  ['Seu personagem: perfil, personalidade, habilidades, decisões, aparência, carreira musical e diário.', 'Your character: profile, personality, skills, decisions, looks, music career and diary.'],
  ['Habilidades sobem com uso. Ex.: negociar muitos contratos melhora "negociação" e a chance das ofertas.', 'Skills grow with use. E.g. negotiating many deals improves "negotiation" and offer chances.'], [], ['personal', 'agenda17']);
H('personal', ['Vida pessoal', 'Personal life'],
  ['Amor e família, coração, filhos, fé e cuidado, lazer e saúde, agenda pessoal, vida intensa e rotinas.', 'Love and family, heart, children, faith and care, leisure and health, personal agenda, fast living and routines.'],
  ['Vida pessoal alivia estresse. Ex.: um mês sem lazer com agenda cheia → estresse alto → recaída ou esgotamento.', 'Personal life relieves stress. E.g. a month without leisure on a full agenda → high stress → relapse or burnout.'], [], ['night14', 'you'], ['stress']);
H('night14', ['Noite e encontros', 'Nightlife and dates'],
  ['Saídas, festas e encontros: contatos, romance, riscos e fofoca.', 'Nights out, parties and dates: contacts, romance, risks and gossip.'],
  ['Festas abrem contatos e fofocas. Ex.: festa com imprensa presente = foto, boato ou exclusiva.', 'Parties open contacts and gossip. E.g. a party with press present = photo, rumor or exclusive.']);
H('wealth', ['Patrimônio', 'Wealth'],
  ['Seu dinheiro pessoal (separado do selo), bens e investimentos.', 'Your personal money (separate from the label), goods and investments.'],
  ['Separe o pessoal do selo: se o selo quebra, o patrimônio pessoal segura. Ex.: casa própria reduz custo de vida.', 'Keep personal and label money apart: if the label goes bust, personal wealth holds. E.g. owning a house cuts living costs.']);
H('scenes17', ['Álbum de cenas', 'Scene album'],
  ['Cenas interativas que já aconteceram (prêmios, shows, TV, tribunal, casamento...), com replay e fotos icônicas.', 'Interactive scenes that already happened (awards, shows, TV, court, wedding...), with replay and iconic photos.'],
  ['Reveja uma cena para lembrar a escolha e o efeito. Ex.: o discurso no prêmio que irritou um rival explica a rixa de hoje.', 'Replay a scene to recall the choice and its effect. E.g. the award speech that annoyed a rival explains today\'s feud.']);
H('careers', ['Carreiras', 'Careers'],
  ['Suas carreiras ativas (selo, músico, empresário, agente, festival, casa, estúdio, editora, mídia, plataforma, trilhas, jornalismo): começar, delegar ou largar.', 'Your active careers (label, musician, manager, agent, festival, venue, studio, publisher, media, platform, screen, journalism): start, delegate or drop.'],
  ['Cada carreira custa tempo (bolinhas). Ex.: selo + festival sem diretor = sobrecarga; contrate um diretor e o festival segue sozinho.', 'Each career costs time (balls). E.g. label + festival without a director = overload; hire a director and the festival runs itself.'], [], ['agenda17', 'tut18']);
H('agenda17', ['Agenda e contratações', 'Agenda and hiring'],
  ['5 bolinhas pessoais + 2 de expediente por mês; contratar direto, freelancers, músicos de estúdio reais por época.', '5 personal balls + 2 office balls a month; direct hiring, freelancers, real session musicians by era.'],
  ['Passe o mouse em cada bolinha para ver o motivo. Ex.: freelancer resolve uma ação sem salário fixo.', 'Hover each ball to see why. E.g. a freelancer handles one action with no fixed salary.'], [], ['team', 'careers'], ['session']);
H('ventures', ['Empreendimentos', 'Ventures'],
  ['Negócios próprios: festival, editora, estúdio, agência, mídia e plataforma — no selo ou no seu nome.', 'Own businesses: festival, publisher, studio, agency, media and platform — under the label or your name.'],
  ['Funde com o pessoal para proteger do selo; com o selo para somar no balanço. Ex.: estúdio próprio + elenco grande = custo de gravação cai.', 'Found it personally to shield it from the label; with the label to add to its books. E.g. own studio + big roster = recording costs fall.'], [], ['careers']);
H('tut18', ['Ajuda e tutorial', 'Help and tutorial'],
  ['Progresso do tutorial: trilhas por carreira, tours de página, dicas de primeira vez e glossário.', 'Tutorial progress: career tracks, page tours, first-time tips and glossary.'],
  ['Siga a trilha da sua carreira; cada objetivo leva à página certa. Use "Reiniciar" para rever tudo. Ex.: tecle Ctrl+K e digite "recoup" para abrir o termo.', 'Follow your career track; each goal leads to the right page. Use "Reset" to see it all again. E.g. press Ctrl+K and type "recoup" to open the term.']);

// ---------------------------------------------------------------- páginas de carreira (Você › Suas carreiras)
H('cp17-label', ['Gravadora', 'Record label'],
  ['A carreira de dono de selo: identidade, venda e catálogo, canais/licenças/merch, imagem e voz, circuito e casas.', 'The label-owner career: identity, sale and catalog, channels/licensing/merch, image and voice, circuit and venues.'],
  ['Defina a identidade (gêneros, valores) cedo: artistas e público reconhecem. Ex.: selo "cult" vende menos e ganha crítica e fidelidade.', 'Set the identity (genres, values) early: acts and audience recognise it. E.g. a "cult" label sells less and wins critics and loyalty.'], [], ['market', 'releases'], ['masters', 'licensing', 'merch']);
H('identity', ['Identidade do selo', 'Label identity'],
  ['Gêneros, valores e estética do selo: o que atrai (ou afasta) artistas e público.', 'The label\'s genres, values and aesthetics: what attracts (or repels) acts and audience.'],
  ['Coerência vale mais que amplitude. Ex.: um selo de jazz que assina um pagodeiro perde pontos de identidade.', 'Coherence beats breadth. E.g. a jazz label signing a pagode act loses identity points.']);
H('biz17', ['Venda e catálogo', 'Sale and catalog'],
  ['Avaliação do selo por época, compradores, não-concorrência; vender e recomeçar.', 'Label valuation by era, buyers, non-compete; sell and start over.'],
  ['O catálogo vale mais em época de streaming. Ex.: vender em 2015 rende múltiplo maior que em 2005.', 'The catalog is worth more in the streaming era. E.g. selling in 2015 fetches a higher multiple than in 2005.'], [], [], ['catalog', 'noncompete']);
H('cp17-musician', ['Músico', 'Musician'],
  ['Sua carreira no palco: sua banda, ensaios, composições, shows e humor dos integrantes.', 'Your stage career: your band, rehearsals, songs, shows and members\' mood.'],
  ['Equilibre tempo da banda e da vida. Ex.: turnê longa sobe entrosamento, mas cansaço e brigas também.', 'Balance band and life time. E.g. a long tour raises tightness, but also fatigue and fights.'], [], ['artists', 'shows']);
H('cp17-manager', ['Empresário', 'Manager'],
  ['Gestão de artistas: agenciados, prospecção, relatórios, roubar clientes, agência e serviços.', 'Artist management: clients, prospecting, reports, poaching clients, agency and services.'],
  ['Você ganha comissão (15–20%) do que o cliente ganha. Ex.: negocie com selos por ele — contrato melhor = comissão maior.', 'You earn commission (15–20%) of what the client earns. E.g. negotiate with labels for them — better deal = bigger commission.'], [], ['management', 'managers14'], ['commission']);
H('management', ['Gestão de artistas', 'Artist management'],
  ['Seus agenciados, prospecção, relatórios, aliciamento, agência e serviços.', 'Your clients, prospecting, reports, poaching, agency and services.'],
  ['Cuide do humor do cliente: insatisfeito, ele sai. Ex.: relatório mensal mostra quem está perto de romper.', 'Mind client mood: unhappy, they leave. E.g. the monthly report shows who is close to leaving.'], [], [], ['commission']);
H('cp17-booking', ['Agente e promotor', 'Agent & promoter'],
  ['Rotas de turnê, propostas de casas e festivais e clientes; ganha parte de cada noite.', 'Tour routes, venue and festival offers and clients; you take a cut of every night.'],
  ['Rote cidades vizinhas para cortar frete. Ex.: Rio → São Paulo → BH em vez de Rio → Recife → SP.', 'Route neighbouring cities to cut travel. E.g. Rio → São Paulo → BH instead of Rio → Recife → SP.'], [], ['tour12', 'shows'], ['guarantee', 'doorsplit']);
H('tour12', ['Rotas e propostas', 'Routes and offers'],
  ['Agência de shows: clientes, rotas, propostas e tiers de casas por época.', 'Booking agency: clients, routes, offers and venue tiers by era.'],
  ['Garantia protege o artista; porcentagem da porta paga mais se lotar. Ex.: artista novo → garantia; astro → split.', 'A guarantee protects the act; a door split pays more if it sells out. E.g. new act → guarantee; star → split.'], [], [], ['guarantee', 'doorsplit']);
H('cp17-festival', ['Dono de festival', 'Festival owner'],
  ['Seus festivais (local, mês, preço, line-up) e os rivais. Público, clima e cena decidem o lucro.', 'Your festivals (site, month, price, line-up) and rivals. Crowd, weather and scene decide profit.'],
  ['Um headliner forte vende o resto. Ex.: evite o mês do festival rival na mesma região.', 'A strong headliner sells the rest. E.g. avoid the month of the rival festival in the same region.'], [], ['festivals'], ['radius']);
H('cp17-venue', ['Casa de shows', 'Venue owner'],
  ['Sua casa e programação, compra e venda de casas reais. Bilheteria + bar.', 'Your venue and programming, buying and selling real venues. Door + bar.'],
  ['Programe pelo público do bairro. Ex.: noite de jazz vazia na segunda, mas bar rende; sábado com banda local lota.', 'Program for the neighbourhood crowd. E.g. an empty Monday jazz night but the bar pays; Saturday with a local band sells out.'], [], ['shows']);
H('cp17-studio', ['Estúdio e produtor', 'Studio & producer'],
  ['Alugue horas, produza discos, equipamento e assinatura sonora.', 'Rent hours, produce records, gear and sonic signature.'],
  ['Assinatura reconhecível atrai artistas. Ex.: equipamento novo + engenheiro bom = discos melhores e mais reservas.', 'A recognisable signature attracts acts. E.g. new gear + a good engineer = better records and more bookings.'], [], ['studio12', 'producers15'], ['points']);
H('studio12', ['Dono do estúdio / produtor', 'Studio owner / producer'],
  ['Estúdio (reservas, equipamento, engenheiros) e cadeira de produtor (projetos, pontos, estilo).', 'Studio (bookings, gear, engineers) and producer chair (projects, points, style).'],
  ['Produtor ganha cachê + pontos (royalty). Ex.: aceitar pontos em vez de cachê alto aposta no sucesso do disco.', 'A producer earns a fee + points (royalty). E.g. taking points instead of a big fee bets on the record\'s success.'], [], [], ['points']);
H('cp17-publisher', ['Editora musical', 'Music publisher'],
  ['Compositores, catálogo de obras, colocação de músicas e sync; ganha com execução e regravação.', 'Songwriters, catalog of works, song placement and sync; earns from performance and covers.'],
  ['Coloque obras com intérpretes certos. Ex.: canção do seu compositor gravada por um astro rende mecânico + execução por décadas.', 'Place works with the right performers. E.g. your writer\'s song cut by a star earns mechanicals + performance for decades.'], [], ['publishing16', 'rights18'], ['publishing', 'mechanical', 'performance', 'sync']);
H('publishing16', ['Editora', 'Publisher'],
  ['Contrate compositores, administre o catálogo e ganhe com cada execução e regravação.', 'Sign songwriters, run the catalog and earn from every play and cover.'],
  ['Adiantamento ao compositor é recuperado pelos royalties. Ex.: compositor caro sem colocação = prejuízo.', 'A writer advance is recouped from royalties. E.g. an expensive writer with no placements = loss.'], [], [], ['advance', 'recoup', 'publishing']);
H('cp17-media', ['Dono de mídia', 'Media owner'],
  ['Rádio, revista, TV, blog ou playlist: escolha o que tocar e quem promover — sua influência mexe nas paradas.', 'Radio, magazine, TV, blog or playlist: choose what to play and whom to push — your influence moves charts.'],
  ['Credibilidade é o ativo. Ex.: tocar só artistas do seu selo vira suspeita de jabá e derruba audiência.', 'Credibility is the asset. E.g. playing only your own label\'s acts looks like payola and drops the audience.'], [], ['outlets16', 'media'], ['payola']);
H('outlets16', ['Veículos de mídia', 'Media outlets'],
  ['Seus veículos: linha editorial, alcance, credibilidade, anunciantes.', 'Your outlets: editorial line, reach, credibility, advertisers.'],
  ['Linha editorial clara atrai público fiel. Ex.: revista indie que vira pop perde leitores antigos.', 'A clear editorial line wins a loyal audience. E.g. an indie magazine that goes pop loses old readers.']);
H('cp17-platform', ['Plataforma', 'Platform'],
  ['Sua plataforma digital: catálogo, assinantes, algoritmo, curadoria e acordos com selos.', 'Your digital platform: catalog, subscribers, algorithm, curation and label deals.'],
  ['Sem catálogo dos grandes, ninguém assina. Ex.: acordo com uma major dobra o catálogo e encarece o repasse.', 'Without the majors\' catalog nobody subscribes. E.g. a deal with a major doubles the catalog and raises payouts.'], [], ['platform16'], ['prorata', 'usercentric']);
H('platform16', ['Plataforma (gestão)', 'Platform (management)'],
  ['Catálogo, assinantes, algoritmo e curadores da sua plataforma.', 'Catalog, subscribers, algorithm and curators of your platform.'],
  ['Curadores aumentam retenção. Ex.: playlist editorial forte segura assinantes no mês seguinte.', 'Curators raise retention. E.g. a strong editorial playlist holds subscribers next month.']);
H('cp17-screen', ['Trilhas e palco', 'Screen & stage'],
  ['Compositor para cinema, TV, games e teatro: encomendas, prazos, temas e royalties de exibição.', 'Composer for film, TV, games and stage: commissions, deadlines, themes and broadcast royalties.'],
  ['Cumpra o prazo: atraso queima o diretor. Ex.: tema de série de sucesso paga execução a cada reprise.', 'Meet the deadline: lateness burns the director. E.g. a hit series theme pays performance on every rerun.'], [], [], ['sync', 'performance', 'cue']);
H('cp17-critic', ['Jornalismo', 'Journalism'],
  ['Crítico e redação: resenhas, credibilidade, alcance e independência.', 'Critic and newsroom: reviews, credibility, reach and independence.'],
  ['Credibilidade vem de acertar e de independência. Ex.: elogiar disco de quem paga seu jantar, se vazar, derruba credibilidade.', 'Credibility comes from being right and independent. E.g. praising the record of whoever pays your dinner, if leaked, sinks credibility.'], [], ['critics']);

// Rodada 18 (artist18): Contratos do artista e Sociedades.
import './help18artist';

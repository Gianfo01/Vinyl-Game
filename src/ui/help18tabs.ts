// Rodada 18 (tutorial18) — ajuda de cada ABA (chave do data-tabs ou '*' = qualquer host) e das abas das fichas.

import { T } from './help18';

// ---------------------------------------------------------------- Metas
T('lv-goals', 'run', ['Cenário', 'Scenario'], ['Metas do cenário escolhido e prazos de medalha.', 'Goals of the chosen scenario and medal deadlines.'], ['Cumpra antes do prazo para ouro. Ex.: "nº 1 até 1966".', 'Finish before the deadline for gold. E.g. "#1 by 1966".']);
T('lv-goals', 'ach', ['Conquistas', 'Achievements'], ['Conquistas narrativas da run (primeiro ouro do selo, etc.).', 'Narrative run achievements (label\'s first gold, etc.).'], ['Aparecem sozinhas; algumas pedem caminhos raros.', 'They appear by themselves; some need rare paths.']);
T('lv-goals', 'museum', ['Museu do selo', 'Label museum'], ['Discos de ouro, prêmios e relíquias guardados.', 'Gold records, awards and relics on display.'], ['Relíquias emprestadas a exposições dão prestígio.', 'Relics lent to exhibitions give prestige.']);

// ---------------------------------------------------------------- Finanças (business-finance)
T('*', 'dre18', ['DRE e caixa', 'P&L and cash'], ['Demonstração de resultado: receita e custo operacional, não operacional, impostos, investimentos e financiamento; fluxo de caixa e a receber/pagar.', 'Income statement: operating revenue and cost, non-operating, taxes, investing and financing; cash flow and receivables/payables.'], ['Compare "operacional" mês a mês. Ex.: venda de casa de show aparece em investimentos, não infla o operacional.', 'Compare "operating" month by month. E.g. selling a venue shows in investing, not inflating operating.'], ['pl', 'receivables', 'opex', 'capex']);
T('*', 'capital', ['Capital e sócios', 'Capital and partners'], ['Venda de participação a investidores e sócios; diluição e conselho.', 'Selling equity to investors and partners; dilution and board.'], ['Sócio dá caixa e cobra resultado. Ex.: 30% para um fundo = conselho mais exigente.', 'A partner gives cash and demands results. E.g. 30% to a fund = a tougher board.'], ['equity']);
T('*', 'loans7', ['Empréstimos', 'Loans'], ['Crédito bancário com juros e prazo; entra como financiamento.', 'Bank credit with interest and term; booked as financing.'], ['Use para ponte de caixa, não para cobrir prejuízo recorrente. Ex.: juros altos dos anos 80 pesam.', 'Use it to bridge cash, not to cover recurring losses. E.g. high 1980s rates bite.']);
T('*', 'stakes8', ['Participações em selos', 'Stakes in labels'], ['Comprar parte de selos rivais ou parceiros.', 'Buying part of rival or partner labels.'], ['Dividendos + influência. Ex.: 20% de um indie promissor pode valer muito se ele explodir.', 'Dividends + influence. E.g. 20% of a promising indie may be worth a lot if it breaks.']);
T('business-finance', 'overview', ['Balanço', 'Balance sheet'], ['Ativos, passivos, valor do selo e histórico.', 'Assets, liabilities, label value and history.'], ['Olhe a tendência anual, não um mês ruim.', 'Watch the yearly trend, not one bad month.']);
T('business-finance', 'stock', ['Bolsa', 'Stock market'], ['Ações de empresas da indústria e abertura de capital.', 'Industry company shares and going public.'], ['Abrir capital dá caixa e expõe a resultados trimestrais.', 'An IPO gives cash and exposes you to quarterly results.'], ['ipo']);

// ---------------------------------------------------------------- Negócios
T('*', 'era8', ['Era e estratégia', 'Era and strategy'], ['O que funciona nesta época (formatos, canais, gêneros) e a estratégia do selo.', 'What works in this era (formats, channels, genres) and the label strategy.'], ['Ajuste a estratégia na virada de era. Ex.: singles em 1960, álbuns em 1970.', 'Adjust strategy at era changes. E.g. singles in 1960, albums in 1970.']);
T('*', 'org12', ['Estrutura x era', 'Structure x era'], ['Como a estrutura da empresa combina com a época.', 'How the company structure fits the era.'], ['Estrutura pesada em era digital vira custo morto.', 'Heavy structure in the digital era is dead cost.']);
T('business-business', 'subs', ['Subselos', 'Sub-labels'], ['Selos dentro do seu, com estratégia e gênero próprios.', 'Labels inside yours, with their own strategy and genre.'], ['Subselo de nicho protege a identidade do selo principal.', 'A niche sub-label protects the main label identity.']);
T('business-business', 'companies', ['Empresas', 'Companies'], ['Empresas do grupo e aquisições.', 'Group companies and acquisitions.'], ['Compre o que corta seu custo (prensagem, distribuição).', 'Buy what cuts your cost (pressing, distribution).']);
T('business-business', 'catalog', ['Catálogo (negócios)', 'Catalog (business)'], ['Valor e exploração do catálogo como ativo.', 'Catalog value and exploitation as an asset.'], ['Compilações e reedições extraem valor de discos velhos.', 'Compilations and reissues extract value from old records.'], ['catalog']);
T('business-business', 'legal', ['Jurídico', 'Legal'], ['Processos, contratos e riscos legais.', 'Lawsuits, contracts and legal risks.'], ['Um bom jurídico reduz perdas em disputas.', 'Good legal reduces losses in disputes.']);
T('business-business', 'brands', ['Marcas e sync', 'Brands and sync'], ['Parcerias com marcas e licenças para publicidade/filmes.', 'Brand partnerships and ad/film licences.'], ['Marca errada irrita fãs de gênero "rebelde".', 'The wrong brand annoys fans of "rebel" genres.'], ['sync']);
T('*', 'dispute15', ['Disputas', 'Disputes'], ['Disputas com artistas, selos e herdeiros: acordo, tribunal ou ceder.', 'Disputes with acts, labels and heirs: settle, court or give in.'], ['Acordo rápido sai mais barato que perder no tribunal.', 'A quick settlement is cheaper than losing in court.']);
T('*', 'why12', ['Por que deu nisso?', 'Why did this happen?'], ['Cadeia de causas dos resultados recentes.', 'Chain of causes behind recent results.'], ['Use após um fracasso para ver o fator que mais pesou.', 'Use after a flop to see the heaviest factor.']);
T('*', 'rights8', ['Direitos', 'Rights'], ['Masters, edição e licenças do seu catálogo.', 'Masters, publishing and licences of your catalog.'], ['Ter os masters vale mais a longo prazo.', 'Owning masters is worth more long-term.'], ['masters']);
T('*', 'eras18', ['Adoção e futuro', 'Adoption and future'], ['Quanto do mercado de cada país já adotou cada formato/tecnologia; eras coexistem.', 'How much of each country has adopted each format/technology; eras coexist.'], ['Prense pelo que o país usa, não pelo que é novo.', 'Press for what the country uses, not what is new.']);
T('*', 'ai8', ['IA e autoria', 'AI and authorship'], ['Política de consentimento, vozes sintéticas e treino com catálogo.', 'Consent policy, synthetic voices and catalog training.'], ['Sem consentimento = risco de escândalo de voz.', 'No consent = voice scandal risk.']);

// ---------------------------------------------------------------- Pessoas
T('people', 'roster', ['Elenco', 'Roster'], ['Pessoas do seu elenco com humor e estado.', 'Your roster people with mood and state.'], ['Ordene por estresse para achar quem precisa descanso.', 'Sort by stress to find who needs rest.']);
T('people', 'health', ['Saúde', 'Health'], ['Saúde física e mental, vícios, internações.', 'Physical and mental health, addictions, hospital stays.'], ['Clínica cedo evita escândalo depois.', 'Early rehab avoids a scandal later.'], ['stress']);
T('people', 'relations', ['Relações', 'Relations'], ['Quem gosta e quem odeia quem.', 'Who likes and who hates whom.'], ['Feats entre amigos rendem mais química.', 'Feats between friends yield more chemistry.']);
T('people', 'secrets', ['Segredos', 'Secrets'], ['Segredos conhecidos (seus trunfos e riscos).', 'Known secrets (your leverage and risks).'], ['Segredo usado como chantagem pode virar contra você.', 'A secret used as blackmail may backfire.']);
T('people', 'staff', ['Equipe', 'Staff'], ['Sua equipe com habilidades e lealdade.', 'Your staff with skills and loyalty.'], ['Funcionário desleal pode vazar ou ser aliciado.', 'A disloyal employee may leak or be poached.']);
T('people', 'feed', ['Redes e cartas', 'Social and letters'], ['O que as pessoas postam e escrevem.', 'What people post and write.'], ['Post irritado costuma preceder briga pública.', 'An angry post often precedes a public fight.']);

// ---------------------------------------------------------------- Mercado
T('marketHub', 'classic', ['Radar e pipeline', 'Radar and pipeline'], ['Artistas livres no radar e negociações em andamento.', 'Free acts on the radar and ongoing negotiations.'], ['Ofereça adiantamento + royalty + prazo. Ex.: mais controle criativo compensa adiantamento menor.', 'Offer advance + royalty + term. E.g. more creative control offsets a smaller advance.'], ['advance', 'royalty', 'option']);
T('marketHub', 'discovery', ['Olheiros, concursos e demos', 'Scouts, contests and demos'], ['Pedidos a olheiros por gênero/mercado, concursos e demos recebidas.', 'Scout requests by genre/market, contests and received demos.'], ['Olheiro estreita a faixa de talento estimado.', 'A scout narrows the estimated talent range.'], ['capa']);
T('marketHub', 'auctions', ['Leilões', 'Auctions'], ['Disputas por artistas quentes contra rivais.', 'Bidding wars for hot acts against rivals.'], ['Defina teto antes: leilão infla adiantamentos.', 'Set a ceiling first: auctions inflate advances.']);
T('*', 'w4fairs', ['Feiras', 'Fairs'], ['Feiras do setor (MIDEM etc.) para licenças e contatos.', 'Trade fairs (MIDEM etc.) for licences and contacts.'], ['Boa feira = licença para outro país sem escritório.', 'A good fair = licence to another country without an office.'], ['licensing']);
T('*', 'dossier8', ['Dossiês e faro de A&R', 'Dossiers and A&R nose'], ['Dossiês de artistas e o faro do seu A&R.', 'Act dossiers and your A&R\'s nose.'], ['Faro alto revela potencial escondido.', 'A good nose reveals hidden potential.'], ['capa']);

// ---------------------------------------------------------------- Catálogo
T('catalogHub', 'list', ['Catálogo', 'Catalog'], ['Lista de lançamentos com vendas e status.', 'Release list with sales and status.'], ['Ordene por vendas recentes para achar o que reativar.', 'Sort by recent sales to find what to revive.']);
T('*', 'sync15', ['Sync', 'Sync'], ['Pedidos de música para filmes, séries, games e anúncios.', 'Music requests for films, series, games and ads.'], ['Sync paga taxa + execução e reativa vendas.', 'Sync pays a fee + performance and revives sales.'], ['sync']);
T('*', 'story12', ['História do selo', 'Label story'], ['Narrativa do selo com marcos.', 'The label\'s narrative with milestones.'], ['Boa para revisar a run.', 'Good to review the run.']);
T('*', 'retro', ['Retrospectiva', 'Retrospective'], ['Compilações, box sets e reedições comemorativas.', 'Compilations, box sets and anniversary reissues.'], ['Aniversário redondo (25/50 anos) vende mais.', 'Round anniversaries (25/50 years) sell more.']);

// ---------------------------------------------------------------- Mídia
T('mediaHub', 'press', ['Imprensa e crítica', 'Press and critics'], ['Entrevistas, exclusivas, resenhas.', 'Interviews, exclusives, reviews.'], ['Entrevista arriscada pode virar gafe ou capa.', 'A risky interview can be a gaffe or a cover.']);
T('mediaHub', 'channels', ['Canais e reputação', 'Channels and reputation'], ['Reputação com cada canal de mídia.', 'Reputation with each media channel.'], ['Relação boa = mais espaço por menos dinheiro.', 'Good relations = more space for less money.']);
T('*', 'st18', ['Público e streaming', 'Audience and streaming'], ['Fontes de descoberta, ouvintes/voltam/seguidores, pró-rata por território, pitch editorial, estratégia pico × base.', 'Discovery sources, listeners/returners/followers, pro-rata by territory, editorial pitch, peak × base strategy.'], ['Dependência de playlist cai quando ela sai. Ex.: 70% dos plays de uma playlist = queda forte no mês seguinte.', 'Playlist dependence crashes when it drops you. E.g. 70% of plays from one playlist = big drop next month.'], ['prorata', 'playlist', 'streamfarm', 'usercentric']);
T('*', 'mk18', ['Campanhas', 'Campaigns'], ['Canais com público, conversão, atraso e saturação; aprendizado da equipe; previsto × realizado.', 'Channels with audience, conversion, delay and saturation; team learning; forecast × actual.'], ['Diversifique: o mesmo canal satura. Ex.: vídeo curto não sustenta álbum fraco.', 'Diversify: the same channel saturates. E.g. short video does not carry a weak album.'], ['saturation']);
T('*', 'radio18', ['Rádio: formatos', 'Radio: formats'], ['Formatos de rádio, consultores, estações e diretores de programação; rotação leve/média/pesada.', 'Radio formats, consultants, stations and program directors; light/medium/heavy rotation.'], ['Mande a faixa certa ao formato certo. Promotor independente funciona — e pode vazar como jabá.', 'Send the right track to the right format. An indie promoter works — and may leak as payola.'], ['payola', 'plugger', 'rotation']);
T('*', 'clips18', ['Clipes, virais e pistas', 'Videos, virals and clubs'], ['Clipes (orçamento, diretor, banimento), virais de catálogo, remixes e paradas de clube.', 'Videos (budget, director, bans), catalog virals, remixes and club charts.'], ['Viral antigo: impulsione ou faça remix oficial rápido.', 'An old track goes viral: boost it or do an official remix fast.'], ['remix']);
T('*', 'w4radio', ['Jabá e rádio', 'Payola and radio'], ['Pagamentos por execução e seus riscos legais.', 'Pay-for-play and its legal risks.'], ['Investigações de jabá vêm em ondas (1960, 2005).', 'Payola probes come in waves (1960, 2005).'], ['payola']);
T('*', 'w4method', ['Paradas e metodologia', 'Charts and methodology'], ['Como cada parada conta (vendas, rádio, streams) por época.', 'How each chart counts (sales, radio, streams) by era.'], ['Mudança de metodologia muda o que vale a pena.', 'Methodology changes change what pays.'], ['chartmeth']);

// ---------------------------------------------------------------- Mundo
T('worldHub', 'map', ['Mapa e cenas', 'Map and scenes'], ['Mapa com cenas, censura e público.', 'Map with scenes, censorship and audience.'], ['Clique num país para ver o detalhe.', 'Click a country for detail.']);
T('worldHub', 'history', ['História, leis e lugares', 'History, laws and places'], ['Linha do tempo de leis e acontecimentos.', 'Timeline of laws and events.'], ['Lei nova pode abrir ou fechar um mercado.', 'A new law can open or close a market.']);
T('worldHub', 'countries', ['Países', 'Countries'], ['Ficha de cada país: mercado, formatos, censura.', 'Each country\'s sheet: market, formats, censorship.'], ['Compare tamanho × concorrência.', 'Compare size × competition.']);
T('*', 'scene12', ['Cenas locais', 'Local scenes'], ['Cenas por cidade e gênero em ascensão.', 'Scenes by city and rising genre.'], ['Assinar da cena quente dá credibilidade.', 'Signing from a hot scene gives credibility.']);

// ---------------------------------------------------------------- Paradas
T('chartsHub', 'global', ['Parada mundial', 'World chart'], ['Top global de singles e álbuns.', 'Global singles and albums top.'], ['Clique num título para abrir o artista.', 'Click a title to open the act.']);
T('chartsHub', 'more', ['Rádio e outras paradas', 'Radio and other charts'], ['Paradas de rádio, clube, gênero.', 'Radio, club, genre charts.'], ['Parada de nicho é porta de entrada.', 'Niche charts are an entry door.']);
T('*', 'countries', ['Países e paradas', 'Countries and charts'], ['Dados por país: mercado, formatos, paradas.', 'Data by country: market, formats, charts.'], ['Compare antes de promover. Ex.: país pequeno com pouca concorrência.', 'Compare before promoting. E.g. a small country with little competition.']);
T('chartsHub', 'countries', ['Por país e formato', 'By country and format'], ['Paradas por país e por formato.', 'Charts by country and format.'], ['Use antes de decidir onde promover.', 'Use before deciding where to promote.']);
T('*', 'hype12', ['Hype', 'Hype'], ['Hype de cada artista e o motivo.', 'Each act\'s hype and its reason.'], ['Hype cai rápido: lance enquanto está alto.', 'Hype fades fast: release while it is high.'], ['hype']);

// ---------------------------------------------------------------- Gravadoras
T('labels9', 'rank', ['Ranking e prestígio', 'Ranking and prestige'], ['Posição das gravadoras por vendas e prestígio.', 'Labels by sales and prestige.'], ['Prestígio atrai artistas mesmo sem dinheiro.', 'Prestige attracts acts even without money.']);
T('labels9', 'list', ['Selos rivais', 'Rival labels'], ['Selos ativos e seus elencos.', 'Active labels and their rosters.'], ['Abra um rival para ver estratégia observada.', 'Open a rival to see its observed strategy.']);
T('labels9', 'leaders', ['Estratégias e líderes', 'Strategies and leaders'], ['Líderes das gravadoras e seus estilos.', 'Label leaders and their styles.'], ['Líder novo muda a estratégia do rival.', 'A new leader changes the rival\'s strategy.']);

// ---------------------------------------------------------------- Indústria
T('industry', 'supply', ['Fábricas e suprimentos', 'Plants and supplies'], ['Matéria-prima e fábricas.', 'Raw materials and plants.'], ['Choque do petróleo encarece vinil (1973).', 'The oil shock makes vinyl dearer (1973).']);
T('industry', 'retail', ['Lojas', 'Retail'], ['Redes de varejo e seu poder.', 'Retail chains and their power.'], ['Rede que quebra leva seus recebíveis.', 'A chain going bust takes your receivables.'], ['retail', 'returns']);
T('industry', 'dist', ['Distribuição e preço', 'Distribution and price'], ['Taxa de distribuição e preço de venda.', 'Distribution fee and retail price.'], ['Preço alto = margem; baixo = volume.', 'High price = margin; low = volume.'], ['distribution']);
T('industry', 'research', ['Pesquisa', 'Research'], ['Pesquisa de tecnologias e formatos.', 'Research into technologies and formats.'], ['Pesquisar cedo dá vantagem de formato.', 'Early research gives a format edge.']);
T('industry', 'corp', ['Mídia e empresas', 'Media and companies'], ['Conglomerados de mídia e donos.', 'Media conglomerates and owners.'], ['Selo dono de veículo ganha espaço.', 'A label owning an outlet gains space.']);
T('industry', 'board', ['Conselho', 'Board'], ['Expectativas do conselho e avaliação.', 'Board expectations and evaluation.'], ['O conselho mede lucro operacional.', 'The board measures operating profit.']);
T('industry', 'fx', ['Câmbio', 'FX'], ['Taxas de câmbio e exposição por país.', 'Exchange rates and exposure by country.'], ['Receita em moeda forte protege.', 'Revenue in hard currency protects.']);

// ---------------------------------------------------------------- Lendas
T('lendas9', 'pan', ['Panteão', 'Pantheon'], ['Os maiores de todos os tempos.', 'The greatest of all time.'], ['Seu artista entra com legado, não só vendas.', 'Your act gets in with legacy, not just sales.']);
T('lendas9', 'tl', ['Linha do tempo', 'Timeline'], ['Acontecimentos marcantes da música.', 'Landmark music events.'], ['Mostra só o que já aconteceu no ano.', 'Shows only what already happened.']);
T('lendas9', 'bio', ['Biografias', 'Biographies'], ['Biografias vivas de artistas.', 'Living artist biographies.'], ['Atualizam com o que acontece na run.', 'They update with what happens in the run.']);
T('lendas9', 'relics', ['Relíquias', 'Relics'], ['Objetos históricos reais e seu destino.', 'Real historic objects and their fate.'], ['Podem ser roubadas, leiloadas ou ir a museu.', 'They can be stolen, auctioned or go to a museum.'], ['relic']);
T('lendas9', 'relics18', ['Acervo vivo', 'Living archive'], ['Suas relíquias: emprestar, expor, vender.', 'Your relics: lend, exhibit, sell.'], ['Empréstimo rende prestígio contínuo.', 'Lending yields ongoing prestige.'], ['relic']);
T('lendas9', 'post18', ['Legado póstumo', 'Posthumous legacy'], ['Espólios e carreiras depois da morte: tributo, caixa, remaster, cofre, cinebiografia, ilusão de palco, holograma (2012+), turnê de holograma (2018+), avatares (2022+, vivos também) e IA (2023+).', 'Estates and careers after death: tribute, box set, remaster, vault, biopic, stage illusion, hologram (2012+), hologram tour (2018+), avatars (2022+, living acts too) and AI (2023+).'], ['Escolha o artista, veja chance de aprovação, polêmica e qualidade técnica com o porquê, e proponha. Ex.: em 2013 um holograma ainda treme (vale da estranheza); um show-tributo beneficente quase sempre é aceito e sobe o legado.', 'Pick the artist, check approval chance, controversy and tech quality with the why, and pitch. E.g. in 2013 a hologram still flickers (uncanny valley); a charity tribute is almost always accepted and raises legacy.']);
T('lendas9', 'city', ['Cidades e cenas', 'Cities and scenes'], ['Cidades da música e suas cenas.', 'Music cities and their scenes.'], ['Cena viva = público e talento.', 'A living scene = audience and talent.']);
T('lendas9', 'eras17', ['Épocas', 'Eras'], ['Artistas que definiram cada época.', 'Acts that defined each era.'], ['Referência para o estilo da época.', 'A reference for the era\'s style.']);
T('lendas9', 'press', ['Jornal', 'Newspaper'], ['Manchetes da run.', 'Run headlines.'], ['Resume o ano em manchetes.', 'Sums up the year in headlines.']);
T('lendas9', 'book', ['Livro e mundo', 'Book and world'], ['O livro da sua run.', 'The book of your run.'], ['Exporte ao final.', 'Export at the end.']);

// ---------------------------------------------------------------- Festivais
T('festivals16', 'circuit', ['Circuito e inscrições', 'Circuit and applications'], ['Festivais do ano e inscrições abertas.', 'This year\'s festivals and open applications.'], ['Inscreva artistas com fama no país do festival.', 'Apply with acts famous in the festival\'s country.']);
T('festivals16', 'map', ['Mapa de festivais', 'Festival map'], ['Onde e quando acontecem.', 'Where and when they happen.'], ['Encaixe festivais na rota da turnê.', 'Fit festivals into the tour route.']);

// ---------------------------------------------------------------- Submundo
T('crime17', 'orgs', ['Organizações', 'Organizations'], ['Grupos criminosos da época e seus interesses.', 'Criminal groups of the era and their interests.'], ['Dever favor a uma organização sai caro.', 'Owing an organization a favor is costly.']);
T('crime17', 'plans', ['Planos/Ações', 'Plans/Actions'], ['Ações possíveis com chance, risco e custo.', 'Possible actions with chance, risk and cost.'], ['Exposição alta = polícia e imprensa.', 'High exposure = police and press.']);
T('crime17', 'spy', ['Espionagem', 'Espionage'], ['Grampos e espiões contra rivais.', 'Wiretaps and spies on rivals.'], ['Descoberto, vira escândalo.', 'If discovered, it becomes a scandal.']);
T('crime17', 'market', ['Mercado negro', 'Black market'], ['Receptadores, falsificações e armadilhas.', 'Fences, fakes and traps.'], ['Oferta boa demais costuma ser armadilha.', 'A too-good offer is often a trap.']);
T('crime17', 'police', ['Investigações/Polícia', 'Investigations/Police'], ['Investigações abertas e seu andamento.', 'Open investigations and progress.'], ['Delação de cúmplice acelera o processo.', 'An accomplice\'s plea speeds the case.'], ['rico']);
T('crime17', 'log', ['Histórico', 'History'], ['Crimes da indústria (reais e da run).', 'Industry crimes (real and in-run).'], ['Aprenda com os casos reais.', 'Learn from real cases.']);

// ---------------------------------------------------------------- Você
T('life-you', 'me', ['Perfil', 'Profile'], ['Seus dados, idade, origem e ambição.', 'Your data, age, origin and ambition.'], ['Ambição define a meta pessoal.', 'Ambition sets the personal goal.']);
T('life-you', 'persona', ['Personalidade', 'Personality'], ['Traços que mudam chances e reações.', 'Traits that change chances and reactions.'], ['Carisma ajuda negociações; impulsividade, riscos.', 'Charisma helps deals; impulsiveness, risks.']);
T('life-you', 'skills', ['Habilidades', 'Skills'], ['Suas habilidades e pontos para gastar.', 'Your skills and points to spend.'], ['Invista no que você mais usa.', 'Invest in what you use most.']);
T('life-you', 'decisions', ['Decisões', 'Decisions'], ['Escolhas grandes da vida e da carreira.', 'Big life and career choices.'], ['Algumas são irreversíveis.', 'Some are irreversible.']);
T('life-you', 'looks17', ['Aparência', 'Looks'], ['Aparência com efeito no jogo, por época.', 'Looks with in-game effect, by era.'], ['O efeito é explicado no porquê.', 'The effect is explained in the why.']);
T('life-you', 'music', ['Carreira musical', 'Music career'], ['Sua carreira como músico.', 'Your career as a musician.'], ['Some com a carreira Músico.', 'Pairs with the Musician career.']);
T('life-you', 'diary', ['Diário', 'Diary'], ['Seu diário pessoal.', 'Your personal diary.'], ['Memórias mudam humor.', 'Memories change mood.']);
T('life-personal', 'love', ['Amor e família', 'Love and family'], ['Parceiros, casamento, família.', 'Partners, marriage, family.'], ['Pré-nupcial protege o selo no divórcio.', 'A prenup protects the label in divorce.'], ['prenup']);
T('life-personal', 'heart17', ['Coração', 'Heart'], ['Sentimentos, ciúme, casos.', 'Feelings, jealousy, affairs.'], ['Caso descoberto vira escândalo.', 'A discovered affair becomes a scandal.']);
T('life-personal', 'kids17', ['Filhos', 'Children'], ['Filhos crescem e escolhem caminho aos 18.', 'Kids grow up and choose a path at 18.'], ['Tempo com filhos reduz estresse e forma herdeiros.', 'Time with kids reduces stress and shapes heirs.']);
T('life-personal', 'care17', ['Fé e cuidado', 'Faith and care'], ['Religião, terapia e cuidado.', 'Religion, therapy and care.'], ['Terapia baixa estresse longo.', 'Therapy lowers long stress.']);
T('life-personal', 'leisure', ['Lazer e saúde', 'Leisure and health'], ['Folgas, hobbies e saúde.', 'Time off, hobbies and health.'], ['Uma folga por mês evita esgotamento.', 'One day off a month prevents burnout.']);
T('life-personal', 'agenda8', ['Agenda pessoal', 'Personal agenda'], ['Compromissos pessoais do mês.', 'Personal commitments this month.'], ['Usa as bolinhas pessoais.', 'Uses the personal balls.']);
T('life-personal', 'vices', ['Vida intensa', 'Fast living'], ['Festas, drogas, excessos.', 'Parties, drugs, excess.'], ['Alivia agora, cobra depois.', 'Relief now, bill later.'], ['stress']);
T('life-personal', 'routines12', ['Rotinas e selo', 'Routines and label'], ['Rotinas fixas e como afetam o selo.', 'Fixed routines and how they affect the label.'], ['Rotina boa poupa bolinhas.', 'A good routine saves balls.']);
T('life-wealth', 'wealth', ['Patrimônio', 'Wealth'], ['Seu dinheiro pessoal.', 'Your personal money.'], ['Separado do caixa do selo.', 'Separate from the label cash.']);
T('life-wealth', 'goods8', ['Bens e investimentos', 'Goods and investments'], ['Casas, carros, investimentos.', 'Houses, cars, investments.'], ['Bens têm manutenção.', 'Goods have upkeep.']);

// ---------------------------------------------------------------- Agenda
T('agenda17', 'agenda', ['Agenda', 'Agenda'], ['Bolinhas do mês: pessoais e de expediente.', 'This month\'s balls: personal and office.'], ['Passe o mouse para o motivo.', 'Hover for the reason.']);
T('agenda17', 'you', ['Você', 'You'], ['Seu tempo e sobrecarga.', 'Your time and overload.'], ['Sobrecarga gera estresse.', 'Overload creates stress.']);
T('agenda17', 'hire', ['Contratar', 'Hire'], ['Contratação direta com chance de aceite.', 'Direct hiring with acceptance chance.'], ['Salário acima do mercado sobe a chance.', 'Above-market salary raises the chance.']);
T('agenda17', 'free', ['Freelancers', 'Freelancers'], ['Profissionais por ação, sem salário.', 'Per-action professionals, no salary.'], ['Bom para picos.', 'Good for peaks.']);
T('agenda17', 'session', ['Músicos de estúdio', 'Session musicians'], ['Músicos de sessão reais por época, orquestra e coral.', 'Real session players by era, orchestra and choir.'], ['Sessão boa sobe a técnica do disco.', 'A good session raises the record\'s technique.'], ['session']);

// ---------------------------------------------------------------- Gravadora (página da carreira)
T('cp17-label', 'identity', ['Identidade', 'Identity'], ['Gêneros, valores e estética do selo.', 'Label genres, values and aesthetics.'], ['Coerência atrai artistas certos.', 'Coherence attracts the right acts.']);
T('cp17-label', 'biz17', ['Venda e catálogo', 'Sale and catalog'], ['Avaliar e vender o selo; comprar outro.', 'Value and sell the label; buy another.'], ['Não-concorrência trava o próximo selo.', 'Non-compete blocks your next label.'], ['noncompete']);
T('cp17-label', 'trade', ['Canais, licenças e merch', 'Channels, licensing and merch'], ['Canais de venda por época, licenças entre regiões e merch.', 'Sales channels by era, licensing between regions and merch.'], ['Clube do disco nos anos 60–80; vinil especial nos 2010.', 'Record club in the 60s–80s; special vinyl in the 2010s.'], ['licensing', 'merch']);
T('cp17-label', 'image', ['Imagem e voz', 'Image and voice'], ['Direitos de voz e imagem dos artistas.', 'Voice and likeness rights of acts.'], ['Mais fácil com iniciantes; há proteções contra abuso.', 'Easier with newcomers; there are anti-abuse protections.']);
T('cp17-label', 'circuit', ['Circuito, vaquinhas e reencontros', 'Circuit, crowdfunding and reunions'], ['Circuito de shows, financiamento coletivo e reencontros de bandas.', 'Show circuit, crowdfunding and band reunions.'], ['Reencontro rende muito uma vez.', 'A reunion pays big once.']);
T('cp17-label', 'venues', ['Casas de show', 'Venues'], ['Comprar e vender casas reais.', 'Buy and sell real venues.'], ['Casa própria = datas garantidas.', 'Own venue = guaranteed dates.']);

// ---------------------------------------------------------------- outras carreiras
T('cp17-festival', 'mine', ['Seus festivais', 'Your festivals'], ['Line-up, local, mês, preço.', 'Line-up, site, month, price.'], ['Headliner vende ingresso.', 'The headliner sells tickets.']);
T('cp17-festival', 'rivals', ['Festivais rivais', 'Rival festivals'], ['Quem disputa público e artistas.', 'Who competes for crowd and acts.'], ['Cláusula de raio impede o artista de tocar perto.', 'A radius clause stops the act playing nearby.'], ['radius']);
T('cp17-venue', 'house', ['Sua casa e programação', 'Your venue and programming'], ['Noites, atrações, bar e bilheteria.', 'Nights, acts, bar and door.'], ['Bar paga as noites fracas.', 'The bar pays for weak nights.']);
T('cp17-venue', 'venues', ['Comprar e vender casas', 'Buy and sell venues'], ['Mercado de casas reais.', 'Market of real venues.'], ['Localização vale mais que tamanho.', 'Location beats size.']);
T('cp17-musician', 'band', ['Sua banda', 'Your band'], ['Integrantes, humor, ensaio, composições.', 'Members, mood, rehearsal, songs.'], ['Ensaio sobe entrosamento.', 'Rehearsal raises tightness.']);
T('cp17-manager', 'management', ['Agenciados e prospecção', 'Clients and prospecting'], ['Clientes e prospecção.', 'Clients and prospecting.'], ['Comissão sobre o ganho do cliente.', 'Commission on the client\'s earnings.'], ['commission']);
T('cp17-booking', 'tour12', ['Rotas, propostas e clientes', 'Routes, offers and clients'], ['Rotas, propostas e clientes.', 'Routes, offers and clients.'], ['Rotas compactas cortam frete.', 'Compact routes cut travel.']);
T('cp17-studio', 'studio12', ['Estúdio e produção', 'Studio and production'], ['Estúdio e cadeira de produtor.', 'Studio and producer chair.'], ['Pontos = royalty do produtor.', 'Points = producer royalty.'], ['points']);
T('cp17-publisher', 'publishing16', ['Compositores e catálogo', 'Songwriters and catalog'], ['Compositores e obras.', 'Songwriters and works.'], ['Cada regravação paga mecânico.', 'Every cover pays mechanicals.'], ['mechanical']);
T('cp17-media', 'outlets16', ['Seus veículos', 'Your outlets'], ['Rádio, revista, TV...', 'Radio, magazine, TV...'], ['Credibilidade é o ativo.', 'Credibility is the asset.']);
T('cp17-platform', 'platform16', ['Sua plataforma', 'Your platform'], ['Catálogo, assinantes, algoritmo.', 'Catalog, subscribers, algorithm.'], ['Retenção > aquisição.', 'Retention > acquisition.'], ['prorata']);
T('cp17-screen', 'scr', ['Encomendas e trilhas', 'Commissions and scores'], ['Pedidos de trilha para cinema, TV, games, teatro.', 'Score requests for film, TV, games, stage.'], ['Prazo cumprido = próximo convite.', 'Deadline met = next invitation.'], ['cue']);
T('cp17-critic', 'crit', ['Resenhas e redação', 'Reviews and newsroom'], ['Fila de discos para resenhar e sua redação.', 'Queue of records to review and your newsroom.'], ['Acertar previsões sobe credibilidade.', 'Correct calls raise credibility.']);

// ---------------------------------------------------------------- Gestão / estúdio (telas absorvidas)
T('management9', 'roster', ['Meus agenciados', 'My clients'], ['Seus clientes e humor.', 'Your clients and mood.'], ['Cliente insatisfeito sai.', 'Unhappy clients leave.']);
T('management9', 'prospect', ['Prospectar', 'Prospect'], ['Achar novos clientes.', 'Find new clients.'], ['Promessa cumprida fideliza.', 'Kept promises build loyalty.']);
T('management9', 'reports', ['Relatórios', 'Reports'], ['Relatórios de carreira dos clientes.', 'Client career reports.'], ['Mostram risco de saída.', 'They show exit risk.']);
T('management9', 'poach', ['Roubar clientes', 'Poach clients'], ['Aliciar clientes de outros empresários.', 'Poach other managers\' clients.'], ['Gera rixa com o empresário.', 'Creates a feud with the manager.']);
T('management9', 'agency12', ['Agência', 'Agency'], ['Sua agência: equipe e escala.', 'Your agency: staff and scale.'], ['Escala permite mais clientes.', 'Scale allows more clients.']);
T('management9', 'services12', ['Serviços', 'Services'], ['Serviços extras (imprensa, jurídico).', 'Extra services (press, legal).'], ['Cobrados à parte.', 'Billed separately.']);
T('studio12', 'studio', ['Dono do estúdio', 'Studio owner'], ['Reservas, equipamento, engenheiros.', 'Bookings, gear, engineers.'], ['Equipamento envelhece.', 'Gear ages.']);
T('studio12', 'producer', ['Produtor', 'Producer'], ['Projetos como produtor.', 'Projects as producer.'], ['Estilo quente vende mais.', 'A hot style sells more.'], ['points']);

// ---------------------------------------------------------------- Rumo do selo (long18)
T('long18', 'paths', ['Caminhos', 'Paths'], ['Caminhos de vitória com 4 KPIs e 3 marcos.', 'Win paths with 4 KPIs and 3 milestones.'], ['Até 3 metas ativas (marco vale 1,5×).', 'Up to 3 active goals (milestone counts 1.5×).']);
T('long18', 'laws', ['Doutrinas e decisões', 'Doctrines and decisions'], ['Doutrinas exclusivas em pares, que destravam decisões do selo.', 'Exclusive doctrines in pairs that unlock label decisions.'], ['Uma por semestre; revogar após 1 ano.', 'One per semester; revoke after 1 year.']);
T('long18', 'policy', ['Políticas', 'Policies'], ['Delegação por regras: teto de gasto, reserva, descanso, renovação.', 'Delegation by rules: spend cap, reserve, rest, renewal.'], ['Exceções chegam na Caixa.', 'Exceptions arrive in the Inbox.']);
T('long18', 'pm', ['Post-mortems', 'Post-mortems'], ['Previsto × realizado de cada lançamento, 12 semanas depois.', 'Forecast × actual of each release, 12 weeks later.'], ['O fator vermelho é o que corrigir.', 'The red factor is what to fix.'], ['postmortem']);
T('long18', 'year', ['Ano em revista', 'Year in review'], ['Resumo do ano.', 'Year summary.'], ['Cartão copiável.', 'Copyable card.']);
T('long18', 'bio', ['Biografia', 'Biography'], ['Sua biografia viva.', 'Your living biography.'], ['Atualiza a cada ano.', 'Updates yearly.']);
T('long18', 'house', ['Casa e dinastia', 'House and dynasty'], ['Gerações, prestígio herdado.', 'Generations, inherited prestige.'], ['Passar o selo pontua.', 'Passing on the label scores.']);
T('long18', 'diff', ['Dificuldade', 'Difficulty'], ['Dificuldade adaptativa opcional.', 'Optional adaptive difficulty.'], ['Perk visível com porquê.', 'Visible perk with why.']);

// ---------------------------------------------------------------- Mercados (regions18)
T('regions18', 'ov', ['Regiões', 'Regions'], ['Visão geral dos submercados.', 'Sub-market overview.'], ['Peso × poder de compra.', 'Weight × buying power.']);
T('regions18', 'sub', ['Submercado', 'Sub-market'], ['Detalhe: idiomas, plataformas, barreiras, parceiros.', 'Detail: languages, platforms, barriers, partners.'], ['Barreira alta pede parceiro local.', 'High barriers need a local partner.'], ['licensing']);
T('regions18', 'circ', ['Circuitos', 'Circuits'], ['Rodeios, São João, bailes, sound systems...', 'Rodeos, São João, baile funk, sound systems...'], ['Circuito certo dá público fiel.', 'The right circuit gives a loyal crowd.']);
T('regions18', 'kpop', ['K-pop', 'K-pop'], ['Trainees, debut, contratos, fandom, serviço militar.', 'Trainees, debut, contracts, fandom, military service.'], ['Regras de contrato mudam em 2009 e 2017.', 'Contract rules change in 2009 and 2017.']);
T('regions18', 'jp', ['Japão e idols', 'Japan and idols'], ['Apertos de mão, eleição, graduação, Kōhaku, enka.', 'Handshakes, elections, graduation, Kōhaku, enka.'], ['Mercado físico forte até tarde.', 'Physical market strong until late.']);
T('regions18', 'log', ['Afinidades', 'Affinities'], ['Afinidades entre regiões (diásporas, virais, feats).', 'Affinities between regions (diasporas, virals, feats).'], ['Afinidades decaem sem novidades.', 'Affinities decay without news.']);

// ---------------------------------------------------------------- Direitos (rights18)
T('rights18', 'sum', ['Resumo', 'Summary'], ['Arrecadação por tipo e alertas.', 'Collections by type and alerts.'], ['Comece pelos alertas.', 'Start with the alerts.']);
T('rights18', 'works', ['Obras', 'Works'], ['Composições, autores e splits.', 'Compositions, writers and splits.'], ['Split somando 100% evita caixa preta.', 'Splits adding to 100% avoid the black box.'], ['split', 'blackbox']);
T('rights18', 'rec', ['Gravações e versões', 'Recordings and versions'], ['Fonogramas, regravações (re-records), conexos.', 'Masters, re-records, neighbouring rights.'], ['Regravar tira valor do master antigo.', 'Re-recording drains value from the old master.'], ['masters', 'neighbouring', 'rerecord']);
T('rights18', 'clr', ['Autorizações', 'Clearances'], ['Samples, covers fora dos EUA, sync de obra alheia.', 'Samples, covers outside the US, sync of others\' works.'], ['Limpe antes de lançar.', 'Clear before releasing.'], ['sample', 'compulsory']);
T('rights18', 'disp', ['Disputas', 'Disputes'], ['Disputas de crédito com caução.', 'Credit disputes with escrow.'], ['Dinheiro fica preso até decidir.', 'Money is frozen until resolved.']);
T('rights18', 'soc', ['Sociedades', 'Societies'], ['Sociedades de arrecadação por mercado e época (taxa, atraso).', 'Collecting societies by market and era (fee, lag).'], ['Subeditora local arrecada melhor.', 'A local sub-publisher collects better.'], ['pro', 'ecad']);
T('rights18', 'stm', ['Extratos', 'Statements'], ['Extratos de royalties.', 'Royalty statements.'], ['Auditoria acha dinheiro perdido.', 'An audit finds lost money.'], ['audit']);
T('rights18', 'cat', ['Catálogo', 'Catalog'], ['Avaliação do catálogo de direitos.', 'Rights catalog valuation.'], ['Múltiplo depende de idade e estabilidade.', 'The multiple depends on age and stability.'], ['catalog']);
T('rights18', 'pub', ['Editora', 'Publishing'], ['Edição do selo e subeditoras.', 'Label publishing and sub-publishers.'], ['Administração cobra % e arrecada mais.', 'Admin charges % and collects more.'], ['publishing']);
T('rights18', 'prec', ['Precedentes', 'Precedents'], ['14 decisões reais que mudam as regras.', '14 real rulings that change the rules.'], ['Só aparecem depois da data real.', 'They appear only after the real date.'], ['termination']);

// ---------------------------------------------------------------- Sociedade (society18)
T('society18', 'awards', ['Prêmios', 'Awards'], ['Prêmios por país e época.', 'Awards by country and era.'], ['Escândalo recente afasta júri.', 'A recent scandal repels juries.']);
T('society18', 'charts', ['Paradas', 'Charts'], ['Regras e fraudes de paradas.', 'Chart rules and fraud.'], ['Fraude descoberta = lista negra.', 'Fraud found = blacklist.']);
T('society18', 'ai', ['IA', 'AI'], ['IA na música: vozes, autoria, consentimento.', 'AI in music: voices, authorship, consent.'], ['Só após a era certa.', 'Only after the right era.']);
T('society18', 'censor', ['Censura e exílio', 'Censorship and exile'], ['Censura por país e artistas exilados.', 'Censorship by country and exiled acts.'], ['Disco proibido pode virar cult.', 'A banned record may go cult.'], ['streisand']);
T('society18', 'charity', ['Filantropia', 'Philanthropy'], ['Causas e shows beneficentes.', 'Causes and benefit shows.'], ['Sobe reputação institucional.', 'Raises institutional reputation.']);
T('society18', 'city', ['Cidade da música', 'Music city'], ['Investimentos na cena da sua cidade.', 'Investment in your city\'s scene.'], ['Cena forte gera talento local.', 'A strong scene breeds local talent.']);

// ---------------------------------------------------------------- Cadeia física (supply18)
T('supply18', 'press', ['Prensagem', 'Pressing'], ['Fábricas, filas, defeitos e reservas.', 'Plants, queues, defects and bookings.'], ['Fábrica de major tem prioridade para os grandes.', 'A major\'s plant prioritises the big ones.']);
T('supply18', 'dist', ['Distribuição', 'Distribution'], ['Distribuidor próprio, rede indie, P&D com major, agregador.', 'Own distributor, indie network, P&D with a major, aggregator.'], ['P&D dá adiantamento e cobra mínimo de lançamentos.', 'P&D gives an advance and demands minimum releases.'], ['pd', 'aggregator', 'distribution']);
T('supply18', 'stock', ['Estoque', 'Stock'], ['Estoque, armazém, devoluções e pontas de estoque.', 'Stock, warehouse, returns and cut-outs.'], ['Estoque parado custa armazém.', 'Idle stock costs storage.'], ['returns', 'cutout']);
T('supply18', 'deals', ['Acordos', 'Deals'], ['Contrato de desenvolvimento, selo-vaidade, JV de gênero.', 'Development deal, vanity imprint, genre JV.'], ['JV dá aporte e divide receita.', 'A JV gives funding and splits revenue.'], ['option', 'imprint', 'jv']);
T('supply18', 'rep', ['Mercado', 'Market'], ['Relatório: formatos por país, gêneros subindo/caindo, filas.', 'Report: formats by country, rising/falling genres, queues.'], ['Gênero subindo sem ninguém seu = oportunidade.', 'A rising genre with nobody of yours = opportunity.']);

// ---------------------------------------------------------------- Talentos (talent18)
T('talent18', 'disc', ['Descoberta', 'Discovery'], ['Pistas de talentos para ir atrás.', 'Talent leads to chase.'], ['"Ir atrás" gasta tempo e revela mais.', '"Chase" costs time and reveals more.'], ['capa']);
T('talent18', 'camps', ['Composição', 'Writing camps'], ['Campos de composição com vários autores.', 'Writing camps with several writers.'], ['Mais autores = mais splits.', 'More writers = more splits.'], ['split']);
T('talent18', 'band', ['Banda da casa', 'House band'], ['Músicos fixos do selo.', 'The label\'s fixed musicians.'], ['Som consistente, custo fixo.', 'Consistent sound, fixed cost.'], ['session']);
T('talent18', 'school', ['Escolas', 'Schools'], ['Escolas e bolsas para formar talentos.', 'Schools and scholarships to train talent.'], ['Formado na sua escola tende a assinar com você.', 'Your school\'s graduates tend to sign with you.']);
T('talent18', 'tv', ['TV de talentos', 'Talent TV'], ['Programas de calouros e reality musical.', 'Talent shows and music reality TV.'], ['Fama rápida, carreira curta.', 'Fast fame, short career.']);

// ---------------------------------------------------------------- Dinâmica (dyn18)
T('dyn18', 'roster', ['Elenco', 'Roster'], ['Dinâmica entre atos do elenco.', 'Dynamics among roster acts.'], ['Inveja aparece quando um cresce.', 'Envy appears when one grows.']);
T('dyn18', 'band', ['Bandas', 'Bands'], ['Hierarquia e grupos em cada banda.', 'Hierarchy and cliques in each band.'], ['Tensão alta prevê separação.', 'High tension predicts a split.']);
T('dyn18', 'staff', ['Equipe', 'Staff'], ['Dinâmica da equipe.', 'Staff dynamics.'], ['Promessas cumpridas sobem humor.', 'Kept promises lift mood.']);

// ---------------------------------------------------------------- Criação (host creation)
T('*', 'compose', ['Compor', 'Write'], ['Composição de faixas.', 'Songwriting.'], ['Tema vivido soa verdadeiro.', 'A lived theme rings true.']);
T('*', 'cr-sound', ['Direção sonora', 'Sound direction'], ['Rumo sonoro do artista.', 'The act\'s sonic direction.'], ['Mudança brusca assusta fãs antigos.', 'An abrupt change scares old fans.']);
T('*', 'cr-themes', ['Temas e tendências', 'Themes and trends'], ['Temas em alta na época.', 'Trending themes of the era.'], ['Tema na moda + coerência = crítica e venda.', 'Trendy theme + coherence = critics and sales.']);
T('*', 'cr-recipe', ['Receita sonora', 'Sound recipe'], ['Ingredientes do som (andamento, timbres).', 'Sound ingredients (tempo, timbres).'], ['Timbre de marca consolida assinatura.', 'Trademark timbres build a signature.']);
T('*', 'cr-visuals', ['Capa e vídeo', 'Cover and video'], ['Estética visual do lançamento.', 'Release visual aesthetics.'], ['Visual forte ajuda na era MTV.', 'Strong visuals help in the MTV era.']);
T('*', 'cr-cover', ['Capa', 'Cover'], ['Arte de capa.', 'Cover art.'], ['Capa polêmica pode ser banida.', 'A controversial cover may be banned.']);
T('*', 'cr-partners', ['Parcerias', 'Partnerships'], ['Feats e coautorias.', 'Feats and co-writes.'], ['Feat com astro empresta fãs.', 'A feat with a star lends fans.'], ['split']);
T('*', 'cr-comm', ['Encomendas', 'Commissions'], ['Músicas sob encomenda (jingles, trilhas).', 'Commissioned songs (jingles, scores).'], ['Renda rápida, pouca fama.', 'Quick income, little fame.']);
T('*', 'cr-div', ['Divisões', 'Divisions'], ['Divisões criativas do selo.', 'Creative divisions of the label.'], ['Especialização sobe qualidade.', 'Specialisation raises quality.']);
T('*', 'cr-catalog', ['Remaster e standards', 'Remasters and standards'], ['Remasters e regravações de standards.', 'Remasters and standards covers.'], ['Standard paga mecânico ao autor.', 'A standard pays mechanicals to the writer.'], ['mechanical']);
T('*', 'projects', ['Projetos', 'Projects'], ['Discos em andamento.', 'Records in progress.'], ['Um projeto por vez por artista.', 'One project at a time per act.']);
T('*', 'studio-gear', ['Equipamento', 'Gear'], ['Equipamento de estúdio por época.', 'Studio gear by era.'], ['Equipamento novo sobe técnica.', 'New gear raises technique.']);

// ---------------------------------------------------------------- Fichas de artista/pessoa (popups)
T('act', 'ability18', ['Desenvolvimento (CA/PA)', 'Development (CA/PA)'], ['Habilidade atual (CA) e potencial (PA) em estrelas, com incerteza; gráfico de evolução, treino e mentor.', 'Current (CA) and potential (PA) ability in stars, with uncertainty; growth chart, training and mentor.'], ['PA é estimado: quanto mais você conhece o artista, mais estreita a faixa. Ex.: 2★ atual / 3–5★ potencial = aposta de longo prazo.', 'PA is estimated: the better you know the act, the narrower the range. E.g. 2★ now / 3–5★ potential = a long-term bet.'], ['capa']);
T('act', 'traj18', ['Trajetória artística', 'Artistic trajectory'], ['Assinatura sonora, temas recorrentes, parcerias com produtores e reação à crítica.', 'Sound signature, recurring themes, producer partnerships and reaction to critics.'], ['Siga a direção sugerida para consolidar; mudar tudo a cada disco confunde o público.', 'Follow the suggested direction to consolidate; changing everything each record confuses the audience.']);
T('act', 'feud18', ['Rixas', 'Feuds'], ['Rixas com outros atos: farpas → diss → guerra → briga.', 'Feuds with other acts: jabs → diss → war → fight.'], ['Medie cedo ou use um feat de trégua.', 'Mediate early or use a truce feat.'], ['feud']);
T('act', 'fans18', ['Fãs', 'Fans'], ['Motivações dos fãs, lealdade, poder de compra e mobilização.', 'Fan motivations, loyalty, buying power and mobilisation.'], ['Fãs leais compram merch e ingresso caro.', 'Loyal fans buy merch and pricey tickets.']);
T('act', 'dyn18', ['Dinâmica', 'Dynamics'], ['Hierarquia e humor dentro da banda.', 'Hierarchy and mood inside the band.'], ['Porta-voz move o grupo.', 'The spokesperson moves the group.']);
T('act', 'hype12', ['Hype', 'Hype'], ['Hype e o motivo.', 'Hype and its reason.'], ['Lance com hype alto.', 'Release with high hype.'], ['hype']);
T('act', 'reach17', ['Alcance mundial', 'Global reach'], ['Fama por país e região.', 'Fame by country and region.'], ['Turnê onde já há fãs.', 'Tour where fans already are.']);
T('act', 'why12', ['Por que deu nisso?', 'Why did this happen?'], ['Causas do resultado do artista.', 'Causes of the act\'s results.'], ['Veja antes de demitir.', 'Check before dropping them.']);
T('act', 'press17', ['Na imprensa', 'In the press'], ['Matérias sobre o artista.', 'Stories about the act.'], ['Boato em alta pede resposta.', 'A hot rumor needs a reply.']);
T('act', 'fan15', ['Fandom', 'Fandom'], ['Base de fãs e comunidades.', 'Fan base and communities.'], ['Fandom forte segura flops.', 'A strong fandom cushions flops.']);
T('act', 'cap14', ['Tempo da banda', 'Band time'], ['Capacidade da banda no mês.', 'Band capacity this month.'], ['100% por pessoa.', '100% per person.']);
T('act', 'deleg16', ['Agenciado por', 'Booked by'], ['Quem agencia os shows.', 'Who books the shows.'], ['Agente bom = cachês maiores.', 'A good agent = bigger fees.']);
T('act', 'mgr14', ['Empresário', 'Manager'], ['O empresário do artista.', 'The act\'s manager.'], ['Negocia contra você.', 'Negotiates against you.'], ['commission']);
T('person', 'car18', ['Carreira depois do palco', 'Career after the stage'], ['O que a pessoa faz depois de parar.', 'What the person does after stopping.'], ['Ex-artistas viram contatos.', 'Former acts become contacts.']);
T('person', 'path16', ['Trajetória', 'Career path'], ['Bandas e funções ao longo da vida.', 'Bands and roles over a lifetime.'], ['Mostra saídas e solos.', 'Shows exits and solo turns.']);
T('label', 'strat18', ['Estratégia observada', 'Observed strategy'], ['O que o rival parece fazer (inundar, desenvolver, abandonar...).', 'What the rival seems to do (flood, develop, abandon...).'], ['Antecipe: rival que abandona libera artistas.', 'Anticipate: an abandoning rival frees acts.']);

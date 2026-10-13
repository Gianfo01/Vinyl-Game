// Rodada 29 (WIKI) — artigos de mecânica: música (projetos, composição, estúdio, lançamento, paradas), ao vivo
// (shows, turnês, festivais), fama/fãs/facções e reputação. Conteúdo derivado do código (src/sim/production.ts,
// market.ts, live.ts, tours.ts, lifecycle.ts, fandom.ts, contracts.ts, src/sim/sys/producers15.ts, world4/charts.ts,
// press18.ts, creation/core.ts, bridge17.ts, fests8.ts, merch17.ts, show27.ts, fame15.ts, fame16.ts, fans18.ts,
// hype12.ts, standing9.ts, labelrep28.ts, mech29.ts, caps18.ts) e de docs/connect29.md e docs/econ18.md.
import { l } from '../../data/world';
import type { GameState } from '../../sim/types';
import type { Faq29, MechArt29, Term29 } from './wiki29types';
// constantes reais (valores monetários destas tabelas estão em dólares de 2020; o jogo corrige pela época)
import { APPROACHES, CHANNELS, STUDIO_TIERS, VENUE_TIERS } from '../../data/rules';
import { PAYOLA_TIERS } from '../../sim/sys/world4/charts';
import { MOD_CAP18, PERK_CAP18 } from '../../sim/caps18';
import { STREAM_PAYOUT17 } from '../../sim/market';
import { PRODUCTION_COST, TICKET } from '../../sim/tours';
import { TEAM_FROM18 } from '../../sim/sys/fans18';
import { FEAT_MAX_P29 } from '../../sim/sys/featp29';
import { STAND_KEYS, STAND_NAME } from '../../sim/sys/standing9';

// dólares reais (2020) — as tabelas guardam dólares, não centavos
const usd = (d: number): string => 'US$ ' + Math.round(d).toLocaleString('pt-BR');
const pct = (x: number): string => `${Math.round(x * 1000) / 10}%`;

export const MECH_B: MechArt29[] = [
  // ------------------------------------------------------------------------------------------------ música
  {
    id: 'music',
    title: l('Projetos, composição, estúdio, lançamento e paradas', 'Projects, songwriting, studio, release and charts'),
    icon: 'disc',
    summary: l(
      'Do rascunho ao disco nas paradas: compor dá a ideia, o estúdio dá a nota (Q), o lançamento fixa o apelo e o mercado semanal decide as vendas.',
      'From draft to charting record: writing gives the idea, the studio sets the grade (Q), the launch fixes the appeal and the weekly market decides sales.',
    ),
    what: [
      l(
        'Um projeto (single, EP ou LP) junta músicas do ato. Primeiro a banda compõe: melodia e letra vêm do talento dos compositores e da inspiração; originalidade cai quando a cena da cidade já está saturada daquele gênero.',
        'A project (single, EP or LP) gathers an act\'s songs. First the band writes: melody and lyrics come from the writers\' talent and inspiration; originality drops when the city scene is already saturated with that genre.',
      ),
      l(
        'Na gravação entram a execução (voz, instrumento, ensaio, moral) e a produção (época, nível do estúdio, produtor, engenheiro). As cinco partes viram a nota Q da faixa. Depois a equipe e o humor da banda ajustam essa nota.',
        'Recording adds performance (voice, instrument, rehearsal, morale) and production (era, studio tier, producer, engineer). The five parts become the track\'s Q grade. Then the crew and the band\'s mood adjust that grade.',
      ),
      l(
        'No lançamento você escolhe formatos, tiragem, territórios e marketing. O apelo do disco é calculado UMA vez, na estreia; o que muda depois só pesa nas vendas semanais. Toda semana o mercado divide uma demanda finita entre todos os lançamentos vivos e monta as paradas.',
        'At release you pick formats, pressing, territories and marketing. The record\'s appeal is computed ONCE, at launch; anything that changes later only affects weekly sales. Every week the market splits a finite demand among all live releases and builds the charts.',
      ),
      l('Participação (feat.): convide um ato inteiro, UMA pessoa específica (integrante, solista, músico avulso, produtor que canta ou toca), até 4 pessoas ou um ato + pessoas. O crédito sai com o nome: "Música (feat. Freddie Mercury)". É a mesma negociação de sempre (cachê, royalties da faixa, liberação do selo), aberta pela tela do feat ("Ato inteiro / Pessoa(s) específica(s)"), pelo clique direito na pessoa (Música e projetos › "Convidar {nome} para um feat…") ou pela [[glossario:oferta-a-integrante]].',
        'Feature (feat.): invite a whole act, ONE specific person (band member, solo artist, freelance musician, producer who sings or plays), up to 4 people or an act + people. The credit carries the name: "Song (feat. Freddie Mercury)". It is the usual negotiation (fee, track royalties, label clearance), opened from the feat screen ("Whole act / Specific person(s)"), by right-clicking the person (Music and projects › "Invite {name} to a feat…") or through the [[glossario:oferta-a-integrante]].'),
    ],
    inputs: [
      l('Talento de composição e letra, inspiração (cai 8 pontos por música escrita).', 'Writing and lyric talent, inspiration (drops 8 points per song written).'),
      l('Estúdio, abordagem, produtor e engenheiro da casa.', 'Studio, approach, producer and house engineer.'),
      l('Estresse e inspiração da banda na hora de gravar.', 'Band stress and inspiration when recording.'),
      l('Fama, fãs núcleo e momento do ato.', 'Act fame, core fans and momentum.'),
      l('Popularidade do gênero, territórios cobertos e formato certo para a época.', 'Genre popularity, territories covered and the right format for the era.'),
      l('Canais e verba de marketing; campanha de rollout e superfãs.', 'Marketing channels and budget; rollout campaign and superfans.'),
      l('Críticas, sua própria resenha e o jabá.', 'Reviews, your own review and payola.'),
    ],
    outputs: [
      l('Unidades vendidas por semana, receita do master e da edição.', 'Weekly units sold, master and publishing revenue.'),
      l('Posição nas paradas, discos de ouro, platina e diamante.', 'Chart positions, gold, platinum and diamond records.'),
      l('Fama do ato e novos fãs (cada unidade traz casuais e alguns ativos).', 'Act fame and new fans (each unit brings casuals and some actives).'),
      l('Reputação artística do selo (originalidade e Q do disco).', 'The label\'s artistic reputation (originality and Q of the record).'),
      l('Momento do ato: sobe 12 pontos mais um bônus pelo marketing a cada estreia.', 'Act momentum: rises 12 points plus a marketing bonus at every launch.'),
      l('Recuperação do adiantamento nos contratos ([[mech:contracts|contratos]]).', 'Advance recoupment on contracts ([[mech:contracts|contracts]]).'),
    ],
    rules: [
      l(
        'Nota Q = 25% melodia + 20% letra + 25% execução + 20% produção + 10% originalidade. Faixa instrumental ignora a letra e redistribui os pesos.',
        'Q grade = 25% melody + 20% lyrics + 25% performance + 20% production + 10% originality. Instrumental tracks skip lyrics and reweight the rest.',
      ),
      l(
        'Estúdios: garagem (grátis, +0), regional (US$ 2.500, +8), profissional (US$ 9.000, +16) e elite (US$ 28.000, +24 de produção). Custo = nível × máx(1, faixas/3) + US$ 150 por faixa, vezes a abordagem: espontânea 0,6×, equilibrada 1×, minuciosa 1,7×.',
        'Studios: garage (free, +0), regional ($2,500, +8), professional ($9,000, +16) and elite ($28,000, +24 production). Cost = tier × max(1, tracks/3) + $150 per track, times the approach: spontaneous 0.6×, balanced 1×, meticulous 1.7×.',
      ),
      l(
        'Banda estressada (média acima de 70) grava com −6% na nota; banda leve (estresse abaixo de 30 e inspiração acima de 70) ganha +4%. Bônus empilhados de nota têm teto suave.',
        'A stressed band (average above 70) records at −6% grade; a relaxed band (stress below 30 and inspiration above 70) gets +4%. Stacked grade bonuses have a soft cap.',
      ),
      l(
        'Apelo na estreia = qualidade × fama × gênero × cobertura × formato na era × momento × acaso. A qualidade pesa forte: (Q/55) elevado a 2,4. Lançar demais no mesmo ano cansa: cada disco a mais nos últimos 52 semanas divide o apelo por (1 + 0,35).',
        'Launch appeal = quality × fame × genre × coverage × format fit × momentum × chance. Quality weighs heavily: (Q/55) to the power of 2.4. Releasing too often tires people: each extra record in the last 52 weeks divides appeal by (1 + 0.35).',
      ),
      l(
        'Marketing: E = 1 − e^(−verba ÷ custo de alcance do canal). Retorno decrescente: dobrar a verba não dobra o efeito.',
        'Marketing: E = 1 − e^(−budget ÷ channel reach cost). Diminishing returns: doubling the budget does not double the effect.',
      ),
      l(
        'Críticas valem nas primeiras 8 semanas (até ±15% nas vendas); a sua resenha vale 12 semanas. O jabá soma até +45% de unidades nos discos com até 16 semanas e esfria 40% por mês.',
        'Reviews count for the first 8 weeks (up to ±15% of sales); your own review counts for 12 weeks. Payola adds up to +45% units on records up to 16 weeks old and cools 40% a month.',
      ),
      l(
        'Certificados: ouro com 500 mil unidades, platina com 1 milhão, diamante com 10 milhões. Nº 1 na parada dá +0,4 de fama por semana; top 10, +0,16; top 40, +0,05.',
        'Certifications: gold at 500k units, platinum at 1 million, diamond at 10 million. #1 gives +0.4 fame a week; top 10, +0.16; top 40, +0.05.',
      ),
      l(
        'Catálogo: depois de 52 semanas o disco vira cauda longa e ainda vende um mínimo que cresce com a fama do ato.',
        'Catalog: after 52 weeks a record becomes long tail and still sells a floor that grows with the act\'s fame.',
      ),
      l(
        'Produtor real: jantar no estúdio dele custa US$ 900 (DINNER_COST, producers15) e só pode ser repetido a cada 26 semanas; com opinião −35 ou pior ele recusa o trabalho.',
        'Real producer: dinner at his studio costs $900 (DINNER_COST, producers15) and can only be repeated every 26 weeks; at opinion −35 or worse he refuses the job.',
      ),
      l('Feat de pessoa: cachê = cachê pela fama da pessoa × (0,85 + habilidade/400), somado por convidado; performance da faixa por pessoa com pesos 1 / 0,6 / 0,4 / 0,3, teto +12; apelo até +20% pela fama das pessoas; público cruzado vem dos fãs da banda dela, reduzido. A liberação passa pelo selo de cada banda (rivalidade acima de 60 bloqueia), e os colegas de banda reagem com ciúme (−2) ou orgulho (+1 se você é bem maior). Bloqueado: falecido, menor de 14 anos, produtor que não canta nem toca, fora de atividade ou já seu. O "Convite rápido" também vale para pessoa, a preço de tabela (fama + habilidade + liberação).',
        'Person feat: fee = fee by the person\'s fame × (0.85 + skill/400), summed per guest; track performance per person with weights 1 / 0.6 / 0.4 / 0.3, cap +12; appeal up to +20% from the people\'s fame; fan crossover comes from their band\'s fans, scaled down. Clearance goes through each band\'s label (rivalry above 60 blocks), and bandmates react with jealousy (−2) or pride (+1 if you are much bigger). Blocked: dead, under 14, a producer who neither sings nor plays, inactive or already yours. The "Quick invite" also works for a person, at a list price (fame + skill + clearance).'),
      l('O mundo também faz feat de pessoa: atos de NPC convidam pessoas específicas nos próprios lançamentos (em média 0,15 por mês antes de 1960, até 2 por mês desde 1998; pesos por gênero: hip-hop 2,6, pop 1,8, R&B 1,5, rock 0,8, folk 0,4). A dupla é escolhida pela proximidade de fama, família de gênero, cidade, selo, relações, projetos em comum e admiração — ex.: "Little Stranger (feat. Willie Dixon)" de Muddy Waters. Convites para você também podem pedir uma pessoa sua ("{anfitrião} quer a voz de {pessoa}"): aceite (cachê, royalties e fama para a pessoa), contraproponha a banda inteira ou recuse.',
        'The world does person feats too: NPC acts invite specific people on their own releases (on average 0.15 a month before 1960, up to 2 a month from 1998; genre weights: hip-hop 2.6, pop 1.8, R&B 1.5, rock 0.8, folk 0.4). The pair is chosen by fame closeness, genre family, city, label, relationships, shared projects and admiration — e.g. "Little Stranger (feat. Willie Dixon)" by Muddy Waters. Invites to you can also ask for one of your people ("{host} wants {person}\'s voice"): accept (fee, royalties and fame for the person), counter with the whole band or decline.'),
    ],
    tips: [
      l('Quer a voz de uma banda sem pagar pela banda toda? Feat de pessoa: o cachê segue a fama da PESSOA e a habilidade conta (voz de quem canta, instrumento de quem toca).', 'Want one band\'s voice without paying for the whole band? A person feat: the fee follows THEIR fame and skill counts (voice for singers, instrument for players).'),
      l('Grave quando a banda estiver descansada: estresse alto custa 6% de nota em toda faixa.', 'Record when the band is rested: high stress costs 6% grade on every track.'),
      l('Espaçe os discos. Dois por ano já começam a se canibalizar.', 'Space out releases. Two a year already start cannibalizing each other.'),
      l('Tudo que mexe no apelo precisa estar pronto antes da estreia: depois, só as vendas semanais mudam.', 'Anything that affects appeal must be ready before launch: afterwards only weekly sales change.'),
      l('Divida a verba entre canais em vez de afogar um só.', 'Split the budget across channels instead of drowning one.'),
      l('Jabá funciona, mas acumula calor e pode virar investigação e multa ([[mech:reputation|reputação]]).', 'Payola works, but builds heat and can become a probe and a fine ([[mech:reputation|reputation]]).'),
    ],
    pages: ['project', 'creation', 'studio', 'producers15', 'releases', 'charts', 'catalog', 'market'],
    see: ['mech:fame', 'mech:contracts', 'mech:money', 'mech:press', 'glossario:apelo', 'glossario:nota-q'],
    nums: () => {
      const rows: [ReturnType<typeof l>, string][] = [];
      rows.push([l('Feat: pessoas convidadas por faixa (máx.)', 'Feat: invited people per track (max)'), String(FEAT_MAX_P29)]);
      for (const t of STUDIO_TIERS.slice(1)) rows.push([t.name, `${usd(t.cost)} · +${t.production}`]);
      rows.push([l('Abordagens (custo)', 'Approaches (cost)'), APPROACHES.map((a) => `${a.costMult}×`).join(' / ')]);
      rows.push([l('Jabá: pacotes', 'Payola: packages'), PAYOLA_TIERS.map((t) => usd(t.real)).join(' / ')]);
      rows.push([l('Streaming: fatia por unidade (selo independente)', 'Streaming: share per unit (indie label)'), pct(STREAM_PAYOUT17)]);
      rows.push([l('Teto suave de bônus de nota (joelho)', 'Soft cap on grade bonuses (knee)'), `+${pct(MOD_CAP18.songQ.knee)}`]);
      return rows;
    },
    docs: ['docs/connect29.md', 'docs/econ18.md', 'docs/feat29.md'],
  },

  // ------------------------------------------------------------------------------------------------ ao vivo
  {
    id: 'live',
    title: l('Ao vivo, turnês e festivais', 'Live, tours and festivals'),
    icon: 'stage',
    summary: l(
      'Shows trazem dinheiro, fãs e fama local. Show simples é rápido; turnê é planejada cidade a cidade; festivais pagam pela faixa no line-up.',
      'Shows bring money, fans and local fame. A simple gig is quick; a tour is planned city by city; festivals pay by line-up slot.',
    ),
    what: [
      l(
        'Há três jeitos de tocar. O show simples marca algumas datas numa casa do tamanho que a fama permite. A turnê percorre cidades, com logística, viagem, vistos, clima e risco de acidente. O festival convida (ou aceita) seus atos numa faixa do line-up.',
        'There are three ways to play. A simple gig books a few dates at a venue the fame allows. A tour goes city to city, with logistics, travel, visas, weather and accident risk. A festival invites (or accepts) your acts into a line-up slot.',
      ),
      l(
        'Cada parada de turnê vende ingressos pela demanda da cidade: fãs do ato, cena local e saturação de visitas recentes. A qualidade do setlist, a produção de palco e o preço mexem no público. Você também pode jogar o show ao vivo, música a música.',
        'Each tour stop sells tickets by city demand: the act\'s fans, local scene and saturation from recent visits. Setlist quality, stage production and price move the crowd. You can also play the show live, song by song.',
      ),
      l(
        'Atenção: o show simples não passa pelos modificadores de show (escândalo, poder de compra, facções, bônus de bilheteria). Esses efeitos só valem nas paradas de turnê.',
        'Note: simple gigs do not go through show modifiers (scandal, purchasing power, factions, box-office bonuses). Those effects only apply to tour stops.',
      ),
    ],
    inputs: [
      l('Fãs núcleo, ativos e casuais (o núcleo pesa muito mais).', 'Core, active and casual fans (core weighs far more).'),
      l('Fama do ato e fama regional na cidade ([[mech:fame|fama]]).', 'Act fame and regional fame in the city ([[mech:fame|fame]]).'),
      l('Cena do gênero na cidade e a última vez que o ato tocou lá.', 'The genre scene in the city and the last time the act played there.'),
      l('Qualidade das músicas do setlist e minutos de show.', 'Quality of setlist songs and show length.'),
      l('Produção de palco, equipe, preço do ingresso e tipo de pagamento.', 'Stage production, crew, ticket price and pay deal.'),
      l('Cansaço da banda, clima, vistos e concorrência na agenda.', 'Band fatigue, weather, visas and calendar competition.'),
      l('Agente de shows (booking) libera casas maiores.', 'A booking agent unlocks bigger venues.'),
    ],
    outputs: [
      l('Bilheteria e merch (no caixa do selo em banda própria e contrato 360).', 'Box office and merch (to the label for own bands and 360 deals).'),
      l('Novos fãs: 16% casuais, 5% ativos e 0,7% núcleo do público da turnê.', 'New fans: 16% casual, 5% active and 0.7% core of the tour crowd.'),
      l('Fama, momento e cena local do gênero.', 'Fame, momentum and the local genre scene.'),
      l('Cansaço, moral e experiência de palco dos integrantes.', 'Members\' fatigue, morale and stage experience.'),
      l('Notícias de incidentes e resenhas do show ([[mech:press|imprensa]]).', 'Incident news and show reviews ([[mech:press|press]]).'),
    ],
    rules: [
      l(
        'Casas: bar (até 300 lugares, fama 0), média (1.500, fama 12), teatro (5.000, fama 30), arena (20.000, fama 55) e estádio (80.000, fama 78). Ingresso base de US$ 12, 25, 45, 70 e 95.',
        'Venues: bar (up to 300, fame 0), mid-size (1,500, fame 12), theatre (5,000, fame 30), arena (20,000, fame 55) and stadium (80,000, fame 78). Base ticket $12, 25, 45, 70 and 95.',
      ),
      l(
        'Demanda na cidade: 35% do público do ato na cidade natal, 14% no mesmo mercado, 6% nos seus territórios e 5% no resto; vezes (1 + fama/70) e até +40% pela cena. Voltar antes de 26 semanas rende menos (até 35%).',
        'City demand: 35% of the act\'s audience in the home city, 14% in the same market, 6% in your territories and 5% elsewhere; times (1 + fame/70) and up to +40% from the scene. Returning within 26 weeks yields less (down to 35%).',
      ),
      l(
        'Preço: ingressos vendidos caem com (multiplicador de preço) elevado a 1,2. Produção de palco custa US$ 0, 400, 1.500 ou 6.000 por show e aumenta o público em 0%, 6%, 14% ou 25%.',
        'Price: tickets sold fall with (price multiplier) to the power of 1.2. Stage production costs $0, 400, 1,500 or 6,000 per show and lifts the crowd by 0%, 6%, 14% or 25%.',
      ),
      l(
        'Pagamento da turnê: porta = 65% da bilheteria; cachê fixo = 80% da previsão; misto = 40% da previsão + 45% da bilheteria. Abrir para outro ato paga um cachê fixo pequeno.',
        'Tour pay: door = 65% of the gross; guarantee = 80% of the forecast; versus = 40% of the forecast + 45% of the gross. Opening for another act pays a small flat fee.',
      ),
      l(
        'Show simples: o artista fica com 60% da bilheteria; custos crescem com o tamanho da casa (arena e estádio comem 40–48% da parte do artista). Shows repetidos saturam a praça.',
        'Simple gig: the artist keeps 60% of the gross; costs grow with venue size (arenas and stadiums eat 40–48% of the artist\'s share). Repeated gigs saturate the area.',
      ),
      l(
        'Festival: a faixa sai de fama + rede × 0,4 + agente/8. Acima do prestígio + 5 é headliner; até 25 abaixo, tarde; até 50 abaixo, abertura. Cachê = (250 + fama² × 14) × (1; 0,33; 0,12) × (0,5 + prestígio/100), em dólares de 2020.',
        'Festival: the slot comes from fame + network × 0.4 + agent/8. Above prestige + 5 is headliner; up to 25 below, afternoon; up to 50 below, opening. Fee = (250 + fame² × 14) × (1; 0.33; 0.12) × (0.5 + prestige/100), in 2020 dollars.',
      ),
      l(
        'Show histórico: ato com fama abaixo de 25 que lota (95%+) um teatro ou maior tem 25% de chance de ganhar +20 de momento.',
        'Legendary show: an act under 25 fame that sells out (95%+) a theatre or bigger has a 25% chance of +20 momentum.',
      ),
      l(
        'Cancelar a turnê devolve só metade da logística das datas restantes e tira 4 de profissionalismo do ato.',
        'Cancelling a tour refunds only half the logistics of the remaining dates and costs the act 4 professionalism.',
      ),
    ],
    tips: [
      l('Comece pela cidade natal e pelo mesmo mercado: é onde está a maior fatia do público.', 'Start with the home city and the same market: that is where most of the audience is.'),
      l('Prefira turnê a show simples quando houver bônus de bilheteria: só a turnê os aplica.', 'Prefer a tour over simple gigs when you have box-office bonuses: only tours apply them.'),
      l('Contrate equipe e programe folgas: cansaço aumenta o risco de acidente e derruba a moral.', 'Hire crew and schedule rest days: fatigue raises accident risk and lowers morale.'),
      l('Ingresso caro afasta o fã de comunidade; use preço alto só onde a demanda sobra.', 'Pricey tickets push away community fans; use high prices only where demand overflows.'),
      l('Turnê dobra a venda de merch na banca do show.', 'Touring doubles merch sales at the show stand.'),
    ],
    pages: ['shows', 'tour12', 'live19', 'festivals', 'cal17'],
    see: ['mech:fame', 'mech:money', 'mech:hq', 'glossario:demanda-da-cidade'],
    nums: () => {
      const rows: [ReturnType<typeof l>, string][] = [];
      for (const v of VENUE_TIERS) rows.push([v.name, `${v.cap[1].toLocaleString('pt-BR')} · ${usd(TICKET[v.id] ?? 0)}`]);
      rows.push([l('Produção de palco por show', 'Stage production per show'), PRODUCTION_COST.map(usd).join(' / ')]);
      rows.push([l('Teto suave de bônus de bilheteria (joelho)', 'Soft cap on box-office bonuses (knee)'), `+${pct(MOD_CAP18.showRevenue.knee)}`]);
      return rows;
    },
    docs: ['docs/connect29.md'],
  },

  // ------------------------------------------------------------------------------------------------ fama
  {
    id: 'fame',
    title: l('Fama, fãs e facções', 'Fame, fans and factions'),
    icon: 'fans',
    summary: l(
      'Fama é alcance de longo prazo; fãs são as pessoas por trás dela. Hype é a expectativa de curto prazo. Cada país tem a sua fama.',
      'Fame is long-term reach; fans are the people behind it. Hype is short-term expectation. Every country has its own fame.',
    ),
    what: [
      l(
        'Todo ato tem fama de 0 a 100 e três círculos de fãs: casuais, ativos e núcleo. A fama persegue um alvo calculado a partir dos fãs: sobe rápido quando os fãs crescem e cai devagar quando eles somem.',
        'Every act has fame from 0 to 100 and three fan circles: casual, active and core. Fame chases a target computed from the fans: it rises fast when fans grow and falls slowly when they leave.',
      ),
      l(
        'A fama é regional. No país de origem ela é maior; nos vizinhos de mercado e idioma passa uma parte; no resto do mundo só chega quando o ato fica grande. Paradas, prêmios e shows em um país mexem só na fama dali.',
        'Fame is regional. It is higher in the home country; neighbors sharing market and language get part of it; the rest of the world only notices once the act is big. Charts, awards and shows in a country only move fame there.',
      ),
      l(
        'Os fãs têm motivos (novidade, letras, dança, virtuosismo, identidade, comunidade) que formam facções: puristas, mainstream, colecionadores e comunidade. Cada facção tem humor próprio e reage às suas escolhas. Superfãs compram na estreia; haters crescem com fama e escândalos.',
        'Fans have motives (novelty, lyrics, dance, virtuosity, identity, community) that form factions: purists, mainstream, collectors and community. Each faction has its own mood and reacts to your choices. Superfans buy at launch; haters grow with fame and scandals.',
      ),
    ],
    inputs: [
      l('Vendas (cada unidade traz casuais e alguns ativos) e posição nas paradas.', 'Sales (each unit brings casuals and some actives) and chart position.'),
      l('Shows e turnês ([[mech:live|ao vivo]]).', 'Gigs and tours ([[mech:live|live]]).'),
      l('Entrevistas, TV e agenda de divulgação ([[mech:press|imprensa]]).', 'Interviews, TV and promo schedule ([[mech:press|press]]).'),
      l('Lançamentos recentes (momento) e campanhas de rollout (hype).', 'Recent releases (momentum) and rollout campaigns (hype).'),
      l('Escândalos, morte de integrante, rixas e virais.', 'Scandals, a member\'s death, feuds and virals.'),
      l('Confiança do ato em você e fã-clube organizado (superfãs).', 'The act\'s trust in you and an organized fan club (superfans).'),
    ],
    outputs: [
      l('Apelo dos lançamentos e público dos shows.', 'Release appeal and show attendance.'),
      l('Cachês, adiantamento esperado e interesse de rivais no ato ([[mech:contracts|contratos]]).', 'Fees, expected advance and rival interest in the act ([[mech:contracts|contracts]]).'),
      l('Paparazzi e estresse a partir do degrau Internacional.', 'Paparazzi and stress from the International tier up.'),
      l('O que você vê de outros atos: famosos têm quase tudo público.', 'What you can see of other acts: famous ones have almost everything public.'),
      l('Demanda de merch, edições de luxo e mobilização de fãs.', 'Merch demand, deluxe editions and fan mobilization.'),
    ],
    rules: [
      l(
        'Degraus: Desconhecido (0), Local (10), Nacional (30), Internacional (52), Superstar (72) e Ícone (88).',
        'Tiers: Unknown (0), Local (10), National (30), International (52), Superstar (72) and Icon (88).',
      ),
      l(
        'Alvo mensal de fama = 11 × log10(1 + casuais + ativos × 4 + núcleo × 15) − 24. Por mês a fama anda 6% da distância quando sobe e 2,5% quando cai.',
        'Monthly fame target = 11 × log10(1 + casual + active × 4 + core × 15) − 24. Each month fame moves 6% of the gap when rising and 2.5% when falling.',
      ),
      l(
        'Fãs por mês: casuais ficam com 98,2%; ativos com 99% e ganham 0,4% dos casuais; núcleo fica com 99,7% e ganha 0,6% dos ativos.',
        'Fans per month: casuals keep 98.2%; actives keep 99% and gain 0.4% of casuals; core keeps 99.7% and gains 0.6% of actives.',
      ),
      l(
        'Sem lançar há 3 anos, a fama esfria 0,5% ao mês (ícones só 0,15%). Voltar a lançar depois disso recupera 30% da distância até o pico.',
        'With no release for 3 years, fame cools 0.5% a month (icons only 0.15%). Releasing again after that recovers 30% of the gap to the peak.',
      ),
      l(
        'Fama no país de origem = fama × 1,1 + 3. Fora dele vale uma fatia: mesmo mercado e idioma 60%, só mercado 40%, só idioma 32%, nenhum 12% — e a fatia cresce com o alcance do ato.',
        'Fame in the home country = fame × 1.1 + 3. Abroad it is a share: same market and language 60%, market only 40%, language only 32%, neither 12% — and the share grows with the act\'s reach.',
      ),
      l(
        'Superfãs tendem a 6% do núcleo (12% com fã-clube organizado), ajustados pela confiança. Na estreia dão até +35% de apelo.',
        'Superfans trend to 6% of core (12% with an organized fan club), adjusted by trust. At launch they give up to +35% appeal.',
      ),
      l(
        'Momento cai 6% por mês, +2 se houve disco nas últimas 20 semanas, −1 se não. Hype: o público espera Q = 32 + 0,45 × expectativa. Com expectativa 40+ e disco 6 pontos abaixo, vem a ressaca; expectativa baixa e Q 80+ vira sucesso tardio.',
        'Momentum drops 6% a month, +2 with a record in the last 20 weeks, −1 without. Hype: the public expects Q = 32 + 0.45 × expectation. With expectation 40+ and a record 6 points short, backlash hits; low expectation with Q 80+ becomes a sleeper hit.',
      ),
    ],
    tips: [
      l('Fã núcleo vale 15 casuais no alvo de fama: shows e fã-clube constroem fama que dura.', 'A core fan is worth 15 casuals in the fame target: shows and fan clubs build lasting fame.'),
      l('Não infle o hype de um disco médio: a ressaca tira fama e confiança.', 'Do not pump hype for an average record: the backlash costs fame and trust.'),
      l('Para estourar fora, comece pelos países do mesmo mercado e idioma.', 'To break abroad, start with countries sharing market and language.'),
      l('Segurança paga corta paparazzi e tumultos a partir do degrau Internacional.', 'Paid security cuts paparazzi and mobs from the International tier up.'),
      l('Virada comercial agrada o mainstream e irrita os puristas; decida quem você quer manter.', 'A commercial turn pleases the mainstream and annoys purists; decide whom you want to keep.'),
    ],
    pages: ['artists', 'people', 'charts', 'artist18'],
    see: ['mech:live', 'mech:music', 'mech:press', 'glossario:faccao', 'glossario:superfas', 'glossario:momento'],
    nums: () => {
      const rows: [ReturnType<typeof l>, string][] = [];
      for (const v of VENUE_TIERS) rows.push([l(`Fama mínima: ${v.name.pt}`, `Minimum fame: ${v.name.en}`), `${v.fameMin}+`]);
      rows.push([l('Teto suave de bônus de apelo (joelho)', 'Soft cap on appeal bonuses (knee)'), `+${pct(MOD_CAP18.appeal.knee)}`]);
      rows.push([l('Equipe de rua disponível desde', 'Street team available from'), String(TEAM_FROM18)]);
      return rows;
    },
    docs: ['docs/connect29.md'],
  },

  // ------------------------------------------------------------------------------------------------ reputação
  {
    id: 'reputation',
    title: l('Reputação', 'Reputation'),
    icon: 'medal',
    summary: l(
      'Seu selo tem quatro reputações (artística, comercial, com artistas e institucional) e um prestígio no mercado. Elas abrem portas: ofertas aceitas, crédito no banco, editais e convites.',
      'Your label has four reputations (artistic, commercial, with artists and institutional) and a market standing. They open doors: accepted offers, bank credit, grants and invitations.',
    ),
    what: [
      l(
        'A reputação do jogador tem quatro eixos de 0 a 100. Artística é o respeito da crítica; comercial, a fama de vender; com artistas, como o meio fala de você como parceiro; institucional, a relação com governo, academia e órgãos do setor.',
        'Player reputation has four axes from 0 to 100. Artistic is critics\' respect; commercial, a name for selling; with artists, how the scene talks about you as a partner; institutional, your standing with government, academies and industry bodies.',
      ),
      l(
        'Por cima delas existe o prestígio do selo, recalculado todo mês para você e para cada rival: reconhecimento, popularidade, momento, crédito com a crítica e confiança dos artistas. É ele que aparece no ranking dos selos.',
        'On top of them sits the label standing, recalculated every month for you and every rival: recognition, popularity, momentum, critical standing and artist trust. That is what shows in the label ranking.',
      ),
      l(
        'Os rivais também têm reputação vista pelos artistas: processos contra artistas, CEO que já quebrou selos, dívida e escândalo do fundador descontam o peso deles nas propostas.',
        'Rivals also have a reputation in artists\' eyes: lawsuits against artists, a CEO who broke labels before, debt and a founder scandal discount their pull in offers.',
      ),
    ],
    inputs: [
      l('Lançamentos originais e de nota alta (artística); canal de imprensa ajuda.', 'Original, high-Q releases (artistic); the press channel helps.'),
      l('Nº 1 nas paradas (comercial +3 a cada estreia no topo).', '#1 hits (commercial +3 each time you reach the top).'),
      l('Promessas cumpridas ou quebradas e como você trata os atos (com artistas).', 'Promises kept or broken and how you treat acts (with artists).'),
      l('Jabá descoberto, boicotes e escolhas de época (institucional).', 'Exposed payola, boycotts and era choices (institutional).'),
      l('Decisões de eventos da Mesa (cada opção mostra o efeito).', 'Desk event decisions (each option shows its effect).'),
      l('Prêmios do selo nos últimos 5 anos ([[mech:awards|prêmios]]).', 'Label awards in the last 5 years ([[mech:awards|awards]]).'),
    ],
    outputs: [
      l('Chance de um artista aceitar sua oferta ([[mech:contracts|contratos]]).', 'The chance an artist accepts your offer ([[mech:contracts|contracts]]).'),
      l('Tamanho e juros do empréstimo no banco ([[mech:money|dinheiro]]).', 'Bank loan size and interest ([[mech:money|money]]).'),
      l('Apelo dos lançamentos pela cobertura da mídia (prestígio).', 'Release appeal via media coverage (standing).'),
      l('Editais, academias, câmara municipal e convites sociais (institucional).', 'Grants, academies, city council and social invitations (institutional).'),
      l('Chance de ganhar processos e de a crítica topar matérias.', 'Odds of winning lawsuits and of critics agreeing to features.'),
    ],
    rules: [
      l(
        'Começo padrão: artística 30, comercial 25, com artistas 40, institucional 35 (a origem escolhida no início pode mudar).',
        'Default start: artistic 30, commercial 25, with artists 40, institutional 35 (your chosen origin can change this).',
      ),
      l(
        'A cada lançamento a artística anda (originalidade média + Q − 110, +6 com imprensa) ÷ 40, com retorno decrescente: quanto mais alta, menos sobe; e quanto mais alta, mais cai.',
        'Each release moves artistic by (average originality + Q − 110, +6 with press) ÷ 40, with diminishing returns: the higher it is, the less it rises — and the more it can fall.',
      ),
      l(
        'Promessa quebrada: −3 com artistas (e −18 de confiança do ato). Investigação de jabá: institucional −(4 + calor/5) e comercial −2, além da multa.',
        'Broken promise: −3 with artists (and −18 trust from the act). Payola probe: institutional −(4 + heat/5) and commercial −2, plus the fine.',
      ),
      l(
        'Na oferta, o alcance do selo = territórios/4 + carreiras da sede/24 + comercial/160, com peso de 0,14 a 0,25 conforme a ambição do ato. Com artistas soma (rep − 40)/250. Na prática a comercial pesa pouco: +30 pontos dão só cerca de +2,4% de aceite.',
        'In an offer, label reach = territories/4 + HQ careers/24 + commercial/160, weighted 0.14 to 0.25 by the act\'s ambition. With-artists adds (rep − 40)/250. In practice commercial weighs little: +30 points give only about +2.4% acceptance.',
      ),
      l(
        'Prêmios do selo nos últimos 5 anos viram prestígio: +0,012 por prêmio na chance de aceite, até +0,06.',
        'Label awards in the last 5 years become prestige: +0.012 acceptance per award, up to +0.06.',
      ),
      l(
        'Banco: valor = (US$ 20.000 + (comercial + institucional) × 600 + nível da sede × 30.000), encolhendo 35% por empréstimo aberto; juro base 16% − (comercial + institucional)/1500.',
        'Bank: amount = ($20,000 + (commercial + institutional) × 600 + HQ level × 30,000), shrinking 35% per open loan; base rate 16% − (commercial + institutional)/1500.',
      ),
      l(
        'Prestígio = 35% reconhecimento + 30% popularidade + 15% momento + 10% crítica + 10% confiança. Na oferta ele soma entre −0,03 e +0,06; no apelo, (popularidade − 50)/900 + (momento − 50)/700.',
        'Standing = 35% recognition + 30% popularity + 15% momentum + 10% critics + 10% trust. In offers it adds between −0.03 and +0.06; in appeal, (popularity − 50)/900 + (momentum − 50)/700.',
      ),
      l(
        'Escândalos novos no elenco derrubam reconhecimento (−6), momento (−8) e confiança (−6) do prestígio naquele mês.',
        'New roster scandals cut recognition (−6), momentum (−8) and trust (−6) from the standing that month.',
      ),
    ],
    tips: [
      l('Para contratar, cuide primeiro da reputação com artistas: ela pesa mais que a comercial.', 'To sign acts, care for your with-artists reputation first: it weighs more than commercial.'),
      l('Não prometa o que não pode cumprir; a promessa quebrada custa nas duas pontas.', 'Do not promise what you cannot deliver; a broken promise costs on both ends.'),
      l('Use o canal de imprensa em discos originais para subir a artística.', 'Use the press channel on original records to raise artistic.'),
      l('Antes de pedir crédito, suba comercial e institucional: o banco empresta mais e mais barato.', 'Before borrowing, raise commercial and institutional: the bank lends more and cheaper.'),
    ],
    pages: ['identity', 'company', 'cockpit', 'labels'],
    see: ['mech:contracts', 'mech:awards', 'mech:money', 'mech:underworld', 'glossario:prestigio-do-selo'],
    nums: (s: GameState | null) => {
      const rows: [ReturnType<typeof l>, string][] = [];
      if (s) {
        const r = s.player.reputation;
        rows.push([l('Sua reputação (art./com./artistas/inst.)', 'Your reputation (art./comm./artists/inst.)'), [r.artistic, r.commercial, r.artists, r.institutional].map((x) => Math.round(x)).join(' / ')]);
      }
      rows.push([l('Teto suave da vantagem de oferta (joelho)', 'Soft cap on the offer perk (knee)'), `+${PERK_CAP18.offer}`]);
      rows.push([l('Partes do prestígio', 'Standing parts'), STAND_KEYS.map((k) => STAND_NAME[k].pt).join(', ')]);
      rows.push([l('Jabá: pacote nacional', 'Payola: nationwide package'), usd(PAYOLA_TIERS[PAYOLA_TIERS.length - 1].real)]);
      rows.push([l('Canal de imprensa: custo de alcance', 'Press channel: reach cost'), usd(CHANNELS.find((c) => c.id === 'press')?.reachCost ?? 0)]);
      return rows;
    },
    docs: ['docs/connect29.md', 'docs/econ18.md'],
  },
];

export const TERMS_B: Term29[] = [
  {
    id: 'apelo',
    term: l('Apelo', 'Appeal'),
    def: l(
      'Força de um lançamento na disputa pela atenção do público. É calculado uma vez, na estreia, a partir de qualidade, fama, gênero, cobertura, formato, momento e acaso.',
      'A release\'s strength in the fight for public attention. Computed once, at launch, from quality, fame, genre, coverage, format, momentum and chance.',
    ),
    see: ['mech:music'],
  },
  {
    id: 'nota-q',
    term: l('Nota Q', 'Q grade'),
    def: l(
      'Qualidade de uma faixa (0–100): melodia, letra, execução, produção e originalidade. A nota de um disco mistura a melhor faixa com a média.',
      'A track\'s quality (0–100): melody, lyrics, performance, production and originality. A record\'s grade blends its best track with the average.',
    ),
    see: ['mech:music'],
  },
  {
    id: 'demanda-da-cidade',
    term: l('Demanda da cidade', 'City demand'),
    def: l(
      'Quantas pessoas querem ver o ato numa cidade: fãs que moram ali, fama, cena do gênero e quanto tempo faz desde o último show.',
      'How many people want to see the act in a city: fans living there, fame, genre scene and how long since the last show.',
    ),
    see: ['mech:live'],
  },
  {
    id: 'momento',
    term: l('Momento', 'Momentum'),
    def: l(
      'Embalo de curto prazo do ato (0–100). Sobe com lançamentos e shows, cai 6% por mês e multiplica apelo e vendas semanais.',
      'An act\'s short-term drive (0–100). Rises with releases and shows, drops 6% a month and multiplies appeal and weekly sales.',
    ),
    see: ['mech:fame', 'mech:music'],
  },
  {
    id: 'superfas',
    term: l('Superfãs', 'Superfans'),
    def: l(
      'A parte mais dedicada do núcleo de fãs. Compram na estreia (até +35% de apelo), mas se sentem traídos com facilidade.',
      'The most devoted part of the core fans. They buy at launch (up to +35% appeal) but feel betrayed easily.',
    ),
    see: ['mech:fame'],
  },
  {
    id: 'faccao',
    term: l('Facção de fãs', 'Fan faction'),
    def: l(
      'Grupo de fãs com o mesmo motivo: puristas, mainstream, colecionadores ou comunidade. Cada um tem humor próprio e reage às suas escolhas.',
      'A group of fans sharing a motive: purists, mainstream, collectors or community. Each has its own mood and reacts to your choices.',
    ),
    see: ['mech:fame'],
  },
  {
    id: 'prestigio-do-selo',
    term: l('Prestígio do selo', 'Label standing'),
    def: l(
      'Nota mensal de cada selo: reconhecimento, popularidade, momento, crédito com a crítica e confiança dos artistas. Pesa na mídia e nas ofertas.',
      'Each label\'s monthly score: recognition, popularity, momentum, critical standing and artist trust. It weighs on media and offers.',
    ),
    see: ['mech:reputation'],
  },
  {
    id: 'jaba',
    term: l('Jabá', 'Payola'),
    def: l(
      'Pagar DJs, promotores ou curadores para tocar seu disco. Empurra as vendas por algumas semanas, mas gera calor que pode virar investigação.',
      'Paying DJs, promoters or curators to play your record. Pushes sales for a few weeks but builds heat that can become a probe.',
    ),
    see: ['mech:music', 'mech:reputation'],
  },
];

export const FAQ_B: Faq29[] = [
  {
    id: 'apelo-depois-da-estreia',
    q: l('Contratei um publicitário depois do lançamento. Por que o apelo não mudou?', 'I hired a publicist after the release. Why did the appeal not change?'),
    a: l(
      'O apelo é calculado uma única vez, na estreia. O que chega depois (crítica, sua resenha, jabá, hype) só mexe nas vendas semanais. Prepare tudo antes de lançar.',
      'Appeal is computed only once, at launch. Whatever arrives later (reviews, your review, payola, hype) only affects weekly sales. Prepare everything before releasing.',
    ),
    see: ['mech:music', 'glossario:apelo'],
  },
  {
    id: 'show-simples-sem-bonus',
    q: l('Meu bônus de bilheteria não aparece nos shows. É bug?', 'My box-office bonus does not show up at gigs. Is it a bug?'),
    a: l(
      'Não. O show simples não passa pelos modificadores de show; bônus de bilheteria, escândalo e poder de compra só valem nas paradas de turnê.',
      'No. Simple gigs skip show modifiers; box-office bonuses, scandal and purchasing power only apply to tour stops.',
    ),
    see: ['mech:live'],
  },
  {
    id: 'fama-caindo',
    q: l('Por que a fama do meu ato está caindo sem nenhum escândalo?', 'Why is my act\'s fame falling with no scandal?'),
    a: l(
      'A fama persegue um alvo feito dos fãs. Se os casuais vão embora (eles perdem 1,8% por mês) e nada novo chega, o alvo cai. Três anos sem lançar também esfriam a fama.',
      'Fame chases a target built from fans. If casuals leave (they lose 1.8% a month) and nothing new arrives, the target drops. Three years without releasing also cools fame.',
    ),
    see: ['mech:fame'],
  },
  {
    id: 'reputacao-comercial-ofertas',
    q: l('Vale a pena subir a reputação comercial para contratar artistas?', 'Is raising commercial reputation worth it for signing acts?'),
    a: l(
      'Pouco. Ela pesa só no "alcance do selo" da oferta (+30 pontos dão cerca de +2,4% de aceite). A reputação com artistas, a confiança do ato e os prêmios recentes pesam mais.',
      'Barely. It only weighs on the offer\'s "label reach" (+30 points give about +2.4% acceptance). With-artists reputation, the act\'s trust and recent awards weigh more.',
    ),
    see: ['mech:reputation', 'mech:contracts'],
  },
];

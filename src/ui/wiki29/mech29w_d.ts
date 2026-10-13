// Rodada 29 (WIKI) — artigos de mecânica: mundo/eras, prêmios e legado, história (decisões e ecos), carreiras, modos
// de jogo e como os sistemas se conectam (com as arestas da sonda de mecanismos para o diagrama).
// Conteúdo derivado do código (src/sim/era.ts, data/rules.ts TECHS/FORMATS/ENDINGS/LEGACY_DIMS, culture.ts GEO_EVENTS,
// sys/eras8/eras18, legacy.ts, sys/ceremonies8, sys/rockhall9, awardcal19, sys/awards28, decide18 + sys/decide18,
// sys/echoes18/19, sys/echovar28, sys/story28, director17, narrator13, sys/situations17, sys/quarter28, sys/end28,
// sys/careers12/19, start17.ts, history15.ts, dbsize14.ts, worldpolicy20.ts, ui/ps/presets29model.ts, caps18.ts,
// sys/mech29.ts, scripts/probe29mech.ts) e de docs/connect29.md, docs/cenas29.md, docs/econ18.md.
import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import type { Faq29, MechArt29, Term29 } from './wiki29types';
// constantes reais (lidas em tempo de execução: a wiki acompanha o código). Só módulos que carregam sozinhos no Node:
// eras8, movements9, awards28, story28, quarter28 e careers12 entram em ciclo de import quando carregados isolados —
// os números deles (PIVOT_*, FOUND_COST, CRAFT_START28, ATTN28, BUSY28, cargas das carreiras) ficam citados no texto.
import { formatMoney, nominal } from '../../core/money';
import { ENDINGS, FORMATS, LEGACY_DIMS, TECHS } from '../../data/rules';
import { MOD_CAP18, PERK_CAP18, SMALL18 } from '../../sim/caps18';
import { GEO_EVENTS } from '../../sim/culture';
import { MK_LAG18 } from '../../sim/sys/eras18';
import { legacyTotal } from '../../sim/legacy';
import { CAMPAIGN_COST, GRAMO_START } from '../../sim/sys/ceremonies8';
import { HALL_FIRST_CLASS, HALL_WAIT, LOBBY_COST } from '../../sim/sys/rockhall9';
import { DIR17, FREEDOM17 } from '../../sim/director17';
import { PACES } from '../../sim/narrator13';
import { SITS17_IDS } from '../../sim/sys/sits17';
import { DB_SIZES, dbSizeInfo } from '../../sim/dbsize14';
import { histMode } from '../../sim/history15';
import { PRESETS17, RUN_YEARS17, WORLDS17, worldOf17 } from '../../sim/start17';
import { YEAR_MAX20, YEAR_MIN20 } from '../../sim/worldpolicy20';
import { INSOLVENT_AT } from '../../sim/economy';
import { PRESETS29 } from '../ps/presets29model';

// ---------------------------------------------------------------- formatação
/** valor em dólares reais (2020): nominal do ano quando há partida, senão o valor de referência */
const real = (s: GameState | null, x: number): string => (s ? formatMoney(nominal(x, s.year)) : `US$ ${x.toLocaleString('pt-BR')} (2020)`);
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const same = (t: string): L => l(t, t);

// ---------------------------------------------------------------- arestas da sonda (diagrama)
export type EdgeState29 = 'ok' | 'weak' | 'fixed' | 'intended';
/** Arestas medidas por scripts/probe29mech.ts (docs/connect29.md §4). from/to = ids de artigo de mecânica.
 *  'fixed' = estava morta e foi ligada na r29; 'weak' = ainda fraca (< 3%); 'ok' = conectada; 'intended' = de propósito. */
export const EDGES29W: { id: string; from: string; to: string; label: L; state: EdgeState29 }[] = [
  { id: 'E1a', from: 'press', to: 'music', state: 'intended', label: l('Escândalo (gênero rebelde) → vendas +6% (efeito Streisand)', 'Scandal (rebel genre) → sales +6% (Streisand effect)') },
  { id: 'E1b', from: 'press', to: 'live', state: 'ok', label: l('Escândalo → público e bilheteria −9,7%', 'Scandal → crowd and box office −9.7%') },
  { id: 'E1c', from: 'press', to: 'music', state: 'weak', label: l('Escândalo (rebelde) → apelo do próximo disco +1,7%', 'Scandal (rebel) → next record appeal +1.7%') },
  { id: 'E1d', from: 'press', to: 'music', state: 'ok', label: l('Escândalo (não rebelde) → vendas −5%', 'Scandal (non-rebel) → sales −5%') },
  { id: 'E1e', from: 'press', to: 'music', state: 'fixed', label: l('Escândalo (não rebelde) → apelo do próximo disco −14,8%', 'Scandal (non-rebel) → next record appeal −14.8%') },
  { id: 'E2', from: 'press', to: 'music', state: 'ok', label: l('Jabá → vendas semanais +28%', 'Payola → weekly sales +28%') },
  { id: 'E3', from: 'hq', to: 'music', state: 'ok', label: l('Publicitário melhor → alcance do marketing +7,2%', 'Better publicist → marketing reach +7.2%') },
  { id: 'E3b', from: 'hq', to: 'music', state: 'ok', label: l('Produtor melhor → nota da gravação +6,2%', 'Better producer → recording score +6.2%') },
  { id: 'E4a', from: 'hq', to: 'music', state: 'fixed', label: l('Sede: Marketing e promoção → apelo +9%', 'HQ: Marketing & promotion → appeal +9%') },
  { id: 'E4b', from: 'hq', to: 'live', state: 'fixed', label: l('Sede: Agência de shows → bilheteria +15%', 'HQ: Booking agency → box office +15%') },
  { id: 'E4c', from: 'hq', to: 'music', state: 'fixed', label: l('Sede: Digital e dados → vendas semanais +12%', 'HQ: Digital & data → weekly sales +12%') },
  { id: 'E4d', from: 'hq', to: 'music', state: 'weak', label: l('Sede: Estúdio interno → nota da gravação +1,6%', 'HQ: In-house studio → recording score +1.6%') },
  { id: 'E5', from: 'fame', to: 'live', state: 'ok', label: l('Fãs núcleo → procura na cidade +16%', 'Core fans → city demand +16%') },
  { id: 'E6', from: 'awards', to: 'contracts', state: 'fixed', label: l('Prêmios do selo → aceite de oferta +10%', 'Label awards → offer acceptance +10%') },
  { id: 'E7', from: 'life', to: 'music', state: 'ok', label: l('Estresse → modificador de qualidade da faixa −6%', 'Stress → track quality modifier −6%') },
  { id: 'E7b', from: 'life', to: 'music', state: 'fixed', label: l('Estresse → nota real da gravação −6%', 'Stress → actual recording score −6%') },
  { id: 'E8', from: 'world', to: 'money', state: 'ok', label: l('Guerra/crise → tamanho do mercado −30%', 'War/crisis → market size −30%') },
  { id: 'E10', from: 'reputation', to: 'contracts', state: 'ok', label: l('Confiança do artista → chance de renovar +33%', 'Act trust → renewal chance +33%') },
  { id: 'E11a', from: 'reputation', to: 'contracts', state: 'weak', label: l('Reputação comercial → aceite de oferta +2,4%', 'Commercial reputation → offer acceptance +2.4%') },
  { id: 'E11b', from: 'reputation', to: 'contracts', state: 'ok', label: l('Reputação artística → aceite de oferta +3,3%', 'Artistic reputation → offer acceptance +3.3%') },
  { id: 'E12', from: 'fame', to: 'music', state: 'ok', label: l('Momento da carreira → apelo +17%', 'Career momentum → appeal +17%') },
  { id: 'E14', from: 'world', to: 'live', state: 'ok', label: l('Cena da cidade → procura +26%', 'City scene → demand +26%') },
  { id: 'E16', from: 'press', to: 'music', state: 'fixed', label: l('Sua resenha (crítico) → vendas semanais +10%', 'Your review (critic) → weekly sales +10%') },
];

// ---------------------------------------------------------------- artigos
export const MECH_D: MechArt29[] = [
  // ============================================================ MUNDO
  {
    id: 'world', icon: 'globe',
    title: l('Mundo, eras, tecnologia e política', 'World, eras, technology and politics'),
    summary: l('O mundo muda sozinho: tecnologias chegam em datas, formatos nascem e morrem, guerras e crises encolhem o mercado e cenas fervem em cidades.', 'The world changes on its own: technologies arrive on dates, formats rise and die, wars and crises shrink the market and scenes boil in cities.'),
    what: [
      l('Cada partida tem um calendário de tecnologias (rádio, LP, cassete, CD, internet, streaming…). Quando uma chega, ela libera formatos, canais de marketing e recursos que você precisa comprar antes de usar.', 'Every run has a technology calendar (radio, LP, cassette, CD, internet, streaming…). When one arrives it unlocks formats, marketing channels and features you must buy before using.'),
      l('Cada virada tecnológica abre uma era de negócio. Nela você escolhe uma postura (por exemplo, apostar na faixa forte ou na obra completa) com efeitos duradouros. Os rivais também escolhem. Posturas antigas continuam valendo, mas pesam menos a cada era.', 'Each tech shift opens a business era. You pick a stance (for example, bet on the strong single or on the full album) with lasting effects. Rivals pick too. Old stances still count, but weigh less with each new era.'),
      l('Guerras, ditaduras, embargos e crises mexem no consumo, nas turnês e no custo de fabricação. Regimes podem censurar seus discos. Cenas e movimentos nascem em cidades e se espalham.', 'Wars, dictatorships, embargoes and crises move spending, tours and manufacturing cost. Regimes may censor your records. Scenes and movements are born in cities and spread.'),
      l('Com nomes reais, a história real da música entra na partida: artistas reais estreiam perto do ano real, cenas reais esquentam na janela certa e marcos históricos viram decisões. Quanto disso é roteiro fixo depende do [[mech:modes|modo de jogo]].', 'With real names, real music history enters the run: real acts debut near their real year, real scenes heat up in the right window and milestones become decisions. How much of it is a fixed script depends on the [[mech:modes|game mode]].'),
    ],
    inputs: [
      l('O modo de mundo: no modo exato as tecnologias chegam na data base; nos outros a data varia.', 'The world mode: in exact mode technologies arrive on the base date; in the others the date varies.'),
      l('Mutadores do Novo Jogo (streaming precoce, vozes sintéticas precoces).', 'New Game mutators (early streaming, early synthetic voices).'),
      l('O ano e o mercado: cada região adota o digital com atraso próprio.', 'The year and the market: each region adopts digital with its own delay.'),
      l('Seus hits e turnês: um top 10 seu pode plantar uma cena na cidade do ato.', 'Your hits and tours: one of your top 10s can plant a scene in the act city.'),
      l('O gênero dos seus atos (censores e públicos reagem diferente a cada estilo).', 'Your acts genre (censors and audiences react differently to each style).'),
    ],
    outputs: [
      l('Formatos disponíveis, receita por unidade e custo de fabricação ([[mech:money]]).', 'Available formats, revenue per unit and manufacturing cost ([[mech:money]]).'),
      l('Tamanho do mercado semanal: guerras e crises cortam o consumo de música.', 'Weekly market size: wars and crises cut music spending.'),
      l('Shows e turnês podem ser suspensos num mercado em guerra ou pandemia ([[mech:live]]).', 'Shows and tours can be suspended in a market at war or in a pandemic ([[mech:live]]).'),
      l('Procura por ingressos na cidade (cena forte = mais público).', 'Ticket demand in the city (strong scene = bigger crowds).'),
      l('Censura, exílio e "calor" do regime sobre seus artistas.', 'Censorship, exile and regime "heat" on your acts.'),
    ],
    rules: [
      l('Cada tecnologia tem ano base e dependências: ela nunca chega antes do ano seguinte ao da tecnologia de que depende. No modo livre a data varia até ± a amplitude da tecnologia; no caos, até o dobro.', 'Each technology has a base year and dependencies: it never arrives before the year after the tech it depends on. In free mode the date varies up to ± the tech spread; in chaos, up to double.'),
      l('A rede de clipes pode não existir: ela surge sempre no modo histórico, com 85% de chance no livre e 60% no caos. No histórico o CD domina os anos 80; fora dele há 25% de chance de ser o cassete.', 'The music video network may never exist: it always appears in historic mode, with 85% chance in free and 60% in chaos. In historic the CD rules the 80s; outside it there is a 25% chance it is the cassette.'),
      l('Crise mundial: o consumo total é multiplicado por 1 − (1 − efeito) × (mercados atingidos ÷ 7). Um evento que atinge todos os 7 mercados vale inteiro.', 'World crisis: total spending is multiplied by 1 − (1 − effect) × (markets hit ÷ 7). An event that hits all 7 markets counts in full.'),
      l('Atraso digital por região (MK_LAG18): América do Norte 0, Europa/Ásia/Oceania +1 ano, Brasil e América Latina +3, África +5. A fatia física de um disco é a média dos seus mercados.', 'Digital delay per region (MK_LAG18): North America 0, Europe/Asia/Oceania +1 year, Brazil and Latin America +3, Africa +5. A record physical share is the average of its markets.'),
      l('Trocar de postura no meio de uma era (pivô) custa dinheiro e reputação comercial e exige 26 semanas desde a última troca (PIVOT_WEEKS).', 'Changing stance mid-era (a pivot) costs money and commercial reputation and needs 26 weeks since the last change (PIVOT_WEEKS).'),
      l('Fundar um movimento com seus atos custa US$ 8.000 (FOUND_COST); a chance de pegar depende do momento cultural, da crítica, da cidade, das obras e dos aliados.', 'Founding a movement with your acts costs US$ 8,000 (FOUND_COST); the chance it catches on depends on the cultural moment, critics, the city, the works and your allies.'),
      l('De 2027 a 2040 o futuro é especulativo: cada partida sorteia um caminho (vozes sintéticas reguladas ou soltas, interface neural de massa ou de nicho), e ele só aparece quando o ano chega.', 'From 2027 to 2040 the future is speculative: each run rolls a path (regulated or free synthetic voices, mass or niche neural interface), and it only shows when the year comes.'),
    ],
    tips: [
      l('Olhe a aba de tecnologias antes de planejar um disco grande: lançar no formato que está morrendo custa caro.', 'Check the technology tab before planning a big record: releasing on a dying format is expensive.'),
      l('Na virada de era, a postura vale anos. Escolha pensando no seu elenco, não só na moda.', 'At an era shift the stance lasts years. Choose for your roster, not just the trend.'),
      l('Em guerra ou crise, segure turnês internacionais e foque nos mercados poupados.', 'In war or crisis, hold international tours and focus on spared markets.'),
      l('Contrate atos da cidade onde uma cena está fervendo: eles atraem mais público enquanto ela dura.', 'Sign acts from the city where a scene is boiling: they draw bigger crowds while it lasts.'),
    ],
    pages: ['mundo27', 'world', 'world17', 'regions18', 'regions19', 'movements', 'society18', 'news17', 'scenes17'],
    see: ['mech:modes', 'mech:money', 'mech:live', 'mech:connections', 'glossario:postura-de-era'],
    nums: (s) => [
      [l('Tecnologias no calendário', 'Technologies on the calendar'), String(TECHS.length)],
      [l('Formatos de disco', 'Record formats'), String(FORMATS.length)],
      [l('Crises e guerras registradas', 'Registered crises and wars'), String(GEO_EVENTS.length)],
      [l('Atraso digital da África (anos)', 'Africa digital delay (years)'), String(MK_LAG18.africa)],
      [l('Crises ativas neste ano', 'Crises active this year'), s ? String(GEO_EVENTS.filter((g) => s.year >= g.from && s.year <= g.to).length) : '—'],
      [l('Consumo mundial (guerras e crises)', 'World spending (wars and crises)'), s ? `× ${(s.flags.geoDemand ?? 1).toFixed(2)}` : '—'],
      [l('Tecnologias já chegadas', 'Technologies already arrived'), s ? String(Object.values(s.techDates ?? {}).filter((y) => y <= s.year).length) : '—'],
    ],
    docs: ['docs/econ18.md', 'docs/connect29.md'],
  },

  // ============================================================ PRÊMIOS E LEGADO
  {
    id: 'awards', icon: 'trophy',
    title: l('Prêmios e legado', 'Awards and legacy'),
    summary: l('Gramófonos, prêmios da crítica, regionais e do ofício, Hall da Fama, relíquias e o legado em 7 dimensões que decide o seu final.', 'Gramophones, critics, regional and craft awards, the Hall of Fame, relics and the 7-dimension legacy that decides your ending.'),
    what: [
      l('Cada premiação tem ano de fundação e mês de cerimônia. Antes de fundada, ela não existe. Os Gramófonos de Ouro anunciam indicados em novembro e premiam em fevereiro do ano seguinte, com categorias de gravação, álbum, revelação e performance.', 'Each award has a founding year and ceremony month. Before it is founded it does not exist. The Golden Gramophones announce nominees in November and award in February of the next year, with record, album, new artist and performance categories.'),
      l('Os prêmios leem as dimensões de qualidade do disco: álbum pesa coesão e durabilidade; revelação pesa originalidade e emoção. Os Prêmios do Ofício dão um troféu por dimensão (produção, originalidade, emoção, álbum coeso) em dezembro.', 'Awards read the record quality dimensions: album weighs cohesion and durability; new artist weighs originality and emotion. The Craft Awards give one trophy per dimension (production, originality, emotion, cohesive album) in December.'),
      l('O Hall da Fama recebe artistas 25 anos depois da estreia. Entrar transforma o ato em lenda e traz fama, fãs e momento. Relíquias (guitarras, fitas, letras, troféus) nascem dos fatos da partida e valem mais quanto maior o legado do artista.', 'The Hall of Fame takes acts 25 years after their debut. Getting in turns the act into a legend and brings fame, fans and momentum. Relics (guitars, tapes, lyrics, trophies) are born from run events and are worth more the bigger the act legacy.'),
      l('Seu legado tem 7 dimensões. Elas somam a pontuação de legado e decidem qual final a sua história ganha.', 'Your legacy has 7 dimensions. They add up to the legacy score and decide which ending your story gets.'),
    ],
    inputs: [
      l('Qualidade e vendas dos seus lançamentos do ano ([[mech:music]]).', 'Quality and sales of your releases that year ([[mech:music]]).'),
      l('Campanhas "para sua consideração" e lobby junto aos votantes.', '"For your consideration" campaigns and lobbying the voters.'),
      l('Gosto dos votantes por época e fadiga de quem já ganhou muito.', 'Voters taste by era and fatigue for those who already won a lot.'),
      l('Receita, número 1, prêmios, reputação, atos desenvolvidos, lendas, fatia de mercado, territórios, sede, reedições.', 'Revenue, number ones, awards, reputation, developed acts, legends, market share, territories, HQ, reissues.'),
      l('Escolhas da era neural (consentimento de voz, atos sintéticos, foco humano) para os finais.', 'Neural-era choices (voice consent, synthetic acts, human focus) for the endings.'),
    ],
    outputs: [
      l('Prestígio nas negociações: prêmios recentes do selo ajudam a fechar contratos ([[mech:contracts]]).', 'Prestige in negotiations: recent label awards help close deals ([[mech:contracts]]).'),
      l('Reputação artística (Prêmios do Ofício) e institucional ([[mech:reputation]]).', 'Artistic reputation (Craft Awards) and institutional reputation ([[mech:reputation]]).'),
      l('Fama, fãs e momento do ato no Hall da Fama e na cerimônia.', 'Act fame, fans and momentum at the Hall of Fame and the ceremony.'),
      l('Valor das relíquias e do catálogo de lendas.', 'Value of relics and of legends catalogs.'),
      l('O final da partida e o epitáfio do storyboard ([[mech:story]]).', 'The run ending and the storyboard epitaph ([[mech:story]]).'),
    ],
    rules: [
      l('Relíquias procedurais (R29): o catálogo real (107 peças) vira 23 arquétipos — guitarra com nome, instrumento quebrado, figurino, letra manuscrita, fita master, piano do hit, microfone da sessão, mesa de som, estatueta, última carta, primeiro contrato, cartaz, credencial e jaqueta de turnê, pele do bumbo, objeto autografado, peça chamuscada, placa do estúdio… Qualquer artista pode ganhar versões novas a partir de 16 tipos de fato (show, parada, obra-prima, sessão, prêmio, morte, separação, assinatura, escândalo, fim de turnê, aposentadoria, tumulto, desastre, show beneficente, venda do selo, relançamento), com nome no estilo real ("A letra de \'Stay\' em papel de hotel"), história, estado, procedência e valor pela época. Limites: 4 por ano, 1 por artista por ano, 30 vivas. O valor dispara com a morte, sobe com volta, revival e aniversário e oscila com escândalos; falsificações aparecem no mercado negro e caem na autenticação. No modo exato nunca contradizem as relíquias documentadas.', 'Procedural relics (R29): the real catalog (107 pieces) becomes 23 archetypes — named guitar, smashed instrument, stage outfit, handwritten lyrics, master tape, the hit\'s piano, session mic, studio console, award statue, last letter, first contract, poster, tour pass and jacket, logo drum head, signed object, charred piece, studio sign… Any act can get new versions from 16 fact kinds (show, chart, masterwork, session, award, death, split, signing, scandal, tour end, retirement, crowd incident, disaster, charity show, label sale, reissue), with a real-style name ("The \'Stay\' lyrics on hotel paper"), story, condition, provenance and era-scaled value. Caps: 4 a year, 1 per act a year, 30 alive. Value jumps on death, rises with comebacks, revivals and anniversaries and swings with scandals; forgeries show up on the black market and fall at authentication. In exact mode they never contradict documented relics.'),
      l('Campanha nos Gramófonos: 3 tamanhos (CAMPAIGN_COST, em dólares de 2020 corrigidos pelo ano). A maior tem 15% de chance de virar notícia de "compra de prêmio" (−3 de reputação artística).', 'Gramophone campaign: 3 sizes (CAMPAIGN_COST, in 2020 dollars adjusted by year). The biggest has a 15% chance of becoming an "award-buying" story (−3 artistic reputation).'),
      l('Hall da Fama: primeira turma em 1986, elegível 25 anos após a estreia (HALL_WAIT). Ao entrar: fama + 6 × (1 − fama/130), momento +18 e 3.000 + fama × 400 fãs casuais. Lobby nível 3 tem 30% de chance de pegar mal.', 'Hall of Fame: first class in 1986, eligible 25 years after debut (HALL_WAIT). On induction: fame + 6 × (1 − fame/130), momentum +18 and 3,000 + fame × 400 casual fans. Level 3 lobbying has a 30% chance to backfire.'),
      l('Prêmios do Ofício (desde 1959): o vencedor é o lançamento com a maior nota na dimensão, entre os 80 que mais venderam. Ganhar dá +1,5 de reputação artística ao selo.', 'Craft Awards (since 1959): the winner is the release with the top score in that dimension, among the 80 best sellers. Winning gives the label +1.5 artistic reputation.'),
      l('Prestígio: cada prêmio do selo nos últimos 5 anos soma +0,012 na chance de aceite de ofertas, até +0,06.', 'Prestige: each label award in the last 5 years adds +0.012 to offer acceptance, up to +0.06.'),
      l('Legado cultural = nº 1 × 5 + prêmios × 6 + reputação artística × 0,4 (+12 com movimento), até 100. Artistas = atos desenvolvidos × 7 + lendas × 10 + reputação com artistas × 0,35 − saídas infelizes × 3.', 'Cultural legacy = number ones × 5 + awards × 6 + artistic reputation × 0.4 (+12 with a movement), up to 100. Artists = developed acts × 7 + legends × 10 + reputation with artists × 0.35 − unhappy exits × 3.'),
      l('Legado de indústria = fatia de mercado × 250 + territórios × 4 + nível da sede × 6. Catálogo = discos com mais de 100 mil unidades × 4 + reedições × 2 + lançamentos × 0,3.', 'Industry legacy = market share × 250 + territories × 4 + HQ level × 6. Catalog = records over 100k units × 4 + reissues × 2 + releases × 0.3.'),
      l('O final é o de maior pontuação no fim do arco (2040) ou o forçado por insolvência, conselho ou falta de herdeiros.', 'The ending is the top-scoring one at the end of the arc (2040) or the one forced by insolvency, the board or lack of heirs.'),
    ],
    tips: [
      l('Campanha média costuma bastar; a grande só vale para um favorito de verdade.', 'A medium campaign is usually enough; the big one only pays for a real favorite.'),
      l('Discos coesos e originais ganham prêmios mesmo sem vender o máximo.', 'Cohesive, original records win awards even without top sales.'),
      l('Aceite tocar na cerimônia do Hall: rende fama e fãs ativos.', 'Accept playing the Hall ceremony: it brings fame and active fans.'),
      l('Acompanhe o "Rumo a" no Cockpit: ele mostra o final mais provável hoje.', 'Watch "Heading to" in the Cockpit: it shows the most likely ending today.'),
    ],
    pages: ['awards', 'rockhall', 'lendas', 'tribute19', 'goals', 'cockpit'],
    see: ['mech:reputation', 'mech:contracts', 'mech:story', 'glossario:legado'],
    nums: (s) => [
      [l('Primeira cerimônia dos Gramófonos', 'First Gramophone ceremony'), String(GRAMO_START)],
      [l('Campanha (pequena / média / grande)', 'Campaign (small / medium / big)'), CAMPAIGN_COST.map((x) => real(s, x)).join(' / ')],
      [l('Hall da Fama: espera após a estreia', 'Hall of Fame: wait after debut'), `${HALL_WAIT} anos`],
      [l('Hall da Fama: primeira turma', 'Hall of Fame: first class'), String(HALL_FIRST_CLASS)],
      [l('Lobby no Hall (nível 3)', 'Hall lobbying (level 3)'), real(s, LOBBY_COST[3])],
      [l('Dimensões de legado / finais', 'Legacy dimensions / endings'), `${LEGACY_DIMS.length} / ${ENDINGS.length}`],
      [l('Seu legado total', 'Your total legacy'), s ? String(legacyTotal(s)) : '—'],
    ],
    docs: ['docs/connect29.md'],
  },

  // ============================================================ HISTÓRIA
  {
    id: 'story', icon: 'book',
    title: l('História: decisões, ecos, cenas e capítulos', 'Story: decisions, echoes, scenes and chapters'),
    summary: l('Suas escolhas têm efeito agora e depois. O narrador dosa o drama, as cenas mostram os grandes momentos e o fim vira um storyboard da sua partida.', 'Your choices have effects now and later. The narrator doses the drama, scenes show the big moments and the end becomes a storyboard of your run.'),
    what: [
      l('Decisões chegam como cartões na mesa ou mensagens na Caixa. Algumas têm prazo (vencem na semana), várias etapas, apostas com chance visível ou opções travadas por traço, habilidade ou relação.', 'Decisions arrive as cards on the desk or Inbox messages. Some have deadlines (due this week), several steps, bets with visible odds or options locked by trait, skill or relationship.'),
      l('Quase toda escolha pode deixar um [[glossario:eco]]: uma consequência que volta semanas ou meses depois, no mesmo fio da decisão original. A promessa cumprida rende; a mentira vem à tona.', 'Almost every choice can leave an [[glossario:eco|echo]]: a consequence that returns weeks or months later, in the same thread as the original decision. A kept promise pays; a lie comes out.'),
      l('O narrador escolhido no Novo Jogo é o diretor criativo: decide quantos eventos chegam, o tom (bom ou ruim) e quanta liberdade os NPCs têm para mudar o mundo. Situações (burnout, luto, chantagem, rixa…) acontecem com NPCs e com você.', 'The narrator chosen in New Game is the creative director: it decides how many events arrive, the tone (good or bad) and how much freedom NPCs have to change the world. Situations (burnout, grief, blackmail, feud…) happen to NPCs and to you.'),
      l('Grandes momentos viram cenas animadas com escolhas. Tudo vai para o Álbum de cenas e para o Diário do selo. No fim, o storyboard junta cenas, as maiores cadeias de ecos, capítulos por década e o epitáfio.', 'Big moments become animated scenes with choices. Everything goes to the Scene album and the label Diary. At the end, the storyboard gathers scenes, the biggest echo chains, chapters per decade and the epitaph.'),
    ],
    inputs: [
      l('O narrador (ritmo, ondas de tensão, peso de crises e boas notícias) e a liberdade do diretor.', 'The narrator (pace, tension waves, weight of crises and good news) and director freedom.'),
      l('Fatos da simulação: escândalos, prisões, mortes, contratos, lançamentos, prêmios.', 'Simulation facts: scandals, arrests, deaths, contracts, releases, awards.'),
      l('Pressão acumulada: estresse, obrigações, caixa ([[mech:life]], [[mech:money]]).', 'Accumulated pressure: stress, obligations, cash ([[mech:life]], [[mech:money]]).'),
      l('Seus traços, habilidades e relações (abrem ou travam opções).', 'Your traits, skills and relationships (unlock or lock options).'),
      l('Quanto você delegou: frentes delegadas abrem menos fios ao mesmo tempo.', 'How much you delegated: delegated fronts open fewer threads at once.'),
    ],
    outputs: [
      l('Efeitos imediatos e ecos atrasados em caixa, fãs, reputação, humor e relações.', 'Immediate effects and delayed echoes on cash, fans, reputation, mood and relationships.'),
      l('Fatos públicos (boatos, manchetes) que outros sistemas leem ([[mech:press]]).', 'Public facts (rumors, headlines) other systems read ([[mech:press]]).'),
      l('Diário do selo, Álbum de cenas e fotos icônicas colecionáveis.', 'Label diary, Scene album and collectible iconic photos.'),
      l('Capítulos, biografia, ano em revista e o storyboard final.', 'Chapters, biography, year in review and the final storyboard.'),
    ],
    rules: [
      l('Orçamento de atenção (ATTN28): no máximo 2 cenas que interrompem por avanço e 3 por mês; decisões com consequência sempre passam. Até 3 dicas de primeira vez por mês e 2 fatos do mundo por mês em "Só marcantes".', 'Attention budget (ATTN28): at most 2 interrupting scenes per advance and 3 per month; decisions with consequences always get through. Up to 3 first-time tips per month and 2 world facts per month in "Highlights only".'),
      l('Eventos não se repetem demais: o peso cai × 0,85 por vez que saíram nos últimos 10 anos, e o mesmo ator espera pelo menos 12 meses para o mesmo evento.', 'Events do not repeat too much: weight drops × 0.85 per time they fired in the last 10 years, and the same actor waits at least 12 months for the same event.'),
      l('Cenas "Você escolheu X" (eco que volta) ficam a pelo menos 10 semanas uma da outra.', '"You chose X" scenes (returning echo) stay at least 10 weeks apart.'),
      l('Situações: um orçamento de drama mensal por narrador; quem foi protagonista ganha calma (13 semanas se for seu, 26 se for NPC). Machuca, mas não mata.', 'Situations: a monthly drama budget per narrator; whoever was the protagonist gets calm (13 weeks if yours, 26 if an NPC). It hurts, but does not kill.'),
      l('Eco padrão em dinheiro: piso de US$ 650 × (0,7 + fama/80), escalando com 2% da receita anual, com teto de 8% da receita e 12× o piso.', 'Default money echo: floor of US$ 650 × (0.7 + fame/80), scaling with 2% of annual revenue, capped at 8% of revenue and 12× the floor.'),
      l('Trimestre vazio: o Mestre põe na mesa uma decisão com peso (contrato do seu principal artista vencendo, ou o foco dele). Trimestre com 14 decisões ou mais (BUSY28) abre menos fios no seguinte.', 'Empty quarter: the Master puts one weighty decision on the desk (your top act contract expiring, or their focus). A quarter with 14 decisions or more (BUSY28) opens fewer threads in the next.'),
      l('Cada cena animada tem 2 ou 3 escolhas com efeito real. As preferências são: todas, só importantes ou desligadas.', 'Each animated scene has 2 or 3 choices with real effects. Preferences are: all, important only or off.'),
    ],
    tips: [
      l('Leia a dica sem spoiler do cartão: ela avisa que algo pode voltar.', 'Read the spoiler-free hint on the card: it warns something may come back.'),
      l('Prefira promessas que você consegue cumprir; o eco de promessa quebrada pesa.', 'Prefer promises you can keep; the broken-promise echo hurts.'),
      l('Se o drama estiver demais, delegue frentes: o Mestre abre menos fios.', 'If there is too much drama, delegate fronts: the Master opens fewer threads.'),
      l('Reveja as cenas no Álbum; o storyboard do fim usa tudo o que disparou.', 'Rewatch scenes in the Album; the end storyboard uses everything that fired.'),
    ],
    pages: ['you', 'scenes17', 'diary', 'cockpit', 'dm18', 'agenda17'],
    see: ['mech:press', 'mech:life', 'mech:awards', 'mech:modes', 'glossario:eco', 'glossario:orcamento-de-atencao'],
    nums: (s) => {
      const d = s ? DIR17[s.config.storyteller] : undefined;
      return [
        [l('Situações-semente do diretor', 'Director seed situations'), String(SITS17_IDS.length)],
        [l('Ritmo do Tabloide (eventos)', 'Tabloid pace (events)'), `× ${PACES.tabloide.freq}`],
        [l('Peso das crises no Tabloide', 'Tabloid crisis weight'), `× ${PACES.tabloide.bad}`],
        [l('Teto de situações entre NPCs (Tabloide)', 'NPC situation cap (Tabloid)'), String(DIR17.tabloide.npc)],
        [l('Narradores disponíveis', 'Available narrators'), String(Object.keys(DIR17).length)],
        [l('Drama do seu narrador', 'Your narrator drama'), d ? `× ${d.drama}` : '—'],
        [l('Ritmo do seu narrador', 'Your narrator pace'), s ? `× ${(PACES[s.config.storyteller] ?? PACES.maestro).freq}` : '—'],
      ];
    },
    docs: ['docs/cenas29.md'],
  },

  // ============================================================ CARREIRAS
  {
    id: 'careers', icon: 'briefcase',
    title: l('Carreiras (todas as 12)', 'Careers (all 12)'),
    summary: l('Você pode ser gravadora, músico, empresário, agente, dono de festival, de casa de shows, de estúdio, editor, dono de mídia, de plataforma, compositor de trilhas e crítico, várias ao mesmo tempo.', 'You can be a label, musician, manager, agent, festival owner, venue owner, studio owner, publisher, media owner, platform owner, screen composer and critic, several at once.'),
    what: [
      l('As 12 carreiras: Gravadora (contratar, gravar, lançar), Músico (sua banda no palco e no estúdio), Empresário (representa artistas de qualquer selo), Agente e promotor (turnês e comissão sobre cachês), Dono de festival (data, line-up, ingresso), Casa de shows (palco próprio, bar, cena local).', 'The 12 careers: Label (sign, record, release), Musician (your band on stage and in the studio), Manager (represents acts from any label), Agent & promoter (tours and a cut of fees), Festival owner (date, line-up, tickets), Venue owner (your own stage, bar, local scene).'),
      l('E também: Estúdio e produtor (equipamento, som da casa, sessões), Editora musical (compositores, catálogo, sincronização), Dono de mídia (revista, rádio, TV), Plataforma (streaming, assinantes e repasse, desde 2005), Trilhas e palco (cinema, TV, musicais, jogos) e Jornalismo (resenhas que mexem nas vendas, furos e seu próprio veículo).', 'Also: Studio & producer (gear, house sound, sessions), Music publisher (songwriters, catalog, sync), Media owner (magazine, radio, TV), Platform (streaming, subscribers and payouts, since 2005), Screen & stage (film, TV, musicals, games) and Journalism (reviews that move sales, scoops and your own outlet).'),
      l('No Novo Jogo você escolhe as carreiras principais, uma origem profissional e uma ambição. Cada carreira principal ganha um pacote inicial (festival "edição 0", editora com 5 obras, sala de estúdio alugada, fanzine…). O que faltar no caixa vira crédito de fundação em 36 parcelas.', 'In New Game you choose main careers, a professional origin and an ambition. Each main career gets a starter pack (festival "edition 0", publisher with 5 works, rented studio room, fanzine…). What cash cannot cover becomes a founding loan in 36 installments.'),
      l('Cada carreira tem sua página própria. No meio da partida você pode começar ou largar carreiras, mas o tempo é finito: carreiras demais estressam.', 'Each career has its own page. Mid-run you can start or drop careers, but time is finite: too many careers cause stress.'),
    ],
    inputs: [
      l('O ano: cada carreira só existe a partir de uma data (festival desde 1950, agente desde 1930, estúdio desde 1920, plataforma desde 2005).', 'The year: each career only exists from a date (festival since 1950, agent since 1930, studio since 1920, platform since 2005).'),
      l('Sua origem profissional (atributos, contatos e vantagens para a partida toda).', 'Your professional origin (attributes, contacts and perks for the whole run).'),
      l('Sua ambição: satisfeita ou frustrada a cada ano.', 'Your ambition: fulfilled or frustrated each year.'),
      l('O herdeiro: a nova geração pode querer outras carreiras.', 'The heir: the new generation may want other careers.'),
    ],
    outputs: [
      l('Carga de agenda e estresse do dono ([[mech:life]]).', 'Schedule load and owner stress ([[mech:life]]).'),
      l('O papel: só músico = artista; selo + músico = híbrido; o resto = empresa.', 'The role: musician only = artist; label + musician = hybrid; the rest = company.'),
      l('Aluguel da sede de selo: só é cobrado com a carreira de selo (ou músico) ativa ([[mech:hq]]).', 'Label HQ rent: only charged with the label (or musician) career active ([[mech:hq]]).'),
      l('Novas fontes de receita e páginas no menu ([[mech:money]]).', 'New revenue sources and menu pages ([[mech:money]]).'),
    ],
    rules: [
      l('Cada carreira tem uma carga (gravadora 45%, empresário, músico e plataforma 35%, trilhas 30%, editora 20%, as demais 25%). Acima de 100% de carga, o estresse do dono sobe (carga − 1) × 8 por mês.', 'Each career has a load (label 45%, manager, musician and platform 35%, screen 30%, publisher 20%, the rest 25%). Above 100% load, owner stress rises (load − 1) × 8 per month.'),
      l('Começar uma carreira dá +5 de estresse na hora. Largar o empresário derruba 10 de satisfação dos agenciados. Você precisa de pelo menos uma carreira.', 'Starting a career gives +5 stress right away. Dropping manager cuts client satisfaction by 10. You need at least one career.'),
      l('Ambição: no fim do ano, satisfeita dá −6 de estresse; frustrada, +6. Trocar de ambição custa +4 de estresse.', 'Ambition: at year end, fulfilled gives −6 stress; frustrated, +6. Changing ambition costs +4 stress.'),
      l('Herdeiro: abraçar o sonho dele troca as carreiras (−10 de estresse); manter a tradição custa +15; somar os dois acrescenta as carreiras novas.', 'Heir: embracing their dream swaps careers (−10 stress); keeping tradition costs +15; blending adds the new careers.'),
      l('Sem escolha, a partida começa só com Gravadora (ou Gravadora + Músico no papel híbrido).', 'With no choice, the run starts with Label only (or Label + Musician in the hybrid role).'),
    ],
    tips: [
      l('Comece com uma ou duas carreiras e some outras quando o caixa e a agenda deixarem.', 'Start with one or two careers and add more when cash and schedule allow.'),
      l('Carreiras se ajudam: estúdio próprio barateia gravações, mídia própria toca seus discos, agência enche suas turnês.', 'Careers help each other: your own studio cuts recording costs, your own media plays your records, your agency fills your tours.'),
      l('Delegue uma carreira a um diretor na agenda para aliviar a carga.', 'Delegate a career to a director in the agenda to ease the load.'),
    ],
    pages: ['careers', 'cp17-label', 'cp17-musician', 'cp17-manager', 'cp17-booking', 'cp17-festival', 'cp17-venue', 'cp17-studio', 'cp17-publisher', 'cp17-media', 'cp17-platform', 'cp17-screen', 'cp17-critic'],
    see: ['mech:life', 'mech:hq', 'mech:start', 'glossario:carga-de-agenda'],
    nums: (s) => {
      const c = s?.config.careers;
      return [
        [l('Carreiras no jogo', 'Careers in the game'), '12'],
        [l('Seu papel', 'Your role'), s ? s.config.role : '—'],
        [l('Suas carreiras principais', 'Your main careers'), c?.main?.length ? c.main.join(', ') : '—'],
        [l('Sua origem', 'Your origin'), c?.origin ?? '—'],
        [l('Sua ambição', 'Your ambition'), c?.ambition ?? '—'],
        [l('Anos de partida', 'Years played'), s ? String(s.year - s.config.startYear) : '—'],
      ];
    },
    docs: ['docs/connect29.md'],
  },

  // ============================================================ MODOS
  {
    id: 'modes', icon: 'compass',
    title: l('Modos de jogo', 'Game modes'),
    summary: l('Seis modos de mundo (de fidelidade histórica a caos), tamanho da base, predefinições, prazo da partida, sandbox e modo história.', 'Six world modes (from historical fidelity to chaos), database size, presets, run deadline, sandbox and story mode.'),
    what: [
      l('O seletor de Mundo junta nomes reais, mortes reais e modo de história. Reais em mundo aleatório (padrão): nomes conhecidos, carreiras simuladas desde o início. Fidelidade histórica: o único que segue o roteiro real, até você interferir. Real até o início: história alternativa dali em diante.', 'The World selector combines real names, real deaths and history mode. Real names, random world (default): known names, careers simulated from the start. Historical fidelity: the only one that follows the real script, until you interfere. Real until the start: alternate history from then on.'),
      l('Real até o início sem estreias reais depois: quem estrearia depois do seu ano nunca aparece. Universo ficcional: tudo com nomes inventados. Caos histórico: tecnologias em datas sorteadas e um quarto dos artistas reais nunca surge.', 'Real until the start with no later real debuts: anyone who would debut after your year never appears. Fictional universe: everything with invented names. Historical chaos: technologies on rolled dates and a quarter of real acts never show up.'),
      l('Predefinições ajustam tudo de uma vez: Recomendado (sugere fim em 25 anos), Historiador, Sandbox e Desafio (ironman). Os presets de apresentação (Guiado, Livre, Contemplativo) só mudam a interface, nunca as regras.', 'Presets set everything at once: Recommended (suggests an end in 25 years), Historian, Sandbox and Challenge (ironman). Presentation presets (Guided, Free, Contemplative) only change the interface, never the rules.'),
      l('O modo história (assistido) alivia o narrador e dá socorro no aperto. Pode ser ligado nas Opções a qualquer momento.', 'Story (assisted) mode softens the narrator and gives help in a pinch. It can be turned on in Options at any time.'),
    ],
    inputs: [
      l('Escolhas da Nova run: mundo, ano inicial, dificuldade, base, prazo, narrador.', 'New run choices: world, start year, difficulty, database, deadline, narrator.'),
      l('Dificuldade detalhada em 4 eixos: público, custos, rivais e talento (−2 a +2).', 'Detailed difficulty on 4 axes: audience, costs, rivals and talent (−2 to +2).'),
      l('Suas intervenções: contratar ou roubar um artista real muda a história dele, mesmo no modo exato.', 'Your interventions: signing or poaching a real act changes their story, even in exact mode.'),
    ],
    outputs: [
      l('Datas de tecnologia e formatos ([[mech:world]]).', 'Technology and format dates ([[mech:world]]).'),
      l('Quem existe no mundo, quando estreia e se a carreira segue o roteiro real ([[mech:scouting]]).', 'Who exists in the world, when they debut and whether their career follows the real script ([[mech:scouting]]).'),
      l('Apelo, custos, agressividade dos rivais e sinais de talento.', 'Appeal, costs, rival aggression and talent signals.'),
      l('O fim da partida e a pontuação final.', 'The end of the run and the final score.'),
    ],
    rules: [
      l('Formação inicial das bandas reais (nomes reais, fora da Vida real exata): "Mais famosa" (padrão; a Nova run rápida sempre usa) ou "Original (da estreia)", escolhida na Nova run completa — ex.: Beatles 1962 original = John, Paul, George e Pete Best; mais famosa = John, Paul, George e Ringo. Depois do início nenhuma troca real é agendada (tudo é simulado). Quem fica fora existe como pessoa sem banda, não como ex-integrante; quem já morreu sai, e quem ainda é jovem demais (menos de 15) aparece depois, sem banda. No modo exato valem as datas documentadas.',
        'Starting lineup of real bands (real names, outside Exact real life): "Most famous" (default; the quick New run always uses it) or "Original (at debut)", chosen in the full New run — e.g. Beatles 1962 original = John, Paul, George and Pete Best; most famous = John, Paul, George and Ringo. After the start no real lineup change is scheduled (all simulated). Whoever is left out exists as a band-less person, not a former member; the dead are dropped, and the too young (under 15) appear later, band-less. In exact mode the documented dates apply.'),
      l('Modo exato (strict): força nomes reais, datas fixas e mortes reais. Discos, mortes e separações reais acontecem com 100% de chance para quem você não tocou.', 'Exact mode (strict): forces real names, fixed dates and real deaths. Real albums, deaths and splits happen with 100% chance for acts you did not touch.'),
      l('Dificuldade: cada passo do eixo público vale ±8% de apelo e ±5% de bilheteria; custos ±8% em fabricação e salários; rivais ±0,2 de agressividade e ±2 pontos nas suas propostas; talento ±0,5 sinal por mês.', 'Difficulty: each audience step is ±8% appeal and ±5% box office; costs ±8% on manufacturing and salaries; rivals ±0.2 aggression and ±2 points on your offers; talent ±0.5 signal per month.'),
      l('Base de dados: Pequena, Média (padrão), Grande ou Enorme. A Enorme gera 3× atos no início e 2,4× por ano.', 'Database: Small, Medium (default), Large or Huge. Huge generates 3× acts at the start and 2.4× per year.'),
      l('Prazo: 0 (sem fim), 10, 20 ou 30 anos; o Recomendado sugere 25. No fim do prazo sai a pontuação e uma patente (por ano jogado). Depois dá para continuar em sandbox.', 'Deadline: 0 (no end), 10, 20 or 30 years; Recommended suggests 25. At the deadline you get the score and a rank (per year played). Then you can keep playing in sandbox.'),
      l('A partida também termina em 4 meses seguidos no vermelho (INSOLVENT_AT; dívida funda conta em dobro), demissão pelo conselho, falta de herdeiros ou no fim do arco em 2040.', 'The run also ends after 4 straight months in the red (INSOLVENT_AT; deep debt counts double), being fired by the board, lack of heirs or at the end of the arc in 2040.'),
      l('Modo história: eventos ruins pesam metade (um quinto no aperto). No primeiro mês de insolvência, um mecenas adianta 3 meses de despesas, uma vez a cada 3 anos.', 'Story mode: bad events weigh half (one fifth in a pinch). In the first month of insolvency, a patron advances 3 months of expenses, once every 3 years.'),
    ],
    tips: [
      l('Primeira partida? Recomendado com modo história ligado.', 'First run? Recommended with story mode on.'),
      l('Quer reviver a história? Fidelidade histórica, mas saiba que contratar um artista real muda o destino dele.', 'Want to relive history? Historical fidelity, but know that signing a real act changes their fate.'),
      l('Quer surpresa total? Universo ficcional ou Caos histórico.', 'Want total surprise? Fictional universe or Historical chaos.'),
      l('Base Enorme deixa o mundo cheio, mas o jogo fica mais pesado.', 'A Huge database fills the world, but the game gets heavier.'),
    ],
    pages: ['goals', 'plan', 'cockpit'],
    see: ['mech:world', 'mech:start', 'mech:story', 'glossario:modo-exato'],
    nums: (s) => [
      [l('Modos de mundo', 'World modes'), String(WORLDS17.length)],
      [l('Predefinições de partida / de apresentação', 'Run presets / presentation presets'), `${PRESETS17.length} / ${PRESETS29.length}`],
      [l('Prazos possíveis (anos)', 'Possible deadlines (years)'), RUN_YEARS17.map((y) => (y ? String(y) : '∞')).join(', ')],
      [l('Anos de início aceitos', 'Accepted start years'), `${YEAR_MIN20}–${YEAR_MAX20}`],
      [l('Tamanhos de base', 'Database sizes'), DB_SIZES.map((d) => d.pt).join(', ')],
      [l('Meses no vermelho até quebrar', 'Months in the red until bust'), String(INSOLVENT_AT)],
      [l('Liberdade do diretor (solta)', 'Director freedom (unleashed)'), `× ${FREEDOM17.wild.world}`],
      [l('Esta partida', 'This run'), s ? `${worldOf17(s.config)} · ${histMode(s)} · ${dbSizeInfo(s.config).pt}${s.flags.sandbox ? ' · sandbox' : ''}` : '—'],
    ],
    docs: ['docs/connect29.md'],
  },

  // ============================================================ CONEXÕES
  {
    id: 'connections', icon: 'network',
    title: l('Como os sistemas se conectam', 'How the systems connect'),
    summary: l('Um mapa de quem afeta quem: escândalo → vendas, sede → apelo, prêmios → contratos, estresse → gravação, guerra → mercado. Medido por uma sonda no código.', 'A map of what affects what: scandal → sales, HQ → appeal, awards → contracts, stress → recording, war → market. Measured by a probe in the code.'),
    what: [
      l('Os sistemas do jogo conversam por modificadores (multiplicadores com rótulo, que aparecem na autópsia e no "por quê") e por vantagens somadas (perks). Uma sonda roda a mesma semente duas vezes, mexendo em UMA entrada, e mede quanto a saída muda.', 'Game systems talk through modifiers (labeled multipliers that show in the autopsy and the "why") and summed perks. A probe runs the same seed twice, changing ONE input, and measures how much the output moves.'),
      l('Uma ligação com efeito abaixo de 0,2% é considerada morta; abaixo de 3%, fraca. Na rodada 29 várias ligações mortas foram consertadas: departamentos da sede, prêmios → ofertas, estresse → gravação, escândalo → próximo disco e a sua resenha como crítico.', 'A link with less than 0.2% effect is considered dead; under 3%, weak. In round 29 several dead links were fixed: HQ departments, awards → offers, stress → recording, scandal → next record and your review as a critic.'),
      l('Veja o diagrama abaixo: cada seta é uma ligação medida, com o estado (conectada, fraca, consertada ou intencional).', 'See the diagram below: each arrow is a measured link, with its state (connected, weak, fixed or intentional).'),
    ],
    inputs: [
      l('Escândalos e imprensa ([[mech:press]]).', 'Scandals and press ([[mech:press]]).'),
      l('Departamentos da sede e equipe.', 'HQ departments and staff.'),
      l('Fãs, momento, estresse, reputação, prêmios, guerras e cenas.', 'Fans, momentum, stress, reputation, awards, wars and scenes.'),
    ],
    outputs: [
      l('Apelo e vendas semanais dos discos ([[mech:music]]).', 'Record appeal and weekly sales ([[mech:music]]).'),
      l('Público e bilheteria das turnês ([[mech:live]]).', 'Tour crowds and box office ([[mech:live]]).'),
      l('Aceite de ofertas e renovação de contratos ([[mech:contracts]]).', 'Offer acceptance and contract renewal ([[mech:contracts]]).'),
      l('Tamanho do mercado.', 'Market size.'),
    ],
    rules: [
      l('O apelo de um disco é calculado UMA vez, na estreia. Algo que muda depois da estreia não altera o apelo daquele disco, só o do próximo.', 'A record appeal is computed ONCE, at launch. Something that changes after launch does not alter that record appeal, only the next one.'),
      l('Shows simples não passam pelos modificadores de show; só as paradas de turnê. Bônus de bilheteria (sede, cena) valem na turnê.', 'Simple gigs skip show modifiers; only tour stops use them. Box office bonuses (HQ, scene) apply on tour.'),
      l('Bônus pequenos empilhados têm teto suave (MOD_CAP18): até o joelho passam inteiros; acima, crescem no máximo mais um tanto. Apelo: até +30% intacto, depois no máximo mais 60%. Multiplicadores acima de ×1,25 (SMALL18) ficam fora da pilha. Penalidades valem inteiras.', 'Small stacked bonuses have a soft cap (MOD_CAP18): up to the knee they pass whole; above, they grow by at most a bit more. Appeal: up to +30% intact, then at most another 60%. Multipliers above ×1.25 (SMALL18) stay out of the stack. Penalties count in full.'),
      l('Vantagens somadas (PERK_CAP18) seguem a mesma regra por chave: por exemplo, aceite de oferta até +0,25 inteiro.', 'Summed perks (PERK_CAP18) follow the same rule per key: for example, offer acceptance up to +0.25 whole.'),
      l('Escândalo pesado (efeito ≥ 40) fora de gênero rebelde: disco lançado até 26 semanas depois estreia com apelo até −15%. No gênero rebelde vale o efeito Streisand (vende mais).', 'Heavy scandal (effect ≥ 40) outside a rebel genre: a record released up to 26 weeks later launches with up to −15% appeal. In a rebel genre the Streisand effect applies (it sells more).'),
      l('Momento entra no apelo como 0,8 + momento/250. Sua resenha de crítico vale nas vendas das primeiras 12 semanas.', 'Momentum enters appeal as 0.8 + momentum/250. Your critic review counts on sales of the first 12 weeks.'),
    ],
    tips: [
      l('Pense na ordem: resolva escândalos e estresse ANTES de lançar, porque o apelo é fixado na estreia.', 'Think about order: fix scandals and stress BEFORE releasing, because appeal is locked at launch.'),
      l('Empilhar muitos bônus pequenos rende cada vez menos; diversifique.', 'Stacking many small bonuses yields less and less; diversify.'),
      l('Use a autópsia do disco para ver quais ligações pesaram.', 'Use the record autopsy to see which links weighed in.'),
    ],
    pages: ['cockpit', 'catalog', 'hq', 'charts'],
    see: ['mech:music', 'mech:live', 'mech:contracts', 'mech:hq', 'mech:press', 'glossario:teto-suave'],
    nums: () => [
      [l('Joelho do apelo (bônus intacto)', 'Appeal knee (bonus intact)'), `+${pct(MOD_CAP18.appeal.knee)}`],
      [l('Folga máxima acima do joelho (apelo)', 'Max room above knee (appeal)'), `+${pct(MOD_CAP18.appeal.room)}`],
      [l('Joelho da qualidade da faixa', 'Track quality knee'), `+${pct(MOD_CAP18.songQ.knee)}`],
      [l('Maior multiplicador que entra na pilha', 'Largest multiplier in the stack'), `× ${SMALL18}`],
      [l('Teto suave do aceite de oferta', 'Offer acceptance soft cap'), `+${PERK_CAP18.offer}`],
      [l('Ligações medidas / consertadas', 'Links measured / fixed'), `${EDGES29W.length} / ${EDGES29W.filter((e) => e.state === 'fixed').length}`],
      [l('Ainda fracas', 'Still weak'), String(EDGES29W.filter((e) => e.state === 'weak').length)],
    ],
    docs: ['docs/connect29.md', 'docs/econ18.md'],
  },
];

// ---------------------------------------------------------------- glossário
export const TERMS_D: Term29[] = [
  { id: 'postura-de-era', term: l('Postura de era', 'Era stance'), def: l('A estratégia que o selo escolhe numa virada tecnológica. Tem efeitos duradouros e pesa menos a cada era nova.', 'The strategy the label picks at a technology shift. It has lasting effects and weighs less with each new era.'), see: ['mech:world'] },
  { id: 'legado', term: l('Legado', 'Legacy'), def: l('Sete dimensões (comercial, cultural, artistas, inovação, indústria, catálogo, reputação) de 0 a 100 que somam a sua pontuação de legado e decidem o final.', 'Seven dimensions (commercial, cultural, artists, innovation, industry, catalog, reputation) from 0 to 100 that add up to your legacy score and decide the ending.'), see: ['mech:awards'] },
  { id: 'eco', term: l('Eco', 'Echo'), def: l('Consequência atrasada de uma escolha: volta semanas ou meses depois, com chance e condição lidas no momento do disparo.', 'Delayed consequence of a choice: it returns weeks or months later, with odds and conditions read when it fires.'), see: ['mech:story'] },
  { id: 'orcamento-de-atencao', term: l('Orçamento de atenção', 'Attention budget'), def: l('Limite de cenas, dicas e fatos do mundo que podem interromper você por avanço e por mês. O resto vai para o álbum.', 'Limit on scenes, tips and world facts that can interrupt you per advance and per month. The rest goes to the album.'), see: ['mech:story'] },
  { id: 'carga-de-agenda', term: l('Carga de agenda', 'Schedule load'), def: l('Soma do peso das suas carreiras ativas. Acima de 100%, o estresse do dono sobe todo mês.', 'Sum of the weight of your active careers. Above 100%, owner stress rises every month.'), see: ['mech:careers'] },
  { id: 'modo-exato', term: l('Modo exato', 'Exact mode'), def: l('Fidelidade histórica: artistas reais seguem o roteiro documentado (discos, mortes, separações) até você interferir neles.', 'Historical fidelity: real acts follow the documented script (albums, deaths, splits) until you interfere with them.'), see: ['mech:modes'] },
  { id: 'teto-suave', term: l('Teto suave', 'Soft cap'), def: l('Regra de retornos decrescentes: bônus pequenos empilhados passam inteiros até um joelho e depois crescem cada vez menos. Penalidades não têm teto.', 'Diminishing-returns rule: small stacked bonuses pass whole up to a knee and then grow less and less. Penalties have no cap.'), see: ['mech:connections'] },
  { id: 'sandbox', term: same('Sandbox'), def: l('Continuar jogando depois do fim da partida (prazo ou final), sem novo encerramento. Também é o nome de uma predefinição fácil.', 'Keep playing after the run ends (deadline or ending), with no new end. It is also the name of an easy preset.'), see: ['mech:modes'] },
];

// ---------------------------------------------------------------- perguntas frequentes
export const FAQ_D: Faq29[] = [
  { id: 'faq-fim-partida', q: l('Quando a partida acaba?', 'When does the run end?'), a: l('No fim do prazo escolhido (se houver), em 2040 (fim do arco), após 4 meses seguidos no vermelho, se o conselho demitir você ou se faltar herdeiro. No fim do prazo dá para continuar em sandbox.', 'At the chosen deadline (if any), in 2040 (end of the arc), after 4 straight months in the red, if the board fires you or if there is no heir. At the deadline you can keep playing in sandbox.'), see: ['mech:modes'] },
  { id: 'faq-modo-exato-mudar', q: l('No modo exato, posso mudar a história?', 'In exact mode, can I change history?'), a: l('Sim. Atos reais que você não tocou seguem o roteiro; se você contrata, rouba ou monta a banda, a história daquele ato diverge.', 'Yes. Real acts you have not touched follow the script; if you sign, poach or form the band, that act story diverges.'), see: ['mech:modes', 'mech:world'] },
  { id: 'faq-escandalo-disco', q: l('Um escândalo atrapalha o próximo disco?', 'Does a scandal hurt the next record?'), a: l('Fora de gênero rebelde, sim: escândalo pesado reduz o apelo de disco lançado até 26 semanas depois (até −15%). Em gênero rebelde, pode até vender mais.', 'Outside a rebel genre, yes: a heavy scandal cuts the appeal of a record released up to 26 weeks later (up to −15%). In a rebel genre, it may even sell more.'), see: ['mech:connections', 'mech:press'] },
  { id: 'faq-muitas-carreiras', q: l('Posso seguir várias carreiras?', 'Can I follow several careers?'), a: l('Pode, mas cada uma pesa na agenda. Passando de 100% de carga, o estresse do dono sobe todo mês.', 'Yes, but each one weighs on your schedule. Past 100% load, owner stress rises every month.'), see: ['mech:careers'] },
];

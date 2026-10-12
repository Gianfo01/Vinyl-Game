// Rodada 23 — cenários de OUTRAS PROFISSÕES (empresário, festival, casa de shows, estúdio, editora, rádio, agência,
// plataforma, músico) e mais cenários de selo. Mesmo formato do Scenario17 (regras, marcos datados, perks): entram na
// lista SCENARIOS17 (perks/eventos/regra mensal funcionam sem código novo) e na lista SCENARIOS (tela e Novo Jogo).
// O negócio inicial de cada carreira é aberto pelo careers19 (def.careers → config.careers.main); aqui só ajustamos
// o que é próprio do cenário (rádio em vez de fanzine, primeiro cliente etc.) e medimos o estado real da profissão.

import { l } from '../../data/world';
import { money } from '../util';
import { registerSimHook } from '../ext4';
import { makeAct } from '../people';
import type { GameState } from '../types';
import { SCENARIOS, adjustCash, bestFame, genreUnits, insolvent, liveOf, scenarioById, signAct, type ScenarioDef } from './live';
import { SCENARIOS17, type Scenario17 } from './scenarios17';
import { ventures, type Venture } from './ventures9';

export interface Scenario23 extends Scenario17 {
  /** r23: ajuste depois que o negócio inicial foi aberto (gancho newgame posterior ao careers19) */
  after23?: (s: GameState) => void;
  /** r23: capital de fundação extra (US$ da época-base, via money) — o "do zero" de selo não paga um festival/clube */
  capital23?: number;
}

const C = (s: GameState) => liveOf(s).counters;
const vl = (s: GameState, k: Venture['kind']) => ventures(s).list.filter((v) => v.kind === k);
const certs = (s: GameState, b: Record<string, number>) => s.player.stats.gold + s.player.stats.platinum - (b.certs ?? 0);
const top10 = (s: GameState, b: Record<string, number>) => s.player.stats.top10s - (b.top10s ?? 0);
const kUnits = (gs: string[]) => (s: GameState) => Math.round(genreUnits(s, gs) / 1000);
const band = (s: GameState) => bestFame(s, (a) => !!a.playerBand);
const fam = (gs: string[]) => (_s: GameState, a: { genre: string }) => gs.includes(a.genre);

// ---------------------------------------------------------------- profissões

export const SCENARIOS23: Scenario23[] = [
  {
    id: 'manager_1961', capital23: 10000, name: l('O empresário do porão: Liverpool, 1961', 'The cellar manager: Liverpool, 1961'), startYear: 1961, endYear: 1965, homeCity: 'liverpool', scenario: 'from_zero', careers: ['manager'],
    desc: l('Novembro de 1961: o dono de uma loja de discos desce a um porão úmido para ver uma banda de jaqueta de couro que toca na hora do almoço. Ele nunca empresariou ninguém — e vai levá-los à TV americana.', 'November 1961: a record-shop owner walks down into a damp cellar to see a leather-jacketed band playing at lunchtime. He has never managed anyone — and he will take them to American TV.'),
    goal: l('Faça seus agenciados estourarem até 1965: cada top 10 vale 10 pontos, mais a maior fama de um cliente.', 'Make your clients break by 1965: each top 10 is worth 10 points, plus your best client\'s fame.'), unit: l('pontos de empresário', 'manager points'), tiers: [22, 35, 55],
    rules17: [l('Você é empresário, não selo: começa com uma banda de beat como cliente (20% de comissão).', 'You are a manager, not a label: you start with a beat band as a client (20% commission).'),
      l('Outubro de 1962: o primeiro single da cena entra nas paradas — beat em alta.', 'October 1962: the scene\'s first single enters the charts — beat booms.'),
      l('Fevereiro de 1964: a TV americana — o beat explode nos EUA.', 'February 1964: American TV — beat explodes in the US.')],
    events17: [{ year: 1962, month: 9, title: l('Um single de Liverpool nas paradas', 'A Liverpool single on the charts'), text: l('Uma banda do porão entra no top 20; as gravadoras de Londres descobrem o Mersey.', 'A cellar band enters the top 20; London labels discover the Mersey.'), genre: 'beat', genreMult: 1.3 },
      { year: 1964, month: 1, title: l('Beatlemania na TV americana', 'Beatlemania on American TV'), text: l('73 milhões assistem; a América quer bandas inglesas.', '73 million watch; America wants English bands.'), genre: 'beat', genreMult: 1.45 }],
    setup: (s, r) => {
      const a = makeAct(s, r, { genre: 'beat', city: 'liverpool', members: 4, potential: r.int(80, 92), formed: s.year - 2, debutYear: s.year - 1, fame: 14 });
      a.status = 'active';
      a.fans = { casual: 2500, active: 380, core: 80 };
      ventures(s).mg.clients.push({ actId: a.id, rate: 0.2, since: s.week, sat: 60, earned: 0 });
    },
    metric: (s) => (C(s).mgrHits23 ?? 0) * 10 + (C(s).mgrFame23 ?? 0), fail: insolvent,
  },
  {
    id: 'woodstock_1969', capital23: 120000, name: l('Três dias de paz e música: Nova York, 1968', 'Three days of peace and music: New York, 1968'), startYear: 1968, endYear: 1972, homeCity: 'new_york', scenario: 'from_zero', careers: ['festival'],
    desc: l('Quatro jovens querem montar um festival no interior de Nova York. Em agosto de 1969, meio milhão de pessoas aparecem numa fazenda leiteira — os portões caem e o festival vira lenda (e prejuízo). Em dezembro, Altamont mostra o lado escuro.', 'Four young men want to stage a festival upstate. In August 1969 half a million people turn up on a dairy farm — the fences fall and the festival becomes a legend (and a loss). In December, Altamont shows the dark side.'),
    goal: l('Faça edições boas do seu festival até 1972.', 'Hold good editions of your festival by 1972.'), unit: l('edições boas', 'good editions'), tiers: [1, 2, 4],
    rules17: [l('Você é produtor de festival: começa com um terreno alugado e a edição 0.', 'You are a festival promoter: you start with rented ground and edition 0.'),
      l('Agosto de 1969: a contracultura no auge — rock psicodélico e folk em alta.', 'August 1969: the counterculture peaks — psychedelic rock and folk boom.'),
      l('Dezembro de 1969: Altamont — o clima de paz e amor esfria.', 'December 1969: Altamont — the peace-and-love mood cools.')],
    events17: [{ year: 1969, month: 7, title: l('Meio milhão numa fazenda', 'Half a million on a farm'), text: l('Três dias de chuva, lama e música: a geração se vê no espelho.', 'Three days of rain, mud and music: a generation sees itself in the mirror.'), genre: 'psychedelic', genreMult: 1.35 },
      { year: 1969, month: 11, title: l('Altamont', 'Altamont'), text: l('Violência num festival gratuito na Califórnia; o sonho racha.', 'Violence at a free festival in California; the dream cracks.'), genre: 'psychedelic', genreMult: 0.85 }],
    metric: (s) => C(s).festGood ?? 0, fail: insolvent,
  },
  {
    id: 'rockinrio_1985', capital23: 120000, name: l('Rock in Rio: Rio de Janeiro, 1984', 'Rock in Rio: Rio de Janeiro, 1984'), startYear: 1984, endYear: 1991, homeCity: 'rio', scenario: 'from_zero', careers: ['festival'],
    desc: l('Janeiro de 1985: na volta da democracia, uma cidade do rock é erguida em Jacarepaguá para dez noites com astros do metal e o novo rock brasileiro. Em 1991 o festival volta, no Maracanã.', 'January 1985: as democracy returns, a city of rock is built in Jacarepaguá for ten nights of metal stars and new Brazilian rock. In 1991 the festival returns, at the Maracanã.'),
    goal: l('Faça edições boas do seu festival até 1991.', 'Hold good editions of your festival by 1991.'), unit: l('edições boas', 'good editions'), tiers: [1, 3, 5],
    rules17: [l('Você é produtor de festival: começa com um terreno alugado e a edição 0.', 'You are a festival promoter: you start with rented ground and edition 0.'),
      l('Janeiro de 1985: a cidade do rock — metal e rock brasileiro em alta.', 'January 1985: the city of rock — metal and Brazilian rock boom.'),
      l('1986: o Plano Cruzado congela preços e enche as lojas; 1990: o confisco esvazia os bolsos.', '1986: the Cruzado Plan freezes prices and fills the shops; 1990: the savings freeze empties pockets.')],
    events17: [{ year: 1985, month: 0, title: l('A cidade do rock', 'The city of rock'), text: l('Um milhão e meio de pessoas em dez noites; o rock nacional sai da garagem.', 'One and a half million people over ten nights; Brazilian rock leaves the garage.'), genre: 'heavy_metal', genreMult: 1.3, fame: 2 },
      { year: 1985, month: 2, title: l('O BRock toma as rádios', 'BRock takes the radio'), text: l('Bandas de Brasília, São Paulo e do Rio dominam as paradas.', 'Bands from Brasília, São Paulo and Rio dominate the charts.'), genre: 'rock_br', genreMult: 1.35 },
      { year: 1990, month: 2, title: l('O confisco da poupança', 'The savings freeze'), text: l('O novo governo bloqueia as contas; ingresso vira luxo.', 'The new government freezes accounts; tickets become a luxury.'), genre: 'rock_br', genreMult: 0.9, cash: -6000 }],
    metric: (s) => C(s).festGood ?? 0, fail: insolvent,
  },
  {
    id: 'cbgb_1973', capital23: 30000, name: l('Country, bluegrass e blues: Bowery, 1973', 'Country, bluegrass and blues: the Bowery, 1973'), startYear: 1973, endYear: 1979, homeCity: 'new_york', scenario: 'from_zero', careers: ['venue'],
    desc: l('Um bar decadente no Bowery abre para country e blues — e acaba recebendo bandas que ninguém mais aceita. Em 1974–75 nascem ali o punk e a new wave de Nova York, numa cidade à beira da falência.', 'A rundown bar on the Bowery opens for country and blues — and ends up hosting bands nobody else will book. In 1974–75 New York punk and new wave are born there, in a city on the verge of bankruptcy.'),
    goal: l('Lote o clube: some meses com ocupação de 80% ou mais até 1979.', 'Pack the club: add up months at 80%+ occupancy by 1979.'), unit: l('meses lotados', 'packed months'), tiers: [6, 30, 60],
    rules17: [l('Você é dono de casa de shows: começa com um clube arrendado de 400 lugares.', 'You run a venue: you start with a leased 400-seat club.'),
      l('Agosto de 1974: uma banda de jaqueta de couro estreia no clube — o punk nasce.', 'August 1974: a leather-jacketed band debuts at the club — punk is born.'),
      l('Outubro de 1975: a cidade quase quebra ("Ford para NY: morra") — o público aperta o cinto.', 'October 1975: the city nearly goes bust ("Ford to City: Drop Dead") — audiences tighten belts.')],
    events17: [{ year: 1974, month: 7, title: l('Punk no Bowery', 'Punk on the Bowery'), text: l('Músicas de dois minutos, volume no máximo: uma cena se forma num bar de bêbados.', 'Two-minute songs at full volume: a scene forms in a dive bar.'), genre: 'punk', genreMult: 1.3 },
      { year: 1975, month: 9, title: l('A cidade à beira da falência', 'The city on the brink'), text: l('Cortes, greves e lixo nas ruas; a noite fica mais barata e mais selvagem.', 'Cuts, strikes and garbage in the streets; nightlife gets cheaper and wilder.'), genre: 'disco', genreMult: 1.1, cash: -3000 },
      { year: 1977, month: 6, title: l('O apagão de 1977', 'The 1977 blackout'), text: l('A cidade apaga por 25 horas; a new wave sai do clube para as rádios.', 'The city goes dark for 25 hours; new wave leaves the club for the radio.'), genre: 'new_wave', genreMult: 1.25 }],
    metric: (s) => C(s).full23 ?? 0, fail: insolvent,
  },
  {
    id: 'memphis_studio_1961', capital23: 150000, name: l('Soulsville: o cinema da McLemore, 1961', 'Soulsville: the McLemore movie theater, 1961'), startYear: 1961, endYear: 1968, homeCity: 'memphis', scenario: 'from_zero', careers: ['studio'],
    desc: l('Um cinema velho vira estúdio com piso inclinado e eco de sala. Uma banda da casa, birracial, grava o soul mais cru do Sul — até 1968, quando o assassinato de Martin Luther King muda Memphis e um contrato de distribuição leva o catálogo.', 'An old cinema becomes a studio with a sloping floor and a room echo. A mixed-race house band cuts the rawest soul in the South — until 1968, when Martin Luther King\'s murder changes Memphis and a distribution deal takes the catalog.'),
    goal: l('Encha a agenda do estúdio: some sessões contratadas até 1968.', 'Fill the studio\'s book: add up booked sessions by 1968.'), unit: l('sessões', 'sessions'), tiers: [80, 160, 260],
    rules17: [l('Você é dono de estúdio: começa com uma sala alugada e um "som da casa" cru.', 'You own a studio: you start with a rented room and a raw "house sound".'),
      l('1962: um instrumental da banda da casa estoura — o soul de Memphis em alta.', '1962: a house-band instrumental breaks — Memphis soul booms.'),
      l('Abril de 1968: o assassinato de King em Memphis — o clima da cidade muda.', 'April 1968: King is murdered in Memphis — the city\'s mood changes.')],
    events17: [{ year: 1962, month: 7, title: l('Um instrumental de órgão nas paradas', 'An organ instrumental on the charts'), text: l('A banda da casa grava num intervalo e vira sucesso nacional.', 'The house band cuts a jam in a break and it becomes a national hit.'), genre: 'soul', genreMult: 1.25 },
      { year: 1967, month: 11, title: l('A voz do soul cai num lago gelado', 'The voice of soul falls into a frozen lake'), text: l('O maior cantor do estúdio morre num acidente aéreo.', 'The studio\'s greatest singer dies in a plane crash.'), genre: 'soul', genreMult: 0.9 },
      { year: 1968, month: 3, title: l('Abril de 1968 em Memphis', 'April 1968 in Memphis'), text: l('Um tiro no Lorraine Motel; a cidade se divide.', 'A shot at the Lorraine Motel; the city splits.'), genre: 'soul', genreMult: 0.9 }],
    metric: (s) => C(s).sess23 ?? 0, fail: insolvent,
  },
  {
    id: 'brill_1958', capital23: 70000, name: l('Fábrica de canções: Broadway 1619, 1958', 'Song factory: 1619 Broadway, 1958'), startYear: 1958, endYear: 1964, homeCity: 'new_york', scenario: 'from_zero', careers: ['publisher'],
    desc: l('Cubículos com um piano e duplas de compositores de 19 anos escrevendo para grupos de garotas e ídolos adolescentes. A editora que tiver as melhores duplas manda nas paradas — até a invasão britânica trazer bandas que escrevem as próprias músicas.', 'Cubicles with a piano and 19-year-old songwriting teams writing for girl groups and teen idols. The publisher with the best teams rules the charts — until the British Invasion brings bands that write their own songs.'),
    goal: l('Monte o maior catálogo de obras até 1964.', 'Build the biggest catalog of works by 1964.'), unit: l('obras no catálogo', 'works in catalog'), tiers: [10, 30, 60],
    rules17: [l('Você é editor musical: começa com cinco obras de compositores locais.', 'You are a music publisher: you start with five works by local writers.'),
      l('1960–62: grupos de garotas e ídolos adolescentes dominam o rádio.', '1960–62: girl groups and teen idols dominate radio.'),
      l('Fevereiro de 1964: a invasão britânica — bandas que compõem tudo sozinhas.', 'February 1964: the British Invasion — bands that write everything themselves.')],
    events17: [{ year: 1960, month: 10, title: l('O primeiro número 1 de um grupo de garotas', 'The first girl-group number 1'), text: l('Uma canção escrita num cubículo chega ao topo: as editoras disputam duplas.', 'A song written in a cubicle hits the top: publishers fight over writing teams.'), genre: 'girl_group', genreMult: 1.35 },
      { year: 1964, month: 1, title: l('A invasão britânica', 'The British Invasion'), text: l('Bandas inglesas compõem as próprias canções; o modelo da fábrica envelhece.', 'English bands write their own songs; the factory model ages.'), genre: 'girl_group', genreMult: 0.8 }],
    metric: (s) => vl(s, 'publisher').reduce((t, v) => t + (v.cat?.length ?? 0), 0), fail: insolvent,
  },
  {
    id: 'djrock_1951', capital23: 20000, name: l('O DJ que batizou o rock: Cleveland, 1951', 'The DJ who named rock: Cleveland, 1951'), startYear: 1951, endYear: 1958, homeCity: 'cleveland', scenario: 'from_zero', careers: ['media'],
    desc: l('Julho de 1951: um locutor de música clássica percebe que adolescentes brancos compram discos de rhythm and blues numa loja de Cleveland. Ele os toca de madrugada, chama aquilo de "rock and roll" e, em 1952, organiza o primeiro grande show do gênero — que termina em tumulto.', 'July 1951: a classical-music DJ notices white teenagers buying rhythm-and-blues records in a Cleveland shop. He plays them late at night, calls it "rock and roll" and, in 1952, stages the genre\'s first big concert — which ends in a riot.'),
    goal: l('Aumente o alcance da sua rádio até 1958.', 'Grow your radio station\'s reach by 1958.'), unit: l('de alcance', 'reach'), tiers: [32, 45, 58],
    rules17: [l('Você é dono de mídia: começa com um programa de rádio local (não fanzine).', 'You run media: you start with a local radio show (not a fanzine).'),
      l('Março de 1952: o primeiro grande baile de rock termina em tumulto — R&B em alta.', 'March 1952: the first big rock dance ends in a riot — R&B booms.'),
      l('Julho de 1955: o rock and roll chega ao número 1 nacional.', 'July 1955: rock and roll reaches national number 1.')],
    events17: [{ year: 1952, month: 2, title: l('O baile da coroação', 'The coronation ball'), text: l('Vinte mil pessoas para um ginásio de dez mil: o show é cancelado e vira lenda.', 'Twenty thousand people for a ten-thousand-seat arena: the show is cancelled and becomes legend.'), genre: 'rnb', genreMult: 1.25 },
      { year: 1955, month: 6, title: l('Rock and roll no número 1', 'Rock and roll at number 1'), text: l('Uma música de trilha de filme lidera as paradas por oito semanas.', 'A film-soundtrack song tops the charts for eight weeks.'), genre: 'rnr', genreMult: 1.4 }],
    after23: (s) => { for (const v of vl(s, 'media')) { v.media = 'radio'; v.reach = Math.max(v.reach ?? 15, 15); v.name = `${s.config.companyName} Rádio`; } },
    metric: (s) => Math.round(Math.max(0, ...vl(s, 'media').map((v) => v.reach ?? 0))), fail: insolvent,
  },
  {
    id: 'chitlin_1955', capital23: 40000, name: l('O circuito chitlin\': Memphis, 1955', 'The chitlin\' circuit: Memphis, 1955'), startYear: 1955, endYear: 1962, homeCity: 'memphis', scenario: 'from_zero', careers: ['booking'],
    desc: l('No Sul segregado, artistas negros só tocam numa rede de clubes, salões e teatros — o "chitlin\' circuit". Quem tem a agenda e o telefone decide quem viaja, quem come e quem estoura.', 'In the segregated South, Black artists can only play a network of clubs, halls and theaters — the "chitlin\' circuit". Whoever holds the date book and the phone decides who travels, who eats and who breaks.'),
    goal: l('Monte o maior elenco de agenciados até 1962.', 'Build the biggest roster of booked acts by 1962.'), unit: l('clientes', 'clients'), tiers: [2, 4, 6],
    rules17: [l('Você é agente de shows: começa com uma agência de uma pessoa só e um cliente de R&B.', 'You are a booking agent: you start with a one-person agency and one R&B client.'),
      l('1956: o rock and roll cruza a linha de cor nas rádios — R&B em alta.', '1956: rock and roll crosses the color line on radio — R&B booms.'),
      l('Fevereiro de 1960: os protestos nas lanchonetes começam a derrubar a segregação.', 'February 1960: lunch-counter sit-ins begin to break segregation.')],
    events17: [{ year: 1956, month: 2, title: l('O R&B cruza a linha de cor', 'R&B crosses the color line'), text: l('Rádios brancas tocam artistas negros; o circuito ganha público novo.', 'White stations play Black artists; the circuit gains a new audience.'), genre: 'rnb', genreMult: 1.25 },
      { year: 1960, month: 1, title: l('Os protestos de Greensboro', 'The Greensboro sit-ins'), text: l('Estudantes sentam no balcão "só para brancos"; o soul vira trilha do movimento.', 'Students sit at the "whites only" counter; soul becomes the movement\'s soundtrack.'), genre: 'soul', genreMult: 1.2 }],
    after23: (s) => {
      const v = vl(s, 'booking')[0];
      if (!v) return;
      const a = Object.values(s.acts).filter((x) => x.status !== 'retired' && x.status !== 'split' && x.owner !== 'player' && !x.playerBand && x.fame < 30 && ['rnb', 'jump_blues', 'chicago_blues', 'doo_wop', 'gospel'].includes(x.genre)).sort((x, y) => y.fame - x.fame)[0];
      if (a) v.clients!.push({ actId: a.id, rate: 0.15, since: s.week });
    },
    metric: (s) => vl(s, 'booking').reduce((t, v) => t + (v.clients?.length ?? 0), 0), fail: insolvent,
  },
  {
    id: 'stream_startup_2008', capital23: 40000, name: l('O app contra a pirataria: Estocolmo, 2008', 'The app against piracy: Stockholm, 2008'), startYear: 2008, endYear: 2015, homeCity: 'stockholm', scenario: 'from_zero', careers: ['platform'],
    desc: l('Na cidade do maior site de torrents do mundo, dois empreendedores lançam em outubro de 2008 um tocador "melhor que a pirataria". As gravadoras desconfiam, os artistas reclamam do repasse — e em 2011 o app chega aos EUA.', 'In the home city of the world\'s biggest torrent site, two entrepreneurs launch in October 2008 a player "better than piracy". Labels are wary, artists complain about payouts — and in 2011 the app reaches the US.'),
    goal: l('Conquiste assinantes até 2015.', 'Win subscribers by 2015.'), unit: l('mil assinantes', 'thousand subscribers'), tiers: [20, 40, 80],
    rules17: [l('Você é dono de plataforma: começa com um app beta de 5 mil assinantes.', 'You run a platform: you start with a beta app with 5k subscribers.'),
      l('Abril de 2009: os donos do site de torrents são condenados — a pirataria perde força.', 'April 2009: the torrent site\'s owners are convicted — piracy loses steam.'),
      l('Julho de 2011: lançamento nos EUA.', 'July 2011: US launch.')],
    events17: [{ year: 2009, month: 3, title: l('Condenação no caso dos torrents', 'Torrent-site verdict'), text: l('Tribunal sueco condena os fundadores; ouvintes procuram alternativas legais.', 'A Swedish court convicts the founders; listeners look for legal alternatives.'), genre: 'nordic_pop', genreMult: 1.15 },
      { year: 2011, month: 6, title: l('O streaming chega aos EUA', 'Streaming reaches the US'), text: l('O maior mercado do mundo ganha o app; as gravadoras assinam.', 'The world\'s biggest market gets the app; the labels sign up.'), genre: 'edm', genreMult: 1.2 }],
    metric: (s) => Math.round(Math.max(0, ...vl(s, 'platform').map((v) => v.subs ?? 0)) / 1000), fail: insolvent,
  },
  {
    id: 'funk_1989', name: l('Baile funk: Rio de Janeiro, 1989', 'Baile funk: Rio de Janeiro, 1989'), startYear: 1989, endYear: 1997, homeCity: 'rio', scenario: 'from_zero', careers: ['musician'], role: 'artist', bandGenre: 'funk_carioca',
    desc: l('1989: um DJ lança o primeiro disco de funk cantado em português, sobre a batida do Miami bass. Os bailes das comunidades reúnem milhares — e a imprensa os culpa pelos arrastões de 1992. Você é um MC tentando sair do baile para o rádio.', '1989: a DJ releases the first funk record sung in Portuguese, over a Miami bass beat. Community bailes draw thousands — and the press blames them for the 1992 beach mass robberies. You are an MC trying to get from the baile to the radio.'),
    goal: l('Leve sua banda à fama nacional até 1997.', 'Take your act to national fame by 1997.'), unit: l('de fama', 'fame'), tiers: [50, 70, 88],
    rules17: [l('Você é músico (MC): sem selo, só a sua carreira.', 'You are a musician (MC): no label, just your career.'),
      l('1989: o primeiro LP de funk em português — o gênero ganha nome.', '1989: the first funk LP in Portuguese — the genre gets a name.'),
      l('Outubro de 1992: os arrastões nas praias — pânico moral contra os bailes.', 'October 1992: the beach mass robberies — a moral panic against the bailes.'),
      l('1995: o funk melody toca nas rádios e na TV.', '1995: funk melody plays on radio and TV.')],
    events17: [{ year: 1989, month: 5, title: l('Funk em português', 'Funk in Portuguese'), text: l('Um DJ lança o disco que dá voz carioca à batida de Miami.', 'A DJ releases the record that gives the Miami beat a Rio voice.'), genre: 'funk_carioca', genreMult: 1.3 },
      { year: 1992, month: 9, title: l('Os arrastões', 'The mass robberies'), text: l('Jornais culpam os bailes; prefeituras proíbem festas.', 'Newspapers blame the bailes; city halls ban parties.'), genre: 'funk_carioca', genreMult: 0.8 },
      { year: 1995, month: 2, title: l('O funk melody no rádio', 'Funk melody on the radio'), text: l('O "Rap da Felicidade" vira hino; a TV abre as portas.', 'A "happiness rap" becomes an anthem; TV opens its doors.'), genre: 'funk_carioca', genreMult: 1.35, fame: 3 }],
    metric: band, fail: insolvent,
  },
  {
    id: 'mangue_1993', name: l('Caranguejos com cérebro: Recife, 1993', 'Crabs with brains: Recife, 1993'), startYear: 1993, endYear: 1998, homeCity: 'recife', scenario: 'from_zero', careers: ['musician'], role: 'artist', bandGenre: 'mangue',
    desc: l('Um manifesto fincado na lama: maracatu, rock pesado e hip-hop numa antena parabólica cravada no mangue. Em 1994 sai o disco que põe Recife no mapa; em fevereiro de 1997, um acidente de carro cala a voz do movimento.', 'A manifesto stuck in the mud: maracatu, heavy rock and hip-hop on a satellite dish planted in the mangrove. In 1994 the record that puts Recife on the map comes out; in February 1997 a car crash silences the movement\'s voice.'),
    goal: l('Leve sua banda à fama nacional até 1998.', 'Take your band to national fame by 1998.'), unit: l('de fama', 'fame'), tiers: [25, 40, 55],
    rules17: [l('Você é músico: sem selo, só a sua banda de mangue.', 'You are a musician: no label, just your mangue band.'),
      l('Abril de 1994: o disco da lama e do caos — mangue em alta.', 'April 1994: the record of mud and chaos — mangue booms.'),
      l('Fevereiro de 1997: a morte do líder do movimento.', 'February 1997: the movement\'s leader dies.')],
    events17: [{ year: 1994, month: 3, title: l('Da lama ao caos', 'From mud to chaos'), text: l('Um disco de estreia mistura alfaias e guitarras; a imprensa do Sul descobre Recife.', 'A debut album mixes maracatu drums and guitars; the southern press discovers Recife.'), genre: 'mangue', genreMult: 1.4 },
      { year: 1997, month: 1, title: l('Silêncio no mangue', 'Silence in the mangrove'), text: l('O líder da cena morre num acidente às vésperas do Carnaval.', 'The scene\'s leader dies in a crash just before Carnival.'), genre: 'mangue', genreMult: 0.85 }],
    metric: band, fail: insolvent,
  },

  // ---------------------------------------------------------------- mais selos

  {
    id: 'studioone_1963', name: l('Studio One: Kingston, 1963', 'Studio One: Kingston, 1963'), startYear: 1963, endYear: 1970, homeCity: 'kingston', scenario: 'from_zero',
    desc: l('Um ano depois da independência, um dono de sound system abre um estúdio em Brentford Road. O ska vira o som da nova nação; em 1966 o calor desacelera a batida para o rocksteady, e em 1968 nasce o reggae.', 'A year after independence, a sound-system owner opens a studio on Brentford Road. Ska becomes the new nation\'s sound; in 1966 the heat slows the beat into rocksteady, and in 1968 reggae is born.'),
    goal: l('Venda discos de ska, rocksteady e reggae até 1970.', 'Sell ska, rocksteady and reggae records by 1970.'), unit: l('mil cópias', 'thousand copies'), tiers: [25, 60, 120],
    rules17: [l('Sound systems: seus atos jamaicanos rendem +10% nos shows.', 'Sound systems: your Jamaican acts earn +10% at shows.'),
      l('Abril de 1964: o ska na Feira Mundial de Nova York.', 'April 1964: ska at the New York World\'s Fair.'),
      l('1966: o rocksteady substitui o ska; 1968: o reggae.', '1966: rocksteady replaces ska; 1968: reggae.')],
    events17: [{ year: 1964, month: 3, title: l('Ska na Feira Mundial', 'Ska at the World\'s Fair'), text: l('O governo leva músicos jamaicanos a Nova York; um single de ska estoura em Londres.', 'The government takes Jamaican musicians to New York; a ska single breaks in London.'), genre: 'ska', genreMult: 1.35 },
      { year: 1966, month: 6, title: l('O verão do rocksteady', 'The rocksteady summer'), text: l('A batida desacelera; vozes em trio e baixo pesado.', 'The beat slows; vocal trios and heavy bass.'), genre: 'rocksteady', genreMult: 1.4 },
      { year: 1968, month: 6, title: l('Nasce o reggae', 'Reggae is born'), text: l('Um novo ritmo "do povo" toma os sound systems.', 'A new "people\'s" rhythm takes the sound systems.'), genre: 'reggae', genreMult: 1.4 }],
    perks17: () => [{ label: l('Cenário: sound systems', 'Scenario: sound systems'), values: { showRevenue: 0.1 }, act: fam(['ska', 'rocksteady', 'reggae']) }],
    setup: (s, r) => { signAct(s, r, 'ska', 'kingston', 6, 7); signAct(s, r, 'ska', 'kingston', 3, 3); },
    metric: kUnits(['ska', 'rocksteady', 'reggae']), fail: insolvent,
  },
  {
    id: 'jovemguarda_1965', name: l('Quero que vá tudo pro inferno: São Paulo, 1965', 'Jovem Guarda: São Paulo, 1965'), startYear: 1965, endYear: 1969, homeCity: 'sao_paulo', scenario: 'emerging',
    desc: l('Agosto de 1965: um programa de domingo à tarde na TV Record transforma o iê-iê-iê brasileiro em febre — calças, anéis e gírias. Em 1968 o programa acaba, e a Tropicália e a MPB dos festivais disputam a juventude.', 'August 1965: a Sunday-afternoon show on TV Record turns Brazilian "yeah-yeah-yeah" into a craze — trousers, rings and slang. In 1968 the show ends, and Tropicália and festival MPB fight for the youth.'),
    goal: l('Venda discos de Jovem Guarda até 1969.', 'Sell Jovem Guarda records by 1969.'), unit: l('mil cópias', 'thousand copies'), tiers: [150, 400, 900],
    rules17: [l('Agosto de 1965: o programa de domingo estreia — Jovem Guarda em alta e fama para seus atos.', 'August 1965: the Sunday show premieres — Jovem Guarda booms and your acts gain fame.'),
      l('Janeiro de 1968: o programa sai do ar.', 'January 1968: the show goes off the air.')],
    events17: [{ year: 1965, month: 7, title: l('Domingo à tarde na TV', 'Sunday afternoon on TV'), text: l('O programa jovem vira o mais visto do país; a juventude ganha um rei.', 'The youth show becomes the country\'s most watched; the youth get a king.'), genre: 'jovem_guarda', genreMult: 1.5, fame: 4 },
      { year: 1968, month: 0, title: l('Fim do programa', 'The show ends'), text: l('O rei sai; os festivais e a Tropicália dominam a conversa.', 'The king leaves; festivals and Tropicália dominate the conversation.'), genre: 'jovem_guarda', genreMult: 0.7 }],
    setup: (s, r) => { signAct(s, r, 'jovem_guarda', 'sao_paulo', 10, 1); signAct(s, r, 'jovem_guarda', 'rio', 5, 4); },
    metric: kUnits(['jovem_guarda']), fail: insolvent,
  },
  {
    id: 'afrobeat_1970', name: l('Afrobeat: Lagos, 1970', 'Afrobeat: Lagos, 1970'), startYear: 1970, endYear: 1979, homeCity: 'lagos', scenario: 'from_zero',
    desc: l('Saindo da guerra civil, Lagos tem petróleo, dinheiro e noites longas. Um saxofonista volta dos EUA com funk e política e funda um clube-santuário. Os militares não gostam — em fevereiro de 1977, mil soldados invadem a república dele.', 'Out of the civil war, Lagos has oil, money and long nights. A saxophonist returns from the US with funk and politics and founds a club-shrine. The military doesn\'t like it — in February 1977 a thousand soldiers raid his compound.'),
    goal: l('Leve um artista de afrobeat ao pico de fama até 1979.', 'Take an afrobeat act to peak fame by 1979.'), unit: l('de fama', 'fame'), tiers: [35, 50, 65],
    rules17: [l('Boom do petróleo: seus atos nigerianos rendem +10% nos shows.', 'Oil boom: your Nigerian acts earn +10% at shows.'),
      l('1971: o santuário abre — afrobeat em alta.', '1971: the shrine opens — afrobeat booms.'),
      l('Fevereiro de 1977: a invasão militar — afrobeat cai e seu caixa sofre.', 'February 1977: the military raid — afrobeat drops and your cash suffers.')],
    events17: [{ year: 1971, month: 0, title: l('O santuário abre', 'The shrine opens'), text: l('Shows de seis horas, músicas de vinte minutos, plateias lotadas.', 'Six-hour shows, twenty-minute songs, packed crowds.'), genre: 'afrobeat', genreMult: 1.35 },
      { year: 1977, month: 1, title: l('A invasão da república', 'The compound raid'), text: l('Soldados queimam o estúdio e as fitas; a cena se encolhe.', 'Soldiers burn the studio and the tapes; the scene shrinks.'), genre: 'afrobeat', genreMult: 0.8, cash: -6000 }],
    perks17: () => [{ label: l('Cenário: boom do petróleo', 'Scenario: oil boom'), values: { showRevenue: 0.1 }, act: fam(['afrobeat', 'highlife', 'juju']) }],
    setup: (s, r) => { signAct(s, r, 'afrobeat', 'lagos', 8, 8); signAct(s, r, 'highlife', 'lagos', 10, 5); },
    metric: (s) => { const c = C(s); c.afro23 = Math.max(c.afro23 ?? 0, bestFame(s, (a) => a.genre === 'afrobeat')); return c.afro23; }, fail: insolvent,
  },
  {
    id: 'factory_1978', name: l('Fábrica de discos: Manchester, 1978', 'Record factory: Manchester, 1978'), startYear: 1978, endYear: 1992, homeCity: 'manchester', scenario: 'from_zero',
    desc: l('Um apresentador de TV e um ator desempregado fundam um selo sem contratos escritos, com capas lindas e caras demais. Pós-punk sombrio, depois um clube enorme e vazio — até o acid house de 1988 lotar tudo. Em 1992, a falência.', 'A TV presenter and an out-of-work actor start a label with no written contracts, beautiful and overpriced sleeves. Dark post-punk, then a huge empty club — until 1988 acid house packs it out. In 1992, bankruptcy.'),
    goal: l('Conquiste discos de ouro e platina até 1992.', 'Earn gold and platinum records by 1992.'), unit: l('certificações', 'certifications'), tiers: [2, 5, 10],
    rules17: [l('Capas caras: seus artistas esperam adiantamentos 15% menores (contratos de aperto de mão).', 'Pricey sleeves: your artists expect 15% smaller advances (handshake deals).'),
      l('Maio de 1980: a morte do vocalista da banda-símbolo; 1983: o single de 12" mais vendido da história.', 'May 1980: the flagship band\'s singer dies; 1983: the best-selling 12" single ever.'),
      l('1988: acid house e Madchester.', '1988: acid house and Madchester.')],
    events17: [{ year: 1979, month: 5, title: l('Prazeres desconhecidos', 'Unknown pleasures'), text: l('Uma estreia sombria com capa de ondas de rádio vira referência.', 'A dark debut with a radio-wave sleeve becomes a landmark.'), genre: 'post_punk', genreMult: 1.3 },
      { year: 1983, month: 2, title: l('Uma segunda-feira azul', 'A blue Monday'), text: l('Um single de 12" com sequenciador vira o mais vendido da história do formato.', 'A sequenced 12" single becomes the format\'s best seller ever.'), genre: 'synthpop', genreMult: 1.3 },
      { year: 1988, month: 5, title: l('O segundo verão do amor', 'The second summer of love'), text: l('O clube vazio lota: acid house às sextas.', 'The empty club packs out: acid house on Fridays.'), genre: 'acid_house', genreMult: 1.5 },
      { year: 1992, month: 10, title: l('A fábrica fecha', 'The factory closes'), text: l('Dívidas de um disco caro demais derrubam o selo.', 'Debts from one overpriced album bring the label down.'), genre: 'indie', genreMult: 0.9, cash: -6000 }],
    perks17: () => [{ label: l('Cenário: contratos de aperto de mão', 'Scenario: handshake deals'), values: { advance: -0.15 } }],
    setup: (s, r) => { adjustCash(s, 0.6); signAct(s, r, 'post_punk', 'manchester', 4, 4); signAct(s, r, 'post_punk', 'manchester', 3, 4); },
    metric: certs, fail: insolvent,
  },
  {
    id: 'defjam_1984', name: l('Selo de dormitório: Nova York, 1984', 'Dorm-room label: New York, 1984'), startYear: 1984, endYear: 1991, homeCity: 'new_york', scenario: 'from_zero',
    desc: l('Um estudante grava rap num quarto da NYU e se junta a um promotor de festas do Queens. Em 1986 uma parceria rap-rock bota o hip-hop na MTV e o primeiro álbum de rap chega ao número 1.', 'A student records rap in an NYU dorm room and teams up with a Queens party promoter. In 1986 a rap-rock collaboration puts hip-hop on MTV and the first rap album hits number 1.'),
    goal: l('Coloque hip-hop no top 10 até 1991.', 'Put hip-hop in the top 10 by 1991.'), unit: l('top 10', 'top 10s'), tiers: [1, 3, 6],
    rules17: [l('Caixa de estudante: começa com 40% do caixa.', 'Student budget: starts with 40% of the cash.'),
      l('Julho de 1986: rap e rock juntos na MTV — hip-hop em alta.', 'July 1986: rap and rock together on MTV — hip-hop booms.'),
      l('Agosto de 1988: um programa diário de rap na TV.', 'August 1988: a daily rap show on TV.')],
    events17: [{ year: 1986, month: 6, title: l('Rap e rock na mesma faixa', 'Rap and rock on the same track'), text: l('Um clipe derruba a parede entre os gêneros; o hip-hop entra na MTV.', 'A video knocks down the wall between genres; hip-hop enters MTV.'), genre: 'hiphop', genreMult: 1.35, fame: 3 },
      { year: 1988, month: 7, title: l('Rap todo dia na TV', 'Rap on TV every day'), text: l('O canal de clipes cria um programa só de rap — vira o mais visto.', 'The video channel launches a rap-only show — it becomes the most watched.'), genre: 'hiphop', genreMult: 1.25 }],
    setup: (s, r) => { adjustCash(s, 0.4); signAct(s, r, 'hiphop', 'new_york', 6, 1); signAct(s, r, 'hiphop', 'new_york', 9, 3); },
    metric: top10, fail: insolvent,
  },
  {
    id: 'axe_1985', name: l('Axé music: Salvador, 1985', 'Axé music: Salvador, 1985'), startYear: 1985, endYear: 1995, homeCity: 'salvador', scenario: 'from_zero',
    desc: l('1985: um cantor de trio elétrico mistura frevo, reggae e ijexá e o Brasil inteiro dança. Os blocos afro lançam o samba-reggae; em 1992 uma cantora para a avenida e o axé vira o som do verão nacional.', '1985: a trio-elétrico singer mixes frevo, reggae and ijexá and all of Brazil dances. The afro blocs launch samba-reggae; in 1992 a singer stops the avenue and axé becomes the national summer sound.'),
    goal: l('Venda discos de axé até 1995.', 'Sell axé records by 1995.'), unit: l('mil cópias', 'thousand copies'), tiers: [60, 250, 600],
    rules17: [l('Carnaval: seus atos de axé rendem +15% nos shows.', 'Carnival: your axé acts earn +15% at shows.'),
      l('1987: o samba-reggae dos blocos afro; 1992: o axé conquista o país.', '1987: the afro blocs\' samba-reggae; 1992: axé conquers the country.')],
    events17: [{ year: 1987, month: 1, title: l('O faraó do Pelourinho', 'The pharaoh of Pelourinho'), text: l('Um bloco afro transforma o Carnaval com o samba-reggae.', 'An afro bloc transforms Carnival with samba-reggae.'), genre: 'axe', genreMult: 1.25 },
      { year: 1992, month: 1, title: l('O canto da cidade', 'The song of the city'), text: l('Uma cantora de Salvador vende milhões; o axé vira o som do verão.', 'A Salvador singer sells millions; axé becomes the summer sound.'), genre: 'axe', genreMult: 1.45, fame: 3 }],
    perks17: () => [{ label: l('Cenário: Carnaval', 'Scenario: Carnival'), values: { showRevenue: 0.15 }, act: fam(['axe']) }],
    setup: (s, r) => { signAct(s, r, 'axe', 'salvador', 8, 6); signAct(s, r, 'axe', 'salvador', 4, 1); },
    metric: kUnits(['axe']), fail: insolvent,
  },
  {
    id: 'sertanejo_2005', name: l('Sertanejo universitário: Goiânia, 2005', 'College sertanejo: Goiânia, 2005'), startYear: 2005, endYear: 2015, homeCity: 'goiania', scenario: 'emerging',
    desc: l('Festas de universidade em Goiânia e Campo Grande trocam a viola caipira por baladas pop: duplas jovens gravam DVDs ao vivo e liberam as músicas de graça. Em 2011, um refrão vira hit mundial; em 2015 as cantoras tomam o gênero.', 'University parties in Goiânia and Campo Grande swap the country guitar for pop ballads: young duos shoot live DVDs and give songs away free. In 2011 a chorus becomes a global hit; in 2015 women take over the genre.'),
    goal: l('Venda (e transmita) sertanejo universitário até 2015.', 'Sell (and stream) college sertanejo by 2015.'), unit: l('mil unidades', 'thousand units'), tiers: [80, 300, 800],
    rules17: [l('DVD ao vivo: seus atos sertanejos rendem +15% nos shows.', 'Live DVD: your sertanejo acts earn +15% at shows.'),
      l('2011: um refrão sertanejo toca no mundo inteiro.', '2011: a sertanejo chorus plays all over the world.'),
      l('2015: o "feminejo" — novas estrelas femininas.', '2015: "feminejo" — new female stars.')],
    events17: [{ year: 2008, month: 3, title: l('A dupla do DVD', 'The DVD duo'), text: l('Um DVD gravado ao vivo vira o mais vendido do ano.', 'A live DVD becomes the year\'s best seller.'), genre: 'sertanejo_univ', genreMult: 1.25 },
      { year: 2011, month: 7, title: l('Um refrão para o mundo', 'A chorus for the world'), text: l('Jogadores de futebol dançam e o hit chega ao topo em dezenas de países.', 'Footballers dance and the hit reaches the top in dozens of countries.'), genre: 'sertanejo_univ', genreMult: 1.4, fame: 3 },
      { year: 2015, month: 5, title: l('O feminejo', 'Feminejo'), text: l('Cantoras sertanejas lideram as plataformas.', 'Women sertanejo singers lead the platforms.'), genre: 'sertanejo_univ', genreMult: 1.2 }],
    perks17: () => [{ label: l('Cenário: DVD ao vivo', 'Scenario: live DVD'), values: { showRevenue: 0.15 }, act: fam(['sertanejo_univ', 'sertanejo']) }],
    setup: (s, r) => { signAct(s, r, 'sertanejo_univ', 'goiania', 12, 2); signAct(s, r, 'sertanejo_univ', 'goiania', 6, 2); },
    metric: kUnits(['sertanejo_univ']), fail: insolvent,
  },
];

// capital de fundação: entra antes do careers19 cobrar o pacote inicial (conta como caixa inicial)
for (const d of SCENARIOS23) {
  if (!d.capital23) continue;
  const inner = d.setup;
  const cap = d.capital23;
  d.setup = (s, r) => { const v = money(s, cap); s.player.cash += v; s.player.initialCash += v; inner?.(s, r); };
}

// mesma lista do r17 (regras, marcos, perks e regra mensal funcionam por lá) e lista geral de cenários
for (const d of SCENARIOS23) {
  if (!SCENARIOS17.some((x) => x.id === d.id)) SCENARIOS17.push(d);
  if (!scenarioById[d.id]) { SCENARIOS.push(d); scenarioById[d.id] = d; }
}
export const scenario23 = (id?: string): Scenario23 | undefined => (id ? SCENARIOS23.find((x) => x.id === id) : undefined);
/** carreiras do cenário (para o cartão da interface) */
export const scenarioCareers23 = (d: ScenarioDef): string[] => d.careers ?? [];

const active23 = (s: GameState): Scenario23 | undefined => {
  const run = liveOf(s).scenario;
  return run && !run.done ? scenario23(run.id) : undefined;
};

// depois do careers19 (importado antes deste arquivo): ajustes no negócio já aberto
registerSimHook('newgame', 'scenario23', (s) => { active23(s)?.after23?.(s); });

// contadores próprios das metas de profissão (o mês dos negócios já rodou)
registerSimHook('month', 'scenario23', (s) => {
  const d = active23(s);
  if (!d) return;
  const c = C(s);
  if (d.id === 'manager_1961') {
    // top 10 ganhos pelos clientes desde que viraram clientes (marca o ponto de partida de cada um)
    for (const k of ventures(s).mg.clients) {
      const a = s.acts[k.actId];
      if (!a) continue;
      const key = `m23:${a.id}`;
      if (c[key] === undefined) c[key] = a.hits;
      if (a.hits > c[key]) { c.mgrHits23 = (c.mgrHits23 ?? 0) + (a.hits - c[key]); c[key] = a.hits; }
      c.mgrFame23 = Math.max(c.mgrFame23 ?? 0, Math.round(a.fame));
    }
  } else if (d.id === 'cbgb_1973') {
    const h = liveOf(s).venue?.history.at(-1);
    const key = h ? h.year * 12 + h.month : -1;
    if (h && key !== c.full23k) { c.full23k = key; if (h.occupancy >= 80) c.full23 = (c.full23 ?? 0) + 1; }
  } else if (d.id === 'memphis_studio_1961') {
    c.sess23 = (c.sess23 ?? 0) + vl(s, 'studio').reduce((t, v) => t + (v.booked ?? []).reduce((u, b) => u + b.n, 0), 0);
  }
});

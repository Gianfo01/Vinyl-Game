// Rodada 17 — mais cenários históricos (pesquisa de época), cada um com estado inicial, meta com medalhas e REGRAS
// ESPECIAIS: marcos reais datados (viram eventos do mês pelo mesmo canal dos pacotes de universo: muda a
// popularidade do gênero, a fama ou o caixa, com notícia) e bônus/penalidades enquanto o cenário corre (perks com
// rótulo — aparecem nos detalhamentos "por quê"). Entram na mesma lista SCENARIOS (tela de cenários e Novo Jogo).

import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { addStress } from '../stress17';
import { emitFact } from '../facts17';
import { registerPerkSource, type PerkEntry } from '../perks';
import { registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, money, nextId } from '../util';
import { ownerOf } from './people/owner';
import { playerPerson } from './life';
import { SCENARIOS, adjustCash, bestFame, genreUnits, insolvent, liveOf, scenarioById, signAct, type CustomEvent, type ScenarioDef } from './live';

export interface Scenario17 extends ScenarioDef {
  /** regras especiais em texto (cartão do cenário e aba Metas) */
  rules17: L[];
  /** marcos reais datados (viram notícia e mexem no mundo no mês certo) */
  events17?: Omit<CustomEvent, 'fired'>[];
  /** bônus/penalidades enquanto o cenário não terminou */
  perks17?: (s: GameState) => PerkEntry[];
  /** regra mensal própria */
  month17?: (s: GameState) => void;
}

const fam = (gs: string[]) => (_s: GameState, a: { genre: string }) => gs.includes(a.genre);
const cashPct = (s: GameState, b: Record<string, number>) => Math.round((toReal(s.player.cash, s.year) / Math.max(1, b.cashReal ?? 1)) * 100);
const certs = (s: GameState, b: Record<string, number>) => s.player.stats.gold + s.player.stats.platinum - (b.certs ?? 0);

export const SCENARIOS17: Scenario17[] = [
  {
    id: 'sun_1954', name: l('Sun Records: Memphis, 1954', 'Sun Records: Memphis, 1954'), startYear: 1954, endYear: 1958, homeCity: 'memphis', scenario: 'from_zero',
    desc: l('Um estúdio pequeno grava caminhoneiros, cantores gospel e bluesmen por poucos dólares. Um dia, alguém mistura country com rhythm and blues.', 'A small studio records truck drivers, gospel singers and bluesmen for a few dollars. One day someone mixes country with rhythm and blues.'),
    goal: l('Emplaque sucessos no top 10 nacional até 1958.', 'Land national top-10 hits by 1958.'), unit: l('top 10', 'top 10s'), tiers: [1, 3, 6],
    rules17: [l('Caixa curtíssimo (metade do normal): grave barato e venda contratos se precisar.', 'Very tight cash (half the usual): record cheap and sell contracts if you must.'),
      l('Rádio segregada até 1956: seus atos de R&B e blues têm −10% de apelo.', 'Segregated radio until 1956: your R&B and blues acts get −10% appeal.'),
      l('Janeiro de 1956: o rockabilly explode no país todo.', 'January 1956: rockabilly explodes nationwide.')],
    events17: [{ year: 1956, month: 0, title: l('O rockabilly toma o país', 'Rockabilly takes the country'), text: l('Um single de Memphis chega ao topo nacional e a TV disputa os rapazes de topete.', 'A Memphis single tops the national charts and TV fights over the quiffed boys.'), genre: 'rockabilly', genreMult: 1.45 },
      { year: 1957, month: 5, title: l('Rock and roll na TV nacional', 'Rock and roll on national TV'), text: l('Programas de auditório abrem espaço para o novo som.', 'Variety shows make room for the new sound.'), genre: 'rnr', genreMult: 1.2 }],
    perks17: (s) => (s.year < 1956 ? [{ label: l('Cenário: rádio segregada', 'Scenario: segregated radio'), values: { appeal: -0.1 }, act: fam(['rnb', 'chicago_blues', 'delta_blues', 'doo_wop', 'jump_blues']) }] : []),
    setup: (s, r) => { adjustCash(s, 0.5); signAct(s, r, 'rockabilly', 'memphis', 3, 3); signAct(s, r, 'chicago_blues', 'memphis', 6, 1); },
    metric: (s, b) => s.player.stats.top10s - (b.top10s ?? 0), fail: insolvent,
  },
  {
    id: 'motown_1960', name: l('Hitsville: Detroit, 1960', 'Hitsville: Detroit, 1960'), startYear: 1960, endYear: 1967, homeCity: 'detroit', scenario: 'from_zero',
    desc: l('Uma casa transformada em estúdio, um empréstimo de família e uma ideia: fazer soul como uma linha de montagem de sucessos — o som da América jovem.', 'A house turned into a studio, a family loan and an idea: make soul like a hit assembly line — the sound of young America.'),
    goal: l('Chegue ao número 1 o máximo de vezes até 1967.', 'Reach number 1 as many times as you can by 1967.'), unit: l('números 1', 'number 1s'), tiers: [1, 3, 6],
    rules17: [l('Começa com só 30% do caixa (o empréstimo da família).', 'Starts with only 30% of the cash (the family loan).'),
      l('Controle de qualidade: seus atos de soul e girl group ganham +1 de qualidade nas músicas.', 'Quality control: your soul and girl-group acts get +1 song quality.'),
      l('1964: a invasão britânica disputa as mesmas paradas.', '1964: the British Invasion fights for the same charts.')],
    events17: [{ year: 1964, month: 1, title: l('A invasão britânica chega', 'The British Invasion lands'), text: l('Bandas inglesas de beat dominam a TV americana; o soul precisa reagir.', 'English beat bands dominate American TV; soul has to answer.'), genre: 'beat', genreMult: 1.4 },
      { year: 1965, month: 6, title: l('O soul cruza todas as fronteiras', 'Soul crosses every border'), text: l('Rádios brancas e negras tocam as mesmas canções.', 'White and Black stations play the same songs.'), genre: 'soul', genreMult: 1.25 }],
    perks17: () => [{ label: l('Cenário: controle de qualidade', 'Scenario: quality control'), values: { songQ: 1 }, act: fam(['soul', 'girl_group', 'doo_wop']) }],
    setup: (s, r) => { adjustCash(s, 0.3); signAct(s, r, 'doo_wop', 'detroit', 5, 4); signAct(s, r, 'girl_group', 'detroit', 3, 3); },
    metric: (s, b) => s.player.stats.number1s - (b.number1s ?? 0), fail: insolvent,
  },
  {
    id: 'british_1963', name: l('Invasão britânica: Londres, 1963', 'British Invasion: London, 1963'), startYear: 1963, endYear: 1966, homeCity: 'london', scenario: 'emerging',
    desc: l('A beatlemania tomou o Reino Unido. A América ainda não ouviu nada — até um programa de domingo à noite em fevereiro de 1964.', 'Beatlemania has taken Britain. America hasn\'t heard a thing — until a Sunday-night TV show in February 1964.'),
    goal: l('Conquiste discos de ouro e platina até 1966.', 'Earn gold and platinum records by 1966.'), unit: l('certificações', 'certifications'), tiers: [1, 3, 6],
    rules17: [l('Fevereiro de 1964: 73 milhões veem uma banda inglesa na TV americana — beat em alta e seus atos ganham fama.', 'February 1964: 73 million watch an English band on US TV — beat booms and your acts gain fame.'),
      l('Bandas de beat suas rendem +15% nos shows (turnês lotadas).', 'Your beat bands earn +15% at shows (sold-out tours).')],
    events17: [{ year: 1964, month: 1, title: l('Domingo à noite na TV americana', 'Sunday night on American TV'), text: l('Uma banda inglesa para a América: o beat vira febre.', 'An English band stops America: beat becomes a craze.'), genre: 'beat', genreMult: 1.5, fame: 6 },
      { year: 1965, month: 7, title: l('Estádios pela primeira vez', 'Stadiums for the first time'), text: l('Um show de rock enche um estádio de beisebol.', 'A rock show fills a baseball stadium.'), genre: 'pop_rock', genreMult: 1.2 }],
    perks17: () => [{ label: l('Cenário: beatlemania', 'Scenario: Beatlemania'), values: { showRevenue: 0.15 }, act: fam(['beat', 'pop_rock', 'rnr']) }],
    setup: (s, r) => { signAct(s, r, 'beat', 'liverpool', 12, 4); signAct(s, r, 'beat', 'london', 6, 5); },
    metric: certs, fail: insolvent,
  },
  {
    id: 'bossa_1958', name: l('Chega de Saudade: Rio, 1958', 'Chega de Saudade: Rio, 1958'), startYear: 1958, endYear: 1964, homeCity: 'rio', scenario: 'from_zero',
    desc: l('Apartamentos de Copacabana, violão baixinho e uma batida nova. Em 1962 a bossa nova toca no Carnegie Hall; em 1964 o golpe muda o clima.', 'Copacabana flats, a soft guitar and a new beat. In 1962 bossa nova plays Carnegie Hall; in 1964 the coup changes the mood.'),
    goal: l('Venda discos de bossa nova até 1964.', 'Sell bossa nova records by 1964.'), unit: l('mil cópias', 'thousand copies'), tiers: [10, 40, 120],
    rules17: [l('Novembro de 1962: o concerto no Carnegie Hall abre os EUA para a bossa.', 'November 1962: the Carnegie Hall concert opens the US to bossa.'),
      l('Abril de 1964: golpe militar — gêneros brasileiros perdem fôlego.', 'April 1964: military coup — Brazilian genres lose steam.')],
    events17: [{ year: 1962, month: 10, title: l('Bossa nova no Carnegie Hall', 'Bossa nova at Carnegie Hall'), text: l('Músicos brasileiros lotam o templo de Nova York; o jazz americano adota a batida.', 'Brazilian musicians pack the New York temple; American jazz adopts the beat.'), genre: 'bossa', genreMult: 1.6 },
      { year: 1964, month: 3, title: l('Golpe militar no Brasil', 'Military coup in Brazil'), text: l('Clima de censura e medo; a música jovem procura outros caminhos.', 'A climate of censorship and fear; young music looks for other paths.'), genre: 'bossa', genreMult: 0.8 }],
    setup: (s, r) => { signAct(s, r, 'bossa', 'rio', 5, 1); signAct(s, r, 'samba_cancao', 'rio', 10, 1); },
    metric: (s) => Math.round(genreUnits(s, ['bossa']) / 1000), fail: insolvent,
  },
  {
    id: 'punk_1976', name: l('Anarquia: Londres, 1976', 'Anarchy: London, 1976'), startYear: 1976, endYear: 1979, homeCity: 'london', scenario: 'from_zero',
    desc: l('Desemprego, alfinetes e três acordes. Um palavrão na TV ao vivo vira manchete — e escândalo vende.', 'Unemployment, safety pins and three chords. A swear word on live TV makes headlines — and scandal sells.'),
    goal: l('Coloque punk no top 10 até 1979.', 'Put punk in the top 10 by 1979.'), unit: l('top 10', 'top 10s'), tiers: [1, 2, 4],
    rules17: [l('Dezembro de 1976: palavrões na TV ao vivo — o punk vira notícia nacional.', 'December 1976: swearing on live TV — punk becomes national news.'),
      l('Junho de 1977: a rádio pública proíbe um single no Jubileu — e ele vende mais.', 'June 1977: public radio bans a single during the Jubilee — and it sells more.'),
      l('Cena do-it-yourself: artistas esperam adiantamentos 20% menores.', 'Do-it-yourself scene: artists expect 20% smaller advances.')],
    events17: [{ year: 1976, month: 11, title: l('Palavrões no horário nobre', 'Swearing in prime time'), text: l('Uma entrevista ao vivo vira escândalo: "A imundície e a fúria", diz o jornal.', 'A live interview becomes a scandal: "The filth and the fury", says the paper.'), genre: 'punk', genreMult: 1.35, fame: 4 },
      { year: 1977, month: 5, title: l('Single proibido no Jubileu', 'Single banned at the Jubilee'), text: l('A rádio pública não toca; o país inteiro quer ouvir.', 'Public radio won\'t play it; the whole country wants to hear it.'), genre: 'punk', genreMult: 1.2 },
      { year: 1979, month: 0, title: l('O punk vira pós-punk', 'Punk turns post-punk'), text: l('A primeira onda se dispersa; sintetizadores e guitarras frias assumem.', 'The first wave scatters; synths and cold guitars take over.'), genre: 'punk', genreMult: 0.75 }],
    perks17: () => [{ label: l('Cenário: punks cobram pouco', 'Scenario: punks come cheap'), values: { advance: -0.2 } }],
    setup: (s, r) => { signAct(s, r, 'punk', 'london', 4, 4); signAct(s, r, 'pub_rock', 'london', 8, 4); },
    metric: (s, b) => s.player.stats.top10s - (b.top10s ?? 0), fail: insolvent,
  },
  {
    id: 'disco_1977', name: l('Febre da discoteca: Nova York, 1977', 'Disco fever: New York, 1977'), startYear: 1977, endYear: 1980, homeCity: 'new_york', scenario: 'emerging',
    desc: l('A boate mais famosa do mundo abre em abril de 1977; um filme de sábado à noite vira trilha de uma geração. Em julho de 1979, discos são explodidos num estádio de beisebol.', 'The world\'s most famous club opens in April 1977; a Saturday-night film becomes a generation\'s soundtrack. In July 1979, records are blown up in a baseball stadium.'),
    goal: l('Lucre com a febre e chegue a 1980 com o caixa real maior que o inicial.', 'Cash in on the fever and reach 1980 with more real cash than you started with.'), unit: l('% do caixa inicial', '% of starting cash'), tiers: [100, 180, 320],
    rules17: [l('Novembro de 1977: o filme da discoteca leva o gênero ao auge.', 'November 1977: the disco film takes the genre to its peak.'),
      l('Julho de 1979: a "Noite da Demolição da Disco" — a popularidade da disco despenca.', 'July 1979: "Disco Demolition Night" — disco\'s popularity crashes.'),
      l('Diversifique antes da queda: quem só tiver disco em 1980 sofre.', 'Diversify before the crash: anyone with only disco in 1980 suffers.')],
    events17: [{ year: 1977, month: 10, title: l('A febre de sábado à noite', 'Saturday night fever'), text: l('Um filme e sua trilha viram fenômeno mundial.', 'A film and its soundtrack become a worldwide phenomenon.'), genre: 'disco', genreMult: 1.45 },
      { year: 1979, month: 6, title: l('Noite da Demolição da Disco', 'Disco Demolition Night'), text: l('Um estádio explode pilhas de discos; rádios abandonam o gênero.', 'A stadium blows up piles of records; radio abandons the genre.'), genre: 'disco', genreMult: 0.45 }],
    setup: (s, r) => { signAct(s, r, 'disco', 'new_york', 15, 1); signAct(s, r, 'disco', 'philadelphia', 8, 3); },
    metric: cashPct, fail: insolvent,
  },
  {
    id: 'mtv_1981', name: l('Eu quero minha MTV: Nova York, 1981', 'I want my MTV: New York, 1981'), startYear: 1981, endYear: 1986, homeCity: 'new_york', scenario: 'emerging',
    desc: l('1º de agosto de 1981: um canal só de videoclipes estreia com "o vídeo matou a estrela do rádio". A imagem passa a valer tanto quanto o som.', 'August 1, 1981: a music-video-only channel launches with "video killed the radio star". Image now matters as much as sound.'),
    goal: l('Transforme um artista seu num astro (fama máxima) até 1986.', 'Turn one of your acts into a star (top fame) by 1986.'), unit: l('de fama', 'fame'), tiers: [45, 62, 80],
    rules17: [l('Agosto de 1981: o canal de clipes estreia — new wave e synth-pop em alta.', 'August 1981: the video channel launches — new wave and synth-pop boom.'),
      l('Imagem conta: seus atos de new wave, synth-pop e dance-pop têm +8% de apelo.', 'Image counts: your new wave, synth-pop and dance-pop acts get +8% appeal.'),
      l('1984: uma segunda invasão britânica de sintetizadores.', '1984: a second British invasion of synths.')],
    events17: [{ year: 1981, month: 7, title: l('O canal de clipes estreia', 'The video channel launches'), text: l('O primeiro clipe exibido anuncia o fim de uma era.', 'The first video aired announces the end of an era.'), genre: 'new_wave', genreMult: 1.35 },
      { year: 1984, month: 0, title: l('Segunda invasão britânica', 'Second British invasion'), text: l('Bandas inglesas de sintetizador dominam os clipes.', 'English synth bands dominate the videos.'), genre: 'synthpop', genreMult: 1.35 }],
    perks17: () => [{ label: l('Cenário: a imagem conta', 'Scenario: image counts'), values: { appeal: 0.08 }, act: fam(['new_wave', 'synthpop', 'dance_pop']) }],
    setup: (s, r) => { signAct(s, r, 'new_wave', 'new_york', 10, 4); signAct(s, r, 'synthpop', 'london', 6, 2); },
    metric: (s) => bestFame(s), fail: insolvent,
  },
  {
    id: 'rescue_1986', name: l('Resgate de um selo falido: Manchester, 1986', 'Rescuing a bankrupt label: Manchester, 1986'), startYear: 1986, endYear: 1991, homeCity: 'manchester', scenario: 'established',
    desc: l('Você comprou por uma libra um selo cult de Manchester: elenco respeitado, um clube que dá prejuízo e dívidas com o banco. A cena "Madchester" está para explodir.', 'You bought a cult Manchester label for one pound: a respected roster, a loss-making club and bank debts. The "Madchester" scene is about to explode.'),
    goal: l('Pague as dívidas e feche 1991 com caixa no azul (mil dólares reais).', 'Pay the debts and close 1991 in the black (thousand real dollars).'), unit: l('mil dólares reais', 'thousand real dollars'), tiers: [20, 120, 400],
    rules17: [l('Começa com 10% do caixa e um empréstimo pesado do banco (36 parcelas).', 'Starts with 10% of the cash and a heavy bank loan (36 instalments).'),
      l('1988: o acid house e as raves mudam a noite de Manchester.', '1988: acid house and raves change Manchester\'s nightlife.'),
      l('Seis meses no vermelho e o banco fecha o selo.', 'Six months in the red and the bank shuts the label.')],
    events17: [{ year: 1988, month: 5, title: l('O segundo verão do amor', 'The second summer of love'), text: l('Raves e acid house enchem armazéns; guitarras e batidas se misturam.', 'Raves and acid house fill warehouses; guitars and beats mix.'), genre: 'acid_house', genreMult: 1.5 },
      { year: 1989, month: 10, title: l('Madchester no horário nobre', 'Madchester in prime time'), text: l('Duas bandas da cidade tocam no mesmo programa de TV; o país inteiro olha para Manchester.', 'Two local bands play the same TV show; the whole country looks at Manchester.'), genre: 'indie', genreMult: 1.3, fame: 4 }],
    setup: (s, r) => {
      adjustCash(s, 0.1);
      const amount = money(s, 90000);
      const rate = 0.16;
      const monthly = Math.round((amount * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -36)));
      s.player.loans.push({ id: nextId(s, 'ln'), principal: amount, balance: amount, rate, monthly, startWeek: s.week });
      signAct(s, r, 'post_punk', 'manchester', 22, 4); signAct(s, r, 'indie', 'manchester', 6, 4);
    },
    metric: (s) => Math.round((toReal(s.player.cash, s.year) - toReal(s.player.loans.reduce((t, x) => t + x.balance, 0), s.year)) / 100000), fail: insolvent,
  },
  {
    id: 'heir_1995', name: l('Herdeiro de uma dinastia: Nashville, 1995', 'Heir to a dynasty: Nashville, 1995'), startYear: 1995, endYear: 2005, homeCity: 'nashville', scenario: 'established',
    desc: l('Seu avô fundou a gravadora; seu pai morreu de repente. Aos 24 anos você herda estrelas envelhecidas, uma família que cobra resultados e um mercado que vai virar digital.', 'Your grandfather founded the label; your father died suddenly. At 24 you inherit ageing stars, a family that demands results and a market about to go digital.'),
    goal: l('Some discos de ouro e platina até 2005 sem afundar o legado.', 'Add up gold and platinum records by 2005 without sinking the legacy.'), unit: l('certificações', 'certifications'), tiers: [3, 8, 15],
    rules17: [l('Você começa com 24 anos, reputação alta e duas estrelas veteranas do country.', 'You start at 24, with a high reputation and two veteran country stars.'),
      l('A família cobra: todo ano em que o caixa real cair abaixo da metade do inicial, +10 de estresse.', 'The family demands: every year your real cash drops below half the start, +10 stress.'),
      l('Nome de família: +2 pts nas propostas a artistas.', 'Family name: +2 pts on offers to artists.')],
    perks17: () => [{ label: l('Cenário: nome de família', 'Scenario: family name'), values: { offer: 0.02 } }],
    month17: (s) => {
      const run = liveOf(s).scenario;
      if (s.month !== 0 || !run || toReal(s.player.cash, s.year) >= (run.base.cashReal ?? 0) * 0.5) return;
      const p = playerPerson(s);
      if (p) addStress(s, p.id, 10, l('A família cobra resultados do herdeiro', 'The family demands results from the heir'));
    },
    setup: (s, r) => {
      const o = ownerOf(s);
      o.born = s.year - 24;
      const p = playerPerson(s);
      if (p) p.born = o.born;
      const rep = s.player.reputation;
      rep.institutional = Math.max(rep.institutional, 65); rep.artists = Math.max(rep.artists, 55);
      const a = signAct(s, r, 'country', 'nashville', 55, 1); a.formed = s.year - 28; a.debutYear = s.year - 27;
      const b = signAct(s, r, 'country', 'nashville', 42, 4); b.formed = s.year - 18; b.debutYear = s.year - 17;
    },
    metric: certs, fail: insolvent,
  },
  {
    id: 'stream_2015', name: l('A virada do streaming: Estocolmo, 2015', 'The streaming turn: Stockholm, 2015'), startYear: 2015, endYear: 2020, homeCity: 'stockholm', scenario: 'emerging',
    desc: l('Na cidade que inventou o streaming de música e exporta compositores de hits para o mundo, as playlists decidem quem estoura.', 'In the city that invented music streaming and exports hit songwriters to the world, playlists decide who breaks.'),
    goal: l('Leve um artista seu à fama mundial até 2020.', 'Take one of your acts to global fame by 2020.'), unit: l('de fama', 'fame'), tiers: [40, 58, 75],
    rules17: [l('Fábrica de hits: suas músicas de pop nórdico, dance-pop e EDM ganham +1 de qualidade.', 'Hit factory: your Nordic pop, dance-pop and EDM songs get +1 quality.'),
      l('2017: playlists editoriais dominam o consumo — dance-pop em alta.', '2017: editorial playlists dominate listening — dance-pop booms.')],
    events17: [{ year: 2017, month: 2, title: l('As playlists mandam', 'Playlists rule'), text: l('Mais da metade das audições vem de listas editoriais.', 'More than half of all listening comes from editorial playlists.'), genre: 'dance_pop', genreMult: 1.25 }],
    perks17: () => [{ label: l('Cenário: fábrica de hits', 'Scenario: hit factory'), values: { songQ: 1 }, act: fam(['nordic_pop', 'dance_pop', 'edm']) }],
    setup: (s, r) => { signAct(s, r, 'nordic_pop', 'stockholm', 10, 1); signAct(s, r, 'edm', 'stockholm', 8, 1); },
    metric: (s) => bestFame(s), fail: insolvent,
  },
  {
    id: 'latin_2016', name: l('O mundo em espanhol: San Juan, 2016', 'The world in Spanish: San Juan, 2016'), startYear: 2016, endYear: 2021, homeCity: 'san_juan', scenario: 'emerging',
    desc: l('Em 2017 uma música em espanhol vira o vídeo mais visto da história e quebra recordes de streaming. O reggaeton e o trap latino saem de Porto Rico para o planeta.', 'In 2017 a Spanish-language song becomes the most-watched video ever and breaks streaming records. Reggaeton and Latin trap leave Puerto Rico for the planet.'),
    goal: l('Chegue ao número 1 com música latina até 2021.', 'Reach number 1 with Latin music by 2021.'), unit: l('números 1', 'number 1s'), tiers: [1, 2, 4],
    rules17: [l('Janeiro de 2017: o hit em espanhol quebra recordes — reggaeton em alta.', 'January 2017: the Spanish-language hit breaks records — reggaeton booms.'),
      l('Colaborações rendem: seus atos latinos têm +10% nas paradas.', 'Collabs pay: your Latin acts get +10% on the charts.')],
    events17: [{ year: 2017, month: 0, title: l('Um hit em espanhol para o mundo', 'A Spanish-language hit stops the world'), text: l('Recorde de visualizações e semanas no topo em dezenas de países.', 'Record views and weeks at the top in dozens of countries.'), genre: 'reggaeton', genreMult: 1.5 },
      { year: 2018, month: 5, title: l('O trap latino vira mainstream', 'Latin trap goes mainstream'), text: l('Novos nomes de Porto Rico lotam arenas.', 'New names from Puerto Rico fill arenas.'), genre: 'latin_trap', genreMult: 1.35 }],
    perks17: () => [{ label: l('Cenário: colaborações latinas', 'Scenario: Latin collabs'), values: { chartUnits: 0.1 }, act: fam(['reggaeton', 'latin_trap', 'pop_latino']) }],
    setup: (s, r) => { signAct(s, r, 'reggaeton', 'san_juan', 20, 1); signAct(s, r, 'latin_trap', 'san_juan', 8, 1); },
    metric: (s, b) => s.player.stats.number1s - (b.number1s ?? 0), fail: insolvent,
  },
];

// mesma lista de cenários (tela de cenários, Novo Jogo, aba Metas)
for (const d of SCENARIOS17) if (!scenarioById[d.id]) { SCENARIOS.push(d); scenarioById[d.id] = d; }
export const scenario17 = (id?: string): Scenario17 | undefined => (id ? SCENARIOS17.find((x) => x.id === id) : undefined);

const activeDef = (s: GameState): Scenario17 | undefined => {
  const run = liveOf(s).scenario;
  return run && !run.done ? scenario17(run.id) : undefined;
};

registerPerkSource('scenario17', (s) => activeDef(s)?.perks17?.(s) ?? []);

// marcos datados: entram no canal de eventos personalizados (mesmo laço mensal dos pacotes de universo)
registerSimHook('newgame', 'scenario17', (s) => {
  const run = liveOf(s).scenario;
  const d = run ? scenario17(run.id) : undefined;
  if (!d) return;
  const lv = liveOf(s);
  for (const e of d.events17 ?? []) if (e.year > s.year || (e.year === s.year && e.month >= s.month)) lv.events.push({ ...e });
  emitFact(s, { kind: 'scenario', actors: ['player'], place: s.config.homeCity, severity: 30, visibility: 'public', tags: ['good'], src: 'scenario17',
    text: fmtL(l('Começa o cenário "{n}": {g}', 'Scenario "{n}" begins: {g}'), { n: d.name, g: d.goal }) });
});

registerSimHook('month', 'scenario17', (s) => {
  const d = activeDef(s);
  d?.month17?.(s);
});

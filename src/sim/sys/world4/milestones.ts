import { deferEvents } from '../../ext4';
// Marcos da história da indústria fonográfica (1925–2024) e dos mercados mundiais como regras
// datadas: cada marco vira notícia e memória, aplica um efeito mecânico real (modificador de apelo,
// gancho de gravação, mudança de regra) e, quando faz sentido, abre uma decisão.

import { clamp, type Rng } from '../../../core/rng';
import { familyOf, l, type L } from '../../../data/world';
import { emitEvent, type EventDef } from '../../events';
import { registerMod, registerSimHook } from '../../ext4';
import { songQ } from '../../production';
import type { Act, GameState, Release } from '../../types';
import { fmtL, hasTech, money, notify, playerActs, post, remember } from '../../util';
import { take360 } from '../deal360_17';
import { fam, liveMine, mineAct, mineRel, rep, strikeActive } from './common';
import { w4, type FormatBet } from './state';

export interface Milestone {
  id: string;
  year: number;
  month?: number; // 0..11 (dispara no fechamento desse mês)
  tech?: string; // só depois que a tecnologia chega
  until?: number; // fim da janela do efeito
  realRef?: string;
  world?: boolean; // mercado mundial (não EUA/Europa)
  title: L;
  text: L;
  mech: L; // efeito em jogo, em uma frase
  appeal?: (s: GameState, rel: Release, act: Act) => number;
  appealLabel?: L;
  onFire?: (s: GameState, r: Rng) => void;
  event?: string;
  /** contexto da decisão (null = não abre) */
  ctx?: (s: GameState) => Record<string, string | number> | null;
}

const CROONER = ['trad_pop', 'vocal_jazz', 'torch_song', 'tin_pan_alley', 'samba_cancao', 'bolero', 'chanson', 'kayokyoku'];
export const DISCO = ['disco', 'hi_nrg', 'italo', 'eurodance'];
const PUNK = ['punk', 'post_punk', 'hardcore_punk', 'garage_rock', 'pub_rock'];
const albumFams = ['rock', 'pop', 'brazil', 'rnb', 'blues_jazz'];
const isReissue = (rel: Release) => !!rel.reissueOf || rel.kind === 'compilation' || rel.kind === 'anniversary' || rel.kind === 'deluxe';
const hasChannel = (rel: Release, ch: string) => rel.marketing.some((m) => m.channel === ch);

function pickTopLabels(s: GameState): [string, string] | null {
  const big = Object.values(s.labels).filter((x) => x.active && !x.parentLabel).sort((a, b) => b.roster.length + b.cash / 1e8 - (a.roster.length + a.cash / 1e8));
  return big.length >= 3 ? [big[0].id, big[1].id] : null;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'electric', year: 1925, tech: 'electric_rec', until: 1940, realRef: 'Western Electric / Victor, 1925',
    title: l('Gravação elétrica com microfone', 'Electrical recording with microphones'),
    text: l('O microfone substitui a corneta acústica. Vozes suaves, quase sussurradas, finalmente aparecem no disco: nasce o crooner.', 'The microphone replaces the acoustic horn. Soft, intimate voices finally reach the record: the crooner is born.'),
    mech: l('Gêneros de crooner (pop tradicional, jazz vocal, samba-canção, bolero) ganham +12% de apelo até 1940.', 'Crooner genres (traditional pop, vocal jazz, samba-canção, bolero) get +12% appeal until 1940.'),
    appeal: (_s, _rel, act) => (CROONER.includes(act.genre) ? 1.12 : 1),
    onFire: (s) => { for (const g of CROONER) if (s.genrePop[g] !== undefined) s.genrePop[g] = clamp(s.genrePop[g] + 0.15, 0.15, 2.2); },
  },
  {
    id: 'crash', year: 1929, month: 9, realRef: 'Crash de 1929',
    title: l('O crash da bolsa', 'The stock market crash'),
    text: l('Wall Street desaba. Nos anos seguintes as vendas de discos caem cerca de 90%; o rádio gratuito domina e selos quebram em série.', 'Wall Street collapses. Over the next years record sales fall about 90%; free radio rules and labels go bust one after another.'),
    mech: l('Rivais perdem 40% do caixa; acervos de selos falidos ficam à venda por pouco.', 'Rivals lose 40% of their cash; bankrupt labels\' catalogs go on sale cheap.'),
    onFire: (s) => { for (const lb of Object.values(s.labels)) if (lb.active) lb.cash = Math.round(lb.cash * 0.6); },
    event: 'w4_bankrupt',
  },
  {
    id: 'jukebox', year: 1933, until: 1946, realRef: 'Wurlitzer e a revogação da Lei Seca',
    title: l('A jukebox salva o setor', 'The jukebox saves the business'),
    text: l('Com o fim da Lei Seca, bares abrem às centenas e cada um quer uma jukebox. Metade dos discos vendidos vai parar nelas.', 'With Prohibition repealed, bars open by the hundreds and each wants a jukebox. Half the records sold end up in them.'),
    mech: l('Singles ganham +10% de apelo até 1946.', 'Singles get +10% appeal until 1946.'),
    appeal: (_s, rel) => (rel.type === 'single' ? 1.1 : 1),
  },
  {
    id: 'ascap', year: 1941, until: 1956, realRef: 'ASCAP × rádios e o nascimento da BMI, 1941',
    title: l('Guerra das arrecadadoras: SCAE × rádios', 'Rights war: SCAE vs the broadcasters'),
    text: l('As rádios boicotam o catálogo da velha SCAE e fundam a RMR, que aceita compositores de country, R&B e música latina que a SCAE desprezava.', 'Broadcasters boycott the old SCAE catalog and found RMR, which takes the country, R&B and Latin writers SCAE ignored.'),
    mech: l('Escolha a sociedade do seu catálogo. Country, R&B e latina ganham +6% de apelo até 1956.', 'Pick your catalog\'s society. Country, R&B and Latin get +6% appeal until 1956.'),
    appeal: (s, rel, act) => {
      const f = familyOf(act.genre);
      let m = ['country_folk', 'rnb', 'latin', 'caribbean'].includes(f) ? 1.06 : 1;
      if (mineRel(s, rel) && s.year === 1941 && w4(s).society === 'scae') m *= 0.85;
      return m;
    },
    event: 'w4_society',
  },
  {
    id: 'strike42', year: 1942, month: 7, realRef: 'Proibição Petrillo (AFM), 1942–44',
    title: l('Greve geral de gravação', 'Recording ban'),
    text: l('O sindicato dos músicos proíbe seus filiados de gravar até que as gravadoras paguem um fundo por disco. Quem tem músicas no cofre lucra; cantores gravam a capella.', 'The musicians\' union bans its members from recording until labels pay a per-record fund. Whoever has songs in the vault profits; singers record a cappella.'),
    mech: l('Gravações sem acordo sindical saem com performance −30%; discos com músicas antigas ganham +15%.', 'Recordings without a union deal lose 30% performance; records of older songs get +15%.'),
    onFire: (s) => { const w = w4(s); w.strike = { from: s.week, to: s.week + 117, name: 'Petrillo' }; },
    event: 'w4_strike',
  },
  {
    id: 'speedwar', year: 1948, month: 5, until: 1956, realRef: 'Columbia LP × RCA 45, 1948–49',
    title: l('A guerra das velocidades', 'The war of the speeds'),
    text: l('Uma gigante lança o LP de 33⅓ rotações; a rival responde com o compacto de 45. As lojas não sabem qual toca-discos estocar.', 'One giant launches the 33⅓ LP; its rival answers with the 45 single. Shops do not know which player to stock.'),
    mech: l('Aposte num formato: o escolhido ganha +12% e o outro perde 8% até 1956 (ou fique com os dois e pague a fabricação dupla).', 'Bet on a format: your pick gets +12% and the other loses 8% until 1956 (or back both and pay for double manufacturing).'),
    appeal: (s, rel) => {
      const bet = w4(s).formatBet;
      if (!mineRel(s, rel) || !bet || bet === 'both') return 1;
      const lp = rel.type === 'lp';
      return bet === 'lp' ? (lp ? 1.12 : 0.92) : lp ? 0.92 : 1.12;
    },
    event: 'w4_speedwar',
  },
  {
    id: 'payola59', year: 1959, month: 10, realRef: 'Audiências do jabá (payola) no Congresso dos EUA, 1959–60',
    title: l('O escândalo do jabá', 'The payola scandal'),
    text: l('Audiências no parlamento expõem DJs que recebiam dinheiro para tocar discos. Apresentadores famosos são demitidos e o jabá vira crime.', 'Parliamentary hearings expose DJs paid to spin records. Famous hosts are fired and payola becomes a crime.'),
    mech: l('Grande investigação: quem pagou jabá nos últimos anos é multado; daqui em diante o risco de cada pagamento é maior.', 'Major investigation: anyone who paid payola recently is fined; from now on each payment is riskier.'),
  },
  {
    id: 'hitfactory', year: 1962, realRef: 'Brill Building e o controle de qualidade da Motown',
    title: l('Fábricas de hits', 'Hit factories'),
    text: l('Compositores em cubículos escrevem sucessos sob encomenda; uma gravadora de Detroit faz uma reunião semanal que decide o que sai e o que volta para o estúdio.', 'Songwriters in cubicles write hits to order; a Detroit label holds a weekly meeting that decides what ships and what goes back to the studio.'),
    mech: l('Adote a reunião semanal de qualidade: +5% de apelo nos seus discos, com custo mensal.', 'Adopt the weekly quality meeting: +5% appeal on your records, at a monthly cost.'),
    appeal: (s, rel) => (w4(s).qc && mineRel(s, rel) ? 1.05 : 1),
    appealLabel: l('Controle de qualidade semanal', 'Weekly quality control'),
    event: 'w4_qc',
  },
  {
    id: 'festivals_br', year: 1965, month: 3, until: 1969, realRef: 'Festivais da canção (Excelsior, Record, FIC), 1965–69',
    title: l('Os festivais da canção na TV', 'The TV song festivals'),
    text: l('No Brasil, festivais televisionados com júri e plateia que vaia transformam compositores em estrelas da noite para o dia.', 'In Brazil, televised festivals with juries and booing crowds turn songwriters into overnight stars.'),
    mech: l('Todo ano até 1969 você pode inscrever um artista: vitória rende fama e fãs; vaia custa moral.', 'Every year until 1969 you can enter an act: winning brings fame and fans; booing costs morale.'),
    world: true,
  },
  {
    id: 'concept', year: 1967, tech: 'multitrack', until: 1985, realRef: 'Sgt. Pepper\'s e a gravação multipista',
    title: l('Multipista e o álbum conceitual', 'Multitrack and the concept album'),
    text: l('Com 4, 8 e depois 16 pistas, o estúdio vira instrumento. O LP deixa de ser coletânea de singles e passa a contar uma história.', 'With 4, 8 then 16 tracks, the studio becomes an instrument. The LP stops being a pile of singles and starts telling a story.'),
    mech: l('LPs de rock, pop, MPB, soul e jazz ganham +10% até 1985.', 'Rock, pop, Brazilian, soul and jazz LPs get +10% until 1985.'),
    appeal: (_s, rel, act) => (rel.type === 'lp' && albumFams.includes(familyOf(act.genre)) ? 1.1 : 1),
  },
  {
    id: 'midem', year: 1967, month: 0, realRef: 'MIDEM, Cannes, 1967',
    title: l('Primeira grande feira do setor', 'The first big trade fair'),
    text: l('Editores e gravadoras do mundo inteiro se encontram num palácio à beira-mar para comprar e vender licenças.', 'Publishers and labels from around the world meet in a seaside palace to buy and sell licenses.'),
    mech: l('Feiras anuais liberadas: venda licenças internacionais e gere hype (aba Feiras).', 'Annual fairs unlocked: sell international licenses and build hype (Fairs tab).'),
  },
  {
    id: 'fm', year: 1970, tech: 'fm', until: 1990, realRef: 'Rádio FM e o AOR',
    title: l('FM e o rock de álbum', 'FM and album rock'),
    text: l('As rádios FM tocam lados inteiros de LP, com som estéreo. O single de rock perde importância.', 'FM stations play whole LP sides in stereo. The rock single matters less.'),
    mech: l('LPs de rock +10%, singles de rock −5% até 1990.', 'Rock LPs +10%, rock singles −5% until 1990.'),
    appeal: (_s, rel, act) => (familyOf(act.genre) !== 'rock' ? 1 : rel.type === 'lp' ? 1.1 : rel.type === 'single' ? 0.95 : 1),
  },
  {
    id: 'afrobeat', year: 1970, until: 1986, world: true, realRef: 'Fela Kuti e o Afrika Shrine, Lagos',
    title: l('Afrobeat em Lagos', 'Afrobeat in Lagos'),
    text: l('Um saxofonista mistura highlife, jazz e funk em faixas de 15 minutos com letras contra o regime. O clube dele vira república própria.', 'A saxophonist fuses highlife, jazz and funk into 15-minute tracks with lyrics against the regime. His club becomes a republic of its own.'),
    mech: l('Afrobeat e highlife +15% até 1986 (com risco de censura política).', 'Afrobeat and highlife +15% until 1986 (with political censorship risk).'),
    appeal: (_s, _rel, act) => (['afrobeat', 'highlife', 'juju'].includes(act.genre) ? 1.15 : 1),
  },
  {
    id: 'punk', year: 1976, until: 1986, realRef: 'Punk e os selos DIY (Rough Trade, SST, Dischord)',
    title: l('Punk e o selo de fundo de quintal', 'Punk and the bedroom label'),
    text: l('Três acordes, fanzine xerocado e um compacto prensado com dinheiro emprestado. Gravar barato vira credencial.', 'Three chords, a photocopied fanzine and a single pressed with borrowed money. Recording cheap becomes a badge of honor.'),
    mech: l('Punk com pouco marketing ganha +20% de credibilidade até 1986.', 'Low-marketing punk gets +20% credibility until 1986.'),
    appeal: (s, rel, act) => (PUNK.includes(act.genre) ? (rel.marketingE < 0.25 ? 1.2 : 1) * (w4(s).ms.diy && mineRel(s, rel) ? 1.1 : 1) : 1),
    onFire: (s) => { for (const g of PUNK) if (s.genrePop[g] !== undefined) s.genrePop[g] = clamp(s.genrePop[g] + 0.2, 0.15, 2.2); },
    event: 'w4_diy',
  },
  {
    id: 'citypop', year: 1978, until: 1990, world: true, realRef: 'City pop japonês',
    title: l('City pop em Tóquio', 'City pop in Tokyo'),
    text: l('A bolha econômica japonesa ganha trilha: pop sofisticado, de estúdio caro, para ouvir no carro novo pela via expressa.', 'Japan\'s bubble economy gets a soundtrack: sophisticated, expensively produced pop for the new car on the expressway.'),
    mech: l('City pop +15% até 1990 (e um revival na internet anos depois).', 'City pop +15% until 1990 (and an internet revival years later).'),
    appeal: (s, _rel, act) => (act.genre === 'city_pop' ? (s.year >= 2017 ? 1.4 : s.year <= 1990 ? 1.15 : 1) : 1),
  },
  {
    id: 'disco_demolition', year: 1979, month: 6, until: 1982, realRef: 'Disco Demolition Night, Chicago, 1979',
    title: l('A noite da demolição da disco', 'Disco Demolition Night'),
    text: l('Num estádio, uma caixa de discos de disco music explode no gramado e a torcida invade o campo. "A disco morreu", dizem os jornais.', 'At a ballpark, a crate of disco records is blown up on the field and the crowd storms the pitch. "Disco is dead," say the papers.'),
    mech: l('Disco e derivados perdem 40% de popularidade e 20% de apelo até 1982.', 'Disco and its offshoots lose 40% popularity and 20% appeal until 1982.'),
    onFire: (s) => {
      const w = w4(s);
      for (const g of DISCO) {
        if (s.genrePop[g] !== undefined) s.genrePop[g] = clamp(s.genrePop[g] * 0.6, 0.15, 2.2);
        w.backlash.push({ genre: g, from: s.year, until: 1982, kind: 'death' });
      }
    },
  },
  {
    id: 'hometaping', year: 1980, tech: 'cassette', realRef: '"Home Taping Is Killing Music" (BPI), Walkman',
    title: l('"Gravar em casa está matando a música"', '"Home taping is killing music"'),
    text: l('O toca-fitas portátil e o duplo deck tornam a cópia doméstica um hábito. A indústria lança uma campanha com caveira e fita cassete.', 'The portable tape player and double deck make home copying a habit. The industry launches a campaign with a skull-and-cassette logo.'),
    mech: l('A pirataria doméstica começa a pesar. Escolha a resposta (aba Pirataria no Mundo).', 'Home piracy starts to bite. Pick a response (Piracy in World).'),
    event: 'w4_hometaping',
  },
  {
    id: 'mtv', year: 1981, month: 7, tech: 'clipnet', until: 2008, realRef: 'MTV, 1º de agosto de 1981',
    title: l('A rede de clipes entra no ar', 'The music video network goes live'),
    text: l('"O vídeo matou a estrela do rádio" é o primeiro clipe exibido. Em dois anos, lançar sem videoclipe vira suicídio comercial.', '"Video killed the radio star" is the first clip aired. Within two years, releasing without a video is commercial suicide.'),
    mech: l('Lançamentos com clipe +12%; sem clipe −8% (a partir de 1983) até 2008.', 'Releases with a video +12%; without one −8% (from 1983) until 2008.'),
    appeal: (s, rel) => (hasChannel(rel, 'music_video') ? 1.12 : s.year >= 1983 ? 0.92 : 1),
  },
  {
    id: 'cd', year: 1982, month: 9, tech: 'cd', until: 1998, realRef: 'Compact Disc, 1982',
    title: l('Chega o CD', 'The CD arrives'),
    text: l('O disco a laser promete som perfeito para sempre. Fãs recompram o catálogo inteiro e as reedições viram mina de ouro.', 'The laser disc promises perfect sound forever. Fans rebuy whole catalogs and reissues become a gold mine.'),
    mech: l('Reedições, coletâneas e deluxes +35% até 1998.', 'Reissues, compilations and deluxes +35% until 1998.'),
    appeal: (_s, rel) => (isReissue(rel) ? 1.35 : 1),
  },
  {
    id: 'midi', year: 1983, tech: 'synth', realRef: 'MIDI 1.0 e a bateria eletrônica',
    title: l('MIDI e a bateria eletrônica', 'MIDI and the drum machine'),
    text: l('Um cabo de cinco pinos faz sintetizadores e baterias eletrônicas conversarem. Surge o produtor-programador.', 'A five-pin cable lets synths and drum machines talk. The producer-programmer is born.'),
    mech: l('Suas gravações de eletrônica, pop e R&B ganham +4 de produção.', 'Your electronic, pop and R&B recordings get +4 production.'),
  },
  {
    id: 'liveaid', year: 1985, month: 6, realRef: 'Live Aid, 13 de julho de 1985',
    title: l('O megaevento beneficente', 'The global charity mega-concert'),
    text: l('Dois estádios, dois continentes e uma transmissão para quase dois bilhões de pessoas. Quem toca não recebe cachê — e vende catálogo por um ano.', 'Two stadiums, two continents and a broadcast to nearly two billion people. Performers are unpaid — and sell catalog for a year.'),
    mech: l('Convite: tocar de graça dá fama, reputação e +25% de apelo ao artista por um ano.', 'Invitation: playing for free gives fame, reputation and +25% appeal to the act for a year.'),
    appeal: (s, rel) => { const la = w4(s).liveAid; return la && la.actId === rel.actId && s.year <= la.until ? 1.25 : 1; },
    appealLabel: l('Efeito do megaevento', 'Mega-concert effect'),
    event: 'w4_liveaid',
    ctx: (s) => { const a = liveMine(s).filter((x) => x.fame > 10).sort((x, y) => y.fame - x.fame)[0]; return a ? { act: a.id } : null; },
  },
  {
    id: 'pmrc', year: 1985, month: 8, realRef: 'PMRC e o selo Parental Advisory, 1985',
    title: l('Audiência do conselho de pais', 'The parents\' council hearing'),
    text: l('Um comitê de esposas de parlamentares lista as "15 imundas" e as gravadoras aceitam um selo de aviso de conteúdo explícito.', 'A committee of lawmakers\' wives lists the "Filthy Fifteen" and labels agree to an explicit-content warning sticker.'),
    mech: l('Selo de aviso: perde grandes varejistas, ganha credibilidade em rap, rock e punk; versão limpa para o rádio.', 'Warning sticker: lose big retailers, gain credibility in rap, rock and punk; clean edit for radio.'),
  },
  {
    id: 'soundscan', year: 1991, month: 4, realRef: 'Nielsen SoundScan, maio de 1991',
    title: l('As paradas passam a medir vendas reais', 'Charts start measuring real sales'),
    text: l('Leitores de código de barras substituem o telefonema das lojas. Da noite para o dia, rap e country aparecem muito mais no topo.', 'Barcode scanners replace the store phone call. Overnight, rap and country show up far more at the top.'),
    mech: l('Nova metodologia: rap e country sobem; "lojas amigas" deixam de funcionar.', 'New methodology: rap and country rise; "friendly stores" stop working.'),
  },
  {
    id: 'sample', year: 1991, month: 11, realRef: 'Grand Upright × Warner (Biz Markie), 1991',
    title: l('O primeiro grande processo de sample', 'The first big sampling lawsuit'),
    text: l('Um juiz abre a sentença com "Não furtarás". Samples passam a exigir liberação prévia.', 'A judge opens the ruling with "Thou shalt not steal." Samples now need clearance.'),
    mech: l('Lançamentos de hip hop pagam liberação de samples (ou arriscam processo).', 'Hip hop releases pay for sample clearance (or risk a lawsuit).'),
  },
  {
    id: 'mergers', year: 1998, month: 4, realRef: 'Fusões das majors (PolyGram/Universal 1998, Sony BMG 2004)',
    title: l('As grandes se fundem', 'The majors merge'),
    text: l('Das seis grandes sobram cinco, depois quatro e três. O órgão antitruste examina, mas aprova.', 'The big six become five, then four and three. The antitrust agency looks, then approves.'),
    mech: l('Os dois maiores rivais se fundem.', 'The two biggest rivals merge.'),
    onFire: (s, r) => { const p = pickTopLabels(s); if (p) emitEvent(s, r, 'rival_merger', { buyer: p[0], target: p[1] }); },
  },
  {
    id: 'autotune', year: 1998, month: 9, realRef: 'Auto-Tune (Antares), 1997–98',
    title: l('A correção de afinação', 'Pitch correction'),
    text: l('Um algoritmo feito para prospecção de petróleo corrige qualquer voz desafinada — e, no extremo, vira efeito robótico.', 'An algorithm built for oil prospecting fixes any off-key voice — and, pushed hard, becomes a robotic effect.'),
    mech: l('Adotar: +6 de performance nas suas gravações de pop, R&B e rap; críticos torcem o nariz.', 'Adopt: +6 performance on your pop, R&B and rap recordings; critics sneer.'),
    event: 'w4_autotune',
  },
  {
    id: 'napster', year: 1999, tech: 'p2p', realRef: 'Napster, 1999–2001',
    title: l('O compartilhamento de arquivos', 'File sharing'),
    text: l('Um estudante cria um programa para trocar músicas e em um ano dezenas de milhões de pessoas baixam tudo de graça.', 'A student writes a program to swap songs and within a year tens of millions download everything for free.'),
    mech: l('A pirataria explode. Processar fãs, licenciar, baixar preço ou anticópia?', 'Piracy explodes. Sue fans, license, cut prices or copy protection?'),
    event: 'w4_napster',
  },
  {
    id: 'itunes', year: 2003, tech: 'download', until: 2013, realRef: 'iTunes Store, 99 centavos',
    title: l('A faixa avulsa a 99 centavos', 'The 99-cent single track'),
    text: l('A loja de downloads vende cada música separada. O público compra os hits e deixa o resto do álbum.', 'The download store sells each song on its own. Fans buy the hits and skip the rest of the album.'),
    mech: l('Singles +10%, LPs −10% até 2013.', 'Singles +10%, LPs −10% until 2013.'),
    appeal: (_s, rel) => (rel.type === 'single' ? 1.1 : rel.type === 'lp' ? 0.9 : 1),
  },
  {
    id: 'youtube', year: 2005, tech: 'internet', until: 2016, realRef: 'YouTube, MySpace e contratos 360°',
    title: l('Descoberta por plataforma', 'Platform discovery'),
    text: l('Vídeos caseiros e perfis de banda fazem desconhecidos lotarem shows antes de assinar contrato. As gravadoras respondem com o contrato 360°.', 'Home videos and band profiles let unknowns sell out shows before signing. Labels answer with the 360° deal.'),
    mech: l('Artistas pouco famosos +12% até 2016; adotar o 360° dá parte dos shows ao selo.', 'Little-known acts +12% until 2016; adopting 360° gives the label a cut of shows.'),
    appeal: (_s, _rel, act) => (act.fame < 20 ? 1.12 : 1),
    event: 'w4_360',
  },
  {
    id: 'kpop', year: 2012, until: 2040, world: true, realRef: 'Hallyu e o k-pop global',
    title: l('A onda coreana', 'The Korean wave'),
    text: l('Um vídeo de dança coreano passa de um bilhão de visualizações. Grupos formados em anos de treinamento conquistam o mundo.', 'A Korean dance video passes a billion views. Groups formed through years of training conquer the world.'),
    mech: l('K-pop +20% no mundo todo.', 'K-pop +20% worldwide.'),
    appeal: (_s, _rel, act) => (['kpop', 'k_synth', 'k_indie'].includes(act.genre) ? 1.2 : 1),
  },
  {
    id: 'streamcount', year: 2014, tech: 'streaming', realRef: 'Billboard 200 passa a contar streams (dez. 2014)',
    title: l('Streams entram nas paradas', 'Streams enter the charts'),
    text: l('Mil e quinhentas audições passam a valer um álbum vendido. Rap e música latina disparam; o rock de catálogo perde espaço.', 'Fifteen hundred plays now count as one album sold. Rap and Latin music surge; catalog rock loses ground.'),
    mech: l('Nova metodologia: hip hop +15%, latina +10%, rock −10%.', 'New methodology: hip hop +15%, Latin +10%, rock −10%.'),
  },
  {
    id: 'playlists', year: 2015, tech: 'streaming', until: 2040, realRef: 'Playlists editoriais, normalização de loudness, volta do vinil',
    title: l('Curadores, normalização e o vinil de volta', 'Curators, normalization and vinyl\'s return'),
    text: l('Curadores de playlist substituem os DJs; as plataformas normalizam o volume e encerram a guerra do loudness; e o LP de vinil volta às lojas como objeto de colecionador.', 'Playlist curators replace DJs; platforms normalize loudness and end the loudness war; and the vinyl LP returns to stores as a collector\'s item.'),
    mech: l('Lançamentos em LP de vinil +8%; o jabá vira relação com curadores.', 'Vinyl LP releases +8%; payola becomes a relationship with curators.'),
    appeal: (_s, rel) => (rel.formats.includes('lp') ? 1.08 : 1),
  },
  {
    id: 'latin', year: 2017, until: 2040, world: true, realRef: '"Despacito" e o boom latino',
    title: l('O boom latino', 'The Latin boom'),
    text: l('Uma faixa em espanhol passa 16 semanas no topo da parada americana. Reggaeton e trap latino viram o centro do pop.', 'A Spanish-language track spends 16 weeks atop the US chart. Reggaeton and Latin trap become the center of pop.'),
    mech: l('Latina e caribenha +15%.', 'Latin and Caribbean +15%.'),
    appeal: (_s, _rel, act) => (['latin', 'caribbean'].includes(familyOf(act.genre)) ? 1.15 : 1),
  },
  {
    id: 'viral', year: 2019, tech: 'short_video', until: 2040, realRef: 'Vídeos curtos (TikTok) e a contagem de vídeos',
    title: l('Quinze segundos decidem um hit', 'Fifteen seconds make a hit'),
    text: l('Trechos de dança em vídeo curto transformam faixas antigas e desconhecidas em número um. Visualizações passam a contar nas paradas.', 'Short-video dance clips turn old and unknown tracks into number ones. Views start counting on the charts.'),
    mech: l('Singles +8%; nova metodologia com vídeos (pop, rap, latina e afro sobem).', 'Singles +8%; new methodology with video (pop, rap, Latin and Afro rise).'),
    appeal: (_s, rel) => (rel.type === 'single' ? 1.08 : 1),
  },
  {
    id: 'catalogs', year: 2020, month: 6, realRef: 'Boom de compra de catálogos (Hipgnosis etc.)',
    title: l('Fundos compram catálogos', 'Funds buy catalogs'),
    text: l('Com juros no chão, fundos de investimento pagam fortunas por direitos de canções antigas.', 'With rates near zero, investment funds pay fortunes for old song rights.'),
    mech: l('Proposta: vender parte do seu catálogo agora por um repasse mensal durante 10 anos.', 'Offer: sell a stake of your catalog now against a monthly pass-through for 10 years.'),
    event: 'w4_catalog_fund',
  },
  {
    id: 'nft', year: 2021, month: 2, realRef: 'NFTs musicais, 2021',
    title: l('Discos em token', 'Records as tokens'),
    text: l('Artistas vendem edições digitais "únicas" em blockchain por milhões. Metade do público acha genial; a outra metade, golpe.', 'Artists sell "unique" digital editions on blockchain for millions. Half the public finds it genius; the other half, a scam.'),
    mech: l('Lançar uma coleção: dinheiro rápido com risco de escândalo.', 'Drop a collection: quick money with scandal risk.'),
    event: 'w4_nft',
  },
  {
    id: 'ai_voice', year: 2023, month: 3, until: 2040, realRef: 'Faixas com voz clonada por IA, 2023',
    title: l('Vozes clonadas viralizam', 'Cloned voices go viral'),
    text: l('Uma faixa com vozes de duas estrelas — nenhuma delas cantou — viraliza e é derrubada em dias. Plataformas e parlamentos discutem regras.', 'A track with the voices of two stars — neither of whom sang — goes viral and is taken down within days. Platforms and parliaments debate rules.'),
    mech: l('Atos sintéticos −10% até haver regulação; a associação vota regras de IA.', 'Synthetic acts −10% until regulation passes; the association votes on AI rules.'),
    appeal: (s, _rel, act) => (act.archetype === 'synthetic' && w4(s).laws.ai_rules?.status !== 'passed' ? 0.9 : 1),
  },
  // ---------- mercados mundiais ----------
  {
    id: 'bollywood', year: 1950, until: 2005, world: true, realRef: 'Cantores de playback (Lata Mangeshkar, Mohammed Rafi)',
    title: l('Os cantores de playback de Bollywood', 'Bollywood\'s playback singers'),
    text: l('Na Índia, quem canta não aparece: atores dublam vozes de estúdio. A estrela é o filme, e as trilhas vendem mais que tudo.', 'In India the singer is unseen: actors lip-sync studio voices. The film is the star, and soundtracks outsell everything.'),
    mech: l('Bollywood e ghazal de cinema: a fama pesa menos; um desconhecido vende quase como estrela.', 'Bollywood and film ghazal: fame matters less; an unknown sells nearly like a star.'),
    appeal: (_s, _rel, act) => (['bollywood', 'ghazal_pop'].includes(act.genre) ? clamp(1 + (40 - act.fame) / 120, 0.85, 1.3) : 1),
  },
  {
    id: 'ussr_bones', year: 1952, until: 1965, world: true, realRef: 'Roentgenizdat — "música nos ossos"',
    title: l('Discos em radiografias na URSS', 'Records on X-rays in the USSR'),
    text: l('Proibidos, rock e jazz ocidentais circulam em discos gravados sobre radiografias usadas: costelas e crânios girando a 78 rotações.', 'Banned Western rock and jazz circulate on records cut into used X-ray film: ribs and skulls spinning at 78 rpm.'),
    mech: l('Seus atos de rock e jazz com distribuição na Europa ganham fãs no bloco do Leste todo mês (sem venda oficial).', 'Your rock and jazz acts distributed in Europe gain fans in the Eastern bloc every month (no official sales).'),
  },
  {
    id: 'auditorio', year: 1956, until: 2000, world: true, realRef: 'Programas de auditório (Chacrinha, Silvio Santos)',
    title: l('Os programas de auditório', 'The studio-audience variety shows'),
    text: l('No Brasil, quem não vai ao programa de auditório de domingo não existe: calouros, buzina, bacalhau jogado na plateia.', 'In Brazil, if you are not on the Sunday variety show you do not exist: amateurs, the horn, codfish thrown into the crowd.'),
    mech: l('No Brasil, discos com divulgação na TV ganham +12%; sem TV, −5%.', 'In Brazil, records promoted on TV get +12%; without TV, −5%.'),
    appeal: (s, rel) => (!rel.territories.includes('br') || !hasTech(s, 'tv_music') ? 1 : hasChannel(rel, 'tv_show') ? 1.12 : 0.95),
  },
  {
    id: 'cassette_me', year: 1975, until: 2000, world: true, realRef: 'Fitas cassete no Oriente Médio, na Índia (T-Series) e no Cairo',
    title: l('O império da fita cassete', 'The cassette empire'),
    text: l('Do Cairo a Délhi, a fita barata e regravável leva sermões, música de casamento e pop regional a quem nunca teve toca-discos.', 'From Cairo to Delhi, the cheap rewritable tape carries sermons, wedding music and regional pop to people who never owned a turntable.'),
    mech: l('Na Ásia e Oriente Médio, lançamentos com fita cassete +12%; sem fita, −8%.', 'In Asia and the Middle East, releases on cassette +12%; without it, −8%.'),
    appeal: (_s, rel) => (!rel.territories.includes('asia') ? 1 : rel.formats.includes('cassette') ? 1.12 : rel.formats.length ? 0.92 : 1),
  },
  {
    id: 'trainees', year: 1996, until: 2040, world: true, realRef: 'Sistema de trainees das agências coreanas',
    title: l('As agências de trainees', 'The trainee agencies'),
    text: l('Em Seul, agências recrutam adolescentes e os treinam por anos em canto, dança e mídia antes da estreia.', 'In Seoul, agencies recruit teenagers and train them for years in singing, dancing and media before debut.'),
    mech: l('Inscreva um ato no treinamento (2 anos): durante, rende menos; depois, +25% em pop asiático.', 'Enroll an act in training (2 years): weaker during, then +25% in Asian pop.'),
  },
];

export const milestoneById: Record<string, Milestone> = Object.fromEntries(MILESTONES.map((m) => [m.id, m]));

/** O marco já está no calendário (ano/mês atingido e tecnologia presente)? */
export function milestoneDue(s: GameState, m: Milestone): boolean {
  if (s.year < m.year) return false;
  if (s.year === m.year && m.month !== undefined && s.month < m.month) return false;
  if (m.tech && !hasTech(s, m.tech)) return false;
  return true;
}

function activeWindow(s: GameState, m: Milestone): boolean {
  const fired = w4(s).ms[m.id];
  if (fired === undefined) return false;
  return m.until === undefined || s.year <= m.until;
}

// ---------- modificadores de apelo (um por marco, com rótulo próprio na autópsia) ----------
for (const m of MILESTONES) {
  if (!m.appeal) continue;
  registerMod('appeal', `w4ms:${m.id}`, (s, value, ctx) => {
    if (!ctx.release || !ctx.act || !activeWindow(s, m)) return null;
    const k = m.appeal!(s, ctx.release, ctx.act);
    if (k === 1) return null;
    return { value: value * k, label: m.appealLabel ?? m.title };
  });
}

// ---------- disparo ----------
export function fireMilestone(s: GameState, r: Rng, m: Milestone, silent = false): void {
  const w = w4(s);
  if (w.ms[m.id] !== undefined) return;
  w.ms[m.id] = silent ? -s.year : s.year;
  if (silent) return;
  m.onFire?.(s, r);
  remember(s, 'industry', fmtL(l('Indústria: {t}. {x}', 'Industry: {t}. {x}'), { t: m.title, x: m.text }), { important: true });
  notify(s, fmtL(l('Marco da indústria: {t}', 'Industry milestone: {t}'), { t: m.title }), 'event');
  if (m.event) {
    const c = m.ctx ? m.ctx(s) : {};
    if (c) emitEvent(s, r, m.event, c);
  }
}

export function milestonesMonth(s: GameState, r: Rng): void {
  const w = w4(s);
  if (!w.init) {
    // marcos anteriores ao começo da partida já aconteceram (sem notícia nem decisão)
    w.init = true;
    for (const m of MILESTONES) if (m.year < s.config.startYear && milestoneDue(s, m)) {
      fireMilestone(s, r, m, true);
      if (m.id === 'ascap') w.society = 'rmr';
    }
    if (s.year < 1941) w.society = 'scae';
  }
  for (const m of MILESTONES) if (w.ms[m.id] === undefined && milestoneDue(s, m)) fireMilestone(s, r, m);
  // custos e rendas recorrentes de decisões dos marcos
  if (w.qc) post(s, `w4qc:${s.month}`, -money(s, 300 + liveMine(s).length * 60), 'w4_industry', 'Reunião de qualidade semanal');
  if (w.bankrupt && s.year <= w.bankrupt.until) post(s, `w4bk:${s.month}`, w.bankrupt.monthly, 'w4_industry', 'Acervo de selo falido');
  if (w.catalogFund && s.year < w.catalogFund.until) post(s, `w4cf:${s.month}`, -w.catalogFund.monthly, 'w4_industry', 'Repasse ao fundo de catálogo');
  // URSS: fãs pelo "disco nos ossos"
  if (activeWindow(s, milestoneById.ussr_bones)) for (const a of liveMine(s)) {
    const f = fam(a);
    const inEu = a.releases.some((id) => s.releases[id]?.territories.includes('eu'));
    if ((f === 'rock' || f === 'blues_jazz') && inEu) a.fans.casual += Math.round(40 + a.fame * 6);
  }
  // festivais da canção na TV (Brasil, 1965–69): um convite por ano, em setembro
  if (s.year >= 1965 && s.year <= 1969 && s.month === 8 && w.ms.festivals_br !== undefined) {
    const cand = liveMine(s).filter((a) => a.songs.some((id) => s.songs[id]?.recorded)).sort((a, b) => b.fame - a.fame)[0];
    if (cand) emitEvent(s, r, 'w4_festival_tv', { act: cand.id, fee: 600 });
  }
}

// ---------- ganchos de gravação: MIDI, Auto-Tune e greve ----------
registerSimHook('record', 'w4ms', (s, _r, arg) => {
  const song = arg.song;
  if (!song) return;
  const act = s.acts[song.actId];
  if (!mineAct(s, act)) return;
  const w = w4(s);
  const f = familyOf(song.genre);
  let changed = false;
  if (w.ms.midi !== undefined && ['electronic', 'pop', 'rnb'].includes(f)) { song.production = clamp(song.production + 4, 5, 100); changed = true; }
  if (w.autotune && ['pop', 'rnb', 'hiphop', 'latin'].includes(f)) { song.performance = clamp(song.performance + 6, 5, 100); changed = true; }
  const st = strikeActive(s);
  if (st && !w.union) {
    song.performance = clamp(song.performance * 0.7, 5, 100);
    w.scabSongs += 1;
    post(s, `w4scab:${song.id}`, -money(s, 250), 'w4_union', 'Sessão durante greve (vocal e substitutos)');
    changed = true;
  }
  if (changed) song.q = songQ(song);
});

// cofre: na greve, discos com músicas compostas antes dela não têm concorrência nova
registerMod('appeal', 'w4strike', (s, value, ctx) => {
  const st = strikeActive(s);
  if (!st || !ctx.release) return null;
  const old = ctx.release.songs.every((id) => (s.songs[id]?.createdWeek ?? 0) < st.from);
  return old ? { value: value * 1.15, label: l('Cofre: músicas de antes da greve', 'Vault: songs from before the strike') } : null;
});

// ---------- decisões dos marcos ----------
const pay = (s: GameState, key: string, real: number, memo: string) => post(s, key, -money(s, real), 'w4_industry', memo);
const gain = (s: GameState, key: string, real: number, memo: string) => post(s, key, money(s, real), 'w4_industry', memo);

const EVENTS: EventDef[] = [
  {
    id: 'w4_bankrupt', cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Acervo de selo falido à venda', 'Bankrupt label catalog for sale'),
    text: l('Um selo quebrado oferece suas matrizes e direitos por uma fração do valor. A crise pode durar anos — mas o acervo rende para sempre.', 'A failed label offers its masters and rights for a fraction of their value. The slump may last years — but the catalog pays forever.'),
    options: [
      { id: 'buy', label: l('Comprar o acervo', 'Buy the catalog'), hint: l('Custo agora; renda mensal por 15 anos.', 'Cost now; monthly income for 15 years.'), apply: (s) => { pay(s, 'w4bkbuy', 6000, 'Compra de acervo de selo falido'); w4(s).bankrupt = { until: s.year + 15, monthly: money(s, 90) }; remember(s, 'industry', l('O selo compra o acervo de um concorrente falido.', 'The label buys a bankrupt rival\'s catalog.'), { important: true }); } },
      { id: 'pass', label: l('Guardar o caixa', 'Keep the cash'), apply: () => {} },
    ],
  },
  {
    id: 'w4_society', cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('A qual sociedade filiar o catálogo?', 'Which society gets your catalog?'),
    text: l('A SCAE paga mais por execução mas está boicotada pelas rádios; a nova RMR cobra taxa menor e abre portas para country, R&B e latina.', 'SCAE pays more per play but is boycotted by radio; the new RMR charges a smaller fee and opens doors for country, R&B and Latin.'),
    options: [
      { id: 'rmr', label: l('Filiar à RMR', 'Join RMR'), hint: l('Taxa menor; bônus para country, R&B e latina.', 'Lower fee; bonus for country, R&B and Latin.'), apply: (s) => { w4(s).society = 'rmr'; } },
      { id: 'scae', label: l('Ficar na SCAE', 'Stay with SCAE'), hint: l('Paga mais; sofre o boicote em 1941.', 'Pays more; suffers the 1941 boycott.'), apply: (s) => { w4(s).society = 'scae'; } },
    ],
  },
  {
    id: 'w4_strike', cat: 'world', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
    title: l('O sindicato proíbe gravações', 'The union bans recording'),
    text: l('Nenhum músico filiado entra em estúdio até as gravadoras pagarem um fundo por disco vendido. Como o selo reage?', 'No union musician enters a studio until labels pay a fund per record sold. How does the label respond?'),
    options: [
      { id: 'sign', label: l('Assinar o acordo do fundo', 'Sign the fund agreement'), hint: l('Custo mensal; volta a gravar normalmente.', 'Monthly cost; record normally again.'), apply: (s) => { w4(s).union = true; rep(s, 'artists', 4); remember(s, 'union', l('O selo assina o acordo com o sindicato dos músicos.', 'The label signs the musicians\' union agreement.'), { important: true }); } },
      { id: 'vault', label: l('Viver do cofre e gravar a capella', 'Live off the vault and record a cappella'), hint: l('Gravações novas saem piores.', 'New recordings come out worse.'), apply: () => {} },
    ],
  },
  {
    id: 'w4_speedwar', cat: 'tech', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('LP de 33⅓ ou compacto de 45?', '33⅓ LP or 45 single?'),
    text: l('As lojas pedem que você escolha um lado. Licenciar o formato vencedor rende; apostar errado encalha estoque.', 'Stores ask you to pick a side. Licensing the winning format pays; betting wrong leaves stock unsold.'),
    options: [
      { id: 'lp', label: l('Apostar no LP', 'Back the LP'), apply: (s) => setBet(s, 'lp') },
      { id: 'single45', label: l('Apostar no 45', 'Back the 45'), apply: (s) => setBet(s, 'single45') },
      { id: 'both', label: l('Fabricar os dois', 'Make both'), hint: l('Sem bônus; fabricação 8% mais cara até 1956.', 'No bonus; manufacturing 8% pricier until 1956.'), apply: (s) => setBet(s, 'both') },
    ],
  },
  {
    id: 'w4_qc', cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Reunião semanal de qualidade?', 'A weekly quality meeting?'),
    text: l('Toda sexta, a diretoria ouve as gravações da semana e vota: sai ou volta para o estúdio.', 'Every Friday, management hears the week\'s recordings and votes: ship it or back to the studio.'),
    options: [
      { id: 'adopt', label: l('Adotar', 'Adopt'), hint: l('+5% de apelo; custo mensal.', '+5% appeal; monthly cost.'), apply: (s) => { w4(s).qc = true; } },
      { id: 'skip', label: l('Confiar no instinto', 'Trust your gut'), apply: () => {} },
    ],
  },
  {
    id: 'w4_festival_tv', cat: 'career', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Festival da canção: inscrever {act}?', 'Song festival: enter {act}?'),
    text: l('O festival de TV deste ano aceita inscrições. Júri técnico, plateia apaixonada — vaia e consagração na mesma noite.', 'This year\'s TV festival is taking entries. Expert jury, passionate crowd — booing and glory on the same night.'),
    options: [
      { id: 'enter', label: l('Inscrever', 'Enter'), hint: l('Taxa de inscrição; vitória, final ou vaia.', 'Entry fee; win, final or boos.'), apply: (s, r, c) => festivalResult(s, r, String(c.act)) },
      { id: 'skip', label: l('Não participar', 'Sit it out'), apply: () => {} },
    ],
  },
  {
    id: 'w4_diy', cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Abrir um selo DIY?', 'Open a DIY imprint?'),
    text: l('Um selo de fundo de quintal, com capas xerocadas e compactos de mil cópias, daria credibilidade instantânea na cena punk.', 'A bedroom imprint with photocopied sleeves and thousand-copy singles would buy instant punk credibility.'),
    options: [
      { id: 'open', label: l('Abrir o selo DIY', 'Open the DIY imprint'), hint: l('Custo baixo; +10% para seu punk e reputação artística.', 'Low cost; +10% for your punk and artistic reputation.'), apply: (s) => { pay(s, 'w4diy', 1200, 'Selo DIY'); w4(s).ms.diy = s.year; rep(s, 'artistic', 4); } },
      { id: 'skip', label: l('Deixar para a cena', 'Leave it to the scene'), apply: () => {} },
    ],
  },
  {
    id: 'w4_hometaping', cat: 'tech', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Campanha contra a fita virgem?', 'Campaign against blank tape?'),
    text: l('A associação quer uma campanha nacional contra a cópia doméstica. Outros acham que a fita é o melhor divulgador que existe.', 'The association wants a national campaign against home copying. Others say tape is the best promoter there is.'),
    options: [
      { id: 'campaign', label: l('Apoiar a campanha', 'Back the campaign'), hint: l('Custo; reputação institucional; pirataria −20%.', 'Cost; institutional reputation; piracy −20%.'), apply: (s) => { pay(s, 'w4tape', 2500, 'Campanha contra cópia doméstica'); rep(s, 'institutional', 3); w4(s).ms.tapecampaign = s.year; } },
      { id: 'embrace', label: l('Abraçar a fita: lançar tudo em cassete', 'Embrace tape: release everything on cassette'), hint: l('Fãs jovens gostam; reputação com artistas.', 'Young fans approve; artist reputation.'), apply: (s) => { rep(s, 'artists', 2); w4(s).ms.tapeembrace = s.year; } },
      { id: 'ignore', label: l('Ignorar', 'Ignore'), apply: () => {} },
    ],
  },
  {
    id: 'w4_liveaid', cat: 'career', tone: 'good', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Convite para o megaevento', 'Invitation to the mega-concert'),
    text: l('Os organizadores querem {act} no palco. Sem cachê, com o planeta assistindo.', 'The organizers want {act} on stage. No fee, with the planet watching.'),
    options: [
      { id: 'play', label: l('Tocar', 'Play'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (!a) return; w4(s).liveAid = { actId: a.id, until: s.year + 1 }; a.fame = clamp(a.fame + 5, 0, 100); a.fans.casual += 20000 + a.fame * 1000; rep(s, 'institutional', 5); remember(s, 'liveaid', fmtL(l('{a} toca no megaevento beneficente para o mundo inteiro.', '{a} plays the charity mega-concert for the whole world.'), { a: a.name }), { actId: a.id, important: true }); } },
      { id: 'decline', label: l('Recusar (agenda cheia)', 'Decline (busy schedule)'), apply: (s) => rep(s, 'institutional', -1) },
    ],
  },
  {
    id: 'w4_autotune', cat: 'tech', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Correção de afinação no estúdio?', 'Pitch correction in the studio?'),
    text: l('O engenheiro diz que com o plugin nenhuma voz desafina. Os críticos já chamam o som de "plástico".', 'The engineer says with the plugin no voice is ever off-key. Critics already call the sound "plastic".'),
    options: [
      { id: 'adopt', label: l('Adotar', 'Adopt'), hint: l('+6 de performance em pop, R&B, rap e latina; reputação artística −3.', '+6 performance in pop, R&B, rap and Latin; artistic reputation −3.'), apply: (s) => { w4(s).autotune = true; rep(s, 'artistic', -3); } },
      { id: 'skip', label: l('Manter vozes naturais', 'Keep natural voices'), apply: (s) => rep(s, 'artistic', 1) },
    ],
  },
  {
    id: 'w4_napster', cat: 'tech', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Como responder à troca de arquivos?', 'How to answer file sharing?'),
    text: l('Milhões baixam seu catálogo de graça. A associação quer processos; a imprensa ri; os fãs estão do outro lado.', 'Millions download your catalog for free. The association wants lawsuits; the press laughs; fans are on the other side.'),
    options: [
      { id: 'sue', label: l('Processar fãs', 'Sue fans'), apply: (s) => setStance(s, 'sue') },
      { id: 'license', label: l('Licenciar para serviços legais', 'License to legal services'), apply: (s) => setStance(s, 'license') },
      { id: 'drm', label: l('Anticópia nos discos', 'Copy protection on discs'), apply: (s) => setStance(s, 'drm') },
      { id: 'cheap', label: l('Baixar o preço', 'Cut prices'), apply: (s) => setStance(s, 'cheap') },
    ],
  },
  {
    id: 'w4_360', cat: 'contract', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Contratos 360°?', '360° deals?'),
    text: l('Com a venda de discos caindo, o selo pode passar a ficar com parte de shows, marcas e produtos dos artistas.', 'With record sales falling, the label could take a cut of artists\' shows, brands and merch.'),
    options: [
      { id: 'adopt', label: l('Adotar o 360°', 'Adopt 360°'), hint: l('10% dos shows dos seus artistas (menos para estrelas, com teto anual por ato); confiança cai um pouco.', '10% of your acts\' shows (less from stars, with a yearly cap per act); trust drops a little.'), apply: (s) => { w4(s).deal360 = true; for (const id of playerActs(s)) s.acts[id].trust = clamp(s.acts[id].trust - 4, 0, 100); } },
      { id: 'skip', label: l('Manter contratos tradicionais', 'Keep traditional deals'), apply: (s) => rep(s, 'artists', 2) },
    ],
  },
  {
    id: 'w4_catalog_fund', cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Um fundo quer seu catálogo', 'A fund wants your catalog'),
    text: l('O fundo paga agora o equivalente a uns oito anos de repasse e recebe uma parte mensal durante 10 anos.', 'The fund pays now the equivalent of about eight years of pass-through and takes a monthly cut for 10 years.'),
    options: [
      { id: 'sell', label: l('Vender a participação', 'Sell the stake'), apply: (s) => catalogSale(s) },
      { id: 'keep', label: l('Manter o catálogo', 'Keep the catalog'), apply: () => {} },
    ],
  },
  {
    id: 'w4_nft', cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Lançar uma coleção em token?', 'Drop a token collection?'),
    text: l('Uma plataforma promete milhões por edições digitais numeradas do seu catálogo.', 'A platform promises millions for numbered digital editions of your catalog.'),
    options: [
      { id: 'drop', label: l('Lançar', 'Drop it'), hint: l('Dinheiro rápido; 40% de chance de escândalo.', 'Quick money; 40% scandal chance.'), apply: (s, r) => { gain(s, 'w4nft', 4000 + s.player.reputation.commercial * 120, 'Coleção em token'); w4(s).nft = s.year; if (r.chance(0.4)) { rep(s, 'artists', -6); rep(s, 'institutional', -4); notify(s, l('A coleção em token vira piada e acusação de golpe.', 'The token drop becomes a joke and a scam accusation.'), 'bad'); } } },
      { id: 'skip', label: l('Passar', 'Pass'), apply: () => {} },
    ],
  },
];
deferEvents(EVENTS);

function setBet(s: GameState, bet: FormatBet): void {
  w4(s).formatBet = bet;
  remember(s, 'industry', bet === 'both' ? l('O selo fabrica LP e compacto de 45.', 'The label presses both LP and 45.') : bet === 'lp' ? l('O selo aposta no LP de 33⅓.', 'The label bets on the 33⅓ LP.') : l('O selo aposta no compacto de 45.', 'The label bets on the 45 single.'), { important: true });
}

registerMod('pressingCost', 'w4bet', (s, value) => (w4(s).formatBet === 'both' && s.year <= 1956 ? { value: value * 1.08 } : null));

export function setStance(s: GameState, st: 'none' | 'sue' | 'cheap' | 'drm' | 'license'): void {
  const p = w4(s).piracy;
  if (p.stance === st) return;
  p.stance = st;
  p.since = s.week;
  remember(s, 'piracy', fmtL(l('Nova política contra a pirataria: {x}.', 'New anti-piracy policy: {x}.'), { x: STANCE_NAME[st] }));
}

export const STANCE_NAME: Record<string, L> = {
  none: l('nenhuma', 'none'), sue: l('processar fãs', 'sue fans'), cheap: l('preço baixo', 'low prices'),
  drm: l('anticópia', 'copy protection'), license: l('licenciar serviços', 'license services'),
};

function festivalResult(s: GameState, r: Rng, actId: string): void {
  const a = s.acts[actId];
  if (!a) return;
  pay(s, `w4fest:${a.id}`, 600, 'Inscrição em festival da canção');
  const best = Math.max(0, ...a.songs.map((id) => (s.songs[id]?.recorded ? s.songs[id].q : 0)));
  const brBonus = familyOf(a.genre) === 'brazil' ? 8 : 0;
  const score = best + brBonus + r.normal(0, 12);
  if (score > 72) {
    a.fame = clamp(a.fame + 6, 0, 100);
    a.fans.casual += 30000;
    a.fans.active += 3000;
    a.momentum = clamp(a.momentum + 20, 0, 100);
    remember(s, 'festival_tv', fmtL(l('{a} vence o festival da canção na TV!', '{a} wins the TV song festival!'), { a: a.name }), { actId: a.id, important: true });
    notify(s, fmtL(l('{a} vence o festival da canção!', '{a} wins the song festival!'), { a: a.name }), 'good');
  } else if (score > 52) {
    a.fame = clamp(a.fame + 2, 0, 100);
    a.fans.casual += 8000;
    remember(s, 'festival_tv', fmtL(l('{a} chega à final do festival da canção.', '{a} reaches the song festival final.'), { a: a.name }), { actId: a.id });
  } else {
    for (const id of a.members) { const p = s.persons[id]; if (p) p.morale = clamp(p.morale - 12, 0, 100); }
    a.fans.casual += 3000;
    remember(s, 'festival_tv', fmtL(l('{a} é vaiado no festival da canção.', '{a} is booed at the song festival.'), { a: a.name }), { actId: a.id });
  }
}

function catalogSale(s: GameState): void {
  const monthlySales = Math.max(money(s, 400), Math.round((s.player.totals.sales ?? 0) / Math.max(12, (s.year - s.config.startYear) * 12) * 0.2));
  post(s, 'w4cfsell', monthlySales * 100, 'w4_industry', 'Venda de participação no catálogo');
  w4(s).catalogFund = { until: s.year + 10, monthly: monthlySales };
  remember(s, 'industry', l('O selo vende parte do catálogo a um fundo de investimento.', 'The label sells a catalog stake to an investment fund.'), { important: true });
}

// 360°: parte dos shows dos artistas do selo vai para o caixa
registerSimHook('show', 'w4_360', (s, _r, arg) => {
  const sh = arg.show;
  if (!sh || !w4(s).deal360) return;
  const a = s.acts[sh.actId];
  if (!a || a.owner !== 'player' || a.playerBand) return;
  const cut = take360(s, a, sh.revenue, 0.1);
  if (cut <= 0) return;
  post(s, `w4_360:${sh.tourId}:${sh.cityId}:${s.day}`, cut, 'w4_industry', `Participação 360° ${a.name}`);
  a.cash -= cut;
});

// amostras: hip hop do jogador paga liberação (ou arrisca processo)
registerSimHook('launch', 'w4sample', (s, r, arg) => {
  const rel = arg.release;
  if (!rel || !mineRel(s, rel) || w4(s).ms.sample === undefined) return;
  const a = s.acts[rel.actId];
  if (!a || familyOf(a.genre) !== 'hiphop') return;
  if (s.flags.w4NoClear) {
    if (r.chance(0.18)) {
      post(s, `w4samplesuit:${rel.id}`, -money(s, 9000 + rel.songs.length * 1500), 'w4_legal', 'Processo por sample não liberado');
      rel.appeal *= 0.85;
      remember(s, 'sample', fmtL(l('"{t}" é processado por sample não liberado.', '"{t}" is sued over an uncleared sample.'), { t: rel.title }), { actId: a.id, important: true });
    }
  } else post(s, `w4clear:${rel.id}`, -money(s, 800 + rel.songs.length * 350), 'w4_legal', `Liberação de samples ${rel.title}`);
});

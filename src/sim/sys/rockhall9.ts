// Hall da Fama do Rock (rodada 9; com "Nomes reais", Rock and Roll Hall of Fame). Fundado em 1983,
// primeira turma em 1986. Indicados em outubro, turma anunciada e empossada em janeiro. Artistas ficam
// elegíveis 25 anos depois da estreia. Categorias: Artistas, Influência inicial e Prêmio de
// não-intérprete (executivos e fundadores de selo — o jogador pode entrar). Entrar dá fama, fãs novos
// e um surto no catálogo; o selo pode fazer campanha pelos seus e aceitar tocar na cerimônia.

import { clamp, type Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import { ownerOf } from './people/owner';
import { fmtL, money, notify, post, remember } from '../util';

export const HALL_FOUNDED = 1983;
export const HALL_FIRST_CLASS = 1986;
export const HALL_NOMS_MONTH = 9; // outubro (meses 0–11)
export const HALL_CEREMONY_MONTH = 0; // janeiro
export const HALL_WAIT = 25;

export type HallCat = 'performer' | 'early' | 'nonperformer';
export const HALL_CATS: Record<HallCat, L> = {
  performer: l('Artistas', 'Performers'),
  early: l('Influência inicial', 'Early influence'),
  nonperformer: l('Prêmio de não-intérprete', 'Non-performer award'),
};

export interface HallEntry { year: number; cat: HallCat; name: string; actId?: string; player?: boolean }
export interface HallState {
  noms: { year: number; ids: string[] } | null;
  inducted: HallEntry[];
  lobby: { actId: string; year: number; lv: number }[];
  perform: { actId: string; year: number; ans?: boolean }[];
}

declare module '../ext4' { interface Ext4 { rockhall9: HallState } }
registerExt4('rockhall9', () => ({ noms: null, inducted: [], lobby: [], perform: [] }));
export const hall = (s: GameState): HallState => {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  return (x.rockhall9 ??= { noms: null, inducted: [], lobby: [], perform: [] }) as HallState;
};

export function hallName(s: GameState): L {
  return s.config.realNames ? l('Rock and Roll Hall of Fame', 'Rock and Roll Hall of Fame') : l('Hall da Fama do Rock', 'Rock Hall of Fame');
}
export const hallExists = (s: GameState): boolean => s.year >= HALL_FOUNDED;

/** Turmas reais (de memória; aproximadas) — em "Nomes reais" esses nomes ganham prioridade no ano real. */
const REAL: Record<number, string[]> = {
  1986: ['Chuck Berry', 'James Brown', 'Ray Charles', 'Sam Cooke', 'Fats Domino', 'The Everly Brothers', 'Buddy Holly', 'Jerry Lee Lewis', 'Little Richard', 'Elvis Presley'],
  1987: ['Aretha Franklin', 'Marvin Gaye', 'Bo Diddley', 'Roy Orbison', 'Carl Perkins', 'Smokey Robinson', 'B.B. King', 'Muddy Waters'],
  1988: ['The Beatles', 'The Beach Boys', 'Bob Dylan', 'The Supremes', 'The Drifters'],
  1989: ['The Rolling Stones', 'Stevie Wonder', 'The Temptations', 'Otis Redding', 'Dion'],
  1990: ['The Who', 'The Kinks', 'Simon & Garfunkel', 'Four Tops', 'Bobby Darin', 'The Platters'],
  1992: ['The Jimi Hendrix Experience', 'Johnny Cash', 'The Isley Brothers'],
  1993: ['The Doors', 'Cream', 'Creedence Clearwater Revival', 'Sly & the Family Stone', 'Etta James'],
  1994: ['Elton John', 'John Lennon', 'Bob Marley', 'Grateful Dead', 'The Band'],
  1995: ['Led Zeppelin', 'Janis Joplin', 'Neil Young', 'Al Green', 'Frank Zappa'],
  1996: ['Pink Floyd', 'David Bowie', 'Jefferson Airplane', 'The Velvet Underground', 'Gladys Knight & the Pips'],
  1997: ['Bee Gees', 'Joni Mitchell', 'Parliament-Funkadelic', 'The Jackson 5', 'Crosby, Stills & Nash'],
  1998: ['Fleetwood Mac', 'Santana', 'Eagles', 'The Mamas & the Papas'],
  1999: ['Bruce Springsteen', 'Paul McCartney', 'Billy Joel', 'Curtis Mayfield', 'Dusty Springfield'],
  2000: ['Eric Clapton', 'Earth, Wind & Fire', 'The Lovin\' Spoonful', 'Bonnie Raitt'],
  2001: ['Queen', 'Aerosmith', 'Michael Jackson', 'Paul Simon', 'Steely Dan'],
  2002: ['Ramones', 'Talking Heads', 'Tom Petty and the Heartbreakers', 'Isaac Hayes'],
  2003: ['AC/DC', 'The Clash', 'The Police', 'Elvis Costello & the Attractions'],
  2004: ['Prince', 'George Harrison', 'Bob Seger', 'ZZ Top'],
  2005: ['U2', 'The Pretenders', 'Percy Sledge'],
  2006: ['Black Sabbath', 'Sex Pistols', 'Lynyrd Skynyrd', 'Blondie'],
  2007: ['Grandmaster Flash and the Furious Five', 'R.E.M.', 'Van Halen', 'Patti Smith', 'The Ronettes'],
  2008: ['Madonna', 'Leonard Cohen', 'John Mellencamp', 'The Dave Clark Five'],
  2009: ['Metallica', 'Run-DMC', 'Jeff Beck', 'Bobby Womack'],
  2010: ['ABBA', 'Genesis', 'The Stooges', 'The Hollies'],
  2011: ['Alice Cooper', 'Neil Diamond', 'Tom Waits', 'Darlene Love'],
  2012: ['Beastie Boys', 'Red Hot Chili Peppers', 'Guns N\' Roses', 'Donovan', 'Laura Nyro'],
  2013: ['Rush', 'Public Enemy', 'Heart', 'Donna Summer', 'Randy Newman'],
  2014: ['Nirvana', 'Kiss', 'Peter Gabriel', 'Hall & Oates', 'Cat Stevens', 'Linda Ronstadt'],
  2015: ['Green Day', 'Lou Reed', 'Joan Jett & the Blackhearts', 'Stevie Ray Vaughan', 'Bill Withers'],
  2016: ['N.W.A', 'Deep Purple', 'Chicago', 'Cheap Trick', 'Steve Miller'],
  2017: ['Tupac Shakur', 'Pearl Jam', 'Journey', 'Yes', 'Electric Light Orchestra', 'Joan Baez'],
  2018: ['Bon Jovi', 'Nina Simone', 'The Cars', 'Dire Straits', 'The Moody Blues'],
  2019: ['Radiohead', 'The Cure', 'Def Leppard', 'Janet Jackson', 'Stevie Nicks', 'Roxy Music'],
  2020: ['Whitney Houston', 'Depeche Mode', 'The Notorious B.I.G.', 'Nine Inch Nails', 'The Doobie Brothers', 'T. Rex'],
  2021: ['Tina Turner', 'Foo Fighters', 'Jay-Z', 'Carole King', 'The Go-Go\'s', 'Todd Rundgren'],
  2022: ['Eminem', 'Duran Duran', 'Dolly Parton', 'Lionel Richie', 'Eurythmics', 'Pat Benatar', 'Carly Simon'],
  2023: ['Missy Elliott', 'Willie Nelson', 'George Michael', 'Sheryl Crow', 'Kate Bush', 'Rage Against the Machine'],
  2024: ['Mary J. Blige', 'Cher', 'Foreigner', 'A Tribe Called Quest', 'Ozzy Osbourne', 'Dave Matthews Band', 'Peter Frampton'],
};
const norm = (x: string): string => x.toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]/g, '');
let realYear: Map<string, number> | null = null;
function realYearOf(name: string): number | undefined {
  if (!realYear) {
    realYear = new Map();
    for (const [y, names] of Object.entries(REAL)) for (const n of names) realYear.set(norm(n), +y);
  }
  return realYear.get(norm(name));
}

/** Peso do gênero: o Hall começou no rock, soul e blues e só abriu para o hip-hop em 2007. */
function genreW(s: GameState, a: Act): number {
  const f = familyOf(a.genre);
  if (f === 'rock' || f === 'rnb' || f === 'blues_jazz') return 1;
  if (f === 'pop' || f === 'country_folk') return 0.8;
  if (f === 'hiphop') return s.year >= 2007 ? 0.85 : 0.2;
  if (f === 'caribbean') return 0.6;
  return 0.35;
}

export function eligibleActs(s: GameState): Act[] {
  const done = new Set(hall(s).inducted.map((x) => x.actId).filter(Boolean));
  return Object.values(s.acts).filter((a) => a.debutYear > 0 && s.year - a.debutYear >= HALL_WAIT && !done.has(a.id) && a.releases.length > 0);
}

export function hallScore(s: GameState, a: Act): number {
  const lob = hall(s).lobby.filter((x) => x.actId === a.id && x.year === s.year).reduce((t, x) => t + x.lv, 0);
  let sc = (a.number1s * 3 + a.hits + a.awards * 2 + (a.legend ? 8 : 0) + a.fame / 8 + (a.image?.artistic ?? 50) / 12) * genreW(s, a);
  sc += lob * 3;
  if (s.config.realNames) {
    const ry = realYearOf(a.name);
    if (ry !== undefined) sc += ry <= s.year ? 40 : 4;
  }
  return sc;
}

function nominate(s: GameState): void {
  const st = hall(s);
  const year = s.year + 1;
  const pool = eligibleActs(s).map((a) => ({ a, sc: hallScore(s, a) })).filter((x) => x.sc >= 6).sort((x, y) => y.sc - x.sc).slice(0, 16);
  st.noms = { year, ids: pool.map((x) => x.a.id) };
  const mine = pool.filter((x) => x.a.owner === 'player' || x.a.playerBand);
  if (pool.length) notify(s, fmtL(l('{h}: {n} indicados para a turma de {y}{m}.', '{h}: {n} nominees for the class of {y}{m}.'), {
    h: hallName(s), n: pool.length, y: year,
    m: mine.length ? fmtL(l(' — inclusive {a}', ' — including {a}'), { a: mine.map((x) => x.a.name).join(', ') }) : '',
  }), mine.length ? 'good' : 'info');
}

function induct(s: GameState, r: Rng): void {
  const st = hall(s);
  const year = s.year;
  const ids = st.noms?.year === year ? st.noms.ids : eligibleActs(s).sort((a, b) => hallScore(s, b) - hallScore(s, a)).slice(0, 12).map((a) => a.id);
  const ranked = ids.map((id) => s.acts[id]).filter((a): a is Act => !!a).map((a) => ({ a, sc: hallScore(s, a) * (0.85 + r.next() * 0.3) })).sort((x, y) => y.sc - x.sc);
  const size = year === HALL_FIRST_CLASS ? 10 : 5 + Math.floor(r.next() * 3);
  const cls = ranked.slice(0, size);
  for (const { a } of cls) inductAct(s, a, a.debutYear < 1956 && s.year - a.debutYear > 35 && cls.length > 4 && r.next() < 0.15 ? 'early' : 'performer');
  // não-intérprete: o jogador (25+ anos de selo e um catálogo que importa) ou um fundador rival
  const founded = s.config.startYear;
  const mineIn = st.inducted.filter((x) => x.player === undefined && x.actId && (s.acts[x.actId]?.owner === 'player')).length;
  if (!st.inducted.some((x) => x.player) && year - founded >= HALL_WAIT && mineIn + cls.filter((x) => x.a.owner === 'player').length >= 2 && r.next() < 0.5) {
    st.inducted.push({ year, cat: 'nonperformer', name: ownerOf(s).name, player: true });
    remember(s, 'hall', fmtL(l('Você entra no {h} com o prêmio de não-intérprete: o selo virou parte da história.', 'You enter the {h} with the non-performer award: the label became part of history.'), { h: hallName(s) }), { important: true });
    notify(s, fmtL(l('Você foi empossado no {h}!', 'You were inducted into the {h}!'), { h: hallName(s) }), 'good');
  } else if (r.next() < 0.6) {
    const rival = Object.values(s.labels).filter((lb) => year - lb.founded >= HALL_WAIT && !st.inducted.some((x) => x.name === lb.name)).sort((x, y) => (y.reputation ?? 0) - (x.reputation ?? 0))[0];
    if (rival) st.inducted.push({ year, cat: 'nonperformer', name: rival.name });
  }
  st.noms = null;
  st.lobby = st.lobby.filter((x) => x.year > year);
  if (cls.length) remember(s, 'hall', fmtL(l('Turma de {y} do {h}: {n}.', '{h} class of {y}: {n}.'), { y: year, h: hallName(s), n: cls.map((x) => x.a.name).join(', ') }), { important: true });
}

function inductAct(s: GameState, a: Act, cat: HallCat): void {
  const st = hall(s);
  const mine = a.owner === 'player' || !!a.playerBand;
  st.inducted.push({ year: s.year, cat, name: a.name, actId: a.id, player: undefined });
  a.legend = true;
  a.fame = clamp(a.fame + 6 * (1 - a.fame / 130), 0, 100);
  a.momentum = clamp(a.momentum + 18, 0, 100);
  a.fans.casual += Math.round(3000 + a.fame * 400);
  remember(s, 'hall', fmtL(l('{a} entra no {h} ({c}).', '{a} is inducted into the {h} ({c}).'), { a: a.name, h: hallName(s), c: HALL_CATS[cat] }), { actId: a.id, important: mine || a.fame > 60 });
  if (mine && a.status !== 'retired' && !a.deceased) {
    st.perform.push({ actId: a.id, year: s.year });
    notify(s, fmtL(l('{a} entrou no {h}! Convite para tocar na cerimônia (veja Mundo → Hall da Fama).', '{a} was inducted into the {h}! Invited to play the ceremony (see World → Hall of Fame).'), { a: a.name, h: hallName(s) }), 'good');
  }
}

export const LOBBY_COST = [0, 15000, 40000, 90000];
/** Campanha discreta junto aos votantes (entre a indicação e a posse). Nível 3 pode pegar mal. */
export function lobby(s: GameState, r: Rng, actId: string, lv: 1 | 2 | 3): L | null {
  const st = hall(s);
  const a = s.acts[actId];
  if (!a || !(a.owner === 'player' || a.playerBand)) return l('Só artistas seus.', 'Only your acts.');
  if (!st.noms || !st.noms.ids.includes(actId)) return l('Só é possível fazer campanha por indicados.', 'You can only campaign for nominees.');
  const cost = money(s, LOBBY_COST[lv]);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `hall:${actId}:${lv}`, -cost, 'marketing', `Campanha no Hall da Fama: ${a.name}`);
  st.lobby.push({ actId, year: st.noms.year, lv });
  if (lv === 3 && r.next() < 0.3) {
    a.image && (a.image.publicImage = clamp(a.image.publicImage - 6, 0, 100));
    notify(s, l('A imprensa chama sua campanha de "compra de votos". Pegou mal.', 'The press calls your campaign "vote buying". It looks bad.'), 'bad');
    st.lobby.push({ actId, year: st.noms.year, lv: -2 });
  }
  return null;
}

export function answerPerform(s: GameState, actId: string, yes: boolean): void {
  const p = hall(s).perform.find((x) => x.actId === actId && x.ans === undefined);
  const a = s.acts[actId];
  if (!p || !a) return;
  p.ans = yes;
  if (!yes) return;
  post(s, `hallshow:${actId}`, -money(s, 8000), 'shows', `Cerimônia do Hall da Fama: ${a.name}`);
  a.fame = clamp(a.fame + 3, 0, 100);
  a.fans.active += Math.round(1500 + a.fame * 120);
  a.momentum = clamp(a.momentum + 10, 0, 100);
  remember(s, 'hall', fmtL(l('{a} toca na cerimônia do {h}: a apresentação viraliza.', '{a} plays the {h} ceremony: the performance goes viral.'), { a: a.name, h: hallName(s) }), { actId, important: true });
}

registerSimHook('month', 'rockhall9', (s, r) => {
  if (s.month === HALL_NOMS_MONTH && s.year + 1 >= HALL_FIRST_CLASS) nominate(s);
  if (s.month === HALL_CEREMONY_MONTH && s.year >= HALL_FIRST_CLASS) induct(s, r);
  if (s.year === HALL_FOUNDED && s.month === 3) remember(s, 'hall', fmtL(l('Nasce a fundação do {h}. A primeira turma será empossada em 1986.', 'The {h} foundation is born. The first class will be inducted in 1986.'), { h: hallName(s) }), { important: true });
});

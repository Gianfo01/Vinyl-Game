// Rodada 27 (CITY2) — os LUGARES do bairro: todo prédio do "Nosso mundo" que não é seu vira um lugar com dono,
// gente dentro e ações. Garante os lugares básicos da música de cada época (casa de shows, loja de
// partituras/discos/CDs/vinil, rádio depois de 1922, estúdio, bar, jornal/revista), NPC quando não são seus.
// As ações passam pelos sistemas que já existem (turnê de uma data em route8, rádio em radio18, sessão em
// studio, imprensa em media17, compra de casa em venues17, show no bar em life, hype em hype12).
//   • places27(s, fillers)   — PURO: lotes de vizinhos (hood19) + lotes de cidade comum → lugares;
//   • required27 / covered27  — PURO: o que a época exige e o que já existe (seu ou NPC);
//   • placeActs27 / doPlace27 — ações (com custo, motivo de bloqueio e efeito real).
// Sem sorteio do jogo: nomes, donos e funcionários vêm de hash estável (não mexe na semente).

import { Rng, clamp } from '../../core/rng';
import { FIRST_NAMES, LAST_NAMES } from '../../data/people';
import { cityById, familyOf, l, type L } from '../../data/world';
import type { Goto18 } from '../inbox18';
import { cashWhy20, freeCash20 } from '../oblig20';
import { addStress } from '../stress17';
import { startSession } from '../studio';
import type { Act, GameState } from '../types';
import { fmtL, hasTech, money, playerActs, post } from '../util';
import { buildings18, type BKind } from './campus18';
import { NB19, nb19, type Nb19 } from './hood19';
import { addHype } from './hype12';
import { playBar, playerPerson } from './life';
import { interview, outlets17, releaseNews } from './media17';
import { FMT18, fmtsNow18, lunchPd18, pitchRadio18, radio18, type Fmt18 } from './radio18';
import { bookRoutedTour, type DealTerms } from './route8';
import { inTown31, playingThisWeek31 } from './where31';
import { ventures } from './ventures9';
import { VENUES17, buyVenue17, v17, venueOpen, venuePrice } from './venues17';

// ---------------------------------------------------------------- tipos

export type PlaceK27 = 'venue' | 'records' | 'radio' | 'studio' | 'bar' | 'press' | 'rehearsal' | 'label' | 'office' | 'apartments' | 'hotel' | 'instruments'
  // r31 (S): o submundo da cidade — fachada de facção, delegacia (com cadeia) e o mercado negro
  | 'facade' | 'police' | 'market';
/** Os lugares básicos da música (sempre presentes na cidade, conforme a época). */
export const MUSIC27: PlaceK27[] = ['venue', 'records', 'studio', 'radio', 'bar', 'press'];
export const RADIO_FROM27 = 1922;

export interface Person27 {
  name: string; role: L; /** pessoa real do jogo (aparência e ficha) */ pid?: string; actId?: string; mine?: boolean;
  /** r31 (I): ficha de quem não é integrante (CEO 'l:', crítico, chefe de facção 'o:') */ key?: string;
  /** r31 (I): da equipe do lugar (índice da função: 0 = dono) e se faz bico; ausente = motivo (turnê, prisão) */ staff?: boolean; job?: number; bico?: boolean; away?: L;
  /** r31 (I): o seu personagem (presente onde você está) */ you?: boolean;
  /** r31 (S): preso(a) numa cela da delegacia */ cell?: boolean;
}
/** r31 (I): equipe real do lugar (sys/gente31 preenche; sem ele, nomes inventados como antes). */
export const CREW27: { fn?: (s: GameState, k: PlaceK27, copy: number) => Person27[] | null } = {};
export interface Place27 {
  /** id clicável: `nb:<lote>` (vizinho do hood19) ou `pl:<lote>` (cidade comum) */
  id: string; lot: number; k: PlaceK27;
  name: L; /** o que é nesta época (loja de partituras, loja de CDs…) */ what: L;
  owner: string; ownerK: 'npc' | 'rival' | 'media' | 'venue';
  /** estado agora (uma frase) */ now: L;
  people: Person27[];
  /** outros inquilinos (quando faltam lotes, o lugar básico divide o prédio) */ also: PlaceK27[];
  src: 'nb' | 'fill';
  /** prédio desenhado com este tipo */ draw: BKind;
  /** venda: vizinho à venda (hood19) ou casa de shows real (venues17) */ sale?: number;
  /** casa de shows real (venues17) */ venue?: string;
  /** r31 (FOS): a casa da família Fossati (moradia da cidade comum que a família ocupa) */ fam31?: boolean;
  /** veículo de imprensa real (media17) */ outlet?: string;
  /** r31 (S): facção dona da fachada (id do crime17) */ org?: string;
}
/** r31 (FOS): a casa da família Fossati na cidade de início (sys/fossati31 preenche): ocupa um prédio de moradia. */
export const FAMHOME27: { fn?: (s: GameState) => { name: L; what: L; owner: string; now: L; people: Person27[] } | null } = {};
/** r31 (S): lugares do submundo na cidade (sys/under31 preenche): fachadas das facções do país, delegacia e beco. */
export interface Under27 { k: 'facade' | 'police' | 'market'; key: string; name: L; what: L; owner: string; people: Person27[]; now: L; org?: string }
export const UNDER27: { fn?: (s: GameState) => Under27[]; /** emissários das facções de outra cidade do país (no bar) */ bar?: (s: GameState) => Person27[] } = {};

// ---------------------------------------------------------------- utilidades estáveis

const hash = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x / 4294967296; };
const pick = <T>(xs: T[], key: string): T => xs[Math.floor(hash(key) * xs.length) % xs.length];
const langOf = (s: GameState) => cityById[s.config.homeCity]?.lang ?? 'en';
/** Nome de NPC pela língua da cidade (hash: não toca no RNG do jogo). */
export function npcName27(s: GameState, key: string): string {
  const lg = langOf(s);
  const f = FIRST_NAMES[lg] ?? FIRST_NAMES.en, la = LAST_NAMES[lg] ?? LAST_NAMES.en;
  return `${pick(f, `${s.config.seed}|f|${key}`)} ${pick(la, `${s.config.seed}|l|${key}`)}`;
}

// ---------------------------------------------------------------- época

/** Lugares básicos exigidos no ano (rádio só depois de 1922 e com a tecnologia). */
export function required27(s: GameState): PlaceK27[] {
  return MUSIC27.filter((k) => k !== 'radio' || (s.year >= RADIO_FROM27 && hasTech(s, 'radio')));
}

const UK = new Set(['london', 'manchester', 'liverpool', 'glasgow', 'bristol', 'birmingham', 'sheffield', 'dublin', 'edinburgh', 'belfast', 'leeds', 'newcastle']);
/** O que o lugar é nesta época (e cidade). */
export function eraWhat27(k: PlaceK27, year: number, city = ''): L {
  const lg = cityById[city]?.lang ?? 'en';
  switch (k) {
    case 'records': return year < 1920 ? l('Loja de partituras e pianos', 'Sheet music and piano shop') : year < 1950 ? l('Loja de discos de 78 rpm e vitrolas', '78 rpm record and gramophone shop')
      : year < 1985 ? l('Loja de discos (LPs e compactos)', 'Record shop (LPs and singles)') : year < 2008 ? l('Loja de CDs', 'CD store') : l('Loja de vinil (colecionadores)', 'Vinyl shop (collectors)');
    case 'venue': return year < 1920 ? l('Teatro de variedades', 'Music hall') : year < 1946 ? l('Salão de baile', 'Dance hall') : year < 1968 ? l('Clube de jazz e baile', 'Jazz club and ballroom')
      : year < 1990 ? l('Casa de rock', 'Rock club') : l('Casa de shows', 'Live venue');
    case 'studio': return year < 1925 ? l('Sala de gravação acústica (cornetas)', 'Acoustic recording room (horns)') : year < 1948 ? l('Estúdio de gravação elétrica', 'Electrical recording studio')
      : year < 1978 ? l('Estúdio de fita', 'Tape studio') : year < 2000 ? l('Estúdio multipista', 'Multitrack studio') : l('Estúdio digital', 'Digital studio');
    case 'radio': return year < 1950 ? l('Rádio AM com auditório', 'AM radio with a studio audience') : year < 1980 ? l('Rádio AM/FM', 'AM/FM radio') : year < 2010 ? l('Rádio FM', 'FM radio') : l('Rádio e streaming', 'Radio and streaming');
    case 'bar': return UK.has(city) ? l('Pub com palco', 'Pub with a stage') : lg === 'pt' ? l('Botequim com roda de música', 'Bar with live music') : lg === 'fr' ? l('Café-concerto', 'Café-concert')
      : year >= 1920 && year < 1934 && cityById[city]?.market === 'na' ? l('Bar clandestino (speakeasy)', 'Speakeasy') : l('Bar com palco', 'Bar with a stage');
    case 'press': return year < 1950 ? l('Jornal (coluna de música)', 'Newspaper (music column)') : year < 2000 ? l('Revista de música', 'Music weekly') : l('Redação de música (site e revista)', 'Music newsroom (site and magazine)');
    case 'rehearsal': return l('Sala de ensaio', 'Rehearsal space');
    case 'label': return l('Escritório de gravadora rival', 'Rival label office');
    case 'office': return l('Escritórios', 'Offices');
    case 'apartments': return year < 1930 ? l('Casa de cômodos', 'Tenement') : l('Prédio de apartamentos', 'Apartment block');
    case 'hotel': return l('Hotel', 'Hotel');
    case 'instruments': return l('Loja de instrumentos', 'Instrument shop');
    case 'facade': return l('Fachada', 'Front business');
    case 'police': return year < 1930 ? l('Delegacia e cadeia', 'Police station and lockup') : l('Delegacia (com cadeia)', 'Police station (with cells)');
    case 'market': return l('Mercado negro (beco)', 'Black market (alley)');
  }
}

type NameT = [L, number?, number?]; // nome, de, até
const NAMES27: Partial<Record<PlaceK27, NameT[]>> = {
  records: [[l('Partituras & Pianos', 'Sheet Music & Pianos'), 0, 1919], [l('Casa Musical', 'The Music House'), 0, 1919], [l('Casa do Disco', 'The Record House'), 1920, 1949], [l('Discos & Vitrolas', 'Records & Victrolas'), 1920, 1959],
    [l('Bolacha Preta', 'Black Platter'), 1950, 1984], [l('Groove Shop', 'Groove Shop'), 1960, 1984], [l('Mega Discos', 'Mega Records'), 1985, 2007], [l('CD Center', 'CD Center'), 1985, 2007], [l('Agulha & Sulco', 'Needle & Groove'), 2008], [l('Garimpo Vinil', 'Crate Diggers'), 2008]],
  venue: [[l('Teatro Apolo', 'Apollo Music Hall'), 0, 1919], [l('Salão Imperial', 'Imperial Ballroom'), 1920, 1967], [l('Palace', 'The Palace'), 0, 1967], [l('Clube Bossa', 'Club Bossa'), 1946, 1967], [l('The Vault', 'The Vault'), 1968],
    [l('Porão Elétrico', 'Electric Cellar'), 1968], [l('Arena Sul', 'South Arena'), 1990]],
  studio: [[l('Gravações Fonográficas', 'Phonograph Recordings'), 0, 1947], [l('Estúdio Central', 'Central Studios'), 0], [l('Fita Mágica', 'Magic Tape'), 1948, 1999], [l('Estúdio 4 Pistas', 'Four Track Studio'), 1960, 1979], [l('Sala Digital', 'Digital Room'), 2000]],
  radio: [[l('Rádio Sociedade', 'Society Radio'), 0, 1959], [l('Rádio Cidade', 'City Radio'), 0], [l('Rádio Nacional', 'National Radio'), 0, 1979], [l('FM Onda', 'Wave FM'), 1975], [l('Rádio Mundo', 'World Radio'), 2010]],
  bar: [[l('Bar do Zé', 'Joe\'s Bar')], [l('Taverna do Porto', 'Harbour Tavern')], [l('Café Elétrico', 'Electric Café'), 1900], [l('The Anchor', 'The Anchor'), 1950], [l('Porão 77', 'Cellar 77'), 1977]],
  press: [[l('Diário da Cidade', 'City Daily'), 0, 1999], [l('Gazeta Musical', 'Music Gazette'), 0], [l('Semanário do Som', 'Sound Weekly'), 1950], [l('Ruído', 'Noise'), 1977]],
  rehearsal: [[l('Sala de Ensaio Garagem', 'Garage Rehearsal Rooms')], [l('Estúdio de Ensaio Pulso', 'Pulse Rehearsal Rooms')]],
  office: [[l('Companhia de Seguros', 'Insurance Company')], [l('Escritório de Advocacia', 'Law Firm')], [l('Banco Comercial', 'Commercial Bank')], [l('Agência de Publicidade', 'Advertising Agency'), 1920], [l('Empresa de Tecnologia', 'Tech Company'), 1990]],
  apartments: [[l('Edifício Aurora', 'Aurora Building')], [l('Edifício Esperança', 'Hope House')], [l('Residencial Jardim', 'Garden Court')], [l('Vila dos Músicos', 'Musicians\' Row')]],
  hotel: [[l('Hotel Central', 'Central Hotel')], [l('Grande Hotel', 'Grand Hotel')], [l('Hotel dos Artistas', 'Artists\' Hotel'), 1930]],
  instruments: [[l('Casa dos Instrumentos', 'The Instrument House')], [l('Guitarras & Cia', 'Guitars & Co.'), 1940], [l('Loja do Músico', 'The Musician\'s Shop')]],
};
/** Nome do lugar pela época (estável pelo lote). */
export function placeName27(s: GameState, k: PlaceK27, lot: number): L {
  const ok = (NAMES27[k] ?? []).filter(([, a, b]) => s.year >= (a ?? 0) && s.year <= (b ?? 9999)).map(([n]) => n);
  return ok.length ? pick(ok, `${s.config.seed}|pl27|${k}|${lot}`) : eraWhat27(k, s.year, s.config.homeCity);
}

const ROLE27: Record<PlaceK27, [L, L]> = {
  venue: [l('Dono da casa', 'Owner'), l('Técnico de som', 'Sound engineer')], records: [l('Dono da loja', 'Shop owner'), l('Balconista', 'Clerk')],
  radio: [l('Diretor de programação', 'Programme director'), l('Locutor', 'Presenter')], studio: [l('Dono do estúdio', 'Studio owner'), l('Técnico de gravação', 'Recording engineer')],
  bar: [l('Dono do bar', 'Bar owner'), l('Garçom', 'Waiter')], press: [l('Editor', 'Editor'), l('Repórter de música', 'Music reporter')],
  rehearsal: [l('Dono', 'Owner'), l('Zelador', 'Caretaker')], label: [l('Diretor', 'Director'), l('Caçador de talentos', 'A&R scout')],
  office: [l('Gerente', 'Manager'), l('Secretária', 'Secretary')], apartments: [l('Síndico', 'Building manager'), l('Porteiro', 'Doorman')],
  hotel: [l('Gerente do hotel', 'Hotel manager'), l('Recepcionista', 'Receptionist')], instruments: [l('Luthier', 'Luthier'), l('Vendedor', 'Salesperson')],
  facade: [l('Gerente', 'Manager'), l('Garçom', 'Waiter')], police: [l('Delegado(a)', 'Police chief'), l('Detetive', 'Detective')], market: [l('Receptador', 'Fence'), l('Olheiro', 'Lookout')],
};
/** Tipo de prédio desenhado no mapa para cada lugar. */
export const DRAW27: Record<PlaceK27, BKind> = {
  venue: 'venue', records: 'store', radio: 'media', studio: 'studio', bar: 'venue', press: 'publisher', rehearsal: 'rehearsal', label: 'branch',
  office: 'office', apartments: 'home', hotel: 'office', instruments: 'store', facade: 'venue', police: 'office', market: 'store',
};
const NBK27: Record<Nb19['k'], PlaceK27> = { rival: 'label', records: 'records', bar: 'bar', rehearsal: 'rehearsal', radio: 'radio' };

// ---------------------------------------------------------------- o que já é seu

/** Lugares básicos que o JOGADOR já tem no bairro (casa de shows, estúdio, loja, veículo próprio). */
export function ownedMusic27(s: GameState): Set<PlaceK27> {
  const out = new Set<PlaceK27>();
  const vs = new Map(ventures(s).list.map((v) => [`v:${v.id}`, v]));
  for (const b of buildings18(s)) {
    if (b.zone !== 'campus' || b.st === 'sold' || b.st === 'closed' || b.st === 'planned' || b.st === 'building') continue;
    if (b.kind === 'venue') out.add('venue');
    else if (b.kind === 'studio') out.add('studio');
    else if (b.kind === 'store') out.add('records');
    else if (b.kind === 'rehearsal') out.add('rehearsal');
    else if (b.kind === 'media') out.add(vs.get(b.id)?.media === 'radio' ? 'radio' : 'press');
  }
  return out;
}

// ---------------------------------------------------------------- gente real

const actsHere = (s: GameState) => Object.values(s.acts).filter((a) => a.city === s.config.homeCity && a.owner !== 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && !a.deceased);
const membersOf = (s: GameState, a: Act, n: number, role: L, mine = false): Person27[] =>
  a.members.slice(0, n).map((pid) => ({ name: s.persons[pid]?.name ?? a.name, role, pid, actId: a.id, mine }));
export const homeShowSoon = (s: GameState, days = 21) => {
  const mine = new Set(playerActs(s));
  for (const t of s.tours) if (mine.has(t.actId) && (t.status === 'planned' || t.status === 'running')) {
    const st = t.stops.find((x) => x.cityId === s.config.homeCity && x.day >= s.day && x.day - s.day <= days);
    if (st) return { t, st };
  }
  return null;
};

function peopleOf(s: GameState, k: PlaceK27, key: string, owner: string): { people: Person27[]; now: L } {
  const r = ROLE27[k];
  const people: Person27[] = [{ name: owner, role: r[0] }, { name: npcName27(s, `${key}|staff`), role: r[1] }];
  let now: L = l('Movimento normal.', 'Business as usual.');
  // r31 (I): só quem está na cidade aparece (turnê fora, prisão e morte tiram da agenda)
  const locals = actsHere(s).filter((a) => a.members.some((m) => inTown31(s, m)));
  const tonight = locals.length ? locals[Math.floor(hash(`${s.config.seed}|${key}|${s.year}|${s.month}`) * locals.length)] : undefined;
  // r31 (I): quem tem data marcada na cidade nesta semana toca na casa de shows (agenda real das turnês)
  const booked = k === 'venue' ? playingThisWeek31(s).map((x) => s.acts[x.actId]).find((a) => a && a.owner !== 'player') : undefined;
  if (k === 'venue' || k === 'bar') {
    const sh = k === 'venue' ? homeShowSoon(s) : null;
    if (booked && !sh) { people.push(...membersOf(s, booked, 3, l('Toca nesta semana', 'Playing this week'))); now = fmtL(l('Nesta semana: {a}.', 'This week: {a}.'), { a: booked.name }); }
    else if (sh) {
      const a = s.acts[sh.t.actId];
      if (a) { people.push(...membersOf(s, a, 3, l('Seu artista (passagem de som)', 'Your act (soundcheck)'), true)); now = fmtL(l('Show de {a} em {d} dia(s): cartaz na porta.', '{a} plays in {d} day(s): poster at the door.'), { a: a.name, d: sh.st.day - s.day }); }
    } else if (tonight && hash(`${key}|on|${s.week}`) < (k === 'bar' ? 0.7 : 0.55)) { people.push(...membersOf(s, tonight, 3, l('No palco hoje', 'On stage tonight'))); now = fmtL(l('Hoje no palco: {a}.', 'On stage tonight: {a}.'), { a: tonight.name }); }
    else now = k === 'bar' ? l('Noite de jam aberta.', 'Open jam night.') : l('Casa vazia: datas livres para marcar.', 'Empty house: open dates to book.');
  } else if (k === 'studio') {
    const ses = s.sessions.filter((x) => !x.done && x.tier >= 1 && playerActs(s).includes(x.actId));
    const own = ownedMusic27(s).has('studio');
    if (ses.length && !own) { const a = s.acts[ses[0].actId]; if (a) { people.push(...membersOf(s, a, 3, l('Seu artista gravando', 'Your act recording'), true)); now = fmtL(l('{a} grava aqui (sessão alugada).', '{a} is recording here (rented session).'), { a: a.name }); } }
    else if (tonight) { people.push(...membersOf(s, tonight, 2, l('Gravando uma demo', 'Recording a demo'))); now = fmtL(l('{a} grava uma demo.', '{a} is cutting a demo.'), { a: tonight.name }); }
  } else if (k === 'radio') {
    const rot = (s.x4 as unknown as { radio18?: { rot?: Record<string, unknown[]> } }).radio18?.rot ?? {};
    const rel = Object.keys(rot).map((id) => s.releases[id]).find((x) => x?.owner === 'player' && (rot[x.id]?.length ?? 0) > 0);
    if (rel) { now = fmtL(l('Tocando o SEU disco: "{t}".', 'Playing YOUR record: "{t}".'), { t: rel.title }); const a = s.acts[rel.actId]; if (a && hash(`${key}|${s.week}`) < 0.5) people.push(...membersOf(s, a, 1, l('Entrevista ao vivo', 'Live interview'), true)); }
    else { const top = s.charts.singles[0] ? s.releases[s.charts.singles[0].releaseId] : undefined; if (top) now = fmtL(l('No ar: "{t}" ({a}).', 'On air: "{t}" ({a}).'), { t: top.title, a: s.acts[top.actId]?.name ?? '?' }); }
  } else if (k === 'records') {
    const top = s.charts.albums[0] ? s.releases[s.charts.albums[0].releaseId] : undefined;
    const mine = s.charts.albums.slice(0, 20).map((e) => s.releases[e.releaseId]).find((x) => x?.owner === 'player');
    now = mine ? fmtL(l('Seu disco na vitrine: "{t}".', 'Your record in the window: "{t}".'), { t: mine.title }) : top ? fmtL(l('Vitrine: "{t}" ({a}).', 'Window display: "{t}" ({a}).'), { t: top.title, a: s.acts[top.actId]?.name ?? '?' }) : l('Saldão de usados.', 'Used-records sale.');
    people.push({ name: npcName27(s, `${key}|c1`), role: l('Cliente garimpando', 'Customer digging') });
  } else if (k === 'press') {
    now = l('Fechando a edição: pautas abertas.', 'Closing the issue: open to pitches.');
  } else if (k === 'rehearsal') {
    if (tonight) { people.push(...membersOf(s, tonight, 3, l('Ensaiando', 'Rehearsing'))); now = fmtL(l('{a} ensaia até tarde.', '{a} rehearses late.'), { a: tonight.name }); }
  }
  return { people, now };
}

// ---------------------------------------------------------------- lugares

/** Rivais DA CIDADE (ou do país) — escritório estrangeiro não aparece no bairro. */
function placeOfNb(s: GameState, nb: Nb19): Place27 {
  const k = NBK27[nb.k];
  const key = `nb${nb.lot}`;
  const rv = nb.who ? s.labels[nb.who] : undefined;
  const owner = k === 'label' ? (rv?.ceo || npcName27(s, `${key}|o`)) : npcName27(s, `${key}|o`);
  const { people, now } = peopleOf(s, k, key, owner);
  // r31 (I): o CEO é a pessoa do selo (ficha do líder), não o balconista; e os artistas dele que estão na cidade
  if (rv) {
    if (rv.leaderId) people[0] = { name: rv.ceo || owner, role: l('CEO', 'CEO'), key: `l:${rv.leaderId}` };
    else people[0] = { name: rv.ceo || owner, role: l('CEO', 'CEO') };
    people[1] = { name: npcName27(s, `${key}|staff`), role: l('Recepcionista', 'Receptionist') };
    let n = 0;
    for (const id of rv.roster) { const a = s.acts[id]; if (!a || n >= 2) continue; const m = a.members.find((x) => inTown31(s, x)); if (!m) continue; people.push({ name: s.persons[m]?.name ?? a.name, role: fmtL(l('Artista de {l}', '{l} act'), { l: rv.name }), pid: m, actId: a.id }); n++; }
  }
  return { id: `nb:${nb.lot}`, lot: nb.lot, k, name: nb.name, what: k === 'label' ? NB19.rival.n : eraWhat27(k, s.year, s.config.homeCity), owner: rv?.name ?? owner, ownerK: k === 'label' ? 'rival' : 'npc', now,
    people, also: [], src: 'nb', draw: DRAW27[k], sale: nb.sale ? nb.price : undefined };
}

const FLAVOR27: PlaceK27[] = ['apartments', 'office', 'hotel', 'instruments', 'apartments', 'office'];
/** Casas de shows REAIS da cidade (venues17) que ainda não são suas. */
const realVenues = (s: GameState) => VENUES17.filter((d) => d.city === s.config.homeCity && venueOpen(s, d) && !v17(s).own.some((o) => o.id === d.id)).sort((a, b) => Number(a.cap > 3000) - Number(b.cap > 3000) || b.prestige - a.prestige); // casa de bairro antes do estádio
/** Veículo de imprensa real do mercado da sede (jornal/revista), se houver. */
const realOutlet = (s: GameState) => {
  const mk = cityById[s.config.homeCity]?.market;
  return outlets17(s).filter((o) => o.market === mk && !o.mine && (o.kind === 'newspaper' || o.kind === 'magazine' || o.kind === 'trade')).sort((a, b) => b.reach - a.reach || (a.id < b.id ? -1 : 1))[0];
};

/** Todos os lugares de terceiros no mapa: vizinhos (hood19) + cidade comum (lotes `fillers`), com os básicos garantidos. */
export function places27(s: GameState, fillers: number[], nbs: Nb19[] = nb19(s), lotVis: (lot: number) => number = () => 1): Place27[] {
  const out: Place27[] = nbs.map((nb) => placeOfNb(s, nb));
  const have = new Set<PlaceK27>([...ownedMusic27(s), ...out.map((p) => p.k)]);
  const need = required27(s).filter((k) => !have.has(k));
  // lotes de cidade comum: os mais visíveis recebem os lugares básicos que faltam; o resto vira cidade (apartamentos, escritórios…)
  const lots = [...fillers].sort((a, b) => lotVis(b) - lotVis(a) || a - b);
  const rv = realVenues(s), out0 = realOutlet(s);
  const used = new Set(out.map((p) => p.name.pt));
  lots.forEach((lot, i) => {
    let k: PlaceK27 = need.length ? need.shift()! : FLAVOR27[Math.floor(hash(`${s.config.seed}|fl27|${lot}`) * FLAVOR27.length)] ?? 'office';
    if (k === 'instruments' && s.year < 1900) k = 'apartments';
    const p = fillPlace(s, k, lot, i, k === 'venue' ? rv[0]?.id : undefined, k === 'press' ? out0?.id : undefined);
    // nomes únicos no bairro (duas "Companhia de Seguros" na mesma quadra, não)
    for (let j = 1; used.has(p.name.pt) && j < 6 && !p.venue; j++) p.name = placeName27(s, k, lot + j * 101);
    used.add(p.name.pt);
    out.push(p);
  });
  // faltou lote: o básico divide um prédio de terceiros (segundo andar, sobreloja)
  const host = [...out].sort((a, b) => Number(MUSIC27.includes(a.k)) - Number(MUSIC27.includes(b.k)) || (a.src === 'fill' ? -1 : 1));
  need.forEach((k, i) => { const h = host[i % Math.max(1, host.length)]; if (h) h.also.push(k); });
  // r31 (S): o submundo ocupa prédios da cidade comum (escritórios, prédios, hotel), dos menos vistos para os mais
  for (const u of UNDER27.fn?.(s) ?? []) {
    const i = [...out.keys()].reverse().find((j) => out[j].src === 'fill' && !out[j].venue && FLAVOR27.includes(out[j].k) && out[j].k !== 'instruments');
    if (i === undefined) { const h = out.find((p) => p.src === 'fill'); if (h && !h.also.includes(u.k)) h.also.push(u.k); continue; }
    const lot = out[i].lot;
    out[i] = { id: `pl:${lot}`, lot, k: u.k, name: u.name, what: u.what, owner: u.owner, ownerK: 'npc', now: u.now, people: u.people, also: [], src: 'fill', draw: DRAW27[u.k], org: u.org };
  }
  // r31 (FOS): a casa da família Fossati ocupa a moradia mais visível da cidade comum (ou outro prédio comum)
  const fam = FAMHOME27.fn?.(s);
  if (fam) {
    const free = (p: Place27) => p.src === 'fill' && !p.venue && !p.org && FLAVOR27.includes(p.k) && p.k !== 'instruments';
    const j = out.findIndex((p) => free(p) && p.k === 'apartments');
    const i = j >= 0 ? j : out.findIndex(free);
    if (i >= 0) { const lot = out[i].lot; out[i] = { id: `pl:${lot}`, lot, k: 'apartments', name: fam.name, what: fam.what, owner: fam.owner, ownerK: 'npc', now: fam.now, people: fam.people, also: [], src: 'fill', draw: DRAW27.apartments, fam31: true }; }
  }
  const em = UNDER27.bar?.(s) ?? [];
  const bar = out.find((p) => p.k === 'bar');
  if (bar && em.length) bar.people.push(...em);
  // r31 (I): dono e equipe de verdade (gente31), na ordem dos lugares do mesmo tipo
  if (CREW27.fn) {
    const copies = new Map<PlaceK27, number>();
    for (const p of out) {
      if (p.k === 'label' || p.k === 'facade' || p.k === 'police' || p.k === 'market' || p.fam31) continue;
      const c = copies.get(p.k) ?? 0;
      copies.set(p.k, c + 1);
      const crew = CREW27.fn(s, p.k, c);
      if (!crew) continue;
      p.people = [...crew, ...p.people.slice(2)];
      if (!p.venue || crew[0].job === 0) p.owner = crew[0].job === 0 ? crew[0].name : p.owner;
    }
  }
  return out;
}

function fillPlace(s: GameState, k: PlaceK27, lot: number, i: number, venueId?: string, outletId?: string): Place27 {
  const key = `pl${lot}`;
  const vd = venueId ? VENUES17.find((x) => x.id === venueId) : undefined;
  const ou = outletId ? outlets17(s).find((x) => x.id === outletId) : undefined;
  const owner = npcName27(s, `${key}|o`);
  const { people, now } = peopleOf(s, k, key, owner);
  // veículo real do mercado recebe o release (ações), mas a redação do bairro tem nome local (o mercado mistura países)
  const name: L = vd ? l(vd.name, vd.name) : placeName27(s, k, lot);
  void i;
  // casa real: o tipo vem do tamanho (clube, teatro, arena), não da década
  const what = vd ? (vd.cap <= 600 ? l('Clube de música', 'Music club') : vd.cap <= 3000 ? l('Teatro e casa de shows', 'Theatre and concert hall') : l('Arena e grande auditório', 'Arena and great hall')) : eraWhat27(k, s.year, s.config.homeCity);
  return { id: `pl:${lot}`, lot, k, name, what, owner, ownerK: vd ? 'venue' : 'npc', now, people, also: [], src: 'fill', draw: DRAW27[k],
    sale: vd && vd.buyable !== false ? venuePrice(s, vd) : undefined, venue: vd?.id, outlet: ou?.id };
}

/** Tudo o que existe na cidade agora (seu + de terceiros + inquilinos). */
export function covered27(s: GameState, ps: Place27[]): Set<PlaceK27> {
  return new Set<PlaceK27>([...ownedMusic27(s), ...ps.map((p) => p.k), ...ps.flatMap((p) => p.also)]);
}

// ---------------------------------------------------------------- ações

export interface PAct27 { id: string; label: L; desc: L; cost?: number; dis?: L; /** precisa escolher um artista seu */ act?: boolean; go?: Goto18; /** abre o lote (comprar/construir) */ lot?: boolean }
interface P27State { cd: Record<string, number> }
const st27 = (s: GameState): P27State => { const x = s.x4 as unknown as { place27?: P27State }; return (x.place27 ??= { cd: {} }); };
const activeMine = (s: GameState) => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.deceased);
const latestRel = (s: GameState, a: Act) => Object.values(s.releases).filter((r) => r.owner === 'player' && r.actId === a.id && s.week - r.week <= 16 && s.week >= r.week).sort((x, y) => y.week - x.week)[0];
const fmtFor = (s: GameState, a: Act): Fmt18 | undefined => { const fam = familyOf(a.genre); const fs = fmtsNow18(s); return fs.find((f) => FMT18[f].fam.includes(fam)) ?? fs[0]; };
const unrec = (s: GameState, a: Act) => a.songs.map((id) => s.songs[id]).filter((x) => x && !x.recorded && x.actId === a.id).slice(0, 4);
const TERMS27 = (format: DealTerms['format']): DealTerms => ({ format, fee: 1, split: 1, support: 1, rider: format === 'small' ? 0 : 1, intensity: 'normal', price: 1 });
export const instoreCost27 = (s: GameState): number => money(s, 350);
export const rehearseCost27 = (s: GameState, a?: Act): number => money(s, 60 * Math.max(1, a?.members.length ?? 3));
/** Sessão alugada no estúdio do bairro: estúdio regional antes de 1960, profissional depois. */
export const studioTier27 = (s: GameState): number => (s.year < 1960 ? 1 : 2);

export const GO27: Partial<Record<PlaceK27, Goto18>> = {
  venue: { area: 'shows' }, bar: { area: 'shows' }, records: { area: 'supply18' }, radio: { area: 'media', tab: ['mediaHub', 'radio18'] }, studio: { area: 'studio' },
  press: { area: 'news17' }, rehearsal: { area: 'talent18' }, label: { area: 'labels' },
  facade: { area: 'crime' }, police: { area: 'crime' }, market: { area: 'crime' },
};

/** Ações do lugar (com bloqueio explicado). `actId` = artista escolhido (padrão: o primeiro do elenco). */
export function placeActs27(s: GameState, p: Pick<Place27, 'k' | 'id' | 'venue' | 'outlet' | 'sale' | 'src'> & { fam31?: boolean }, actId?: string): PAct27[] {
  const mine = activeMine(s);
  const a = (actId ? mine.find((x) => x.id === actId) : undefined) ?? mine[0];
  const noAct: L | undefined = a ? undefined : l('Você não tem artista ativo no elenco.', 'You have no active act on the roster.');
  const cash = (c: number): L | undefined => (freeCash20(s) < c ? cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.')) : undefined);
  const out: PAct27[] = [];
  const cd = (k: string) => ((s.x4 as unknown as { place27?: P27State }).place27?.cd[k] ?? 0) > s.week; // r31: ler não cria estado
  switch (p.k) {
    case 'venue':
    case 'bar': {
      const fmt = p.k === 'bar' ? 'small' : 'standard';
      out.push({ id: 'show', act: true, label: p.k === 'bar' ? l('Marcar show no bar', 'Book a bar gig') : l('Marcar show aqui', 'Book a show here'),
        desc: l('Uma data na cidade daqui a 2 semanas (bilheteria, cachê e fãs pelo sistema de turnês).', 'One date in town two weeks from now (door, fee and fans via the touring system).'),
        dis: noAct ?? (s.tours.some((t) => t.actId === a!.id && (t.status === 'planned' || t.status === 'running')) ? l('Esse artista já tem turnê marcada.', 'That act already has a tour booked.') : undefined) });
      if (p.k === 'bar' && playerPerson(s) && s.config.role === 'artist') out.push({ id: 'play', label: l('Tocar hoje à noite (você)', 'Play tonight (you)'), desc: l('Microfone aberto: cachê, palco e um pouco de fama.', 'Open mic: a fee, stage time and a little fame.') });
      if (p.venue && p.sale !== undefined) out.push({ id: 'buyv', label: l('Comprar a casa', 'Buy the venue'), desc: l('A casa vira sua (receita de bilheteria e bar; manutenção).', 'The venue becomes yours (door and bar income; upkeep).'), cost: p.sale, dis: cash(p.sale) });
      void fmt;
      break;
    }
    case 'records': {
      const c = instoreCost27(s);
      out.push({ id: 'instore', act: true, label: l('Vitrine e tarde de autógrafos', 'Window display and signing'), desc: l('Seu disco na vitrine e o artista autografando: hype do lançamento e fãs novos.', 'Your record in the window and the act signing: release hype and new fans.'), cost: c,
        dis: noAct ?? (cd(`in:${a!.id}`) ? l('Já fizeram vitrine há pouco (8 semanas).', 'Window display done recently (8 weeks).') : cash(c)) });
      break;
    }
    case 'radio': {
      const rel = a ? latestRel(s, a) : undefined, f = a ? fmtFor(s, a) : undefined;
      out.push({ id: 'pitch', act: true, label: l('Levar a música ao diretor', 'Pitch the song to the PD'), desc: f ? fmtL(l('Formato {f}: as estações decidem se tocam.', 'Format {f}: the stations decide whether to play it.'), { f: FMT18[f].name }) : l('Leva o lançamento recente às rádios.', 'Takes the recent release to radio.'),
        cost: money(s, 300), dis: noAct ?? (!hasTech(s, 'radio') ? l('Ainda não há rádio.', 'There is no radio yet.') : !rel ? l('Precisa de um lançamento seu das últimas 16 semanas.', 'Needs one of your releases from the last 16 weeks.') : !f ? l('Nenhum formato de rádio agora.', 'No radio format right now.') : cash(money(s, 300))) });
      const sta = (s.x4 as unknown as { radio18?: { st?: { id: string; fmt: string; pd: string }[] } }).radio18?.st ?? [];
      if (sta.length) out.push({ id: 'lunch', label: l('Jantar com o diretor de programação', 'Dinner with the programme director'), desc: l('Relação +8 com a estação (uma vez a cada 8 semanas).', 'Relationship +8 with the station (once every 8 weeks).'), cost: money(s, 200), dis: cash(money(s, 200)) });
      break;
    }
    case 'studio': {
      const songs = a ? unrec(s, a) : [];
      out.push({ id: 'rent', act: true, label: l('Alugar horas de estúdio', 'Rent studio time'), desc: fmtL(l('Sessão no estúdio do bairro ({n} faixa(s) escritas): gravação de verdade.', 'A session at the local studio ({n} written track(s)): a real recording.'), { n: songs.length }),
        dis: noAct ?? (!songs.length ? l('Esse artista não tem música escrita para gravar.', 'That act has no written song to record.') : s.sessions.some((x) => x.actId === a!.id && !x.done) ? l('Já há uma sessão em andamento.', 'A session is already running.') : undefined) });
      break;
    }
    case 'press': {
      out.push({ id: 'news', act: true, label: l('Mandar um release à redação', 'Send a press release'), desc: l('Notícia sobre o artista: hype se publicarem.', 'A story about the act: hype if they run it.'), cost: money(s, 300), dis: noAct ?? cash(money(s, 300)) });
      out.push({ id: 'interview', act: true, label: l('Marcar entrevista', 'Book an interview'), desc: l('Exposição maior; risco de frase infeliz.', 'More exposure; risk of a gaffe.'), dis: noAct });
      break;
    }
    case 'rehearsal': {
      const c = rehearseCost27(s, a);
      out.push({ id: 'rehearse', act: true, label: l('Alugar a sala para ensaiar', 'Rent the room to rehearse'), desc: l('A banda chega mais afiada aos shows e à gravação.', 'The band gets tighter for gigs and recording.'), cost: c,
        dis: noAct ?? (cd(`re:${a!.id}`) ? l('Já ensaiaram este mês.', 'Already rehearsed this month.') : cash(c)) });
      break;
    }
    default: break;
  }
  if (p.src === 'fill' && !p.venue && !p.fam31 && p.k !== 'police' && p.k !== 'facade' && p.k !== 'market') out.push({ id: 'lot', lot: true, label: l('Comprar o imóvel / construir', 'Buy the property / build'), desc: l('Compra o lote e põe uma obra sua no lugar (Nosso mundo).', 'Buys the lot and puts your own works there (Our world).') });
  const go = GO27[p.k];
  if (go) out.push({ id: 'go', label: l('Abrir a tela', 'Open the screen'), desc: l('A tela do jogo para este assunto.', 'The game screen for this.'), go });
  return out;
}

/** Executa a ação do lugar. Devolve o texto do resultado (ok = deu certo). */
export function doPlace27(s: GameState, p: Pick<Place27, 'k' | 'id' | 'venue' | 'outlet' | 'sale' | 'src' | 'name'>, id: string, actId?: string): { ok: boolean; text: L } {
  const act = placeActs27(s, p, actId).find((x) => x.id === id);
  if (!act) return { ok: false, text: l('Ação indisponível.', 'Action unavailable.') };
  if (act.dis) return { ok: false, text: act.dis };
  const mine = activeMine(s);
  const a = (actId ? mine.find((x) => x.id === actId) : undefined) ?? mine[0];
  const bad = (t: L) => ({ ok: false, text: t });
  switch (id) {
    case 'show': {
      const r = bookRoutedTour(s, a!.id, [s.config.homeCity], TERMS27(p.k === 'bar' ? 'small' : 'standard'), 14, `${p.name.pt} — ${a!.name}`);
      if ('tourId' in r) return { ok: true, text: fmtL(l('Show de {a} marcado em {p} (daqui a 2 semanas).', '{a} booked at {p} (two weeks from now).'), { a: a!.name, p: p.name }) };
      return bad(r);
    }
    case 'play': { const e = playBar(s, Rng.fromSeed(`${s.config.seed}:pl27bar:${s.week}`)); return e ? bad(e) : { ok: true, text: l('Você tocou no bar.', 'You played the bar.') }; }
    case 'buyv': { const e = buyVenue17(s, p.venue!); return e ? bad(e) : { ok: true, text: fmtL(l('{p} agora é sua.', '{p} is now yours.'), { p: p.name }) }; }
    case 'instore': {
      const c = instoreCost27(s);
      post(s, `p27:in:${a!.id}:${s.week}`, -c, 'marketing', `Vitrine e autógrafos: ${a!.name}`);
      st27(s).cd[`in:${a!.id}`] = s.week + 8;
      const rel = latestRel(s, a!);
      const fans = Math.round(80 + a!.fame * 8 + (rel ? 60 : 0));
      a!.fans.casual += fans; a!.fans.active += Math.round(fans / 8);
      addHype(s, rel ? `n:${a!.id}` : `a:${a!.id}`, 'p27instore', fmtL(l('Vitrine em {p}', 'Window display at {p}'), { p: p.name }), rel ? 5 : 3);
      for (const m of a!.members) addStress(s, m, 1, l('Tarde de autógrafos', 'Signing session'));
      return { ok: true, text: fmtL(l('{a} na vitrine de {p}: +{n} fãs e hype no lançamento.', '{a} in the {p} window: +{n} fans and release hype.'), { a: a!.name, p: p.name, n: fans }) };
    }
    case 'pitch': {
      const rel = latestRel(s, a!), f = fmtFor(s, a!);
      if (!rel || !f) return bad(l('Nada para levar à rádio.', 'Nothing to take to radio.'));
      const t = pitchRadio18(s, rel.id, f, 'self');
      return { ok: radio18(s).tried[`${rel.id}|${f}`] === s.week, text: t };
    }
    case 'lunch': {
      const sta = (s.x4 as unknown as { radio18?: { st?: { id: string }[] } }).radio18?.st ?? [];
      const x = sta[Math.floor(hash(`${s.config.seed}|${p.id}|st`) * sta.length)];
      if (!x) return bad(l('Nenhuma estação.', 'No station.'));
      const t = lunchPd18(s, x.id);
      return { ok: radio18(s).st.find((y) => y.id === x.id)?.lunch === s.week, text: t };
    }
    case 'rent': {
      const songs = unrec(s, a!);
      const r = startSession(s, a!.id, songs.map((x) => x.id), studioTier27(s), 'balanced');
      if ('id' in r && 'actId' in r) return { ok: true, text: fmtL(l('{a} entra no estúdio {p}: {n} faixa(s).', '{a} goes into {p}: {n} track(s).'), { a: a!.name, p: p.name, n: songs.length }) };
      return bad(r as L);
    }
    case 'news':
    case 'interview': {
      const mk = cityById[s.config.homeCity]?.market;
      const os = outlets17(s).filter((o) => !o.mine && o.kind !== 'social' && o.kind !== 'fanzine');
      const o = (p.outlet ? os.find((x) => x.id === p.outlet) : undefined) ?? os.filter((x) => x.market === mk).sort((x, y) => y.reach - x.reach)[0] ?? os.sort((x, y) => y.reach - x.reach)[0];
      if (!o) return bad(l('Nenhum veículo disponível.', 'No outlet available.'));
      return id === 'news' ? releaseNews(s, a!.id, o.id, false) : interview(s, a!.id, o.id);
    }
    case 'rehearse': {
      const c = rehearseCost27(s, a);
      post(s, `p27:re:${a!.id}:${s.week}`, -c, 'recording', `Sala de ensaio: ${a!.name}`);
      st27(s).cd[`re:${a!.id}`] = s.week + 4;
      a!.rehearsed = clamp(a!.rehearsed + 5, 0, 15);
      return { ok: true, text: fmtL(l('{a} ensaiou em {p}: banda mais afiada.', '{a} rehearsed at {p}: a tighter band.'), { a: a!.name, p: p.name }) };
    }
    default: return bad(l('Ação sem efeito direto (abre outra tela).', 'This action opens another screen.'));
  }
}

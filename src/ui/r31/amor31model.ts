// R31 · onda 4 (AMOR) — modelo PURO das cenas do coração: o ENCONTRO (lugar da época: restaurante, cinema, baile /
// discoteca / boate, bar, em casa, viagem) e a DESCOBERTA do caso. Mesmo corte em pixel art dos interiores (interior27),
// com o SEU personagem e o par lado a lado (mesa, sofá, pista), cadeiras pintadas sob quem senta. As áreas clicáveis
// saem do mesmo cálculo da pintura. Montar o modelo só lê (sem sorteio, sem estado).

import { cityById, l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import type { Person27 } from '../../sim/sys/place27';
import { life, ownerAgeNow } from '../../sim/sys/life';
import { love17 } from '../../sim/sys/love17';
import { ownerOf } from '../../sim/sys/people/owner';
import { actsNow27 } from '../../sim/tickcache27';
import { geom27, interior27, liftOf27, placePeople27, type ISpot27, type Interior27, type Zone27 } from '../pixel/interior27';
import type { Spot31 } from './scene31model';

export type DatePlace31 = 'restaurant' | 'cinema' | 'dance' | 'bar' | 'home' | 'trip';
export type DateKind31 = 'dinner' | 'show' | 'home' | 'trip';
export interface DatePlaceDef31 { kind: DateKind31; from: number; to?: number; cost: number; balls: number; name: (y: number) => L; tip: L }
export const DATE_PLACES31: Record<DatePlace31, DatePlaceDef31> = {
  restaurant: { kind: 'dinner', from: 1889, cost: 150, balls: 1, name: (y) => (y < 1930 ? l('Restaurante com toalha de linho', 'Linen-tablecloth restaurant') : y < 1970 ? l('Restaurante', 'Restaurant') : l('Bistrô', 'Bistro')), tip: l('Jantar a dois: agrada quem é pé no chão.', 'Dinner for two: pleases down-to-earth people.') },
  cinema: { kind: 'show', from: 1908, cost: 250, balls: 1, name: (y) => (y < 1928 ? l('Cinema mudo com pianista', 'Silent cinema with a pianist') : y < 1980 ? l('Cinema de rua', 'Picture palace') : l('Cinema', 'Cinema')), tip: l('Sessão de cinema: agrada quem gosta de música e de holofote.', 'A film: pleases music and spotlight lovers.') },
  dance: { kind: 'show', from: 1889, cost: 250, balls: 1, name: (y) => (y < 1960 ? l('Baile com orquestra', 'Dance hall with a band') : y < 1990 ? l('Discoteca', 'Disco') : l('Boate', 'Club')), tip: l('Dançar a noite toda: agrada quem gosta de música e de fama.', 'Dancing all night: pleases music and fame lovers.') },
  bar: { kind: 'dinner', from: 1889, cost: 150, balls: 1, name: (y) => (y < 1933 ? l('Café-concerto', 'Café-concert') : l('Bar com música ao vivo', 'Bar with live music')), tip: l('Um drinque e uma banda da cidade no palquinho.', 'A drink and a local band on the little stage.') },
  home: { kind: 'home', from: 1889, cost: 0, balls: 1, name: () => l('Noite em casa', 'Night in'), tip: l('Sofá, disco na vitrola, sem plateia: agrada caseiros e calmos.', 'Sofa, a record on, no audience: pleases homebodies and calm people.') },
  trip: { kind: 'trip', from: 1889, cost: 2500, balls: 2, name: (y) => (y < 1950 ? l('Viagem de trem e hotel', 'Train trip and hotel') : l('Viagem de avião e hotel', 'Flight and hotel')), tip: l('Dois tempos livres: o que mais aproxima (e alivia o estresse).', 'Two free-time slots: brings you closest (and relieves stress).') },
};
export const datePlaces31 = (y: number): DatePlace31[] => (Object.keys(DATE_PLACES31) as DatePlace31[]).filter((k) => DATE_PLACES31[k].from <= y && (DATE_PLACES31[k].to ?? 9999) >= y);

export interface Seat31 { x: number; dir: 'SE' | 'SW'; sit: boolean }
export interface AmorM31 {
  id: string; title: L; what: L; W: number; H: number; year: number;
  room: Interior27; people: Person27[]; spots: Spot31[];
  /** cadeiras a pintar (frações da sala) e a mesa entre o casal */
  seats: Seat31[]; table?: number;
  /** cinema: tela e fileiras; descoberta: a carta na mesinha */
  screen?: boolean; letter?: number;
  /** onde fica o ponto do lugar (fração) e se ele leva rótulo */
  objAt?: number; objQuiet?: boolean;
}

const W31 = 360;
const sp = (x: number, z: Zone27, pose: 'stand' | 'sit' = 'stand', dir: 'SE' | 'SW' = 'SE'): ISpot27 => ({ x, z, pose, dir });

function youP(s: GameState): Person27 {
  const o = ownerOf(s);
  return { name: o.name, role: fmtL(l('Você · {a} anos', 'You · {a} yrs'), { a: ownerAgeNow(s) }), pid: o.personId, you: true };
}
function partnerP(s: GameState): Person27 | null {
  const pt = life(s).partner;
  if (!pt) return null;
  return { name: pt.name, role: pt.stage === 'married' ? l('Seu marido / sua esposa', 'Your spouse') : pt.stage === 'engaged' ? l('Noivo(a)', 'Fiancé(e)') : l('Namorado(a)', 'Partner'), pid: pt.personId, key: pt.personId ? undefined : `amor:${pt.name}` };
}
/** Banda da cidade no palco (artistas de verdade do mundo, não do seu elenco). */
function localBand(s: GameState, n: number): Person27[] {
  const ok = (x: (ReturnType<typeof actsNow27>)[number]) => x.owner !== 'player' && !x.playerBand && x.members.length >= 2 && (x.status === 'active' || x.status === 'emerging');
  const here = actsNow27(s).filter((x) => ok(x) && x.city === s.config.homeCity);
  const list = (here.length ? here : actsNow27(s).filter(ok)).sort((x, y) => (x.id < y.id ? -1 : 1));
  const a = list.length ? list[(s.year * 12 + s.month) % list.length] : undefined;
  if (!a) return [];
  return a.members.slice(0, n).filter((m) => s.persons[m]?.alive).map((m) => ({ name: s.persons[m].name, role: fmtL(l('Toca hoje · {a}', 'Playing tonight · {a}'), { a: a.name }), pid: m, actId: a.id }));
}
/** Quem trabalha no lugar (sem ficha: garçom, bilheteira, recepcionista). */
const crew = (name: L, role: L): Person27 => ({ name: name.pt, role, staff: true });

/** O encontro num lugar da época, com você e o par. */
export function dateModel31(s: GameState, place: DatePlace31): AmorM31 {
  const y = s.year;
  const def = DATE_PLACES31[place];
  const you = youP(s), pt = partnerP(s);
  let room: Interior27;
  let seats: Seat31[] = [];
  let table: number | undefined;
  let screen = false;
  let objAt: number | undefined;
  const extra: Person27[] = [];
  let pair: [ISpot27, ISpot27];
  switch (place) {
    case 'restaurant':
      room = interior27('facade', y, 4, 'restaurant');
      room.v = 'restaurant'; room.dim = false;
      pair = [sp(0.5, 'floor', 'sit', 'SE'), sp(0.6, 'counter', 'sit', 'SW')]; table = 0.55;
      // as outras mesas vão para os lados: a do meio é a do casal
      room.props = room.props.flatMap((p) => (p.t === 'tables' ? [{ t: 'tables' as const, x: 0.27, w: 0.12, n: 1 }, { t: 'tables' as const, x: 0.7, w: 0.12, n: 1 }] : [p]));
      extra.push(crew(l('Garçom', 'Waiter'), l('Garçom da casa', 'The house waiter')));
      break;
    case 'bar':
      room = interior27('bar', y, 6);
      pair = [sp(0.43, 'floor', 'sit', 'SE'), sp(0.53, 'counter', 'sit', 'SW')]; table = 0.48;
      room.props = room.props.filter((p) => p.t !== 'tables');
      extra.push(crew(l('Barman', 'Bartender'), l('Atrás do balcão', 'Behind the bar')), ...localBand(s, 2));
      break;
    case 'dance':
      room = y < 1960 ? interior27('venue', y, 6) : interior27('baile', y, 6);
      pair = y < 1960 ? [sp(0.24, 'floor', 'stand', 'SE'), sp(0.31, 'counter', 'stand', 'SW')] : [sp(0.8, 'floor', 'stand', 'SE'), sp(0.87, 'counter', 'stand', 'SW')];
      objAt = y < 1960 ? 0.7 : 0.37;
      if (y >= 1960) room.props = room.props.filter((p) => p.t !== 'counter' && p.t !== 'bottles');
      extra.push(...localBand(s, 3));
      break;
    case 'cinema':
      room = interior27('venue', y, 3);
      room.props = [{ t: 'poster', x: 0.04, w: 0.06 }, { t: 'poster', x: 0.9, w: 0.06 }];
      room.dim = true; screen = true;
      pair = [sp(0.47, 'floor', 'sit', 'SE'), sp(0.55, 'counter', 'sit', 'SW')];
      extra.push(crew(l('Lanterninha', 'Usher'), l('Lanterninha com a lanterna', 'The usher with a torch')));
      break;
    case 'home':
      room = interior27('apartments', y, 3);
      pair = [sp(0.14, 'floor', 'sit', 'SE'), sp(0.24, 'counter', 'sit', 'SW')];
      objAt = 0.58;
      break;
    case 'trip':
    default:
      room = interior27('hotel', y, 4);
      pair = [sp(0.53, 'floor', 'sit', 'SE'), sp(0.62, 'counter', 'sit', 'SW')];
      extra.push(crew(l('Recepcionista', 'Receptionist'), l('Na recepção do hotel', 'At the hotel desk')));
      objAt = 0.84;
      break;
  }
  // o casal: você no primeiro lugar, o par no segundo (zona 'counter' para ser o primeiro a ser ocupado); o resto vira salão
  room.youAt = pair[0];
  const rest = room.spots.filter((x) => !(Math.abs(x.x - pair[0].x) < 0.06 || Math.abs(x.x - pair[1].x) < 0.06));
  room.spots = [pair[1], ...rest];
  if (pair[0].pose === 'sit' && place !== 'home' && place !== 'trip') seats = [{ x: pair[0].x, dir: 'SE', sit: true }, { x: pair[1].x, dir: 'SW', sit: true }];
  const people = [you, ...(pt ? [pt] : []), ...extra];
  const city = cityById[s.config.homeCity]?.name;
  const title = def.name(y);
  const m: AmorM31 = { id: `amor31-${place}`, title, what: fmtL(l('{c} · {y}', '{c} · {y}'), { c: city ?? l('', ''), y }), W: W31, H: geom27(W31).H, year: y, room, people, spots: [], seats, table, screen,
    objAt, objQuiet: table !== undefined };
  const objName = place === 'home' ? l('Vitrola', 'Record player') : place === 'cinema' ? l('A tela', 'The screen') : place === 'dance' ? l('A banda', 'The band') : place === 'trip' ? l('Recepção', 'Front desk') : l('Mesa a dois', 'Table for two');
  m.spots = spotsOf(s, m, objName, def.tip);
  return m;
}

/** A descoberta: em casa, o par com a carta (ou a foto) na mão. */
export function foundModel31(s: GameState, who: string): AmorM31 {
  const y = s.year;
  const room = interior27('apartments', y, 3);
  room.props = room.props.filter((p) => p.t !== 'guitar' && p.t !== 'listen');
  room.youAt = sp(0.33, 'floor', 'stand', 'SE');
  room.spots = [sp(0.6, 'counter', 'stand', 'SW'), ...room.spots.filter((x) => x.x < 0.3 || x.x > 0.7)];
  const pt = partnerP(s);
  const evid = y < 1960 ? l('Uma carta perfumada', 'A perfumed letter') : y < 2000 ? l('Uma foto e um recibo de hotel', 'A photo and a hotel receipt') : l('Mensagens no celular', 'Messages on the phone');
  const m: AmorM31 = { id: 'amor31-found', title: l('A descoberta', 'The discovery'), what: fmtL(l('{p} sabe de {c}', '{p} knows about {c}'), { p: pt?.name ?? '?', c: who }), W: W31, H: geom27(W31).H, year: y, room, people: [youP(s), ...(pt ? [pt] : [])], spots: [], seats: [], letter: 0.49 };
  m.spots = spotsOf(s, m, evid, l('A prova em cima da mesinha.', 'The evidence on the side table.'));
  return m;
}

function spotsOf(s: GameState, m: AmorM31, objLabel: L, objTip: L): Spot31[] {
  const G = geom27(m.W);
  const out: Spot31[] = [];
  const objX = m.objAt ?? m.letter ?? m.table ?? (m.screen ? 0.5 : 0.5);
  const tall = m.screen || m.objAt !== undefined;
  out.push({ id: 'obj', x: G.X(objX) - 12, y: m.screen ? G.y0 + 6 : tall ? G.fy - 40 : G.fy - 20, w: 24, h: m.screen ? 30 : tall ? 30 : 12, label: objLabel, tip: objTip, go: { panel: 'obj' }, quiet: !!m.objQuiet || !!m.letter });
  placePeople27(m.room, m.people).forEach(([p, s0]) => {
    const i = m.people.indexOf(p);
    const fx = G.X(s0.x), fyy = G.fy - liftOf27(m.room, s0);
    const first = p.name.split(' ')[0];
    out.push({ id: p.you ? 'you' : `who:${i}`, x: fx - 7, y: fyy - 31, w: 14, h: 32, label: p.you ? l('Você', 'You') : l(first, first), tip: fmtL(l('{n} — {r}', '{n} — {r}'), { n: p.name, r: p.role }), go: p.you ? { panel: 'you' } : { panel: `who:${i}` },
      quick: p.pid && !p.you ? { kind: 'person', id: p.pid } : undefined, quiet: true });
  });
  void love17; void s;
  return out;
}

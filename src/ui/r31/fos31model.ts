// R31 · onda 4 (FOS) — A CASA DA FAMÍLIA FOSSATI e a PRAÇA EFRO E LUCIA FOSSATI em cena (modelo PURO, sem DOM).
// A família deixa de ser só a aba de cartões: a casa (cena interior na cidade da família, com as variações da época) e a
// praça (cena exterior ao lado da sua sede) seguem as regras das cenas da onda 2 — pessoas e objetos clicáveis com dica,
// motivo de bloqueio antes do clique, painel rápido e "Ver como lista" a partir do MESMO registro que desenha a cena.
//   · casa: os quatro sempre presentes (nunca envelhecem), cada um no canto do papel do momento; os objetos ligam às
//     ações que já existem (almoço, lasanha, violino, mesa da Sonia, teatro/imprensa ou escola, Metalmac, avião, tênis);
//   · praça: placa, banco, árvores, coreto e a escultura discretos; gente de verdade da cidade passando (a equipe dos
//     lugares que está na cidade nesta semana) e a família às vezes (decidido na virada do mês — famSquare31).
// Montar o modelo só lê (nada de `??=` no estado): os testes conferem o estado antes e depois.

import { l, type L } from '../../data/world';
import { cityById } from '../../data/world';
import { FAMILY31, famKey31, type FamId31 } from '../../data/fossati31';
import { EFRO_VIOLIN_ID } from '../../sim/r31/relic31';
import {
  ANTONELLA_SCHOOL31, FLIGHT_FROM31, famCity31, famLock31, famNow31, famRoleLabel31, famSquare31, famTalk31, peekFam31, type FamAct31,
} from '../../sim/sys/fossati31';
import { JOBS31, KIND_AT31, parseSlot31, peekGente31 } from '../../sim/sys/gente31';
import { inTown31 } from '../../sim/sys/where31';
import type { Person27 } from '../../sim/sys/place27';
import type { Relic } from '../../sim/sys/relics9';
import type { Appearance, GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { hashString } from '../../core/rng';
import { geom27 } from '../pixel/interior27';
import { youAt31 } from './salas31model';
import type { Spot31 } from './scene31model';

export const HOME_W31 = 480;
export const SQUARE_W31 = 420;
export const FOS_H31 = 150;

/** Uma pessoa na cena: quem é, onde fica (fração do chão), pose e para que lado olha. */
export interface FosWho31 extends Person27 { fam?: FamId31; x: number; pose: 'stand' | 'sit'; dir: 'SE' | 'SW'; talk?: L; look: { id: string; age?: number } }
/** Um objeto desenhado (o pintor e as áreas clicáveis usam a mesma caixa). */
export interface FosObj31 { id: string; x: number; y: number; w: number; h: number; kind: string; v?: string }
export interface FosM31 {
  kind: 'home' | 'square';
  W: number; H: number; year: number; city: string; seed: string;
  title: L; what: L;
  objs: FosObj31[];
  people: FosWho31[];
  spots: Spot31[];
  you: { here: boolean; where: L };
  note?: L;
  /** violino: na vitrine, sumido (roubado: lugar vazio) ou ainda não chegou */
  violin: 'in' | 'stolen' | 'none';
  /** quem da família está na praça neste mês */
  famHere: FamId31[];
}

// ---------------------------------------------------------------- leituras sem criar estado

const peekViolin31 = (s: GameState): Relic | undefined =>
  (s as unknown as { x4?: { relics9?: { list?: Relic[] } } }).x4?.relics9?.list?.find((x) => x.id === EFRO_VIOLIN_ID);
export const violinState31 = (s: GameState): FosM31['violin'] => { const v = peekViolin31(s); return !v ? 'none' : v.st === 'stolen' ? 'stolen' : 'in'; };

/** Visuais fixos dos quatro (idade aparente constante; o pintor aplica o envelhecimento pela idade). */
/** Visuais fixos da família, inspirados nas fotos que o dono mandou (idade aparente constante; o pintor aplica o
 *  envelhecimento pela idade): Efro de cabelo branco, óculos de armação fina, camisa clara e mais encorpado; Lucia de
 *  cabelo curto castanho e brincos; Antonella loira de cabelo longo e blusa azul-clara; Sonia de cabelo castanho-acobreado
 *  na altura do ombro, argolas e blusa preta; Gianluca de cabelo castanho-escuro curto, barba curta, óculos de aviador,
 *  camisa branca e corrente (olhos verdes, que o boneco de 24 px não mostra). */
export const FAM_LOOK31: Record<FamId31, Omit<Appearance, 'hat'> & { hat: boolean; sx: 'm' | 'f' }> = {
  efro: { body: 2, face: 1, skin: 0, hair: 2, hairColor: 6, outfit: 0, outfitColor: 5, glasses: true, glT: 1, hat: false, beard: false, sx: 'm' },
  lucia: { body: 1, face: 2, skin: 0, hair: 13, hairColor: 2, outfit: 2, outfitColor: 1, glasses: false, hat: false, beard: false, sx: 'f', ear: 1 },
  sonia: { body: 0, face: 1, skin: 0, hair: 16, hairColor: 3, outfit: 0, outfitColor: 6, glasses: false, hat: false, beard: false, sx: 'f', ear: 3 },
  antonella: { body: 1, face: 0, skin: 0, hair: 19, hairColor: 4, outfit: 0, outfitColor: 12, glasses: false, hat: false, beard: false, sx: 'f', nk: 1 },
  gianluca: { body: 1, face: 0, skin: 0, hair: 22, hairColor: 1, outfit: 0, outfitColor: 5, glasses: true, glT: 2, hat: false, beard: true, sx: 'm', nk: 1 },
};

// ---------------------------------------------------------------- a casa

/** Os pontos da casa e a ação de cada um (a tabela do pedido). */
export const HOME_SPOTS31: { id: string; act?: FamAct31; label: L; tip: L }[] = [
  { id: 'kitchen', act: 'lasagna', label: l('Cozinha (lasanha)', 'Kitchen (lasagna)'), tip: l('A lasanha da Lucia de presente para alguém do seu artista (opinião +4).', 'Lucia\'s lasagna as a gift for one of your artists (opinion +4).') },
  { id: 'lunch', act: 'lunch', label: l('Mesa do almoço', 'Lunch table'), tip: l('Almoço de domingo: seus artistas saem mais leves (estresse −6, moral +3).', 'Sunday lunch: your artists leave lighter (stress −6, morale +3).') },
  { id: 'tennis', act: 'tennis', label: l('Troféus do clube de tênis', 'Tennis club trophies'), tip: l('Uma partida com o Efro no clube (reputação institucional +1, uma vez por ano).', 'A match with Efro at the club (institutional reputation +1, once a year).') },
  { id: 'violin', label: l('Vitrine do violino', 'Violin cabinet'), tip: l('O violino do Efro: mítico, nunca à venda.', 'Efro\'s violin: mythic, never for sale.') },
  { id: 'flight', act: 'flight', label: l('Foto e maquete do avião', 'Plane photo and model'), tip: l('Voo panorâmico com o Efro (inspiração +10, uma vez por partida).', 'Scenic flight with Efro (inspiration +10, once per game).') },
  { id: 'promo', act: 'promo', label: l('Mesa de trabalho da Sonia', 'Sonia\'s desk'), tip: l('Evento promocional com a Sonia (impulso +4, fama +1).', 'Promotional event with Sonia (momentum +4, fame +1).') },
  { id: 'antonella', act: 'press', label: l('Cartaz de teatro e redação', 'Theatre poster and newsroom'), tip: l('Entrevista e temporada de teatro com a Antonella (fama +1, impulso +2).', 'Interview and theatre season with Antonella (fame +1, momentum +2).') },
  { id: 'metalmac', act: 'metalmac', label: l('Oficina Metalmac', 'Metalmac workshop'), tip: l('Contrato de um ano com a Metalmac (menos cópias defeituosas).', 'One-year Metalmac contract (fewer defective copies).') },
];
const SCHOOL_SPOT31 = { label: l('Lousa da escola de idiomas', 'Language school blackboard'), tip: l('Matricular um artista seu na escola da Antonella (turnê +4% nas cidades daquela língua).', 'Enrol one of your artists at Antonella\'s school (tour +4% in cities of that language).') };

/** Caixas dos objetos da casa em pixels lógicos (geometria do corte de interior, a mesma dos lugares). */
export function homeObjs31(year: number, W = HOME_W31): FosObj31[] {
  const g = geom27(W);
  const X = g.X, Wd = g.Wd, fy = g.fy, y0 = g.y0;
  const floor = (id: string, kind: string, f: number, fw: number, h: number, v?: string): FosObj31 => ({ id, kind, x: X(f), y: fy - h, w: Wd(fw), h, v });
  const wall = (id: string, kind: string, f: number, fw: number, top: number, h: number, v?: string): FosObj31 => ({ id, kind, x: X(f), y: y0 + top, w: Wd(fw), h, v });
  const school = year >= ANTONELLA_SCHOOL31;
  return [
    floor('kitchen', 'stove', 0.015, 0.1, 24),
    wall('kitchen:cup', 'cupboard', 0.015, 0.1, 10, 16),
    floor('lunch', 'table', 0.15, 0.19, 15),
    wall('tennis', 'trophies', 0.17, 0.15, 10, 16),
    wall('window', 'window', 0.36, 0.05, 12, 28),
    floor('violin', 'vitrine', 0.37, 0.07, 46),
    wall('flight', 'plane', 0.47, 0.11, 8, 20, year >= FLIGHT_FROM31 ? 'plane' : 'kite'),
    floor('promo', 'sdesk', 0.47, 0.15, 22),
    school ? wall('antonella', 'blackboard', 0.65, 0.13, 8, 30) : wall('antonella', 'theatre', 0.66, 0.06, 8, 24),
    school ? floor('antonella:desk', 'lectern', 0.69, 0.05, 18) : floor('antonella:desk', 'typedesk', 0.65, 0.12, 20),
    floor('metalmac', 'bench', 0.81, 0.17, 20, year < 1901 ? 'cyl' : year < 1948 ? '78' : year < 1982 ? 'lp' : year < 2008 ? 'cd' : 'vinyl'),
    wall('metalmac:sign', 'mmsign', 0.83, 0.12, 8, 9),
  ];
}

const yourPerson = (s: GameState): { here: boolean; where: L; who?: Person27 } => {
  const y = youAt31(s);
  if (!y.here) return { here: false, where: y.where };
  const p = y.personId ? s.persons[y.personId] : undefined;
  return { here: true, where: y.where, who: { name: p?.name ?? s.config.companyName, role: l('Você', 'You'), pid: p?.id, you: true, mine: true } };
};

const spotOfWho = (W: number, x: number, sit: boolean): { x: number; y: number; w: number; h: number } => {
  const g = geom27(W);
  const fx = g.X(x);
  return { x: fx - 7, y: g.fy - (sit ? 25 : 31), w: 14, h: sit ? 26 : 32 };
};

/** A família na casa, cada um no canto do papel deste ano (sempre os quatro). */
export function homePeople31(s: GameState): FosWho31[] {
  const now = famNow31(s);
  const retired = now.find((n) => n.m.id === 'sonia')?.retired ?? false;
  const pos: Record<'efro' | 'lucia' | 'sonia' | 'antonella' | 'gianluca', [number, 'stand' | 'sit', 'SE' | 'SW']> = {
    gianluca: [0.325, 'stand', 'SW'],
    lucia: [0.125, 'stand', 'SE'],
    sonia: retired ? [0.25, 'stand', 'SW'] : [0.6, 'stand', 'SW'],
    antonella: s.year >= ANTONELLA_SCHOOL31 ? [0.765, 'stand', 'SW'] : [0.705, 'stand', 'SW'],
    efro: [0.9, 'stand', 'SW'],
  };
  return (['lucia', 'gianluca', 'sonia', 'antonella', 'efro'] as const).map((id) => {
    const m = FAMILY31.find((x) => x.id === id)!;
    const [x, pose, dir] = pos[id];
    return { name: m.name, role: famRoleLabel31(s, id), key: famKey31(id), fam: id, x, pose, dir, talk: famTalk31(s, id), look: { id: `fam:${id}`, age: m.age } };
  });
}

function whoSpots(W: number, people: FosWho31[], s: GameState): Spot31[] {
  const met = peekFam31(s).met ?? [];
  return people.map((p, i) => {
    const b = spotOfWho(W, p.x, p.pose === 'sit');
    const tip = p.you ? l('Você.', 'You.') : p.fam ? fmtL(met.includes(p.fam) ? l('{r} — conversar.', '{r} — talk.') : l('{r} — conhecer e conversar.', '{r} — meet and talk.'), { r: p.role }) : fmtL(l('{r} — ver a ficha ou conhecer.', '{r} — see the card or meet.'), { r: p.role });
    return { id: `who:${i}`, ...b, label: l(p.name, p.name), tip, go: { panel: p.you ? 'you' : `who:${i}` }, quiet: !p.fam && !p.you, quick: p.pid && !p.you ? { kind: 'person' as const, id: p.pid } : undefined };
  });
}

/** Modelo da casa dos Fossati (cidade da família; variações por época). */
export function homeModel31(s: GameState): FosM31 {
  const W = HOME_W31, year = s.year;
  const objs = homeObjs31(year, W);
  const fam = homePeople31(s);
  const you = yourPerson(s);
  const people: FosWho31[] = [...fam];
  if (you.who) people.push({ ...you.who, x: 0.445, pose: 'stand', dir: 'SE', look: { id: you.who.pid ?? 'you' } });
  const city = famCity31(s);
  const school = year >= ANTONELLA_SCHOOL31;
  const acts = playerActs(s)[0] ?? '';
  const vio = violinState31(s);
  const spots: Spot31[] = [];
  for (const d of HOME_SPOTS31) {
    const o = objs.find((x) => x.id === d.id);
    if (!o) continue;
    const label = d.id === 'antonella' && school ? SCHOOL_SPOT31.label : d.label;
    let tip = d.id === 'antonella' && school ? SCHOOL_SPOT31.tip : d.tip;
    const act: FamAct31 | undefined = d.id === 'antonella' ? (school ? 'lang' : 'press') : d.act;
    // motivo de bloqueio ANTES do clique (com o primeiro artista seu; o painel deixa escolher outro)
    const why = act && act !== 'lang' ? famLock31(s, act, acts) : act === 'lang' ? famLock31(s, 'lang', acts, 'en') : null;
    if (d.id === 'violin') tip = vio === 'stolen' ? l('A vitrine está vazia: o violino sumiu — sempre volta.', 'The cabinet is empty: the violin is missing — it always comes back.') : vio === 'none' ? l('O violino chega no primeiro mês.', 'The violin arrives in the first month.') : d.tip;
    if (d.id === 'flight' && year < FLIGHT_FROM31) tip = l('Um papagaio de papel na parede: ainda não há aeroclube na cidade.', 'A paper kite on the wall: there is no aeroclub in town yet.');
    spots.push({ id: d.id, x: o.x, y: o.y, w: o.w, h: o.h, label, tip: why && act !== 'lang' ? fmtL(l('{t} 🔒 {w}', '{t} 🔒 {w}'), { t: tip, w: why }) : tip,
      go: { panel: `obj:${d.id}` }, quick: { kind: 'city', id: city } });
  }
  spots.push(...whoSpots(W, people, s));
  const cityName = cityById[city]?.name ?? l(city, city);
  return {
    kind: 'home', W, H: FOS_H31, year, city, seed: s.config.seed,
    title: l('Casa da família Fossati', 'The Fossati family home'), what: fmtL(l('{c} · {y}', '{c} · {y}'), { c: cityName, y: year }),
    objs, people, spots, you: { here: you.here, where: you.here ? (city === s.config.homeCity ? l('Você está na casa da família Fossati, aqui na sua cidade.', 'You are at the Fossati family home, here in your city.') : fmtL(l('Você está visitando a família em {c}.', 'You are visiting the family in {c}.'), { c: cityName })) : you.where },
    note: you.here ? undefined : fmtL(l('{w} — a família está em casa, em {c}.', '{w} — the family is at home in {c}.'), { w: you.where, c: cityName }),
    violin: vio, famHere: ['efro', 'lucia', 'sonia', 'antonella', 'gianluca'],
  };
}

// ---------------------------------------------------------------- a praça

export const SQUARE_SPOTS31: { id: string; label: L; tip: L }[] = [
  { id: 'plaque', label: l('Placa da praça', 'Square plaque'), tip: l('Ler a placa: "Para Efro, Lucia, Antonella e Sonia".', 'Read the plaque: "For Efro, Lucia, Antonella and Sonia".') },
  { id: 'bench', label: l('Banco', 'Bench'), tip: l('Sentar um pouco e olhar o movimento.', 'Sit for a while and watch people go by.') },
  { id: 'tree', label: l('Árvore', 'Tree'), tip: l('A árvore mais antiga da praça.', 'The oldest tree in the square.') },
  { id: 'kiosk', label: l('Coreto', 'Bandstand'), tip: l('O coreto: banda aos domingos.', 'The bandstand: a band on Sundays.') },
  { id: 'statue', label: l('Escultura do violino', 'Violin sculpture'), tip: l('Um violino de bronze, discreto, no canteiro.', 'A discreet bronze violin in the flowerbed.') },
];

export function squareObjs31(W = SQUARE_W31): FosObj31[] {
  const g = geom27(W);
  const gy = FOS_H31 - 16, fy = gy - 2;
  const X = (f: number) => Math.round(12 + f * (W - 24));
  void g;
  return [
    { id: 'tree', kind: 'tree', x: X(0.03), y: fy - 64, w: 44, h: 64 },
    { id: 'bench', kind: 'bench', x: X(0.17), y: fy - 12, w: 34, h: 12 },
    { id: 'plaque', kind: 'plaque', x: X(0.3), y: fy - 30, w: 18, h: 30 },
    { id: 'kiosk', kind: 'kiosk', x: X(0.47), y: fy - 52, w: 74, h: 52 },
    { id: 'statue', kind: 'statue', x: X(0.73), y: fy - 30, w: 14, h: 30 },
    { id: 'tree:2', kind: 'tree', x: X(0.86), y: fy - 58, w: 40, h: 58 },
  ];
}

/** Gente da cidade passando na praça: a equipe dos lugares que está na cidade nesta semana (a ordem muda com a semana). */
export function passers31(s: GameState, n = 3): FosWho31[] {
  const st = peekGente31(s);
  if (!st) return [];
  const seen = new Set<string>();
  const rows = Object.entries(st.j)
    .filter(([, j]) => { if (seen.has(j.p)) return false; seen.add(j.p); return !!s.persons[j.p]?.alive && inTown31(s, j.p); })
    .map(([sl, j]) => ({ sl, j, k: hashString(`${s.config.seed}|sq31|${s.week}|${j.p}`) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n);
  const xs = [0.2, 0.67, 0.8, 0.43];
  return rows.map((r, i) => {
    const { k, i: fi } = parseSlot31(r.sl);
    const role = fmtL(l('{r} {a}', '{r} {a}'), { r: JOBS31[k]?.[fi] ?? l('Gente', 'Staff'), a: KIND_AT31[k] });
    return { name: s.persons[r.j.p].name, role, pid: r.j.p, key: `p:${r.j.p}`, x: xs[i % xs.length], pose: 'stand' as const, dir: (i % 2 ? 'SW' : 'SE') as 'SE' | 'SW', look: { id: r.j.p } };
  });
}

export function squareModel31(s: GameState): FosM31 {
  const W = SQUARE_W31;
  const objs = squareObjs31(W);
  const famHere = famSquare31(s);
  const people: FosWho31[] = [];
  const famPos: Record<string, [number, 'stand' | 'sit', 'SE' | 'SW']> = { efro: [0.205, 'sit', 'SE'], lucia: [0.255, 'sit', 'SE'], sonia: [0.6, 'stand', 'SW'], antonella: [0.66, 'stand', 'SE'] };
  for (const id of famHere) {
    const m = FAMILY31.find((x) => x.id === id)!;
    const [x, pose, dir] = famPos[id];
    people.push({ name: m.name, role: famRoleLabel31(s, id), key: famKey31(id), fam: id, x, pose, dir, talk: famTalk31(s, id), look: { id: `fam:${id}`, age: m.age } });
  }
  for (const p of passers31(s, famHere.length >= 3 ? 2 : 3)) if (!people.some((q) => Math.abs(q.x - p.x) < 0.05)) people.push(p);
  const you = yourPerson(s);
  if (you.who) people.push({ ...you.who, x: 0.38, pose: 'stand', dir: 'SE', look: { id: you.who.pid ?? 'you' } });
  const spots: Spot31[] = [];
  for (const d of SQUARE_SPOTS31) {
    const o = objs.find((x) => x.id === d.id)!;
    spots.push({ id: d.id, x: o.x, y: o.y, w: o.w, h: o.h, label: d.label, tip: d.tip, go: { panel: `obj:${d.id}` } });
  }
  // pessoas na praça: a mesma conta de pixels do pintor (chão da calçada)
  const fy = FOS_H31 - 16 - 2, X = (f: number) => Math.round(12 + f * (W - 24));
  people.forEach((p, i) => {
    const sit = p.pose === 'sit', fx = X(p.x);
    const met = peekFam31(s).met ?? [];
    spots.push({ id: `who:${i}`, x: fx - 7, y: fy - (sit ? 25 : 31), w: 14, h: sit ? 26 : 32, label: l(p.name, p.name),
      tip: p.you ? l('Você.', 'You.') : p.fam ? fmtL(met.includes(p.fam) ? l('{r} — conversar.', '{r} — talk.') : l('{r} — conhecer e conversar.', '{r} — meet and talk.'), { r: p.role }) : fmtL(l('{r} — passando pela praça.', '{r} — passing through the square.'), { r: p.role }),
      go: { panel: p.you ? 'you' : `who:${i}` }, quiet: !p.fam && !p.you, quick: p.pid && !p.you ? { kind: 'person', id: p.pid } : undefined });
  });
  const city = s.config.homeCity;
  const famL = famHere.length ? l(famHere.map((id) => FAMILY31.find((m) => m.id === id)!.name.split(' ')[0]).join(', '), famHere.map((id) => FAMILY31.find((m) => m.id === id)!.name.split(' ')[0]).join(', ')) : null;
  return {
    kind: 'square', W, H: FOS_H31, year: s.year, city, seed: s.config.seed,
    title: l('Praça Efro e Lucia Fossati', 'Efro and Lucia Fossati Square'),
    what: famL ? fmtL(l('Ao lado da sua sede · hoje na praça: {f}', 'Next to your HQ · in the square today: {f}'), { f: famL }) : l('Ao lado da sua sede', 'Next to your HQ'),
    objs, people, spots, you: { here: you.here, where: you.where }, note: you.here ? undefined : you.where, violin: violinState31(s), famHere,
  };
}

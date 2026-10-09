// Relações entre artistas de bandas e selos diferentes (rodada 8): amizades, rivalidades, romances,
// mentorias, rixas públicas e parcerias. Nascem na mesma cidade/cena, em festivais, em turnês, em feats
// e com produtores em comum; evoluem com o tempo (esfriam, brigam, fazem as pazes) e mexem no jogo:
// vontade de gravar feats, aliciamento por amigos de outro selo, contratar a banda de um amigo do seu
// elenco, humor de quem tem amigos (ou inimigos) e rixas públicas que chamam atenção.
// Dentro da mesma banda as relações continuam em `Person.rel`; aqui ficam só os laços entre atos,
// guardados de forma esparsa (lista limitada de pares de pessoas).

import { clamp, type Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { emitEvent } from '../events';
import { registerExt4, registerSimHook } from '../ext4';
import { compat } from '../beliefs';
import { registerPerkSource, type PerkEntry } from '../perks';
import type { Act, GameState, Person } from '../types';
import { fmtL, notify, playerActs, remember } from '../util';

export type TieKind = 'friend' | 'rival' | 'romance' | 'mentor' | 'feud' | 'collab';
export type TieSrc = 'scene' | 'festival' | 'tour' | 'feat' | 'producer' | 'label' | 'mentor' | 'chart' | 'romance';
export interface Tie {
  a: string;
  b: string;
  k: TieKind;
  /** −100..100 */
  v: number;
  /** ano em que começou */
  y: number;
  src: TieSrc;
  /** semana do último contato */
  w: number;
  /** pública (imprensa sabe) */
  pub?: 1;
  /** mentor (id da pessoa) numa mentoria */
  m?: string;
}
export interface SocialState { ties: Tie[]; prod: Record<string, string>; news: { y: number; t: L }[] }

declare module '../ext4' { interface Ext4 { social8: SocialState } }
registerExt4('social8', () => ({ ties: [], prod: {}, news: [] }));
export const social = (s: GameState): SocialState => {
  const x = s.x4 as unknown as { social8?: SocialState };
  x.social8 ??= { ties: [], prod: {}, news: [] };
  return x.social8;
};

export const MAX_TIES = 1400;

export const TIE_NAME: Record<TieKind, L> = {
  friend: l('Amizade', 'Friendship'), rival: l('Rivalidade', 'Rivalry'), romance: l('Romance', 'Romance'), mentor: l('Mentoria', 'Mentorship'), feud: l('Rixa pública', 'Public feud'), collab: l('Parceria', 'Collaboration'),
};
export const SRC_NAME: Record<TieSrc, L> = {
  scene: l('mesma cena', 'same scene'), festival: l('festival', 'festival'), tour: l('turnê', 'tour'), feat: l('feat', 'feature'), producer: l('produtor em comum', 'shared producer'),
  label: l('mesmo selo', 'same label'), mentor: l('mentoria', 'mentorship'), chart: l('disputa nas paradas', 'chart battle'), romance: l('romance', 'romance'),
};

// ---------------------------------------------------------------- índices (fora do save)

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const IDX = new WeakMap<Tie[], Map<string, Tie>>();
function index(s: GameState): Map<string, Tie> {
  const ties = social(s).ties;
  let m = IDX.get(ties);
  if (!m || m.size !== ties.length) {
    m = new Map();
    for (const t of ties) m.set(key(t.a, t.b), t);
    IDX.set(ties, m);
  }
  return m;
}

/** Pessoa → ato atual (cache por semana; atos desfeitos não contam). */
const ACTOF = new WeakMap<GameState, { week: number; n: number; map: Map<string, Act> }>();
export function actOfPerson(s: GameState, pid: string): Act | undefined {
  const n = Object.keys(s.acts).length;
  let c = ACTOF.get(s);
  if (!c || c.week !== s.week || c.n !== n) {
    const map = new Map<string, Act>();
    for (const a of Object.values(s.acts)) {
      if (a.status === 'split' || a.status === 'retired') continue;
      for (const id of a.members) if (!map.has(id) || a.members.length > 1) map.set(id, a);
    }
    c = { week: s.week, n, map };
    ACTOF.set(s, c);
  }
  return c.map.get(pid);
}

export function tieOf(s: GameState, a: string, b: string): Tie | undefined {
  return index(s).get(key(a, b));
}

export function tiesOf(s: GameState, pid: string): Tie[] {
  return social(s).ties.filter((t) => t.a === pid || t.b === pid).sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
}

export const otherOf = (t: Tie, pid: string): string => (t.a === pid ? t.b : t.a);

/** Laços entre os integrantes de dois atos (a soma das relações, −100..100). */
export function actBond(s: GameState, A: Act, B: Act): { v: number; ties: Tie[] } {
  const ties: Tie[] = [];
  let v = 0;
  for (const a of A.members) for (const b of B.members) {
    if (a === b) continue;
    const t = tieOf(s, a, b);
    if (t) { ties.push(t); v += t.v; }
  }
  return { v: clamp(v, -100, 100), ties };
}

/** Todos os laços dos integrantes de um ato com gente de fora. */
export function actTies(s: GameState, act: Act): { t: Tie; me: string; other: string }[] {
  const ms = new Set(act.members);
  const out: { t: Tie; me: string; other: string }[] = [];
  for (const t of social(s).ties) {
    if (ms.has(t.a) && !ms.has(t.b)) out.push({ t, me: t.a, other: t.b });
    else if (ms.has(t.b) && !ms.has(t.a)) out.push({ t, me: t.b, other: t.a });
  }
  return out.sort((x, y) => Math.abs(y.t.v) - Math.abs(x.t.v));
}

function kindFor(t: Tie): TieKind {
  if (t.k === 'romance' && t.v > 20) return 'romance';
  if (t.k === 'mentor' && t.v > 10) return 'mentor';
  if (t.k === 'feud' && t.v < -25) return 'feud';
  if (t.v <= -25) return t.pub && t.v <= -60 ? 'feud' : 'rival';
  if (t.k === 'collab' && t.v > 0) return 'collab';
  return t.v >= 0 ? 'friend' : 'rival';
}

/** Cria ou mexe num laço entre duas pessoas de atos diferentes. */
export function bump(s: GameState, a: string, b: string, dv0: number, src: TieSrc, kind?: TieKind): Tie | undefined {
  if (!a || !b || a === b) return undefined;
  let dv = dv0;
  const pa = s.persons[a];
  const pb = s.persons[b];
  if (!pa?.alive || !pb?.alive) return undefined;
  const A = actOfPerson(s, a);
  const B = actOfPerson(s, b);
  if (A && B && A === B) return undefined; // dentro da banda: Person.rel
  // rodada 10: visões parecidas aproximam, opostas atritam (política e religião)
  const cp = compat(s, a, b);
  dv = dv >= 0 ? dv * (1 + 0.35 * cp) : dv * (1 - 0.3 * cp);
  const st = social(s);
  let t = tieOf(s, a, b);
  if (!t) {
    t = { a: a < b ? a : b, b: a < b ? b : a, k: kind ?? (dv >= 0 ? 'friend' : 'rival'), v: 0, y: s.year, src, w: s.week };
    st.ties.push(t);
    index(s).set(key(a, b), t);
  }
  t.v = clamp(t.v + dv, -100, 100);
  t.w = s.week;
  if (kind) t.k = kind;
  t.k = kindFor(t);
  if (st.ties.length > MAX_TIES + 60) prune(s);
  return t;
}

function prune(s: GameState): void {
  const st = social(s);
  st.ties = st.ties
    .filter((t) => s.persons[t.a] && s.persons[t.b] && (s.persons[t.a].alive && s.persons[t.b].alive || s.year - t.y < 3))
    .sort((x, y) => Math.abs(y.v) + (y.pub ? 20 : 0) - Math.abs(x.v) - (x.pub ? 20 : 0))
    .slice(0, MAX_TIES);
}

function news(s: GameState, text: L, actId?: string, important = false): void {
  const st = social(s);
  st.news.push({ y: s.year, t: text });
  if (st.news.length > 30) st.news.shift();
  remember(s, 'social8', text, { actId, important });
}

const lead = (a: Act): string | undefined => a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0];
const pickMember = (r: Rng, a: Act): string | undefined => (a.members.length ? r.pick(a.members) : undefined);
const ageOf = (s: GameState, p?: Person) => (p ? s.year - p.born : 30);

// ---------------------------------------------------------------- formação e evolução (mês)

function formation(s: GameState, r: Rng): void {
  const pool: Act[] = [];
  const byCity = new Map<string, Act[]>();
  for (const a of Object.values(s.acts)) {
    if ((a.status !== 'active' && a.status !== 'emerging') || a.deceased || !a.members.length) continue;
    if (a.fame < 4 && a.owner !== 'player' && !a.playerBand) continue;
    pool.push(a);
    const list = byCity.get(a.city);
    if (list) list.push(a);
    else byCity.set(a.city, [a]);
  }
  if (pool.length < 2) return;
  // mesma cidade, mesma cena
  for (let i = 0; i < 12; i++) {
    const A = r.pick(pool);
    const local = byCity.get(A.city);
    if (!local || local.length < 2) continue;
    const B = r.pick(local);
    if (B === A) continue;
    const same = familyOf(A.genre) === familyOf(B.genre);
    const pa = pickMember(r, A);
    const pb = pickMember(r, B);
    if (!pa || !pb) continue;
    if (same && A.fame > 20 && B.fame > 20 && r.chance(0.3)) bump(s, pa, pb, -r.int(20, 35), 'scene');
    else if (r.chance(same ? 0.7 : 0.4)) bump(s, pa, pb, r.int(15, 30), 'scene');
  }
  // colegas de selo se cruzam no escritório, em coletâneas e em turnês do selo
  for (let i = 0; i < 3; i++) {
    const A = r.pick(pool);
    if (!A.owner) continue;
    const mates = A.owner === 'player' ? playerActs(s) : s.labels[A.owner]?.roster ?? [];
    if (mates.length < 2) continue;
    const B = s.acts[r.pick(mates)];
    if (!B || B === A || !B.members.length) continue;
    const pa = pickMember(r, A);
    const pb = pickMember(r, B);
    if (pa && pb) bump(s, pa, pb, r.chance(0.8) ? r.int(10, 22) : -r.int(12, 25), 'label');
  }
  // temporada de festivais (junho a agosto): os grandes se cruzam nos bastidores
  if (s.month >= 5 && s.month <= 7) {
    const top = pool.filter((a) => a.fame > 30);
    for (let i = 0; i < 3 && top.length > 1; i++) {
      const A = r.pick(top);
      const B = r.pick(top);
      if (A === B) continue;
      const pa = pickMember(r, A);
      const pb = pickMember(r, B);
      if (!pa || !pb) continue;
      bump(s, pa, pb, r.chance(0.75) ? r.int(12, 28) : -r.int(15, 30), 'festival');
    }
  }
  // mentoria: veterano consagrado adota um novato da mesma família de gêneros
  if (r.chance(0.35)) {
    const vets = pool.filter((a) => a.fame > 40 && a.members.some((id) => ageOf(s, s.persons[id]) >= 42));
    const kids = pool.filter((a) => a.fame < 35 && a.members.some((id) => ageOf(s, s.persons[id]) <= 27));
    if (vets.length && kids.length) {
      const V = r.pick(vets);
      const fam = familyOf(V.genre);
      const K = kids.find((k) => familyOf(k.genre) === fam && r.chance(0.5)) ?? (r.chance(0.3) ? r.pick(kids) : undefined);
      const mv = V.members.find((id) => ageOf(s, s.persons[id]) >= 42);
      const mk = K?.members.find((id) => ageOf(s, s.persons[id]) <= 27);
      if (K && mv && mk && !tieOf(s, mv, mk)) {
        const t = bump(s, mv, mk, r.int(35, 50), 'mentor', 'mentor');
        if (t) {
          t.m = mv;
          if (V.fame > 55 || K.owner === 'player') news(s, fmtL(l('{a} ({A}) vira mentor(a) de {b} ({B}).', '{a} ({A}) becomes a mentor to {b} ({B}).'), { a: s.persons[mv].name, A: V.name, b: s.persons[mk].name, B: K.name }), K.id);
        }
      }
    }
  }
}

function evolve(s: GameState, r: Rng): void {
  const st = social(s);
  const mine = new Set(playerActs(s));
  for (const t of st.ties) {
    const pa = s.persons[t.a];
    const pb = s.persons[t.b];
    if (!pa?.alive || !pb?.alive) continue;
    const idle = s.week - t.w;
    // sem contato, esfria (rixas públicas demoram mais)
    if (idle > 26) t.v += t.v > 0 ? -1.5 : t.k === 'feud' ? 0.6 : 1.2;
    // amizades às vezes azedam; rivalidades às vezes viram respeito
    if (t.k === 'friend' && t.v > 30 && r.chance(0.006)) { t.v -= 45; t.w = s.week; }
    else if (t.k === 'rival' && r.chance(0.01)) { t.v += 25; t.w = s.week; }
    // romance: amigos próximos e solteiros se apaixonam; romances acabam (às vezes mal)
    if (t.k === 'friend' && t.v > 60 && r.chance(0.03) && !busyRomance(s, t.a) && !busyRomance(s, t.b) && Math.abs(pa.born - pb.born) < 15) {
      t.k = 'romance';
      t.pub = 1;
      t.w = s.week;
      const A = actOfPerson(s, t.a);
      const B = actOfPerson(s, t.b);
      if (A && B && (A.fame > 30 || B.fame > 30 || mine.has(A.id) || mine.has(B.id))) news(s, fmtL(l('Romance na cena: {a} ({A}) e {b} ({B}) estão juntos.', 'Romance on the scene: {a} ({A}) and {b} ({B}) are together.'), { a: pa.name, A: A.name, b: pb.name, B: B.name }), mine.has(A.id) ? A.id : B.id);
    } else if (t.k === 'romance' && r.chance(0.025)) {
      const ugly = r.chance(0.4);
      t.v = ugly ? -55 : 20;
      t.k = ugly ? 'rival' : 'friend';
      t.w = s.week;
      const A = actOfPerson(s, t.a);
      const B = actOfPerson(s, t.b);
      if (A && B && (A.fame > 30 || B.fame > 30 || mine.has(A.id) || mine.has(B.id))) news(s, fmtL(ugly ? l('Fim do romance entre {a} e {b} — e não foi amigável.', '{a} and {b} split up — and it was not friendly.') : l('{a} e {b} terminam, mas seguem amigos.', '{a} and {b} split up but stay friends.'), { a: pa.name, b: pb.name }), mine.has(A.id) ? A.id : B.id);
    }
    // rivalidade escancarada vira rixa pública: os dois ganham holofote
    if (t.k === 'rival' && t.v <= -55 && !t.pub && r.chance(0.08)) {
      const A = actOfPerson(s, t.a);
      const B = actOfPerson(s, t.b);
      if (A && B && A.fame > 15 && B.fame > 15) {
        t.pub = 1;
        t.k = 'feud';
        t.w = s.week;
        for (const X of [A, B]) {
          X.momentum = clamp(X.momentum + 8, 0, 100);
          X.fans.casual += Math.round(X.fans.casual * 0.02);
        }
        news(s, fmtL(l('Rixa pública: {a} ({A}) e {b} ({B}) trocam farpas na imprensa.', 'Public feud: {a} ({A}) and {b} ({B}) trade jabs in the press.'), { a: pa.name, A: A.name, b: pb.name, B: B.name }), mine.has(A.id) ? A.id : mine.has(B.id) ? B.id : A.id, mine.has(A.id) || mine.has(B.id));
      }
    } else if (t.k === 'feud' && r.chance(0.02)) {
      t.v = 5;
      t.k = 'friend';
      t.w = s.week;
      const A = actOfPerson(s, t.a);
      if (A && (A.fame > 30 || mine.has(A.id))) news(s, fmtL(l('{a} e {b} fazem as pazes em público.', '{a} and {b} make peace in public.'), { a: pa.name, b: pb.name }), A.id);
    }
    // mentoria rende: o novato cresce um pouco
    if (t.k === 'mentor' && t.m) {
      const mentee = s.persons[otherOf(t, t.m)];
      if (mentee && mentee.skills.comp < mentee.potential) mentee.skills.comp = Math.min(mentee.potential, mentee.skills.comp + 0.12);
      if (mentee && s.year - mentee.born > 34) t.k = 'friend'; // o aluno cresceu
    }
    t.k = kindFor(t);
  }
  st.ties = st.ties.filter((x) => Math.abs(x.v) >= 4 || s.week - x.w < 8);
  if (st.ties.length > MAX_TIES) prune(s);
}

function busyRomance(s: GameState, pid: string): boolean {
  return social(s).ties.some((t) => t.k === 'romance' && (t.a === pid || t.b === pid));
}

/** Efeitos no elenco do jogador: humor, estresse e aliciamento por amizade. */
function playerEffects(s: GameState, r: Rng): void {
  const mine = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  if (!mine.length) return;
  for (const act of mine) {
    const ts = actTies(s, act);
    if (!ts.length) continue;
    for (const { t, me } of ts) {
      const p = s.persons[me];
      if (!p) continue;
      if (t.k === 'friend' || t.k === 'romance' || t.k === 'collab' || t.k === 'mentor') p.morale = clamp(p.morale + Math.min(1.2, t.v / 60), 0, 100);
      else if (t.k === 'feud') p.stress = clamp(p.stress + 1.5, 0, 100);
    }
    // amigo de outro selo chama para lá
    if (act.playerBand || act.trust >= 55) continue;
    const lure = ts.find(({ t, other }) => t.v > 50 && (t.k === 'friend' || t.k === 'romance') && labelOfPerson(s, other));
    if (lure && r.chance(0.05) && !s.decisions.some((d) => d.eventId === 'poach_attempt')) {
      const lb = labelOfPerson(s, lure.other)!;
      if ((s.eventCooldowns.poach_attempt ?? 0) <= s.week) {
        emitEvent(s, r, 'poach_attempt', { act: act.id, label: lb });
        notify(s, fmtL(l('{p} ({a}) está sendo chamado(a) pelo amigo {f} para {lb}.', '{p} ({a}) is being called over to {lb} by their friend {f}.'), { p: s.persons[lure.me]?.name ?? '', a: act.name, f: s.persons[lure.other]?.name ?? '', lb: s.labels[lb]?.name ?? '' }), 'bad');
      }
    }
  }
}

function labelOfPerson(s: GameState, pid: string): string | undefined {
  const A = actOfPerson(s, pid);
  return A?.owner && A.owner !== 'player' && s.labels[A.owner]?.active ? A.owner : undefined;
}

registerSimHook('month', 'social8', (s, r) => {
  formation(s, r);
  evolve(s, r);
  playerEffects(s, r);
});

// turnês do jogador: conhece artistas locais
registerSimHook('show', 'social8', (s, r, arg) => {
  const sh = arg.show;
  if (!sh || !r.chance(0.04)) return;
  const act = s.acts[sh.actId];
  if (!act) return;
  const locals = Object.values(s.acts).filter((a) => a.city === sh.cityId && a.id !== act.id && (a.status === 'active' || a.status === 'emerging') && a.members.length);
  if (!locals.length) return;
  const B = r.pick(locals);
  const pa = pickMember(r, act);
  const pb = pickMember(r, B);
  if (pa && pb) bump(s, pa, pb, r.int(12, 25), 'tour');
});

// lançamentos: produtor em comum e parcerias gravadas
registerSimHook('launch', 'social8', (s, r, arg) => {
  const rel = arg.release;
  if (!rel) return;
  const act = s.acts[rel.actId];
  if (!act) return;
  const st = social(s);
  for (const id of rel.songs) {
    const so = s.songs[id];
    if (!so?.producerId) continue;
    const prev = st.prod[so.producerId];
    if (prev && prev !== act.id && s.acts[prev]) {
      const a = lead(act);
      const b = lead(s.acts[prev]);
      if (a && b && r.chance(0.5)) bump(s, a, b, r.int(8, 18), 'producer');
    }
    st.prod[so.producerId] = act.id;
  }
  const keys = Object.keys(st.prod);
  if (keys.length > 120) for (const k of keys.slice(0, keys.length - 120)) delete st.prod[k];
});

// ---------------------------------------------------------------- perks: amigos no elenco e rixas

registerPerkSource('social8', (s) => {
  const st = (s.x4 as unknown as { social8?: SocialState }).social8;
  if (!st?.ties.length) return [];
  const mine = new Set(playerActs(s));
  const mineP = new Set<string>();
  for (const id of mine) for (const p of s.acts[id]?.members ?? []) mineP.add(p);
  const friendsOfMine = new Set<string>();
  const feuding = new Set<string>();
  for (const t of st.ties) {
    const fr = t.v > 35 && (t.k === 'friend' || t.k === 'romance' || t.k === 'collab' || t.k === 'mentor');
    if (fr && mineP.has(t.a) && !mineP.has(t.b)) { const A = actOfPerson(s, t.b); if (A) friendsOfMine.add(A.id); }
    if (fr && mineP.has(t.b) && !mineP.has(t.a)) { const A = actOfPerson(s, t.a); if (A) friendsOfMine.add(A.id); }
    if (t.k === 'feud' && t.pub && s.week - t.w < 16) {
      const A = actOfPerson(s, t.a);
      const B = actOfPerson(s, t.b);
      if (A) feuding.add(A.id);
      if (B) feuding.add(B.id);
    }
  }
  const out: PerkEntry[] = [];
  if (friendsOfMine.size) out.push({ label: l('Amigos no seu elenco', 'Friends on your roster'), values: { offer: 0.07 }, act: (_s, a) => friendsOfMine.has(a.id) });
  if (feuding.size) out.push({ label: l('Rixa pública', 'Public feud'), values: { appeal: 0.05 }, act: (_s, a) => feuding.has(a.id) });
  return out;
});

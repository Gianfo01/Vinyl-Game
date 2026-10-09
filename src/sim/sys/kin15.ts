// Rodada 15: laços familiares. Grafo de parentesco (pai/filho, irmãos, casal/ex, tio/sobrinho, primos) entre
// pessoas do banco: reais (src/data/kin15.ts, por nome, só depois do nascimento) e geradas (bandas de irmãos,
// filhos de músicos que estreiam depois). Os laços pesam: luto, rixas que racham bandas, indicações (acesso
// por nepotismo) e herança de fama/fãs para filhos de artistas.

import { clamp, Rng, seedState } from '../../core/rng';
import { KIN15 } from '../../data/kin15';
import { l, type L } from '../../data/world';
import { realSafe } from '../dynasty';
import { registerExt4, registerSimHook } from '../ext4';
import { langForCity, personName } from '../people';
import type { Act, GameState, Person } from '../types';
import { fmtL, notify, remember } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { canonKey } from './realworld';

export type Rel15 = 'parent' | 'child' | 'sibling' | 'spouse' | 'ex' | 'cousin' | 'uncle' | 'nephew';
export const REL15: Record<Rel15, L> = {
  parent: l('Pai/mãe', 'Parent'), child: l('Filho(a)', 'Child'), sibling: l('Irmão(ã)', 'Sibling'), spouse: l('Cônjuge', 'Spouse'), ex: l('Ex', 'Ex'),
  cousin: l('Primo(a)', 'Cousin'), uncle: l('Tio(a)', 'Uncle/aunt'), nephew: l('Sobrinho(a)', 'Nephew/niece'),
};
const INV: Record<Rel15, Rel15> = { parent: 'child', child: 'parent', sibling: 'sibling', spouse: 'spouse', ex: 'ex', cousin: 'cousin', uncle: 'nephew', nephew: 'uncle' };
/** relação inicial (−100..100) entre parentes */
const BASE: Record<Rel15, number> = { parent: 35, child: 35, sibling: 20, spouse: 40, ex: -25, cousin: 10, uncle: 20, nephew: 20 };
const CLOSE = new Set<Rel15>(['parent', 'child', 'sibling', 'spouse']);

export interface Kin15 {
  /** laços gerados: [a, b, relação de b para a] (o inverso é implícito) */
  g: [string, string, Rel15][];
  dead: string[];
  /** rixas de irmãos em curso: "a|b" → mês absoluto de início */
  feud: Record<string, number>;
  /** filhos de músicos ainda sem carreira */
  kids: { parent: string; name: string; born: number; debut: number; done?: boolean }[];
  /** atos já examinados para bandas de irmãos; filhos que já receberam herança de fama */
  chk: string[];
  inh: string[];
  /** indicações da família: ato → pessoa que indicou */
  tips: Record<string, string>;
  log: [number, number, L][];
}
const fresh = (): Kin15 => ({ g: [], dead: [], feud: {}, kids: [], chk: [], inh: [], tips: {}, log: [] });
declare module '../ext4' { interface Ext4 { kin15: Kin15 } }
registerExt4('kin15', fresh);
export function kin15(s: GameState): Kin15 {
  const x = s.x4 as unknown as { kin15?: Kin15 };
  const st = (x.kin15 ??= fresh());
  st.g ??= []; st.dead ??= []; st.feud ??= {}; st.kids ??= []; st.chk ??= []; st.inh ??= []; st.tips ??= {}; st.log ??= [];
  return st;
}
const mIdx = (s: GameState) => s.year * 12 + s.month;
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const say = (s: GameState, t: L) => { const st = kin15(s); st.log.unshift([s.year, s.month, t]); st.log.length = Math.min(st.log.length, 30); };

// ---- grafo -------------------------------------------------------------------------------------------------
type Edges = Record<string, [string, Rel15][]>;
const cache = new WeakMap<GameState, { n: number; e: Edges }>();
const add = (e: Edges, a: string, b: string, r: Rel15) => {
  if (a === b) return;
  const la = (e[a] ??= []); if (!la.some((x) => x[0] === b)) la.push([b, r]);
  const lb = (e[b] ??= []); if (!lb.some((x) => x[0] === a)) lb.push([a, INV[r]]);
};

/** Arestas reais (do dataset, casando por nome) + geradas. */
function graph(s: GameState): Edges {
  const n = mIdx(s), st = kin15(s), c = cache.get(s);
  if (c && c.n === n + st.g.length * 100000) return c.e;
  const idx: Record<string, string> = {};
  for (const p of Object.values(s.persons)) { const k = canonKey(p.name); if (!(k in idx) || (!s.persons[idx[k]].alive && p.alive)) idx[k] = p.id; }
  const e: Edges = {};
  for (const [t, ...ns] of KIN15) {
    const ids = ns.map((x) => idx[canonKey(x)]);
    if (t === 'S' || t === 'C') { for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (ids[i] && ids[j]) add(e, ids[i], ids[j], t === 'S' ? 'sibling' : 'cousin'); }
    else if (ids[0]) for (const k of ids.slice(1)) if (k) add(e, ids[0], k, t === 'P' ? 'child' : t === 'M' ? 'spouse' : t === 'X' ? 'ex' : 'nephew');
  }
  for (const [a, b, r] of st.g) if (s.persons[a] && s.persons[b]) add(e, a, b, r);
  // filhos do mesmo pai/mãe são irmãos
  for (const [pid, ks] of Object.entries(e)) {
    const kids = ks.filter((x) => x[1] === 'child').map((x) => x[0]);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) if (s.persons[pid]) add(e, kids[i], kids[j], 'sibling');
  }
  cache.set(s, { n: n + st.g.length * 100000, e });
  return e;
}

/** Parentes visíveis hoje (quem ainda não nasceu não aparece). */
export function kinOf15(s: GameState, pid: string): { id: string; rel: Rel15; p: Person }[] {
  return (graph(s)[pid] ?? []).map(([id, rel]) => ({ id, rel, p: s.persons[id] })).filter((x) => x.p && x.p.born <= s.year);
}
export const actOf15 = (s: GameState, pid: string): Act | undefined => Object.values(s.acts).find((a) => a.members.includes(pid));
export const feudOf15 = (s: GameState, a: string, b: string): number | undefined => kin15(s).feud[pairKey(a, b)];
const fameOf = (s: GameState, pid: string) => Object.values(s.acts).reduce((m, a) => (a.members.includes(pid) ? Math.max(m, a.fame) : m), 0);

// ---- mensal -------------------------------------------------------------------------------------------------
function grief(s: GameState, p: Person): void {
  for (const k of kinOf15(s, p.id)) {
    const q = k.p;
    if (!q.alive || k.rel === 'ex') continue;
    const close = CLOSE.has(k.rel);
    q.morale = clamp(q.morale - (close ? 10 : 4), 0, 100);
    q.stress = clamp(q.stress + (close ? 10 : 3), 0, 100);
    q.rel[p.id] = clamp((q.rel[p.id] ?? 0) + 5, -100, 100);
    // luto também une: irmãos em rixa fazem as pazes
    for (const o of kinOf15(s, q.id)) if (o.rel === 'sibling') delete kin15(s).feud[pairKey(q.id, o.id)];
    const a = actOf15(s, q.id);
    if (close && a) {
      a.momentum = clamp(a.momentum - 4, 0, 100);
      if (a.owner === 'player') notify(s, fmtL(l('{q} está de luto por {p} ({r}): moral e foco caem por um tempo.', '{q} is mourning {p} ({r}): morale and focus drop for a while.'), { q: q.name, p: p.name, r: l(REL15[INV[k.rel]].pt, REL15[INV[k.rel]].en) }), 'event');
    }
    // herança de fama: o legado do pai/mãe empurra o ato do filho
    if (k.rel === 'parent' && a && !a.catalogNo) { a.momentum = clamp(a.momentum + 12, 0, 100); a.fame = clamp(a.fame + Math.min(5, fameOf(s, p.id) * 0.06), 0, 100); }
  }
  say(s, fmtL(l('{p} morreu; a família sente a perda.', '{p} died; the family feels the loss.'), { p: p.name }));
}

function feuds(s: GameState, r: Rng): void {
  const st = kin15(s), now = mIdx(s);
  for (const a of Object.values(s.acts)) {
    if ((a.status !== 'active' && a.status !== 'emerging') || a.members.length < 2) continue;
    const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const A = ms[i], B = ms[j];
      if (!kinOf15(s, A.id).some((k) => k.id === B.id && k.rel === 'sibling')) continue;
      const key = pairKey(A.id, B.id), since = st.feud[key];
      const tense = (A.resentment + B.resentment) / 2 > 45 || (A.rel[B.id] ?? 0) < -20 || (B.rel[A.id] ?? 0) < -20 || (A.stress + B.stress) / 2 > 70;
      const roll = r.next(), roll2 = r.next();
      if (since === undefined) {
        if (roll < 0.003 + (tense ? 0.02 : 0) + (a.fame > 60 ? 0.004 : 0)) {
          st.feud[key] = now;
          A.rel[B.id] = clamp((A.rel[B.id] ?? 0) - 30, -100, 100); B.rel[A.id] = clamp((B.rel[A.id] ?? 0) - 30, -100, 100);
          A.morale = clamp(A.morale - 6, 0, 100); B.morale = clamp(B.morale - 6, 0, 100);
          const t = fmtL(l('Briga entre os irmãos {a} e {b} em {x}: a imprensa já fala nisso.', 'Siblings {a} and {b} of {x} are feuding: the press has noticed.'), { a: A.name, b: B.name, x: a.name });
          remember(s, 'feud', t, { actId: a.id, important: a.fame > 40 }); say(s, t);
          if (a.owner === 'player') notify(s, t, 'event');
        }
      } else if (roll < 0.035) { // pazes
        delete st.feud[key]; A.rel[B.id] = clamp((A.rel[B.id] ?? 0) + 25, -100, 100); B.rel[A.id] = clamp((B.rel[A.id] ?? 0) + 25, -100, 100);
        const t = fmtL(l('{a} e {b} fizeram as pazes.', '{a} and {b} made up.'), { a: A.name, b: B.name }); say(s, t);
        if (a.owner === 'player') notify(s, t, 'info');
      } else if (now - since >= 8 && !realSafe(s, a) && !a.catalogNo && roll2 < 0.06) {
        // a rixa racha a banda: um sai (ou o duo entra em hiato)
        delete st.feud[key];
        if (a.members.length > 2) {
          const out = A.stress + A.resentment > B.stress + B.resentment ? A : B;
          a.members = a.members.filter((x) => x !== out.id);
          if (a.leaderId === out.id) a.leaderId = a.members[0];
          const t = fmtL(l('{o} deixa {x} depois de meses de briga com {q}.', '{o} leaves {x} after months of fighting with {q}.'), { o: out.name, x: a.name, q: (out === A ? B : A).name });
          remember(s, 'member_retires', t, { actId: a.id, important: a.fame > 35 }); say(s, t);
          if (a.owner === 'player') notify(s, t, 'event');
        } else {
          a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 52); a.momentum = clamp(a.momentum - 20, 0, 100);
          const t = fmtL(l('{x} entra em hiato: {a} e {b} não se falam.', '{x} goes on hiatus: {a} and {b} are not speaking.'), { x: a.name, a: A.name, b: B.name });
          remember(s, 'feud', t, { actId: a.id, important: a.fame > 35 }); say(s, t);
          if (a.owner === 'player') notify(s, t, 'event');
        }
      }
    }
  }
}

/** Gerados: bandas de irmãos e filhos de músicos que estreiam anos depois. */
function generate(s: GameState, r: Rng): void {
  const st = kin15(s);
  for (const a of Object.values(s.acts)) {
    if (a.catalogNo || a.members.length < 2 || st.chk.includes(a.id)) continue;
    st.chk.push(a.id);
    const roll = r.next();
    const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && !(graph(s)[p.id]?.length));
    const fam = ms.filter((p) => p.origin === 'family').length;
    if (ms.length < 2 || !(fam >= 2 || roll < (a.members.length === 2 ? 0.18 : 0.08))) continue;
    const head = ms[0], sur = head.name.split(' ').slice(1).join(' ');
    const grp = ms.slice(0, 3).filter((p) => Math.abs(p.born - head.born) <= 12);
    if (grp.length < 2) continue;
    for (const p of grp) { if (sur) p.name = `${p.name.split(' ')[0]} ${sur}`; p.origin = 'family'; }
    for (let i = 0; i < grp.length; i++) for (let j = i + 1; j < grp.length; j++) st.g.push([grp[i].id, grp[j].id, 'sibling']);
    say(s, fmtL(l('{x}: banda de irmãos ({n}).', '{x}: a band of siblings ({n}).'), { x: a.name, n: grp.map((p) => p.name.split(' ')[0]).join(', ') }));
  }
  // filhos de músicos: nascem de pais famosos e viram músicos depois
  if (s.month % 3 === 0) for (const a of Object.values(s.acts)) {
    const roll = r.next();
    if (a.catalogNo || a.fame < 30 || (a.status !== 'active' && a.status !== 'emerging')) continue;
    const p = a.members.map((id) => s.persons[id]).find((q) => q && q.alive);
    if (!p) continue;
    const age = s.year - p.born;
    if (age < 28 || age > 55 || st.kids.some((k) => k.parent === p.id) || roll > 0.012 + a.fame / 8000) continue;
    const sur = p.name.split(' ').slice(1).join(' ') || p.name;
    const first = personName(r, langForCity(a.city, r)).split(' ')[0];
    st.kids.push({ parent: p.id, name: `${first} ${sur}`, born: s.year, debut: s.year + r.int(17, 24) });
  }
  for (const k of st.kids) {
    if (k.done || s.year < k.debut || r.next() > 0.2) continue;
    const par = s.persons[k.parent], pa = par && actOf15(s, par.id);
    k.done = true;
    if (!par || !pa) continue;
    const pick = r.chance(0.7);
    const act = spawnProceduralAct(s, r, { city: pa.city, genre: pick ? pa.genre : undefined, formedYear: s.year });
    const kid = s.persons[act.members[0]];
    if (!kid) continue;
    kid.name = k.name; kid.born = k.born; kid.origin = 'family';
    st.g.push([par.id, kid.id, 'child']);
    act.fame = clamp(act.fame + Math.min(14, 3 + pa.fame * 0.12), 0, 100);
    const tot = pa.fans.casual + pa.fans.active + pa.fans.core;
    act.fans.casual += Math.round(tot * 0.02); act.fans.active += Math.round(tot * 0.004);
    st.inh.push(kid.id);
    kid.rel[par.id] = BASE.parent; par.rel[kid.id] = BASE.child;
    const t = fmtL(l('{k}, filho(a) de {p} ({a}), estreia como {x}. O sobrenome abre portas, mas a comparação pesa.', '{k}, child of {p} ({a}), debuts as {x}. The surname opens doors, but the comparison weighs.'), { k: kid.name, p: par.name, a: pa.name, x: act.name });
    say(s, t);
    if (pa.fame >= 40 || pa.owner === 'player') { remember(s, 'dynasty', t, { actId: act.id, important: true }); notify(s, t, 'event'); }
  }
  st.kids = st.kids.filter((k) => !k.done || s.year - k.debut < 3);
}

/** Herança de fama para filhos reais (uma vez, quando o ato do filho existe). */
function inherit(s: GameState): void {
  const st = kin15(s);
  for (const a of Object.values(s.acts)) {
    if (!a.catalogNo || a.fame > 45) continue;
    for (const id of a.members) {
      if (st.inh.includes(id)) continue;
      const par = kinOf15(s, id).filter((k) => k.rel === 'parent').map((k) => fameOf(s, k.id)).sort((x, y) => y - x)[0];
      if (par === undefined || par < 30) continue;
      st.inh.push(id);
      a.fame = clamp(a.fame + Math.min(8, par * 0.1), 0, 100);
      a.fans.casual += Math.round((a.fans.casual + 200) * 0.15);
      say(s, fmtL(l('{p} herda parte do público da família (sobrenome conhecido).', '{p} inherits part of the family audience (known surname).'), { p: s.persons[id].name }));
    }
  }
}

/** Nepotismo: quem está no seu elenco indica parentes (acesso a atos que você ainda não conhece). */
function tips(s: GameState, r: Rng): void {
  const st = kin15(s);
  for (const mine of Object.values(s.acts)) {
    if (mine.owner !== 'player') continue;
    for (const id of mine.members) for (const k of kinOf15(s, id)) {
      const roll = r.next();
      if (!k.p.alive || (!CLOSE.has(k.rel) && k.rel !== 'cousin')) continue;
      const a = actOf15(s, k.id);
      if (!a || a.owner === 'player' || a.id === mine.id || st.tips[a.id] || a.fame < 8 || roll > 0.04) continue;
      st.tips[a.id] = id;
      const kn = s.knowledge[a.id];
      if (!kn) s.knowledge[a.id] = { actId: a.id, degree: 2, stage: 'signal', bias: 0, updatedWeek: s.week, source: 'family' };
      else kn.degree = Math.min(4, kn.degree + 1);
      const t = fmtL(l('{w} recomenda {k} ({r}), do ato {a}: porta aberta para conversar, sem intermediários.', '{w} recommends {k} ({r}), of the act {a}: an open door to talk, no middlemen.'), { w: s.persons[id].name, k: k.p.name, r: l(REL15[k.rel].pt.toLowerCase(), REL15[k.rel].en.toLowerCase()), a: a.name });
      notify(s, t, 'info'); say(s, t);
    }
  }
}

function seedRel(s: GameState): void {
  for (const [pid, ks] of Object.entries(graph(s))) { const p = s.persons[pid]; if (p) for (const [o, rel] of ks) if (p.rel[o] === undefined) p.rel[o] = BASE[rel]; }
}

export function kinMonth15(s: GameState): void {
  const st = kin15(s), r = new Rng(seedState(`kin15|${s.config.seed}|${mIdx(s)}`));
  seedRel(s);
  for (const id of Object.keys(graph(s))) {
    const p = s.persons[id];
    if (!p || p.alive || st.dead.includes(id)) continue;
    st.dead.push(id);
    if (p.died !== undefined && p.died >= s.year - 1) grief(s, p);
  }
  feuds(s, r); generate(s, r); inherit(s); tips(s, r);
}
registerSimHook('month', 'kin15', (s) => kinMonth15(s));

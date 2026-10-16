// Rodada 15: laços familiares. Grafo de parentesco (pai/filho, irmãos, casal/ex, tio/sobrinho, primos) entre
// pessoas do banco: reais (src/data/kin15.ts, por nome, só depois do nascimento) e geradas (bandas de irmãos,
// filhos de músicos que estreiam depois). Os laços pesam: luto, rixas que racham bandas, indicações (acesso
// por nepotismo) e herança de fama/fãs para filhos de artistas.

import { clamp, Rng, seedState } from '../../core/rng';
import { exitMember20 } from '../members20';
import { actsOfPerson17 } from '../actidx17';
import { KIN15, type KinRow } from '../../data/kin15';
import { KIN25 } from '../../data/kin25';
import { KIN27 } from '../../data/kin27';
import { KINR27 } from '../../data/research27';
import { isKinMeta27, type KinMeta27, type KinSub27 } from '../../data/model27';
import type { Prov27 } from '../../data/realtypes';
import { histMode } from '../history15';
import { l, type L } from '../../data/world';
import { realSafe } from '../dynasty';
import { registerExt4, registerSimHook } from '../ext4';
import { langForCity, makePerson, personName } from '../people';
import type { Act, GameState, Person } from '../types';
import { fmtL, notify, remember } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { canonKey } from './realworld';
import { actsNow27 } from '../tickcache27';
import { actsTouched17 } from '../actidx17';
import { rel0, relAdd, relPut, relTouch } from '../opinion';

export type Rel15 = 'parent' | 'child' | 'sibling' | 'spouse' | 'ex' | 'cousin' | 'uncle' | 'nephew' | 'grandparent' | 'grandchild';
export const REL15: Record<Rel15, L> = {
  parent: l('Pai/mãe', 'Parent'), child: l('Filho(a)', 'Child'), sibling: l('Irmão(ã)', 'Sibling'), spouse: l('Cônjuge', 'Spouse'), ex: l('Ex', 'Ex'),
  cousin: l('Primo(a)', 'Cousin'), uncle: l('Tio(a)', 'Uncle/aunt'), nephew: l('Sobrinho(a)', 'Nephew/niece'),
  grandparent: l('Avô/avó', 'Grandparent'), grandchild: l('Neto(a)', 'Grandchild'),
};
export const INV15: Record<Rel15, Rel15> = { parent: 'child', child: 'parent', sibling: 'sibling', spouse: 'spouse', ex: 'ex', cousin: 'cousin', uncle: 'nephew', nephew: 'uncle', grandparent: 'grandchild', grandchild: 'grandparent' };
const INV = INV15;
/** relação inicial (−100..100) entre parentes */
const BASE: Record<Rel15, number> = { parent: 35, child: 35, sibling: 20, spouse: 40, ex: -25, cousin: 10, uncle: 20, nephew: 20, grandparent: 30, grandchild: 30 };
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
/** r27 (F): extras de um laço — subtipo (biológico, adotivo, padrasto, afinidade, meio-irmão), período e procedência. */
export interface KinX15 { sub?: KinSub27; from?: number; to?: number; src?: Prov27 }
type Edge = [string, Rel15, KinX15?];
type Edges = Record<string, Edge[]>;
const cache = new WeakMap<GameState, { n: number; e: Edges }>();
const add = (e: Edges, a: string, b: string, r: Rel15, x?: KinX15) => {
  if (a === b) return;
  const la = (e[a] ??= []); if (!la.some((y) => y[0] === b)) la.push(x ? [b, r, x] : [b, r]);
  const lb = (e[b] ??= []); if (!lb.some((y) => y[0] === a)) lb.push(x ? [a, INV[r], x] : [a, INV[r]]);
};
/** laço de sangue (ou pai/mãe genérico): só ele gera irmãos, avós, tios e primos derivados */
const blood = (x?: KinX15) => !x?.sub || x.sub === 'biological';
const split27 = (row: KinRow): { t: KinRow[0]; ns: string[]; meta?: KinMeta27 } => {
  const last = row[row.length - 1];
  const meta = isKinMeta27(last) ? last : undefined;
  return { t: row[0], ns: row.slice(1, meta ? -1 : undefined) as string[], meta };
};
/** r27 (F): casamento com período — antes do início não há laço; depois do fim vira ex (salvo se acabou com a morte). */
export function marriage15(meta: KinMeta27 | undefined, base: 'spouse' | 'ex', y: number, a?: Person, b?: Person): 'spouse' | 'ex' | undefined {
  if (!meta || (meta.from === undefined && meta.to === undefined)) return base;
  if (meta.from !== undefined && y < meta.from) return undefined;
  if (meta.to !== undefined && y > meta.to) return [a, b].some((p) => p && !p.alive && p.died !== undefined && p.died <= meta.to!) ? 'spouse' : 'ex';
  return 'spouse';
}
const ALL_ROWS = (): KinRow[] => [...KIN15, ...KIN27, ...KINR27];
/** pais declarados (de sangue/genéricos) por nome canônico — mesmo de quem não existe no jogo (ex.: Ronaldo Bôscoli, Cynthia) */
let PARENTS27: Map<string, Set<string>> | null = null;
function declaredParents27(): Map<string, Set<string>> {
  if (PARENTS27) return PARENTS27;
  const m = new Map<string, Set<string>>();
  const put = (kid: string, par: string) => { const k = canonKey(kid); (m.get(k) ?? m.set(k, new Set()).get(k)!).add(canonKey(par)); };
  for (const row of ALL_ROWS()) { const { t, ns, meta } = split27(row); if (t === 'P' && blood(meta)) for (const k of ns.slice(1)) put(k, ns[0]); }
  for (const row of KIN25) { const [a, r, b, meta] = row as [string, Rel15, string, KinMeta27?]; if (!blood(meta)) continue; if (r === 'parent') put(b, a); else if (r === 'child') put(a, b); }
  return (PARENTS27 = m);
}
/** r27 (F): dois filhos do mesmo pai/mãe são meio-irmãos quando os OUTROS pais declarados são diferentes. */
export function halfByParents27(a: string, b: string, shared: string): boolean {
  const P = declaredParents27(), sh = canonKey(shared);
  const pa = [...(P.get(canonKey(a)) ?? [])].filter((x) => x !== sh), pb = [...(P.get(canonKey(b)) ?? [])].filter((x) => x !== sh);
  return pa.length > 0 && pb.length > 0 && !pa.some((x) => pb.includes(x));
}

/** Arestas reais (do dataset, casando por nome) + geradas. */
function graph(s: GameState): Edges {
  const n = mIdx(s), st = kin15(s), c = cache.get(s);
  if (c && c.n === n + st.g.length * 100000) return c.e;
  const idx: Record<string, string> = {};
  for (const p of Object.values(s.persons)) { const k = canonKey(p.name); if (!(k in idx) || (!s.persons[idx[k]].alive && p.alive)) idx[k] = p.id; }
  const e: Edges = {};
  const strict = histMode(s) === 'strict';
  for (const row of ALL_ROWS()) { // r27: + laços da auditoria (C1) e da pesquisa (F)
    const { t, ns, meta } = split27(row);
    if (strict && meta?.src === 'u') continue; // não conferido some do modo exato
    const ids = ns.map((x) => idx[canonKey(x)]);
    const x: KinX15 | undefined = meta ? { ...meta } : undefined;
    if (t === 'S' || t === 'C') { for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (ids[i] && ids[j]) add(e, ids[i], ids[j], t === 'S' ? 'sibling' : 'cousin', x); }
    else if ((t === 'M' || t === 'X') && ids[0]) {
      for (const k of ids.slice(1)) {
        if (!k) continue;
        const r = marriage15(meta, t === 'M' ? 'spouse' : 'ex', s.year, s.persons[ids[0]], s.persons[k]);
        if (r) add(e, ids[0], k, r, x);
      }
    } else if (ids[0]) for (const k of ids.slice(1)) if (k) add(e, ids[0], k, t === 'P' ? 'child' : 'nephew', x);
  }
  // r25: [A, rel, B] = "A é <rel> de B" → aresta de B para A
  for (const row of KIN25) {
    const [a, r0, b, meta] = row as [string, Rel15, string, KinMeta27?];
    if (strict && meta?.src === 'u') continue;
    const ia = idx[canonKey(a)], ib = idx[canonKey(b)];
    if (!ia || !ib) continue;
    const r = r0 === 'spouse' || r0 === 'ex' ? marriage15(meta, r0, s.year, s.persons[ia], s.persons[ib]) : r0;
    if (r) add(e, ib, ia, r, meta ? { ...meta } : undefined);
  }
  for (const [a, b, r] of st.g) if (s.persons[a] && s.persons[b]) add(e, a, b, r);
  // R29 (família): filho(a) que virou pessoa pela dinastia do jogador (dynasty.ts) aponta o pai/mãe em parentId — o mesmo
  // laço do grafo, para a ficha, a árvore e o connect29 concordarem (antes só a aba Carreira lia o parentId)
  for (const p of Object.values(s.persons)) if (p.parentId && s.persons[p.parentId]) add(e, p.parentId, p.id, 'child');
  // filhos do mesmo pai/mãe (de sangue ou genérico) são irmãos — meio-irmãos se os outros pais declarados diferem
  for (const [pid, ks] of Object.entries(e)) {
    if (!s.persons[pid]) continue;
    const kids = ks.filter((x) => x[1] === 'child' && blood(x[2])).map((x) => x[0]);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const A = s.persons[kids[i]], B = s.persons[kids[j]];
      const half = !!A && !!B && halfByParents27(A.name, B.name, s.persons[pid].name);
      add(e, kids[i], kids[j], 'sibling', half ? { sub: 'half' } : undefined);
    }
  }
  // r25: derivados (sem sobrescrever o que já existe): pai do pai = avô; irmão do pai = tio; filhos de irmãos = primos
  // r27 (F): só por laços de sangue/genéricos (padrasto, sogro e pais de criação não geram avós, tios nem primos)
  for (const pid of Object.keys(e)) {
    const pars = e[pid].filter((x) => x[1] === 'parent' && blood(x[2])).map((x) => x[0]);
    for (const q of pars) for (const [o, r, xo] of e[q] ?? []) {
      if (r === 'parent' && blood(xo)) add(e, pid, o, 'grandparent');
      else if (r === 'sibling' && (!xo?.sub || xo.sub === 'half')) { add(e, pid, o, 'uncle'); for (const [c, rc, xc] of e[o] ?? []) if (rc === 'child' && blood(xc)) add(e, pid, c, 'cousin'); }
    }
  }
  cache.set(s, { n: n + st.g.length * 100000, e });
  return e;
}

export interface Kin15Item { id: string; rel: Rel15; p: Person; sub?: KinSub27; from?: number; to?: number; src?: Prov27 }
/** Parentes visíveis hoje (quem ainda não nasceu não aparece). */
export function kinOf15(s: GameState, pid: string): Kin15Item[] {
  return (graph(s)[pid] ?? []).map(([id, rel, x]) => ({ id, rel, p: s.persons[id], ...x })).filter((x) => x.p && x.p.born <= s.year);
}

/** r27 (F): rótulo do laço com subtipo e período (ex-cônjuge 1959–1964, meio-irmão, padrasto, sogro…). */
const SUB15: Partial<Record<Rel15, Partial<Record<KinSub27, L>>>> = {
  parent: { biological: l('Pai/mãe biológico(a)', 'Biological parent'), adoptive: l('Pai/mãe de criação', 'Adoptive parent'), step: l('Padrasto/madrasta', 'Stepparent'), in_law: l('Sogro(a)', 'Parent-in-law') },
  child: { adoptive: l('Filho(a) de criação', 'Adopted child'), step: l('Enteado(a)', 'Stepchild'), in_law: l('Genro/nora', 'Child-in-law') },
  sibling: { half: l('Meio-irmão(ã)', 'Half-sibling'), step: l('Irmão(ã) postiço(a)', 'Stepsibling'), in_law: l('Cunhado(a)', 'Sibling-in-law') },
};
export function kinLabel15(k: { rel: Rel15; sub?: KinSub27; from?: number; to?: number }): L {
  const base = (k.sub && SUB15[k.rel]?.[k.sub]) || (k.rel === 'ex' ? l('Ex-cônjuge', 'Ex-spouse') : REL15[k.rel]);
  if ((k.rel === 'spouse' || k.rel === 'ex') && (k.from !== undefined || k.to !== undefined)) {
    const per = `${k.from ?? '?'}–${k.to ?? ''}`;
    return l(`${base.pt} (${per})`, `${base.en} (${per})`);
  }
  return base;
}
export const actOf15 = (s: GameState, pid: string): Act | undefined => actsNow27(s).find((a) => a.members.includes(pid));
export const feudOf15 = (s: GameState, a: string, b: string): number | undefined => kin15(s).feud[pairKey(a, b)];
const fameOf = (s: GameState, pid: string) => actsNow27(s).reduce((m, a) => (a.members.includes(pid) ? Math.max(m, a.fame) : m), 0);

// ---- mensal -------------------------------------------------------------------------------------------------
function grief(s: GameState, p: Person): void {
  for (const k of kinOf15(s, p.id)) {
    const q = k.p;
    if (!q.alive || k.rel === 'ex') continue;
    const close = CLOSE.has(k.rel) && k.sub !== 'in_law' && k.sub !== 'step'; // r27 (F)
    q.morale = clamp(q.morale - (close ? 10 : 4), 0, 100);
    q.stress = clamp(q.stress + (close ? 10 : 3), 0, 100);
    relAdd(s, q.id, p.id, 5);
    // luto também une: irmãos em rixa fazem as pazes
    for (const o of kinOf15(s, q.id)) if (o.rel === 'sibling') delete kin15(s).feud[pairKey(q.id, o.id)];
    const a = actOf15(s, q.id);
    if (close && a) {
      a.momentum = clamp(a.momentum - 4, 0, 100);
      if (a.owner === 'player') notify(s, fmtL(l('{q} está de luto por {p} ({r}): moral e foco caem por um tempo.', '{q} is mourning {p} ({r}): morale and focus drop for a while.'), { q: q.name, p: p.name, r: kinLabel15({ rel: INV[k.rel], sub: k.sub }) }), 'event');
    }
    // herança de fama: o legado do pai/mãe empurra o ato do filho
    if (k.rel === 'parent' && a && !a.catalogNo) { a.momentum = clamp(a.momentum + 12, 0, 100); a.fame = clamp(a.fame + Math.min(5, fameOf(s, p.id) * 0.06), 0, 100); }
  }
  say(s, fmtL(l('{p} morreu; a família sente a perda.', '{p} died; the family feels the loss.'), { p: p.name }));
}

function feuds(s: GameState, r: Rng): void {
  const st = kin15(s), now = mIdx(s);
  for (const a of actsNow27(s)) {
    if ((a.status !== 'active' && a.status !== 'emerging') || a.members.length < 2) continue;
    const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const A = ms[i], B = ms[j];
      if (!kinOf15(s, A.id).some((k) => k.id === B.id && k.rel === 'sibling')) continue;
      const key = pairKey(A.id, B.id), since = st.feud[key];
      const tense = (A.resentment + B.resentment) / 2 > 45 || (rel0(s, A.id, B.id)) < -20 || (rel0(s, B.id, A.id)) < -20 || (A.stress + B.stress) / 2 > 70;
      const roll = r.next(), roll2 = r.next();
      if (since === undefined) {
        if (roll < 0.003 + (tense ? 0.02 : 0) + (a.fame > 60 ? 0.004 : 0)) {
          st.feud[key] = now;
          relAdd(s, A.id, B.id, -30); relAdd(s, B.id, A.id, -30);
          A.morale = clamp(A.morale - 6, 0, 100); B.morale = clamp(B.morale - 6, 0, 100);
          const t = fmtL(l('Briga entre os irmãos {a} e {b} em {x}: a imprensa já fala nisso.', 'Siblings {a} and {b} of {x} are feuding: the press has noticed.'), { a: A.name, b: B.name, x: a.name });
          remember(s, 'feud', t, { actId: a.id, important: a.fame > 40 }); say(s, t);
          if (a.owner === 'player') notify(s, t, 'event');
        }
      } else if (roll < 0.035) { // pazes
        delete st.feud[key]; relAdd(s, A.id, B.id, 25); relAdd(s, B.id, A.id, 25);
        const t = fmtL(l('{a} e {b} fizeram as pazes.', '{a} and {b} made up.'), { a: A.name, b: B.name }); say(s, t);
        if (a.owner === 'player') notify(s, t, 'info');
      } else if (now - since >= 8 && !realSafe(s, a) && !a.catalogNo && roll2 < 0.06) {
        // a rixa racha a banda: um sai (ou o duo entra em hiato)
        delete st.feud[key];
        if (a.members.length > 2) {
          const out = A.stress + A.resentment > B.stress + B.resentment ? A : B;
          exitMember20(s, a, out.id);
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
  for (const a of actsNow27(s)) {
    if (a.catalogNo || a.members.length < 2 || st.chk.includes(a.id)) continue;
    st.chk.push(a.id);
    const roll = r.next();
    // R29 (CONNECT): pessoa real (real27) não ganha irmãos nem sobrenome inventados — "Marc Bolan" virava "Marc Watts"
    // numa banda gerada e o índice de identidade (realworld) passava a apontar para outro nome. Depois do sorteio: mesma sequência.
    if (s.config.realNames && a.members.some((id) => s.persons[id]?.real27)) continue;
    // W3-FIX: quem já tem outra formação (carreira solo, banda anterior — supergrupo novo) já tem nome e história públicos:
    // não vira "irmão" nem ganha sobrenome inventado ("Irene Lowell", ato solo de catálogo, virava "Irene Winslow")
    const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && !(graph(s)[p.id]?.length) && !actsOfPerson17(s, p.id).some((b) => b !== a));
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
  if (s.month % 3 === 0) for (const a of actsNow27(s)) {
    const roll = r.next();
    if (a.catalogNo || a.fame < 30 || (a.status !== 'active' && a.status !== 'emerging')) continue;
    const p = a.members.map((id) => s.persons[id]).find((q) => q && q.alive);
    if (!p) continue;
    const age = s.year - p.born;
    if (age < 28 || age > 55 || st.kids.some((k) => k.parent === p.id) || roll > 0.012 + a.fame / 8000) continue;
    // R29 (família): com o sys/family29 na partida, é ele quem faz nascer (sem filho em dobro) — pelo estado, não pela ordem dos imports
    if (KIN15X.births === false || (s.x4 as unknown as { family29?: unknown }).family29) continue;
    const sur = p.name.split(' ').slice(1).join(' ') || p.name;
    const first = personName(r, langForCity(a.city, r)).split(' ')[0];
    st.kids.push({ parent: p.id, name: `${first} ${sur}`, born: s.year, debut: s.year + r.int(17, 24) });
  }
  for (const k of st.kids) {
    if (k.done || s.year < k.debut || r.next() > 0.2) continue;
    const par = s.persons[k.parent], pa = par && actOf15(s, par.id);
    k.done = true;
    if (!par || !pa) continue;
    debutKid15(s, r, { par, pa, name: k.name, born: k.born }); // R29 (família): o mesmo caminho do family29
  }
  st.kids = st.kids.filter((k) => !k.done || s.year - k.debut < 3);
}

/** R29 (família): ganchos que o sys/family29 preenche — `births: false` desliga os nascimentos daqui (a família de todo
 *  artista NPC nasce lá, sem filho em dobro) e `debut` é avisado de cada estreia (liga o registro leve do filho à pessoa). */
export const KIN15X: { births?: boolean; debut?: (s: GameState, kid: Person, act: Act, o: Debut15) => void } = {};
export interface Debut15 {
  /** pai/mãe artista (pessoa do mundo) e o ato dele(a): fama e fãs herdados; sem eles valem `city`/`genre`/`boost` */
  par?: Person; pa?: Act; name: string; born: number; city?: string; genre?: string;
  /** fama inicial extra (filho de gente da indústria: o sobrenome do empresário, do produtor, do CEO) */
  boost?: number;
  /** banda de família: o filho entra no ato do pai/mãe em vez de estrear sozinho */
  band?: Act;
  /** complemento do texto de estreia sem pai artista (ex.: ", filho(a) de X, produtor(a)") */
  note?: L;
  /** formato pedido (1 = solo); sem ele, o sorteio de sempre do spawnProceduralAct */
  members?: number;
}
/** Estreia de filho(a) de músico ou de gente da indústria — um caminho só (kin15 e family29). Devolve a pessoa nova. */
export function debutKid15(s: GameState, r: Rng, o: Debut15): Person | undefined {
  const st = kin15(s), par = o.par, pa = o.pa;
  if (o.band && par && o.band.members.includes(par.id)) {
    const roles: Person['role'][] = ['vocal', 'guitar', 'keys', 'drums', 'bass'];
    const kid = makePerson(s, r, { lang: langForCity(o.band.city, r), role: r.pick(roles), potential: clamp(o.band.potential + r.normal(4, 8), 25, 98), born: o.born, startFrac: 0.45, name: o.name });
    kid.origin = 'family';
    s.persons[kid.id] = kid;
    o.band.members.push(kid.id); actsTouched17(s);
    for (const id of o.band.members) { const q = s.persons[id]; if (q && q.id !== kid.id) { relTouch(s, q.id, kid.id, 25); relTouch(s, kid.id, q.id, 25); } }
    st.g.push([par.id, kid.id, 'child']);
    relPut(s, kid.id, par.id, BASE.parent); relPut(s, par.id, kid.id, BASE.child);
    const t = fmtL(l('{k} entra em {x}, a banda de {p}: agora é banda de família.', '{k} joins {x}, {p}\'s band: it is a family band now.'), { k: kid.name, p: par.name, x: o.band.name });
    say(s, t);
    remember(s, 'dynasty', t, { actId: o.band.id, pid: kid.id, important: o.band.fame >= 40 || o.band.owner === 'player' });
    KIN15X.debut?.(s, kid, o.band, o);
    return kid;
  }
  const pick = r.chance(0.7);
  const act = spawnProceduralAct(s, r, { city: pa?.city ?? o.city, genre: pick ? (pa?.genre ?? o.genre) : undefined, formedYear: s.year, ...(o.members ? { members: o.members } : {}) });
  const kid = s.persons[act.members[0]];
  if (!kid) return undefined;
  const old = kid.name;
  kid.name = o.name; kid.born = o.born; kid.origin = 'family';
  if (act.members.length === 1 && act.name === old) act.name = o.name; // solo com o nome do filho (antes ficava o sorteado)
  if (par) st.g.push([par.id, kid.id, 'child']);
  act.fame = clamp(act.fame + (pa ? Math.min(14, 3 + pa.fame * 0.12) : 0) + (o.boost ?? 0), 0, 100);
  if (pa) { const tot = pa.fans.casual + pa.fans.active + pa.fans.core; act.fans.casual += Math.round(tot * 0.02); act.fans.active += Math.round(tot * 0.004); }
  st.inh.push(kid.id);
  if (par) { relPut(s, kid.id, par.id, BASE.parent); relPut(s, par.id, kid.id, BASE.child); }
  const t = par && pa
    ? fmtL(l('{k}, filho(a) de {p} ({a}), estreia como {x}. O sobrenome abre portas, mas a comparação pesa.', '{k}, child of {p} ({a}), debuts as {x}. The surname opens doors, but the comparison weighs.'), { k: kid.name, p: par.name, a: pa.name, x: act.name })
    : fmtL(l('{k} estreia como {x}{n}.', '{k} debuts as {x}{n}.'), { k: kid.name, x: act.name, n: o.note ?? '' });
  say(s, t);
  if ((pa && (pa.fame >= 40 || pa.owner === 'player')) || (o.boost ?? 0) >= 6) { remember(s, 'dynasty', t, { actId: act.id, important: true }); notify(s, t, 'event'); }
  KIN15X.debut?.(s, kid, act, o);
  return kid;
}

/** Herança de fama para filhos reais (uma vez, quando o ato do filho existe). */
function inherit(s: GameState): void {
  const st = kin15(s);
  for (const a of actsNow27(s)) {
    if (!a.catalogNo || a.fame > 45) continue;
    for (const id of a.members) {
      if (st.inh.includes(id)) continue;
      const par = kinOf15(s, id).filter((k) => k.rel === 'parent' && k.sub !== 'in_law' && k.sub !== 'step').map((k) => fameOf(s, k.id)).sort((x, y) => y - x)[0];
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
  for (const mine of actsNow27(s)) {
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
      const t = fmtL(l('{w} recomenda {k} ({r}), do ato {a}: porta aberta para conversar, sem intermediários.', '{w} recommends {k} ({r}), of the act {a}: an open door to talk, no middlemen.'), { w: s.persons[id].name, k: k.p.name, r: l(kinLabel15(k).pt.toLowerCase(), kinLabel15(k).en.toLowerCase()), a: a.name });
      notify(s, t, 'info'); say(s, t);
    }
  }
}

function seedRel(s: GameState): void {
  for (const [pid, ks] of Object.entries(graph(s))) { const p = s.persons[pid]; if (p) for (const [o, rel] of ks) relTouch(s, pid, o, BASE[rel]); }
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

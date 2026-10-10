// Rodada 16 — uma identidade e uma vida para cada personagem.
// 1) Identidade: com nomes reais, a mesma pessoa em papéis diferentes (artista no banco, produtor 'pd:', empresário 'e:',
//    líder de selo 'l:') vira UMA pessoa — a chave canônica é a do artista quando existe ('p:'), senão a primeira do
//    grupo. roles16 lista os cargos que ela ocupa (artista, produtor, empresário, CEO, equipe, crítico, dono do selo).
// 2) Empresários gerados: cada mercado tem empresários independentes (gerados pela semente, com anos de atividade)
//    que assumem atos procedurais com fama — os atos reais seguem os empresários históricos (managers14).
// 3) Vida: empresários, produtores, líderes de selos, equipe e críticos namoram, casam, se separam, têm filhos,
//    se viciam, vão para a reabilitação, adoecem e morrem (reais não morrem por sorteio antes de 2026, como artistas).
//    Tudo tem efeito no cargo: produtor internado fica sem agenda; empresário viciado negocia mal e perde clientes,
//    morto libera os clientes; CEO viciado sangra o caixa e pode ser derrubado; equipe afastada rende menos; crítico
//    afastado ou morto para de resenhar. Rodízio com teto (CAP16 por mês), como leisure14.
// 4) Sucessão nos selos rivais: quando um líder sai (morte, aposentadoria, demissão, aliciamento, vício), o sucessor
//    pode ser herdeiro (filho do líder, da família criada aqui), executivo da casa (mantém a estratégia) ou alguém de
//    fora (estilo novo) — registrado no histórico do selo.
// Aleatoriedade própria (Rng por semente+mês / selo+semana): não mexe no fluxo compartilhado.

import { Rng, clamp, hashString } from '../../core/rng';
import { MGR_STYLE, REAL_MGRS, mgrById, type MgrStyle, type RealMgr } from '../../data/managers14';
import { REAL_PRODS, prodById } from '../../data/producers15';
import { CITIES, cityById, familyOf, l, type FamilyId, type L } from '../../data/world';
import { ensureFamily } from '../dynasty';
import { registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { activeCritics, criticByName } from '../media';
import { langForCity, personName } from '../people';
import { PRODUCERS, prodHooks } from '../studio';
import type { Act, GameState, Person } from '../types';
import { fmtL, nextId, notify, remember, staffAdjusters } from '../util';
import { actorId, emitFact } from '../facts17';
import { GONE16 } from './gone16';
import { SUCC10, depart, leaders, newLeader, succeed, type Leader, type LeaderStyle } from './leaders10';
import { lz14 } from './leisure14';
import { inFeud, m14, mgrActive, mgrCap, mgrKey, mgrName, repOf, rosterOf } from './managers14';
import { per13, type P13 } from './persona13';
import { p15, prodActive, prodDefId, prodName } from './producers15';
import { canonKey, realDataOf } from './realworld';
import { playbookOf } from './rivals8';
import { activeAct } from './ventures12';
import { ventures } from './ventures9';

// ---------------------------------------------------------------- estado

export type St16 = 'ok' | 'addiction' | 'rehab' | 'ill' | 'dead' | 'retired';
export interface Life16 {
  st: St16;
  /** semana em que termina o afastamento (reabilitação, doença) */
  until?: number;
  /** dependência 0..100 */
  dep: number;
  /** ano do casamento, ano da morte, meses no estado atual */
  mar?: number; died?: number; mo: number;
  log: [number, number, L, number][];
  lm?: number;
}
export type How16 = 'heir' | 'internal' | 'outside' | 'veteran';
export interface Succ16 { y: number; out?: string; outId?: string; in: string; inId: string; how: How16 | string; why: L; pb: string }
export interface People16 {
  L: Record<string, Life16>;
  cur: number;
  /** selo → sucessões */
  succ: Record<string, Succ16[]>;
  /** empresário → ato → [de, até] (clientes ao longo do jogo) */
  mh: Record<string, Record<string, [number, number?]>>;
  /** herdeiro (líder) → líder pai/mãe */
  par: Record<string, string>;
  news: [number, number, L][];
}
declare module '../ext4' { interface Ext4 { people16: People16 } }
const fresh = (): People16 => ({ L: {}, cur: 0, succ: {}, mh: {}, par: {}, news: [] });
registerExt4('people16', fresh);
export function p16(s: GameState): People16 {
  const x = s.x4 as unknown as { people16?: People16 };
  const st = (x.people16 ??= fresh());
  st.L ??= {}; st.succ ??= {}; st.mh ??= {}; st.par ??= {}; st.news ??= [];
  genMgrs16(s);
  return st;
}
export const CAP16 = 30;
const mIdx = (s: GameState) => s.year * 12 + s.month;

export const ST16: Record<St16, L> = {
  ok: l('na ativa', 'active'), addiction: l('dependência', 'addiction'), rehab: l('em reabilitação', 'in rehab'), ill: l('doente, afastado(a)', 'ill, on leave'),
  dead: l('falecido(a)', 'deceased'), retired: l('aposentado(a)', 'retired'),
};

// ---------------------------------------------------------------- empresários gerados (atos procedurais)

const GEN = new Map<string, RealMgr[]>();
const GSTYLE: MgrStyle[] = ['shark', 'muscle', 'svengali', 'guardian', 'impresario', 'guardian', 'impresario'];
/** Empresários independentes de cada mercado, determinísticos pela semente (entram em mgrById). */
export function genMgrs16(s: GameState): RealMgr[] {
  const seed = s.config.seed;
  let g = GEN.get(seed);
  if (g) return g;
  const r = Rng.fromSeed(`${seed}|g16mgr`);
  const tag = hashString(seed).toString(36);
  g = [];
  let i = 0;
  for (const mk of [...new Set(CITIES.map((c) => c.market))]) {
    const cs = CITIES.filter((c) => c.market === mk);
    const fams = [...new Set(cs.flatMap((c) => c.scenes).map((x) => familyOf(x)))];
    for (let era = 1930; era <= 2020; era += 15) for (let j = 0; j < 2; j++) {
      const c = cs[r.int(0, Math.min(cs.length - 1, 5))];
      const from = era + r.int(0, 12);
      const own = [...new Set(c.scenes.map((x) => familyOf(x)))];
      const fam: FamilyId[] = [...new Set([...own, ...fams.filter(() => r.chance(0.35))])];
      const m: RealMgr = {
        id: `g16${tag}_${i++}`, name: personName(r, langForCity(c.id, r)), born: from - r.int(24, 38), city: c.id, from, to: from + r.int(16, 32),
        style: r.pick(GSTYLE), fam, a: [r.int(30, 75), r.int(35, 82), r.int(35, 82), r.int(30, 78), r.int(25, 72)], sex: r.chance(0.15 + (from - 1930) / 250) ? 'f' : 'm',
        rate: Math.round((0.1 + r.int(0, 10) / 100) * 100) / 100, cl: [],
        bio: l('Empresário(a) independente da praça: cuida de artistas sem padrinho histórico e cresce junto com eles.', 'Independent local manager: looks after acts with no historic patron and grows with them.'),
      };
      mgrById[m.id] = m;
      g.push(m);
    }
  }
  GEN.set(seed, g);
  return g;
}
export const isGen16 = (id: string): boolean => id.startsWith('g16');

/** Atos procedurais com fama ganham empresário da praça (gênero compatível quando possível). */
function assignMgrs(s: GameState, r: Rng): void {
  const st = m14(s);
  const gen = genMgrs16(s).filter((m) => mgrActive(s, m));
  if (!gen.length) return;
  const load = new Map<string, number>();
  for (const rp of Object.values(st.rep)) load.set(rp.m, (load.get(rp.m) ?? 0) + 1);
  const mine = new Set(ventures(s).mg.clients.map((c) => c.actId));
  let n = 0;
  for (const a of Object.values(s.acts)) {
    if (n >= 3) break;
    if (a.fame < 18 || st.rep[a.id] || a.playerBand || mine.has(a.id) || a.debutYear > s.year || !activeAct(a) || realDataOf(a)) continue;
    if (!r.chance(0.035 + (a.owner === 'player' ? 0 : a.fame / 4000))) continue;
    const mk = cityById[a.city]?.market;
    const fam = familyOf(a.genre);
    const c = gen.filter((m) => cityById[m.city]?.market === mk && (load.get(m.id) ?? 0) < mgrCap(m));
    const best = c.filter((m) => m.fam.includes(fam));
    const pool = best.length ? best : c;
    if (!pool.length) continue;
    const m = pool[r.int(0, pool.length - 1)];
    st.rep[a.id] = { m: m.id, y: s.year };
    load.set(m.id, (load.get(m.id) ?? 0) + 1);
    n++;
    if (a.owner === 'player') notify(s, fmtL(l('{a} contratou {n}, empresário(a) da praça: renovações vão exigir {d}.', '{a} hired {n}, a local manager: renewals will demand {d}.'), { a: a.name, n: mgrName(s, m), d: MGR_STYLE[m.style][1] }), 'event');
  }
}

/** Histórico de clientes de cada empresário (começo e fim no jogo). */
function trackClients(s: GameState): void {
  const st = p16(s);
  const rep = m14(s).rep;
  for (const [aid, rp] of Object.entries(rep)) {
    const h = (st.mh[rp.m] ??= {});
    const cur = h[aid];
    // cliente histórico: começa no ano real (dados), nunca depois do ano em que o ato apareceu
    const real = rp.h ? mgrById[rp.m]?.cl.find(([n]) => n === realDataOf(s.acts[aid])?.n)?.[1] : undefined;
    if (!cur || cur[1] !== undefined) h[aid] = [real ?? rp.y, undefined];
  }
  for (const [mid, h] of Object.entries(st.mh)) for (const [aid, v] of Object.entries(h)) if (v[1] === undefined && rep[aid]?.m !== mid) v[1] = s.year;
}

/** Clientes atuais e passados de um empresário no jogo: [ato, de, até?]. */
export function clientsOf16(s: GameState, id: string): { act: Act; from: number; to?: number }[] {
  const h = p16(s).mh[id] ?? {};
  const cur = new Set(rosterOf(s, id).map((a) => a.id));
  const out: { act: Act; from: number; to?: number }[] = [];
  for (const a of rosterOf(s, id)) out.push({ act: a, from: h[a.id]?.[0] ?? m14(s).rep[a.id]?.y ?? s.year });
  for (const [aid, v] of Object.entries(h)) if (!cur.has(aid) && s.acts[aid]) out.push({ act: s.acts[aid], from: v[0], to: v[1] ?? s.year });
  return out;
}
/** Empresários que já cuidaram do ato (no jogo). */
export function mgrsOfAct16(s: GameState, actId: string): { id: string; from: number; to?: number }[] {
  const out: { id: string; from: number; to?: number }[] = [];
  for (const [mid, h] of Object.entries(p16(s).mh)) if (h[actId]) out.push({ id: mid, from: h[actId][0], to: h[actId][1] });
  return out.sort((a, b) => a.from - b.from);
}

// ---------------------------------------------------------------- identidade

const ALIAS16: Record<string, string> = { pharrell: 'pharrell williams', 'lee perry': 'lee scratch perry', 'kenneth edmonds': 'babyface', 'beyonce knowles': 'beyonce', 'andre young': 'dr dre', 'ye': 'kanye west' };
const nk = (n: string): string => { const k = canonKey(n); return ALIAS16[k] ?? k; };
interface Ix16 { sig: string; wk: number; rn: boolean; k2g: Map<string, string[]>; byName: Map<string, string> }
const IX = new WeakMap<GameState, Ix16>();
const PRIO = ['p:', 'pd:', 'e:', 'l:'];
const prio = (k: string) => { const i = PRIO.findIndex((x) => k.startsWith(x)); return i < 0 ? 9 : i; };

function ix16(s: GameState): Ix16 {
  const L0 = leaders(s);
  const hit = IX.get(s);
  // barato: na mesma semana (e mesmo modo de nomes) o índice vale; só então confere a assinatura completa
  if (hit && hit.wk === s.week && hit.rn === !!s.config.realNames) return hit;
  const sig = `${s.year}|${s.month}|${Object.keys(s.persons).length}|${L0?.seq ?? 0}|${s.config.realNames ? 1 : 0}`;
  if (hit && hit.sig === sig) { hit.wk = s.week; return hit; }
  const k2g = new Map<string, string[]>();
  const byName = new Map<string, string>();
  const out: Ix16 = { sig, wk: s.week, rn: !!s.config.realNames, k2g, byName };
  IX.set(s, out);
  // pessoas do banco (a mais relevante por nome: viva, solo com o próprio nome, mais famosa)
  const actOf = new Map<string, Act>();
  for (const a of Object.values(s.acts)) for (const id of a.members) { const o = actOf.get(id); if (!o || a.fame > o.fame) actOf.set(id, a); }
  const score = (p: Person) => (p.alive ? 1000 : 0) + (actOf.get(p.id)?.name === p.name ? 500 : 0) + (actOf.get(p.id)?.fame ?? 0);
  const best = new Map<string, Person>();
  for (const p of Object.values(s.persons)) {
    if (p.isPlayer) continue;
    const k = nk(p.name);
    const o = best.get(k);
    if (!o || score(p) > score(o)) best.set(k, p);
  }
  for (const [k, p] of best) byName.set(k, `p:${p.id}`);
  if (!s.config.realNames) return out;
  const groups = new Map<string, string[]>();
  const push = (name: string, key: string) => { const k = nk(name); (groups.get(k) ?? groups.set(k, []).get(k)!).push(key); };
  for (const p of REAL_PRODS) if (s.year >= p.from) push(p.name, `pd:${p.id}`);
  for (const m of REAL_MGRS) if (s.year >= m.from) push(m.name, `e:${m.id}`);
  for (const x of Object.values(L0?.L ?? {})) if (x.real) push(x.name, `l:${x.id}`);
  for (const [k, ks] of groups) {
    const p = byName.get(k);
    const all = [...new Set([...(p ? [p] : []), ...ks])].sort((a, b) => prio(a) - prio(b));
    if (all.length < 2) continue;
    for (const x of all) k2g.set(x, all);
  }
  return out;
}

/** Todas as chaves (papéis) da mesma pessoa; a primeira é a canônica. */
export function keys16(s: GameState, key: string): string[] {
  if (key === 'player') return ['player'];
  return ix16(s).k2g.get(key) ?? [key];
}
export const canon16 = (s: GameState, key: string): string => keys16(s, key)[0];
/** Pessoa do banco com esse nome (para parentes reais de quem não é artista). */
export const personByName16 = (s: GameState, name: string): Person | undefined => { const k = ix16(s).byName.get(nk(name)); return k ? s.persons[k.slice(2)] : undefined; };

export type Role16 = 'artist' | 'owner' | 'producer' | 'manager' | 'ceo' | 'staff' | 'critic' | 'media' | 'npc';
export const ROLE16: Record<Role16, L> = {
  artist: l('Artista', 'Artist'), owner: l('Dono(a) do selo', 'Label owner'), producer: l('Produtor(a)', 'Producer'), manager: l('Empresário(a)', 'Manager'),
  ceo: l('Líder de gravadora', 'Label head'), staff: l('Equipe', 'Staff'), critic: l('Crítico(a)', 'Critic'), media: l('Mídia', 'Media'), npc: l('Indústria', 'Industry'),
};
/** Cargos que a pessoa ocupa (ou ocupou), cada um com a chave do papel. */
export function roles16(s: GameState, key: string): { role: Role16; key: string }[] {
  const out: { role: Role16; key: string }[] = [];
  for (const k of keys16(s, key)) {
    const [c, ...rest] = k.split(':');
    const id = rest.join(':');
    if (k === 'player' || (c === 'p' && s.persons[id]?.isPlayer)) {
      out.push({ role: 'owner', key: k });
      if (c === 'p' && Object.values(s.acts).some((a) => a.members.includes(id))) out.push({ role: 'artist', key: k });
    } else if (c === 'p') out.push({ role: 'artist', key: k });
    else if (c === 'pd') out.push({ role: 'producer', key: k });
    else if (c === 'e') out.push({ role: 'manager', key: k });
    else if (c === 'l') out.push({ role: 'ceo', key: k });
    else if (c === 's') out.push({ role: 'staff', key: k });
    else if (c === 'c') out.push({ role: 'critic', key: k });
    else if (c === 'm') out.push({ role: 'media', key: k });
    else out.push({ role: 'npc', key: k });
  }
  return out;
}

// ---------------------------------------------------------------- parentes reais de quem não é artista

/** [chave, relação de quem está à direita, nome da pessoa ou chave] */
const REAL_KIN16: [string, 'spouse' | 'child' | 'sibling' | 'parent', string][] = [
  ['e:sharon', 'spouse', 'Ozzy Osbourne'], ['e:sharon', 'parent', 'e:arden'], ['e:arden', 'child', 'e:sharon'],
  ['e:knowles', 'child', 'Beyoncé'], ['e:knowles', 'child', 'Solange Knowles'], ['e:simmons', 'sibling', 'Joseph Simmons'],
  ['pd:finneas', 'sibling', 'Billie Eilish'], ['pd:west', 'spouse', 'Kim Kardashian'],
];
export const KIN16_REL: Record<string, L> = { spouse: l('Cônjuge', 'Spouse'), child: l('Filho(a)', 'Child'), sibling: l('Irmão(ã)', 'Sibling'), parent: l('Pai/mãe', 'Parent') };
/** Parentes reais conhecidos (só com nomes reais; só quem já existe no mundo). */
export function realKin16(s: GameState, key: string): { rel: string; key?: string; name: string }[] {
  if (!s.config.realNames) return [];
  const ks = keys16(s, key);
  const out: { rel: string; key?: string; name: string }[] = [];
  for (const [k, rel, who] of REAL_KIN16) {
    if (!ks.includes(k)) continue;
    if (who.includes(':')) { const P = per13(s, who); const m = mgrById[who.slice(2)]; if (P && (!m || s.year >= m.from - 15)) out.push({ rel, key: canon16(s, who), name: P.name }); continue; }
    const p = personByName16(s, who);
    if (p) out.push({ rel, key: `p:${p.id}`, name: p.name });
  }
  // o outro lado do laço (ex.: a página de Ozzy mostra Sharon, empresária)
  const INV: Record<string, string> = { spouse: 'spouse', child: 'parent', parent: 'child', sibling: 'sibling' };
  for (const [k, rel, who] of REAL_KIN16) {
    if (who.includes(':') || ks.includes(k)) continue;
    const p = personByName16(s, who);
    if (!p || !ks.includes(`p:${p.id}`)) continue;
    const m = mgrById[k.slice(2)], pr = prodById[k.split(':')[1]];
    if ((m && s.year < m.from - 15) || (pr && s.year < pr.from - 15)) continue;
    const P = per13(s, k);
    if (P) out.push({ rel: INV[rel], key: canon16(s, k), name: P.name });
  }
  return out;
}

// ---------------------------------------------------------------- vida

const SAFE_PREFIX = ['e:', 'pd:', 'l:'];
/** Pessoa real (dados históricos): não morre por sorteio antes de 2026 (mesma regra dos artistas reais). */
function isReal(s: GameState, key: string): boolean {
  if (key.startsWith('e:')) return !isGen16(key.slice(2));
  if (key.startsWith('pd:')) return true;
  if (key.startsWith('l:')) return !!leaders(s).L[key.slice(2)]?.real;
  return false;
}
const realSafe16 = (s: GameState, key: string) => SAFE_PREFIX.some((x) => key.startsWith(x)) && isReal(s, key) && s.year < 2026 && s.config.history !== 'free';

export function born16(s: GameState, key: string, P?: P13 | null): number {
  const b = (P ?? per13(s, key))?.born;
  if (b) return b;
  const h = hashString(`${s.config.seed}|b16|${key}`) / 4294967296;
  if (key.startsWith('c:')) { const c = criticByName(key.slice(2)); if (c) return c.from - 24 - Math.floor(h * 14); }
  return s.config.startYear - 22 - Math.floor(h * 26);
}

export function life16(s: GameState, key: string): Life16 | undefined { return p16(s).L[key]; }
const rec = (s: GameState, key: string): Life16 => (p16(s).L[key] ??= { st: 'ok', dep: 0, mo: 0, log: [] });

/** Estado de saúde de qualquer chave (artistas usam a saúde da Pessoa). */
export function status16(s: GameState, key: string): St16 {
  const c = canon16(s, key);
  if (c.startsWith('p:')) { const p = s.persons[c.slice(2)]; if (!p) return 'ok'; return !p.alive ? 'dead' : p.health === 'addiction' ? 'addiction' : p.health === 'ill' || p.health === 'burnout' ? 'ill' : 'ok'; }
  return p16(s).L[key]?.st ?? 'ok';
}

GONE16.f = (s, key) => {
  const x = (s.x4 as unknown as { people16?: People16 }).people16?.L[key];
  if (x) { if (x.st === 'dead' || x.st === 'retired') return true; if (key.startsWith('c:') && (x.st === 'rehab' || x.st === 'ill')) return true; }
  // papel de quem também é artista: morreu como pessoa, sai do cargo
  if (key.startsWith('pd:') || key.startsWith('e:')) { const c = ix16(s).k2g.get(key)?.[0]; if (c?.startsWith('p:') && s.persons[c.slice(2)]?.alive === false) return true; }
  return false;
};
// produtor morto não aparece no estúdio
{
  const prev = prodHooks.ok;
  prodHooks.ok = (s, d) => (!prev || prev(s, d)) && !(d.real && GONE16.f(s, `pd:${d.real}`));
}
staffAdjusters().push((s, st) => { const x = (s.x4 as unknown as { people16?: People16 }).people16?.L[`s:${st.id}`]; return !x ? 0 : x.st === 'addiction' ? -5 : x.st === 'rehab' || x.st === 'ill' ? -14 : 0; });

function relevant(s: GameState, key: string): { mine: boolean; big: boolean } {
  const [c, ...rest] = key.split(':');
  const id = rest.join(':');
  if (c === 's') return { mine: true, big: false };
  if (c === 'e') return { mine: rosterOf(s, id).some((a) => a.owner === 'player'), big: rosterOf(s, id).some((a) => a.fame >= 70) };
  if (c === 'pd') { const cr = p15(s).credits[id] ?? []; const p = prodById[id]; return { mine: cr.some((x) => x.you), big: (p?.tier ?? 0) >= 4 }; }
  if (c === 'l') { const L0 = leaders(s).L[id]; const lb = L0?.label ? s.labels[L0.label] : undefined; return { mine: (s.rivalries[lb?.id ?? ''] ?? 0) >= 10, big: lb?.family === 'A' || (lb?.roster.length ?? 0) >= 8 }; }
  if (c === 'c') return { mine: false, big: (criticByName(id)?.prestige ?? 0) >= 80 };
  return { mine: false, big: false };
}

export function say16(s: GameState, key: string, text: L, tone: number, loud = true): void {
  const x = rec(s, key);
  x.log.unshift([s.year, s.month, text, tone]);
  if (x.log.length > 14) x.log.length = 14;
  const st = p16(s);
  st.news.unshift([s.year, s.month, text]);
  if (st.news.length > 40) st.news.length = 40;
  if (!loud) return;
  const rv = relevant(s, key);
  if (rv.mine || rv.big) remember(s, 'people16', text, { important: rv.big && tone < 0 });
  if (rv.mine) notify(s, text, tone < 0 ? 'bad' : 'event');
}

/** Pressão do cargo (0..1): agenda disputada, anos ruins, rixas. */
function pressure(s: GameState, key: string): number {
  const [c, ...rest] = key.split(':');
  const id = rest.join(':');
  if (c === 'pd') return (p15(s).book[id]?.[1] ?? 0) > s.week ? 0.5 : 0.15;
  if (c === 'l') { const L0 = leaders(s).L[id]; const lb = L0?.label ? s.labels[L0.label] : undefined; return clamp((L0?.bad ?? 0) * 0.35 + (lb && lb.cash < 0 ? 0.4 : 0), 0, 1); }
  if (c === 'e') return (inFeud(s, id) ? 0.3 : 0) + rosterOf(s, id).length * 0.06;
  return 0.15;
}

/** Efeitos no cargo de cada mudança de estado. */
function effect(s: GameState, r: Rng, key: string, what: St16 | 'back', why: L): void {
  const [c, ...rest] = key.split(':');
  const id = rest.join(':');
  const x = rec(s, key);
  if (c === 'pd') {
    const def = prodDefId(id);
    if ((what === 'rehab' || what === 'ill') && x.until) s.producerBusy[def] = Math.max(s.producerBusy[def] ?? 0, x.until);
    return;
  }
  if (c === 'e') {
    if (what === 'rehab') for (const a of rosterOf(s, id)) if (!m14(s).rep[a.id]?.h && r.chance(0.5)) {
      delete m14(s).rep[a.id];
      say16(s, key, fmtL(l('{a} deixou {n} durante a reabilitação.', '{a} left {n} during rehab.'), { a: a.name, n: mgrName(s, mgrById[id]) }), -1, a.owner === 'player');
    }
    if (what === 'dead') for (const a of rosterOf(s, id)) {
      delete m14(s).rep[a.id];
      if (a.owner === 'player') notify(s, fmtL(l('{a} está sem empresário depois da morte de {n}: renovações sem exigências de estilo — e outros empresários vão rondar.', '{a} has no manager after {n}\'s death: renewals without style demands — and other managers will circle.'), { a: a.name, n: mgrName(s, mgrById[id]) }), 'event');
    }
    return;
  }
  if (c === 'l') {
    const L0 = leaders(s).L[id];
    const lb = L0?.label ? s.labels[L0.label] : undefined;
    if (!L0 || !lb) return;
    if (what === 'dead') {
      depart(s, lb, L0, 'died');
      remember(s, 'leader10', fmtL(l('Morre {n}, líder de {b} ({w}).', '{n}, head of {b}, dies ({w}).'), { n: L0.name, b: lb.name, w: why }), { important: lb.family === 'A' });
      if (lb.active) succeed(s, r, lb, l('morte do líder', 'death of the leader'));
    } else if (what === 'ill' && s.year - L0.born >= 64 && r.chance(0.45)) {
      depart(s, lb, L0, 'left');
      say16(s, key, fmtL(l('{n} deixa o comando de {b} para cuidar da saúde.', '{n} steps down at {b} to look after their health.'), { n: L0.name, b: lb.name }), -1);
      if (lb.active) succeed(s, r, lb, l('saúde do líder', 'leader\'s health'));
    } else if (what === 'rehab') {
      lb.aggression = clamp(lb.aggression * 0.75, 0, 1);
      say16(s, key, fmtL(l('{b} fica no piloto automático enquanto {n} se trata: menos lances agressivos por um tempo.', '{b} runs on autopilot while {n} gets treatment: fewer aggressive bids for a while.'), { n: L0.name, b: lb.name }), -1, false);
    }
    return;
  }
  if (c === 's' && what === 'dead') {
    const i = s.player.staff.findIndex((x2) => x2.id === id);
    if (i >= 0) { const st = s.player.staff[i]; s.player.staff.splice(i, 1); notify(s, fmtL(l('{n} ({r}) morreu. A vaga na equipe ficou aberta.', '{n} ({r}) died. Their staff post is now open.'), { n: st.name, r: st.role }), 'bad'); }
  }
}

function catchUp(r: Rng, k: number): Pick<Rng, 'chance' | 'int' | 'pick'> {
  if (k <= 1) return r;
  return { chance: (p: number) => r.chance(1 - Math.pow(1 - clamp(p, 0, 1), k)), int: (a, b) => r.int(a, b), pick: (a) => r.pick(a) };
}
const JOBS = [l('professor(a)', 'teacher'), l('médico(a)', 'doctor'), l('fotógrafo(a)', 'photographer'), l('advogado(a)', 'lawyer'), l('atriz/ator', 'actor'), l('modelo', 'model'), l('arquiteto(a)', 'architect'), l('jornalista', 'journalist')];

function lifeMonth(s: GameState, r0: Rng, key: string, P: P13, k: number): void {
  const x = rec(s, key);
  if (x.st === 'dead' || x.st === 'retired') return;
  const r = catchUp(r0, k);
  const born = born16(s, key, P);
  const age = s.year - born;
  const f = P.facets;
  const T = (t: L, o: Record<string, string | number | L> = {}) => fmtL(t, { n: P.name, ...o });
  const safe = realSafe16(s, key);
  x.mo += k;
  // afastado: só espera a volta
  if (x.st === 'rehab' || x.st === 'ill') {
    if (s.week < (x.until ?? 0)) return;
    const was = x.st;
    x.st = 'ok'; x.mo = 0;
    if (was === 'rehab') x.dep = Math.min(x.dep, 22);
    say16(s, key, T(was === 'rehab' ? l('{n} saiu da reabilitação e voltou ao trabalho.', '{n} left rehab and is back at work.') : l('{n} se recuperou e voltou ao trabalho.', '{n} recovered and is back at work.')), 1);
    effect(s, r0, key, 'back', l(''));
    return;
  }
  // dependência: impulsividade, noitadas (lazer), pressão do cargo; fé, esporte e família seguram
  const hb = lz14(s).r[key]?.h ?? [];
  const fam = s.families[key];
  const anchor = (hb.some((h) => h === 'faith' || h === 'sport' || h === 'fitness' || h === 'family') ? 1 : 0) + (fam?.kids.length ? 0.4 : 0);
  // anos 60–80: a cocaína e a heroína circulam nos bastidores
  const era = s.year >= 1965 && s.year <= 1992 ? 0.45 : s.year > 2005 ? 0.15 : 0.25;
  const d = (f.impulsividade - 50) / 40 + (f.sociabilidade - 50) / 90 + era + (hb.includes('party') ? 1.4 : 0) + (hb.includes('bar') ? 0.7 : 0) + pressure(s, key) * 1.6 - anchor - 0.75;
  x.dep = clamp(x.dep + d * Math.min(3, k), 0, 100);
  if (x.st === 'ok' && r.chance(0.0015 * (1 + era) * (f.impulsividade / 50))) {
    x.dep = clamp(x.dep + 25, 0, 100);
    say16(s, key, T(l('{n} anda exagerando nas festas da indústria — já comentam nos bastidores.', '{n} is overdoing the industry parties — people talk backstage.')), -1, false);
  }
  if (x.st === 'ok' && x.dep > 60 && r.chance(0.3)) {
    x.st = 'addiction'; x.mo = 0;
    say16(s, key, T(l('{n} perdeu o controle: dependência química. O trabalho vai sentir.', '{n} lost control: substance addiction. Work will suffer.')), -1);
    effect(s, r0, key, 'addiction', l(''));
  } else if (x.st === 'addiction') {
    if (r.chance(0.1 + f.disciplina / 900 + (fam?.partner && !fam.separated ? 0.04 : 0))) {
      x.st = 'rehab'; x.until = s.week + r.int(10, 24); x.dep = clamp(x.dep - 30, 0, 100); x.mo = 0;
      say16(s, key, T(l('{n} foi internado(a) numa clínica de reabilitação: afastado(a) até a semana {w}.', '{n} checked into rehab: away until week {w}.'), { w: x.until }), 0);
      effect(s, r0, key, 'rehab', l(''));
      return;
    }
    if (!safe && r.chance(0.003 + Math.max(0, x.dep - 75) / 8000)) {
      die(s, r0, key, P, l('overdose', 'overdose'));
      return;
    }
  }
  // doença e morte (pessoas reais não morrem por sorteio antes de 2026)
  if (x.st === 'ok' && age > 52 && r.chance(0.0008 + (age - 52) * 0.00014 + (x.dep > 50 ? 0.0015 : 0))) {
    x.st = 'ill'; x.until = s.week + r.int(6, 20); x.mo = 0;
    say16(s, key, T(l('{n} adoeceu e se afastou do trabalho até a semana {w}.', '{n} fell ill and is off work until week {w}.'), { w: x.until }), -1);
    effect(s, r0, key, 'ill', l(''));
    return;
  }
  if (!safe && !key.startsWith('l:')) { // líderes já envelhecem e morrem em leaders10
    const pd = age < 55 ? 0.0001 : age < 65 ? 0.0004 : age < 75 ? 0.0012 : age < 85 ? 0.0035 : 0.01;
    if (r.chance(pd + (x.st === 'addiction' ? 0.0008 : 0))) { die(s, r0, key, P, age >= 70 ? l('idade avançada', 'old age') : l('causas naturais', 'natural causes')); return; }
  }
  // vida amorosa (mesma lógica dos artistas, mais simples)
  const has = !!fam?.partner && !fam.separated;
  if (!has) {
    if (age >= 21 && age <= 68 && !REAL_KIN16.some(([k2, rel]) => rel === 'spouse' && k2 === key && s.config.realNames) && r.chance(0.008 * (1 + f.romantismo / 100 + f.sociabilidade / 200))) {
      const F0 = ensureFamily(s, key);
      F0.partner = { name: personName(r0, langForCity(P.city ?? s.config.homeCity, r0)), job: r.pick(JOBS), trust: 60, wellbeing: 60, agenda: l('quer mais tempo juntos', 'wants more time together') };
      F0.separated = false;
      say16(s, key, T(l('{n} começou a namorar {q} ({j}).', '{n} started dating {q} ({j}).'), { q: F0.partner.name, j: F0.partner.job }), 1, false);
    }
    return;
  }
  const F0 = ensureFamily(s, key);
  if (!x.mar && r.chance(0.007 + (f.romantismo + f.lealdade) / 25000)) {
    x.mar = s.year;
    say16(s, key, T(l('{n} se casou com {q}.', '{n} married {q}.'), { q: F0.partner?.name ?? '?' }), 1);
    emitFact(s, { kind: 'marriage', actors: [actorId(key)], place: P.city, severity: 30, tags: ['good', 'romance'], text: p16(s).news[0][2], src: 'people16' });
    return;
  }
  if (r.chance(0.003 + (x.st === 'addiction' ? 0.012 : 0) + pressure(s, key) * 0.004 + (f.impulsividade > 65 ? 0.003 : 0))) {
    const was = F0.partner?.name ?? '?';
    F0.separated = true;
    x.mar = undefined;
    x.dep = clamp(x.dep + 8, 0, 100);
    say16(s, key, T(x.st === 'addiction' ? l('{n} e {q} se separaram: o vício acabou com o casamento.', '{n} and {q} split: the addiction ended the marriage.') : l('{n} e {q} se separaram.', '{n} and {q} split up.'), { q: was }), -1);
    emitFact(s, { kind: 'breakup', actors: [actorId(key)], place: P.city, severity: 30, tags: ['bad', 'romance'], text: p16(s).news[0][2], src: 'people16' });
    return;
  }
  if (age >= 23 && age <= 47 && F0.kids.length < 3 && r.chance(x.mar ? 0.007 : 0.002)) {
    const kid = { id: nextId(s, 'k'), name: personName(r0, langForCity(P.city ?? s.config.homeCity, r0)), born: s.year, bond: 70, musical: r.int(10, 90) };
    F0.kids.push(kid);
    x.dep = clamp(x.dep - 6, 0, 100);
    say16(s, key, T(l('Nasceu {k}, filho(a) de {n}.', '{k} is born to {n}.'), { k: kid.name }), 1, false);
    emitFact(s, { kind: 'birth', actors: [actorId(key)], place: P.city, severity: 20, tags: ['good', 'family'], text: p16(s).news[0][2], src: 'people16' });
  }
}

function die(s: GameState, r: Rng, key: string, P: P13, cause: L): void {
  const x = rec(s, key);
  x.st = 'dead'; x.died = s.year; x.mo = 0;
  const F0 = s.families[key];
  const kids = F0?.kids.length ?? 0;
  say16(s, key, fmtL(l('Morre {n}, aos {a} anos ({c}){k}.', '{n} dies aged {a} ({c}){k}.'), { n: P.name, a: s.year - born16(s, key, P), c: cause, k: kids ? fmtL(l('; deixa {q} filho(s)', '; leaves {q} child(ren)'), { q: kids }) : '' }), -1);
  effect(s, r, key, 'dead', cause);
}

/** Quem entra no rodízio: empresários, produtores, líderes ativos, equipe e críticos (artistas vivem pela vida de artista). */
function pool16(s: GameState): { fixed: string[]; rot: string[] } {
  const st = p16(s);
  const fixed = Object.entries(st.L).filter(([, x]) => x.st === 'rehab' || x.st === 'ill').map(([k]) => k);
  const rot: string[] = [];
  for (const m of REAL_MGRS) if (mgrActive(s, m)) rot.push(mgrKey(m.id));
  for (const m of genMgrs16(s)) if (mgrActive(s, m) && rosterOf(s, m.id).length) rot.push(mgrKey(m.id));
  for (const p of REAL_PRODS) if (prodActive(s, p)) rot.push(`pd:${p.id}`);
  for (const L0 of Object.values(leaders(s)?.L ?? {})) if (L0.st === 'active') rot.push(`l:${L0.id}`);
  for (const x of s.player.staff) fixed.push(`s:${x.id}`);
  for (const c of activeCritics(s)) rot.push(`c:${c.name}`);
  const fx = new Set(fixed);
  return { fixed: [...fx].filter((k) => !canon16(s, k).startsWith('p:')), rot: rot.filter((k) => !fx.has(k) && !canon16(s, k).startsWith('p:')) };
}

export function peopleMonth16(s: GameState): void {
  const st = p16(s);
  const r = Rng.fromSeed(`p16:${s.config.seed}:${s.year}:${s.month}`);
  assignMgrs(s, r);
  trackClients(s);
  const { fixed, rot } = pool16(s);
  const take = [...fixed.slice(0, 20)];
  const n = Math.max(0, CAP16 - take.length);
  if (rot.length) {
    st.cur %= rot.length;
    for (let i = 0; i < Math.min(n, rot.length); i++) take.push(rot[(st.cur + i) % rot.length]);
    st.cur = (st.cur + n) % rot.length;
  }
  const mi = mIdx(s);
  for (const key of take) {
    const P = per13(s, key);
    if (!P) continue;
    const x = rec(s, key);
    const k = Math.max(1, Math.min(12, mi - (x.lm ?? mi - 1)));
    x.lm = mi;
    lifeMonth(s, r, key, P, k);
  }
  // efeitos contínuos do vício no cargo
  for (const [key, x] of Object.entries(st.L)) {
    if (x.st !== 'addiction') continue;
    const [c, ...rest] = key.split(':');
    const id = rest.join(':');
    if (c === 'pd' && r.chance(0.3)) { const def = prodDefId(id); s.producerBusy[def] = Math.max(s.producerBusy[def] ?? 0, s.week + 2); }
    if (c === 'e') for (const a of rosterOf(s, id)) if (!m14(s).rep[a.id]?.h && r.chance(0.04)) {
      delete m14(s).rep[a.id];
      say16(s, key, fmtL(l('{a} demitiu {n}: o vício já atrapalhava a carreira.', '{a} fired {n}: the addiction was hurting their career.'), { a: a.name, n: mgrName(s, mgrById[id]) }), -1, a.owner === 'player');
    }
    if (c === 'l') {
      const L0 = leaders(s).L[id];
      const lb = L0?.label ? s.labels[L0.label] : undefined;
      if (!L0 || !lb || L0.st !== 'active') continue;
      if (lb.cash > 0) lb.cash -= Math.round(lb.cash * 0.012);
      lb.reputation = Math.max(0, lb.reputation - 0.25);
      if (x.mo >= 6 && r.chance(0.08)) {
        depart(s, lb, L0, 'fired');
        say16(s, key, fmtL(l('O conselho de {b} derrubou {n}: decisões erráticas e o caixa sangrando por causa do vício.', '{b}\'s board ousted {n}: erratic decisions and a bleeding treasury because of the addiction.'), { n: L0.name, b: lb.name }), -1);
        if (lb.active) succeed(s, r, lb, l('líder derrubado pelo vício', 'leader ousted over addiction'));
      }
    }
  }
}
registerSimHook('week', 'people16gen', (s) => { genMgrs16(s); });
registerSimHook('newgame', 'people16', (s) => { genMgrs16(s); });
registerSimHook('month', 'people16', (s) => peopleMonth16(s));

// empresário em crise negocia mal (a seu favor) — e explica
registerOfferMod('people16', (s, act) => {
  const m = repOf(s, act.id);
  if (!m) return null;
  const st = (s.x4 as unknown as { people16?: People16 }).people16?.L[mgrKey(m.id)]?.st;
  if (st === 'addiction') return { delta: 0.05, reason: fmtL(l('{n} anda perdido(a) no vício e negocia mal', '{n} is lost in addiction and negotiates poorly'), { n: mgrName(s, m) }) };
  if (st === 'rehab' || st === 'ill') return { delta: 0.03, reason: fmtL(l('{n} está afastado(a); quem negocia é um assistente', '{n} is on leave; an assistant negotiates'), { n: mgrName(s, m) }) };
  return null;
});

// ---------------------------------------------------------------- sucessão nos selos rivais

export const HOW16: Record<How16, [L, L]> = {
  heir: [l('Herdeiro(a)', 'Heir'), l('filho(a) do líder anterior: a família mantém o selo, mas o estilo muda.', 'the former leader\'s child: the family keeps the label, but the style changes.')],
  internal: [l('Executivo(a) da casa', 'Internal executive'), l('promovido(a) de dentro: mantém a estratégia e o elenco tranquilo.', 'promoted from within: keeps the strategy and calms the roster.')],
  outside: [l('Contratação de fora', 'Outside hire'), l('alguém de fora: estilo e estratégia podem mudar de vez.', 'an outsider: style and strategy may change for good.')],
  veteran: [l('Veterano(a) do mercado', 'Industry veteran'), l('ex-líder de outro selo: traz o próprio jeito e desafetos.', 'a former head of another label: brings their own ways and grudges.')],
};
const STY: LeaderStyle[] = ['autocrat', 'mentor', 'dealmaker', 'visionary', 'numbers', 'showman', 'consensus'];

/** Último líder que saiu deste selo (neste ano). */
function prevLeader(s: GameState, lbId: string): Leader | undefined {
  return Object.values(leaders(s).L).filter((x) => x.jobs.some((j) => j.lb === lbId && j.to !== undefined && j.to >= s.year - 1))
    .sort((a, b) => (b.jobs.find((j) => j.lb === lbId)?.to ?? 0) - (a.jobs.find((j) => j.lb === lbId)?.to ?? 0))[0];
}

SUCC10.pick = (s, lb, why) => {
  const r = Rng.fromSeed(`${s.config.seed}|succ16|${lb.id}|${s.week}`);
  const prev = prevLeader(s, lb.id);
  const kids = prev ? (s.families[`l:${prev.id}`]?.kids ?? []).filter((k) => s.year - k.born >= 24 && s.year - k.born <= 62) : [];
  const pHeir = !prev || !kids.length ? 0 : prev.founder ? 0.6 : prev.bg === 'heir' ? 0.5 : 0.22;
  if (prev && kids.length && r.chance(pHeir)) {
    const k = kids.sort((a, b) => a.born - b.born)[0];
    const L0 = newLeader(s, r, lb, { name: k.name, born: k.born });
    L0.bg = 'heir';
    L0.city = prev.city;
    L0.style = r.pick(STY.filter((x) => x !== prev.style));
    L0.risk = clamp(L0.risk + 15, 0, 100);
    L0.note = fmtL(l('Filho(a) de {p}, herdou o comando de {b}.', 'Child of {p}, inherited the helm of {b}.'), { p: prev.name, b: lb.name });
    p16(s).par[L0.id] = prev.id;
    return { L: L0, how: 'heir' };
  }
  if (r.chance(0.35)) {
    const L0 = newLeader(s, r, lb);
    L0.pref = playbookOf(lb);
    L0.style = r.pick(['consensus', 'numbers', 'mentor'] as LeaderStyle[]);
    L0.risk = clamp(L0.risk - 15, 0, 100);
    L0.jobs.push({ lb: lb.id, n: lb.name, from: Math.max(lb.founded, s.year - r.int(4, 15)), to: s.year, end: 'left' });
    L0.note = fmtL(l('Executivo(a) de carreira em {b}, promovido(a) a líder.', 'Career executive at {b}, promoted to the top job.'), { b: lb.name });
    void why;
    return { L: L0, how: 'internal' };
  }
  return undefined;
};

SUCC10.done = (s, lb, L0, why, how) => {
  const st = p16(s);
  const prev = prevLeader(s, lb.id);
  const list = (st.succ[lb.id] ??= []);
  list.push({ y: s.year, out: prev && prev.id !== L0.id ? prev.name : undefined, outId: prev && prev.id !== L0.id ? prev.id : undefined, in: L0.name, inId: L0.id, how, why, pb: playbookOf(lb) });
  if (list.length > 12) list.shift();
  const H = HOW16[how as How16] ?? HOW16.outside;
  const text = fmtL(l('Sucessão em {b}: {n} — {h}, {e}', 'Succession at {b}: {n} — {h}, {e}'), { b: lb.name, n: L0.name, h: H[0], e: H[1] });
  st.news.unshift([s.year, s.month, text]);
  if (st.news.length > 40) st.news.length = 40;
  remember(s, 'leader10', text, { important: lb.family === 'A' });
  if ((s.rivalries[lb.id] ?? 0) >= 10) notify(s, text, 'info');
};

/** Sucessões registradas de um selo (mais recentes primeiro). */
export const successions16 = (s: GameState, lbId: string): Succ16[] => [...(p16(s).succ[lbId] ?? [])].reverse();

// ---------------------------------------------------------------- produção: obras com você e com outros

export interface Work16 { title: string; artist: string; year: number; actId?: string; relId?: string; peak?: number; q?: number; you: boolean; label?: string; real?: boolean }
/** Obras de um produtor real: faixas gravadas no jogo (suas e de outros), obras históricas e contratações por rivais. */
export function works16(s: GameState, id: string): Work16[] {
  const p = prodById[id];
  if (!p) return [];
  const def = prodDefId(id);
  const out: Work16[] = [];
  const seenRel = new Set<string>();
  for (const so of Object.values(s.songs)) {
    if (so.producerId !== def || !so.recorded) continue;
    const a = s.acts[so.actId];
    const rel = so.releaseId ? s.releases[so.releaseId] : undefined;
    if (rel && seenRel.has(rel.id)) continue;
    if (rel) seenRel.add(rel.id);
    const you = !!a && (a.owner === 'player' || !!a.playerBand);
    out.push({ title: rel?.title ?? so.title, artist: a?.name ?? '?', year: rel?.year ?? s.year, actId: a?.id, relId: rel?.id, peak: rel && rel.peak < 999 ? rel.peak : undefined, q: Math.round(so.q), you, label: rel?.owner ?? undefined });
  }
  if (s.config.realNames) for (const [w, artist, y] of p.w) {
    if (y > s.year) continue;
    const act = Object.values(s.acts).find((a) => realDataOf(a)?.n === artist || a.name === artist);
    const rel = act ? Object.values(s.releases).find((r) => r.actId === act.id && canonKey(r.title) === canonKey(w)) : undefined;
    out.push({ title: w, artist, year: y, actId: act?.id, relId: rel?.id, peak: rel && rel.peak < 999 ? rel.peak : undefined, you: !!act && act.owner === 'player', real: true });
  }
  for (const c of p15(s).credits[id] ?? []) if (!c.you) {
    const a = Object.values(s.acts).find((x) => x.name === c.who);
    out.push({ title: c.title, artist: c.who, year: c.y, actId: a?.id, you: false, label: c.title });
  }
  return out.sort((a, b) => b.year - a.year);
}

/** Produtor de um lançamento (o mais frequente entre as faixas; obras históricas também contam). */
export function producersOfRelease16(s: GameState, relId: string): { def: string; real?: string; name: string }[] {
  const r = s.releases[relId];
  if (!r) return [];
  const ids = new Map<string, number>();
  for (const sid of r.songs) { const pid = s.songs[sid]?.producerId; if (pid && !s.persons[pid]) ids.set(pid, (ids.get(pid) ?? 0) + 1); }
  const out = [...ids.entries()].sort((a, b) => b[1] - a[1]).map(([def]) => {
    const d = PRODUCERS.find((x) => x.id === def);
    const real = d?.real;
    return { def, real, name: real && prodById[real] ? prodName(s, prodById[real]) : d?.name ?? def };
  });
  if (!out.length && s.config.realNames) {
    const a = s.acts[r.actId];
    const n = a ? realDataOf(a)?.n ?? a.name : '';
    for (const p of REAL_PRODS) if (p.w.some(([w, ar, y]) => y <= s.year && ar === n && canonKey(w) === canonKey(r.title))) out.push({ def: prodDefId(p.id), real: p.id, name: prodName(s, p) });
  }
  return out;
}

/** Aplica um estado de vida (testes e eventos): vício, reabilitação, doença ou morte, com os efeitos no cargo. */
export function force16(s: GameState, key: string, st: St16, weeks = 12): void {
  const P = per13(s, key);
  if (!P) return;
  const x = rec(s, key);
  const r = Rng.fromSeed(`${s.config.seed}|f16|${key}|${s.week}`);
  if (st === 'dead') { die(s, r, key, P, l('causas naturais', 'natural causes')); return; }
  x.st = st; x.mo = 0;
  if (st === 'rehab' || st === 'ill') x.until = s.week + weeks;
  if (st === 'addiction') x.dep = Math.max(x.dep, 70);
  effect(s, r, key, st, l(''));
}


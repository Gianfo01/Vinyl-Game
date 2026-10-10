// Rodada 18 (artist18) — a carreira de ARTISTA sem selo deixa de ser um evento solto ("um selo quer te contratar")
// e vira o outro lado da mesa: os selos NPC (majors, indies, selos novos de npc17/world18, com a memória de
// rivalmind18) observam sua banda — fama, fama na sua terra (fame16), embalo, habilidade (ability18) e a qualidade
// do último disco — e mandam PROPOSTAS (Caixa 2.0) com cláusulas de contracts18: adiantamento, fundo de gravação,
// base do royalty, recuperável, cruzamento, prazo/opções, master (selo/compartilhado/licença), 360, território,
// verba prometida. Você negocia do lado do artista (contraproposta, advogado ou empresário que lê as letras miúdas,
// leilão entre selos, propostas predatórias), a banda vota, e depois o selo DECIDE coisas: data, verba, single,
// imagem, apoio de turnê, engavetar, pressionar por disco, exercer opção, dispensar, prestar contas (com atraso e,
// nos selos desonestos, "arredondando"), ser vendido ou absorvido (você vai junto com o catálogo). Também:
// distribuição (P&D), contrato de desenvolvimento, editora para suas músicas, empresário e agente de shows.
// Seu extrato de artista mostra adiantamento, recuperável, royalties e prestações de contas (econ18).

import { clamp, hashString, Rng, seedState } from '../../core/rng';
import { toReal } from '../../core/money';
import { familyOf, l, type L, type MarketId } from '../../data/world';
import { REAL_MGRS, type RealMgr } from '../../data/managers14';
import type { ContractModel } from '../../data/rules';
import { ART18 } from '../artist18hook';
import { fileLawsuit } from '../business';
import { expectedAdvance } from '../contracts';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind, type AdvTip18 } from '../inbox18';
import { postHooks18 } from '../ledger18';
import { defaultRights } from '../rights';
import type { Act, Contract, GameState, Label } from '../types';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { ability18 } from './ability18';
import { PKG18, packaging18, type Clauses18 } from './contracts18';
import { fameIn, homeA3 } from './fame16';
import { m14, mgrActive, mgrName } from './managers14';
import { labelClout, type ArApproval } from './offers12';

// ---------------------------------------------------------------- estado

export type OK18 = 'record' | 'dist' | 'dev' | 'mgr' | 'agent' | 'pub' | 'reneg' | 'buyout';
export type Master18 = 'label' | 'shared' | 'artist';
export interface Offer18 {
  id: string; k: OK18; lb: string; who: string; w: number; until: number; st: 'open' | 'acc' | 'dec' | 'exp' | 'gone';
  model: ContractModel; pkg: string; adv: number; fund: number; roy: number; term: number; opts: number; albums: number;
  k18?: Clauses18; master: Master18; rev: number; s360: number; scope: 'home' | 'region' | 'world'; ar: ArApproval; mkt: number;
  pred?: 1; low?: 1; rounds: number; mood: number; bid?: number; why: L[]; msg?: string;
  /** empresário/agente/editora */
  rate?: number; boost?: number; ptype?: 'admin' | 'copub' | 'full'; stip?: number; mgr?: string; neg?: number; style?: string;
  /** compra de contrato: quanto o selo novo paga ao antigo */
  fee?: number;
}
export interface Stmt18 { lb: string; y: number; m: number; due: number; earned: number; recouped: number; paid: number; bal: number; shaved: number; st: 'due' | 'paid'; late?: 1 }
export interface Deal18 {
  cid: string; lb: string; since: number; prio: number; fund: number; fund0: number; pot: number; potRec: number; lastRel: number;
  buried: string[]; push: string[]; demand?: number; refusals: number; lastReneg: number; lastAudit: number; s360: number; mkt: number; tour: number;
  pkg: string; ar: ArApproval; v0: number;
}
export interface Past18 { cid: string; lb: string; from: number; to: number; why: L; roy: number; k?: Clauses18; master: Master18; rev: number; bal: number; pot: number; potRec: number; back?: 1 }
export interface Led18 { w: number; y: number; m: number; k: string; v: number; t: L }
export interface Suit18 { lb: string; claim: number; odds: number; ruling: number; t: L; by: 'player' }
export interface Mgr18 { id: string; name: string; rate: number; neg: number; since: number; real?: 1; style?: string }
export interface Art18 {
  offers: Offer18[]; deal?: Deal18; past: Past18[]; led: Led18[]; stmts: Stmt18[];
  mgr?: Mgr18; agent?: { name: string; rate: number; boost: number; since: number };
  pub?: { name: string; type: 'admin' | 'copub' | 'full'; take: number; up: number; bal: number; until: number; since: number };
  dev?: { lb: string; stip: number; until: number; paid: number; opt: Offer18 };
  lawyer: number; boost: Record<string, [number, number]>; cd: Record<string, number>; last: Record<string, number>; mine: Record<string, number>;
  shaved: number; suits: Suit18[]; log: [number, number, L][];
}
declare module '../ext4' { interface Ext4 { artist18: Art18 } }
const fresh = (): Art18 => ({ offers: [], past: [], led: [], stmts: [], lawyer: 0, boost: {}, cd: {}, last: {}, mine: {}, shaved: 0, suits: [], log: [] });
registerExt4('artist18', fresh);
export function a18(s: GameState): Art18 {
  const x = s as unknown as { x4: Record<string, unknown> };
  x.x4 ??= {};
  const st = (x.x4.artist18 ??= fresh()) as Art18;
  st.offers ??= []; st.past ??= []; st.led ??= []; st.stmts ??= []; st.boost ??= {}; st.cd ??= {}; st.last ??= {}; st.mine ??= {}; st.suits ??= []; st.log ??= [];
  return st;
}

const WK = 4.33;
const alive = (a?: Act): a is Act => !!a && !a.deceased && a.status !== 'retired' && a.status !== 'split';
/** sua banda (papel artista) */
export const band18 = (s: GameState): Act | undefined => { const id = s.player.bandActId; const a = id ? s.acts[id] : undefined; return alive(a) ? a : undefined; };
/** a carreira de artista com selos NPC vale para o papel Artista (o híbrido já tem selo: ver shared18) */
export const on18 = (s: GameState): boolean => s.config.role === 'artist' && !!band18(s);
const nameOf = (s: GameState, id: string) => s.labels[id]?.name ?? id;
const exp18 = (s: GameState, a: Act) => Math.max(600, expectedAdvance(s, a));
const say = (st: Art18, s: GameState, t: L) => { st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
function led(s: GameState, k: string, v: number, t: L): void {
  const st = a18(s);
  st.led.unshift({ w: s.week, y: s.year, m: s.month, k, v: Math.round(v), t });
  if (st.led.length > 120) st.led.length = 120;
}
/** assessoria do lado do artista: 2 = empresário, 1 = advogado contratado para esta negociação, 0 = sozinho */
export const advice18 = (s: GameState): number => (a18(s).mgr ? 2 : a18(s).lawyer >= s.week ? 1 : 0);
export const lawyerCost18 = (s: GameState): number => money(s, 1500);

// ---------------------------------------------------------------- reputação do selo (escondida) e depoimentos

/** honestidade 0..1 (paga em dia, livros limpos). Escondida: o empresário conhece a fama do selo; sozinho, você só ouve boatos. */
export function hon18(s: GameState, id: string): number {
  const lb = s.labels[id];
  let v = 0.3 + (hashString(`${s.config.seed}|hon18|${id}`) / 4294967296) * 0.65;
  if (lb?.archetype === 'hitmaker') v -= 0.08;
  if (lb?.archetype === 'boutique') v += 0.08;
  if (lb?.family === 'A') v = 0.45 + (v - 0.3) * 0.6;
  const tr = (s.x4 as unknown as { standing9?: { by: Record<string, { trust: number }> } }).standing9?.by[id]?.trust;
  if (tr !== undefined) v += (tr - 50) / 500;
  return clamp(v, 0.1, 0.97);
}
const dropsOf = (s: GameState, id: string): number => Object.keys((s.x4 as unknown as { rivalmind18?: { m: Record<string, { drop?: Record<string, number> }> } }).rivalmind18?.m?.[id]?.drop ?? {}).length;

/** o que se ouve do selo: artistas do elenco, dispensas, histórico com você */
export function testi18(s: GameState, id: string): L[] {
  const lb = s.labels[id];
  if (!lb) return [];
  const h = hon18(s, id);
  const acts = lb.roster.map((x) => s.acts[x]).filter(alive).sort((a, b) => b.fame - a.fame).slice(0, 2);
  const out: L[] = [];
  const Q = h > 0.7 ? l('"Pagam em dia e abrem os livros."', '"They pay on time and open the books."') : h > 0.48 ? l('"As contas atrasam, mas chegam."', '"Statements run late, but they arrive."') : l('"Nunca vi uma prestação de contas limpa."', '"I have never seen a clean statement."');
  for (const a of acts) out.push(fmtL(l('{a}: {q}', '{a}: {q}'), { a: a.name, q: hashString(`${a.id}|t18`) % 3 === 0 && h > 0.5 ? l('"Cuidam da gente."', '"They look after us."') : Q }));
  const d = dropsOf(s, id);
  if (d >= 2) out.push(fmtL(l('Dispensou {n} artistas recentemente.', 'Dropped {n} acts recently.'), { n: d }));
  const past = a18(s).past.filter((p) => p.lb === id);
  if (past.length) out.push(fmtL(l('Você já esteve lá: {w}', 'You were there before: {w}'), { w: past[past.length - 1].why }));
  if (!out.length) out.push(l('Ninguém fala muito deles.', 'Nobody says much about them.'));
  return out;
}

// ---------------------------------------------------------------- interesse dos selos

export interface Ctx18 { fameN: number; homeF: number; momN: number; caN: number; qN: number; paRoom: number }
export function ctx18(s: GameState, a: Act): Ctx18 {
  const a3 = homeA3(a);
  const homeF = a3 ? clamp(fameIn(s, a, a3) / 100, 0, 1) : clamp(a.fame / 60, 0, 1);
  let ca = 0, pa = 0, n = 0;
  for (const id of a.members) { const x = ability18(s, `p:${id}`); if (x) { ca += x.ca; pa += x.pa; n++; } }
  ca = n ? ca / n : 80; pa = n ? pa / n : 90;
  const last = a.releases.map((id) => s.releases[id]).filter(Boolean).sort((x, y) => y.week - x.week)[0];
  return { fameN: clamp(a.fame / 55, 0, 1), homeF, momN: clamp(a.momentum / 100, 0, 1), caN: clamp((ca - 60) / 100, 0, 1), qN: last ? clamp((last.q - 40) / 50, 0, 1) : 0.15, paRoom: clamp((pa - ca) / 60, 0, 1) };
}
/** quanto um selo quer você (0..1) e por quê */
export function interest18(s: GameState, lb: Label, a: Act, c = ctx18(s, a)): { v: number; why: L[] } {
  const st = a18(s);
  const why: L[] = [];
  let v = 0.45 * c.fameN + 0.15 * c.homeF + 0.12 * c.momN + 0.12 * c.caN + 0.12 * c.qN;
  if (c.fameN > 0.4) why.push(l('o nome já circula', 'your name is already around'));
  if (c.homeF > 0.35) why.push(l('lotam casas na sua terra', 'you pack venues back home'));
  if (c.momN > 0.5) why.push(l('o embalo do momento', 'current momentum'));
  if (c.caN > 0.45) why.push(l('a banda toca muito', 'the band can really play'));
  if (c.qN > 0.5) why.push(l('o último disco foi bom', 'the last record was good'));
  const fam = familyOf(a.genre);
  if (lb.focus.includes(fam) || lb.focus.includes(a.genre)) { v += lb.strategy === 'niche' ? 0.16 : 0.08; why.push(l('o gênero é a praia deles', 'the genre is their thing')); }
  if (lb.strategy === 'develop') { v += 0.1 * c.paRoom; if (c.paRoom > 0.3) why.push(l('veem potencial para crescer', 'they see room to grow')); }
  if (lb.strategy === 'stars') v += 0.12 * c.fameN - 0.05;
  if (lb.family === 'A' && c.fameN < 0.3) v -= 0.12;
  if (lb.cash < money(s, 60000)) v -= 0.08;
  const tgt = (s.x4 as unknown as { rivalmind18?: { m: Record<string, { target?: { k: string; id: string } }> } }).rivalmind18?.m?.[lb.id]?.target;
  if (tgt && ((tgt.k === 'fam' && tgt.id === fam) || tgt.id === a.id)) { v += 0.08; why.push(l('estão caçando esse som', 'they are hunting this sound')); }
  const b = st.boost[lb.id];
  if (b && b[0] >= s.week) { v += b[1]; why.push(b[1] > 0 ? l('gostaram do showcase', 'they liked the showcase') : l('o showcase foi mal', 'the showcase went badly')); }
  if (st.mgr) v += 0.05;
  const bad = st.past.find((p) => p.lb === lb.id && (p.why.en.includes('dropped') || p.why.en.includes('court')));
  if (bad) v -= 0.2;
  return { v: clamp(v, 0, 1), why };
}

// ---------------------------------------------------------------- propostas

const baseK = (pkg: string): Clauses18 => ({ ...(PKG18.find((p) => p.id === pkg)?.c ?? PKG18[0].c) });
const PRED18: Clauses18 = { pkg: 'pred', rec: 1, video: true, tour: true, mkt: 0.5, cap: 0, cross: true, base: 'retail', stmt: 'a', lag: 6, audit: false, minRel: 0, promo: 0 };
const r100 = (s: GameState, real: number) => money(s, Math.max(100, Math.round(real / 100) * 100));

function mkRecord(s: GameState, r: Rng, lb: Label, a: Act, v: number, why: L[], kind: OK18 = 'record'): Offer18 {
  const exp = exp18(s, a);
  const major = lb.family === 'A';
  const indie = lb.family === 'B' || lb.strategy === 'niche' || lb.strategy === 'develop';
  const h = hon18(s, lb.id);
  const pred = h < 0.4 && !major && r.chance(0.55);
  const low = !pred && r.chance(0.15 + (1 - v) * 0.2);
  const pkg = pred ? 'pred' : major ? 'major' : indie ? (r.chance(0.5) ? 'indie' : 'license') : r.chance(0.5) ? 'major' : 'indie';
  const k = pred ? { ...PRED18 } : baseK(pkg);
  const advMul = (pred ? 1.5 + r.next() * 0.4 : major ? 1.1 + r.next() * 0.6 : indie ? 0.5 + r.next() * 0.5 : 0.8 + r.next() * 0.5) * (low ? 0.45 : 1) * (0.8 + v * 0.6);
  const s360 = pred || (major && s.year >= 2002 && r.chance(0.5)) ? 0.2 + Math.round(r.next() * 2) * 0.05 : 0;
  const lic = pkg === 'license';
  const o: Offer18 = {
    id: nextId(s, 'ao'), k: kind, lb: lb.id, who: lb.name, w: s.week, until: s.week + 8, st: 'open',
    model: s360 ? '360' : lic ? 'licensing' : 'classic', pkg, adv: r100(s, exp * advMul), fund: r100(s, exp * (major ? 0.9 : pred ? 0.4 : 0.5)),
    roy: Math.round(clamp((pred ? 0.09 : major ? 0.12 : 0.17) + a.fame / 700 + r.next() * 0.03 - (low ? 0.03 : 0), 0.06, 0.3) * 100) / 100,
    term: pred ? 84 : major ? 48 : indie ? 30 : 36, opts: pred ? 4 : major ? 2 : 1, albums: pred ? 7 : major ? 4 : indie ? 2 : 3, k18: k,
    master: lic ? 'artist' : indie && r.chance(0.35) ? 'shared' : 'label', rev: lic ? 7 : indie ? 10 : 0, s360,
    scope: major || pred ? 'world' : indie ? 'region' : r.chance(0.5) ? 'region' : 'world',
    ar: pred ? 'label' : indie ? (r.chance(0.5) ? 'artist' : 'joint') : r.chance(0.3) ? 'joint' : 'label',
    mkt: r100(s, exp * (major ? 0.6 : 0.25) * (0.5 + v)), rounds: 0, mood: clamp(0.45 + h * 0.3 + r.next() * 0.2, 0, 1), why,
  };
  if (pred) o.pred = 1;
  if (low) o.low = 1;
  return o;
}
function mkDist(s: GameState, r: Rng, lb: Label, a: Act, why: L[]): Offer18 {
  const exp = exp18(s, a);
  const fee = Math.round((0.15 + r.next() * 0.15) * 100) / 100;
  return {
    id: nextId(s, 'ao'), k: 'dist', lb: lb.id, who: lb.name, w: s.week, until: s.week + 8, st: 'open', model: 'distribution', pkg: 'dist',
    adv: r100(s, exp * (0.15 + r.next() * 0.25)), fund: 0, roy: Math.round((1 - fee) * 100) / 100, term: 24, opts: 0, albums: 2,
    k18: { ...baseK('indie'), pkg: 'dist', rec: 0, video: false, mkt: 0, base: 'net', stmt: 'q', lag: 1, audit: true, minRel: 0 },
    master: 'artist', rev: 0, s360: 0, scope: 'world', ar: 'artist', mkt: 0, rounds: 0, mood: 0.6, why: [...why, l('distribuição e fabricação; o master continua seu', 'distribution and manufacturing; the master stays yours')],
  };
}

/** Lê a proposta do lado do artista: partes visíveis × partes que só a assessoria enxerga. */
export interface Part18 { t: L; d: number; hid: 0 | 1 | 2 }
export function value18(s: GameState, o: Offer18): { v: number; seen: number; parts: Part18[] } {
  const a = band18(s);
  const parts: Part18[] = [];
  const add = (d: number, t: L, hid: 0 | 1 | 2 = 0) => { if (Math.abs(d) >= 0.004) parts.push({ t, d, hid }); };
  if (!a) return { v: 0, seen: 0, parts };
  if (o.k === 'mgr' || o.k === 'agent' || o.k === 'pub') return { v: 0.6, seen: 0.6, parts };
  const exp = exp18(s, a);
  const advU = clamp(toReal(o.adv, s.year) / exp, 0, 2.5);
  add(advU * 0.12 - 0.1, fmtL(l('Adiantamento: {p}% do que o mercado paga por vocês', 'Advance: {p}% of what the market pays for you'), { p: Math.round(advU * 100) }));
  if (o.fund) add(clamp(toReal(o.fund, s.year) / exp, 0, 1.5) * 0.04, l('Fundo de gravação pago pelo selo (recuperável)', 'Recording fund paid by the label (recoupable)'));
  const k = o.k18;
  const bm = k ? (k.base === 'retail' ? 1.25 : k.base === 'wholesale' ? 1 : 0.88) * (1 - packaging18(s.year, k.base)) : 1;
  const expR = o.model === 'distribution' ? 0.75 : 0.15 + a.fame / 600;
  add((o.roy / expR - 1) * 0.15, fmtL(l('Royalty nominal {r}%', 'Headline royalty {r}%'), { r: Math.round(o.roy * 100) }));
  if (k && bm !== 1) add((bm - 1) * 0.15, fmtL(l('Base do royalty e embalagem: vale {p}% do nominal', 'Royalty base and packaging: worth {p}% of headline'), { p: Math.round(bm * 100) }), 1);
  if (k && o.model !== 'distribution') {
    const burden = k.rec * 0.04 + (k.video ? 0.02 : 0) + (k.tour ? 0.025 : 0) + k.mkt * 0.08;
    add(-burden, l('Despesas recuperáveis (gravação, clipe, turnê, marketing)', 'Recoupable costs (recording, video, tour, marketing)'), 1);
    add(k.cross ? -0.03 : 0.015, k.cross ? l('Recuperação cruzada entre discos', 'Cross-collateralized across records') : l('Recuperação por projeto', 'Per-project recoupment'), 1);
    add(k.stmt === 'a' ? -0.03 : k.stmt === 'q' ? 0.015 : 0, k.stmt === 'a' ? l('Contas só uma vez por ano', 'Statements only yearly') : k.stmt === 'q' ? l('Contas trimestrais', 'Quarterly statements') : l('Contas semestrais', 'Semiannual statements'), 1);
    if (k.lag >= 4) add(-0.02, fmtL(l('{n} meses de atraso para pagar', '{n}-month payment lag'), { n: k.lag }), 1);
    add(k.audit ? 0.02 : -0.02, k.audit ? l('Direito de auditoria', 'Audit right') : l('Sem direito de auditoria', 'No audit right'), 1);
    if (k.minRel) add(k.minRel * 0.02, fmtL(l('{n} lançamento(s) garantido(s)', '{n} guaranteed release(s)'), { n: k.minRel }));
  }
  add(-Math.max(0, o.term / 12 - 3) * 0.03, fmtL(l('Prazo de {y} anos', '{y}-year term'), { y: Math.round(o.term / 12 * 10) / 10 }));
  if (o.opts) add(-o.opts * 0.02, fmtL(l('{n} opção(ões) a critério do selo', '{n} option(s) at the label\'s discretion'), { n: o.opts }), 1);
  if (o.albums > 3) add(-(o.albums - 3) * 0.02, fmtL(l('{n} discos devidos', '{n} records owed'), { n: o.albums }));
  add(o.master === 'artist' ? 0.1 : o.master === 'shared' ? 0.05 : o.rev ? 0.02 : -0.02, o.master === 'artist' ? l('Master continua seu', 'You keep the master') : o.master === 'shared' ? l('Master dividido', 'Shared master') : o.rev ? fmtL(l('Master volta em {y} anos', 'Master reverts in {y} years'), { y: o.rev }) : l('Master do selo para sempre', 'Label owns the master forever'));
  if (o.s360) add(-o.s360 * 0.5, fmtL(l('360: {p}% de shows, merch e patrocínio', '360: {p}% of live, merch and sponsorship'), { p: Math.round(o.s360 * 100) }));
  add(o.ar === 'artist' ? 0.06 : o.ar === 'joint' ? 0.03 : -0.02, o.ar === 'artist' ? l('Vocês escolhem singles e produtor', 'You pick singles and producer') : o.ar === 'joint' ? l('Decisão conjunta no estúdio', 'Joint studio decisions') : l('O selo escolhe singles e produtor', 'The label picks singles and producer'));
  add(labelClout(s, o.lb) * 0.2 - 0.08, fmtL(l('Força do selo ({c}%)', 'Label clout ({c}%)'), { c: Math.round(labelClout(s, o.lb) * 100) }));
  if (o.scope !== 'world') add(-0.03, o.scope === 'home' ? l('Só no seu país', 'Home country only') : l('Só na sua região', 'Your region only'));
  add((hon18(s, o.lb) - 0.6) * 0.25, l('Fama do selo com artistas (paga em dia? livros limpos?)', 'Label\'s name among artists (pays on time? clean books?)'), 2);
  const v = clamp(0.5 + parts.reduce((t, x) => t + x.d, 0), 0, 1);
  const adv = advice18(s);
  const seen = clamp(0.5 + parts.filter((x) => x.hid <= adv).reduce((t, x) => t + x.d, 0), 0, 1);
  return { v, seen, parts };
}
/** aviso do assessor: proposta predatória / pão-duro */
export function warn18(s: GameState, o: Offer18): L | null {
  const adv = advice18(s);
  if (o.pred && adv) return adv === 2 ? l('Seu empresário: "contrato predatório — adiantamento bonito, mas recuperam tudo, cruzado, 7 discos, 360 e contas uma vez por ano. Fuja ou renegocie."', 'Your manager: "predatory deal — pretty advance, but they recoup everything, cross-collateralized, 7 records, 360 and yearly statements. Run or renegotiate."') : l('Seu advogado: "as letras miúdas são abusivas (recuperável total, contas anuais, sem auditoria)."', 'Your lawyer: "the fine print is abusive (full recoupment, yearly statements, no audit)."');
  if (o.low && adv) return l('Assessoria: "estão oferecendo bem abaixo do mercado — dá para pedir mais."', 'Advisor: "they are offering well below market — you can ask for more."');
  return null;
}

// ---------------------------------------------------------------- votos da banda

export interface Vote18 { pid: string; name: string; yes: boolean; why: L }
export function votes18(s: GameState, o: Offer18): Vote18[] {
  const a = band18(s);
  if (!a) return [];
  const { v } = value18(s, o);
  const exp = exp18(s, a);
  const advU = clamp(toReal(o.adv, s.year) / exp, 0, 2.5);
  const major = s.labels[o.lb]?.family === 'A';
  return a.members.map((id) => s.persons[id]).filter((p) => p && p.alive && !p.isPlayer).map((p) => {
    let x = v - 0.5 + (hashString(`${p.id}|${o.id}`) / 4294967296 - 0.5) * 0.08;
    let why: L = l('acha a proposta razoável', 'finds the offer reasonable');
    const tr = new Set(p.traits ?? []);
    if ((tr.has('rebel') || tr.has('purist')) && (major || o.ar === 'label')) { x -= 0.12; why = l('não quer "se vender" para um selo que manda no som', 'won\'t "sell out" to a label that runs the sound'); }
    if (tr.has('opportunist') || tr.has('spendthrift')) { x += advU * 0.05; why = l('quer o cheque', 'wants the check'); }
    if (tr.has('loyal')) x += 0.08;
    if (tr.has('big_ego')) x += labelClout(s, o.lb) * 0.1;
    switch (p.ambition) {
      case 'fame': x += labelClout(s, o.lb) * 0.15; if (labelClout(s, o.lb) > 0.6) why = l('sonha com o alcance do selo', 'dreams of the label\'s reach'); break;
      case 'art': case 'freedom': case 'critics': x += o.ar === 'artist' ? 0.08 : -0.08; if (o.ar !== 'artist') why = l('teme perder a liberdade no estúdio', 'fears losing studio freedom'); break;
      case 'money': x += advU * 0.06; break;
      case 'security': x += 0.05; why = l('quer estabilidade', 'wants stability'); break;
      case 'legacy': x += o.master === 'label' && !o.rev ? -0.08 : 0.06; if (o.master === 'label' && !o.rev) why = l('não aceita perder os masters para sempre', 'won\'t lose the masters forever'); break;
    }
    if (p.morale < 35) { x -= 0.05; why = l('anda de mau humor com a banda', 'has been sour with the band'); }
    const yes = x > 0;
    if (!yes && why.en === 'finds the offer reasonable') why = l('acha pouco', 'thinks it is not enough');
    return { pid: p.id, name: p.name, yes, why };
  });
}

// ---------------------------------------------------------------- assinar / recusar / contrapropor

const pushOfferMsg = (s: GameState, o: Offer18, subj: L, body: L) => {
  const m = pushInbox18(s, 'a18_offer', { from: o.who, subject: subj, body, ref: { o: o.id }, weeks: Math.max(2, o.until - s.week),
    actions: [{ id: 'accept', label: l('Aceitar', 'Accept') }, { id: 'counter', label: l('Contrapropor', 'Counter') }, { id: 'decline', label: l('Recusar', 'Decline') }] });
  o.msg = m.id;
};
function offerText(s: GameState, o: Offer18): L {
  if (o.k === 'dist') return fmtL(l('Distribuição e fabricação por {f}% das vendas; adiantamento de {a}; o master continua seu. 2 anos.', 'Distribution and manufacturing for {f}% of sales; {a} advance; you keep the master. 2 years.'), { f: Math.round((1 - o.roy) * 100), a: fmtMoney(s, o.adv) });
  if (o.k === 'dev') return fmtL(l('Contrato de desenvolvimento: mesada de {m}/mês por 12 meses; o selo tem a opção de contratar vocês nos termos combinados. Enquanto isso, vocês não assinam com outros.', 'Development deal: {m}/month stipend for 12 months; the label holds an option to sign you on pre-agreed terms. Meanwhile you can\'t sign elsewhere.'), { m: fmtMoney(s, o.stip ?? 0) });
  const t = fmtL(l('Adiantamento {a} + fundo de gravação {f}; royalty {r}%; {y} anos ({n} discos, {o} opções); master: {m}{x}.', 'Advance {a} + recording fund {f}; royalty {r}%; {y} years ({n} records, {o} options); master: {m}{x}.'),
    { a: fmtMoney(s, o.adv), f: fmtMoney(s, o.fund), r: Math.round(o.roy * 100), y: Math.round(o.term / 12 * 10) / 10, n: o.albums, o: o.opts, m: o.master === 'artist' ? l('seu', 'yours') : o.master === 'shared' ? l('dividido', 'shared') : o.rev ? fmtL(l('do selo, volta em {r} anos', 'label\'s, reverts in {r} years'), { r: o.rev }) : l('do selo', 'label\'s'), x: o.s360 ? fmtL(l('; 360 de {p}%', '; 360 of {p}%'), { p: Math.round(o.s360 * 100) }) : '' });
  return o.k === 'buyout' ? fmtL(l('{b} paga {fee} ao seu selo atual para tirar vocês de lá. {t}', '{b} pays your current label {fee} to get you out. {t}'), { b: o.who, fee: fmtMoney(s, o.fee ?? 0), t }) : t;
}
const fmtMoney = (_s: GameState, cents: number): string => { const v = Math.round(cents / 100); return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${v}`; };

function addOffer(s: GameState, o: Offer18): void {
  const st = a18(s);
  st.offers.unshift(o);
  if (st.offers.length > 30) st.offers.length = 30;
  const subj = o.k === 'record' ? fmtL(l('{b} quer contratar vocês', '{b} wants to sign you'), { b: o.who }) : o.k === 'dist' ? fmtL(l('{b} oferece distribuição', '{b} offers distribution'), { b: o.who })
    : o.k === 'dev' ? fmtL(l('{b} propõe um contrato de desenvolvimento', '{b} proposes a development deal'), { b: o.who }) : o.k === 'buyout' ? fmtL(l('{b} quer comprar seu contrato', '{b} wants to buy out your contract'), { b: o.who })
    : fmtL(l('{b} quer renegociar', '{b} wants to renegotiate'), { b: o.who });
  pushOfferMsg(s, o, subj, offerText(s, o));
}

export const openOffers18 = (s: GameState): Offer18[] => a18(s).offers.filter((o) => o.st === 'open' && o.until >= s.week);
const competing = (s: GameState, o: Offer18) => openOffers18(s).filter((x) => x.id !== o.id && (x.k === 'record' || x.k === 'buyout') && x.lb !== o.lb).length;

export type Ask18 = 'adv' | 'roy' | 'master' | 'audit' | 'term' | 'promo' | 'control';
export const ASK18: Record<Ask18, L> = {
  adv: l('Adiantamento maior', 'Bigger advance'), roy: l('Royalty maior', 'Higher royalty'), master: l('Master de volta (reversão)', 'Master back (reversion)'),
  audit: l('Auditoria e contas trimestrais', 'Audit and quarterly statements'), term: l('Prazo mais curto', 'Shorter term'), promo: l('Verba e lançamento garantidos', 'Guaranteed budget and release'), control: l('Controle criativo', 'Creative control'),
};
/** chance de o selo ceder (com o porquê) */
export function counterOdds18(s: GameState, o: Offer18): { p: number; why: L[] } {
  const why: L[] = [];
  let p = 0.3 + o.mood * 0.2 - o.rounds * 0.12;
  const n = competing(s, o);
  if (n) { p += Math.min(0.3, n * 0.15); why.push(fmtL(l('+{p}%: {n} selo(s) disputando vocês (leilão)', '+{p}%: {n} label(s) bidding for you (auction)'), { p: Math.round(Math.min(0.3, n * 0.15) * 100), n })); }
  const adv = advice18(s);
  const mg = a18(s).mgr;
  if (adv === 2 && mg) { const x = 0.05 + mg.neg / 500; p += x; why.push(fmtL(l('+{p}%: seu empresário negocia', '+{p}%: your manager negotiates'), { p: Math.round(x * 100) })); }
  else if (adv === 1) { p += 0.08; why.push(l('+8%: advogado na mesa', '+8%: lawyer at the table')); }
  const a = band18(s);
  if (a) { const x = clamp(a.fame / 250, 0, 0.2); p += x; if (x > 0.03) why.push(fmtL(l('+{p}%: sua fama', '+{p}%: your fame'), { p: Math.round(x * 100) })); }
  if (o.rounds) why.push(fmtL(l('−{p}%: já pediram {n} vez(es)', '−{p}%: you already asked {n} time(s)'), { p: o.rounds * 12, n: o.rounds }));
  return { p: clamp(p, 0.05, 0.9), why };
}
export function counter18(s: GameState, id: string, ask: Ask18, r?: Rng): { ok: boolean; text: L } {
  const o = a18(s).offers.find((x) => x.id === id);
  const a = band18(s);
  if (!o || o.st !== 'open' || !a) return { ok: false, text: l('Proposta indisponível.', 'Offer unavailable.') };
  r ??= new Rng(seedState(`a18c|${s.config.seed}|${o.id}|${o.rounds}|${s.week}`));
  const { p } = counterOdds18(s, o);
  o.rounds++;
  if (!r.chance(p)) {
    o.mood -= 0.25;
    if (o.mood < 0.15 || o.rounds >= 3) { o.st = 'gone'; return { ok: false, text: fmtL(l('{b} se irritou e retirou a proposta.', '{b} got annoyed and withdrew the offer.'), { b: o.who }) }; }
    return { ok: false, text: fmtL(l('{b} não cedeu. A proposta continua na mesa (paciência menor).', '{b} did not budge. The offer stays on the table (less patience).'), { b: o.who }) };
  }
  const k = o.k18 ? (o.k18 = { ...o.k18 }) : undefined;
  switch (ask) {
    case 'adv': o.adv = Math.round(o.adv * 1.25); break;
    case 'roy': o.roy = Math.min(o.model === 'distribution' ? 0.92 : 0.35, Math.round((o.roy + 0.025) * 1000) / 1000); break;
    case 'master': if (o.master === 'label') { if (o.rev) o.rev = Math.max(3, o.rev - 5); else o.rev = 15; } else o.master = 'artist'; break;
    case 'audit': if (k) { k.audit = true; k.stmt = 'q'; k.lag = Math.min(k.lag, 2); } break;
    case 'term': o.term = Math.max(18, o.term - 12); o.opts = Math.max(0, o.opts - 1); o.albums = Math.max(1, o.albums - 1); break;
    case 'promo': if (k) { k.minRel = Math.max(k.minRel, 2); k.promo = Math.max(k.promo, 8000); } o.mkt = Math.round(o.mkt * 1.3); break;
    case 'control': o.ar = o.ar === 'label' ? 'joint' : 'artist'; break;
  }
  o.until = Math.max(o.until, s.week + 3);
  // leilão: quem disputa reage
  for (const x of openOffers18(s)) if (x.id !== o.id && x.k === 'record' && x.lb !== o.lb && x.mood > 0.4 && r.chance(0.4)) { x.adv = Math.round(x.adv * 1.12); x.bid = (x.bid ?? 0) + 1; say(a18(s), s, fmtL(l('Leilão: {b} cobriu e subiu o adiantamento.', 'Bidding war: {b} matched and raised the advance.'), { b: x.who })); }
  return { ok: true, text: fmtL(l('{b} cedeu: {w}.', '{b} gave in: {w}.'), { b: o.who, w: ASK18[ask] }) };
}
/** pergunta ao assessor qual ponto atacar primeiro */
export function bestAsk18(s: GameState, o: Offer18): Ask18 {
  const k = o.k18;
  if (o.pred || (k && !k.audit && k.stmt === 'a')) return 'audit';
  if (o.low) return 'adv';
  if (o.master === 'label' && !o.rev) return 'master';
  if (o.term > 48) return 'term';
  return a18(s).mgr?.style === 'guardian' ? 'control' : a18(s).mgr?.style === 'muscle' ? 'roy' : 'adv';
}
export function hireLawyer18(s: GameState): L | null {
  if (a18(s).lawyer >= s.week) return l('O advogado já está acompanhando.', 'The lawyer is already on it.');
  const c = lawyerCost18(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `a18law:${s.week}`, -c, 'legal', 'Advogado (negociação de contrato)');
  a18(s).lawyer = s.week + 12;
  led(s, 'legal', -c, l('Advogado para negociar contrato', 'Lawyer to negotiate a deal'));
  return null;
}
export function decline18(s: GameState, id: string): void {
  const o = a18(s).offers.find((x) => x.id === id);
  if (!o || o.st !== 'open') return;
  o.st = 'dec';
}

/** aceitar: a banda vota; `force` passa por cima da maioria (moral cai) */
export function accept18(s: GameState, id: string, force = false): { ok: boolean; text: L; vote?: Vote18[] } {
  const st = a18(s);
  const o = st.offers.find((x) => x.id === id);
  const a = band18(s);
  if (!o || o.st !== 'open' || o.until < s.week || !a) return { ok: false, text: l('Proposta indisponível.', 'Offer unavailable.') };
  if (o.k === 'mgr') return hireMgr(s, o);
  if (o.k === 'agent') { st.agent = { name: o.who, rate: o.rate ?? 0.1, boost: o.boost ?? 0.1, since: s.week }; o.st = 'acc'; say(st, s, fmtL(l('{n} agora agenda seus shows.', '{n} now books your shows.'), { n: o.who })); return { ok: true, text: fmtL(l('{n} é seu agente de shows.', '{n} is your booking agent.'), { n: o.who }) }; }
  if (o.k === 'pub') return signPub(s, o);
  const busy = st.deal && o.k !== 'buyout' && o.k !== 'reneg';
  if (busy) return { ok: false, text: l('Vocês já têm contrato: só uma compra de contrato ou renegociação.', 'You already have a deal: only a buyout or renegotiation.') };
  if (st.dev && st.dev.lb !== o.lb && o.k !== 'reneg') return { ok: false, text: fmtL(l('Contrato de desenvolvimento com {b}: exclusividade até {y}.', 'Development deal with {b}: exclusive until {y}.'), { b: nameOf(s, st.dev.lb), y: Math.floor(s.year + (st.dev.until - s.week) / 52) }) };
  const vote = o.k === 'reneg' ? [] : votes18(s, o);
  const no = vote.filter((v) => !v.yes);
  if (no.length * 2 > vote.length && !force) return { ok: false, text: fmtL(l('A banda votou contra ({n} de {t}). Assinar mesmo assim derruba a moral de quem votou não.', 'The band voted no ({n} of {t}). Signing anyway hurts the morale of those who voted no.'), { n: no.length, t: vote.length }), vote };
  if (no.length) for (const v of no) { const p = s.persons[v.pid]; if (p) { p.morale = clamp(p.morale - (force ? 10 : 4), 0, 100); p.resentment = clamp(p.resentment + (force ? 12 : 4), 0, 100); } }
  if (o.k === 'dev') { st.dev = { lb: o.lb, stip: o.stip ?? 0, until: s.week + 52, paid: 0, opt: { ...mkRecord(s, new Rng(seedState(`a18dev|${o.id}`)), s.labels[o.lb], a, 0.4, []), id: `${o.id}o` } }; o.st = 'acc'; say(st, s, fmtL(l('Contrato de desenvolvimento com {b}.', 'Development deal with {b}.'), { b: o.who })); return { ok: true, text: fmtL(l('Desenvolvimento com {b}: mesada mensal; eles decidem em até 12 meses.', 'Development with {b}: monthly stipend; they decide within 12 months.'), { b: o.who }) }; }
  if (o.k === 'reneg' && st.deal) return applyReneg(s, o);
  if (o.k === 'buyout' && st.deal) { const old = st.deal.lb; const lbOld = s.labels[old]; if (lbOld) lbOld.cash += o.fee ?? 0; const nl = s.labels[o.lb]; if (nl) nl.cash -= o.fee ?? 0; endDeal18(s, fmtL(l('comprado por {b}', 'bought out by {b}'), { b: o.who }), true); }
  sign18(s, o);
  if (force && no.length) emitFact(s, { kind: 'statement', actors: [a.id, ...no.map((v) => v.pid)], place: a.city, severity: 30, visibility: 'rumor', tags: ['band', 'bad'], text: fmtL(l('{a} assinou com {b} contra a vontade de parte da banda.', '{a} signed with {b} against part of the band\'s wishes.'), { a: a.name, b: o.who }), src: 'artist18' });
  return { ok: true, text: fmtL(l('Assinado com {b}!', 'Signed with {b}!'), { b: o.who }), vote };
}

function sign18(s: GameState, o: Offer18): void {
  const st = a18(s);
  const a = band18(s)!;
  const lb = s.labels[o.lb];
  const cid = nextId(s, 'k');
  const rights = { ...defaultRights(o.model, false), master: o.master, reversionYears: o.rev, scope: o.scope, options: o.opts };
  const home = (s.player.territories[0] ?? 'na') as MarketId;
  const c: Contract = {
    id: cid, actId: a.id, party: o.lb, model: o.model, advance: o.adv, royalty: o.roy, termMonths: o.term, startWeek: s.week, endWeek: s.week + Math.round(o.term * WK),
    releasesOwed: o.albums, releasesDone: 0, creativeControl: o.ar === 'artist', publishing: false, share360: o.s360, recoupBalance: o.adv,
    promises: [], options: o.opts, rights, fameAtSign: a.fame, recouped: 0, clauses18: o.k18, territories: o.scope === 'home' ? [home] : undefined,
  };
  s.contracts[cid] = c;
  a.contractId = cid;
  if (lb) { lb.cash -= o.adv; if (!lb.roster.includes(a.id)) lb.roster.push(a.id); }
  if (o.adv) { post(s, `a18adv:${cid}`, o.adv, 'advances', `Adiantamento de ${o.who}`); led(s, 'adv', o.adv, fmtL(l('Adiantamento de {b} (recuperável)', 'Advance from {b} (recoupable)'), { b: o.who })); commission(s, o.adv, 'adv'); }
  const v0 = value18(s, o).v;
  st.deal = { cid, lb: o.lb, since: s.week, prio: clamp(Math.round(30 + v0 * 30 + a.fame * 0.5), 10, 90), fund: o.fund, fund0: o.fund, pot: 0, potRec: 0, lastRel: s.week, buried: [], push: [], refusals: 0, lastReneg: s.week, lastAudit: s.week, s360: o.s360, mkt: o.mkt, tour: o.k18?.tour ? 1 : 0, pkg: o.pkg, ar: o.ar, v0 };
  o.st = 'acc';
  for (const x of st.offers) if (x.st === 'open' && (x.k === 'record' || x.k === 'dist' || x.k === 'dev' || x.k === 'buyout') && x.id !== o.id) x.st = 'gone';
  st.dev = undefined;
  say(st, s, fmtL(l('Assinaram com {b}.', 'Signed with {b}.'), { b: o.who }));
  remember(s, 'signed', fmtL(l('{a} assina com {b}.', '{a} signs with {b}.'), { a: a.name, b: o.who }), { actId: a.id, important: true });
  emitFact(s, { kind: 'signing', actors: [a.id, o.lb, 'player'], place: a.city, severity: 40 + Math.round(a.fame / 3), visibility: 'public', tags: ['deal', 'artist18'], text: fmtL(l('{a} assina com {b}{x}.', '{a} signs with {b}{x}.'), { a: a.name, b: o.who, x: o.bid ? l(' depois de um leilão', ' after a bidding war') : '' }), src: 'artist18', data: { adv: Math.round(toReal(o.adv, s.year)) } });
}

function applyReneg(s: GameState, o: Offer18): { ok: boolean; text: L } {
  const st = a18(s), d = st.deal!, c = s.contracts[d.cid];
  if (!c) return { ok: false, text: l('Contrato não encontrado.', 'Contract not found.') };
  c.royalty = o.roy; c.endWeek += Math.round(Math.max(0, o.term) * WK); c.releasesOwed += Math.max(0, o.albums);
  if (o.adv) { c.recoupBalance += o.adv; post(s, `a18radv:${o.id}`, o.adv, 'advances', `Bônus de renegociação ${o.who}`); led(s, 'adv', o.adv, l('Bônus de renegociação (recuperável)', 'Renegotiation bonus (recoupable)')); commission(s, o.adv, 'adv'); }
  d.lastReneg = s.week; o.st = 'acc';
  say(st, s, fmtL(l('Contrato com {b} renegociado: royalty {r}%.', 'Deal with {b} renegotiated: royalty {r}%.'), { b: o.who, r: Math.round(o.roy * 100) }));
  return { ok: true, text: fmtL(l('Renegociado: royalty {r}%, prazo estendido.', 'Renegotiated: royalty {r}%, term extended.'), { r: Math.round(o.roy * 100) }) };
}

/** fim do contrato (expirou, dispensa, compra, saída): masters seguem a ficha de direitos */
export function endDeal18(s: GameState, why: L, quiet = false): void {
  const st = a18(s), d = st.deal;
  const a = band18(s);
  if (!d) return;
  const c = s.contracts[d.cid];
  st.deal = undefined;
  if (d.pot || d.potRec) closeStmt(s, d.lb, d, c?.clauses18);
  if (c) {
    st.past.unshift({ cid: c.id, lb: d.lb, from: d.since, to: s.week, why, roy: c.royalty, k: c.clauses18, master: c.rights?.master ?? 'label', rev: c.rights?.reversionYears ?? 0, bal: Math.max(0, c.recoupBalance), pot: 0, potRec: 0 });
    if (st.past.length > 12) st.past.length = 12;
    c.endWeek = Math.min(c.endWeek, s.week);
  }
  if (a && a.contractId === d.cid) a.contractId = undefined;
  const lb = s.labels[d.lb];
  if (lb && a) lb.roster = lb.roster.filter((x) => x !== a.id);
  if (c && (c.rights?.master === 'artist' || c.model === 'distribution')) revert(s, d.lb);
  say(st, s, fmtL(l('Fim do contrato com {b}: {w}.', 'Deal with {b} over: {w}.'), { b: nameOf(s, d.lb), w: why }));
  if (!quiet && a) {
    notify(s, fmtL(l('Contrato com {b} encerrado ({w}). Vocês voltam a ser independentes.', 'Deal with {b} ended ({w}). You are independent again.'), { b: nameOf(s, d.lb), w: why }), 'event');
    emitFact(s, { kind: 'exit', actors: [a.id, d.lb], place: a.city, severity: 35, visibility: 'public', tags: ['deal', 'artist18'], text: fmtL(l('{a} deixa {b} ({w}).', '{a} leaves {b} ({w}).'), { a: a.name, b: nameOf(s, d.lb), w: why }), src: 'artist18' });
  }
}
/** masters de um selo voltam para você */
function revert(s: GameState, lbId: string): number {
  const a = band18(s);
  if (!a) return 0;
  let n = 0;
  for (const id of a.releases) { const r = s.releases[id]; if (r && r.owner === lbId) { r.owner = 'player'; n++; } }
  for (const p of a18(s).past) if (p.lb === lbId) p.back = 1;
  return n;
}

// ---------------------------------------------------------------- prestação de contas

const STMT_M: Record<Clauses18['stmt'], number[]> = { q: [2, 5, 8, 11], s: [5, 11], a: [11] };
function closeStmt(s: GameState, lbId: string, src: { pot: number; potRec: number }, k?: Clauses18): void {
  const st = a18(s);
  const h = hon18(s, lbId);
  const lb = s.labels[lbId];
  const shaved = h < 0.5 ? Math.round(src.pot * (0.5 - h) * 0.35) : 0;
  const lag = k?.lag ?? 3;
  const late = (lb && lb.cash < 0) || (h < 0.4 && hashString(`${s.config.seed}|${lbId}|${s.week}`) % 3 === 0);
  const c = st.deal && st.deal.lb === lbId ? s.contracts[st.deal.cid] : undefined;
  const bal = c ? Math.max(0, c.recoupBalance) : st.past.find((p) => p.lb === lbId)?.bal ?? 0;
  const x: Stmt18 = { lb: lbId, y: s.year, m: s.month, due: s.week + Math.round((lag + (late ? 3 : 0)) * WK), earned: src.pot + shaved + src.potRec, recouped: src.potRec, paid: src.pot - shaved, bal, shaved, st: 'due' };
  if (late) x.late = 1;
  st.shaved += shaved;
  st.stmts.unshift(x);
  if (st.stmts.length > 40) st.stmts.length = 40;
  src.pot = 0; src.potRec = 0;
  if (x.earned > 0 || bal > 0) pushInbox18(s, 'a18_stmt', { from: nameOf(s, lbId), subject: l('Prestação de contas', 'Royalty statement'), tone: x.paid > 0 ? 'good' : 'info',
    body: fmtL(l('Período até {m}/{y}: ganhos {e}, recuperados {r}, a pagar {p} em ~{n} meses. Saldo a recuperar: {b}.{x}', 'Period to {m}/{y}: earned {e}, recouped {r}, payable {p} in ~{n} months. Unrecouped balance: {b}.{x}'),
      { m: s.month + 1, y: s.year, e: fmtMoney(s, x.earned), r: fmtMoney(s, x.recouped), p: fmtMoney(s, x.paid), n: lag + (late ? 3 : 0), b: fmtMoney(s, bal), x: late ? l(' O selo avisou que vai atrasar.', ' The label warned it will be late.') : '' }) });
  if (late) emitFact(s, { kind: 'statement', actors: [lbId, band18(s)?.id ?? 'player'], severity: 25, visibility: 'rumor', tags: ['money', 'bad'], text: fmtL(l('{b} atrasa royalties de artistas.', '{b} is late paying artists\' royalties.'), { b: nameOf(s, lbId) }), src: 'artist18' });
}
function payStmts(s: GameState): void {
  const st = a18(s);
  st.stmts.forEach((x, i) => {
    if (x.st !== 'due' || x.due > s.week) return;
    x.st = 'paid';
    if (x.paid > 0) {
      post(s, `a18stmt:${x.lb}:${x.y}:${x.m}:${i}`, x.paid, 'royalties', `Royalties ${nameOf(s, x.lb)}`);
      led(s, 'roy', x.paid, fmtL(l('Royalties pagos por {b} ({m}/{y})', 'Royalties paid by {b} ({m}/{y})'), { b: nameOf(s, x.lb), m: x.m + 1, y: x.y }));
      commission(s, x.paid, 'roy');
    }
  });
}

ART18.roy = (s, rel, payout, share) => {
  const d = a18(s).deal;
  const act = s.acts[rel.actId];
  if (!d || !act?.playerBand || act.contractId !== d.cid) return false;
  d.pot += payout;
  d.potRec += Math.max(0, share - payout);
  return true;
};
ART18.indie = (s, rel, _net, gross) => {
  if (rel.owner === 'player' || rel.owner === 'indie') return false;
  const p = a18(s).past.find((x) => x.lb === rel.owner && !x.back);
  if (!p) return false;
  const k = p.k;
  const bm = k ? (k.base === 'retail' ? 1.25 : k.base === 'wholesale' ? 1 : 0.88) * (1 - packaging18(s.year, k.base)) : 1;
  let roy = Math.round(gross * p.roy * bm);
  const rec = Math.min(p.bal, roy);
  p.bal -= rec; roy -= rec;
  p.pot += roy; p.potRec += rec;
  const lb = s.labels[rel.owner];
  if (lb) { lb.cash += gross - roy; lb.revenueYear += gross; }
  rel.revenue += gross - roy;
  return true;
};

// ---------------------------------------------------------------- empresário, agente, editora

const FIRST = ['Lou', 'Marty', 'Dee', 'Sandy', 'Ray', 'Gil', 'Nina', 'Vic', 'Rosa', 'Tito', 'Bea', 'Hal'];
const LAST = ['Kramer', 'Silva', 'Duarte', 'Mancini', 'Fields', 'Okafor', 'Brandt', 'Moreau', 'Haddad', 'Lowe'];
function hireMgr(s: GameState, o: Offer18): { ok: boolean; text: L } {
  const st = a18(s), a = band18(s);
  if (!a) return { ok: false, text: l('Sem banda.', 'No band.') };
  if (st.mgr) fireMgr18(s);
  st.mgr = { id: o.mgr ?? o.id, name: o.who, rate: o.rate ?? 0.15, neg: o.neg ?? 50, since: s.week, style: o.style };
  if (o.mgr && REAL_MGRS.some((m) => m.id === o.mgr)) { st.mgr.real = 1; m14(s).rep[a.id] = { m: o.mgr, y: s.year }; }
  o.st = 'acc';
  say(st, s, fmtL(l('{n} agora empresaria vocês ({r}% de comissão).', '{n} now manages you ({r}% commission).'), { n: o.who, r: Math.round((o.rate ?? 0.15) * 100) }));
  emitFact(s, { kind: 'deal', actors: [a.id, o.mgr ? `e:${o.mgr}` : 'mgr'], place: a.city, severity: 20, visibility: 'public', tags: ['manager'], text: fmtL(l('{n} passa a empresariar {a}.', '{n} starts managing {a}.'), { n: o.who, a: a.name }), src: 'artist18' });
  return { ok: true, text: fmtL(l('{n} é seu empresário: lê cada cláusula, negocia e leva vocês às portas certas.', '{n} is your manager: reads every clause, negotiates and opens the right doors.'), { n: o.who }) };
}
/** demitir: cláusula de saída (sunset) — paga 6 meses de comissão média */
export function fireMgr18(s: GameState): L {
  const st = a18(s), a = band18(s);
  if (!st.mgr) return l('Sem empresário.', 'No manager.');
  const avg = Math.round((st.mine.com ?? 0) / Math.max(1, (s.week - st.mgr.since) / WK) * 6);
  if (avg > 0) { post(s, `a18sunset:${s.week}`, -avg, 'legal', 'Saída do empresário (sunset)'); led(s, 'com', -avg, l('Cláusula de saída do empresário', 'Manager sunset clause')); }
  if (a && st.mgr.real) delete m14(s).rep[a.id];
  const n = st.mgr.name;
  st.mgr = undefined; st.mine.com = 0;
  return fmtL(l('{n} deixou de empresariar vocês (sunset: {v}).', '{n} no longer manages you (sunset: {v}).'), { n, v: fmtMoney(s, avg) });
}
export const fireAgent18 = (s: GameState): void => { a18(s).agent = undefined; };
function signPub(s: GameState, o: Offer18): { ok: boolean; text: L } {
  const st = a18(s);
  const t = o.ptype ?? 'admin';
  st.pub = { name: o.who, type: t, take: t === 'admin' ? 0.15 : t === 'copub' ? 0.25 : 0.5, up: t === 'admin' ? 0.18 : t === 'copub' ? 0.22 : 0.28, bal: o.adv, until: s.week + 156, since: s.week };
  if (o.adv) { post(s, `a18padv:${o.id}`, o.adv, 'advances', `Adiantamento de edição ${o.who}`); led(s, 'adv', o.adv, fmtL(l('Adiantamento da editora {b} (recuperável)', 'Advance from publisher {b} (recoupable)'), { b: o.who })); commission(s, o.adv, 'pub'); }
  o.st = 'acc';
  say(st, s, fmtL(l('Contrato de edição com {b} ({t}).', 'Publishing deal with {b} ({t}).'), { b: o.who, t: PTYPE18[t] }));
  return { ok: true, text: fmtL(l('Suas músicas agora são editadas por {b}.', 'Your songs are now published by {b}.'), { b: o.who }) };
}
export const PTYPE18: Record<'admin' | 'copub' | 'full', L> = { admin: l('administração', 'administration'), copub: l('coedição', 'co-publishing'), full: l('edição integral', 'full publishing') };

function commission(s: GameState, base: number, why: string): void {
  const st = a18(s);
  if (!st.mgr || base <= 0) return;
  const v = Math.round(base * st.mgr.rate);
  if (!v) return;
  post(s, `a18com:${why}:${s.week}:${base}`, -v, 'management', `Comissão do empresário ${st.mgr.name}`);
  st.mine.com = (st.mine.com ?? 0) + v;
  led(s, 'com', -v, fmtL(l('Comissão de {n} ({r}%)', '{n}\'s commission ({r}%)'), { n: st.mgr.name, r: Math.round(st.mgr.rate * 100) }));
}

// ---------------------------------------------------------------- mês

const tot = (s: GameState, k: string) => s.player.totals[k] ?? 0;
function deltas(s: GameState): Record<string, number> {
  const st = a18(s);
  const out: Record<string, number> = {};
  for (const k of ['live', 'merch', 'brands', 'publishing']) {
    const now = tot(s, k) - (st.mine[k] ?? 0);
    out[k] = st.last[k] === undefined ? 0 : Math.max(0, now - st.last[k]);
    st.last[k] = now;
  }
  return out;
}
function mine(s: GameState, k: string, v: number): void { const st = a18(s); st.mine[k] = (st.mine[k] ?? 0) + v; }

function scout(s: GameState, r: Rng, a: Act): void {
  const st = a18(s);
  const open = openOffers18(s).filter((o) => o.k === 'record' || o.k === 'dist' || o.k === 'dev').length;
  if (open >= 4 || st.dev) return;
  const c = ctx18(s, a);
  let made = 0;
  const labels = Object.values(s.labels).filter((lb) => lb.active && lb.founded <= s.year && lb.cash > money(s, 30000) && !st.offers.some((o) => o.lb === lb.id && o.st === 'open'));
  for (const lb of r.shuffle(labels)) {
    if (made >= 2) break;
    const { v, why } = interest18(s, lb, a, c);
    const p = clamp((v - 0.28) * 0.35 * (0.6 + lb.aggression), 0, 0.18);
    if (p > 0 && r.chance(p)) {
      made++;
      const dev = lb.strategy === 'develop' && a.fame < 22 && r.chance(0.35);
      const dist = !dev && (lb.family === 'C' || lb.family === 'D') && r.chance(0.3);
      if (dev) { const o = mkRecord(s, r, lb, a, v, why, 'dev'); o.stip = r100(s, exp18(s, a) * 0.05); o.adv = 0; addOffer(s, o); }
      else addOffer(s, dist ? mkDist(s, r, lb, a, why) : mkRecord(s, r, lb, a, v, why));
      emitFact(s, { kind: 'deal', actors: [lb.id, a.id], place: a.city, severity: 15, visibility: 'rumor', tags: ['scouting', 'artist18'], text: fmtL(l('{b} está de olho em {a}.', '{b} has its eye on {a}.'), { b: lb.name, a: a.name }), src: 'artist18' });
    } else if (v > 0.18 && v <= 0.36 && (st.cd.show ?? 0) <= s.week && r.chance(0.025)) {
      st.cd.show = s.week + 26;
      pushInbox18(s, 'a18_show', { from: lb.name, subject: fmtL(l('{b} convida para um showcase', '{b} invites you to a showcase'), { b: lb.name }), body: fmtL(l('O A&R de {b} quer ver vocês ao vivo antes de decidir. Viagem e cachê por sua conta ({c}). Se for bem, propostas chegam; se for mal, a porta fecha por um tempo.', '{b}\'s A&R wants to see you live before deciding. Travel and fees on you ({c}). Go well and offers follow; go badly and the door shuts for a while.'), { b: lb.name, c: fmtMoney(s, money(s, 250 * a.members.length)) }), ref: { lb: lb.id }, actions: [{ id: 'go', label: l('Tocar', 'Play') }, { id: 'skip', label: l('Recusar', 'Decline') }] });
    }
  }
}
/** showcase: a banda toca para o A&R */
export function showcase18(s: GameState, lbId: string, r?: Rng): L {
  const a = band18(s);
  if (!a) return l('Sem banda.', 'No band.');
  const cost = money(s, 250 * a.members.length);
  post(s, `a18show:${lbId}:${s.week}`, -cost, 'live_costs', 'Showcase para selo');
  r ??= new Rng(seedState(`a18sh|${s.config.seed}|${lbId}|${s.week}`));
  const stage = a.members.map((id) => s.persons[id]?.skills.stage ?? 40).reduce((t, x) => t + x, 0) / Math.max(1, a.members.length);
  const p = clamp(0.3 + stage / 200 + a.momentum / 300, 0.15, 0.85);
  const ok = r.chance(p);
  a18(s).boost[lbId] = [s.week + (ok ? 12 : 26), ok ? 0.22 : -0.15];
  emitFact(s, { kind: 'show', actors: [a.id, lbId], place: a.city, severity: 15, visibility: 'rumor', tags: ['showcase', ok ? 'good' : 'bad'], text: fmtL(ok ? l('{a} arrasa no showcase para {b}.', '{a} kills it at the showcase for {b}.') : l('{a} tropeça no showcase para {b}.', '{a} stumbles at the showcase for {b}.'), { a: a.name, b: nameOf(s, lbId) }), src: 'artist18' });
  if (ok) a.momentum = clamp(a.momentum + 4, 0, 100);
  return fmtL(ok ? l('Showcase ótimo ({p}% de chance): {b} deve mandar proposta.', 'Great showcase ({p}% chance): {b} should send an offer.') : l('Showcase fraco ({p}% de chance): {b} esfriou.', 'Weak showcase ({p}% chance): {b} cooled off.'), { p: Math.round(p * 100), b: nameOf(s, lbId) });
}

function representation(s: GameState, r: Rng, a: Act): void {
  const st = a18(s);
  const open = (k: OK18) => st.offers.some((o) => o.k === k && o.st === 'open' && o.until >= s.week);
  const fam = familyOf(a.genre);
  if (!st.mgr && a.fame >= 6 && !open('mgr') && r.chance(0.04 + a.fame / 700)) {
    const reals = REAL_MGRS.filter((m) => mgrActive(s, m) && m.fam.includes(fam));
    const m: RealMgr | undefined = a.fame >= 18 && reals.length && r.chance(0.6) ? r.pick(reals) : undefined;
    const o: Offer18 = { ...blank(s, 'mgr'), who: m ? mgrName(s, m) : `${r.pick(FIRST)} ${r.pick(LAST)}`, mgr: m?.id, rate: m ? m.rate : Math.round((0.12 + r.next() * 0.08) * 100) / 100, neg: m ? m.a[1] : r.int(35, 70), style: m?.style ?? r.pick(['shark', 'guardian', 'impresario', 'svengali', 'muscle']) };
    o.why = [m ? l('empresário de verdade, com histórico', 'a real manager with a track record') : l('empresário em começo de carreira', 'an up-and-coming manager')];
    st.offers.unshift(o);
    pushInbox18(s, 'a18_rep', { from: o.who, subject: fmtL(l('{n} quer empresariar vocês', '{n} wants to manage you'), { n: o.who }), body: fmtL(l('Comissão de {r}% sobre adiantamentos, royalties, shows e edição. Negocia (habilidade {g}), lê contratos e atrai selos.', '{r}% commission on advances, royalties, shows and publishing. Negotiates (skill {g}), reads contracts and attracts labels.'), { r: Math.round((o.rate ?? 0) * 100), g: o.neg ?? 50 }), ref: { o: o.id }, actions: [{ id: 'accept', label: l('Contratar', 'Hire') }, { id: 'decline', label: l('Recusar', 'Decline') }] });
  }
  if (!st.agent && a.fame >= 10 && !open('agent') && r.chance(0.035)) {
    const o: Offer18 = { ...blank(s, 'agent'), who: `${r.pick(FIRST)} ${r.pick(LAST)} Booking`, rate: Math.round((0.1 + r.next() * 0.05) * 100) / 100, boost: Math.round((0.08 + r.next() * 0.12) * 100) / 100 };
    st.offers.unshift(o);
    pushInbox18(s, 'a18_rep', { from: o.who, subject: l('Agência de shows quer vocês', 'Booking agency wants you'), body: fmtL(l('Cachês {b}% maiores por {r}% de comissão sobre shows.', 'Show fees {b}% higher for a {r}% commission on shows.'), { b: Math.round((o.boost ?? 0) * 100), r: Math.round((o.rate ?? 0) * 100) }), ref: { o: o.id }, actions: [{ id: 'accept', label: l('Assinar', 'Sign') }, { id: 'decline', label: l('Recusar', 'Decline') }] });
  }
  if (!st.pub && a.releases.length && a.fame >= 8 && !open('pub') && r.chance(0.035)) {
    const pubs = Object.values(s.labels).filter((x) => x.active && (x.family === 'D' || x.family === 'A'));
    const who = pubs.length ? `${r.pick(pubs).name} Publishing` : `${r.pick(LAST)} Music Publishing`;
    const t: 'admin' | 'copub' | 'full' = a.fame >= 15 && r.chance(0.5) ? 'copub' : a.fame < 25 && r.chance(0.25) ? 'full' : 'admin';
    const exp = exp18(s, a);
    const o: Offer18 = { ...blank(s, 'pub'), who, ptype: t, adv: t === 'admin' ? 0 : r100(s, exp * (t === 'copub' ? 0.6 : 1.1)) };
    st.offers.unshift(o);
    pushInbox18(s, 'a18_rep', { from: who, subject: fmtL(l('Editora oferece {t}', 'Publisher offers {t}'), { t: PTYPE18[t] }), body: fmtL(l('{t}: a editora fica com {p}% da sua edição, arrecada melhor no exterior (+{u}%) e oferece suas músicas para sync. Adiantamento: {a}.', '{t}: the publisher keeps {p}% of your publishing, collects better abroad (+{u}%) and pitches your songs for sync. Advance: {a}.'), { t: PTYPE18[t], p: t === 'admin' ? 15 : t === 'copub' ? 25 : 50, u: t === 'admin' ? 18 : t === 'copub' ? 22 : 28, a: fmtMoney(s, o.adv) }), ref: { o: o.id }, actions: [{ id: 'accept', label: l('Assinar', 'Sign') }, { id: 'decline', label: l('Recusar', 'Decline') }] });
  }
}
const blank = (s: GameState, k: OK18): Offer18 => ({ id: nextId(s, 'ao'), k, lb: '', who: '', w: s.week, until: s.week + 8, st: 'open', model: 'classic', pkg: k, adv: 0, fund: 0, roy: 0, term: 0, opts: 0, albums: 0, master: 'artist', rev: 0, s360: 0, scope: 'world', ar: 'artist', mkt: 0, rounds: 0, mood: 0.6, why: [] });

/** decisões do selo enquanto vocês estão sob contrato */
function labelMonth(s: GameState, r: Rng, a: Act, dl: Record<string, number>): void {
  const st = a18(s), d = st.deal!;
  const c = s.contracts[d.cid];
  const lb = s.labels[d.lb];
  if (!c || !lb) return;
  const k = c.clauses18;
  // prioridade deriva para o que o selo enxerga: fama, recuperado, sucessos
  const base = 30 + a.fame * 0.6 + (c.recoupBalance <= 0 ? 12 : 0) - (a.momentum < 20 ? 6 : 0);
  d.prio = clamp(d.prio + (base - d.prio) * 0.08, 0, 100);
  // prestação de contas
  if (STMT_M[k?.stmt ?? 's'].includes(s.month)) closeStmt(s, d.lb, d, k);
  // 360
  if (d.s360) {
    const base360 = dl.live + dl.merch + dl.brands;
    const cut = Math.round(base360 * d.s360 * clamp(1 - a.fame / 200, 0.5, 1));
    if (cut > 0) { post(s, `a18_360:${s.year}:${s.month}`, -cut, 'live', `360: parte de ${lb.name}`); mine(s, 'live', -cut); lb.cash += cut; led(s, '360', -cut, fmtL(l('360: {p}% de shows/merch/patrocínio para {b}', '360: {p}% of live/merch/sponsorship to {b}'), { p: Math.round(d.s360 * 100), b: lb.name })); }
  }
  // pressão do A&R: muito tempo sem disco
  const idle = (s.week - d.lastRel) / WK;
  if (idle > 14 && !d.demand && (st.cd.deliver ?? 0) <= s.week) {
    d.demand = s.week + 26; st.cd.deliver = s.week + 40;
    pushInbox18(s, 'a18_deliver', { from: lb.name, subject: l('O A&R cobra um disco', 'The A&R demands a record'), tone: 'bad', body: fmtL(l('Faz {n} meses sem lançamento. {b} quer um disco em 6 meses — ou suspende o contrato (o prazo congela) e pode dispensar vocês.', 'It has been {n} months without a release. {b} wants a record within 6 months — or suspends the deal (the term freezes) and may drop you.'), { n: Math.round(idle), b: lb.name }), actions: [{ id: 'promise', label: l('Prometer o disco', 'Promise the record') }, { id: 'time', label: l('Pedir mais tempo', 'Ask for more time') }, { id: 'refuse', label: l('Recusar a pressão', 'Push back') }] });
  }
  if (d.demand && d.demand < s.week) {
    d.demand = undefined; d.refusals++;
    c.endWeek += 26; d.prio -= 15;
    say(st, s, fmtL(l('{b} suspendeu o contrato: sem disco no prazo, o termo congelou 6 meses.', '{b} suspended the deal: no record in time, the term froze 6 months.'), { b: lb.name }));
    notify(s, fmtL(l('{b} suspendeu o contrato (prazo +6 meses).', '{b} suspended your deal (term +6 months).'), { b: lb.name }), 'bad');
    if (d.refusals >= 2 && c.recoupBalance > 0) fileLawsuit(s, { kind: 'contract', plaintiff: lb.name, defendant: 'player', actId: a.id, claim: Math.round(c.recoupBalance * 0.3), odds: 0.45, text: fmtL(l('{b} processa {a} por não entregar os discos do contrato.', '{b} sues {a} for failing to deliver the records owed.'), { b: lb.name, a: a.name }) });
  }
  // disco na fila: o A&R mete a mão (single, imagem) ou o selo adia
  const pend = s.pendingReleases.find((p) => p.actId === a.id && p.week > s.week);
  if (pend && (st.cd[`ar:${pend.id}`] ?? 0) === 0) {
    st.cd[`ar:${pend.id}`] = 1;
    if (d.prio < 25 && r.chance(0.35)) {
      pend.week += 8;
      pushInbox18(s, 'a18_info', { from: lb.name, subject: l('O selo adiou o seu disco', 'The label pushed back your record'), tone: 'bad', body: fmtL(l('"Agenda cheia": "{t}" sai 2 meses depois. Prioridade de vocês no selo: {p}/100.', '"Crowded schedule": "{t}" comes out 2 months later. Your priority at the label: {p}/100.'), { t: pend.title, p: Math.round(d.prio) }) });
    } else if (d.ar !== 'artist' && r.chance(d.ar === 'label' ? 0.4 : 0.2)) {
      const kind = r.pick(['single', 'image', 'producer'] as const);
      pushInbox18(s, 'a18_ar', { from: lb.name, subject: kind === 'single' ? l('O A&R quer outro single', 'The A&R wants a different single') : kind === 'image' ? l('O selo pede mudança de imagem', 'The label asks for an image change') : l('O selo quer um produtor da moda', 'The label wants a hot producer'), ref: { pr: pend.id, kind },
        body: fmtL(kind === 'single' ? l('Para "{t}", o A&R escolheu a faixa mais radiofônica como single. Ceder dá mais execução; a banda acha que trai o disco.', 'For "{t}", the A&R picked the most radio-friendly track as single. Giving in means more airplay; the band thinks it betrays the record.')
          : kind === 'image' ? l('Antes de "{t}", o selo quer figurino, fotos e postura mais comerciais. Mais alcance; os fãs antigos torcem o nariz.', 'Before "{t}", the label wants more commercial styling, photos and attitude. More reach; old fans frown.')
            : l('Para "{t}", o selo quer remixar com um produtor famoso. Som mais polido; menos de vocês no disco.', 'For "{t}", the label wants a famous producer to remix it. Slicker sound; less of you on the record.'), { t: pend.title }),
        actions: [{ id: 'comply', label: l('Ceder', 'Give in') }, { id: 'split', label: l('Negociar meio-termo', 'Negotiate a compromise') }, { id: 'refuse', label: l('Recusar', 'Refuse') }] });
    }
  }
  // fim do prazo: exerce opção, propõe renovação ou deixa vencer
  const left = c.endWeek - s.week;
  if (left <= 6 && (st.cd[`end:${c.id}:${c.endWeek}`] ?? 0) === 0) {
    st.cd[`end:${c.id}:${c.endWeek}`] = 1;
    const wants = d.prio >= 40 || a.fame >= (c.fameAtSign ?? 0) + 10 || c.recoupBalance <= 0;
    if (wants && (c.options ?? 0) > 0) {
      c.options = (c.options ?? 0) - 1; c.endWeek += 52; c.releasesOwed += 1;
      const pay = r100(s, exp18(s, a) * 0.3);
      c.recoupBalance += pay; lb.cash -= pay;
      post(s, `a18opt:${c.id}:${c.options}`, pay, 'advances', `Opção exercida por ${lb.name}`); led(s, 'adv', pay, fmtL(l('{b} exerceu a opção (+1 ano, +1 disco)', '{b} exercised the option (+1 year, +1 record)'), { b: lb.name })); commission(s, pay, 'opt');
      pushInbox18(s, 'a18_info', { from: lb.name, subject: l('O selo exerceu a opção', 'The label exercised its option'), body: fmtL(l('{b} decidiu ficar com vocês por mais um ano (cláusula de opção): +1 disco devido, adiantamento de opção {v}. Opções restantes: {n}.', '{b} chose to keep you another year (option clause): +1 record owed, option payment {v}. Options left: {n}.'), { b: lb.name, v: fmtMoney(s, pay), n: c.options ?? 0 }) });
    } else if (wants) {
      const o: Offer18 = { ...blank(s, 'reneg'), lb: lb.id, who: lb.name, roy: Math.round((c.royalty + 0.02) * 100) / 100, term: 36, albums: 2, adv: r100(s, exp18(s, a) * 0.6), model: c.model, until: s.week + 6 };
      o.why = [l('querem renovar antes que outro selo leve vocês', 'they want to renew before another label takes you')];
      addOffer(s, o);
    } else endDeal18(s, l('o contrato venceu e o selo não renovou', 'the deal expired and the label did not renew'));
  }
  // revisão anual: dispensa
  if (s.month === 0 && st.deal && s.week - d.since > 60 && d.prio < 22 && c.recoupBalance > c.advance * 0.6 && (st.cd.drop ?? 0) <= s.week) {
    st.cd.drop = s.week + 52;
    pushInbox18(s, 'a18_drop', { from: lb.name, subject: l('O selo vai dispensar vocês', 'The label is dropping you'), tone: 'bad', body: fmtL(l('Vendas abaixo do esperado e {b} a recuperar. {l} encerra o contrato. Dá para pedir os masters de volta, implorar mais uma chance ou sair em silêncio.', 'Sales below expectations and {b} unrecouped. {l} is ending the deal. You can ask for the masters back, beg for one more shot or leave quietly.'), { b: fmtMoney(s, c.recoupBalance), l: lb.name }), actions: [{ id: 'masters', label: l('Pedir os masters', 'Ask for the masters') }, { id: 'plead', label: l('Pedir mais uma chance', 'Plead for one more shot') }, { id: 'accept', label: l('Sair', 'Leave') }] });
  }
  // outro selo quer comprar o contrato
  if (a.fame > 28 && r.chance(0.025) && !openOffers18(s).some((o) => o.k === 'buyout')) {
    const rivals = Object.values(s.labels).filter((x) => x.active && x.id !== lb.id && x.cash > money(s, 500000) && (x.family === 'A' || x.strategy === 'stars'));
    if (rivals.length) {
      const nl = r.pick(rivals);
      const o = mkRecord(s, r, nl, a, 0.7, [l('querem vocês já, e pagam a saída', 'they want you now, and pay your way out')], 'buyout');
      o.fee = Math.round(Math.max(c.recoupBalance, 0) * 1.1 + r100(s, exp18(s, a) * 0.5));
      o.adv = Math.round(o.adv * 1.15);
      addOffer(s, o);
    }
  }
  // selo propõe renegociar quando vocês estouraram
  if (a.fame >= (c.fameAtSign ?? 0) + 20 && s.week - d.lastReneg > 52 && r.chance(0.06) && !openOffers18(s).some((o) => o.k === 'reneg')) {
    const o: Offer18 = { ...blank(s, 'reneg'), lb: lb.id, who: lb.name, roy: Math.round((c.royalty + 0.03) * 100) / 100, term: 24, albums: 1, adv: r100(s, exp18(s, a) * 0.4), model: c.model };
    o.why = [l('vocês cresceram; o selo quer estender o contrato em troca de royalty melhor', 'you grew; the label wants to extend the deal for a better royalty')];
    addOffer(s, o);
  }
}

registerSimHook('launch', 'artist18', (s, _r, arg) => {
  const rel = arg.release;
  const st = a18(s), d = st.deal;
  const a = band18(s);
  if (!rel || !d || !a || rel.actId !== a.id) return;
  const c = s.contracts[d.cid];
  const lb = s.labels[d.lb];
  if (!c || !lb) return;
  d.lastRel = s.week; d.demand = undefined; d.fund = d.fund0;
  const r = new Rng(seedState(`a18l|${s.config.seed}|${rel.id}`));
  if (d.prio < 22 && r.chance(0.55)) {
    d.buried.push(rel.id); if (d.buried.length > 12) d.buried.shift();
    pushInbox18(s, 'a18_buried', { from: lb.name, subject: fmtL(l('"{t}" saiu sem divulgação', '"{t}" came out with no promotion'), { t: rel.title }), tone: 'bad', ref: { rel: rel.id }, body: fmtL(l('Prioridade de vocês no selo: {p}/100. O disco saiu "enterrado" (−20% nas paradas). Dá para bancar a divulgação do próprio bolso ({c}) ou reclamar.', 'Your priority at the label: {p}/100. The record came out "buried" (−20% on the charts). You can fund promotion yourselves ({c}) or complain.'), { p: Math.round(d.prio), c: fmtMoney(s, r100(s, exp18(s, a) * 0.4)) }), actions: [{ id: 'pay', label: l('Bancar a divulgação', 'Fund the promotion') }, { id: 'complain', label: l('Reclamar', 'Complain') }, { id: 'accept', label: l('Aceitar', 'Accept') }] });
    return;
  }
  const k = c.clauses18;
  const M = r100(s, (1500 + d.prio * labelClout(s, d.lb) * 120) * (rel.type === 'single' ? 0.6 : 1)) + (k?.promo ? money(s, k.promo) : 0);
  lb.cash -= M;
  rel.marketingE = Math.min(0.95, rel.marketingE + 0.04 + d.prio / 1000);
  a.momentum = clamp(a.momentum + 3 + d.prio / 20, 0, 100);
  const rec = Math.round(M * (k?.mkt ?? 0));
  if (rec) c.recoupBalance += rec;
  led(s, 'mkt', 0, fmtL(l('{b} investiu {m} em divulgação de "{t}" ({r} recuperável)', '{b} spent {m} promoting "{t}" ({r} recoupable)'), { b: lb.name, m: fmtMoney(s, M), t: rel.title, r: fmtMoney(s, rec) }));
});

// fundo de gravação e apoio de turnê: o selo paga (adiantamento recuperável)
postHooks18().push((s, key, amount, cat) => {
  if (amount >= 0) return;
  const st = a18(s), d = st.deal, a = band18(s);
  if (!d || !a) return;
  const c = s.contracts[d.cid];
  if (!c) return;
  if (cat === 'recording' && (key.startsWith(`rec:${a.id}:`) || key.startsWith(`session:${a.id}:`)) && d.fund > 0) {
    const v = Math.min(-amount, d.fund);
    d.fund -= v;
    if (!post(s, `a18fund:${key}`, v, 'advances', `Fundo de gravação ${nameOf(s, d.lb)}`)) return;
    const frac = c.clauses18?.rec ?? 0.5;
    c.recoupBalance = Math.max(0, c.recoupBalance + Math.round(v * frac) - (key.startsWith('rec:') ? Math.round(-amount * 0.5) : 0));
    led(s, 'rec', v, fmtL(l('Fundo de gravação de {b} ({p}% recuperável)', 'Recording fund from {b} ({p}% recoupable)'), { b: nameOf(s, d.lb), p: Math.round(frac * 100) }));
  } else if (cat === 'live_costs' && key.startsWith('tour:') && s.tours.find((t) => key === `tour:${t.id}` && t.actId === a.id)) {
    const cap = r100(s, 1500 + labelClout(s, d.lb) * 6000);
    const v = Math.min(Math.round(-amount * (d.tour ? 0.5 : 0.25)), cap);
    if (v <= 0 || !post(s, `a18tour:${key}`, v, 'advances', `Apoio de turnê ${nameOf(s, d.lb)}`)) return;
    if (d.tour) c.recoupBalance += v;
    led(s, 'tour', v, fmtL(l('Apoio de turnê de {b}{r}', 'Tour support from {b}{r}'), { b: nameOf(s, d.lb), r: d.tour ? l(' (recuperável)', ' (recoupable)') : '' }));
  }
});

registerMod('chartUnits', 'artist18', (s, v, ctx) => {
  const d = (s.x4 as unknown as { artist18?: Art18 }).artist18?.deal;
  const id = ctx.release?.id;
  if (!d || !id) return null;
  if (d.buried.includes(id)) return { value: v * 0.8, label: l('Disco enterrado pelo selo', 'Record buried by the label') };
  if (d.push.includes(id)) return { value: v * 1.1, label: l('Single escolhido pelo A&R', 'A&R-picked single') };
  return null;
});
registerMod('showRevenue', 'artist18', (s, v, ctx) => {
  const st = (s.x4 as unknown as { artist18?: Art18 }).artist18;
  if (!st || !ctx.act?.playerBand || (!st.agent && !st.mgr)) return null;
  const b = (st.agent?.boost ?? 0) + (st.mgr ? 0.06 : 0);
  return { value: v * (1 + b), label: st.agent ? l('Agente de shows', 'Booking agent') : l('Empresário negocia cachês', 'Manager negotiates fees') };
});

function otherMoney(s: GameState, r: Rng, a: Act, dl: Record<string, number>): void {
  const st = a18(s);
  // comissões sobre shows, patrocínio e edição
  if (st.mgr) commission(s, Math.round(dl.live * 0.5) + dl.brands + dl.publishing, 'm'); // shows: comissão sobre o líquido da turnê (~metade)
  if (st.agent && dl.live > 0) { const v = Math.round(dl.live * st.agent.rate); post(s, `a18ag:${s.year}:${s.month}`, -v, 'live_costs', `Agente ${st.agent.name}`); led(s, 'agent', -v, fmtL(l('Comissão do agente {n}', 'Agent {n}\'s commission'), { n: st.agent.name })); }
  // editora: parte do editor, recuperação do adiantamento e arrecadação melhor
  const pb = st.pub;
  if (pb && dl.publishing > 0) {
    const up = Math.round(dl.publishing * pb.up);
    let take = Math.round((dl.publishing + up) * pb.take);
    const left = dl.publishing + up - take;
    const rec = Math.min(pb.bal, left);
    pb.bal -= rec; take += rec;
    const net = up - take;
    if (net) { post(s, `a18pub:${s.year}:${s.month}`, net, 'publishing', `Editora ${pb.name}`); mine(s, 'publishing', net); led(s, 'pub', net, fmtL(l('Editora {n}: arrecadação +{u}, parte do editor e recuperação −{t}', 'Publisher {n}: collection +{u}, publisher share and recoupment −{t}'), { n: pb.name, u: fmtMoney(s, up), t: fmtMoney(s, take) })); }
  }
  if (pb && pb.type !== 'admin' && r.chance(0.02 + a.fame / 2500)) {
    const fee = r100(s, 2000 + a.fame * 150);
    post(s, `a18sync:${s.week}`, Math.round(fee * 0.5), 'sync', `Sync via ${pb.name}`); mine(s, 'publishing', 0);
    led(s, 'sync', Math.round(fee * 0.5), fmtL(l('{n} colocou uma música em comercial/filme (sua metade)', '{n} placed a song in an ad/film (your half)'), { n: pb.name }));
    a.fame = clamp(a.fame + 0.4, 0, 100);
  }
  if (pb && pb.until < s.week && pb.bal <= 0) { say(st, s, fmtL(l('Contrato de edição com {n} terminou.', 'Publishing deal with {n} ended.'), { n: pb.name })); st.pub = undefined; }
  // desenvolvimento: mesada e decisão do selo
  const dv = st.dev;
  if (dv) {
    if (dv.stip) { post(s, `a18dev:${s.year}:${s.month}`, dv.stip, 'advances', `Mesada de desenvolvimento ${nameOf(s, dv.lb)}`); dv.paid += dv.stip; led(s, 'dev', dv.stip, l('Mesada do contrato de desenvolvimento (recuperável se assinarem)', 'Development stipend (recoupable if you sign)')); }
    const lb = s.labels[dv.lb];
    const v = lb ? interest18(s, lb, a).v : 0;
    if (lb && (v > 0.42 || (dv.until <= s.week && v > 0.3))) {
      const o = { ...dv.opt, adv: dv.opt.adv, until: s.week + 1, st: 'open' as const };
      st.offers.unshift(o);
      st.dev = undefined;
      sign18(s, o);
      const c = st.deal ? s.contracts[st.deal.cid] : undefined;
      if (c) c.recoupBalance += dv.paid;
      pushInbox18(s, 'a18_info', { from: lb.name, subject: l('O selo exerceu a opção de desenvolvimento', 'The label exercised the development option'), tone: 'good', body: fmtL(l('{b} gostou do que viu: vocês estão contratados nos termos combinados (a mesada entra no recuperável).', '{b} liked what it saw: you are signed on the pre-agreed terms (the stipend joins the recoupable balance).'), { b: lb.name }) });
    } else if (dv.until <= s.week) {
      st.dev = undefined;
      say(st, s, fmtL(l('{b} não exerceu a opção: vocês estão livres.', '{b} passed on the option: you are free.'), { b: nameOf(s, dv.lb) }));
    }
  }
}

function suits(s: GameState, r: Rng): void {
  const st = a18(s);
  for (const x of st.suits) {
    if (x.ruling > s.week || !x.claim) continue;
    const win = r.chance(x.odds);
    if (win) { post(s, `a18suit:${x.lb}:${x.ruling}`, x.claim, 'legal', `Sentença contra ${nameOf(s, x.lb)}`); led(s, 'legal', x.claim, fmtL(l('Ganhou o processo contra {b}', 'Won the suit against {b}'), { b: nameOf(s, x.lb) })); if (st.deal?.lb === x.lb) endDeal18(s, l('a Justiça rescindiu o contrato', 'the court terminated the deal')); }
    else led(s, 'legal', 0, fmtL(l('Perdeu o processo contra {b}', 'Lost the suit against {b}'), { b: nameOf(s, x.lb) }));
    emitFact(s, { kind: 'case_ruling', actors: ['player', x.lb], severity: 45, visibility: 'public', tags: ['legal', win ? 'good' : 'bad'], text: fmtL(win ? l('Justiça dá razão a {a} contra {b}.', 'Court rules for {a} against {b}.') : l('Justiça dá razão a {b} contra {a}.', 'Court rules for {b} against {a}.'), { a: band18(s)?.name ?? s.config.companyName, b: nameOf(s, x.lb) }), src: 'artist18' });
    x.claim = 0;
  }
  st.suits = st.suits.filter((x) => x.claim);
}

/** o selo foi vendido/absorvido: vocês vão junto com o catálogo */
function successor(s: GameState, a: Act): void {
  const st = a18(s), d = st.deal;
  if (a.owner !== 'player') a.owner = 'player';
  if (!d) return;
  if (s.labels[d.lb]?.active) return;
  const rels = a.releases.map((id) => s.releases[id]).filter((x) => x && x.owner !== d.lb && s.labels[x.owner]?.active).sort((x, y) => y.week - x.week);
  const to = rels[0]?.owner ?? Object.values(s.labels).filter((x) => x.active && x.family === 'A').sort((x, y) => y.cash - x.cash)[0]?.id;
  const c = s.contracts[d.cid];
  if (!to || !c) { endDeal18(s, l('o selo fechou', 'the label closed')); return; }
  const old = d.lb;
  c.party = to; d.lb = to; d.prio = clamp(d.prio - 20, 0, 100);
  for (const p of st.past) if (p.lb === old) p.lb = to;
  for (const x of st.stmts) if (x.lb === old && x.st === 'due') x.lb = to;
  pushInbox18(s, 'a18_merge', { from: nameOf(s, to), subject: fmtL(l('{o} foi absorvido por {n}', '{o} was absorbed by {n}'), { o: nameOf(s, old), n: nameOf(s, to) }), tone: 'bad', body: fmtL(l('Seu contrato e seus masters foram junto com o catálogo para {n}. Na fusão, vocês caíram na fila de prioridades (−20). Dá para pedir a liberação ("cláusula de pessoa-chave") ou ficar.', 'Your deal and masters went with the catalog to {n}. In the merger you dropped down the priority list (−20). You can ask to be released ("key person" clause) or stay.'), { n: nameOf(s, to) }), actions: [{ id: 'release', label: l('Pedir liberação', 'Ask to be released') }, { id: 'stay', label: l('Ficar', 'Stay') }] });
  emitFact(s, { kind: 'label_sold', actors: [old, to, a.id], severity: 40, visibility: 'public', tags: ['deal', 'artist18'], text: fmtL(l('{a} vai parar em {n} depois da venda de {o}.', '{a} ends up at {n} after {o} is sold.'), { a: a.name, n: nameOf(s, to), o: nameOf(s, old) }), src: 'artist18' });
}

function month(s: GameState): void {
  const a = band18(s);
  if (!a || s.config.role !== 'artist') return;
  const st = a18(s);
  const dl = deltas(s);
  s.flags.art18 = 1;
  const r = new Rng(seedState(`a18|${s.config.seed}|${s.year}|${s.month}`));
  successor(s, a);
  for (const o of st.offers) if (o.st === 'open' && o.until < s.week) o.st = 'exp';
  // contrato vigente que não é deste sistema (evento antigo) ou já vencido
  if (st.deal && a.contractId !== st.deal.cid) endDeal18(s, l('o contrato terminou', 'the deal ended'), true);
  if (st.deal) labelMonth(s, r, a, dl); else scout(s, r, a);
  representation(s, r, a);
  otherMoney(s, r, a, dl);
  // masters de contratos antigos: reversão no prazo; prestações de contas dos antigos
  for (const p of st.past) {
    if (!p.back && p.rev && s.week >= p.to + p.rev * 52) { const n = revert(s, p.lb); if (n) say(st, s, fmtL(l('{n} master(s) voltaram de {b}.', '{n} master(s) came back from {b}.'), { n, b: nameOf(s, p.lb) })); }
    if ((p.pot || p.potRec) && STMT_M[p.k?.stmt ?? 's'].includes(s.month)) closeStmt(s, p.lb, p, p.k);
  }
  payStmts(s);
  suits(s, r);
}
registerSimHook('month', 'artist18', (s) => month(s));

// ---------------------------------------------------------------- ações do jogador sob contrato

export function auditCost18(s: GameState): number { const k = a18(s).deal ? s.contracts[a18(s).deal!.cid]?.clauses18 : undefined; return money(s, k?.audit ? 3500 : 9000); }
export function auditBlock18(s: GameState): L | null {
  const st = a18(s);
  if (!st.deal && !st.past.length) return l('Sem contrato para auditar.', 'No deal to audit.');
  if ((st.cd.audit ?? 0) > s.week) return l('Auditoria recente (uma por ano).', 'Recent audit (once a year).');
  if (s.player.cash < auditCost18(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
/** auditoria dos livros do selo: acha o que foi "arredondado" */
export function audit18(s: GameState, r?: Rng): L {
  const b = auditBlock18(s);
  if (b) return b;
  const st = a18(s);
  const lbId = st.deal?.lb ?? st.past[0].lb;
  const k = st.deal ? s.contracts[st.deal.cid]?.clauses18 : st.past[0].k;
  const cost = auditCost18(s);
  post(s, `a18audit:${s.week}`, -cost, 'legal', `Auditoria de ${nameOf(s, lbId)}`);
  led(s, 'legal', -cost, fmtL(l('Auditoria dos livros de {b}', 'Audit of {b}\'s books'), { b: nameOf(s, lbId) }));
  st.cd.audit = s.week + 52;
  r ??= new Rng(seedState(`a18au|${s.config.seed}|${s.week}`));
  const detect = clamp(0.5 + advice18(s) * 0.12 + (k?.audit ? 0.2 : 0), 0, 0.95);
  const found = Math.round(st.shaved * detect * (0.85 + r.next() * 0.3));
  if (found > money(s, 500)) {
    const pay = Math.round(found * 1.1);
    post(s, `a18audfound:${s.week}`, pay, 'royalties', `Acerto de auditoria ${nameOf(s, lbId)}`);
    led(s, 'roy', pay, fmtL(l('Auditoria: {b} pagou royalties sonegados + juros', 'Audit: {b} paid withheld royalties + interest'), { b: nameOf(s, lbId) }));
    st.shaved = Math.max(0, st.shaved - found);
    const lb = s.labels[lbId]; if (lb) lb.cash -= pay;
    if (st.deal) st.deal.prio = clamp(st.deal.prio - 10, 0, 100);
    emitFact(s, { kind: 'statement', actors: [lbId, band18(s)?.id ?? 'player'], severity: 45, visibility: 'public', tags: ['audit', 'bad'], text: fmtL(l('Auditoria de {a} acha royalties sonegados por {b}.', '{a}\'s audit finds royalties withheld by {b}.'), { a: band18(s)?.name ?? '', b: nameOf(s, lbId) }), src: 'artist18' });
    return fmtL(l('A auditoria achou {v} sonegados: {b} pagou com juros (e ficou de cara feia).', 'The audit found {v} withheld: {b} paid with interest (and is not happy).'), { v: fmtMoney(s, found), b: nameOf(s, lbId) });
  }
  if (st.deal) st.deal.prio = clamp(st.deal.prio + 2, 0, 100);
  return fmtL(l('Livros de {b} limpos (ou bem escondidos: detecção {p}%).', '{b}\'s books are clean (or well hidden: detection {p}%).'), { b: nameOf(s, lbId), p: Math.round(detect * 100) });
}

export function renegBlock18(s: GameState): L | null {
  const st = a18(s), d = st.deal, a = band18(s);
  if (!d || !a) return l('Sem contrato.', 'No deal.');
  const c = s.contracts[d.cid];
  if (s.week - d.lastReneg < 52) return l('Renegociaram há menos de um ano.', 'You renegotiated less than a year ago.');
  if (a.fame < (c?.fameAtSign ?? 0) + 12 && a.hits === 0) return l('Sem poder de barganha: cresçam (fama +12 desde a assinatura) ou emplaquem um sucesso.', 'No leverage: grow (fame +12 since signing) or land a hit.');
  return null;
}
export function renegOdds18(s: GameState): number {
  const d = a18(s).deal, a = band18(s);
  if (!d || !a) return 0;
  const c = s.contracts[d.cid];
  return clamp(0.25 + (a.fame - (c?.fameAtSign ?? 0)) / 80 + advice18(s) * 0.08 + (a18(s).mgr?.neg ?? 0) / 400 - (1 - d.prio / 100) * 0.2, 0.05, 0.9);
}
export function reneg18(s: GameState, r?: Rng): { ok: boolean; text: L } {
  const b = renegBlock18(s);
  if (b) return { ok: false, text: b };
  const st = a18(s), d = st.deal!, a = band18(s)!, c = s.contracts[d.cid];
  r ??= new Rng(seedState(`a18rn|${s.config.seed}|${s.week}`));
  d.lastReneg = s.week;
  if (!r.chance(renegOdds18(s))) { d.prio = clamp(d.prio - 4, 0, 100); return { ok: false, text: fmtL(l('{b} não quis reabrir o contrato.', '{b} refused to reopen the deal.'), { b: nameOf(s, d.lb) }) }; }
  const o: Offer18 = { ...blank(s, 'reneg'), lb: d.lb, who: nameOf(s, d.lb), roy: Math.round((c.royalty + 0.02 + r.next() * 0.02) * 100) / 100, term: 12, albums: 0, adv: r100(s, exp18(s, a) * 0.3), model: c.model };
  return applyReneg(s, o);
}
export function leaveCost18(s: GameState): number {
  const d = a18(s).deal, a = band18(s);
  if (!d || !a) return 0;
  const c = s.contracts[d.cid];
  if (!c) return 0;
  return Math.round(Math.max(0, c.recoupBalance) * 0.6 + r100(s, exp18(s, a) * 0.5) + Math.max(0, c.releasesOwed - c.releasesDone) * r100(s, exp18(s, a) * 0.2));
}
/** comprar a própria saída (os masters ficam com o selo) */
export function leave18(s: GameState): L {
  const d = a18(s).deal;
  if (!d) return l('Sem contrato.', 'No deal.');
  const v = leaveCost18(s);
  if (s.player.cash < v) return l('Caixa insuficiente para comprar a saída.', 'Not enough cash to buy your way out.');
  post(s, `a18leave:${d.cid}`, -v, 'legal', `Rescisão com ${nameOf(s, d.lb)}`);
  led(s, 'legal', -v, fmtL(l('Rescisão comprada de {b}', 'Bought out of {b}'), { b: nameOf(s, d.lb) }));
  const lb = s.labels[d.lb]; if (lb) lb.cash += v;
  endDeal18(s, l('vocês compraram a saída', 'you bought your way out'));
  return fmtL(l('Livres! Pagaram {v}; os masters ficam com o selo.', 'Free! You paid {v}; the masters stay with the label.'), { v: fmtMoney(s, v) });
}
/** quebra de garantia (lançamentos, verba, contas atrasadas): processo do artista contra o selo */
export function breach18(s: GameState): L | null {
  const st = a18(s), d = st.deal;
  if (!d) return null;
  const c = s.contracts[d.cid];
  const k = c?.clauses18;
  const late = st.stmts.filter((x) => x.lb === d.lb && x.late).length;
  if (late >= 2) return fmtL(l('{n} prestações de contas atrasadas', '{n} late statements'), { n: late });
  if (k?.minRel && c && c.releasesDone < k.minRel && c.endWeek - s.week < 26) return fmtL(l('{n} lançamento(s) garantido(s) não cumprido(s)', '{n} guaranteed release(s) not delivered'), { n: k.minRel - c.releasesDone });
  if (d.buried.length >= 2 && (k?.promo ?? 0) > 0) return l('discos enterrados apesar da verba contratual', 'records buried despite the contractual budget');
  return null;
}
export function sue18(s: GameState): L {
  const st = a18(s), d = st.deal, a = band18(s);
  const why = breach18(s);
  if (!d || !a || !why) return l('Não há quebra de contrato clara.', 'No clear breach of contract.');
  if (st.suits.some((x) => x.lb === d.lb)) return l('Já há processo em andamento.', 'A suit is already under way.');
  const cost = money(s, 5000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `a18sue:${s.week}`, -cost, 'legal', `Processo contra ${nameOf(s, d.lb)}`);
  led(s, 'legal', -cost, fmtL(l('Processo contra {b}: {w}', 'Suit against {b}: {w}'), { b: nameOf(s, d.lb), w: why }));
  st.suits.push({ lb: d.lb, by: 'player', claim: r100(s, 8000 + a.fame * 400), odds: clamp(0.4 + advice18(s) * 0.08, 0, 0.8), ruling: s.week + 26, t: why });
  d.prio = clamp(d.prio - 25, 0, 100);
  emitFact(s, { kind: 'deal', actors: [a.id, d.lb], severity: 40, visibility: 'public', tags: ['legal', 'bad'], text: fmtL(l('{a} processa {b}: {w}.', '{a} sues {b}: {w}.'), { a: a.name, b: nameOf(s, d.lb), w: why }), src: 'artist18' });
  return fmtL(l('Processo aberto ({p}% de chance; sentença em ~6 meses).', 'Suit filed ({p}% odds; ruling in ~6 months).'), { p: Math.round(clamp(0.4 + advice18(s) * 0.08, 0, 0.8) * 100) });
}

// ---------------------------------------------------------------- comparação: faça você mesmo × selo

export interface Diy18 { id: string; name: string; youPer100: number; reach: number; upfront: number; yearsToRecoup: number; master: L; note: L }
/** quanto sobra para vocês de cada US$ 100 vendidos, alcance relativo e tempo para recuperar */
export function diy18(s: GameState, offers: Offer18[] = openOffers18(s).filter((o) => o.k === 'record' || o.k === 'dist' || o.k === 'buyout')): Diy18[] {
  const a = band18(s);
  if (!a) return [];
  const aggr = s.year >= 2005 ? 0.15 : 0.35;
  const yearly = Math.max(1000, a.releases.map((id) => s.releases[id]).filter((r) => r && s.year - r.year <= 2).reduce((t, r) => t + toReal(r.revenue, s.year), 0) / 2 + a.fame * 400);
  const out: Diy18[] = [{ id: 'diy', name: 'DIY', youPer100: Math.round((1 - aggr) * 100 - 25), reach: 1, upfront: 0, yearsToRecoup: 0, master: l('seu', 'yours'), note: l('Você paga fabricação e divulgação (~25% do faturamento) e fica com o resto.', 'You pay manufacturing and promotion (~25% of revenue) and keep the rest.') }];
  for (const o of offers) {
    const k = o.k18;
    const bm = k ? (k.base === 'retail' ? 1.25 : k.base === 'wholesale' ? 1 : 0.88) * (1 - packaging18(s.year, k.base)) : 1;
    const per = o.model === 'distribution' ? o.roy * 100 : o.roy * bm * 100;
    const reach = 1 + labelClout(s, o.lb) * 1.6 + (o.model === 'distribution' ? 0.2 : 0);
    const debt = toReal(o.adv + o.fund * (k?.rec ?? 0.5), s.year);
    const yrs = per > 0 ? debt / Math.max(1, yearly * reach * per / 100) : 99;
    out.push({ id: o.id, name: o.who, youPer100: Math.round(per - (o.s360 ? o.s360 * 20 : 0)), reach: Math.round(reach * 10) / 10, upfront: Math.round(toReal(o.adv, s.year)), yearsToRecoup: Math.round(yrs * 10) / 10, master: o.master === 'artist' ? l('seu', 'yours') : o.master === 'shared' ? l('dividido', 'shared') : o.rev ? fmtL(l('volta em {y} anos', 'back in {y} years'), { y: o.rev }) : l('do selo', 'label\'s'), note: o.pred ? l('Predatória: recupera tudo, cruzado, 7 discos.', 'Predatory: recoups everything, cross-collateralized, 7 records.') : o.model === 'distribution' ? l('Distribuição: alcance médio, sem dívida grande.', 'Distribution: medium reach, no big debt.') : l('Selo: mais alcance, adiantamento hoje, royalty só depois de recuperar.', 'Label: more reach, advance today, royalties only after recouping.') });
  }
  return out;
}

// ---------------------------------------------------------------- Caixa de entrada, conselheiro, explicações

const offerOf = (s: GameState, id: unknown) => a18(s).offers.find((x) => x.id === String(id));
registerInboxKind('a18_offer', {
  label: l('Proposta de selo', 'Label offer'), cat: 'deals', icon: 'handshake', prio: 2,
  goto: () => ({ area: 'artist18', tab: ['artist18', 'offers'], label: l('Abrir propostas', 'Open offers') }),
  handle: (s, m, action) => {
    const o = offerOf(s, m.ref?.o);
    if (!o) return l('Proposta indisponível.', 'Offer unavailable.');
    if (action === 'accept') return accept18(s, o.id).text;
    if (action === 'counter') return counter18(s, o.id, bestAsk18(s, o)).text;
    decline18(s, o.id);
    return l('Recusada.', 'Declined.');
  },
});
registerInboxKind('a18_rep', {
  label: l('Representação', 'Representation'), cat: 'deals', icon: 'handshake', prio: 1,
  goto: () => ({ area: 'artist18', tab: ['artist18', 'team'] }),
  handle: (s, m, action) => { const o = offerOf(s, m.ref?.o); if (!o) return l('Indisponível.', 'Unavailable.'); if (action === 'accept') return accept18(s, o.id).text; decline18(s, o.id); return l('Recusado.', 'Declined.'); },
});
registerInboxKind('a18_show', {
  label: l('Showcase', 'Showcase'), cat: 'deals', icon: 'mic', prio: 1,
  handle: (s, m, action) => (action === 'go' ? showcase18(s, String(m.ref?.lb)) : l('Vocês não foram.', 'You skipped it.')),
});
registerInboxKind('a18_stmt', { label: l('Prestação de contas', 'Statement'), cat: 'money', icon: 'money', prio: 0, goto: () => ({ area: 'artist18', tab: ['artist18', 'ledger'] }) });
registerInboxKind('a18_info', { label: l('Seu selo', 'Your label'), cat: 'deals', icon: 'building', prio: 1, goto: () => ({ area: 'artist18', tab: ['artist18', 'deal'] }) });
registerInboxKind('a18_ar', {
  label: l('A&R do selo', 'Label A&R'), cat: 'decision', icon: 'note', prio: 2,
  handle: (s, m, action) => {
    const d = a18(s).deal, a = band18(s);
    if (!d || !a) return l('Sem contrato.', 'No deal.');
    const kind = String(m.ref?.kind);
    const pr = s.pendingReleases.find((p) => p.id === String(m.ref?.pr));
    const morale = (dv: number) => { for (const id of a.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.morale = clamp(p.morale + dv, 0, 100); } };
    if (action === 'comply') {
      d.prio = clamp(d.prio + 8, 0, 100); morale(-4);
      if (kind === 'image') { a.positioning = clamp(a.positioning + 10, 0, 100); a.fans.core = Math.round(a.fans.core * 0.97); a.fame = clamp(a.fame + 0.8, 0, 100); }
      if (pr) (a18(s).deal!.push).push(pr.id);
      return l('Vocês cederam: o selo se anima; a banda engole seco.', 'You gave in: the label perks up; the band swallows hard.');
    }
    if (action === 'split') { const ok = hashString(`${m.id}`) % 2 === 0; d.prio = clamp(d.prio + (ok ? 3 : -3), 0, 100); morale(ok ? 0 : -2); return ok ? l('Meio-termo aceito.', 'Compromise accepted.') : l('O A&R não gostou do meio-termo.', 'The A&R disliked the compromise.'); }
    d.prio = clamp(d.prio - 10, 0, 100); morale(3);
    emitFact(s, { kind: 'statement', actors: [a.id, d.lb], severity: 20, visibility: 'rumor', tags: ['ar'], text: fmtL(l('{a} bate de frente com o A&R de {b}.', '{a} clashes with {b}\'s A&R.'), { a: a.name, b: nameOf(s, d.lb) }), src: 'artist18' });
    return l('Vocês recusaram: a banda vibra; o selo anota "artista difícil".', 'You refused: the band cheers; the label notes "difficult artist".');
  },
});
registerInboxKind('a18_deliver', {
  label: l('Pressão por disco', 'Record pressure'), cat: 'decision', icon: 'disc', prio: 2,
  handle: (s, _m, action) => {
    const d = a18(s).deal;
    if (!d) return l('Sem contrato.', 'No deal.');
    if (action === 'promise') { d.prio = clamp(d.prio + 5, 0, 100); return l('Prometido: lancem algo em 6 meses.', 'Promised: release something within 6 months.'); }
    if (action === 'time') { d.demand = (d.demand ?? s.week) + 13; d.prio = clamp(d.prio - 4, 0, 100); return l('Mais 3 meses de prazo (o selo torce o nariz).', '3 more months (the label frowns).'); }
    d.prio = clamp(d.prio - 8, 0, 100); d.refusals++;
    return l('Vocês recusaram a pressão: o prazo segue e o selo esfria.', 'You pushed back: the deadline stands and the label cools.');
  },
});
registerInboxKind('a18_buried', {
  label: l('Disco enterrado', 'Buried record'), cat: 'decision', icon: 'disc', prio: 2,
  handle: (s, m, action) => {
    const d = a18(s).deal, a = band18(s);
    if (!d || !a) return l('Sem contrato.', 'No deal.');
    const id = String(m.ref?.rel);
    if (action === 'pay') {
      const v = r100(s, exp18(s, a) * 0.4);
      if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
      post(s, `a18selfpromo:${id}`, -v, 'marketing', 'Divulgação por conta própria'); led(s, 'mkt', -v, l('Divulgação bancada por vocês', 'Promotion funded by you'));
      d.buried = d.buried.filter((x) => x !== id); a.momentum = clamp(a.momentum + 5, 0, 100);
      return l('Vocês bancaram a divulgação: o disco volta a respirar.', 'You funded the promotion: the record breathes again.');
    }
    if (action === 'complain') { const ok = d.prio > 15 && hashString(id) % 3 !== 0; if (ok) d.buried = d.buried.filter((x) => x !== id); d.prio = clamp(d.prio + (ok ? 4 : -4), 0, 100); return ok ? l('A reclamação funcionou: o selo liberou verba.', 'The complaint worked: the label released budget.') : l('O selo ignorou a reclamação.', 'The label ignored the complaint.'); }
    return l('Aceito.', 'Accepted.');
  },
});
registerInboxKind('a18_drop', {
  label: l('Dispensa', 'Dropped'), cat: 'decision', icon: 'warning', prio: 3,
  handle: (s, m, action) => {
    const st = a18(s), d = st.deal;
    if (!d) return l('Sem contrato.', 'No deal.');
    const h = hon18(s, d.lb);
    if (action === 'plead') { const ok = hashString(m.id) % 3 === 0; if (ok) { d.prio = 30; d.demand = s.week + 26; return l('Mais uma chance: um disco em 6 meses, ou acabou.', 'One more shot: a record in 6 months, or it\'s over.'); } }
    if (action === 'masters') {
      const ok = h > 0.55 || d.prio > 15;
      endDeal18(s, l('dispensados pelo selo', 'dropped by the label'));
      if (ok) { const n = revert(s, d.lb); return fmtL(l('Dispensados, mas com os masters de volta ({n}).', 'Dropped, but with the masters back ({n}).'), { n }); }
      return l('Dispensados; o selo ficou com os masters.', 'Dropped; the label kept the masters.');
    }
    endDeal18(s, l('dispensados pelo selo', 'dropped by the label'));
    return l('Dispensados. De volta ao independente.', 'Dropped. Back to independent.');
  },
});
registerInboxKind('a18_merge', {
  label: l('Selo vendido', 'Label sold'), cat: 'deals', icon: 'building', prio: 2,
  handle: (s, m, action) => {
    const d = a18(s).deal;
    if (!d || action !== 'release') return l('Vocês ficam no novo selo.', 'You stay at the new label.');
    if (d.prio < 35 || hashString(m.id) % 2 === 0) { endDeal18(s, l('liberados na fusão', 'released in the merger')); return l('Liberados: os masters ficam com o catálogo.', 'Released: the masters stay with the catalog.'); }
    return l('O novo dono não liberou vocês.', 'The new owner did not release you.');
  },
});

registerAdvisorTip('artist18', (s) => {
  if (!on18(s)) return [];
  const st = a18(s);
  const out: AdvTip18[] = [];
  const open = openOffers18(s).filter((o) => o.k === 'record' || o.k === 'dist' || o.k === 'buyout');
  if (open.length) {
    const best = [...open].sort((x, y) => value18(s, y).seen - value18(s, x).seen)[0];
    out.push({ id: 'a18-offers', level: 'info', cat: 'opportunity', score: 70, text: fmtL(l('{n} proposta(s) de selo na mesa; a melhor no papel: {b}.', '{n} label offer(s) on the table; best on paper: {b}.'), { n: open.length, b: best.who }), why: open.length > 1 ? [l('Com mais de uma, contrapropor vira leilão.', 'With more than one, countering becomes an auction.')] : [], goto: { area: 'artist18', tab: ['artist18', 'offers'] } });
    if (!advice18(s) && open.some((o) => o.pred || o.low)) out.push({ id: 'a18-lawyer', level: 'warn', cat: 'opportunity', score: 75, text: l('Sem empresário nem advogado vocês só leem o adiantamento.', 'Without a manager or lawyer you only read the advance.'), effect: fmtL(l('Advogado: {c}, revela as letras miúdas e +8% nas contrapropostas.', 'Lawyer: {c}, reveals the fine print and +8% on counters.'), { c: fmtMoney(s, lawyerCost18(s)) }), run: { label: l('Contratar advogado', 'Hire a lawyer'), fn: (s2) => hireLawyer18(s2) ?? l('Advogado contratado.', 'Lawyer hired.') } });
  }
  const d = st.deal;
  if (d && d.prio < 25) out.push({ id: 'a18-prio', level: 'warn', cat: 'career', score: 55, text: fmtL(l('Prioridade baixa no selo ({p}/100): risco de disco enterrado ou dispensa.', 'Low priority at the label ({p}/100): risk of a buried record or being dropped.'), { p: Math.round(d.prio) }), why: [l('Fama, sucesso e recuperar o adiantamento sobem a prioridade.', 'Fame, hits and recouping raise priority.')], goto: { area: 'artist18', tab: ['artist18', 'deal'] } });
  if (st.shaved > money(s, 3000) && !auditBlock18(s)) out.push({ id: 'a18-audit', level: 'info', cat: 'cash', score: 45, text: l('As contas do selo parecem magras demais. Uma auditoria?', 'The label\'s statements look too thin. An audit?'), goto: { area: 'artist18', tab: ['artist18', 'ledger'] } });
  return out;
});

registerExplain('artist18.offer', (s, c) => {
  const o = offerOf(s, c.o);
  if (!o) return null;
  const { v, seen, parts } = value18(s, o);
  const adv = advice18(s);
  return {
    title: fmtL(l('Proposta de {b}', 'Offer from {b}'), { b: o.who }), value: Math.round((adv ? v : seen) * 100), fmt: 'num',
    parts: parts.map((p) => ({ label: p.t, value: p.hid > adv ? '?' : Math.round(p.d * 100), fmt: p.hid > adv ? 'text' as const : 'signed' as const, tone: p.hid > adv ? '' as const : p.d > 0 ? 'good' as const : 'bad' as const })),
    note: adv === 2 ? l('Seu empresário leu tudo (inclui a fama do selo).', 'Your manager read everything (incl. the label\'s name).') : adv === 1 ? l('O advogado leu as cláusulas; a fama do selo continua um "?".', 'The lawyer read the clauses; the label\'s name stays a "?".') : l('Sozinhos, vocês só enxergam adiantamento, royalty e prazo ("?" = não leram).', 'On your own you see only advance, royalty and term ("?" = unread).'),
  };
});

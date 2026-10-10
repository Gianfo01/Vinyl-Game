// Rodada 17 — AMOR com profundidade: sexo do par (pela sua orientação), ciúme, traição (ter um caso ou ser
// o(a) amante de alguém casado), descoberta, perdão, acordo pré-nupcial, divórcio amigável ou litigioso com
// partilha, pensão alimentícia e pensão dos filhos, guarda, reconciliação com ex. Extras: filho secreto
// (escândalo de paternidade) e o livro-bomba do(a) ex. NPCs casados também traem (segredo → obrigação →
// escândalo). Tudo publica Facts, usa holds17 (o amante guarda o segredo) e stress17.

import { clamp, hashString, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { grantHold, holds17 } from '../holds17';
import { scandal } from '../scandal17';
import { addStress, relieveLong } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs } from '../util';
import { addKid, breakUp, life, playerAct, playerPerson, spendEnergy, type Candidate } from './life';
import { ownerOf } from './people/owner';
import { per13 } from './persona13';
import { comeOut, isQueer, isRealP, marriageLegal, sexOf } from './sex17';
import { registerSituation } from './situations17';
import { soul } from './soul9';

export interface Affair17 { name: string; pid?: string; since: number; sx: 'm' | 'f'; disc: number; married?: 1; ss?: 1; known?: 1 }
export interface Pay17 { kind: 'alimony' | 'child'; to: string; amt: number; until: number; kid?: string }
export interface Ex17 { name: string; born: number; aff: number; w: number; married?: 1; bitter?: 1; knows?: string[] }
export interface Love17State {
  /** semana em que o par atual começou (detecta par novo) */
  pk?: number;
  psx?: 'm' | 'f';
  /** par atual é casado(a) com outra pessoa (você é o/a amante) */
  pm?: 1;
  /** casal do mesmo sexo */
  ss?: 1;
  jeal: number;
  prenup?: 1;
  mw?: number;
  sym?: 1;
  pname?: string;
  affair?: Affair17;
  past: number;
  exes: Ex17[];
  pay: Pay17[];
  sec: { kid: string; born: number; w: number; from: string; claim?: number }[];
  st: { dates: number; parties: number };
  divW?: number;
  log: [number, L][];
}
declare module '../ext4' { interface Ext4 { love17: Love17State } }
const fresh = (): Love17State => ({ jeal: 15, past: 0, exes: [], pay: [], sec: [], st: { dates: 0, parties: 0 }, log: [] });
registerExt4('love17', fresh);
export function love17(s: GameState): Love17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.love17 ??= fresh()) as Love17State;
  st.exes ??= []; st.pay ??= []; st.sec ??= []; st.log ??= []; st.st ??= { dates: 0, parties: 0 }; st.jeal ??= 15; st.past ??= 0;
  return st;
}
const log = (s: GameState, t: L) => { const L0 = love17(s).log; L0.unshift([s.year, t]); if (L0.length > 30) L0.length = 30; };
const filtered = (s: GameState) => s.config.contentFilters.includes('romance');
const u01 = (s: GameState, k: string): number => (hashString(`${s.config.seed}:love17:${k}`) % 10000) / 10000;

// ---------------------------------------------------------------- quem é quem

const mySex = (s: GameState): 'm' | 'f' | 'x' => (per13(s, 'player')?.sex ?? 'x') as 'm' | 'f' | 'x';
/** Sexo de um(a) pretendente, coerente com a sua orientação. */
export function candSex(s: GameState, c: { id: string; personId?: string }): 'm' | 'f' {
  if (c.personId) { const x = per13(s, `p:${c.personId}`)?.sex; if (x === 'm' || x === 'f') return x; }
  const me = mySex(s);
  const o = sexOf(s, 'player').o;
  const u = u01(s, `sx:${c.id}`);
  const opp: 'm' | 'f' = me === 'f' ? 'm' : 'f';
  const same: 'm' | 'f' = me === 'f' ? 'f' : 'm';
  if (o === 'gay') return same;
  if (o === 'bi' || me === 'x') return u < 0.5 ? same : opp;
  return opp;
}
/** Pretendente já é casado(a) com outra pessoa? (≈1 em 5 depois dos 28) */
export const candMarried = (s: GameState, c: Candidate): boolean => !c.personId && s.year - c.born >= 28 && u01(s, `mar:${c.id}`) < 0.22;
const sameSex = (s: GameState, sx: 'm' | 'f'): boolean => { const me = mySex(s); return me !== 'x' && me === sx; };
const homeA3 = (s: GameState) => countryOfCity(s.config.homeCity);
/** Fama "de tabloide" do jogador. */
export function playerFame(s: GameState): number {
  const a = playerAct(s);
  return Math.max(life(s).fame, a ? a.fame * 0.8 : 0, Math.min(60, s.player.reputation.commercial * 0.4));
}
function payP(s: GameState, real: number): L | null {
  const o = ownerOf(s);
  const c = money(s, real);
  if (o.wealth < c) return l('Patrimônio pessoal insuficiente (sai do seu bolso).', 'Not enough personal wealth (it comes out of your pocket).');
  o.wealth -= c;
  return null;
}

// ---------------------------------------------------------------- traição: ter um caso / ser amante

/** Começa um caso com um(a) pretendente enquanto você tem par. */
export function startAffair(s: GameState, candId: string): L | null {
  const L0 = life(s);
  const L7 = love17(s);
  if (!L0.partner) return l('Você não tem com quem trair — está solteiro(a).', 'You are single — there is nobody to cheat on.');
  if (L7.affair) return l('Você já tem um caso em andamento.', 'You already have an affair going on.');
  const c = L0.candidates.find((x) => x.id === candId);
  if (!c) return l('Pessoa não encontrada.', 'Person not found.');
  if (c.personId && isRealP(s, c.personId) && s.config.history === 'strict') return l('Pessoa real: o jogo não inventa casos para quem existiu.', 'Real person: the game does not invent affairs for people who existed.');
  const e = spendEnergy(s, 1);
  if (e) return e;
  const sx = candSex(s, c);
  const disc = clamp(55 + (ownerOf(s).attrs.management - 50) / 2 - playerFame(s) / 3 - (c.personId ? 15 : 0), 10, 90);
  L7.affair = { name: c.name, pid: c.personId, since: s.week, sx, disc, ...(candMarried(s, c) ? { married: 1 as const } : {}), ...(sameSex(s, sx) ? { ss: 1 as const } : {}) };
  L0.candidates = L0.candidates.filter((x) => x.id !== candId);
  grantHold(s, { holder: c.personId ?? `lover:${c.name}`, target: 'player', kind: 'secret', strength: 60, months: 120, proof: 2, src: 'love17', text: fmtL(l('É amante de {o} — pode contar tudo', 'Is {o}\'s lover — could tell everything'), { o: ownerOf(s).name }) });
  emitFact(s, { kind: 'affair', actors: ['player', ...(c.personId ? [c.personId] : [])], severity: 40, visibility: 'secret', tags: ['sex', 'romance', 'bad'], text: fmtL(l('{o} começa um caso com {c}.', '{o} starts an affair with {c}.'), { o: ownerOf(s).name, c: c.name }), src: 'love17' });
  const t = fmtL(l('Você e {c} começam um caso. Discrição {d}/100 — quanto mais famoso(a), maior o risco.', 'You and {c} begin an affair. Discretion {d}/100 — the more famous you are, the higher the risk.'), { c: c.name, d: Math.round(disc) });
  log(s, t);
  return null;
}
/** Encerra o caso: o(a) amante pode se vingar contando. */
export function endAffair(s: GameState, r: Rng): L {
  const L7 = love17(s);
  const a = L7.affair;
  if (!a) return l('Não há caso para encerrar.', 'There is no affair to end.');
  L7.affair = undefined;
  L7.past++;
  const spite = r.chance(0.18 + (a.married ? 0 : 0.1));
  if (spite) { discover(s, a, l('Magoado(a) com o fim, o(a) amante contou tudo.', 'Hurt by the ending, the lover told everything.')); return l('O caso acabou mal: seu par descobriu.', 'The affair ended badly: your partner found out.'); }
  for (const h of holds17(s).h) if (h.status === 'open' && h.src === 'love17' && h.target === 'player') h.strength = Math.max(20, h.strength - 25);
  const t = fmtL(l('Você encerrou o caso com {c}. O segredo continua com {c}.', 'You ended the affair with {c}. {c} still holds the secret.'), { c: a.name });
  log(s, t);
  return t;
}
/** Confessar antes que descubram. */
export function confess(s: GameState): L {
  const L0 = life(s);
  const L7 = love17(s);
  const pt = L0.partner;
  if (!pt) return l('Não há a quem confessar.', 'Nobody to confess to.');
  const hit = 22 + (pt.trait === 'homebody' ? 10 : pt.trait === 'glam' ? -6 : 0);
  pt.affinity = clamp(pt.affinity - hit, 0, 100);
  L7.jeal = clamp(L7.jeal + 25, 0, 100);
  const pp = playerPerson(s);
  if (pp) relieveLong(s, pp.id, 8);
  if (L7.affair) { L7.affair = undefined; L7.past++; }
  const t = fmtL(l('Você confessou a traição a {p}. Afinidade −{v}; o ciúme dispara, mas não há boato.', 'You confessed the affair to {p}. Affinity −{v}; jealousy soars, but there is no rumor.'), { p: pt.name, v: hit });
  log(s, t);
  return t;
}
function discover(s: GameState, a: Affair17, why: L): void {
  const L0 = life(s);
  const L7 = love17(s);
  const pt = L0.partner;
  a.known = 1;
  if (pt) { pt.affinity = clamp(pt.affinity - 40, 0, 100); L7.jeal = 95; }
  const pp = playerPerson(s);
  if (pp) addStress(s, pp.id, 18, l('Traição descoberta', 'Affair discovered'));
  const fame = playerFame(s);
  const pub = fame >= 30 || !!a.pid;
  const text = fmtL(l('{p} descobre o caso de {o} com {c}. {w}', '{p} finds out about {o}\'s affair with {c}. {w}'), { p: pt?.name ?? '?', o: ownerOf(s).name, c: a.name, w: why });
  const f = emitFact(s, { kind: 'affair', actors: ['player', ...(a.pid ? [a.pid] : [])], place: s.config.homeCity, severity: pub ? 55 : 35, visibility: pub ? 'rumor' : 'secret', tags: ['sex', 'romance', 'bad', 'exposed'], text, src: 'love17' });
  if (pub) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
    const act = playerAct(s);
    if (act) scandal(s, act.id, 'sex', 35, text, { person: pp?.id, cause: [f.id] });
  }
  if (a.pid) { const act = Object.values(s.acts).find((x) => x.members.includes(a.pid!)); if (act && act.fame >= 25 && (!act.catalogNo || s.config.history !== 'strict')) scandal(s, act.id, 'sex', 30, text, { person: a.pid, cause: [f.id] }); }
  notify(s, text, 'bad');
  log(s, text);
}

// ---------------------------------------------------------------- casamento: pré-nupcial, divórcio, pensões, reconciliação

export function setPrenup(s: GameState): L | null {
  const pt = life(s).partner;
  if (!pt || pt.stage !== 'engaged') return l('Só durante o noivado.', 'Only while engaged.');
  if (love17(s).prenup) return l('Acordo já assinado.', 'Agreement already signed.');
  const e = payP(s, 1500);
  if (e) return e;
  love17(s).prenup = 1;
  pt.affinity = clamp(pt.affinity + (pt.trait === 'practical' ? 2 : -6), 0, 100);
  log(s, fmtL(l('Acordo pré-nupcial assinado com {p}.', 'Prenuptial agreement signed with {p}.'), { p: pt.name }));
  return null;
}
/** Prévia das condições de um divórcio (interface mostra antes de confirmar). */
export function divorceTerms(s: GameState, mode: 'amicable' | 'court'): { share: number; fees: number; alimony: number; years: number; child: number; kids: number; custodyRisk: number; why: L[] } {
  const o = ownerOf(s);
  const L7 = love17(s);
  const pt = life(s).partner;
  const w = Math.max(0, o.wealth);
  const yrs = L7.mw !== undefined ? Math.max(0, Math.floor((s.week - L7.mw) / 52)) : 3;
  const why: L[] = [];
  let pct = mode === 'amicable' ? 0.3 : 0.5;
  if (L7.prenup) { pct = 0.1; why.push(l('Acordo pré-nupcial: partilha limitada a 10%.', 'Prenup: split capped at 10%.')); }
  if (L7.sym) { pct = 0; why.push(l('União sem valor legal no país/época: nada a partilhar — e nada garantido ao par.', 'Union with no legal standing in this country/era: nothing to split — and nothing guaranteed to the partner.')); }
  const fees = mode === 'court' ? money(s, 6000) + Math.round(w * 0.03) : money(s, 1200);
  const alimony = L7.prenup || L7.sym || yrs < 3 ? 0 : Math.round(money(s, 250) + w * 0.0015) * (pt?.trait === 'practical' ? 1.2 : 1);
  const years = Math.min(8, Math.max(1, Math.round(yrs / 2)));
  if (alimony) why.push(fmtL(l('Pensão ao ex-cônjuge por {y} ano(s) (casamento de {n} anos).', 'Spousal support for {y} year(s) ({n}-year marriage).'), { y: years, n: yrs }));
  const kids = o.kids.filter((k) => s.year - k.born < 18).length;
  const child = kids ? Math.round(money(s, 220) + w * 0.0006) : 0;
  if (kids) why.push(fmtL(l('Pensão dos filhos: {k} menor(es) até os 18.', 'Child support: {k} minor(s) until 18.'), { k: kids }));
  const custodyRisk = kids ? (mode === 'court' ? 0.5 : 0.1) : 0;
  return { share: Math.round(w * pct), fees, alimony: Math.round(alimony), years, child, kids, custodyRisk, why };
}
/** Divórcio com partilha, pensões e guarda. */
export function divorce17(s: GameState, mode: 'amicable' | 'court', r: Rng): L | null {
  const L0 = life(s);
  const pt = L0.partner;
  const L7 = love17(s);
  if (!pt || pt.stage !== 'married') return l('Vocês não são casados.', 'You are not married.');
  if (mode === 'amicable' && pt.affinity < 15) return l('Não há clima para acordo: seu par quer brigar na justiça.', 'No room for a deal: your partner wants to fight in court.');
  const e = spendEnergy(s, mode === 'court' ? 2 : 1);
  if (e) return e;
  const T = divorceTerms(s, mode);
  const o = ownerOf(s);
  const w0 = o.wealth;
  const name = pt.name, born = pt.born, aff = pt.affinity;
  breakUp(s); // fecha o relacionamento (laços, ex, estresse) — partilha recalculada abaixo
  o.wealth = w0 - T.share - T.fees;
  if (T.alimony) L7.pay.push({ kind: 'alimony', to: name, amt: T.alimony, until: s.year + T.years });
  const lost = r.chance(T.custodyRisk);
  for (const k of o.kids) if (s.year - k.born < 18) L7.pay.push({ kind: 'child', to: name, amt: Math.round(T.child * (lost ? 1.5 : 1)), until: k.born + 18, kid: k.name });
  for (const kx of Object.values(L0.kidsX)) kx.bond = clamp(kx.bond - (lost ? 20 : mode === 'court' ? 10 : 4), 0, 100);
  L7.exes.unshift({ name, born, aff: mode === 'amicable' ? Math.max(35, aff) : Math.min(20, aff), w: s.week, married: 1, ...(mode === 'court' ? { bitter: 1 as const } : {}), knows: L7.past ? ['affair'] : [] });
  if (L7.exes.length > 8) L7.exes.length = 8;
  L7.mw = undefined; L7.prenup = undefined; L7.sym = undefined; L7.divW = s.week;
  const t = fmtL(l('Divórcio {m} de {p}: partilha {v}, custas {f}{a}{c}{g}.', '{m} divorce from {p}: split {v}, fees {f}{a}{c}{g}.'), {
    m: mode === 'court' ? l('litigioso', 'Contested').pt : l('amigável', 'Amicable').pt, p: name, v: `$${Math.round(T.share / 100)}`, f: `$${Math.round(T.fees / 100)}`,
    a: T.alimony ? fmtL(l(', pensão {x}/mês', ', support {x}/mo'), { x: `$${Math.round(T.alimony / 100)}` }).pt : '',
    c: T.kids ? fmtL(l(', pensão dos filhos {x}/mês', ', child support {x}/mo'), { x: `$${Math.round(T.child * (lost ? 1.5 : 1) / 100)}` }).pt : '',
    g: lost ? l(' — você perdeu a guarda', ' — you lost custody').pt : '' });
  emitFact(s, { kind: 'breakup', actors: ['player'], place: s.config.homeCity, severity: mode === 'court' ? 45 : 25, visibility: playerFame(s) >= 30 ? 'public' : 'rumor', tags: ['romance', 'divorce', 'bad'], text: t, src: 'love17', data: { share: T.share, mode } });
  log(s, t);
  notify(s, t, 'bad');
  return null;
}
/** Tentar voltar com um(a) ex. */
export function reconcile(s: GameState, idx: number, r: Rng): { ok: boolean; text: L } | L {
  const L0 = life(s);
  const L7 = love17(s);
  if (L0.partner) return l('Você já está num relacionamento.', 'You are already in a relationship.');
  const ex = L7.exes[idx];
  if (!ex) return l('Ex não encontrado(a).', 'Ex not found.');
  const e = spendEnergy(s, 1);
  if (e) return e;
  const yrs = (s.week - ex.w) / 52;
  const p = clamp(ex.aff / 100 * 0.7 + (yrs < 3 ? 0.1 : 0) - (ex.bitter ? 0.2 : 0), 0.03, 0.85);
  if (!r.chance(p)) { ex.aff = clamp(ex.aff - 10, 0, 100); return { ok: false, text: fmtL(l('{p} não quis voltar ({c}% de chance).', '{p} did not want to get back together ({c}% chance).'), { p: ex.name, c: Math.round(p * 100) }) }; }
  L0.partner = { name: ex.name, born: ex.born, job: l('ex de volta', 'ex, back again'), trait: 'zen', affinity: 45, since: s.week, stage: 'dating', lastDate: s.week };
  L7.exes.splice(idx, 1);
  // pensão ao ex-cônjuge acaba quando o casal volta
  L7.pay = L7.pay.filter((x) => !(x.kind === 'alimony' && x.to === ex.name));
  const t = fmtL(l('Você e {p} reataram.', 'You and {p} got back together.'), { p: ex.name });
  emitFact(s, { kind: 'romance', actors: ['player'], severity: 20, visibility: 'rumor', tags: ['romance', 'good'], text: t, src: 'love17' });
  log(s, t);
  return { ok: true, text: t };
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'love17', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}:love17:${s.year}:${s.month}`);
  const L0 = life(s);
  const L7 = love17(s);
  const o = ownerOf(s);
  const pt = L0.partner;
  // par novo: sexo, casado(a) com outra pessoa?, mesmo sexo
  if (pt && L7.pk !== pt.since) {
    L7.pk = pt.since;
    const c = { id: `p${pt.since}:${pt.name}`, name: pt.name, born: pt.born, job: pt.job, trait: pt.trait, chemistry: 50, personId: pt.personId };
    L7.psx = candSex(s, c);
    L7.ss = sameSex(s, L7.psx) ? 1 : undefined;
    L7.pm = !pt.personId && candMarried(s, c as Candidate) && !L7.exes.some((x) => x.name === pt.name) ? 1 : undefined;
    L7.jeal = 15 + (pt.trait === 'homebody' ? 12 : pt.trait === 'glam' ? -5 : 0);
    if (L7.pm) log(s, fmtL(l('{p} é casado(a) com outra pessoa: você é o(a) amante.', '{p} is married to someone else: you are the lover.'), { p: pt.name }));
  }
  if (!pt) { L7.pk = undefined; L7.pm = undefined; L7.ss = undefined; }
  // casou: registra data, união simbólica (mesmo sexo sem lei)
  if (pt?.stage === 'married' && L7.mw === undefined) {
    L7.mw = s.week;
    L7.pname = pt.name;
    if (L7.ss && !marriageLegal(homeA3(s), s.year)) { L7.sym = 1; log(s, l('Sem casamento igualitário no país: a união é simbólica (sem partilha, sem herança garantida).', 'No marriage equality in the country: the union is symbolic (no split, no guaranteed inheritance).')); }
  }
  // o par pediu o divórcio (afinidade no chão, life.ts): condições da justiça
  if (!pt && L7.mw !== undefined && L7.divW !== s.week) {
    const w = Math.max(0, o.wealth);
    const yrs = Math.floor((s.week - L7.mw) / 52);
    if (!L7.prenup && !L7.sym && yrs >= 3) L7.pay.push({ kind: 'alimony', to: L7.pname ?? '?', amt: Math.round(money(s, 250) + w * 0.0015), until: s.year + Math.min(8, Math.max(1, Math.round(yrs / 2))) });
    for (const k of o.kids) if (s.year - k.born < 18) L7.pay.push({ kind: 'child', to: L7.pname ?? '?', amt: Math.round(money(s, 220) + w * 0.0006), until: k.born + 18, kid: k.name });
    L7.exes.unshift({ name: L7.pname ?? '?', born: s.year - 35, aff: 10, w: s.week, married: 1, bitter: 1, knows: L7.past ? ['affair'] : [] });
    if (L7.exes.length > 8) L7.exes.length = 8;
    L7.mw = undefined; L7.prenup = undefined; L7.sym = undefined;
    notify(s, l('Seu par pediu o divórcio na justiça: pensões definidas pelo juiz (aba Coração).', 'Your partner filed for divorce: the judge set the support payments (Heart tab).'), 'bad');
  }
  // pensões
  L7.pay = L7.pay.filter((x) => x.until > s.year);
  for (const x of L7.pay) {
    if (o.wealth >= x.amt) { o.wealth -= x.amt; continue; }
    // atrasou: o ex guarda mágoa; na terceira, processo e manchete
    o.wealth = Math.max(0, o.wealth);
    const ex = L7.exes.find((e) => e.name === x.to);
    if (ex) ex.aff = clamp(ex.aff - 6, 0, 100);
    if (r.chance(0.25)) {
      grantHold(s, { holder: `ex:${x.to}`, target: 'player', kind: 'grievance', strength: 45, months: 36, src: 'love17', text: fmtL(l('{e}: pensão atrasada', '{e}: support in arrears'), { e: x.to }) });
      emitFact(s, { kind: 'case_ruling', actors: ['player'], place: s.config.homeCity, severity: 40, visibility: playerFame(s) >= 25 ? 'public' : 'rumor', tags: ['money', 'bad', 'family'], text: fmtL(l('{e} processa {o} por pensão atrasada.', '{e} sues {o} over unpaid support.'), { e: x.to, o: o.name }), src: 'love17' });
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
    }
  }
  if (filtered(s)) return;
  // ciúme: festas e fama sobem; encontros e família baixam
  const st = L0.stats;
  if (pt) {
    const dp = Math.max(0, st.parties - L7.st.parties), dd = Math.max(0, st.dates - L7.st.dates);
    L7.jeal = clamp(L7.jeal + dp * 6 - dd * 4 + (playerFame(s) > 30 ? 1 : 0) + (L7.affair ? 2 : 0) - 1, 0, 100);
    if (L7.jeal > 70) {
      pt.affinity = clamp(pt.affinity - 2, 0, 100);
      if (s.month % 4 === 0) notify(s, fmtL(l('{p} está com ciúme ({j}/100): festas, fama e ausência pesam. Mais encontros acalmam.', '{p} is jealous ({j}/100): parties, fame and absence weigh. More dates calm things down.'), { p: pt.name, j: Math.round(L7.jeal) }), 'bad');
    }
  }
  L7.st = { dates: st.dates, parties: st.parties };
  // você como amante: o cônjuge pode descobrir; ou seu par larga o casamento
  if (pt && L7.pm) {
    if (r.chance(0.035)) {
      pt.affinity = clamp(pt.affinity - 10, 0, 100);
      const t = fmtL(l('O cônjuge de {p} descobriu vocês. Barraco, ameaças — e o boato corre.', '{p}\'s spouse found out about you. A scene, threats — and the rumor spreads.'), { p: pt.name });
      emitFact(s, { kind: 'affair', actors: ['player'], place: s.config.homeCity, severity: 40, visibility: playerFame(s) >= 25 ? 'rumor' : 'secret', tags: ['sex', 'romance', 'bad'], text: t, src: 'love17' });
      const pp = playerPerson(s); if (pp) addStress(s, pp.id, 10, l('Pego(a) como amante', 'Caught as the lover'));
      notify(s, t, 'bad'); log(s, t);
    } else if (pt.affinity > 70 && r.chance(0.03)) {
      L7.pm = undefined;
      const t = fmtL(l('{p} deixou o casamento para ficar com você.', '{p} left their marriage to be with you.'), { p: pt.name });
      notify(s, t, 'good'); log(s, t);
    }
  }
  // caso em andamento: culpa/adrenalina, descoberta, gravidez
  const a = L7.affair;
  if (a && pt) {
    const pp = playerPerson(s);
    if (pp) addStress(s, pp.id, (soul(s, pp).f.empatia ?? 50) > 55 ? 3 : -1, l('Vida dupla', 'Double life'));
    const months = (s.week - a.since) / 4.3;
    const p = clamp(0.03 + (100 - a.disc) / 1500 + playerFame(s) / 2500 + months * 0.002 + (L7.jeal > 60 ? 0.02 : 0), 0.01, 0.2);
    if (r.chance(p)) { discover(s, a, l('Um bilhete, um perfume, uma foto — foi o suficiente.', 'A note, a perfume, a photo — that was enough.')); L7.affair = undefined; L7.past++; }
    else if (!a.ss && r.chance(0.012)) {
      L7.sec.push({ kid: '', born: s.year + (s.month >= 3 ? 1 : 0), w: s.week, from: a.name });
      grantHold(s, { holder: a.pid ?? `lover:${a.name}`, target: 'player', kind: 'secret', strength: 80, months: 300, proof: 1, src: 'love17', text: fmtL(l('{c} espera um filho de {o}', '{c} is expecting {o}\'s child'), { c: a.name, o: o.name }), data: { paternity: 1 } });
      notify(s, fmtL(l('{c} conta, em segredo: está grávida. Ninguém mais sabe — por enquanto.', '{c} tells you in secret: a baby is on the way. Nobody else knows — for now.'), { c: a.name }), 'bad');
    }
  }
  // NPCs casados também traem (segredo → obrigação → escândalo)
  npcAffairs(s, r);
});

/** NPCs: traição pelos traços (lealdade baixa, impulsividade alta); segredo vira obrigação e pode estourar. */
function npcAffairs(s: GameState, r: Rng): void {
  const pool = Object.values(s.acts).filter((a) => (a.status === 'active' || a.status === 'emerging') && a.fame >= 20 && (!a.catalogNo || s.config.history !== 'strict')); // r18: história alternativa
  if (!pool.length) return;
  for (let i = 0; i < 3; i++) {
    const a = r.pick(pool);
    const m = r.pick(a.members);
    const p = s.persons[m];
    const fam = s.families[m];
    if (!p?.alive || p.isPlayer || !fam?.partner || fam.separated) continue;
    const f = soul(s, p).f;
    const pr = 0.004 * (1 + (50 - (f.lealdade ?? 50)) / 40 + ((f.impulsividade ?? 50) - 50) / 60);
    if (!r.chance(pr)) continue;
    const lb = Object.values(s.labels).filter((x) => x.active && x.id !== a.owner);
    const holder = lb.length && r.chance(0.5) ? r.pick(lb).id : `press`;
    const t = fmtL(l('{n} ({a}) tem um caso fora do casamento.', '{n} ({a}) is having an affair outside the marriage.'), { n: p.name, a: a.name });
    const fx = emitFact(s, { kind: 'affair', actors: [m, a.id], place: a.city, severity: 40, visibility: 'secret', tags: ['sex', 'romance'], text: t, src: 'love17' });
    grantHold(s, { holder: a.owner === 'player' && r.chance(0.5) ? 'player' : holder, target: m, kind: 'secret', strength: 50, months: 60, proof: 1, src: 'love17n', text: t, factId: fx.id });
  }
  // segredos de caso de NPC estouram com o tempo
  for (const h of holds17(s).h) {
    if (h.status !== 'open' || h.src !== 'love17n' || !r.chance(0.04)) continue;
    const p = s.persons[h.target];
    const a = Object.values(s.acts).find((x) => x.members.includes(h.target));
    h.status = 'used';
    if (!p?.alive || !a) continue;
    scandal(s, a.id, 'sex', 30 + Math.round(a.fame / 4), fmtL(l('Tabloide revela o caso extraconjugal de {n}.', 'Tabloid reveals {n}\'s extramarital affair.'), { n: p.name }), { person: p.id, cause: h.factId ? [h.factId] : undefined });
    const fam = s.families[h.target];
    if (fam?.partner && r.chance(0.55)) { fam.separated = true; emitFact(s, { kind: 'breakup', actors: [h.target, a.id], place: a.city, severity: 30, visibility: 'public', tags: ['romance', 'bad'], text: fmtL(l('{n} e {q} se separam depois da traição.', '{n} and {q} split after the affair.'), { n: p.name, q: fam.partner.name }), src: 'love17' }); }
  }
}

// ---------------------------------------------------------------- situações: flagrado(a), paternidade, livro-bomba do(a) ex

registerSituation({
  id: 'paternity17', pressure: 'heart', cost: 2, cooldown: 12, playerOnly: true,
  when: (s) => love17(s).sec.some((x) => !x.claim && s.year - x.born >= 1 && s.year - x.born <= 12),
  actorsPick: (s) => { const i = love17(s).sec.findIndex((x) => !x.claim && s.year - x.born >= 1 && s.year - x.born <= 12); return i < 0 ? null : { hero: 'player', cast: {}, data: { i } }; },
  title: () => l('Um teste de DNA na sua porta', 'A DNA test at your door'),
  text: (s, c) => { const x = love17(s).sec[Number(c.data.i)]; return fmtL(l('{c} procura você: a criança de {a} ano(s) é sua e precisa de sustento. A imprensa faria a festa — sua fama de tabloide hoje: {f}.', '{c} comes to you: the {a}-year-old child is yours and needs support. The press would have a field day — your tabloid fame today: {f}.'), { c: x.from, a: s.year - x.born, f: Math.round(playerFame(s)) }); },
  options: [
    { id: 'ack', label: l('Reconhecer a criança', 'Acknowledge the child'), hint: l('Entra na família (vínculo baixo no começo) + pensão até os 18. Seu par: afinidade −20. Fato público se você for famoso(a).', 'Joins the family (low bond at first) + support until 18. Your partner: affinity −20. Public fact if you are famous.'),
      apply: (s, c, r) => {
        const L7 = love17(s); const x = L7.sec[Number(c.data.i)]; x.claim = s.year;
        const name = addKid(s, r, false); const o = ownerOf(s); const k = o.kids[o.kids.length - 1]; k.born = x.born; x.kid = name;
        const kx = life(s).kidsX[o.kids.length - 1]; if (kx) kx.bond = 25;
        L7.pay.push({ kind: 'child', to: x.from, amt: Math.round(money(s, 220) + Math.max(0, o.wealth) * 0.0006), until: x.born + 18, kid: name });
        const pt = life(s).partner; if (pt) pt.affinity = clamp(pt.affinity - 20, 0, 100);
        emitFact(s, { kind: 'birth', actors: ['player'], place: s.config.homeCity, severity: 40, visibility: playerFame(s) >= 25 ? 'public' : 'rumor', tags: ['family', 'paternity'], text: fmtL(l('{o} reconhece {k}, filho(a) de um relacionamento fora do casamento.', '{o} acknowledges {k}, a child from outside the marriage.'), { o: o.name, k: name }), src: 'love17' });
        return fmtL(l('{k} agora tem seu sobrenome.', '{k} now carries your name.'), { k: name });
      } },
    { id: 'quiet', label: l('Pagar em silêncio', 'Pay quietly'), hint: l('Custa o dobro da pensão, por fora; o segredo continua com {c} (pode virar chantagem).', 'Costs double support, off the books; the secret stays with them (may turn into blackmail).'),
      apply: (s, c) => { const L7 = love17(s); const x = L7.sec[Number(c.data.i)]; x.claim = s.year; L7.pay.push({ kind: 'child', to: x.from, amt: Math.round((money(s, 220) + Math.max(0, ownerOf(s).wealth) * 0.0006) * 2), until: x.born + 18 }); } },
    { id: 'deny', label: l('Negar e brigar na justiça', 'Deny it and fight in court'), hint: l('Custas $5.000; o exame confirma 90% das vezes: escândalo de paternidade (sexo) e pensão mesmo assim.', 'Fees $5,000; the test confirms it 90% of the time: paternity scandal (sex) and support anyway.'),
      apply: (s, c, r) => {
        const L7 = love17(s); const x = L7.sec[Number(c.data.i)]; x.claim = s.year;
        ownerOf(s).wealth -= money(s, 5000);
        if (!r.chance(0.9)) return l('O exame deu negativo. Caso encerrado.', 'The test came back negative. Case closed.');
        L7.pay.push({ kind: 'child', to: x.from, amt: Math.round(money(s, 220) + Math.max(0, ownerOf(s).wealth) * 0.0006), until: x.born + 18 });
        const t = fmtL(l('Exame de DNA confirma: {o} é pai/mãe da criança que negou.', 'DNA test confirms: {o} is the parent of the child they denied.'), { o: ownerOf(s).name });
        const act = playerAct(s);
        if (act) scandal(s, act.id, 'sex', 45, t, { person: playerPerson(s)?.id });
        else { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5, 0, 100); emitFact(s, { kind: 'scandal', actors: ['player'], place: s.config.homeCity, severity: 45, visibility: 'public', tags: ['sex', 'paternity', 'bad'], text: t, src: 'love17' }); }
        const pt = life(s).partner; if (pt) pt.affinity = clamp(pt.affinity - 25, 0, 100);
        return t;
      } },
  ],
});

const bitterEx = (s: GameState): number => love17(s).exes.findIndex((e) => e.aff < 25 && (s.week - e.w) / 52 >= 1 && (s.week - e.w) / 52 <= 12);
registerSituation({
  id: 'tellall17', pressure: 'fame', cost: 2, cooldown: 18, playerOnly: true,
  when: (s) => !filtered(s) && playerFame(s) >= 25 && bitterEx(s) >= 0,
  actorsPick: (s) => { const i = bitterEx(s); return i < 0 ? null : { hero: 'player', cast: {}, data: { i } }; },
  title: (s, c) => fmtL(l('{e} vai publicar um livro sobre vocês', '{e} is about to publish a book about you'), { e: love17(s).exes[Number(c.data.i)]?.name ?? '?' }),
  text: (s, c) => {
    const e = love17(s).exes[Number(c.data.i)];
    const me = sexOf(s, 'player');
    const bombs = [love17(s).past ? l('traições', 'affairs').pt : '', isQueer(me) && me.c === 'closet' ? l('sua vida no armário', 'your life in the closet').pt : '', love17(s).sec.some((x) => x.claim && !x.kid) ? l('um filho escondido', 'a hidden child').pt : ''].filter(Boolean);
    return fmtL(l('Uma editora comprou as memórias de {e}, com ghost-writer e adiantamento gordo. O que pode sair: {b}.', 'A publisher bought {e}\'s memoir, ghost-written with a fat advance. What may come out: {b}.'), { e: e?.name ?? '?', b: bombs.join(', ') || l('detalhes constrangedores', 'embarrassing details').pt });
  },
  options: [
    { id: 'pay', label: l('Comprar o silêncio', 'Buy their silence'), hint: l('Custa $15.000 (era) do seu bolso; o livro sai sem as bombas.', 'Costs $15,000 (era) from your pocket; the book comes out without the bombshells.'),
      apply: (s, c) => { ownerOf(s).wealth -= money(s, 15000); const e = love17(s).exes[Number(c.data.i)]; if (e) e.aff = 35; } },
    { id: 'sue', label: l('Processar para barrar', 'Sue to block it'), hint: l('Custas $6.000; 40% de liminar. Se perder, o livro vira best-seller.', 'Fees $6,000; 40% injunction. If you lose, the book becomes a best-seller.'),
      apply: (s, c, r) => { ownerOf(s).wealth -= money(s, 6000); if (r.chance(0.4)) { const e = love17(s).exes[Number(c.data.i)]; if (e) e.aff = 30; return l('Liminar concedida: o livro foi recolhido.', 'Injunction granted: the book was pulled.'); } tellAll(s, Number(c.data.i), 1.3); return l('Liminar negada: o processo virou propaganda.', 'Injunction denied: the lawsuit became publicity.'); } },
    { id: 'ignore', label: l('Deixar sair', 'Let it come out'), hint: l('Grátis: as revelações viram fatos públicos (traição → escândalo; armário → exposição).', 'Free: the revelations become public facts (affair → scandal; closet → outing).'),
      apply: (s, c) => { tellAll(s, Number(c.data.i), 1); } },
  ],
});
function tellAll(s: GameState, i: number, k: number): void {
  const L7 = love17(s);
  const e = L7.exes[i];
  if (!e) return;
  e.aff = 40;
  const o = ownerOf(s);
  const text = fmtL(l('Livro de {e} sobre {o} chega às livrarias.', '{e}\'s book about {o} hits the shelves.'), { e: e.name, o: o.name });
  emitFact(s, { kind: 'statement', actors: ['player'], place: s.config.homeCity, severity: Math.round(40 * k), visibility: 'public', tags: ['memoir', 'bad'], text, src: 'love17' });
  if (L7.past) { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3 * k, 0, 100); const pt = life(s).partner; if (pt) pt.affinity = clamp(pt.affinity - 10, 0, 100); }
  const me = sexOf(s, 'player');
  if (isQueer(me) && me.c === 'closet') comeOut(s, 'player', 'outed', e.name);
  notify(s, text, 'bad');
}

// outros sistemas: separação de NPC do seu elenco por traição pesa no estresse dele
onFact('breakup', (s, f) => { const pid = f.actors[0]; if (s.persons[pid] && playerActs(s).some((a) => s.acts[a]?.members.includes(pid))) addStress(s, pid, 8, l('Separação', 'Breakup')); }, 'love17:breakup');

export const actOfPerson17 = (s: GameState, pid: string): Act | undefined => Object.values(s.acts).find((a) => a.members.includes(pid));

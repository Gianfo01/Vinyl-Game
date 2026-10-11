// Rodada 19 (Frente 4 + 11.8 + N17) — PÓS-VIDA. O espólio vira ATOR: herdeiros com opinião sobre você, testamenteiro
// (herdeiro, curador da fundação ou advogado nomeado pelo juiz), brigas, processos e propostas que partem DELES.
// 11.8: a morte encerra o contrato do artista; os masters seguem a ficha de direitos (dono = artista → voltam aos
// herdeiros; compartilhado → espólio fica com 50% do lucro; selo → ficam, com royalties ao espólio); sociedade
// (shared18) com sócio que morreu passa ao herdeiro; projeto póstumo de catálogo exige quem tem o master.
// N17: arena digital própria (ABBA Voyage, 2022): obra cara (capex), qualidade técnica da época, residências de
// avatares de artistas vivos (com consentimento) ou mortos (com o espólio), saturação e canibalização da turnê real.
// Prêmios póstumos (awards19) e cinebiografia (post18 → revival19 needle drop) fecham o ciclo.
// LÊ: post18 (espólio, projetos, tecnologia), rights (ficha), shared18, image17, awards19, fans18, fame. ESCREVE: contratos,
// donos dos masters, ledger (capex, live, rights), relações (herdeiros), revival19, campus18 (prédio), calendar19,
// manchetes. Fatos: estate_contract, estate_suit, estate_offer, estate_partner, arena_open, avatar_residency (+ hologram).
// Modo exato: atos reais intocados não processam nem oferecem nada (crônica do post18 cobre o real).

import { Rng, clamp, hashString } from '../../core/rng';
import { l, type L } from '../../data/world';
import { recordAward19 } from '../awards19';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { histLocked } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { releasesOfDeal, rightsOf } from '../rights';
import { rng19 } from '../rng19';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, notify, playerActs, post, staffSkill } from '../util';
import { CAMPUS_X19 } from './campus18';
import { headline19 } from './factlink19';
import { fan18 } from './fans18';
import { isEstate } from './image17';
import { LINK18_PARTS, LINKS18, lk18 } from './links18';
import { POST19, PK18, SHARE18, STANCE18, actOfP18, ask18, estate18, mediate18, post18, start18, tech18, type Est18, type PK18 as PKind, type Share18 } from './post18';
import { oldRel19, stage19 } from './revival19';
import { sh18, type Style18 as VStyle } from './shared18';

const F = fmtL;
const rr = (s: GameState, tag: string) => rng19(s, 'af19', () => Rng.fromSeed(`${s.config.seed}|af19|${tag}|${s.week}`));
const $k = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

// ---------------------------------------------------------------- estado

export type ExK19 = 'heir' | 'found' | 'lawyer';
export interface Suit19 { w: number; k: 'masters' | 'heirs' | 'relic'; amt: number; odds: number; fight?: 1 }
export interface Est19 { pid: string; act: string; ex: ExK19; exN: string; op: number[]; held: string[]; sh?: number; how?: 'reverted' | 'shared' | 'kept'; suit?: Suit19; offW?: number; offK?: PKind; aw?: number }
export interface Res19 { act: string; pid: string; from: number; until: number; living?: 1; share: number; gross: number; back: number }
export interface Arena19 { y: number; city: string; st: 'build' | 'open' | 'sold'; left: number; cost: number; paid: number; q: number; n: number; earned: number; res?: Res19; past: string[] }
export interface AF19 { e: Record<string, Est19>; ar?: Arena19; lic: Record<string, number>; log: [number, number, L][]; seen: Record<string, 1> }
declare module '../ext4' { interface Ext4 { af19: AF19 } }
const fresh = (): AF19 => ({ e: {}, lic: {}, log: [], seen: {} });
registerExt4('af19', fresh);
export function af19(s: GameState): AF19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.af19 ??= fresh()) as AF19;
  st.e ??= {}; st.lic ??= {}; st.log ??= []; st.seen ??= {};
  return st;
}
const log = (s: GameState, t: L) => { const st = af19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const link = (s: GameState, id: string, t: L) => { const st = lk18(s); st.log.unshift([s.week, id, t]); if (st.log.length > 40) st.log.length = 40; };
const mine = (a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);
const locked = (s: GameState, a?: Act) => !!a && histLocked(s, a);

const EXN: Record<ExK19, L> = { heir: l('herdeiro(a) testamenteiro(a)', 'executor heir'), found: l('curadores da fundação', 'foundation trustees'), lawyer: l('advogado(a) nomeado(a) pelo juiz', 'court-appointed lawyer') };
const LAWYERS = ['Abramowitz', 'Okonkwo', 'Ferreira', 'Lindqvist', 'Castellanos', 'Whitfield', 'Nakamura', 'Duarte'];

/** Espólio como ator (abre o Est18 do post18 e o liga a herdeiros com opinião sobre você). */
export function est19(s: GameState, pid: string): Est19 | null {
  const e = estate18(s, pid);
  if (!e) return null;
  const st = af19(s);
  if (st.e[pid]) { const x = st.e[pid]; while (x.op.length < e.heirs.length) x.op.push(50); return x; }
  const found = e.heirs.length === 1 && !e.heirs[0].pid;
  const ex: ExK19 = found ? 'found' : e.heirs.length >= 3 || e.unity < 45 ? 'lawyer' : 'heir';
  const exN = ex === 'lawyer' ? `Dr(a). ${LAWYERS[hashString(`${s.config.seed}|ex|${pid}`) % LAWYERS.length]}` : ex === 'found' ? e.heirs[0].name : e.heirs[0].name;
  const rep = s.player.reputation.artists / 10;
  const op = e.heirs.map((h) => clamp(Math.round((h.st === 'guard' ? 42 : h.st === 'cash' ? 55 : 48) + rep), 5, 95));
  return (st.e[pid] = { pid, act: e.act, ex, exN, op, held: [] });
}
export const opAvg19 = (x: Est19): number => (x.op.length ? x.op.reduce((t, v) => t + v, 0) / x.op.length : 50);
function nudgeOp(s: GameState, x: Est19, by: (st: Est18['heirs'][number]['st']) => number): void {
  const e = post18(s).est[x.pid];
  if (!e) return;
  e.heirs.forEach((h, i) => { x.op[i] = clamp(Math.round((x.op[i] ?? 50) + by(h.st)), 0, 100); });
}
/** quem segura os masters do ato: 'player' | id de selo | 'estate' | 'indie' */
export function holder19(s: GameState, a: Act): string {
  const own: Record<string, number> = {};
  for (const id of a.releases) { const r = s.releases[id]; if (r && !r.hist) own[r.owner] = (own[r.owner] ?? 0) + Math.max(1, r.totalUnits); }
  const top = Object.entries(own).sort((x, y) => y[1] - x[1])[0]?.[0];
  if (!top) return mine(a) ? 'player' : 'indie';
  if (top === 'indie' && a.members.some((p) => af19(s).e[p]?.held.length)) return 'estate';
  return top;
}

// ---------------------------------------------------------------- 11.8: morte encerra o contrato; masters seguem a ficha

export function endContract19(s: GameState, a: Act, pid: string): Est19 | null {
  const x = est19(s, pid);
  if (!x) return null;
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  if (!c || c.party !== 'player' || x.how) return x;
  if (c.endWeek > s.week) c.endWeek = s.week;
  c.releasesOwed = Math.min(c.releasesOwed, c.releasesDone);
  const t = rightsOf(c);
  let how: Est19['how'] = 'kept';
  if (t.master === 'artist' || c.reverted) {
    const rels = releasesOfDeal(s, c).concat(c.reverted ? a.releases.map((id) => s.releases[id]).filter((r): r is Release => !!r && r.owner === 'indie') : []);
    for (const r of rels) r.owner = 'indie';
    x.held = [...new Set(rels.map((r) => r.id))];
    how = 'reverted';
  } else if (t.master === 'shared') { x.sh = 0.5; how = 'shared'; }
  x.how = how;
  const p = s.persons[pid];
  const txt = how === 'reverted' ? F(l('Morte de {p} encerra o contrato com {c}: {n} master(s) voltam aos herdeiros, como manda a ficha.', '{p}\'s death ends the deal with {c}: {n} master(s) go to the heirs, as the rights sheet says.'), { p: p?.name ?? '?', c: s.config.companyName, n: x.held.length })
    : how === 'shared' ? F(l('Morte de {p} encerra o contrato: os masters seguem com {c}, mas o espólio fica com 50% do lucro.', '{p}\'s death ends the deal: the masters stay with {c}, but the estate keeps 50% of the profit.'), { p: p?.name ?? '?', c: s.config.companyName })
      : F(l('Morte de {p} encerra o contrato: os masters ficam com {c}; o espólio recebe os royalties.', '{p}\'s death ends the deal: the masters stay with {c}; the estate gets the royalties.'), { p: p?.name ?? '?', c: s.config.companyName });
  emitFact(s, { kind: 'estate_contract', actors: [a.id, 'player', pid], place: a.city, severity: clamp(30 + a.fame / 3, 30, 70), visibility: 'public', tags: ['posthumous', how, 'estate'], text: txt, src: 'afterlife19', data: { pid, n: x.held.length } });
  return x;
}

onFact('death', (s, f) => {
  for (const id of f.actors) {
    const a = s.acts[id];
    if (!a || (!mine(a) && a.fame < 30)) continue;
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p || p.alive || (p.died ?? 0) < s.year - 1 || af19(s).seen[`d:${pid}`]) continue;
      af19(s).seen[`d:${pid}`] = 1;
      if (isEstate(s, a) && a.owner === 'player' && !a.playerBand) endContract19(s, a, pid);
      else est19(s, pid);
    }
  }
}, 'af19:death');

onFact('estate_contract', (s, f) => {
  const x = af19(s).e[String(f.data?.pid ?? '')];
  if (!x) return;
  // herdeiros guardiões aplaudem a reversão; os que queriam faturar reclamam de masters presos
  if (f.tags.includes('reverted')) nudgeOp(s, x, (st) => (st === 'guard' ? 8 : st === 'artist' ? 4 : 2));
  else if (f.tags.includes('kept')) nudgeOp(s, x, (st) => (st === 'cash' ? -6 : st === 'guard' ? -3 : 0));
  log(s, f.text);
  link(s, 'af19', f.text);
  notify(s, f.text, 'event');
  if (f.severity >= 45) headline19(s, f.text, 2);
}, 'af19:contract');

// ---------------------------------------------------------------- 11.8: projeto póstumo exige o dono do master

/** Licença de catálogo de um master alheio (selo rival ou espólio) por 5 anos. */
export function licCost19(s: GameState, a: Act): number { return money(s, 15000 + a.fame * 900 + a.releases.length * 1500); }
export function licMasters19(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a) return l('Sem ato.', 'No act.');
  const h = holder19(s, a);
  if (h === 'player') return l('Os masters já são seus.', 'The masters are already yours.');
  const c = licCost19(s, a);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  if (h === 'estate') { const x = a.members.map((p) => af19(s).e[p]).find(Boolean); if (x && opAvg19(x) < 30) return l('Os herdeiros não querem conversa com você.', 'The heirs will not talk to you.'); }
  post(s, `af19lic:${actId}:${s.week}`, -c, 'rights', `Licença de masters: ${a.name}`);
  if (h !== 'estate' && h !== 'indie' && s.labels[h]) s.labels[h].cash += c;
  af19(s).lic[actId] = s.year + 5;
  const t = F(l('Licença de 5 anos do catálogo de {a} ({h}) por {c}.', '5-year licence of {a}\'s catalog ({h}) for {c}.'), { a: a.name, h: h === 'estate' ? l('espólio', 'estate') : s.labels[h]?.name ?? h, c: $k(c) });
  log(s, t); link(s, 'af19', t);
  return null;
}
const REC_K: PKind[] = ['box', 'remaster', 'vault', 'ai_album'];
POST19.held = (s, actId) => { const a = s.acts[actId]; return !!a && holder19(s, a) === 'estate'; };
POST19.block = (s, pid, k) => {
  if (!REC_K.includes(k)) return null;
  const a = actOfP18(s, pid);
  if (!a) return null;
  const h = holder19(s, a);
  if (h === 'player' || h === 'estate' || h === 'indie' || (af19(s).lic[a.id] ?? 0) >= s.year) return null;
  return F(l('Os masters de {a} são de {h}: licencie o catálogo antes ({c}).', '{a}\'s masters belong to {h}: license the catalog first ({c}).'), { a: a.name, h: s.labels[h]?.name ?? h, c: $k(licCost19(s, a)) });
};
POST19.adj = (s, pid, k) => {
  const x = af19(s).e[pid];
  if (!x) return null;
  let d = (opAvg19(x) - 50) / 250;
  if (x.ex === 'lawyer') d -= 0.05;
  if (x.offK === k && (x.offW ?? 0) >= s.week) d += 0.6; // a proposta partiu deles
  if (x.suit && !x.suit.fight) d -= 0.2;
  if (Math.abs(d) < 0.01) return null;
  return { d, why: F(l('Opinião dos herdeiros sobre você ({o}/100), testamenteiro: {e}{x}', 'Heirs\' opinion of you ({o}/100), executor: {e}{x}'), { o: Math.round(opAvg19(x)), e: EXN[x.ex], x: x.offK === k && (x.offW ?? 0) >= s.week ? l(' — a ideia foi deles', ' — it was their idea') : '' }) };
};

// ---------------------------------------------------------------- E2: processos, propostas, sociedade

const SUITK: Record<Suit19['k'], L> = { masters: l('masters e royalties', 'masters and royalties'), heirs: l('briga entre herdeiros', 'heirs\' feud'), relic: l('posse de relíquia', 'ownership of a relic') };
export function suitOdds19(s: GameState, x: Est19): number {
  const legal = staffSkill(s, 'legal');
  return clamp(0.35 + legal / 300 + (x.how === 'kept' ? 0.1 : -0.05) + (s.player.reputation.institutional - 50) / 300, 0.1, 0.85);
}
/** Herdeiros (ou o testamenteiro) entram na justiça. */
export function suit19(s: GameState, pid: string, k: Suit19['k']): Suit19 | null {
  const x = est19(s, pid);
  const a = x ? s.acts[x.act] : undefined;
  if (!x || !a || x.suit) return null;
  const e = post18(s).est[pid];
  x.suit = { w: s.week + 13, k, amt: money(s, 15000 + a.fame * 1200), odds: suitOdds19(s, x) };
  if (k !== 'masters' && e) { e.dispute = Math.max(e.dispute, s.week + 26); e.unity = clamp(e.unity - 10, 0, 100); }
  const p = s.persons[pid];
  const txt = k === 'masters' ? F(l('Herdeiros de {p} processam {c}: querem {k}.', '{p}\'s heirs sue {c}: they want {k}.'), { p: p?.name ?? '?', c: s.config.companyName, k: SUITK[k] })
    : F(l('Herdeiros de {p} vão à justiça uns contra os outros ({k}).', '{p}\'s heirs take each other to court ({k}).'), { p: p?.name ?? '?', k: SUITK[k] });
  emitFact(s, { kind: 'estate_suit', actors: [a.id, ...(k === 'masters' ? ['player'] : []), pid], place: a.city, severity: clamp(35 + a.fame / 3, 35, 75), visibility: 'public', tags: ['posthumous', 'law', k], text: txt, src: 'afterlife19', data: { pid } });
  if (k === 'masters') pushInbox18(s, 'af19_suit', { from: x.exN, subject: F(l('Processo do espólio de {p}', 'Lawsuit from {p}\'s estate'), { p: p?.name ?? '?' }), tone: 'bad',
    body: F(l('O espólio pede {v} e quer rever a posse dos masters. Brigar: {o}% de chance de vencer (equipe jurídica, ficha de direitos, reputação). Devolver os masters encerra tudo e agrada os guardiões do legado.', 'The estate asks {v} and wants to revisit ownership of the masters. Fight: {o}% chance to win (legal staff, rights sheet, reputation). Returning the masters ends it and pleases the legacy guardians.'), { v: $k(x.suit.amt), o: Math.round(x.suit.odds * 100) }),
    ref: { pid, act: a.id }, actions: [{ id: 'give', label: l('Devolver os masters', 'Return the masters') }, { id: 'fight', label: l('Brigar na justiça', 'Fight in court') }, { id: 'settle', label: l('Acordo (pagar)', 'Settle (pay)') }], weeks: 8 });
  return x.suit;
}
export function answerSuit19(s: GameState, pid: string, how: 'give' | 'fight' | 'settle'): L {
  const x = af19(s).e[pid];
  const a = x ? s.acts[x.act] : undefined;
  if (!x?.suit || !a) return l('Sem processo.', 'No lawsuit.');
  if (how === 'settle') {
    const amt = x.suit.amt;
    post(s, `af19set:${pid}:${s.week}`, -amt, 'legal', `Acordo com o espólio (${a.name})`);
    nudgeOp(s, x, (st) => (st === 'cash' ? 10 : 3)); x.suit = undefined;
    return F(l('Acordo de {v} com o espólio. Os herdeiros que queriam dinheiro ficaram satisfeitos.', '{v} settlement with the estate. The heirs who wanted money are satisfied.'), { v: $k(amt) });
  }
  if (how === 'give') {
    const rels = a.releases.map((id) => s.releases[id]).filter((r): r is Release => !!r && r.owner === 'player');
    for (const r of rels) r.owner = 'indie';
    x.held = [...new Set([...x.held, ...rels.map((r) => r.id)])]; x.how = 'reverted'; x.suit = undefined;
    nudgeOp(s, x, (st) => (st === 'guard' ? 18 : 8));
    s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100);
    return F(l('Você devolveu {n} master(s) ao espólio. Os guardiões do legado elogiam em público.', 'You returned {n} master(s) to the estate. The legacy guardians praise you in public.'), { n: rels.length });
  }
  x.suit.fight = 1;
  post(s, `af19law:${pid}:${s.week}`, -money(s, 4000), 'legal', `Advogados: espólio de ${a.name}`);
  return F(l('Você vai brigar. Sentença em ~{w} semanas (veja o Calendário).', 'You will fight. Ruling in ~{w} weeks (see the Calendar).'), { w: Math.max(1, x.suit.w - s.week) });
}
function ruling19(s: GameState, x: Est19, win: boolean): void {
  const a = s.acts[x.act];
  if (!x.suit || !a) return;
  const t = win ? F(l('Justiça dá ganho de causa a {c} contra o espólio de {a}.', 'Court rules for {c} against {a}\'s estate.'), { c: s.config.companyName, a: a.name })
    : F(l('{c} perde para o espólio de {a}: indenização e 10% do lucro do catálogo aos herdeiros.', '{c} loses to {a}\'s estate: damages and 10% of the catalog profit to the heirs.'), { c: s.config.companyName, a: a.name });
  if (win) nudgeOp(s, x, () => -10);
  else { post(s, `af19rul:${x.pid}:${s.week}`, -Math.round(x.suit.amt * 1.5), 'legal', `Sentença: espólio de ${a.name}`); x.sh = Math.max(x.sh ?? 0, 0.1); nudgeOp(s, x, () => 6); }
  x.suit = undefined;
  emitFact(s, { kind: 'case_ruling', actors: [a.id, 'player'], place: a.city, severity: 40, visibility: 'public', tags: ['estate', win ? 'good' : 'bad'], text: t, src: 'afterlife19' });
  log(s, t);
}
onFact('estate_suit', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (a) a.fame = clamp(a.fame + 0.5, 0, 100); // briga pública relembra a obra
  for (const pid of a?.members ?? []) { const p = s.persons[pid]; if (p?.alive) p.stress = clamp((p.stress ?? 0) + 6, 0, 100); }
  log(s, f.text); link(s, 'af19', f.text);
  headline19(s, f.text, f.tags.includes('masters') ? 3 : 2);
}, 'af19:suit');

/** O espólio propõe um projeto (postura da maioria escolhe o tipo). */
export function offerKind19(s: GameState, pid: string): PKind | null {
  const e = estate18(s, pid);
  if (!e) return null;
  const c = { guard: 0, cash: 0, artist: 0 }; for (const h of e.heirs) c[h.st]++;
  const m = (Object.keys(c) as (keyof typeof c)[]).sort((x, y) => c[y] - c[x])[0];
  const pref: PKind[] = m === 'cash' ? ['avatar', 'holo_tour', 'holo_show', 'box', 'tribute'] : m === 'guard' ? ['biopic', 'tribute', 'remaster', 'box'] : ['vault', 'remaster', 'tribute', 'box'];
  return pref.find((k) => s.year >= PK18[k].from && (!PK18[k].to || s.year <= PK18[k].to!) && !post18(s).proj.some((p) => p.pid === pid && p.k === k && p.st === 'run')) ?? null;
}
export function offer19(s: GameState, pid: string): boolean {
  const x = est19(s, pid);
  const a = x ? s.acts[x.act] : undefined;
  if (!x || !a) return false;
  const k = offerKind19(s, pid);
  if (!k) return false;
  x.offW = s.week + 8; x.offK = k;
  const p = s.persons[pid];
  const t = F(l('O espólio de {p} propõe a {c}: {k}.', '{p}\'s estate pitches {c}: {k}.'), { p: p?.name ?? '?', c: s.config.companyName, k: PK18[k].name });
  emitFact(s, { kind: 'estate_offer', actors: [a.id, 'player', pid], place: a.city, severity: 30, visibility: 'rumor', tags: ['posthumous', k], text: t, src: 'afterlife19', data: { pid } });
  pushInbox18(s, 'af19_offer', { from: x.exN, subject: t,
    body: F(l('{d} Eles pedem {sh} e prometem assinar rápido. Postura da maioria: {st}.', '{d} They ask {sh} and promise to sign quickly. Majority stance: {st}.'), { d: PK18[k].desc, sh: SHARE18.fair.name, st: STANCE18[post18(s).est[pid]?.heirs[0]?.st ?? 'artist'] }),
    ref: { pid, act: a.id, k }, actions: [{ id: 'yes', label: l('Aceitar a proposta', 'Accept the pitch') }, { id: 'no', label: l('Recusar com educação', 'Politely decline') }], weeks: 8 });
  return true;
}
onFact('estate_offer', (s, f) => {
  const e = post18(s).est[String(f.data?.pid ?? '')];
  if (e) e.legacy = clamp(e.legacy + 1, 0, 100); // espólio ativo mantém o nome vivo
  link(s, 'af19', f.text);
}, 'af19:offer');

// sócio morto: a parte dele vai ao herdeiro, que traz o próprio estilo
const STYLE_OF: Record<string, VStyle> = { cash: 'greedy', guard: 'cautious', artist: 'visionary' };
export function partnerHeirs19(s: GameState): number {
  let n = 0;
  for (const v of sh18(s).v) {
    if (v.st !== 'on' || !v.pk.startsWith('p:') || af19(s).seen[`sh:${v.id}`]) continue;
    const pid = v.pk.slice(2), p = s.persons[pid];
    if (!p || p.alive) continue;
    af19(s).seen[`sh:${v.id}`] = 1;
    const e = estate18(s, pid);
    const h = e?.heirs[0];
    if (!h) continue;
    const old = v.pn;
    v.pn = h.name; if (h.pid) v.pk = `p:${h.pid}`; v.style = STYLE_OF[h.st]; v.mood = 45;
    const t = F(l('{o} morreu: a parte dele(a) em "{v}" passa a {h} ({st}).', '{o} died: their stake in "{v}" passes to {h} ({st}).'), { o: old, v: v.name, h: h.name, st: STANCE18[h.st] });
    emitFact(s, { kind: 'estate_partner', actors: ['player', pid], severity: 30, visibility: 'public', tags: ['posthumous', 'venture', h.st], text: t, src: 'afterlife19', data: { v: v.id } });
    n++;
  }
  return n;
}
onFact('estate_partner', (s, f) => {
  const v = sh18(s).v.find((x) => x.id === String(f.data?.v ?? ''));
  if (!v) return;
  sh18(s).log.unshift([s.year, s.month, f.text]);
  if (v.style === 'greedy') v.offer = Math.round(v.cash * 1.2 + money(s, 20000)); // herdeiro que quer faturar já fala em vender
  notify(s, f.text, 'event');
  link(s, 'af19', f.text);
}, 'af19:partner');

// prêmio póstumo (awards19): herdeiros e relíquias reagem
onFact('award_posthumous', (s, f) => {
  for (const id of f.actors) {
    const a = s.acts[id];
    if (!a) continue;
    for (const pid of a.members) { const x = af19(s).e[pid]; if (x && mine(a)) nudgeOp(s, x, () => 3); }
    a.fans.casual += 500;
  }
}, 'af19:award');

// cinebiografia pronta (post18) → needle drop no revival19 e manchete
onFact('deal', (s, f) => {
  if (f.src !== 'post18' || !f.tags.includes('biopic') || f.actors.length !== 2) return;
  const a = s.acts[f.actors[0]];
  if (!a) return;
  const rel = a.releases.map((id) => s.releases[id]).filter((r): r is Release => !!r && oldRel19(s, r)).sort((x, y) => y.q - x.q)[0];
  if (rel) stage19(s, rel.id, 'film', 10);
  headline19(s, F(l('Cinebiografia de {a} devolve o catálogo às rádios.', '{a} biopic sends the catalog back to radio.'), { a: a.name }), 2);
}, 'af19:biopic');

// ---------------------------------------------------------------- N17: arena digital (ABBA Voyage, 2022)

export const ARENA_FROM19 = 2021;
export const arenaCost19 = (s: GameState): number => money(s, 7000000);
export const arenaRun19 = (s: GameState): number => money(s, 180000);
export const resCost19 = (s: GameState): number => money(s, 900000);
export const ARENA_MONTHS19 = 18;
export function arenaBlock19(s: GameState): L | null {
  if (s.year < ARENA_FROM19) return F(l('Ainda não existe tecnologia de avatares para isso ({y}+).', 'Avatar tech for this does not exist yet ({y}+).'), { y: ARENA_FROM19 });
  const ar = af19(s).ar;
  if (ar && ar.st !== 'sold') return l('Você já tem uma arena digital.', 'You already own a digital arena.');
  if (s.player.cash < arenaCost19(s) * 0.3) return F(l('Precisa de 30% à vista ({c}).', 'Needs 30% up front ({c}).'), { c: $k(arenaCost19(s) * 0.3) });
  return null;
}
export function buildArena19(s: GameState): L | null {
  const b = arenaBlock19(s);
  if (b) return b;
  const cost = arenaCost19(s), up = Math.round(cost * 0.3);
  post(s, `venture:af19arena:${s.week}`, -up, 'capex', 'Arena digital: entrada da obra');
  af19(s).ar = { y: s.year, city: s.config.homeCity, st: 'build', left: ARENA_MONTHS19, cost, paid: up, q: tech18(s.year + 1, 'avatar').q, n: 0, earned: 0, past: [] };
  const t = F(l('{c} começa a erguer uma arena digital para residências de avatares ({m} meses).', '{c} starts building a digital arena for avatar residencies ({m} months).'), { c: s.config.companyName, m: ARENA_MONTHS19 });
  log(s, t); link(s, 'af19', t);
  return null;
}
/** Ocupação esperada (0..1) com o porquê. */
export function occ19(s: GameState, actId: string, pid?: string): { v: number; parts: WhyPart[] } {
  const a = s.acts[actId], ar = af19(s).ar;
  const parts: WhyPart[] = [];
  if (!a || !ar) return { v: 0, parts };
  const fans = a.fans.core + a.fans.active * 0.5 + a.fans.casual * 0.05;
  const base = clamp(0.2 + a.fame / 160 + Math.log10(1 + fans) / 14, 0.1, 0.95);
  parts.push({ label: l('Fama e fãs do ato (base)', 'Act fame and fans (base)'), value: Math.round(base * 100), fmt: 'pct' });
  const q = 0.6 + ar.q * 0.5; parts.push({ label: l('Qualidade técnica dos avatares', 'Avatar technical quality'), value: q, fmt: 'mult' });
  const nov = s.year - ar.y <= 2 ? 1.15 : 1; if (nov > 1) parts.push({ label: l('Novidade da arena', 'Arena novelty'), value: nov, fmt: 'mult' });
  const sat = clamp(1 - ar.n * 0.06 - post18(s).holoN * 0.02, 0.55, 1); parts.push({ label: l('Saturação (residências já feitas, hologramas no mundo)', 'Saturation (past residencies, holograms worldwide)'), value: sat, fmt: 'mult' });
  const r = ar.res && ar.res.act === actId ? ar.res : undefined;
  const fat = r ? clamp(1 - Math.max(0, s.week - r.from - 52) / 4.33 * 0.012, 0.6, 1) : 1; if (fat < 1) parts.push({ label: l('Cansaço do público (mais de 1 ano)', 'Crowd fatigue (over 1 year)'), value: fat, fmt: 'mult' });
  const p = pid ? s.persons[pid] : undefined;
  const back = p && !p.alive ? (r?.back ?? 30) : 10;
  const auth = 1 - back / 220; parts.push({ label: l('Autenticidade (polêmica do "ressuscitar")', 'Authenticity ("resurrection" controversy)'), value: auth, fmt: 'mult' });
  const fa = fan18(s, actId, false);
  const pur = fa ? fa.fac[0] / Math.max(1, fa.fac.reduce((t, x) => t + x, 0)) : 0;
  const pf = 1 - Math.max(0, pur - 0.3) * 0.5; if (pf < 1) parts.push({ label: l('Fãs puristas torcem o nariz', 'Purist fans turn up their noses'), value: pf, fmt: 'mult' });
  return { v: clamp(base * q * nov * sat * fat * auth * pf, 0.05, 0.98), parts };
}
export const grossFull19 = (s: GameState): number => money(s, 650000);
/** Residência de avatares: artista vivo do elenco (consentimento) ou morto (espólio). */
export function residency19(s: GameState, actId: string, months = 24, share: Share18 = 'fair'): L | null {
  const ar = af19(s).ar, a = s.acts[actId];
  if (!ar || ar.st !== 'open') return l('A arena ainda não está aberta.', 'The arena is not open yet.');
  if (ar.res) return l('Já há uma residência em cartaz.', 'A residency is already running.');
  if (!a) return l('Sem ato.', 'No act.');
  if (locked(s, a)) return l('História exata: artistas reais só fazem o que fizeram de verdade.', 'Exact history: real artists only do what they really did.');
  const pid = a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0];
  const p = s.persons[pid];
  if (!p) return l('Sem artista.', 'No artist.');
  const dead = isEstate(s, a);
  if (!dead && !mine(a)) return l('Com artistas vivos, só os do seu elenco (consentimento).', 'With living artists, only your own roster (consent).');
  const c = resCost19(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  const od = ask18(s, pid, 'avatar', share);
  const r = rr(s, `res:${actId}`);
  if (!r.chance(od.p)) {
    post18(s).cd[pid] = s.week + 12;
    return dead ? F(l('O espólio de {p} recusa a residência de avatares.', '{p}\'s estate turns down the avatar residency.'), { p: p.name }) : F(l('{a} não aceita virar avatar agora.', '{a} will not become avatars for now.'), { a: a.name });
  }
  post(s, `af19res:${actId}:${s.week}`, -c, 'live_costs', `Captura e avatares: ${a.name}`);
  const back = dead ? clamp(Math.round(PK18.avatar.back + (estate18(s, pid)?.wish === 'never' ? 30 : 0)), 0, 100) : 5;
  ar.res = { act: actId, pid, from: s.week, until: s.week + Math.round(months * 4.33), living: dead ? undefined : 1, share: dead ? SHARE18[share].v : 0.3, gross: 0, back };
  ar.n += 1;
  const t = F(l('{a} estreia residência de avatares na arena digital de {c} ({m} meses).', '{a} opens an avatar residency at {c}\'s digital arena ({m} months).'), { a: a.name, c: s.config.companyName, m: months });
  emitFact(s, { kind: 'avatar_residency', actors: [a.id, 'player', pid], place: ar.city, severity: clamp(35 + a.fame / 3, 35, 80), visibility: 'public', tags: ['arena', dead ? 'posthumous' : 'living'], text: t, src: 'afterlife19', data: { pid } });
  if (dead) emitFact(s, { kind: 'hologram', actors: [a.id, 'player', pid], place: ar.city, severity: 40, visibility: 'public', tags: ['posthumous', 'avatar', 'arena', back >= 55 ? 'bad' : 'good'], text: t, src: 'afterlife19' });
  log(s, t);
  return null;
}
export function sellArena19(s: GameState): L | null {
  const ar = af19(s).ar;
  if (!ar || ar.st !== 'open') return l('Nada para vender.', 'Nothing to sell.');
  const v = Math.round(ar.cost * clamp(0.55 + ar.q * 0.3 - ar.n * 0.03, 0.4, 1));
  post(s, `venture:af19sell:${s.week}`, v, 'asset_sales', 'Venda da arena digital');
  ar.st = 'sold'; ar.res = undefined;
  const t = F(l('{c} vende a arena digital por {v}.', '{c} sells the digital arena for {v}.'), { c: s.config.companyName, v: $k(v) });
  log(s, t);
  return null;
}
function arenaMonth(s: GameState): void {
  const ar = af19(s).ar;
  if (!ar || ar.st === 'sold') return;
  if (ar.st === 'build') {
    const inst = Math.round((ar.cost - Math.round(ar.cost * 0.3)) / ARENA_MONTHS19);
    post(s, `venture:af19arena:${s.week}`, -inst, 'capex', 'Arena digital: obra');
    ar.paid += inst;
    if (--ar.left > 0) return;
    ar.st = 'open'; ar.q = tech18(s.year, 'avatar').q;
    const t = F(l('Abre a arena digital de {c} em {ci}: telas gigantes, som imersivo e lugar para 3 mil pessoas.', '{c}\'s digital arena opens in {ci}: giant screens, immersive sound and room for 3,000.'), { c: s.config.companyName, ci: ar.city });
    emitFact(s, { kind: 'arena_open', actors: ['player'], place: ar.city, severity: 45, visibility: 'public', tags: ['arena', 'campus'], text: t, src: 'afterlife19' });
    return;
  }
  post(s, `af19run:${s.week}`, -arenaRun19(s), 'live_costs', 'Arena digital: operação');
  const r = ar.res;
  if (!r) return;
  const a = s.acts[r.act];
  if (!a) { ar.res = undefined; return; }
  const g = Math.round(grossFull19(s) * occ19(s, r.act, r.pid).v);
  post(s, `af19g:${s.week}`, g, 'live', `Residência de avatares: ${a.name}`);
  const cut = Math.round(Math.max(0, g - arenaRun19(s)) * r.share);
  if (cut > 0) post(s, `af19e:${s.week}`, -cut, r.living ? 'royalties' : 'rights', r.living ? `Artistas: residência de avatares (${a.name})` : `Repasse ao espólio: avatares (${a.name})`);
  r.gross += g; ar.earned += g - cut;
  a.fans.casual += Math.round(g / 100 / 120);
  if (r.living) for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.stress = clamp((p.stress ?? 0) - 2, 0, 100); }
  if (s.week < r.until) return;
  ar.past.push(r.act); ar.res = undefined;
  const t = F(l('Termina a residência de avatares de {a}: bruto {g}.', '{a}\'s avatar residency ends: gross {g}.'), { a: a.name, g: $k(r.gross) });
  log(s, t); notify(s, t, 'good');
}
onFact('arena_open', (s, f) => {
  s.player.reputation.commercial = clamp(s.player.reputation.commercial + 2, 0, 100);
  headline19(s, f.text, 2); link(s, 'af19', f.text);
}, 'af19:arena');
onFact('avatar_residency', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (!a) return;
  a.fame = clamp(a.fame + 2, 0, 100);
  const fa = fan18(s, a.id, false);
  if (fa && f.tags.includes('posthumous')) fa.loy = clamp(fa.loy - 2, 0, 100); // "não é ele de verdade"
  headline19(s, f.text, 2);
}, 'af19:residency');
// avatar em cartaz canibaliza o show real do mesmo ato
registerMod('showRevenue', 'af19:avatar', (s, v, ctx) => {
  const r = (s.x4 as unknown as { af19?: AF19 }).af19?.ar?.res;
  return r && ctx.act?.id === r.act ? { value: v * 0.85, label: l('Avatares em cartaz disputam o mesmo público', 'Avatars in residency compete for the same crowd') } : null;
});
CAMPUS_X19.push((s, add) => {
  const ar = (s.x4 as unknown as { af19?: AF19 }).af19?.ar;
  if (!ar || ar.st === 'sold') return;
  add({ id: 'af19arena', kind: 'venue', name: l('Arena digital', 'Digital arena').pt, city: ar.city, lvl: 5, since: ar.y, st: ar.st === 'build' ? 'building' : 'open', prog: ar.st === 'build' ? 1 - ar.left / ARENA_MONTHS19 : undefined, goto: { area: 'lendas', tab: ['lendas9', 'estate19'] },
    kpi: [[l('Qualidade', 'Quality'), `${Math.round(ar.q * 100)}%`], [l('Residências', 'Residencies'), String(ar.n)], [l('Em cartaz', 'Now showing'), ar.res ? s.acts[ar.res.act]?.name ?? '?' : '—']] });
});

// ---------------------------------------------------------------- mês e ano

registerSimHook('month', 'afterlife19', (s) => {
  const st = af19(s);
  arenaMonth(s);
  partnerHeirs19(s);
  const r = rr(s, 'm');
  for (const x of Object.values(st.e)) {
    const a = s.acts[x.act];
    if (!a) continue;
    x.op = x.op.map((v) => v + (v < 50 ? 0.3 : v > 50 ? -0.2 : 0));
    if (x.suit) {
      if (x.suit.w <= s.week) {
        if (x.suit.k !== 'masters') x.suit = undefined;
        else if (x.suit.fight) ruling19(s, x, r.chance(x.suit.odds));
        else if (x.suit.w + 8 <= s.week) answerSuit19(s, x.pid, 'settle');
      }
      continue;
    }
    if (locked(s, a)) continue;
    const e = post18(s).est[x.pid];
    if (!e) continue;
    const involved = mine(a) || a.releases.some((id) => s.releases[id]?.owner === 'player');
    // processo: desunião, opinião baixa, masters presos
    let p = 0.002 + (e.unity < 40 ? 0.006 : 0) + (opAvg19(x) < 35 ? 0.008 : 0) + (x.how === 'kept' && e.heirs.some((h) => h.st === 'guard') ? 0.003 : 0);
    if (!involved) p *= 0.5;
    if (r.chance(p)) { suit19(s, x.pid, involved && holder19(s, a) === 'player' ? 'masters' : 'heirs'); continue; }
    // proposta do espólio a quem segura o catálogo
    if (involved && (x.offW ?? 0) < s.week - 104 && (post18(s).cd[x.pid] ?? 0) <= s.week && r.chance(0.012 * (0.5 + e.legacy / 60))) offer19(s, x.pid);
  }
});
registerSimHook('year', 'afterlife19', (s) => {
  // prêmio pelo conjunto da obra, póstumo, para legados enormes (awards19 → award_posthumous)
  const r = rr(s, 'y');
  for (const x of Object.values(af19(s).e)) {
    const a = s.acts[x.act], e = post18(s).est[x.pid];
    if (!a || !e || e.legacy < 70 || (x.aw ?? 0) >= s.year - 10 || !isEstate(s, a) || locked(s, a) || !r.chance(0.2)) continue;
    x.aw = s.year;
    recordAward19(s, { year: s.year, category: 'lifetime_posthumous', actId: a.id, name: F(l('Conjunto da obra (póstumo): {a}', 'Lifetime achievement (posthumous): {a}'), { a: a.name }).pt, byPlayer: a.owner === 'player' });
    e.legacy = clamp(e.legacy + 3, 0, 100);
  }
});

// ---------------------------------------------------------------- caixa, ecos, calendário, porquês, dicas, ligações

registerInboxKind('af19_suit', { label: l('Espólio: processo', 'Estate: lawsuit'), cat: 'decision', icon: 'gavel', prio: 2, goto: () => ({ area: 'lendas', tab: ['lendas9', 'estate19'] }),
  handle: (s, m, act) => answerSuit19(s, String(m.ref?.pid ?? ''), act === 'give' ? 'give' : act === 'fight' ? 'fight' : 'settle') });
registerInboxKind('af19_offer', { label: l('Espólio: proposta', 'Estate: pitch'), cat: 'deals', icon: 'hologram', prio: 1, goto: () => ({ area: 'lendas', tab: ['lendas9', 'post18'] }),
  handle: (s, m, act) => {
    const pid = String(m.ref?.pid ?? ''), k = String(m.ref?.k ?? '') as PKind, x = af19(s).e[pid];
    if (act !== 'yes' || !PK18[k]) { if (x) { nudgeOp(s, x, () => -4); x.offW = s.week; } return l('Você recusou. Os herdeiros anotam.', 'You declined. The heirs take note.'); }
    return start18(s, pid, k, 'fair').text;
  } });
registerConseq18('ib:af19_suit:give', { now: l('Masters voltam ao espólio; receita do catálogo sai do seu caixa.', 'Masters go back to the estate; catalog revenue leaves your books.'), later: [{ in: [3, 12], p: 0.5, tone: 'good', hint: l('Gesto assim é lembrado por outros artistas.', 'Other artists remember a gesture like that.'),
  fx: (f) => { f.rep('artists', 2).rep('institutional', 1); return l('Artistas citam o seu gesto com o espólio como exemplo de respeito.', 'Artists cite your gesture to the estate as an example of respect.'); } }] });
registerConseq18('ib:af19_suit:fight', { odds: (s, c) => { const x = af19(s).e[String(c.pid)]; return { p: x ? suitOdds19(s, x) : 0.4, why: [l('Equipe jurídica, ficha de direitos e reputação institucional.', 'Legal staff, rights sheet and institutional reputation.')] }; },
  later: [{ in: [4, 14], p: 0.35, tone: 'bad', hint: l('Brigar com a família de um morto querido tem custo de imagem.', 'Fighting a beloved artist\'s family has an image cost.'),
    fx: (f) => { f.rep('artists', -2).fans(-2); return l('Fãs fazem campanha contra o selo que "briga com a viúva".', 'Fans campaign against the label "fighting the widow".'); } }] });
registerConseq18('ib:af19_suit:settle', { now: l('Paga o pedido; os herdeiros que queriam dinheiro sossegam.', 'Pays the claim; the cash-minded heirs calm down.'), later: [{ in: [6, 18], p: 0.25, tone: 'bad', hint: l('Quem paga uma vez às vezes é cobrado de novo.', 'Pay once and you may be billed again.'),
  fx: (f) => { f.cash(-3000, 'Espólio volta a cobrar (auditoria)', 'legal'); return l('O espólio pede uma auditoria nova nos royalties.', 'The estate demands a new royalty audit.'); } }] });
registerConseq18('ib:af19_offer:yes', { now: l('O projeto começa com aval do espólio (chance bem maior).', 'The project starts with the estate\'s blessing (much better odds).'), later: [{ in: [4, 12], p: 0.4, tone: 'mixed', hint: l('Projeto póstumo divide fãs.', 'Posthumous projects split fans.'),
  fx: (f) => { f.fame(2).fans(1).rep('artistic', -1); return l('Crítica torce o nariz, mas o público aparece.', 'Critics sneer, but the public shows up.'); } }] });
registerConseq18('ib:af19_offer:no', { later: [{ in: [6, 18], p: 0.3, tone: 'bad', hint: l('O espólio pode procurar outro selo.', 'The estate may shop it to another label.'),
  fx: (f) => { f.rep('commercial', -1); return l('Um selo rival fecha o projeto que você recusou com o espólio.', 'A rival label closes the project you turned down with the estate.'); } }] });

registerDeadline('af19', (s, from, to) => {
  const out: Deadline19[] = [];
  const st = af19(s);
  for (const x of Object.values(st.e)) if (x.suit && x.suit.k === 'masters' && x.suit.w >= from && x.suit.w <= to) out.push({ id: `af19:suit:${x.pid}`, w: x.suit.w, kind: 'court', t: F(l('Processo do espólio de {p}', '{p} estate lawsuit'), { p: s.persons[x.pid]?.name ?? '?' }), tone: 'bad', act: !x.suit.fight, goto: { area: 'lendas', tab: ['lendas9', 'estate19'] } });
  const ar = st.ar;
  if (ar?.st === 'build') { const w = s.week + Math.round(ar.left * 4.33); if (w >= from && w <= to) out.push({ id: 'af19:arena', w, kind: 'build', t: l('Arena digital fica pronta', 'Digital arena completes'), tone: 'good' }); }
  if (ar?.res && ar.res.until >= from && ar.res.until <= to) out.push({ id: 'af19:res', w: ar.res.until, kind: 'other', t: F(l('Fim da residência de avatares de {a}', 'End of {a}\'s avatar residency'), { a: s.acts[ar.res.act]?.name ?? '?' }) });
  return out;
});
registerExplain('af19.estate', (s, c) => {
  const x = af19(s).e[String(c.pid)], e = post18(s).est[String(c.pid)];
  if (!x || !e) return null;
  const parts: WhyPart[] = e.heirs.map((h, i) => ({ label: F(l('{n} ({r}, {st})', '{n} ({r}, {st})'), { n: h.name, r: h.rel, st: STANCE18[h.st] }), value: Math.round(x.op[i] ?? 50), fmt: 'num' as const }));
  parts.push({ label: F(l('Testamenteiro: {n} — {e}', 'Executor: {n} — {e}'), { n: x.exN, e: EXN[x.ex] }) }, { label: l('União dos herdeiros', 'Heir unity'), value: e.unity, fmt: 'num' }, { label: l('Legado', 'Legacy'), value: e.legacy, fmt: 'num' });
  if (x.how) parts.push({ label: x.how === 'reverted' ? F(l('Masters com o espólio: {n}', 'Masters held by the estate: {n}'), { n: x.held.length }) : x.how === 'shared' ? l('Masters compartilhados: 50% do lucro ao espólio', 'Shared masters: 50% of profit to the estate') : l('Masters com o selo; royalties ao espólio', 'Masters with the label; royalties to the estate') });
  return { title: l('Espólio: quem decide e o que pensa de você', 'Estate: who decides and what they think of you'), value: Math.round(opAvg19(x)), fmt: 'num', parts, note: l('Opinião média dos herdeiros (0–100). Sobe com homenagens, devolução de masters e acordos; cai com recusas, brigas e caça-níqueis. Pesa na chance de aprovar projetos.', 'Average heir opinion (0–100). Rises with tributes, returned masters and settlements; falls with refusals, fights and cash grabs. Weighs on project approval odds.') };
});
registerExplain('af19.arena', (s, c) => {
  const ar = af19(s).ar;
  const id = String(c.act ?? ar?.res?.act ?? '');
  if (!ar || !s.acts[id]) return null;
  const o = occ19(s, id, c.pid ? String(c.pid) : ar.res?.pid);
  return { title: F(l('Ocupação prevista: {a}', 'Expected occupancy: {a}'), { a: s.acts[id].name }), value: Math.round(o.v * 100), fmt: 'pct', parts: o.parts, note: l('Bruto do mês = lotação cheia × ocupação; o espólio (ou os artistas vivos) leva a parte combinada do que sobra após a operação.', 'Monthly gross = full house × occupancy; the estate (or the living artists) takes the agreed cut of what is left after running costs.') };
});
registerAdvisorTip('afterlife19', (s) => {
  const out = [];
  for (const x of Object.values(af19(s).e)) if (x.suit?.k === 'masters' && !x.suit.fight) out.push({ id: `af19-suit-${x.pid}`, level: 'warn' as const, cat: 'other' as const, text: F(l('Espólio de {p} processa você.', '{p}\'s estate is suing you.'), { p: s.persons[x.pid]?.name ?? '?' }),
    why: [F(l('Pedem {v}; chance de vencer {o}%.', 'They ask {v}; odds to win {o}%.'), { v: $k(x.suit.amt), o: Math.round(x.suit.odds * 100) })], goto: { area: 'lendas', tab: ['lendas9', 'estate19'] as [string, string] } });
  const ar = af19(s).ar;
  if (ar?.st === 'open' && !ar.res) out.push({ id: 'af19-empty', level: 'warn' as const, cat: 'cash' as const, text: l('A arena digital está vazia.', 'The digital arena is empty.'), why: [F(l('Operação custa {c}/mês sem bilheteria.', 'Running costs {c}/month with no box office.'), { c: $k(arenaRun19(s)) })], goto: { area: 'lendas', tab: ['lendas9', 'estate19'] as [string, string] } });
  return out;
});

const AF_LINK = { id: 'af19', a: l('Espólio e herdeiros', 'Estate and heirs'), b: l('Contratos, masters e sociedades', 'Contracts, masters and partnerships'), how: l('A morte encerra o contrato; masters seguem a ficha de direitos; sócio morto passa a parte ao herdeiro; herdeiros processam ou propõem projetos.', 'Death ends the deal; masters follow the rights sheet; a dead partner\'s stake passes to the heir; heirs sue or pitch projects.') };
if (!LINKS18.some((x) => x.id === AF_LINK.id)) LINKS18.push(AF_LINK);
LINK18_PARTS.af19 = (s) => {
  const xs = Object.values(af19(s).e);
  return [{ label: l('Espólios acompanhados', 'Estates tracked'), value: xs.length, fmt: 'num' }, { label: l('Masters devolvidos/revertidos', 'Masters returned/reverted'), value: xs.reduce((t, x) => t + x.held.length, 0), fmt: 'num' }, { label: l('Processos abertos', 'Open lawsuits'), value: xs.filter((x) => x.suit).length, fmt: 'num' }];
};

/** espólios para a interface: os seus primeiro */
export function estates19(s: GameState): Est19[] {
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a) for (const pid of a.members) if (s.persons[pid] && !s.persons[pid].alive) est19(s, pid); }
  return Object.values(af19(s).e).sort((x, y) => Number(mine(s.acts[y.act])) - Number(mine(s.acts[x.act])) || (s.acts[y.act]?.fame ?? 0) - (s.acts[x.act]?.fame ?? 0));
}
export { mediate18 };
export const factPid19 = (f: Fact): string => String(f.data?.pid ?? '');

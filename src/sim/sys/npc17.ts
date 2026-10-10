// Rodada 17 — MUNDO ORGÂNICO DOS NPCs. Todo mês, sob a liberdade do diretor criativo (director17), artistas,
// empresários, executivos e selos decidem pelos próprios traços (persona13), estresse (stress17) e mágoas/lealdades
// (holds17) — e cada decisão vira um Fato (facts17) com o PORQUÊ, que aparece na página da pessoa, do ato e do selo
// e no painel Mundo vivo:
//  - artistas rompem com empresários (cresceram mais que ele, pouca lealdade, agenda exaustiva) e com selos
//    (selo quebrado, maior que o selo, mágoa), ficam independentes por opção ou assinam em outro lugar;
//  - quem pendura as chuteiras vira empresário(a); estrelas, empresários e executivos demitidos abrem selos
//    (que entram nas listas e disputam artistas como qualquer rival) — e artistas seguem o executivo que admiram;
//  - estratégia: adiar lançamento quando alguém muito maior lança no mesmo período, guardar o disco do astro para o
//    Natal, vender merch dos artistas, guerra de preços, aliciamento entre selos, rixa como marketing, fusões;
//  - extras (pesquisa): selo de vaidade (imprint) para superestrelas, leilão por agente livre, greve de disco e
//    regravação para retomar as masters, lançamento-surpresa (era digital), executivo que leva o elenco.
// Modos de história: em "Vida real exata" os atos reais intocados seguem o roteiro (histLocked); fora do modo livre
// pessoas reais não trocam de carreira nem fundam selos, e empresários históricos não são largados.
// Gerador próprio (semente + mês), sem tocar no RNG do jogo.

import { Rng, clamp } from '../../core/rng';
import { MGR_STYLE, mgrById, type MgrStyle, type RealMgr } from '../../data/managers14';
import { cityById, familyOf, l, type L } from '../../data/world';
import { endContract, expectedAdvance, signWithRival } from '../contracts';
import { dir17 } from '../director17';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { histLocked, histMode } from '../history15';
import { allHolds, grantHold, type Hold } from '../holds17';
import { unreleasedRecorded } from '../production';
import { lastScandal, scandal } from '../scandal17';
import { addStress, stressOf } from '../stress17';
import type { Act, GameState, Label, Person } from '../types';
import { fmtL, money, nextId, notify, playerActs } from '../util';
import { addHype } from './hype12';
import { depart, leaders, newLeader } from './leaders10';
import { goSolo16, leaveBand16 } from './lineup16';
import { m14, mgrActive, mgrCap, mgrName, rosterOf } from './managers14';
import { genMgrs16 } from './people16';
import { per13, type P13 } from './persona13';
import { bump } from './social8';
import { SIGN_VETO } from './gate14';

// ---------------------------------------------------------------- estado

export type MoveK = 'mgr_exit' | 'mgr_hire' | 'label_exit' | 'indie' | 'signed' | 'founded' | 'imprint' | 'career' | 'delay' | 'holiday' | 'surprise'
  | 'merch' | 'war' | 'war_end' | 'poach' | 'loyal' | 'beef' | 'merger' | 'bidding' | 'strike' | 'strike_end' | 'rerecord' | 'follow' | 'solo';
export interface Move17 { y: number; m: number; k: MoveK; a?: string; p?: string; lb?: string; lb2?: string; t: L }
export interface War17 { a: string; b: string; fam: string; mk: string; from: number; until: number }
export interface Npc17 {
  log: Move17[];
  /** chave da pessoa → [ano, de, para, porquê] */
  car: Record<string, [number, string, string, L][]>;
  /** empresários que vieram de outra carreira */
  mg: RealMgr[];
  /** selo fundado por NPC → quem, como, quando, porquê */
  fd: Record<string, { by: string; name: string; k: 'artist' | 'manager' | 'exec' | 'imprint'; y: number; why: L }>;
  /** ato → semana até quando fica independente por opção */
  indie: Record<string, number>;
  war: War17[];
  /** 'a|b' (atos) → semana em que a rixa acaba */
  beef: Record<string, number>;
  /** ato → semana em que a greve começou */
  strike: Record<string, number>;
  /** selo → ano em que começou a vender merch */
  merch: Record<string, number>;
  /** ato → selo de onde saiu brigado (para regravar) */
  exLb: Record<string, string>;
  cd: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { npc17: Npc17 } }
const fresh = (): Npc17 => ({ log: [], car: {}, mg: [], fd: {}, indie: {}, war: [], beef: {}, strike: {}, merch: {}, exLb: {}, cd: {} });
registerExt4('npc17', fresh);
const FILLED = new WeakSet<object>();
export function npc17(s: GameState): Npc17 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.npc17 ??= fresh()) as Npc17;
  if (!FILLED.has(st)) { for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v; FILLED.add(st); }
  // empresários de carreira nova voltam ao índice (depois de carregar ou ao trocar de partida: mgrById é global, o estado é por jogo)
  for (const m of st.mg) if (mgrById[m.id] !== m) mgrById[m.id] = m;
  return st;
}

// ---------------------------------------------------------------- utilidades

const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging');
/** Ato que o mundo dos NPCs pode mexer (não é seu, não está preso ao roteiro real). */
export const okAct17 = (s: GameState, a?: Act): a is Act => live(a) && !a.playerBand && a.owner !== 'player' && !histLocked(s, a);
/** Pessoa que pode mudar de carreira/fundar selo (pessoas reais só no modo livre). */
export const okPerson17 = (s: GameState, a: Act): boolean => histMode(s) !== 'strict' || !a.catalogNo; // r18: fora do exato, qualquer um muda de carreira
const okPerson = okPerson17;
const leadOf = (s: GameState, a: Act): Person | undefined => s.persons[a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]];
const F = (P: P13 | null, k: string): number => (P?.facets[k as keyof P13['facets']] ?? 50) / 50;
const Pa = (s: GameState, a: Act): P13 | null => { const p = leadOf(s, a); return p ? per13(s, `p:${p.id}`) : null; };
const Pl = (s: GameState, lb: Label): P13 | null => (lb.leaderId ? per13(s, `l:${lb.leaderId}`) : null);
const risk = (s: GameState, lb: Label): number => (lb.leaderId ? leaders(s)?.L[lb.leaderId]?.risk ?? 50 : 50) / 50;
const fam = (a: Act): string => familyOf(a.genre);
const mkOf = (cityId: string): string => cityById[cityId]?.market ?? 'na';
const why = (xs: L[]): L => ({ pt: xs.map((x) => x.pt).join(', '), en: xs.map((x) => x.en).join(', ') });
const activeLabels = (s: GameState): Label[] => Object.values(s.labels).filter((x) => x.active);
const mine = (s: GameState, a?: Act): boolean => !!a && (a.owner === 'player' || playerActs(s).includes(a.id));

function move(s: GameState, mv: Omit<Move17, 'y' | 'm'>, f?: { kind: string; actors: string[]; sev: number; vis?: Fact['visibility']; tags?: string[]; place?: string; cause?: string[] }): void {
  const st = npc17(s);
  st.log.unshift({ y: s.year, m: s.month, ...mv });
  if (st.log.length > 300) st.log.length = 300;
  if (f) emitFact(s, { kind: f.kind, actors: f.actors.filter(Boolean), place: f.place, severity: clamp(Math.round(f.sev), 1, 100), visibility: f.vis ?? 'rumor', tags: ['npc17', mv.k, ...(f.tags ?? [])], text: mv.t, src: 'npc17', cause: f.cause });
}
/** Movimentos recentes envolvendo um ato, pessoa (chave ou id), selo ou empresário. */
export function movesAbout(s: GameState, id: string, max = 20): Move17[] {
  const pid = id.startsWith('p:') ? id.slice(2) : id;
  return npc17(s).log.filter((x) => x.a === id || x.lb === id || x.lb2 === id || x.p === id || x.p === `p:${pid}`).slice(0, max);
}
export const careerOf = (s: GameState, key: string): [number, string, string, L][] => npc17(s).car[key] ?? npc17(s).car[`p:${key}`] ?? [];
export const founderOf = (s: GameState, lbId: string) => npc17(s).fd[lbId];
export const indieByChoice = (s: GameState, actId: string): boolean => (npc17(s).indie[actId] ?? 0) > s.week;
export const wars17 = (s: GameState): War17[] => npc17(s).war.filter((w) => w.until > s.week);
const cool = (s: GameState, k: string, weeks: number): boolean => { const st = npc17(s); if ((st.cd[k] ?? 0) > s.week) return false; st.cd[k] = s.week + weeks; return true; };

// independentes por opção não aceitam contrato de selo nenhum enquanto durar a escolha
SIGN_VETO.push((s, _lb, act) => indieByChoice(s, act.id));

export const ROLE17: Record<string, L> = {
  artist: l('artista', 'artist'), manager: l('empresário(a)', 'manager'), label: l('dono(a) de selo', 'label owner'), exec: l('executivo(a)', 'executive'), imprint: l('selo próprio (imprint)', 'own imprint'),
};

// ---------------------------------------------------------------- 1. artista rompe com o empresário

const allMgrs = (s: GameState): RealMgr[] => [...genMgrs16(s), ...npc17(s).mg].filter((m) => mgrActive(s, m));

function newMgrFor(s: GameState, r: Rng, a: Act, not: string): RealMgr | undefined {
  const mk = mkOf(a.city);
  const sc = (m: RealMgr) => m.a[3] + (m.fam.includes(fam(a) as never) ? 20 : 0);
  const c = allMgrs(s).filter((m) => m.id !== not && rosterOf(s, m.id).length < mgrCap(m) && mkOf(m.city) === mk).sort((x, y) => sc(y) - sc(x));
  return c[Math.min(c.length - 1, r.int(0, 1))];
}

function mgrBreaks(s: GameState, r: Rng, W: number): void {
  const st = m14(s);
  let n = 0;
  for (const [aid, rp] of Object.entries(st.rep)) {
    if (n >= 2) break;
    const a = s.acts[aid];
    const m = mgrById[rp.m];
    if (!m || !okAct17(s, a) || s.year - rp.y < 1 || (rp.h && histMode(s) === 'strict')) continue;
    const P = Pa(s, a);
    const lead = leadOf(s, a);
    const ws: L[] = [];
    let w = 0;
    const big = a.fame - (38 + m.a[3] * 0.4);
    if (big > 0) { w += big / 35; ws.push(l('cresceu mais que o empresário', 'outgrew the manager')); }
    if (F(P, 'lealdade') < 0.7) { w += 0.7 - F(P, 'lealdade'); ws.push(l('pouca lealdade', 'little loyalty')); }
    if (F(P, 'ego') > 1.3) { w += 0.3; ws.push(l('ego enorme', 'huge ego')); }
    if (lead && stressOf(s, lead.id).short > 55) { w += 0.4; ws.push(l('culpa a agenda exaustiva', 'blames the exhausting schedule')); }
    if (a.momentum < 12 && a.fame < 25) { w += 0.3; ws.push(l('carreira parada', 'stalled career')); }
    const sc = lastScandal(s, aid);
    const dropped = !!sc && s.week - sc.w < 26 && sc.eff >= 30 && (m.style === 'guardian' || m.style === 'impresario');
    if (dropped) { w += 0.8; ws.unshift(l('o empresário largou o cliente depois do escândalo', 'the manager dropped the client after the scandal')); }
    if (!ws.length || !r.chance(clamp(0.003 + w * 0.012, 0, 0.05) * W)) continue;
    n++;
    delete st.rep[aid];
    const self = big <= 0 && (F(P, 'teimosia') + F(P, 'confianca')) / 2 > 1.15;
    const nm = self ? undefined : newMgrFor(s, r, a, m.id);
    if (nm) st.rep[aid] = { m: nm.id, y: s.year };
    const t = fmtL(dropped ? l('{m} deixou de empresariar {a}: {w}.{n}', '{m} stopped managing {a}: {w}.{n}') : l('{a} rompeu com o empresário {m}: {w}.{n}', '{a} broke with manager {m}: {w}.{n}'),
      { a: a.name, m: mgrName(s, m), w: why(ws), n: nm ? fmtL(l(' Agora com {x}.', ' Now with {x}.'), { x: mgrName(s, nm) }) : l(' Segue sem empresário (cuida da própria carreira).', ' Now self-managed.') });
    move(s, { k: 'mgr_exit', a: aid, p: `e:${m.id}`, t }, { kind: 'exit', actors: [aid, `e:${m.id}`, lead?.id ?? ''], sev: 15 + a.fame / 3, vis: a.fame >= 40 ? 'public' : 'rumor', tags: ['manager'], place: a.city });
    grantHold(s, { holder: `e:${m.id}`, target: aid, kind: 'grievance', strength: 25 + Math.round(a.fame / 4), months: 36, text: l('rompimento com o empresário', 'break-up with the manager'), src: 'npc17', quiet: true });
    if (lead) addStress(s, lead.id, 5, l('Rompimento com o empresário', 'Split with the manager'));
  }
}

// ---------------------------------------------------------------- 2. artista rompe com o selo (independente ou outro selo)

export function pickNewLabel17(s: GameState, r: Rng, a: Act, not: string[]): Label | undefined {
  const adv = money(s, expectedAdvance(s, a));
  const c = activeLabels(s).filter((x) => !not.includes(x.id) && x.cash > adv * 1.5 && (x.focus.length === 0 || x.focus.includes(fam(a))));
  return c.map((x) => [x, (x.reputation + x.cash / Math.max(1, adv) * 2) * r.float(0.7, 1.3)] as [Label, number]).sort((x, y) => y[1] - x[1])[0]?.[0];
}

/** Sai do selo: fica independente (traços + era + caixa) ou assina com outro (que paga a rescisão). */
export function leaveLabel17(s: GameState, r: Rng, a: Act, lb: Label, ws: L[], cause?: string[], force?: 'indie' | 'sign'): void {
  const st = npc17(s);
  const P = Pa(s, a);
  const lead = leadOf(s, a);
  const era = s.year >= 2008 ? 0.8 : s.year >= 1995 ? 0.4 : s.year >= 1977 ? 0.15 : 0;
  const indieW = F(P, 'rebeldia') + F(P, 'teimosia') * 0.5 + era + (a.cash > money(s, 20000) ? 0.4 : 0);
  const signW = F(P, 'ambicao') + F(P, 'vaidade') * 0.5 + a.fame / 60;
  endContract(s, a, 'left');
  st.exLb[a.id] = lb.id;
  grantHold(s, { holder: lb.id, target: a.id, kind: 'grievance', strength: 30, months: 36, text: l('saiu no meio do contrato', 'walked out mid-contract'), src: 'npc17', quiet: true });
  if (lead) addStress(s, lead.id, 6, l('Briga com o selo', 'Fight with the label'));
  const nl = force === 'indie' || (!force && indieW > signW) ? undefined : pickNewLabel17(s, r, a, [lb.id]);
  if (!nl) {
    st.indie[a.id] = s.week + r.int(52, 156);
    move(s, { k: 'indie', a: a.id, lb: lb.id, t: fmtL(l('{a} saiu da {b} ({w}) e decidiu ficar independente.', '{a} left {b} ({w}) and chose to stay independent.'), { a: a.name, b: lb.name, w: why(ws) }) },
      { kind: 'exit', actors: [a.id, lb.id, lead?.id ?? ''], sev: 20 + a.fame / 3, vis: a.fame >= 35 ? 'public' : 'rumor', tags: ['label', 'indie'], place: a.city, cause });
    return;
  }
  const buy = Math.round(money(s, expectedAdvance(s, a)) * 0.4);
  nl.cash -= buy;
  lb.cash += buy;
  signWithRival(s, a, nl.id, r, true);
  move(s, { k: 'label_exit', a: a.id, lb: lb.id, lb2: nl.id, t: fmtL(l('{a} trocou a {b} pela {c} ({w}); a {c} pagou a rescisão.', '{a} swapped {b} for {c} ({w}); {c} paid the buyout.'), { a: a.name, b: lb.name, c: nl.name, w: why(ws) }) },
    { kind: 'signing', actors: [a.id, nl.id, lb.id], sev: 20 + a.fame / 3, vis: a.fame >= 30 ? 'public' : 'rumor', tags: ['label', 'transfer'], place: a.city, cause });
}

function labelExits(s: GameState, r: Rng, W: number): void {
  let n = 0;
  // mágoas abertas: uma leitura do livro por rodada (refeita depois de cada saída/greve, que mexe nele)
  let gv: Hold[] | null = null;
  for (const a of Object.values(s.acts)) {
    if (n >= 2) break;
    if (!okAct17(s, a) || !a.owner || !s.labels[a.owner] || npc17(s).strike[a.id]) continue;
    const lb = s.labels[a.owner];
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (!c || s.week - c.startWeek < 52) continue;
    const P = Pa(s, a);
    const ws: L[] = [];
    let w = 0;
    if (lb.cash < 0) { w += 0.7; ws.push(l('selo sem dinheiro', 'label out of cash')); }
    if (a.fame > lb.reputation + 30) { w += (a.fame - lb.reputation - 30) / 50; ws.push(l('ficou maior que o selo', 'outgrew the label')); }
    gv ??= allHolds(s).filter((h) => h.kind === 'grievance' && h.status === 'open');
    const gr = gv.some((h) => h.holder === a.id && h.target === lb.id);
    if (gr) { w += 0.5; ws.push(l('mágoa com o selo', 'a grudge against the label')); }
    if (wars17(s).some((x) => x.a === lb.id || x.b === lb.id) && lb.cash < money(s, 100000)) { w += 0.3; ws.push(l('selo sangrando na guerra de preços', 'label bleeding in a price war')); }
    if (ws.length && F(P, 'rebeldia') > 1.3) { w += 0.25; ws.push(l('espírito rebelde', 'rebel spirit')); }
    if (!ws.length || !r.chance(clamp(0.002 + w * 0.01, 0, 0.04) * W)) continue;
    n++;
    gv = null;
    // teimoso com contrato longo pela frente: greve em vez de saída
    if (F(P, 'teimosia') > 1.25 && c.endWeek - s.week > 52 && cool(s, `strike:${a.id}`, 104)) {
      npc17(s).strike[a.id] = s.week;
      move(s, { k: 'strike', a: a.id, lb: lb.id, t: fmtL(l('{a} entrou em greve contra a {b} ({w}): não entrega disco até rever o contrato.', '{a} went on strike against {b} ({w}): no record until the deal is revisited.'), { a: a.name, b: lb.name, w: why(ws) }) },
        { kind: 'statement', actors: [a.id, lb.id], sev: 25 + a.fame / 3, vis: 'public', tags: ['label', 'strike'], place: a.city });
      continue;
    }
    leaveLabel17(s, r, a, lb, ws);
  }
}

// greve de disco: o selo cede, processa ou libera; regravação para retomar as masters
function strikes(s: GameState, r: Rng, W: number): void {
  const st = npc17(s);
  for (const [aid, w0] of Object.entries(st.strike)) {
    const a = s.acts[aid];
    const lb = a?.owner ? s.labels[a.owner] : undefined;
    if (!a || !lb || !live(a)) { delete st.strike[aid]; continue; }
    a.lastRelease = Math.max(a.lastRelease, s.week - 12); // nada sai enquanto durar a greve
    if (s.week - w0 < 17) continue;
    delete st.strike[aid];
    const PL = Pl(s, lb);
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    const ws = [fmtL(l('a greve durou {n} meses', 'the strike lasted {n} months'), { n: Math.round((s.week - w0) / 4.35) })];
    const opt = r.weighted([['give', F(PL, 'empatia') + F(PL, 'paciencia') * 0.5], ['sue', F(PL, 'teimosia') + F(PL, 'ego') * 0.5], ['free', 0.6]] as [string, number][], (x) => x[1])![0];
    if (opt === 'give' && c) {
      c.royalty = Math.min(0.5, c.royalty + 0.04);
      move(s, { k: 'strike_end', a: aid, lb: lb.id, t: fmtL(l('A {b} cedeu à greve de {a}: royalties +4 pontos ({w}).', '{b} gave in to {a}\'s strike: royalties +4 points ({w}).'), { a: a.name, b: lb.name, w: why(ws) }) }, { kind: 'deal', actors: [aid, lb.id], sev: 20, vis: 'public', tags: ['strike'] });
    } else if (opt === 'sue') {
      lb.cash -= money(s, 30000); a.cash -= money(s, 15000);
      const lead = leadOf(s, a); if (lead) addStress(s, lead.id, 12, l('Processo do selo', 'Lawsuit from the label'));
      grantHold(s, { holder: aid, target: lb.id, kind: 'grievance', strength: 50, months: 60, text: l('processou durante a greve', 'sued during the strike'), src: 'npc17', quiet: true });
      move(s, { k: 'strike_end', a: aid, lb: lb.id, t: fmtL(l('A {b} processou {a} pela greve; os dois saem feridos e a mágoa fica ({w}).', '{b} sued {a} over the strike; both come out bruised and the grudge stays ({w}).'), { a: a.name, b: lb.name, w: why(ws) }) }, { kind: 'case_ruling', actors: [aid, lb.id], sev: 35, vis: 'public', tags: ['strike', 'lawsuit'] });
    } else leaveLabel17(s, r, a, lb, ws);
  }
  // regravação: quem saiu brigado regrava os sucessos antigos e esvazia o catálogo do ex-selo
  if (!r.chance((s.year >= 2019 ? 0.05 : 0.012) * W)) return;
  const cands = Object.entries(st.exLb).map(([aid, lb]) => [s.acts[aid], s.labels[lb]] as const).filter(([a, lb]) => okAct17(s, a) && lb && a.fame >= 40 && a.owner !== lb.id && a.releases.some((id) => s.releases[id]?.owner === lb.id));
  const pick = cands.length ? cands[r.int(0, cands.length - 1)] : undefined;
  if (!pick) return;
  const [a, lb] = pick;
  if (F(Pa(s, a), 'teimosia') + F(Pa(s, a), 'ego') < 1.6) return;
  delete st.exLb[a.id];
  for (const id of a.releases) { const rel = s.releases[id]; if (rel?.owner === lb.id) rel.appeal = Math.round(rel.appeal * 0.75); }
  a.fans.core = Math.round(a.fans.core * 1.06);
  lb.reputation = clamp(lb.reputation - 3, 0, 100);
  move(s, { k: 'rerecord', a: a.id, lb: lb.id, t: fmtL(l('{a} regravou os antigos sucessos para ser dono(a) das próprias masters: o catálogo da {b} perde valor (−25% de apelo) e os fãs núcleo vibram.', '{a} re-recorded the old hits to own their masters: {b}\'s catalog loses value (−25% appeal) and core fans cheer.'), { a: a.name, b: lb.name }) },
    { kind: 'statement', actors: [a.id, lb.id], sev: 40, vis: 'public', tags: ['masters', 'good'] });
}

// ---------------------------------------------------------------- 3. NPCs abrem selos (artista, empresário, executivo, imprint)

const SUFFIX: Record<string, string[]> = { br: ['Discos', 'Music', 'Records'], latam: ['Discos', 'Records', 'Música'], eu: ['Records', 'Recordings', 'Music', 'Sound'] };
function labelName(s: GameState, r: Rng, who: string, city: string): string {
  const sur = who.split(' ').slice(-1)[0];
  const xs = SUFFIX[mkOf(city)] ?? ['Records', 'Recordings', 'Music', 'Sound'];
  let n = mkOf(city) === 'br' || mkOf(city) === 'latam' ? `${r.pick(xs)} ${sur}` : `${sur} ${r.pick(xs)}`;
  if (Object.values(s.labels).some((x) => x.name === n)) n = `${n} ${['II', 'Co.', 'Group'][r.int(0, 2)]}`;
  return n;
}

export function foundLabel17(s: GameState, r: Rng, o: { by: string; name: string; born?: number; city: string; genre: string; cash: number; k: 'artist' | 'manager' | 'exec' | 'imprint'; parent?: string; why: L; leaderId?: string }): Label {
  const id = nextId(s, 'lb');
  const lb: Label = {
    id, name: labelName(s, r, o.name, o.city), family: 'B', city: o.city, founded: s.year, focus: [familyOf(o.genre)], cash: money(s, o.cash), reputation: 22,
    roster: [], active: true, aggression: 0.35, strategy: 'niche', territories: [mkOf(o.city) as Label['territories'][number]], revenueYear: 0, revenueLastYear: 0, procedural: true,
    ceo: o.name, archetype: o.k === 'exec' ? 'hitmaker' : 'boutique', ...(o.parent ? { parentLabel: o.parent } : {}),
  };
  s.labels[id] = lb;
  const LS = leaders(s);
  if (LS) {
    const L0 = o.leaderId && LS.L[o.leaderId] ? LS.L[o.leaderId] : newLeader(s, r, lb, { founder: true, name: o.name, born: o.born });
    L0.label = id; L0.since = s.year; L0.st = 'active'; L0.founder = true; L0.jobs.push({ lb: id, n: lb.name, from: s.year });
    lb.leaderId = L0.id;
    lb.aggression = clamp(0.2 + L0.risk / 200, 0, 1);
  }
  npc17(s).fd[id] = { by: o.by, name: o.name, k: o.k, y: s.year, why: o.why };
  return lb;
}

function founding(s: GameState, r: Rng, W: number): void {
  const act = activeLabels(s);
  if (act.length >= 18 + (W > 1.3 ? 4 : 0) || !r.chance(0.035 * W)) return;
  type C = { w: number; go: () => void };
  const cs: C[] = [];
  // a) estrela/veterano(a) abre o próprio selo — ou exige um imprint dentro da major
  for (const a of Object.values(s.acts)) {
    if (!okAct17(s, a) || !okPerson(s, a) || (a.fame < 45 && !a.legend)) continue;
    const p = leadOf(s, a);
    if (!p?.alive || s.year - p.born < 28 || npc17(s).car[`p:${p.id}`]?.some((x) => x[2] === 'label' || x[2] === 'imprint')) continue;
    const P = per13(s, `p:${p.id}`);
    const v = F(P, 'ambicao') + F(P, 'ego') * 0.5 + F(P, 'coragem') * 0.3;
    if (v < 1.7) continue;
    const owner = a.owner ? s.labels[a.owner] : undefined;
    const imprint = !!owner && (owner.family === 'A' || owner.family === 'D') && a.fame >= 65 && owner.cash > money(s, 300000);
    cs.push({ w: v + a.fame / 50, go: () => {
      const ws = imprint ? l('virou grande demais para ser só mais um no elenco; a major prefere dar um selo a perder a estrela', 'became too big to be just another roster act; the major would rather give a label than lose the star')
        : l('ambição e vontade de mandar na própria obra', 'ambition and wanting control over their own work');
      if (imprint) owner!.cash -= money(s, 100000);
      const lb = foundLabel17(s, r, { by: `p:${p.id}`, name: p.name, born: p.born, city: a.city, genre: a.genre, cash: imprint ? 100000 : 40000 + a.fame * 2000, k: imprint ? 'imprint' : 'artist', parent: imprint ? owner!.id : undefined, why: ws });
      if (!a.owner && !imprint) signWithRival(s, a, lb.id, r, true);
      career(s, `p:${p.id}`, 'artist', imprint ? 'imprint' : 'label', ws);
      move(s, { k: imprint ? 'imprint' : 'founded', a: a.id, p: `p:${p.id}`, lb: lb.id, lb2: owner?.id, t: imprint
        ? fmtL(l('{p} ({a}) ganhou um selo próprio dentro da {o}: {n} — {w}.', '{p} ({a}) got an own imprint inside {o}: {n} — {w}.'), { p: p.name, a: a.name, o: owner!.name, n: lb.name, w: ws })
        : fmtL(l('{p} ({a}) abriu o selo {n} — {w}.', '{p} ({a}) opened the label {n} — {w}.'), { p: p.name, a: a.name, n: lb.name, w: ws }) },
      { kind: 'deal', actors: [a.id, lb.id, p.id], sev: 30 + a.fame / 4, vis: 'public', tags: ['label_founded'], place: a.city });
    } });
  }
  // b) empresário vira dono de selo e leva os clientes livres
  for (const m of allMgrs(s)) {
    const ro = rosterOf(s, m.id);
    if (ro.length < 2 || !(m.style === 'impresario' || m.style === 'svengali' || m.style === 'shark')) continue;
    if (Object.values(npc17(s).fd).some((x) => x.by === `e:${m.id}`)) continue;
    cs.push({ w: 0.8 + ro.length * 0.2 + m.a[3] / 100, go: () => {
      const ws = l('cansou de negociar com selos em nome dos clientes', 'tired of negotiating with labels on behalf of clients');
      const lb = foundLabel17(s, r, { by: `e:${m.id}`, name: mgrName(s, m), born: m.born, city: m.city, genre: ro[0].genre, cash: 80000, k: 'manager', why: ws });
      const took = ro.filter((a) => !a.owner && okAct17(s, a));
      for (const a of took) signWithRival(s, a, lb.id, r, true);
      career(s, `e:${m.id}`, 'manager', 'label', ws);
      move(s, { k: 'founded', p: `e:${m.id}`, lb: lb.id, t: fmtL(l('O empresário {m} abriu o selo {n} ({w}){c}.', 'Manager {m} opened the label {n} ({w}){c}.'), { m: mgrName(s, m), n: lb.name, w: ws, c: took.length ? fmtL(l(' e assinou os clientes {x}', ' and signed clients {x}'), { x: took.map((a) => a.name).join(', ') }) : '' }) },
        { kind: 'deal', actors: [`e:${m.id}`, lb.id, ...took.map((a) => a.id)], sev: 30, vis: 'public', tags: ['label_founded'], place: m.city });
    } });
  }
  // c) executivo demitido abre selo e leva quem confia nele (Clive Davis → Arista)
  const LS = leaders(s);
  for (const L0 of Object.values(LS?.L ?? {})) {
    if (L0.st !== 'free' || L0.amb < 60 || !L0.jobs.length || s.year - L0.born > 66 || Object.values(npc17(s).fd).some((x) => x.by === `l:${L0.id}`)) continue;
    const prev = s.labels[L0.jobs[L0.jobs.length - 1].lb];
    cs.push({ w: L0.amb / 60, go: () => {
      const ws = fmtL(l('saiu da {b} com contatos e vontade de provar que estavam errados', 'left {b} with contacts and a point to prove'), { b: prev?.name ?? '?' });
      const g = prev?.focus[0] ? Object.values(s.acts).find((a) => fam(a) === prev.focus[0])?.genre ?? 'rock' : 'rock';
      const lb = foundLabel17(s, r, { by: `l:${L0.id}`, name: L0.name, born: L0.born, city: L0.city, genre: g, cash: 150000, k: 'exec', why: ws, leaderId: L0.id });
      const fol: Act[] = [];
      for (const id of [...(prev?.roster ?? [])]) {
        const a = s.acts[id];
        const c = a?.contractId ? s.contracts[a.contractId] : undefined;
        if (!okAct17(s, a) || !c || c.endWeek - s.week > 30 || fol.length >= 2 || F(Pa(s, a), 'lealdade') < 0.9) continue;
        endContract(s, a, 'left'); signWithRival(s, a, lb.id, r, true); fol.push(a);
        grantHold(s, { holder: a.id, target: `l:${L0.id}`, kind: 'loyalty', strength: 40, months: 48, text: l('seguiu o executivo para o selo novo', 'followed the executive to the new label'), src: 'npc17', quiet: true });
      }
      career(s, `l:${L0.id}`, 'exec', 'label', ws);
      move(s, { k: fol.length ? 'follow' : 'founded', p: `l:${L0.id}`, lb: lb.id, lb2: prev?.id, t: fmtL(l('O executivo {n} abriu a {b} ({w}){f}.', 'Executive {n} opened {b} ({w}){f}.'), { n: L0.name, b: lb.name, w: ws, f: fol.length ? fmtL(l('; {x} foram junto, por lealdade', '; {x} followed out of loyalty'), { x: fol.map((a) => a.name).join(', ') }) : '' }) },
        { kind: 'deal', actors: [`l:${L0.id}`, lb.id, ...fol.map((a) => a.id)], sev: 30 + fol.length * 10, vis: 'public', tags: ['label_founded'], place: lb.city });
    } });
  }
  r.weighted(cs, (x) => x.w)?.go();
}

function career(s: GameState, key: string, from: string, to: string, w: L): void {
  (npc17(s).car[key] ??= []).push([s.year, from, to, w]);
}

// ---------------------------------------------------------------- 4. carreira nova: ex-artista vira empresário(a)

function styleBy(P: P13 | null): MgrStyle {
  const sc: [MgrStyle, number][] = [['svengali', F(P, 'ego') + F(P, 'vaidade')], ['shark', F(P, 'ambicao') + F(P, 'impulsividade')], ['muscle', F(P, 'coragem') + F(P, 'teimosia')],
    ['guardian', F(P, 'empatia') + F(P, 'lealdade')], ['impresario', F(P, 'sociabilidade') + F(P, 'humor')]];
  return sc.sort((a, b) => b[1] - a[1])[0][0];
}

function careers(s: GameState, r: Rng, W: number): void {
  if (!r.chance(0.06 * W)) return;
  const st = npc17(s);
  const cands: [Person, Act][] = [];
  const had = new Set(st.mg.map((m) => m.id));
  for (const a of Object.values(s.acts)) {
    if ((a.status !== 'retired' && a.status !== 'split') || a.fame < 18 || a.playerBand || !okPerson(s, a) || a.owner === 'player') continue;
    for (const id of a.members) {
      const p = s.persons[id];
      const age = p ? s.year - p.born : 0;
      if (!p?.alive || p.isPlayer || age < 32 || age > 68 || st.car[`p:${id}`] || had.has(`n17_${id}`)) continue;
      if (Object.values(s.acts).some((x) => live(x) && x.members.includes(id))) continue;
      cands.push([p, a]);
    }
  }
  if (!cands.length) return;
  const [p, a] = cands[r.int(0, cands.length - 1)];
  const P = per13(s, `p:${p.id}`);
  if (F(P, 'sociabilidade') + F(P, 'ambicao') < 1.6) return;
  becomeManager17(s, r, p, a);
}

/** Ex-artista vira empresário(a): entra no índice de empresários e na página da pessoa. */
export function becomeManager17(s: GameState, r: Rng, p: Person, a: Act, ws0?: L): RealMgr {
  const st = npc17(s);
  const P = per13(s, `p:${p.id}`);
  const style = styleBy(P);
  const at = P?.attrs ?? { ear: 50, neg: 50, cha: 50, mgmt: 50, img: 50 };
  const m: RealMgr = {
    id: `n17_${p.id}`, name: p.name, born: p.born, city: a.city, from: s.year, to: s.year + r.int(12, 25), style, fam: [fam(a) as RealMgr['fam'][number]],
    a: [at.ear, at.neg, at.cha, at.mgmt, at.img], sex: P?.sex === 'f' ? 'f' : 'm', rate: 0.15, f: P?.facets as Record<string, number> | undefined, cl: [],
    bio: fmtL(l('Ex-integrante de {a}: conhece o palco por dentro e virou empresário(a).', 'Former member of {a}: knows the stage from the inside and became a manager.'), { a: a.name }),
  };
  const ex = st.mg.find((x) => x.id === m.id);
  if (!ex) st.mg.push(m);
  mgrById[m.id] = ex ?? m;
  const ws = ws0 ?? fmtL(l('{a} acabou e a vocação de articular falou mais alto (estilo {s})', '{a} ended and a knack for deal-making won out ({s} style)'), { a: a.name, s: MGR_STYLE[style][0] });
  career(s, `p:${p.id}`, 'artist', 'manager', ws);
  move(s, { k: 'career', a: a.id, p: `p:${p.id}`, t: fmtL(l('{p}, de {a}, virou empresário(a): {w}.', '{p}, of {a}, became a manager: {w}.'), { p: p.name, a: a.name, w: ws }) },
    { kind: 'career', actors: [p.id, a.id], sev: 15 + a.fame / 4, vis: a.fame >= 40 ? 'public' : 'rumor', tags: ['career'], place: a.city });
  return mgrById[m.id];
}

// empresários de carreira nova conquistam clientes (antigos colegas primeiro)
function mgrClients(s: GameState, r: Rng): void {
  const st = m14(s);
  for (const m of npc17(s).mg) {
    if (!mgrActive(s, m) || rosterOf(s, m.id).length >= mgrCap(m) || !r.chance(0.12)) continue;
    const pid = m.id.slice(4);
    const pool = Object.values(s.acts).filter((a) => okAct17(s, a) && !st.rep[a.id] && a.fame >= 8 && mkOf(a.city) === mkOf(m.city) && (histMode(s) !== 'strict' || !a.catalogNo));
    const pals = pool.filter((a) => a.members.some((x) => (s.persons[x]?.rel[pid] ?? 0) > 20));
    const a = (pals.length ? pals : pool.filter((x) => m.fam.includes(fam(x) as never))).sort((x, y) => y.fame - x.fame)[r.int(0, 2)];
    if (!a) continue;
    st.rep[a.id] = { m: m.id, y: s.year };
    move(s, { k: 'mgr_hire', a: a.id, p: `e:${m.id}`, t: fmtL(l('{a} contratou {m} (ex-artista) como empresário(a){w}.', '{a} hired {m} (former artist) as manager{w}.'), { a: a.name, m: m.name, w: pals.includes(a) ? l(': amizade antiga', ': an old friendship') : '' }) },
      { kind: 'deal', actors: [a.id, `e:${m.id}`], sev: 10 + a.fame / 5, tags: ['manager'] });
  }
}

// ---------------------------------------------------------------- 5. estratégia de lançamento

function delays(s: GameState, r: Rng, W: number): void {
  const big = new Map<string, Act>();
  const add = (a?: Act) => { if (a && live(a)) { const f = fam(a); if (!big.has(f) || big.get(f)!.fame < a.fame) big.set(f, a); } };
  for (const rel of Object.values(s.releases)) if (rel.week >= s.week - 4 && rel.week <= s.week) add(s.acts[rel.actId]);
  for (const pr of s.pendingReleases) if (pr.week >= s.week && pr.week <= s.week + 6) add(s.acts[pr.actId]);
  if (!big.size) return;
  let n = 0;
  for (const a of Object.values(s.acts)) {
    if (n >= 2) break;
    if (!okAct17(s, a) || a.fame < 15) continue;
    const since = s.week - a.lastRelease;
    const b = big.get(fam(a));
    if (since < 20 || since > 70 || !b || b === a || b.fame < a.fame + 15 || (b.fame < 70 && mkOf(b.city) !== mkOf(a.city)) || unreleasedRecorded(s, a).length < 1) continue;
    if ((npc17(s).cd[`delay:${a.id}`] ?? 0) > s.week) continue;
    const lb = a.owner ? s.labels[a.owner] : undefined;
    if (lb && risk(s, lb) > 1.5) continue; // selo de apetite alto encara a briga
    if (!r.chance(0.2 * Math.min(1.5, W))) continue;
    n++;
    npc17(s).cd[`delay:${a.id}`] = s.week + 52;
    const wk = r.int(5, 9);
    a.lastRelease = Math.min(s.week, a.lastRelease + wk);
    const t = fmtL(l('{a} adiou o lançamento ~{n} semanas para não bater de frente com {b} (fama {f} × {g}).', '{a} pushed its release back ~{n} weeks to avoid going head to head with {b} (fame {f} vs {g}).'), { a: a.name, n: wk, b: b.name, f: Math.round(b.fame), g: Math.round(a.fame) });
    move(s, { k: 'delay', a: a.id, lb: lb?.id, t }, { kind: 'statement', actors: [a.id, b.id], sev: 10 + a.fame / 5, vis: mine(s, b) ? 'public' : 'rumor', tags: ['release', 'strategy'] });
    if (mine(s, b)) notify(s, fmtL(l('{a} adiou o disco por medo do lançamento de {b}: menos concorrência para você nas próximas semanas.', '{a} delayed their record for fear of {b}\'s release: less competition for you in the coming weeks.'), { a: a.name, b: b.name }), 'good');
  }
}

// guardar o disco do astro para o Natal (o 4º trimestre vende mais) e lançamento-surpresa (era digital)
function holiday(s: GameState, r: Rng, W: number): void {
  if (s.month === 9) {
    let n = 0;
    for (const lb of activeLabels(s)) {
      if (n >= 3 || !(lb.family === 'A' || lb.family === 'D')) continue;
      const a = lb.roster.map((id) => s.acts[id]).filter((x) => okAct17(s, x) && x.fame >= 50 && unreleasedRecorded(s, x).length >= 6 && s.week - x.lastRelease >= 16).sort((x, y) => y.fame - x.fame)[0];
      if (!a || !r.chance(0.5)) continue;
      n++;
      a.lastRelease = Math.min(a.lastRelease, s.week - 90);
      move(s, { k: 'holiday', a: a.id, lb: lb.id, t: fmtL(l('A {b} guardou o disco de {a} para a temporada de Natal, quando as lojas vendem mais.', '{b} held {a}\'s record for the holiday season, when stores sell the most.'), { a: a.name, b: lb.name }) },
        { kind: 'statement', actors: [a.id, lb.id], sev: 12, tags: ['release', 'strategy'] });
    }
  }
  if (s.year >= 2013 && r.chance(0.025 * W)) {
    const a = Object.values(s.acts).filter((x) => okAct17(s, x) && x.fame >= 60 && unreleasedRecorded(s, x).length >= 5 && s.week - x.lastRelease >= 40).sort((x, y) => y.fame - x.fame)[0];
    const P = a ? Pa(s, a) : null;
    if (a && F(P, 'impulsividade') + F(P, 'confianca') > 1.9) {
      a.lastRelease = s.week - 120;
      a.momentum = clamp(a.momentum + 10, 0, 100);
      addHype(s, `a:${a.id}`, 'surprise17', l('Lançamento-surpresa', 'Surprise drop'), 12);
      move(s, { k: 'surprise', a: a.id, t: fmtL(l('{a} soltou um disco de surpresa, sem aviso nem divulgação: a internet parou (momento +10).', '{a} dropped a surprise album with no warning or promo: the internet stopped (momentum +10).'), { a: a.name }) },
        { kind: 'release', actors: [a.id], sev: 35, vis: 'public', tags: ['good', 'surprise'] });
    }
  }
}

// ---------------------------------------------------------------- 6. dinheiro e competição entre selos

function merch(s: GameState, r: Rng, W: number): void {
  const st = npc17(s);
  for (const lb of activeLabels(s)) {
    const acts = lb.roster.map((id) => s.acts[id]).filter((a) => live(a) && a.fame >= 25);
    if (!acts.length) continue;
    if (st.merch[lb.id] === undefined) {
      const ws = lb.cash < money(s, 60000) ? l('caixa apertado', 'tight cash') : lb.archetype === 'boutique' ? l('selo focado nos fãs', 'a fan-focused label') : null;
      if (!ws || s.year < 1960 || !r.chance(0.02 * W)) continue;
      st.merch[lb.id] = s.year;
      move(s, { k: 'merch', lb: lb.id, t: fmtL(l('A {b} passou a vender camisetas e produtos dos artistas ({w}): receita extra, fãs núcleo mais fiéis.', '{b} started selling artist T-shirts and merch ({w}): extra revenue, more loyal core fans.'), { b: lb.name, w: ws }) },
        { kind: 'deal', actors: [lb.id], sev: 10, tags: ['merch'] });
      continue;
    }
    for (const a of acts) {
      const v = money(s, 60 + a.fame * 12);
      lb.cash += v; a.cash += Math.round(v * 0.3);
      if (s.month === 11) a.fans.core = Math.round(a.fans.core * 1.02);
    }
  }
}

function priceWars(s: GameState, r: Rng, W: number): void {
  const st = npc17(s);
  for (const w of st.war) {
    const A = s.labels[w.a], B = s.labels[w.b];
    if (w.until <= s.week || !A?.active || !B?.active) continue;
    for (const x of [A, B]) x.cash -= money(s, 5000 + x.roster.length * 800);
    if (w.until - s.week <= 4) {
      w.until = s.week;
      const [win, lose] = A.cash >= B.cash ? [A, B] : [B, A];
      win.reputation = clamp(win.reputation + 3, 0, 100); lose.reputation = clamp(lose.reputation - 5, 0, 100);
      move(s, { k: 'war_end', lb: win.id, lb2: lose.id, t: fmtL(l('Fim da guerra de preços: a {a} aguentou mais tempo que a {b}, que sai menor e endividada.', 'The price war is over: {a} held out longer than {b}, which comes out smaller and in debt.'), { a: win.name, b: lose.name }) },
        { kind: 'deal', actors: [win.id, lose.id], sev: 30, vis: 'public', tags: ['price_war'] });
    }
  }
  st.war = st.war.filter((w) => w.until > s.week - 52);
  if (wars17(s).length >= 2 || !r.chance(0.025 * W)) return;
  const ls = activeLabels(s).filter((x) => x.cash > money(s, 250000) && x.roster.length >= 3 && !wars17(s).some((w) => w.a === x.id || w.b === x.id));
  const A = ls.filter((x) => risk(s, x) > 1.1 || x.archetype === 'hitmaker' || x.archetype === 'empire').sort((x, y) => y.cash - x.cash)[0];
  if (!A) return;
  const B = ls.find((x) => x !== A && x.territories.some((t) => A.territories.includes(t)) && x.focus.some((f) => A.focus.includes(f) || A.focus.length === 0));
  if (!B) return;
  const f = B.focus.find((x) => A.focus.includes(x)) ?? B.focus[0] ?? 'rock';
  const mk = B.territories.find((t) => A.territories.includes(t))!;
  st.war.push({ a: A.id, b: B.id, fam: f, mk, from: s.week, until: s.week + r.int(26, 52) });
  move(s, { k: 'war', lb: A.id, lb2: B.id, t: fmtL(l('Guerra de preços: a {a} baixou o preço dos discos de {f} para tirar mercado da {b} ({w}). Os dois perdem margem; discos deles vendem +8%, os outros do gênero −4%.', 'Price war: {a} cut {f} record prices to take market share from {b} ({w}). Both lose margin; their records sell +8%, everyone else in the genre −4%.'),
    { a: A.name, b: B.name, f, w: risk(s, A) > 1.1 ? l('chefe com apetite por risco', 'a risk-hungry boss') : l('estratégia agressiva do selo', 'the label\'s aggressive strategy') }) },
  { kind: 'deal', actors: [A.id, B.id], sev: 35, vis: 'public', tags: ['price_war'] });
}

registerMod('appeal', 'npc17:war', (s, v, c) => {
  const rel = c.release;
  if (!rel || !c.act) return null;
  const w = wars17(s).find((x) => familyOf(c.act!.genre) === x.fam && rel.territories.includes(x.mk as never));
  if (!w) return null;
  const inWar = rel.owner === w.a || rel.owner === w.b;
  return { value: v * (inWar ? 1.08 : 0.96), label: fmtL(inWar ? l('Guerra de preços ({a} × {b}): disco mais barato', 'Price war ({a} vs {b}): cheaper record') : l('Guerra de preços ({a} × {b}) puxa o preço do gênero para baixo', 'Price war ({a} vs {b}) drags genre prices down'), { a: s.labels[w.a]?.name ?? '?', b: s.labels[w.b]?.name ?? '?' }) };
});

function poaching(s: GameState, r: Rng, W: number): void {
  if (!r.chance(0.03 * W)) return;
  const buyers = activeLabels(s).filter((x) => (x.strategy === 'stars' || x.archetype === 'empire' || risk(s, x) > 1.3) && x.cash > money(s, 400000));
  const A = buyers[r.int(0, buyers.length - 1)];
  if (!A) return;
  const t = Object.values(s.acts).filter((a) => okAct17(s, a) && a.owner && a.owner !== A.id && s.labels[a.owner] && a.fame >= 40 && (a.fame > s.labels[a.owner].reputation || s.labels[a.owner].cash < 0)).sort((x, y) => y.fame - x.fame)[0];
  if (!t) return;
  const B = s.labels[t.owner!];
  const adv = money(s, expectedAdvance(s, t));
  if (A.cash < adv * 2.5) return;
  const P = Pa(s, t);
  const lead = leadOf(s, t);
  if (F(P, 'lealdade') > 1.3) {
    grantHold(s, { holder: t.id, target: B.id, kind: 'loyalty', strength: 40, months: 36, text: fmtL(l('recusou a proposta da {a}', 'turned down {a}\'s offer'), { a: A.name }), src: 'npc17', quiet: true });
    move(s, { k: 'loyal', a: t.id, lb: A.id, lb2: B.id, t: fmtL(l('{t} recusou uma proposta milionária da {a} por lealdade à {b}.', '{t} turned down a huge offer from {a} out of loyalty to {b}.'), { t: t.name, a: A.name, b: B.name }) },
      { kind: 'poach', actors: [t.id, A.id, B.id], sev: 25, vis: 'public', tags: ['good', 'loyalty'] });
    return;
  }
  const buy = Math.round(adv * 0.6);
  A.cash -= buy; B.cash += buy;
  endContract(s, t, 'left');
  signWithRival(s, t, A.id, r, true);
  if (lead) addStress(s, lead.id, 4, l('Transferência de selo', 'Label transfer'));
  grantHold(s, { holder: B.id, target: A.id, kind: 'grievance', strength: 40, months: 48, text: fmtL(l('aliciou {t}', 'poached {t}'), { t: t.name }), src: 'npc17', quiet: true });
  move(s, { k: 'poach', a: t.id, lb: A.id, lb2: B.id, t: fmtL(l('A {a} aliciou {t} da {b}, pagando a rescisão ({w}).', '{a} poached {t} from {b}, paying the buyout ({w}).'), { a: A.name, t: t.name, b: B.name, w: B.cash < 0 ? l('a {b} estava quebrada', 'the label was broke') : l('o artista já era maior que o selo', 'the act had outgrown the label') }) },
    { kind: 'poach', actors: [t.id, A.id, B.id], sev: 30 + t.fame / 4, vis: 'public', tags: ['transfer'] });
}

function beefs(s: GameState, r: Rng, W: number): void {
  const st = npc17(s);
  for (const [k, until] of Object.entries(st.beef)) if (until < s.week) delete st.beef[k];
  if (Object.keys(st.beef).length >= 3 || !r.chance(0.03 * W)) return;
  const pool = Object.values(s.acts).filter((a) => live(a) && a.fame >= 25 && !a.playerBand && !histLocked(s, a));
  const hot = pool.filter((a) => a.owner !== 'player' && (F(Pa(s, a), 'ego') + F(Pa(s, a), 'vaidade')) / 2 > 1.2);
  const A = hot[r.int(0, hot.length - 1)];
  if (!A) return;
  const B = pool.filter((b) => b !== A && fam(b) === fam(A) && b.owner !== A.owner && !st.beef[`${A.id}|${b.id}`] && !st.beef[`${b.id}|${A.id}`] && b.fame >= A.fame * 0.8).sort((x, y) => y.fame - x.fame)[0];
  if (!B) return;
  st.beef[`${A.id}|${B.id}`] = s.week + 26;
  const la = leadOf(s, A), lb = leadOf(s, B);
  for (const x of [A, B]) { x.momentum = clamp(x.momentum + 6, 0, 100); x.fame = clamp(x.fame + 1.5, 0, 100); addHype(s, `a:${x.id}`, 'beef17', l('Rixa pública', 'Public beef'), 8); }
  if (la && lb) { bump(s, la.id, lb.id, -30, 'chart', 'feud'); addStress(s, la.id, 5, l('Rixa pública', 'Public beef')); addStress(s, lb.id, 6, l('Provocado em público', 'Called out in public')); }
  const t = fmtL(l('{a} provocou {b} em entrevistas e numa faixa: rixa como marketing — os dois ganham embalo (+6) e manchetes; {w}.', '{a} called out {b} in interviews and on a track: beef as marketing — both gain momentum (+6) and headlines; {w}.'), { a: A.name, b: B.name, w: l('ego e vaidade falaram mais alto', 'ego and vanity spoke loudest') });
  move(s, { k: 'beef', a: A.id, lb: A.owner ?? undefined, t }, { kind: 'statement', actors: [A.id, B.id], sev: 30 + (A.fame + B.fame) / 8, vis: 'public', tags: ['beef', 'feud'], place: A.city });
  if (mine(s, B)) notify(s, fmtL(l('{a} provocou {b}, do seu selo, para ganhar mídia: embalo para os dois (veja a rixa em Mundo vivo).', '{a} called out {b}, on your label, for publicity: momentum for both (see the beef in Living world).'), { a: A.name, b: B.name }), 'event');
  if (la && F(Pa(s, A), 'impulsividade') > 1.4 && r.chance(0.25)) scandal(s, A.id, 'violence', 35, fmtL(l('A rixa entre {a} e {b} acabou em briga de verdade.', 'The {a}–{b} beef ended in a real fight.'), { a: A.name, b: B.name }), { person: la.id });
}

function mergers(s: GameState, r: Rng, W: number): void {
  if (!r.chance(0.015 * W)) return;
  const weak = activeLabels(s).filter((x) => (x.family === 'B' || x.family === 'C') && !x.parentLabel && x.cash < money(s, 150000) && x.roster.length >= 1);
  for (const A of weak) {
    const B = weak.find((x) => x !== A && x.territories.some((t) => A.territories.includes(t)));
    if (!B) continue;
    const [big, small] = A.roster.length + A.reputation / 10 >= B.roster.length + B.reputation / 10 ? [A, B] : [B, A];
    const cut: Act[] = [];
    for (const id of [...small.roster]) {
      const a = s.acts[id];
      if (!a) continue;
      if (a.fame < 10) { endContract(s, a, 'terminated'); cut.push(a); continue; }
      small.roster = small.roster.filter((x) => x !== id); big.roster.push(id); a.owner = big.id;
      const c = a.contractId ? s.contracts[a.contractId] : undefined; if (c) c.party = big.id;
    }
    for (const rel of Object.values(s.releases)) if (rel.owner === small.id) rel.owner = big.id;
    big.cash += Math.max(0, small.cash); big.reputation = clamp(Math.max(big.reputation, small.reputation) + 2, 0, 100);
    small.active = false; small.closedYear = s.year; small.parentLabel = big.id;
    const L0 = small.leaderId ? leaders(s)?.L[small.leaderId] : undefined;
    if (L0) depart(s, small, L0, 'closed');
    move(s, { k: 'merger', lb: big.id, lb2: small.id, t: fmtL(l('Fusão: a {a} absorveu a {b} (as duas sem caixa para seguir sozinhas){c}.', 'Merger: {a} absorbed {b} (neither had the cash to go it alone){c}.'), { a: big.name, b: small.name, c: cut.length ? fmtL(l('; cortou {x} do elenco', '; cut {x} from the roster'), { x: cut.map((a) => a.name).join(', ') }) : '' }) },
      { kind: 'deal', actors: [big.id, small.id, ...cut.map((a) => a.id)], sev: 35, vis: 'public', tags: ['merger'] });
    return;
  }
}

// leilão por agente livre: estrela sem selo atrai lances, vence quem paga mais (com prêmio)
function bidding(s: GameState, r: Rng, W: number): void {
  const a = Object.values(s.acts).filter((x) => okAct17(s, x) && !x.owner && x.fame >= 50 && !indieByChoice(s, x.id) && cool(s, `bid:${x.id}`, 26)).sort((x, y) => y.fame - x.fame)[0];
  if (!a || !r.chance(0.3 * Math.min(1.4, W))) return;
  const adv = money(s, expectedAdvance(s, a));
  const bids = activeLabels(s).filter((x) => x.cash > adv * 2 && (x.focus.length === 0 || x.focus.includes(fam(a)))).map((x) => [x, x.cash / adv * (0.5 + x.reputation / 100) * r.float(0.7, 1.3)] as [Label, number]).sort((x, y) => y[1] - x[1]);
  if (bids.length < 2) return;
  const win = bids[0][0];
  const prem = Math.round(adv * (0.15 + 0.08 * Math.min(5, bids.length - 1)));
  win.cash -= prem;
  signWithRival(s, a, win.id, r, true);
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  if (c) { c.advance += prem; c.recoupBalance += prem; }
  move(s, { k: 'bidding', a: a.id, lb: win.id, lb2: bids[1][0].id, t: fmtL(l('Leilão por {a}: {n} selos fizeram lances; a {b} venceu a {c} pagando um prêmio de {p}% sobre o adiantamento normal.', 'Bidding war for {a}: {n} labels bid; {b} beat {c} by paying a {p}% premium over the normal advance.'), { a: a.name, n: bids.length, b: win.name, c: bids[1][0].name, p: Math.round(prem / adv * 100) }) },
    { kind: 'signing', actors: [a.id, win.id, bids[1][0].id], sev: 30 + a.fame / 4, vis: 'public', tags: ['bidding'] });
  if ((s.knowledge[a.id]?.degree ?? 0) >= 2) notify(s, fmtL(l('{a}, que estava no seu radar, foi disputado(a) em leilão e fechou com a {b}.', '{a}, on your radar, went to a bidding war and signed with {b}.'), { a: a.name, b: win.name }), 'bad');
}

// ---------------------------------------------------------------- 7. vocalista sai em carreira solo (traços + embalo)

function solos(s: GameState, r: Rng, W: number): void {
  if (!r.chance(0.02 * W)) return;
  const a = Object.values(s.acts).filter((x) => okAct17(s, x) && x.members.length >= 3 && x.fame >= 45 && okPerson(s, x)).sort(() => r.float(-1, 1))[0];
  const p = a ? leadOf(s, a) : undefined;
  if (!a || !p?.alive || p.isPlayer) return;
  const P = per13(s, `p:${p.id}`);
  if (F(P, 'ego') + F(P, 'ambicao') < 2.4) return;
  leaveBand16(s, a, p, 'solo');
  const solo = goSolo16(s, r, p, a);
  const ws = l('ego e ambição maiores que a banda', 'ego and ambition bigger than the band');
  career(s, `p:${p.id}`, 'artist', 'artist', fmtL(l('saiu de {a} para a carreira solo: {w}', 'left {a} to go solo: {w}'), { a: a.name, w: ws }));
  for (const m of a.members) if (s.persons[m]) { s.persons[m].rel[p.id] = clamp((s.persons[m].rel[p.id] ?? 0) - 25, -100, 100); addStress(s, m, 6, l('Vocalista saiu', 'The singer left')); }
  move(s, { k: 'solo', a: a.id, p: `p:${p.id}`, t: fmtL(l('{p} saiu de {a} e lançou carreira solo ({s}): {w}.', '{p} left {a} and launched a solo career ({s}): {w}.'), { p: p.name, a: a.name, s: solo?.name ?? '?', w: ws }) },
    { kind: 'split', actors: [a.id, p.id, solo?.id ?? ''], sev: 30 + a.fame / 4, vis: 'public', tags: ['band', 'solo'], place: a.city });
}

// ---------------------------------------------------------------- reações a fatos de outros sistemas (crime, escândalo)

/** Escândalo grave ou prisão de um artista NPC: o chefe do selo decide pelos traços — dispensa ou banca. */
function onTrouble(s: GameState, f: Fact): void {
  if (f.severity < 55 || f.src === 'npc17') return;
  const a = f.actors.map((id) => s.acts[id] ?? Object.values(s.acts).find((x) => live(x) && x.members.includes(id))).find((x) => okAct17(s, x) && !!x.owner && !!s.labels[x.owner]);
  if (!a || !cool(s, `trouble:${a.id}`, 26)) return;
  const lb = s.labels[a.owner!];
  const r = Rng.fromSeed(`${s.config.seed}:npc17f:${f.id}`);
  const PL = Pl(s, lb);
  const drop = F(PL, 'disciplina') + F(PL, 'ansiedade') * 0.5 + (f.kind === 'arrest' ? 0.4 : 0) - F(PL, 'lealdade') - F(PL, 'coragem') * 0.3 + (a.fame < 30 ? 0.4 : -0.3);
  if (!r.chance(clamp(0.25 + drop * 0.4, 0.05, 0.85))) {
    grantHold(s, { holder: a.id, target: lb.id, kind: 'loyalty', strength: 45, months: 48, text: l('o selo bancou na pior hora', 'the label stood by them at the worst time'), src: 'npc17', quiet: true });
    move(s, { k: 'loyal', a: a.id, lb: lb.id, t: fmtL(l('A {b} bancou {a} depois do escândalo ({w}).', '{b} stood by {a} after the scandal ({w}).'), { a: a.name, b: lb.name, w: l('chefe leal e corajoso', 'a loyal, brave boss') }) },
      { kind: 'statement', actors: [lb.id, a.id], sev: 20, tags: ['good'], cause: [f.id] });
    return;
  }
  endContract(s, a, 'terminated');
  const lead = leadOf(s, a); if (lead) addStress(s, lead.id, 10, l('Dispensado(a) pelo selo', 'Dropped by the label'));
  grantHold(s, { holder: a.id, target: lb.id, kind: 'grievance', strength: 40, months: 48, text: l('dispensado(a) depois do escândalo', 'dropped after the scandal'), src: 'npc17', quiet: true });
  move(s, { k: 'label_exit', a: a.id, lb: lb.id, t: fmtL(l('A {b} rescindiu com {a} depois {w}: o chefe não quis o nome do selo ligado ao caso.', '{b} dropped {a} after {w}: the boss did not want the label tied to the case.'), { a: a.name, b: lb.name, w: f.kind === 'arrest' ? l('da prisão', 'the arrest') : l('do escândalo', 'the scandal') }) },
    { kind: 'exit', actors: [a.id, lb.id], sev: 30 + a.fame / 4, vis: 'public', tags: ['label', 'dropped'], cause: [f.id], place: a.city });
}
onFact('scandal', onTrouble, 'npc17:scandal');
onFact('arrest', onTrouble, 'npc17:arrest');

// ---------------------------------------------------------------- mês

export function npcWorld17(s: GameState): void {
  const r = Rng.fromSeed(`${s.config.seed}:npc17:${s.year}:${s.month}`);
  const W = dir17(s).world;
  npc17(s);
  mgrBreaks(s, r, W);
  labelExits(s, r, W);
  strikes(s, r, W);
  founding(s, r, W);
  careers(s, r, W);
  mgrClients(s, r);
  delays(s, r, W);
  holiday(s, r, W);
  merch(s, r, W);
  priceWars(s, r, W);
  poaching(s, r, W);
  beefs(s, r, W);
  mergers(s, r, W);
  bidding(s, r, W);
  solos(s, r, W);
  for (const [k, v] of Object.entries(npc17(s).indie)) if (v < s.week) delete npc17(s).indie[k];
}
registerSimHook('month', 'npc17', (s) => npcWorld17(s));
registerSimHook('week', 'npc17:idx', (s) => { npc17(s); });

/** Resumo do mês para o painel: movimentos agrupados. */
export function moveCount(s: GameState, months = 12): Record<string, number> {
  const out: Record<string, number> = {};
  const t = s.year * 12 + s.month;
  for (const x of npc17(s).log) if (t - (x.y * 12 + x.m) < months) out[x.k] = (out[x.k] ?? 0) + 1;
  return out;
}
// r18 (world18): segunda carreira e jogadas registradas no mesmo log
export { move as move17, career as career17 };

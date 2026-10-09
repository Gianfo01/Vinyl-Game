// Identidade mecânica do selo e liderança do dono (rodada 8, §3.1 e §3.8).
//
// Perfis do selo: cada decisão repetida (cadência de lançamentos, reedições, contratar gente da cidade,
// territórios, gasto com desenvolvimento, formatos novos, shows) soma pontos num acumulador que decai
// devagar. Quando uma tendência se mantém por meses, o perfil se consolida e passa a mudar três coisas:
// oportunidades (ações e eventos exclusivos), custo/risco (mods de apelo, custos mensais, desgaste) e
// reações (ofertas dos artistas com motivo visível, notas da imprensa, rivalidade dos concorrentes).
//
// Liderança: a trajetória profissional (ex-músico, radialista, promotor…) dá contatos, vantagens e também
// preconceitos, dívidas, rivalidades e lacunas. O estilo (artista primeiro, pragmático, paternalista,
// delegador, controlador) nasce das escolhas da partida e mexe em confiança, negociação, retenção e estresse.

import { clamp, type Rng } from '../../core/rng';
import { toReal } from '../../core/money';
import { cityById, familyOf, l, type L } from '../../data/world';
import { formatById } from '../../data/rules';
import { expectedAdvance, registerContractHook } from '../contracts';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerDecisionListener, registerExt4, registerMod, registerSimHook, type HookArgs } from '../ext4';
import { registerReviewAdjust } from '../media';
import { growPerson, mainAmbition } from '../people';
import { bumpPerks, registerPerkSource, type PerkEntry } from '../perks';
import { archetypeOf } from '../rivals2';
import type { Act, GameState, Offer, Release } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { life } from './life';
import { ownerOf } from './people/owner';
import { LEADS, OPTION_STYLE, ORIGIN_OF_BACKGROUND, PROFILES, leadById, originById, profileById, type LeadId, type OriginId, type ProfileId } from './identity/data';

import { XBY_ID, XPROFILES, adj, envOf, type Env } from './identity/extra';

export * from './identity/data';

// ---------------------------------------------------------------- estado

export interface IdentState {
  /** pontos de cada perfil (decaem 4% ao mês) */
  acc: Record<ProfileId, number>;
  cur: ProfileId | null;
  lean: ProfileId | null;
  leanMonths: number;
  since: number;
  lastLaunch: number;
  /** shows da semana acumulados até o fechamento do mês (com teto) */
  pend: { live: number; export: number; scene: number };
  /** recarga das ações (semana liberada) e efeitos temporários (semana final) */
  cool: Record<string, number>;
  boost: Record<string, number>;
  hist: { year: number; text: L }[];
  origin: OriginId | null;
  debtLeft: number;
  burned: string[];
  exEmployer?: string;
  equip: number;
  lacc: Record<LeadId, number>;
  lead: LeadId | null;
  llean: LeadId | null;
  lleanMonths: number;
  llog: { week: number; text: L }[];
  scan: number;
}

const zeroP = (): Record<ProfileId, number> => Object.fromEntries(PROFILES.map((p) => [p.id, 0])) as Record<ProfileId, number>;
/** Saves antigos: perfis novos começam em zero. */
const fillAcc = (st: IdentState): void => { for (const p of PROFILES) st.acc[p.id] ??= 0; };
const envP = (s: GameState): Env => envOf(s, rosterActs(s), true);
const zeroL = (): Record<LeadId, number> => ({ artistFirst: 0, pragmatic: 0, paternal: 0, delegator: 0, controller: 0 });

declare module '../ext4' { interface Ext4 { ident: IdentState } }
registerExt4('ident', () => ({
  acc: zeroP(), cur: null, lean: null, leanMonths: 0, since: 0, lastLaunch: -99, pend: { live: 0, export: 0, scene: 0 },
  cool: {}, boost: {}, hist: [], origin: null, debtLeft: 0, burned: [], equip: 0,
  lacc: zeroL(), lead: null, llean: null, lleanMonths: 0, llog: [], scan: 0,
}));
export const ident = (s: GameState): IdentState => (s as unknown as { x4: { ident: IdentState } }).x4.ident;

/** Pontos para o perfil estar "cheio" (100%) e o mínimo para consolidar. */
export const PROFILE_FULL = 30;
export const PROFILE_MIN = 18;
export const PROFILE_MONTHS = 6;
export const LEAD_FULL = 20;
export const LEAD_MIN = 10;
export const LEAD_MONTHS = 4;

const homeMarket = (s: GameState) => cityById[s.config.homeCity]?.market;
const isReissue = (rel: Release) => !!rel.reissueOf || rel.kind === 'compilation' || rel.kind === 'anniversary' || rel.kind === 'deluxe' || rel.kind === 'tribute';
const mineRel = (rel?: Release) => !!rel && rel.owner === 'player' && !rel.hist;
const rosterActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && !a.playerBand);

/** Força do perfil consolidado (0 se não for o perfil atual; 0,6..1 conforme os pontos). */
export function profileK(s: GameState, id: ProfileId): number {
  const st = ident(s);
  if (st.cur !== id) return 0;
  return 0.6 + 0.4 * clamp((st.acc[id] - PROFILE_MIN) / 24, 0, 1);
}

export function leadK(s: GameState, id: LeadId): number {
  const st = ident(s);
  if (st.lead !== id) return 0;
  return 0.6 + 0.4 * clamp((st.lacc[id] - LEAD_MIN) / 15, 0, 1);
}

/** Progresso de todos os perfis (0..1 do "cheio"), para a interface. */
export function profileProgress(s: GameState): { id: ProfileId; acc: number; pct: number }[] {
  const st = ident(s);
  return PROFILES.map((p) => ({ id: p.id, acc: st.acc[p.id], pct: clamp(st.acc[p.id] / PROFILE_FULL, 0, 1) })).sort((a, b) => b.acc - a.acc);
}

export function leadProgress(s: GameState): { id: LeadId; acc: number; pct: number }[] {
  const st = ident(s);
  return LEADS.map((x) => ({ id: x.id, acc: st.lacc[x.id], pct: clamp(st.lacc[x.id] / LEAD_FULL, 0, 1) })).sort((a, b) => b.acc - a.acc);
}

function hist(s: GameState, text: L): void {
  const st = ident(s);
  st.hist.unshift({ year: s.year, text });
  if (st.hist.length > 12) st.hist.length = 12;
}

function llog(s: GameState, text: L): void {
  const st = ident(s);
  st.llog.unshift({ week: s.week, text });
  if (st.llog.length > 10) st.llog.length = 10;
}

function addLead(s: GameState, w: Partial<Record<LeadId, number>>, why?: L): void {
  const st = ident(s);
  for (const [k, v] of Object.entries(w) as [LeadId, number][]) st.lacc[k] = Math.max(0, st.lacc[k] + v);
  if (why) llog(s, why);
}

// ---------------------------------------------------------------- decisões que constroem os perfis

/** Lançamento do jogador: cadência, reedição, territórios, formatos novos, estreias. */
export function trackLaunch(s: GameState, rel: Release): void {
  if (!mineRel(rel)) return;
  const st = ident(s);
  fillAcc(st);
  const a = st.acc;
  const gap = s.week - st.lastLaunch;
  if (isReissue(rel)) a.catalog += 3;
  else a.hits += 1.2 + (rel.type === 'single' ? 0.5 : 0) + (gap <= 4 ? 1 : 0) + (rel.marketingE > 0.4 ? 0.8 : 0);
  if (rel.kind === 'live') a.live += 1.5;
  const home = homeMarket(s);
  const foreign = rel.territories.filter((m) => m !== home).length;
  a.export += Math.min(2.4, foreign * 0.8);
  for (const f of rel.formats) {
    const tech = formatById[f]?.tech;
    const y = tech ? s.techDates[tech] : undefined;
    if (y !== undefined && s.year - y <= 6) { a.tech += 1.5; break; }
  }
  const act = s.acts[rel.actId];
  if (act && act.fame < 15 && act.releases.length <= 1) a.dev += 0.8;
  if (act) { const e = envP(s); for (const x of XPROFILES) a[x.def.id] += Math.max(0, x.launch?.(s, rel, act, gap, e) ?? 0); }
  st.lastLaunch = s.week;
}

/** Show de um ato do jogador (contado com teto no fechamento do mês). */
export function trackShow(s: GameState, show: HookArgs['show']): void {
  const act = s.acts[show.actId];
  if (!act || act.owner !== 'player') return;
  const st = ident(s);
  st.pend.live += 0.25;
  const city = cityById[show.cityId];
  if (city && city.market !== homeMarket(s)) st.pend.export += 0.2;
  else if (show.cityId === s.config.homeCity) st.pend.scene += 0.1;
}

/** Opção escolhida num cartão de decisão revela um estilo de liderança. */
export function noteDecision(s: GameState, eventId: string, optionId: string): void {
  const w = OPTION_STYLE[optionId];
  if (!w) return;
  const top = (Object.entries(w) as [LeadId, number][]).sort((a, b) => b[1] - a[1])[0];
  addLead(s, w, fmtL(l('Decisão "{e}" → {s}', 'Decision "{e}" → {s}'), { e: s.decisions.find((d) => d.eventId === eventId)?.title ?? eventId, s: leadById[top[0]].name }));
}

function scanMonth(s: GameState): void {
  const st = ident(s);
  fillAcc(st);
  const a = st.acc;
  const acts = rosterActs(s);
  const homeCity = s.config.homeCity;
  { const e = envOf(s, acts, true); for (const x of XPROFILES) a[x.def.id] += Math.max(0, x.scan?.(s, e) ?? 0); }
  // elenco: gente da cidade e atos pequenos
  if (acts.length) {
    a.scene += (acts.filter((x) => x.city === homeCity).length / acts.length) * 1.6;
    a.dev += Math.min(1.2, acts.filter((x) => x.fame < 20).length * 0.3);
  }
  // contratos novos desde a última leitura
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || c.startWeek <= st.scan) continue;
    const act = s.acts[c.actId];
    if (!act || act.playerBand) continue;
    if (act.city === homeCity) a.scene += 3.5;
    if (act.fame < 8) a.dev += 2.5;
    if (act.fame > 40) a.hits += 1.5;
    if (c.termMonths >= 48) a.dev += 1;
    // estilo de liderança pelas cláusulas
    if (c.creativeControl) addLead(s, { artistFirst: 2.5 }, fmtL(l('Controle criativo para {a}', 'Creative control for {a}'), { a: act.name }));
    else addLead(s, { controller: 1.2 });
    if (c.model === '360') addLead(s, { controller: 1, pragmatic: 1.5 }, fmtL(l('Contrato 360 com {a}', '360 deal with {a}'), { a: act.name }));
    if (c.model === 'distribution' || c.model === 'licensing') addLead(s, { artistFirst: 1 });
    if (c.promises.length) addLead(s, { paternal: c.promises.length * 0.8 });
    if (c.termMonths >= 48) addLead(s, { paternal: 1 });
    const ratio = toReal(c.advance, s.year) / Math.max(1, expectedAdvance(s, act));
    if (ratio < 0.8) addLead(s, { pragmatic: 2 }, fmtL(l('Adiantamento apertado para {a}', 'Tight advance for {a}'), { a: act.name }));
    else if (ratio > 1.3) addLead(s, { artistFirst: 1, paternal: 0.5 });
  }
  // gasto com desenvolvimento e mentorias
  const devSpend = -(s.monthLedger.artist_dev ?? 0);
  if (devSpend > 0) {
    a.dev += Math.min(2.5, devSpend / money(s, 1500));
    addLead(s, { paternal: Math.min(1.5, devSpend / money(s, 2500)) });
  }
  for (const [k, v] of Object.entries(s.flags)) {
    if (k.startsWith('mentor:') && v > st.scan) { a.dev += 0.6; addLead(s, { paternal: 1.2, artistFirst: 0.3 }); }
  }
  // catálogo antigo que ainda vende
  let old = 0;
  for (const act of acts) for (const id of act.releases) {
    const r = s.releases[id];
    if (r && r.owner === 'player' && s.week - r.week > 104 && (r.weekly[r.weekly.length - 1] ?? 0) > 0) old++;
  }
  a.catalog += Math.min(2, old * 0.25);
  // territórios, tecnologia, palco e paradas
  a.export += Math.max(0, s.player.territories.length - 1) * 0.35;
  const nz = s.player.neural;
  if (nz.neuralAdopted) a.tech += 1.2;
  a.tech += Math.min(1.2, nz.synthActs * 0.4) + (nz.catalogTraining ? 0.5 : 0);
  const eq = s.player.equipment.length;
  if (eq > st.equip) a.tech += (eq - st.equip) * 0.6;
  st.equip = eq;
  a.live += Math.min(2.5, st.pend.live) + ((s.monthLedger.live ?? 0) > money(s, 3000) ? 0.5 : 0);
  a.export += Math.min(1.5, st.pend.export);
  a.scene += Math.min(1, st.pend.scene);
  st.pend = { live: 0, export: 0, scene: 0 };
  const top10 = s.charts.singles.filter((e) => e.pos <= 10 && s.releases[e.releaseId]?.owner === 'player').length;
  a.hits += top10 * 0.4;
  // liderança: piloto automático x mão na massa; memória de renegociações e promessas
  if (acts.length) {
    const ratio = acts.filter((x) => s.delegated[x.id] !== false).length / acts.length;
    addLead(s, { delegator: ratio * 0.6, controller: (1 - ratio) * 0.7 });
  }
  if (s.player.staff.length >= 4) addLead(s, { delegator: 0.4 });
  for (let i = s.memory.length - 1; i >= 0; i--) {
    const m = s.memory[i];
    if (m.week <= st.scan) break;
    if (m.kind === 'renegotiation') addLead(s, { artistFirst: 2 }, l('Royalties renegociados a favor do artista', 'Royalties renegotiated in the artist\'s favour'));
    if (m.kind === 'broken_promise') addLead(s, { pragmatic: 2.5, artistFirst: -1.5 }, l('Promessa quebrada', 'Broken promise'));
  }
}

// ---------------------------------------------------------------- consolidação

function consolidate(s: GameState): void {
  const st = ident(s);
  const best = (Object.entries(st.acc) as [ProfileId, number][]).sort((a, b) => b[1] - a[1])[0];
  const lean = best[1] >= 8 ? best[0] : null;
  if (lean === st.lean) st.leanMonths += 1;
  else { st.lean = lean; st.leanMonths = lean ? 1 : 0; }
  if (!lean) return;
  if (!st.cur) {
    if (st.leanMonths >= PROFILE_MONTHS && st.acc[lean] >= PROFILE_MIN) {
      st.cur = lean;
      st.since = s.year;
      const text = fmtL(l('O mercado passou a ver {c} como {p}.', 'The market now sees {c} as a {p}.'), { c: s.config.companyName, p: profileById[lean].name });
      hist(s, text);
      notify(s, text, 'good');
      remember(s, 'identity', text, { important: true });
      bumpPerks();
    }
  } else if (lean !== st.cur && st.leanMonths >= PROFILE_MONTHS + 2 && st.acc[lean] > st.acc[st.cur] * 1.25) {
    // virada de identidade: o elenco estranha a mudança
    const from = st.cur;
    st.cur = lean;
    st.since = s.year;
    for (const a of rosterActs(s)) a.trust = clamp(a.trust - 3, 0, 100);
    const text = fmtL(l('{c} deixou de ser {a} e virou {b}. O elenco estranhou (−3 de confiança).', '{c} stopped being a {a} and became a {b}. The roster is uneasy (−3 trust).'), { c: s.config.companyName, a: profileById[from].name, b: profileById[lean].name });
    hist(s, text);
    notify(s, text, 'event');
    remember(s, 'identity', text, { important: true });
    bumpPerks();
  } else if (st.acc[st.cur] < 5) {
    // perfil abandonado se desfaz
    const text = fmtL(l('{c} perdeu a identidade de {p}.', '{c} lost its {p} identity.'), { c: s.config.companyName, p: profileById[st.cur].name });
    hist(s, text);
    notify(s, text, 'event');
    st.cur = null;
    bumpPerks();
  }
}

function consolidateLead(s: GameState): void {
  const st = ident(s);
  const best = (Object.entries(st.lacc) as [LeadId, number][]).sort((a, b) => b[1] - a[1])[0];
  const lean = best[1] >= 6 ? best[0] : null;
  if (lean === st.llean) st.lleanMonths += 1;
  else { st.llean = lean; st.lleanMonths = lean ? 1 : 0; }
  if (!lean) return;
  const o = ownerOf(s);
  if (!st.lead) {
    if (st.lleanMonths >= LEAD_MONTHS && st.lacc[lean] >= LEAD_MIN) {
      st.lead = lean;
      const text = fmtL(l('A indústria já fala de {o} como líder {s}.', 'The industry now talks about {o} as a {s} leader.'), { o: o.name, s: leadById[lean].name });
      llog(s, text);
      notify(s, text, 'event');
      remember(s, 'leadership', text, { important: true });
      bumpPerks();
    }
  } else if (lean !== st.lead && st.lleanMonths >= LEAD_MONTHS + 2 && st.lacc[lean] > st.lacc[st.lead] * 1.25) {
    st.lead = lean;
    const text = fmtL(l('Seu jeito de liderar mudou: agora é {s}.', 'Your leadership changed: now {s}.'), { s: leadById[lean].name });
    llog(s, text);
    notify(s, text, 'event');
    remember(s, 'leadership', text, { important: true });
    bumpPerks();
  }
}

// ---------------------------------------------------------------- efeitos mensais

const bumpRivalry = (s: GameState, id: string, v: number) => {
  const cur = s.rivalries[id] ?? 0;
  if (cur < 60) s.rivalries[id] = Math.min(60, cur + v);
};

function profileMonth(s: GameState, r: Rng): void {
  const st = ident(s);
  const cur = st.cur;
  if (!cur) return;
  const k = profileK(s, cur);
  const acts = rosterActs(s);
  const labels = Object.values(s.labels).filter((x) => x.active);
  const home = homeMarket(s);
  const xf = XBY_ID[cur];
  if (xf) {
    const e = envOf(s, acts, true);
    for (const [ar, v] of Object.entries(xf.rivals ?? {})) for (const lb of labels) if (archetypeOf(lb) === ar) bumpRivalry(s, lb.id, v * k);
    xf.month?.(s, k, e);
    return;
  }
  if (cur === 'hits') {
    for (const a of acts) {
      const recent = a.releases.filter((id) => s.releases[id] && s.week - s.releases[id].week < 52).length;
      if (recent >= 3) for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.fatigue = clamp(p.fatigue + 3 * k, 0, 100); }
    }
    for (const lb of labels) { const ar = archetypeOf(lb); if (ar === 'hitmaker' || ar === 'empire') bumpRivalry(s, lb.id, 0.8 * k); }
    const star = [...acts].sort((a, b) => b.fame - a.fame)[0];
    if (star && star.fame > 15 && r.chance(0.035)) emitEvent(s, r, 'id_hits_tv', { act: star.id, amount: 1500 + Math.round(star.fame * 40) });
  } else if (cur === 'catalog') {
    const buyer = labels.filter((lb) => archetypeOf(lb) === 'catalog' && lb.cash > money(s, 100000)).sort((a, b) => b.cash - a.cash)[0];
    for (const lb of labels) if (archetypeOf(lb) === 'catalog') bumpRivalry(s, lb.id, 0.5 * k);
    const old = oldCatalog(s).length;
    if (buyer && old >= 4 && !s.decisions.some((d) => d.eventId === 'id_catalog_bid') && r.chance(0.03)) emitEvent(s, r, 'id_catalog_bid', { label: buyer.id, amount: 12000 + old * 900 });
  } else if (cur === 'scene') {
    for (const lb of labels) if (archetypeOf(lb) === 'scene_hunter') bumpRivalry(s, lb.id, 0.8 * k);
    for (const a of acts) if (a.city === s.config.homeCity) { const key = `${a.city}:${a.genre}`; s.scenes[key] = (s.scenes[key] ?? 0) + 0.08 * k; }
  } else if (cur === 'export') {
    const foreign = s.player.territories.filter((m) => m !== home).length;
    if (foreign > 0) post(s, 'id:export', -money(s, 450 * foreign * k), 'distribution', 'Escritórios e parceiros no exterior');
    for (const lb of labels) if (archetypeOf(lb) === 'empire') bumpRivalry(s, lb.id, 0.6 * k);
  } else if (cur === 'dev') {
    for (const lb of labels) if (lb.strategy === 'stars') bumpRivalry(s, lb.id, 0.5 * k);
  } else if (cur === 'tech') {
    const big = [...labels].sort((a, b) => b.cash - a.cash)[0];
    if (big) bumpRivalry(s, big.id, 0.5 * k);
    if (r.chance(0.02 * k) && !s.decisions.some((d) => d.eventId === 'id_tech_glitch')) emitEvent(s, r, 'id_tech_glitch', { amount: 3000 });
  } else if (cur === 'live') {
    for (const a of acts) {
      a.fans.core += Math.round(a.fans.core * 0.01 * k);
      if ((a.gigSat ?? 0) > 0) for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.fatigue = clamp(p.fatigue + 2 * k, 0, 100); }
    }
  }
}

function leadMonth(s: GameState): void {
  const st = ident(s);
  const L0 = st.lead;
  if (!L0) return;
  const k = leadK(s, L0);
  const acts = rosterActs(s);
  for (const a of acts) {
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    let d = 0;
    if (L0 === 'artistFirst') d = 0.4;
    else if (L0 === 'paternal') d = 0.5;
    else if (L0 === 'pragmatic') d = a.trust < 60 ? -0.3 : 0;
    else if (L0 === 'controller') d = c?.creativeControl ? -0.1 : -0.4;
    if (d) a.trust = clamp(a.trust + d * k, 0, 100);
  }
  const o = ownerOf(s);
  const ds = L0 === 'paternal' ? Math.min(3, acts.length / 4) : L0 === 'controller' ? 1 : L0 === 'artistFirst' ? 0.5 : L0 === 'delegator' ? -1.5 : -0.5;
  o.stress = clamp(o.stress + ds * k, 0, 100);
}

function originMonth(s: GameState, r: Rng): void {
  const st = ident(s);
  if (!st.origin) st.origin = ORIGIN_OF_BACKGROUND[life(s).background] ?? 'recordStore';
  const def = originById[st.origin];
  if (def.debt && st.debtLeft > 0) {
    post(s, 'id:debt', -money(s, def.debt.real), 'loans', def.debt.memo);
    st.debtLeft -= 1;
    if (st.debtLeft === 0) notify(s, fmtL(l('Você quitou a dívida da sua trajetória ({o}).', 'You paid off your past debt ({o}).'), { o: def.name }), 'good');
  }
  if (st.origin === 'journalist' && st.burned.length && !s.decisions.some((d) => d.eventId === 'id_old_review') && r.chance(0.03)) {
    const id = r.pick(st.burned);
    if (s.acts[id]) emitEvent(s, r, 'id_old_review', { act: id });
    else st.burned = st.burned.filter((x) => x !== id);
  }
  if (st.origin === 'majorExec' && st.exEmployer && s.labels[st.exEmployer]?.active && s.year - s.config.startYear < 4 && !s.decisions.some((d) => d.eventId === 'id_noncompete') && r.chance(0.025)) {
    emitEvent(s, r, 'id_noncompete', { label: st.exEmployer, amount: 6000 });
  }
}

export function identityMonth(s: GameState, r: Rng): void {
  const st = ident(s);
  fillAcc(st);
  for (const k of Object.keys(st.acc) as ProfileId[]) st.acc[k] *= 0.96;
  for (const k of Object.keys(st.lacc) as LeadId[]) st.lacc[k] *= 0.97;
  scanMonth(s);
  // saves pequenos: duas casas decimais
  for (const k of Object.keys(st.acc) as ProfileId[]) st.acc[k] = Math.round(st.acc[k] * 100) / 100;
  for (const k of Object.keys(st.lacc) as LeadId[]) st.lacc[k] = Math.round(st.lacc[k] * 100) / 100;
  consolidate(s);
  consolidateLead(s);
  profileMonth(s, r);
  leadMonth(s);
  originMonth(s, r);
  for (const [k, v] of Object.entries(st.boost)) if (v < s.week) delete st.boost[k];
  for (const [k, v] of Object.entries(st.cool)) if (v < s.week) delete st.cool[k];
  st.scan = s.week;
}

// ---------------------------------------------------------------- trajetória profissional (início)

export function originOf(s: GameState): OriginId {
  return ident(s).origin ?? ORIGIN_OF_BACKGROUND[life(s).background] ?? 'recordStore';
}

/** Aplica a trajetória no começo da partida: contatos, dívidas, rivalidades, lacunas e preconceitos. */
export function applyOrigin(s: GameState, r: Rng, id: OriginId): void {
  const st = ident(s);
  const def = originById[id];
  st.origin = id;
  for (const [k, v] of Object.entries(def.seed) as [ProfileId, number][]) st.acc[k] += v;
  st.debtLeft = def.debt?.months ?? 0;
  const o = ownerOf(s, r);
  const attr = (k: keyof typeof o.attrs, v: number) => { o.attrs[k] = clamp(o.attrs[k] + v, 5, 99); };
  const rep = (v: number) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional + v, 0, 100); };
  const homeCity = s.config.homeCity;
  const free = Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && (a.status === 'active' || a.status === 'emerging') && a.city === homeCity).sort((a, b) => a.logoSeed - b.logoSeed);
  const contact = (a: Act, trust: number) => {
    a.trust = clamp(a.trust + trust, 0, 100);
    const k = s.knowledge[a.id];
    if (!k) s.knowledge[a.id] = { actId: a.id, degree: 2, stage: 'monitoring', bias: 0, updatedWeek: s.week, source: 'contact' };
    else { k.degree = Math.max(k.degree, 2); k.source = 'contact'; }
  };
  if (id === 'exMusician') { attr('negotiation', -6); rep(-4); for (const a of r.shuffle([...free]).slice(0, 2)) contact(a, 10); }
  if (id === 'promoter') attr('ear', -6);
  if (id === 'recordStore') attr('charisma', -5);
  if (id === 'majorExec') {
    attr('negotiation', 6);
    const major = Object.values(s.labels).filter((x) => x.active && x.family === 'A').sort((a, b) => b.cash - a.cash)[0] ?? Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash)[0];
    if (major) { st.exEmployer = major.id; s.rivalries[major.id] = (s.rivalries[major.id] ?? 0) + 35; }
  }
  if (id === 'sceneOrganizer') { attr('management', -5); rep(-5); for (const a of r.shuffle(free.filter((x) => x.positioning < 55)).slice(0, 3)) contact(a, 6); }
  if (id === 'journalist') {
    const home = homeMarket(s);
    const targets = Object.values(s.acts).filter((a) => !a.playerBand && a.status === 'active' && a.fame > 10 && cityById[a.city]?.market === home).sort((a, b) => b.fame - a.fame).slice(0, 8);
    const burned = r.shuffle(targets).slice(0, 3);
    for (const a of burned) a.trust = clamp(a.trust - 20, 0, 100);
    st.burned = burned.map((a) => a.id);
    const grudge = burned.map((a) => a.owner).find((x) => x && x !== 'player' && s.labels[x]) ?? r.pick(Object.values(s.labels).filter((x) => x.active))?.id;
    if (grudge) s.rivalries[grudge] = (s.rivalries[grudge] ?? 0) + 25;
  }
  hist(s, fmtL(l('Fundado por alguém com passado de {o}.', 'Founded by someone with a past as {o}.'), { o: def.name }));
  bumpPerks();
}

registerSimHook('newgame', 'identity', (s, r) => {
  const spec = s.config.character;
  const chosen = spec?.career && originById[spec.career as OriginId] ? (spec.career as OriginId) : ORIGIN_OF_BACKGROUND[life(s).background] ?? 'recordStore';
  applyOrigin(s, r, chosen);
});
registerSimHook('launch', 'identity', (s, _r, a) => { if (a.release) trackLaunch(s, a.release); });
registerSimHook('show', 'identity', (s, _r, a) => { if (a.show) trackShow(s, a.show); });
registerSimHook('month', 'identity', (s, r) => identityMonth(s, r));
registerDecisionListener('identity', noteDecision);

// ---------------------------------------------------------------- oportunidades exclusivas (ações)

export interface ProfileActionDef { id: string; profile: ProfileId; name: L; desc: L; cost: number; cooldown: number }
export const PROFILE_ACTIONS: ProfileActionDef[] = [
  { id: 'blitz', profile: 'hits', name: l('Blitz nas rádios', 'Radio blitz'), desc: l('Lançamentos novos +18% de apelo por 8 semanas.', 'New releases +18% appeal for 8 weeks.'), cost: 6000, cooldown: 26 },
  { id: 'license', profile: 'catalog', name: l('Licenciar o catálogo', 'License the catalog'), desc: l('Renda na hora pelos discos com mais de 2 anos; artistas sem controle criativo perdem 2 de confiança.', 'Cash now for records older than 2 years; acts without creative control lose 2 trust.'), cost: 0, cooldown: 52 },
  { id: 'night', profile: 'scene', name: l('Noite do selo', 'Label night'), desc: l('Vitrine na cidade-sede: atos locais ganham momento e moral, a cena cresce e surgem sinais novos.', 'Home-city showcase: local acts gain momentum and morale, the scene grows and new signals appear.'), cost: 2500, cooldown: 13 },
  { id: 'partner', profile: 'export', name: l('Acordo com parceiro estrangeiro', 'Foreign partner deal'), desc: l('Adiantamento na hora; por 26 semanas o parceiro fica com 6% das vendas.', 'Cash up front; for 26 weeks the partner keeps 6% of sales.'), cost: 0, cooldown: 52 },
  { id: 'residency', profile: 'dev', name: l('Residência artística', 'Artist residency'), desc: l('Atos pequenos ganham inspiração, técnica e momento.', 'Small acts gain inspiration, chops and momentum.'), cost: 3000, cooldown: 13 },
  { id: 'lab', profile: 'tech', name: l('Laboratório de formatos', 'Format lab'), desc: l('Por 26 semanas: fabricação −15% e vendas +5%. Risco de 15% de falha pública.', 'For 26 weeks: manufacturing −15% and sales +5%. 15% risk of a public failure.'), cost: 5000, cooldown: 39 },
  { id: 'festival', profile: 'live', name: l('Festival do selo', 'Label festival'), desc: l('Bilheteria pelos fãs do núcleo do elenco e +4% de fãs fiéis; o elenco cansa.', 'Box office from the roster\'s core fans and +4% loyal fans; the roster gets tired.'), cost: 8000, cooldown: 52 },
];
PROFILE_ACTIONS.push(...XPROFILES.filter((x) => x.action).map((x) => ({ id: x.action!.id, profile: x.def.id, name: x.action!.name, desc: x.action!.desc, cost: x.action!.cost, cooldown: x.action!.cooldown })));
export const actionById = Object.fromEntries(PROFILE_ACTIONS.map((x) => [x.id, x])) as Record<string, ProfileActionDef>;

function oldCatalog(s: GameState): Release[] {
  const out: Release[] = [];
  for (const id of playerActs(s)) for (const rid of s.acts[id]?.releases ?? []) {
    const r = s.releases[rid];
    if (r && r.owner === 'player' && s.week - r.week > 104) out.push(r);
  }
  return out;
}

/** Motivo para a ação não estar disponível (null = pode). */
export function actionBlock(s: GameState, id: string): L | null {
  const d = actionById[id];
  if (!d) return l('Ação desconhecida.', 'Unknown action.');
  const st = ident(s);
  if (st.cur !== d.profile) return fmtL(l('Só para quem é {p}.', 'Only for a {p}.'), { p: profileById[d.profile].name });
  if ((st.cool[id] ?? -1) > s.week) return fmtL(l('Disponível em {n} semanas.', 'Available in {n} weeks.'), { n: st.cool[id] - s.week });
  if (d.cost && s.player.cash < money(s, d.cost)) return l('Caixa insuficiente.', 'Not enough cash.');
  const acts = rosterActs(s);
  if (id === 'license' && oldCatalog(s).length < 3) return l('Precisa de 3 discos com mais de 2 anos.', 'Needs 3 records older than 2 years.');
  if (id === 'partner' && !s.player.territories.some((m) => m !== homeMarket(s))) return l('Abra ao menos um território fora do mercado de casa.', 'Open at least one territory outside the home market.');
  if ((id === 'festival' || id === 'residency') && !acts.length) return l('Precisa de artistas no elenco.', 'Needs acts on the roster.');
  const xa = XPROFILES.find((x) => x.action?.id === id)?.action;
  if (xa?.block) { const b = xa.block(s, envP(s)); if (b) return b; }
  if (id === 'night' && !acts.some((a) => a.city === s.config.homeCity)) return l('Precisa de ao menos um ato da cidade-sede.', 'Needs at least one act from the HQ city.');
  return null;
}

/** Executa a oportunidade do perfil. Devolve erro ou null; o desfecho vira notificação. */
export function runProfileAction(s: GameState, r: Rng, id: string): L | null {
  const block = actionBlock(s, id);
  if (block) return block;
  const d = actionById[id];
  const st = ident(s);
  const k = profileK(s, d.profile);
  const acts = rosterActs(s);
  if (d.cost) post(s, `id:act:${id}`, -money(s, d.cost), id === 'festival' ? 'live_costs' : id === 'residency' ? 'artist_dev' : 'marketing', d.name.pt);
  let text: L = d.name;
  const xa = XPROFILES.find((x) => x.action?.id === id)?.action;
  if (xa) text = xa.run(s, k, envP(s));
  else if (id === 'blitz') {
    st.boost.blitz = s.week + 8;
    text = l('Blitz nas rádios: os próximos lançamentos chegam com tudo.', 'Radio blitz: your next releases arrive in force.');
  } else if (id === 'license') {
    const old = oldCatalog(s);
    const amount = money(s, (1200 + 450 * Math.min(30, old.length)) * k);
    post(s, 'id:act:license', amount, 'sync', 'Licenciamento do catálogo');
    for (const a of new Set(old.map((x) => s.acts[x.actId]).filter((x): x is Act => !!x))) {
      const c = a.contractId ? s.contracts[a.contractId] : undefined;
      if (!c?.creativeControl) a.trust = clamp(a.trust - 2, 0, 100);
    }
    text = fmtL(l('Catálogo licenciado: {n} discos em coletâneas e trilhas.', 'Catalog licensed: {n} records in compilations and soundtracks.'), { n: old.length });
  } else if (id === 'night') {
    const locals = acts.filter((a) => a.city === s.config.homeCity);
    for (const a of locals) {
      a.momentum = clamp(a.momentum + 8, 0, 100);
      for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.morale = clamp(p.morale + 4, 0, 100); }
      const key = `${a.city}:${a.genre}`;
      s.scenes[key] = (s.scenes[key] ?? 0) + 0.6;
    }
    const unseen = Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && a.city === s.config.homeCity && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id]);
    for (const a of r.shuffle(unseen).slice(0, 2)) s.knowledge[a.id] = { actId: a.id, degree: 1, stage: 'signal', bias: 0, updatedWeek: s.week, source: 'label_night' };
    st.acc.scene += 1;
    text = l('A noite do selo lotou: a cena da cidade fala de vocês.', 'Label night sold out: the city scene talks about you.');
  } else if (id === 'partner') {
    const foreign = s.player.territories.filter((m) => m !== homeMarket(s)).length;
    post(s, 'id:act:partner', money(s, (2500 + 1800 * foreign) * k), 'distribution', 'Adiantamento de parceiro estrangeiro');
    st.boost.partner = s.week + 26;
    text = l('Parceiro estrangeiro fechado: dinheiro agora, comissão nas vendas.', 'Foreign partner signed: money now, a cut of sales.');
  } else if (id === 'residency') {
    for (const a of acts.filter((x) => x.fame < 30)) {
      a.momentum = clamp(a.momentum + 3, 0, 100);
      for (const pid of a.members) {
        const p = s.persons[pid];
        if (!p?.alive) continue;
        p.inspiration = clamp(p.inspiration + 12, 0, 100);
        growPerson(p, 'instr', 0.6);
        growPerson(p, 'comp', 0.6);
      }
    }
    st.acc.dev += 1;
    addLead(s, { paternal: 0.8 });
    text = l('Residência artística concluída: o elenco jovem voltou afiado.', 'Artist residency done: the young roster came back sharp.');
  } else if (id === 'lab') {
    st.boost.lab = s.week + 26;
    if (r.chance(0.15)) {
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
      text = l('O laboratório de formatos falhou em público: a imprensa riu (−4 de reputação). O desconto ficou.', 'The format lab failed in public: the press laughed (−4 reputation). The discount stays.');
    } else text = l('Laboratório de formatos: fábrica mais barata e vendas melhores por meio ano.', 'Format lab: cheaper plant and better sales for half a year.');
  } else if (id === 'festival') {
    const core = acts.reduce((t, a) => t + Math.min(30000, a.fans.core), 0);
    const gross = money(s, (3000 + core * 0.5) * (0.8 + 0.4 * k));
    post(s, 'id:act:festival:in', gross, 'live', 'Festival do selo');
    for (const a of acts) {
      a.fans.core += Math.round(a.fans.core * 0.04);
      for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.fatigue = clamp(p.fatigue + 6, 0, 100); }
    }
    text = l('O festival do selo reuniu os fãs mais fiéis.', 'The label festival gathered your most loyal fans.');
  }
  st.cool[id] = s.week + d.cooldown;
  notify(s, text, 'good');
  hist(s, text);
  return null;
}

// ---------------------------------------------------------------- modificadores (custo/risco e oportunidade)

registerMod('appeal', 'identity', (s, v, c) => {
  const rel = c.release;
  if (!mineRel(rel)) return null;
  const st = ident(s);
  const re = isReissue(rel!);
  let f = 1;
  const kH = profileK(s, 'hits');
  if (kH) f *= re ? 1 - 0.15 * kH : 1 + 0.10 * kH;
  if (!re && (st.boost.blitz ?? -1) >= s.week) f *= 1.18;
  const kC = profileK(s, 'catalog');
  if (kC) { if (re) f *= 1 + 0.25 * kC; else if (s.week - st.lastLaunch < 4) f *= 1 - 0.12 * kC; }
  const home = homeMarket(s);
  const terr = rel!.territories.length ? rel!.territories : [home];
  const foreignShare = terr.filter((m) => m !== home).length / terr.length;
  const kS = profileK(s, 'scene');
  if (kS) f *= 1 + kS * (0.10 - 0.25 * foreignShare);
  const kE = profileK(s, 'export');
  if (kE && terr.length >= 2) f *= 1 + 0.08 * kE;
  const org = st.origin;
  { const xp = st.cur ? XBY_ID[st.cur] : undefined; const act = s.acts[rel!.actId]; if (xp?.appeal && act) f *= adj(xp.appeal(s, rel!, act, envP(s)), profileK(s, xp.def.id)); }
  if (org === 'radio' && rel!.type === 'single') f *= 1.05;
  if (org === 'recordStore' && re) f *= 1.10;
  if (Math.abs(f - 1) < 0.005) return null;
  return { value: v * f, label: identityLabel(s) };
});

registerMod('chartUnits', 'identity', (s, v, c) => {
  const rel = c.release;
  if (!mineRel(rel)) return null;
  const st = ident(s);
  let f = 1;
  const kT = profileK(s, 'tech');
  if (kT && rel!.formats.some((x) => x === 'download' || x === 'streaming')) f *= 1 + 0.08 * kT;
  if ((st.boost.lab ?? -1) >= s.week) f *= 1.05;
  const kL = profileK(s, 'live');
  if (kL) f *= rel!.kind === 'live' ? 1 + 0.2 * kL : 1 - 0.06 * kL;
  { const xp = st.cur ? XBY_ID[st.cur] : undefined; const act = s.acts[rel!.actId]; if (xp?.units && act) f *= adj(xp.units(s, rel!, act, envP(s)), profileK(s, xp.def.id)); }
  if ((st.boost.partner ?? -1) >= s.week && rel!.territories.some((m) => m !== homeMarket(s))) f *= 0.94;
  if ((st.boost.soldCat ?? -1) >= s.week && s.week - rel!.week > 104) f *= 0.85;
  if (st.origin === 'recordStore') f *= 1.03;
  if (Math.abs(f - 1) < 0.005) return null;
  return { value: v * f, label: identityLabel(s) };
});

registerMod('pressingCost', 'identity', (s, v) => {
  const st = ident(s);
  let f = 1 - 0.10 * profileK(s, 'tech');
  if (st.cur && XBY_ID[st.cur]?.pressing) f *= 1 + XBY_ID[st.cur].pressing! * profileK(s, st.cur);
  if ((st.boost.lab ?? -1) >= s.week) f *= 0.85;
  return f === 1 ? null : { value: v * f };
});

registerMod('cityDemand', 'identity', (s, v, c) => {
  if (!c.act || c.act.owner !== 'player' || !c.cityId) return null;
  const st = ident(s);
  const inHome = cityById[c.cityId]?.market === homeMarket(s);
  let f = 1;
  const kS = profileK(s, 'scene');
  if (kS && inHome) f *= 1 + 0.15 * kS;
  const kE = profileK(s, 'export');
  if (kE && !inHome) f *= 1 + 0.12 * kE;
  f *= 1 + 0.08 * profileK(s, 'live');
  { const xp = st.cur ? XBY_ID[st.cur] : undefined; if (xp?.show) f *= adj(xp.show(s, c.act, inHome, envP(s)), profileK(s, xp.def.id)); }
  if (st.origin === 'promoter' && inHome) f *= 1.10;
  return Math.abs(f - 1) < 0.005 ? null : { value: v * f, label: identityLabel(s) };
});

registerMod('showRevenue', 'identity', (s, v, c) => {
  if (!c.act || c.act.owner !== 'player') return null;
  let f = 1 + 0.12 * profileK(s, 'live');
  if (ident(s).origin === 'promoter') f *= 1.06;
  return Math.abs(f - 1) < 0.005 ? null : { value: v * f, label: identityLabel(s) };
});

function identityLabel(s: GameState): L {
  const st = ident(s);
  return st.cur ? fmtL(l('Identidade: {p}', 'Identity: {p}'), { p: profileById[st.cur].name }) : fmtL(l('Trajetória: {o}', 'Background: {o}'), { o: originById[originOf(s)].name });
}

// ---------------------------------------------------------------- reações da imprensa

/** Pontos a mais/menos que a imprensa dá a um lançamento do jogador por causa da identidade do selo. */
export function pressReaction(s: GameState, rel: Release): number {
  if (!mineRel(rel)) return 0;
  const act = s.acts[rel.actId];
  let d = 0;
  d -= 0.3 * profileK(s, 'hits');
  if (isReissue(rel)) d += 0.4 * profileK(s, 'catalog');
  if (act && act.positioning < 45) d += 0.3 * profileK(s, 'scene');
  if (rel.territories.some((m) => m !== homeMarket(s))) d += 0.2 * profileK(s, 'export');
  if (act && act.releases.length <= 1) d += 0.3 * profileK(s, 'dev');
  if (act && familyOf(act.genre) !== 'electronic') d -= 0.2 * profileK(s, 'tech');
  if (rel.kind === 'live') d += 0.5 * profileK(s, 'live');
  const cur = ident(s).cur;
  const xp = cur ? XBY_ID[cur] : undefined;
  if (xp?.press && act) d += xp.press(s, rel, act, envP(s)) * profileK(s, xp.def.id);
  return d;
}
registerReviewAdjust('identity', pressReaction);

// ---------------------------------------------------------------- reações dos artistas (perks com filtro)

registerPerkSource('identity', (s) => {
  const out: PerkEntry[] = [];
  const st = ident(s);
  const home = s.config.homeCity;
  const local = (_s: GameState, a: Act) => a.city === home;
  const small = (_s: GameState, a: Act) => a.fame < 30;
  const P = (p: ProfileId) => fmtL(l('Perfil: {p}', 'Profile: {p}'), { p: profileById[p].name });
  if (st.cur) {
    const k = profileK(s, st.cur);
    const lb = P(st.cur);
    if (st.cur === 'hits') out.push({ label: lb, values: { advance: 0.10 * k } });
    if (st.cur === 'catalog') out.push({ label: lb, values: { valuation: 0.12 * k } });
    if (st.cur === 'scene') { out.push({ label: lb, values: { signals: 1 } }); out.push({ label: lb, values: { trust: 6 * k }, act: local }); }
    if (st.cur === 'export') out.push({ label: lb, values: { trust: -3 * k }, act: local });
    if (st.cur === 'dev') { out.push({ label: lb, values: { morale: 0.4 * k } }); out.push({ label: lb, values: { trust: 6 * k, songQ: 1.5 * k }, act: small }); }
    if (st.cur === 'live') out.push({ label: lb, values: { trust: 3 * k, stress: 0.06 * k } });
    const xp = XBY_ID[st.cur];
    if (xp?.perks) for (const pk of xp.perks(k, envP(s))) out.push({ label: lb, values: pk.values as PerkEntry['values'], act: pk.act });
  }
  const o = st.origin;
  if (o) {
    const lb = fmtL(l('Trajetória: {o}', 'Background: {o}'), { o: originById[o].name });
    if (o === 'exMusician') out.push({ label: lb, values: { trust: 4, advance: 0.05 } });
    if (o === 'radio') out.push({ label: lb, values: { signals: 1, critics: -0.2 } });
    if (o === 'journalist') out.push({ label: lb, values: { critics: 0.4, scoutAccuracy: 0.08 } });
    if (o === 'majorExec') out.push({ label: lb, values: { advance: -0.06 } });
    if (o === 'sceneOrganizer') { out.push({ label: lb, values: { signals: 1 } }); out.push({ label: lb, values: { trust: 6 }, act: local }); }
  }
  if (st.lead) {
    const k = leadK(s, st.lead);
    const lb = fmtL(l('Liderança: {s}', 'Leadership: {s}'), { s: leadById[st.lead].name });
    if (st.lead === 'artistFirst') out.push({ label: lb, values: { trust: 5 * k, stress: 0.05 * k } });
    if (st.lead === 'pragmatic') out.push({ label: lb, values: { advance: -0.06 * k, stress: -0.10 * k } });
    if (st.lead === 'paternal') out.push({ label: lb, values: { trust: 4 * k, morale: 0.5 * k, stress: 0.15 * k } });
    if (st.lead === 'delegator') out.push({ label: lb, values: { trust: -3 * k, stress: -0.2 * k, energy: 1 } });
    if (st.lead === 'controller') out.push({ label: lb, values: { trust: -3 * k, songQ: 1 * k, stress: 0.12 * k } });
  }
  return out;
});

// ---------------------------------------------------------------- negociação e retenção

type OfferIn = Omit<Offer, 'id' | 'week' | 'status'>;
const pickReason = (parts: { v: number; r: L }[]): { score: number; reason?: L } | null => {
  const live = parts.filter((x) => x.v);
  if (!live.length) return null;
  const score = live.reduce((t, x) => t + x.v, 0);
  const top = [...live].sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
  return { score, reason: top.r };
};

/** Peso do perfil do selo na decisão do artista. */
export function profileOfferEffect(s: GameState, act: Act): { score: number; reason?: L } | null {
  const st = ident(s);
  if (!st.cur) return null;
  const k = profileK(s, st.cur);
  const amb = mainAmbition(s, act);
  const P: { v: number; r: L }[] = [];
  const famey = amb === 'fame' || amb === 'status';
  const arty = amb === 'art' || amb === 'critics';
  switch (st.cur) {
    case 'hits':
      if (famey) P.push({ v: 0.07 * k, r: l('Querem a máquina de hits do selo.', 'They want the label\'s hit machine.') });
      if (arty) P.push({ v: -0.06 * k, r: l('Temem virar produto de fábrica.', 'They fear becoming a factory product.') });
      break;
    case 'catalog':
      if (amb === 'security' || amb === 'legacy') P.push({ v: 0.06 * k, r: l('Gostam de um selo que cuida do legado.', 'They like a label that looks after legacy.') });
      if (famey) P.push({ v: -0.05 * k, r: l('Acham o selo parado no passado.', 'They find the label stuck in the past.') });
      break;
    case 'scene':
      if (act.city === s.config.homeCity) P.push({ v: 0.10 * k, r: l('É da cena do selo.', 'They belong to the label\'s scene.') });
      if (act.positioning > 65) P.push({ v: -0.06 * k, r: l('Acham o selo pequeno demais.', 'They find the label too small.') });
      break;
    case 'export':
      if (famey) P.push({ v: 0.07 * k, r: l('Querem carreira internacional.', 'They want an international career.') });
      if (act.city === s.config.homeCity) P.push({ v: -0.05 * k, r: l('Sentem que o selo esqueceu a cidade.', 'They feel the label forgot its city.') });
      break;
    case 'dev':
      if (act.fame < 15) P.push({ v: 0.08 * k, r: l('Querem ser formados por vocês.', 'They want you to develop them.') });
      if (act.fame > 45) P.push({ v: -0.07 * k, r: l('Estrelas não querem escola.', 'Stars do not want a school.') });
      break;
    case 'tech':
      if (arty) P.push({ v: -0.08 * k, r: l('Desconfiam do selo das máquinas.', 'They distrust the machine label.') });
      if (familyOf(act.genre) === 'electronic') P.push({ v: 0.05 * k, r: l('Admiram o selo pioneiro.', 'They admire the pioneer label.') });
      break;
    case 'live':
      if (act.rehearsed >= 8 || (act.gigSat ?? 0) > 0) P.push({ v: 0.05 * k, r: l('Querem estrada e o selo vive no palco.', 'They want the road and the label lives on stage.') });
      break;
    default:
      for (const x of XBY_ID[st.cur]?.offer?.(s, act, amb, k, envP(s)) ?? []) P.push(x);
  }
  return pickReason(P);
}

export function originOfferEffect(s: GameState, act: Act): { score: number; reason?: L } | null {
  const st = ident(s);
  const o = st.origin;
  if (!o) return null;
  const amb = mainAmbition(s, act);
  const P: { v: number; r: L }[] = [];
  if (o === 'journalist' && st.burned.includes(act.id)) P.push({ v: -0.15, r: l('Lembram da sua resenha arrasadora.', 'They remember your scathing review.') });
  if (o === 'majorExec') {
    if (act.positioning < 40) P.push({ v: -0.08, r: l('Desconfiam de ex-executivo de major.', 'They distrust a former major executive.') });
    if (amb === 'fame' || amb === 'status') P.push({ v: 0.04, r: l('Sua agenda de contatos impressiona.', 'Your rolodex impresses.') });
  }
  if (o === 'sceneOrganizer') {
    if (act.fame > 40 || act.positioning > 65) P.push({ v: -0.08, r: l('Te acham pequeno para eles.', 'They think you are too small for them.') });
    if (act.city === s.config.homeCity) P.push({ v: 0.06, r: l('Conhecem você dos porões da cidade.', 'They know you from the city\'s basements.') });
  }
  if (o === 'exMusician' && amb === 'art') P.push({ v: 0.04, r: l('Você já esteve do lado de lá.', 'You have been on the other side.') });
  return pickReason(P);
}

export function leadOfferEffect(s: GameState, act: Act, o: OfferIn): { score: number; reason?: L } | null {
  const st = ident(s);
  if (!st.lead) return null;
  const k = leadK(s, st.lead);
  const amb = mainAmbition(s, act);
  const free = amb === 'art' || amb === 'freedom' || amb === 'critics';
  const P: { v: number; r: L }[] = [];
  if (st.lead === 'artistFirst') {
    if (free) P.push({ v: 0.08 * k, r: l('Sua fama de dar liberdade pesa a favor.', 'Your reputation for freedom helps.') });
    const expRoy = 0.14 + act.fame / 600;
    if (o.model !== 'distribution' && o.royalty < expRoy) P.push({ v: -0.04 * k, r: l('De você, esperam royalty justo.', 'From you they expect a fair royalty.') });
  } else if (st.lead === 'pragmatic') {
    if (free) P.push({ v: -0.06 * k, r: l('Você tem fama de cortar quem não rende.', 'You are known for cutting whoever underperforms.') });
    if (amb === 'money' || amb === 'security') P.push({ v: 0.04 * k, r: l('Gostam de quem fala de números.', 'They like someone who talks numbers.') });
  } else if (st.lead === 'paternal') {
    if (amb === 'security') P.push({ v: 0.07 * k, r: l('Querem alguém que cuide deles.', 'They want someone who looks after them.') });
    if (amb === 'freedom') P.push({ v: -0.07 * k, r: l('Temem ser sufocados.', 'They fear being smothered.') });
  } else if (st.lead === 'delegator') {
    P.push({ v: -0.03 * k, r: l('Querem falar com o dono, não com a equipe.', 'They want the owner, not the staff.') });
  } else if (st.lead === 'controller') {
    if (free) P.push({ v: -0.10 * k * (o.creativeControl ? 0.5 : 1), r: l('Sua fama de controlar tudo assusta.', 'Your reputation for controlling everything scares them.') });
    if (amb === 'security') P.push({ v: 0.03 * k, r: l('Gostam de pulso firme.', 'They like a firm hand.') });
  }
  return pickReason(P);
}

/** Chance extra de renovação (retenção) pela liderança e pelo perfil formador. */
export function retentionBonus(s: GameState, _act: Act): number {
  const st = ident(s);
  let v = 0;
  if (st.lead) {
    const k = leadK(s, st.lead);
    v += ({ artistFirst: 0.10, pragmatic: -0.08, paternal: 0.12, delegator: -0.05, controller: -0.10 } as Record<LeadId, number>)[st.lead] * k;
  }
  v += 0.05 * profileK(s, 'dev');
  return v;
}

registerContractHook('identity:profile', { offer: (s, act) => profileOfferEffect(s, act), renew: (s, act) => retentionBonus(s, act) });
registerContractHook('identity:origin', { offer: (s, act) => originOfferEffect(s, act) });
registerContractHook('identity:lead', { offer: (s, act, o) => leadOfferEffect(s, act, o) });

// ---------------------------------------------------------------- eventos do perfil e da trajetória

const EVENTS_ID: EventDef[] = [
  {
    id: 'id_hits_tv', cat: 'career', tone: 'good', tags: [], cooldown: 8, forcedOnly: true,
    title: l('A TV quer a estrela do selo de hits', 'TV wants the hit label\'s star'),
    text: l('Um programa de auditório quer {act} com exclusividade. Cachê de produção: {amountTxt}.', 'A variety show wants {act} exclusively. Production fee: {amountTxt}.'),
    options: [
      { id: 'tv_yes', label: l('Topar e pagar a produção', 'Accept and pay production'), hint: l('Fama e momento; o artista cansa.', 'Fame and momentum; the act gets tired.'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; post(s, `idtv:${c.act}`, -money(s, Number(c.amount)), 'marketing', 'Programa de TV'); if (a) { a.fame = clamp(a.fame + 2, 0, 100); a.momentum = clamp(a.momentum + 10, 0, 100); a.fans.casual += Math.round(2000 + a.fame * 200); for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.fatigue = clamp(p.fatigue + 5, 0, 100); } } } },
      { id: 'tv_no', label: l('Recusar', 'Decline'), hint: l('Nada muda.', 'Nothing changes.'), apply: () => undefined },
    ],
  },
  {
    id: 'id_catalog_bid', cat: 'business', tone: 'neutral', tags: [], cooldown: 18, forcedOnly: true,
    title: l('Rival quer comprar parte do seu acervo', 'Rival wants part of your vault'),
    text: l('{labelName}, especialista em catálogo, oferece {amountTxt} por direitos de parte dos seus discos antigos.', '{labelName}, a catalog specialist, offers {amountTxt} for rights to some of your old records.'),
    options: [
      { id: 'sell_catalog', label: l('Vender', 'Sell'), hint: l('Dinheiro agora; o acervo vende 15% menos por 2 anos e o perfil enfraquece.', 'Cash now; the vault sells 15% less for 2 years and the profile weakens.'), apply: (s, _r, c) => { post(s, 'idcatsell', money(s, Number(c.amount)), 'asset_sales', 'Venda de direitos do acervo'); const st = ident(s); st.boost.soldCat = s.week + 104; st.acc.catalog *= 0.5; } },
      { id: 'refuse', label: l('Recusar', 'Refuse'), hint: l('O rival não esquece.', 'The rival does not forget.'), apply: (s, _r, c) => { s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 10; } },
    ],
  },
  {
    id: 'id_tech_glitch', cat: 'tech', tone: 'bad', tags: [], cooldown: 12, forcedOnly: true,
    title: l('Falha técnica vira piada', 'Technical failure becomes a joke'),
    text: l('Um lote do seu formato novo saiu com defeito e a imprensa adorou. Recall custa {amountTxt}.', 'A batch of your new format came out faulty and the press loved it. A recall costs {amountTxt}.'),
    options: [
      { id: 'apologize', label: l('Pedir desculpas e trocar tudo', 'Apologize and replace everything'), hint: l('Custa dinheiro; reputação quase intacta.', 'Costs money; reputation mostly intact.'), apply: (s, _r, c) => { post(s, 'idglitch', -money(s, Number(c.amount)), 'release', 'Recall de formato'); s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100); } },
      { id: 'deny', label: l('Negar o problema', 'Deny the problem'), hint: l('Grátis; reputação cai.', 'Free; reputation drops.'), apply: (s) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic - 2, 0, 100); } },
    ],
  },
  {
    id: 'id_old_review', cat: 'people', tone: 'neutral', tags: [], cooldown: 10, forcedOnly: true,
    title: l('A resenha que não foi esquecida', 'The review nobody forgot'),
    text: l('{act} te encontra numa festa e cita, palavra por palavra, a crítica que você escreveu sobre eles.', '{act} meets you at a party and quotes, word for word, the review you wrote about them.'),
    options: [
      { id: 'apologize', label: l('Pedir desculpas', 'Apologize'), hint: l('A mágoa passa (+15 de confiança).', 'The grudge fades (+15 trust).'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (a) a.trust = clamp(a.trust + 15, 0, 100); const st = ident(s); st.burned = st.burned.filter((x) => x !== String(c.act)); } },
      { id: 'stand', label: l('Manter cada palavra', 'Stand by every word'), hint: l('A crítica respeita; o artista, não.', 'Critics respect it; the act does not.'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (a) a.trust = clamp(a.trust - 5, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100); } },
    ],
  },
  {
    id: 'id_noncompete', cat: 'business', tone: 'bad', tags: [], cooldown: 12, forcedOnly: true,
    title: l('A antiga major ameaça processar', 'Your old major threatens to sue'),
    text: l('{labelName} diz que você levou segredos e contatos ao sair. Querem um acordo de {amountTxt}.', '{labelName} says you took secrets and contacts when you left. They want a {amountTxt} settlement.'),
    options: [
      { id: 'settle', label: l('Fazer acordo', 'Settle'), hint: l('Custa caro; a rivalidade esfria.', 'Expensive; the rivalry cools.'), apply: (s, _r, c) => { post(s, 'idnoncomp', -money(s, Number(c.amount)), 'legal', 'Acordo com a antiga major'); s.rivalries[String(c.label)] = Math.max(0, (s.rivalries[String(c.label)] ?? 0) - 15); } },
      { id: 'fight', label: l('Brigar na justiça', 'Fight in court'), hint: l('Advogados custam; pode ganhar ou perder.', 'Lawyers cost money; you may win or lose.'), apply: (s, r, c) => { post(s, 'idnoncomp', -money(s, 2500), 'legal', 'Defesa contra a antiga major'); const win = r.chance(0.5); s.rivalries[String(c.label)] = Math.max(0, (s.rivalries[String(c.label)] ?? 0) + (win ? -10 : 20)); s.player.reputation.institutional = clamp(s.player.reputation.institutional + (win ? 2 : -3), 0, 100); notify(s, win ? l('Você venceu a ação da antiga major.', 'You won the case against your old major.') : l('Você perdeu a ação da antiga major.', 'You lost the case against your old major.'), win ? 'good' : 'bad'); } },
    ],
  },
];
deferEvents(EVENTS_ID);

/** Resumo para a interface e testes. */
export function identitySummary(s: GameState): { profile: ProfileId | null; lean: ProfileId | null; origin: OriginId; lead: LeadId | null } {
  const st = ident(s);
  return { profile: st.cur, lean: st.lean, origin: originOf(s), lead: st.lead };
}


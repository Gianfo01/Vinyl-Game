// Rodada 19 (world19) — "Nosso mundo" vira mecânica de LOTES: cada prédio ocupa um lote do campus e a
// vizinhança importa. (1) Sinergias de vizinhança (estúdio ao lado da sede, casa de shows perto do festival,
// loja onde passa gente, casa dos artistas perto do estúdio; fábrica barulhenta ao lado da casa dos artistas
// pesa) com efeito mensal/anual real, explicação (explain18) e Fact `campus_invest` quando uma se forma;
// (2) mudar um prédio de lote (custo + 2 meses de obra visível); (3) ampliar as obras próprias em estágios
// (obra com prazo, andaime e efeito +25% por estágio) e fundar empreendimentos direto num lote vazio; (4)
// manutenção mensal visível; (5) apelidos e venda; (6) modelos PUROS dos popups (prédio e lote) para a UI
// desenhar sobre o mapa — sem DOM. Determinístico (sem sorteio); saves antigos ganham o estado vazio.

import { clamp } from '../../core/rng';
import { BRANCH_LEVELS, HQ_LEVELS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { upgradeCost as hqUpCost, upgradeHq } from '../economy';
import { registerExplain, type WhyCtx, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { Goto18 } from '../inbox18';
import type { GameState } from '../types';
import { fmtL, money, post } from '../util';
import { addStress } from '../stress17';
import {
  CAMPUS_POST19, CONTRACTORS18, KIND18, LOTS18, PROJ18, STATE18, buildings18, campus18, dormPeople, freeLots18, layout18, log18, lotMult18, projCost18,
  renoMonths18, storeIncome18, storeUpkeep18, styleName18, styleOf18, type BKind, type Bld18, type PKind,
} from './campus18';
import { hq6 } from './hq6';
import { liveOf } from './live/state';
import { school18 } from './school18';
import { MAX_LEVEL, VKINDS, foundCost, kindsAvailable, foundVenture, sellVenture, upgradeCost as vUpCost, upgradeVenture, upkeep as vUpkeep, valuation, ventures, type VKind } from './ventures9';
import { sellValue, sellVenue17, v17, vdef } from './venues17';

// ---------------------------------------------------------------- estado

export interface Work19 { s: number; m: number; k: 'found' | 'up' | 'move' }
export interface World19 {
  /** apelidos dados pelo jogador */
  alias: Record<string, string>;
  /** obras visuais (fundação, expansão, mudança de lote) */
  wk: Record<string, Work19>;
  /** sinergias já anunciadas (chave → ano) */
  syn: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { world19: World19 } }
const fresh = (): World19 => ({ alias: {}, wk: {}, syn: {} });
registerExt4('world19', fresh);
/** Estado (migra saves antigos: campos ausentes viram vazios). */
export function world19(s: GameState): World19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.world19 ??= fresh()) as World19;
  st.alias ??= {}; st.wk ??= {}; st.syn ??= {};
  return st;
}
const mIdx = (s: GameState) => s.year * 12 + s.month;
const $k = (c: number) => { const v = c / 100; return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v)}`; };
type CK = 'store' | 'sign' | 'dorm' | 'park';
const isC = (id: string): id is `c:${CK}` => /^c:(store|sign|dorm|park)$/.test(id);

// apelidos e obras visuais entram na lista de prédios
CAMPUS_POST19.push((s, out) => {
  const w = world19(s), m = mIdx(s);
  for (const b of out) {
    const a = w.alias[b.id];
    if (a) b.name = a;
    const k = w.wk[b.id];
    if (k && m - k.s < k.m) {
      const prog = clamp((m - k.s + 0.5) / k.m, 0.05, 0.98);
      b.prog = prog;
      b.st = k.k === 'found' ? 'building' : 'renovating';
      b.now = k.k === 'found' ? l('Funciona em instalações provisórias enquanto a obra termina.', 'Runs from temporary premises while the works finish.')
        : k.k === 'move' ? l('Mudança de lote: caminhões e andaime.', 'Moving lots: trucks and scaffolding.') : l('Expansão em obras.', 'Expansion under way.');
    }
  }
});

// ---------------------------------------------------------------- vizinhança (lotes)

/** Distância em quadras entre dois lotes (0 = encostados; 2 = do outro lado da rua). */
export function lotGap19(a: number, b: number): number {
  const A = LOTS18[a], B = LOTS18[b];
  if (!A || !B) return 99;
  const dx = Math.max(0, A.gx - (B.gx + B.w), B.gx - (A.gx + A.w)), dy = Math.max(0, A.gy - (B.gy + B.d), B.gy - (A.gy + A.d));
  return dx + dy;
}
export const near19 = (a: number, b: number): boolean => a !== b && lotGap19(a, b) <= 2;

export interface Adj19 { id: string; a: BKind[]; b: BKind[]; name: L; eff: L; neg?: boolean }
export const ADJ19: Adj19[] = [
  { id: 'studio-hq', a: ['studio'], b: ['hq'], name: l('Estúdio ao lado da sede', 'Studio next to the HQ'), eff: l('+0,25 de reputação do estúdio por mês: o elenco atravessa a rua para gravar.', '+0.25 studio reputation a month: the roster just crosses the street to record.') },
  { id: 'venue-fest', a: ['venue', 'fest'], b: ['fest', 'venue'], name: l('Casa de shows perto do festival', 'Venue near the festival'), eff: l('+0,2 de prestígio por mês para os dois: o público de um vira o do outro.', '+0.2 prestige a month for both: one\'s crowd becomes the other\'s.') },
  { id: 'store-crowd', a: ['store'], b: ['venue', 'hq', 'park', 'fest'], name: l('Loja onde passa gente', 'Store on a busy corner'), eff: l('Loja rende +20% por mês: público de show e fãs passam na porta.', 'Store earns +20% a month: show crowds and fans walk past.') },
  { id: 'dorm-studio', a: ['dorm'], b: ['studio', 'rehearsal'], name: l('Casa dos artistas perto do estúdio', 'Artists\' house near the studio'), eff: l('−1 de estresse extra por mês para quem mora lá: menos trânsito, mais sono.', '−1 extra stress a month for residents: less commuting, more sleep.') },
  { id: 'park-stage', a: ['park'], b: ['venue', 'fest'], name: l('Praça dos fãs perto do palco', 'Fan plaza near a stage'), eff: l('+0,6 de reputação comercial por ano: a praça vira ponto de encontro antes dos shows.', '+0.6 commercial reputation a year: the plaza becomes the pre-show meeting point.') },
  { id: 'pub-studio', a: ['publisher'], b: ['studio'], name: l('Editora vizinha do estúdio', 'Publisher next to the studio'), eff: l('+0,2 de reputação da editora por mês: compositores entregam a demo em mãos.', '+0.2 publisher reputation a month: writers hand their demos in person.') },
  { id: 'school-studio', a: ['school'], b: ['studio', 'rehearsal'], name: l('Escola perto do estúdio', 'School near the studio'), eff: l('+0,2 de prestígio da escola por mês: aulas dentro de sessões de verdade.', '+0.2 school prestige a month: lessons inside real sessions.') },
  { id: 'media-hq', a: ['media'], b: ['hq', 'sign'], name: l('Mídia de frente para a sede', 'Media facing the HQ'), eff: l('+0,5 de reputação comercial por ano: a redação vê tudo o que entra e sai.', '+0.5 commercial reputation a year: the newsroom sees everyone coming and going.') },
  { id: 'plant-noise', a: ['dorm'], b: ['plant'], neg: true, name: l('Fábrica barulhenta ao lado', 'Noisy plant next door'), eff: l('+1 de estresse por mês para os moradores: prensa rodando a noite toda.', '+1 stress a month for residents: the presses run all night.') },
];

export interface Syn19 { rule: Adj19; a: string; b: string }
const LIVE = (b: Bld18) => b.zone === 'campus' && (b.st === 'open' || b.st === 'renovating' || b.st === 'damaged');
/** Sinergias ativas agora (cada prédio recebe cada regra no máximo uma vez). */
export function syn19(s: GameState, bs = buildings18(s)): Syn19[] {
  const lots = layout18(s, bs), live = bs.filter(LIVE), out: Syn19[] = [];
  for (const r of ADJ19) for (const a of live) {
    if (!r.a.includes(a.kind)) continue;
    const la = lots.get(a.id);
    if (la === undefined) continue;
    const b = live.find((x) => x !== a && r.b.includes(x.kind) && lots.get(x.id) !== undefined && near19(la, lots.get(x.id)!));
    if (b && !(r.id === 'venue-fest' && out.some((o) => o.rule === r && o.a === b.id && o.b === a.id))) out.push({ rule: r, a: a.id, b: b.id });
  }
  return out;
}
/** O que formaria uma sinergia se um prédio do tipo `k` ficasse no lote `lot`. */
export function synAt19(s: GameState, k: BKind, lot: number, bs = buildings18(s)): { rule: Adj19; with: Bld18 }[] {
  const lots = layout18(s, bs), out: { rule: Adj19; with: Bld18 }[] = [];
  for (const r of ADJ19) {
    const other = r.a.includes(k) ? r.b : r.b.includes(k) ? r.a : null;
    if (!other) continue;
    const w = bs.filter(LIVE).find((x) => other.includes(x.kind) && lots.get(x.id) !== undefined && lots.get(x.id) !== lot && near19(lot, lots.get(x.id)!));
    if (w && !out.some((o) => o.rule === r)) out.push({ rule: r, with: w });
  }
  return out;
}

/** Sobe a reputação/prestígio do negócio por trás do prédio. */
function bump(s: GameState, id: string, d: number): void {
  if (id.startsWith('v:')) { const v = ventures(s).list.find((x) => `v:${x.id}` === id); if (v) v.rep = clamp(v.rep + d, 0, 100); }
  else if (id.startsWith('ve:')) { const o = v17(s).own.find((x) => `ve:${x.id}` === id); if (o) o.rep = clamp(o.rep + d, 0, 100); }
  else if (id.startsWith('fe:')) { const f = liveOf(s).fests.find((x) => `fe:${x.id}` === id); if (f) f.rep = clamp(f.rep + d, 0, 100); }
  else if (id === 'school') { const o = school18(s).own; if (o) o.prest = clamp(o.prest + d, 0, 100); }
}

// ---------------------------------------------------------------- manutenção (visível no popup)

export const MAINT19: Record<'sign' | 'park' | 'dorm', number> = { sign: 40, park: 150, dorm: 500 };
/** Custo mensal de um prédio (null = não se aplica / é calculado na página de gestão). */
export function upkeep19(s: GameState, b: Bld18): { v: number; parts: [L, number][] } | null {
  const parts: [L, number][] = [];
  if (b.kind === 'hq') {
    if (!hq6(s).ownBuilding) parts.push([l('Aluguel da sede', 'HQ rent'), money(s, HQ_LEVELS[s.player.hq].rent)]);
    else parts.push([l('Prédio próprio: sem aluguel', 'Owned building: no rent'), 0]);
  } else if (b.kind === 'branch') {
    const br = (s.branches ?? []).find((x) => `br:${x.id}` === b.id);
    if (br) parts.push([l('Aluguel da filial', 'Branch rent'), money(s, BRANCH_LEVELS[br.level]?.rent ?? 0)]);
  } else if (b.id.startsWith('v:')) {
    const v = ventures(s).list.find((x) => `v:${x.id}` === b.id);
    if (v) parts.push([l('Manutenção + equipe', 'Upkeep + staff'), vUpkeep(s, v)]);
  } else if (b.id.startsWith('ve:')) {
    const o = v17(s).own.find((x) => `ve:${x.id}` === b.id), d = o && vdef(o.id);
    if (o && d) parts.push([o.maint ? l('Custo fixo (com manutenção)', 'Fixed cost (maintained)') : l('Custo fixo (sem manutenção)', 'Fixed cost (no maintenance)'), Math.round(money(s, d.cap * 12 + 3000) * (o.maint ? 1 : 0.6))]);
  } else if (b.id === 'c:store') parts.push([l('Funcionários da loja', 'Store clerks'), storeUpkeep18(s)]);
  else if (b.id === 'c:sign' || b.id === 'c:park' || b.id === 'c:dorm') {
    const k = b.id.slice(2) as 'sign';
    parts.push([l('Manutenção', 'Maintenance'), maint19(s, k)]);
  }
  if (campus18(s).dmg[b.id]) parts.push([l('Espaço provisório (prédio danificado)', 'Temporary space (damaged building)'), money(s, 900)]);
  if (!parts.length) return null;
  return { v: parts.reduce((t, [, x]) => t + x, 0), parts };
}
export const maint19 = (s: GameState, k: 'sign' | 'park' | 'dorm'): number => (campus18(s).built[k] ? Math.round(money(s, MAINT19[k]) * (1 + 0.25 * (campus18(s).upl[`c:${k}`] ?? 0))) : 0);

// ---------------------------------------------------------------- ações

/** Muda um prédio de lote (não a sede nem a sua casa). */
export const moveCost19 = (s: GameState, b: Bld18, lot: number): number => Math.round(money(s, 3000 + 2500 * b.lvl) * lotMult18(lot));
export function canMove19(s: GameState, b: Bld18): L | null {
  if (b.zone !== 'campus') return l('Só prédios da cidade-sede mudam de lote.', 'Only home-city buildings can move lots.');
  if (b.kind === 'hq' || b.kind === 'home') return l('A sede e a sua casa não mudam de lote.', 'The HQ and your home stay put.');
  if (b.st !== 'open') return l('Só um prédio aberto (sem obra) pode mudar.', 'Only an open building (no works) can move.');
  return null;
}
export function move19(s: GameState, id: string, lot: number): L | null {
  const b = buildings18(s).find((x) => x.id === id);
  if (!b) return l('Prédio não encontrado.', 'Building not found.');
  const no = canMove19(s, b);
  if (no) return no;
  if (!freeLots18(s).includes(lot)) return l('Lote ocupado.', 'Lot taken.');
  const c = moveCost19(s, b, lot);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  const st = campus18(s);
  post(s, `world19:move:${id}:${mIdx(s)}`, -c, 'capex', `Mudança de lote: ${b.name}`);
  st.lot[id] = lot;
  if (isC(id)) st.built[id.slice(2) as CK]!.lot = lot;
  world19(s).wk[id] = { s: mIdx(s), m: 2, k: 'move' };
  log18(s, fmtL(l('{n} muda para o lote "{l}".', '{n} moves to lot "{l}".'), { n: b.name, l: LOTS18[lot].name }));
  return null;
}

/** Ampliação de uma obra própria (loja, letreiro, casa, praça): obra com prazo; +25% de efeito por estágio. */
export const UPMAX19 = 2;
export function upCost19(s: GameState, k: CK, q = 1): number {
  const b = campus18(s).built[k];
  return Math.round(money(s, PROJ18[k].cost) * (0.6 + 0.4 * (campus18(s).upl[`c:${k}`] ?? 0)) * lotMult18(b?.lot ?? 0) * CONTRACTORS18[q].cost);
}
export const upMonths19 = (s: GameState, k: CK, q = 1): number => Math.max(1, 2 + (campus18(s).upl[`c:${k}`] ?? 0) - (q === 0 ? 1 : 0));
export function startUp19(s: GameState, k: CK, q = 1): L | null {
  const st = campus18(s), b = st.built[k];
  if (!b) return l('Construa primeiro.', 'Build it first.');
  if ((st.upl[`c:${k}`] ?? 0) >= UPMAX19) return l('Já está no último estágio.', 'Already at the last stage.');
  if (st.proj.some((p) => p.target === `c:${k}`)) return l('Já tem obra nesse prédio.', 'That building already has works.');
  if (!CONTRACTORS18[q]) return l('Escolha um empreiteiro.', 'Pick a contractor.');
  const cost = upCost19(s, k, q), months = upMonths19(s, k, q), first = Math.round(cost * 0.3);
  if (s.player.cash < first) return l('Caixa insuficiente para a entrada (30%).', 'Not enough cash for the 30% down payment.');
  const id = `cp${++st.seq}`;
  post(s, `campus18:${id}:0`, -first, 'capex', `Obra (entrada): ampliação ${PROJ18[k].name.pt}`);
  st.proj.push({ id, kind: 'reno', target: `c:${k}`, lot: -1, q, start: mIdx(s), months, left: months, cost, paid: first, over: 0, delays: 0, up: 1 });
  log18(s, fmtL(l('Ampliação iniciada: {n} ({m} meses).', 'Expansion started: {n} ({m} months).'), { n: PROJ18[k].name, m: months }));
  return null;
}

/** Vende/demole uma obra própria: recupera 35% do valor (investimento). */
export function sellValC19(s: GameState, k: CK): number {
  const b = campus18(s).built[k];
  return b ? Math.round(money(s, PROJ18[k].cost) * lotMult18(b.lot) * 0.35 * (1 + 0.25 * (campus18(s).upl[`c:${k}`] ?? 0))) : 0;
}
export function sellC19(s: GameState, k: CK): L | null {
  const st = campus18(s), b = st.built[k];
  if (!b) return l('Nada a vender.', 'Nothing to sell.');
  if (st.proj.some((p) => p.target === `c:${k}`)) return l('Termine (ou cancele) a obra antes.', 'Finish (or cancel) the works first.');
  const v = sellValC19(s, k);
  post(s, `world19:sell:${k}:${mIdx(s)}`, v, 'asset_sales', `Venda: ${PROJ18[k].name.pt}`);
  st.gone.push({ id: `c:${k}`, kind: k, name: world19(s).alias[`c:${k}`] ?? KIND18[k].name.pt, city: s.config.homeCity, lvl: 1 + b.q + (st.upl[`c:${k}`] ?? 0), sy: st.ren[`c:${k}`] ?? b.y, lot: b.lot, y: s.year, how: 'sold' });
  delete st.built[k]; delete st.upl[`c:${k}`]; delete st.lot[`c:${k}`]; delete st.born[`c:${k}`];
  log18(s, fmtL(l('{n} vendido por {v}.', '{n} sold for {v}.'), { n: PROJ18[k].name, v: $k(v) }));
  return null;
}

export function rename19(s: GameState, id: string, name: string): L | null {
  const n = name.replace(/[;|]/g, ' ').trim().slice(0, 32);
  const w = world19(s);
  if (!n) delete w.alias[id]; else w.alias[id] = n;
  return null;
}

/** Funda um empreendimento (ventures9) direto num lote vazio do campus: 3 meses de obra visível. */
export const LOTV19: VKind[] = ['studio', 'publisher', 'festival', 'booking', 'media', 'platform'];
export function foundAt19(s: GameState, kind: VKind, lot: number): L | null {
  if (!freeLots18(s).includes(lot)) return l('Lote ocupado.', 'Lot taken.');
  const before = new Set(ventures(s).list.map((v) => v.id));
  const e = foundVenture(s, kind, 'label', { city: s.config.homeCity });
  if (e) return e;
  const v = ventures(s).list.find((x) => !before.has(x.id));
  if (!v) return null;
  campus18(s).lot[`v:${v.id}`] = lot;
  world19(s).wk[`v:${v.id}`] = { s: mIdx(s), m: 3, k: 'found' };
  log18(s, fmtL(l('Pedra fundamental: {n} no lote "{l}".', 'Groundbreaking: {n} on lot "{l}".'), { n: v.name, l: LOTS18[lot].name }));
  return null;
}

// ---------------------------------------------------------------- modelos dos popups (puros)

export interface PopRow19 { k: L; v: string; why?: [string, WhyCtx]; tone?: 'good' | 'bad' | '' }
export interface PopAct19 { id: string; label: L; cost?: number; dis?: L; tone?: 'primary' | 'ghost' | 'danger'; go?: Goto18; confirm?: L; ask?: 'name' | 'q' | 'lot' }
export interface Opt19 { id: string; name: L; desc: L; effect: L; cost: number; months: number; icon: string; dis?: L; syn: L[]; q?: boolean }
export interface Pop19 { kind: 'bld' | 'lot'; id: string; title: string; icon: string; tags: (L | string)[]; rows: PopRow19[]; notes: { t: L | string; tone?: 'good' | 'bad' | 'warn' }[]; prog?: number; acts: PopAct19[]; opts: Opt19[] }

const ABS = (s: GameState, id: string) => buildings18(s).find((b) => b.id === id);
/** Popup de um prédio (ou null se não existe). */
export function bldPop19(s: GameState, id: string, q = 1): Pop19 | null {
  const bs = buildings18(s);
  const b = bs.find((x) => x.id === id);
  if (!b) return null;
  const st = campus18(s), lot = layout18(s, bs).get(b.id);
  const rows: PopRow19[] = [];
  rows.push({ k: l('Estágio', 'Stage'), v: `${b.lvl}` });
  for (const [k, v] of b.kpi ?? []) if (k.pt !== 'Nível') rows.push({ k, v });
  const up = upkeep19(s, b);
  if (up) rows.push({ k: l('Custo/mês', 'Cost/mo'), v: up.v ? `−${$k(up.v)}` : '$0', why: ['w19.upk', { id }], tone: up.v ? 'bad' : 'good' });
  const sy = syn19(s, bs).filter((x) => x.a === id || x.b === id);
  if (b.zone === 'campus' && lot !== undefined) rows.push({ k: l('Vizinhança', 'Neighbours'), v: sy.length ? sy.map((x) => (x.rule.neg ? '−' : '+')).join('') : '—', why: ['w19.syn', { id }], tone: sy.some((x) => x.rule.neg) ? 'bad' : sy.length ? 'good' : '' });
  if (lot !== undefined) rows.push({ k: l('Lote', 'Lot'), v: LOTS18[lot].name.pt, why: ['w19.lot', { lot }] });
  const notes: Pop19['notes'] = [];
  if (b.now) notes.push({ t: b.now });
  if (b.note) notes.push({ t: b.note, tone: 'bad' });
  for (const x of sy) notes.push({ t: x.rule.name, tone: x.rule.neg ? 'bad' : 'good' });
  const acts: PopAct19[] = [];
  const busy = st.proj.find((p) => p.target === id || `c:${p.kind}` === id);
  if (busy) {
    const c12 = Math.round(busy.cost * 0.12);
    notes.push({ t: fmtL(l('Obra: {m} meses restantes · pago {p} de {c}.', 'Works: {m} months left · paid {p} of {c}.'), { m: busy.left, p: $k(busy.paid), c: $k(busy.cost + busy.over) }), tone: 'warn' });
    if (busy.left > 1) acts.push({ id: 'rush', label: l('Hora extra (−1 mês)', 'Overtime (−1 month)'), cost: c12, tone: 'primary', dis: s.player.cash < c12 ? l('Caixa insuficiente.', 'Not enough cash.') : undefined });
    acts.push({ id: 'cancel', label: l('Cancelar obra', 'Cancel works'), tone: 'danger', confirm: l('Cancelar a obra? O que foi pago não volta.', 'Cancel the works? What was paid is lost.') });
  }
  const open = b.st === 'open' || b.st === 'damaged';
  // ampliar
  if (!busy && open) {
    if (b.kind === 'hq') {
      const nx = HQ_LEVELS[s.player.hq + 1], c = hqUpCost(s);
      if (nx && c !== null) {
        const req: string[] = [];
        if (nx.minYear && s.year < nx.minYear) req.push(fmtL(l('a partir de {y}', 'from {y}'), { y: nx.minYear }).pt);
        if (nx.minReputation && s.player.reputation.institutional < nx.minReputation) req.push(fmtL(l('reputação institucional {r}+', 'institutional reputation {r}+'), { r: nx.minReputation }).pt);
        acts.push({ id: 'up', label: fmtL(l('Ampliar para {n}', 'Expand to {n}'), { n: nx.name }), cost: c, tone: 'primary',
          dis: req.length ? l(`Requisito: ${req.join(', ')}.`, `Requires: ${req.join(', ')}.`) : s.player.cash < c ? l('Caixa insuficiente.', 'Not enough cash.') : undefined });
      }
    } else if (b.id.startsWith('v:')) {
      const v = ventures(s).list.find((x) => `v:${x.id}` === id);
      if (v && v.level < MAX_LEVEL) { const c = vUpCost(s, v); acts.push({ id: 'up', label: fmtL(l('Expandir para o nível {n}', 'Expand to level {n}'), { n: v.level + 1 }), cost: c, tone: 'primary', dis: s.player.cash < c ? l('Caixa insuficiente.', 'Not enough cash.') : undefined }); }
    } else if (isC(id)) {
      const k = id.slice(2) as CK, u = st.upl[id] ?? 0;
      if (u < UPMAX19) { const c = upCost19(s, k, q); acts.push({ id: 'up', ask: 'q', label: fmtL(l('Ampliar: estágio {n} (+25% de efeito, {m} meses)', 'Expand: stage {n} (+25% effect, {m} months)'), { n: u + 2, m: upMonths19(s, k, q) }), cost: c, tone: 'primary', dis: s.player.cash < Math.round(c * 0.3) ? l('Caixa insuficiente para a entrada.', 'Not enough cash for the down payment.') : undefined }); }
    }
  }
  // reformar (estilo da época) — exceto obras em andamento
  if (!busy && open && b.zone === 'campus' || (!busy && b.st === 'damaged')) {
    const c = projCost18(s, 'reno', -1, q, b);
    const dmg = !!st.dmg[id];
    acts.push({ id: 'reno', ask: 'q', label: dmg ? l('Reconstruir', 'Rebuild') : fmtL(l('Reformar ({s}, {m} meses)', 'Renovate ({s}, {m} months)'), { s: styleName18(styleOf18(s.year)), m: renoMonths18(b) }), cost: c, tone: dmg ? 'primary' : 'ghost',
      dis: !dmg && styleOf18(b.sy) === styleOf18(s.year) ? l('Já tem a cara desta época.', 'Already looks like this era.') : s.player.cash < Math.round(c * 0.3) ? l('Caixa insuficiente para a entrada.', 'Not enough cash for the down payment.') : undefined });
  }
  if (b.zone === 'campus' && b.kind !== 'hq' && b.kind !== 'home' && !busy) {
    const no = canMove19(s, b), fl = freeLots18(s);
    acts.push({ id: 'move', ask: 'lot', label: l('Mudar de lote', 'Move to another lot'), dis: no ?? (fl.length ? undefined : l('Não há lote livre.', 'No free lot.')) });
  }
  if (b.st !== 'sold' && b.st !== 'closed') acts.push({ id: 'rename', ask: 'name', label: l('Renomear', 'Rename'), tone: 'ghost' });
  // vender
  if (!busy && open) {
    if (isC(id)) acts.push({ id: 'sell', label: l('Vender / demolir', 'Sell / demolish'), cost: -sellValC19(s, id.slice(2) as CK), tone: 'danger', confirm: l('Vender? O lote fica livre.', 'Sell? The lot becomes free.') });
    else if (id.startsWith('v:')) { const v = ventures(s).list.find((x) => `v:${x.id}` === id); if (v) acts.push({ id: 'sell', label: l('Vender o negócio', 'Sell the business'), cost: -Math.round(valuation(s, v) * 0.8), tone: 'danger', confirm: l('Vender o negócio inteiro?', 'Sell the whole business?') }); }
    else if (id.startsWith('ve:')) { const o = v17(s).own.find((x) => `ve:${x.id}` === id); if (o) acts.push({ id: 'sell', label: l('Vender a casa', 'Sell the venue'), cost: -sellValue(s, o), tone: 'danger', confirm: l('Vender a casa de shows?', 'Sell the venue?') }); }
  }
  if (b.goto && b.goto.area !== 'campus18') acts.push({ id: 'go', label: l('Abrir página de gestão', 'Open management page'), go: b.goto, tone: 'ghost' });
  const tags: (L | string)[] = [KIND18[b.kind].name, STATE18[b.st], styleName18(styleOf18(b.sy)), b.since === b.sy ? fmtL(l('desde {y}', 'since {y}'), { y: b.since }) : fmtL(l('desde {y} · fachada de {z}', 'since {y} · façade from {z}'), { y: b.since, z: b.sy })];
  return { kind: 'bld', id, title: b.name, icon: KIND18[b.kind].icon, tags, rows, notes, prog: b.prog !== undefined && b.st !== 'open' ? b.prog : undefined, acts, opts: [] };
}

/** Popup de um lote vazio: o que dá para construir aqui (custo, prazo, requisito e vizinhança). */
export function lotPop19(s: GameState, lot: number, q = 1, moving?: string): Pop19 | null {
  const L0 = LOTS18[lot];
  if (!L0) return null;
  const st = campus18(s), bs = buildings18(s), free = freeLots18(s).includes(lot);
  const rows: PopRow19[] = [
    { k: l('Preço do lote', 'Lot price'), v: `×${L0.pm}`, why: ['w19.lot', { lot }] },
    { k: l('Visibilidade', 'Visibility'), v: String(L0.vis), why: ['w19.lot', { lot }] },
  ];
  const notes: Pop19['notes'] = [];
  if (!free) notes.push({ t: l('Lote ocupado (ou reservado para uma obra).', 'Lot taken (or reserved for works).'), tone: 'bad' });
  const opts: Opt19[] = [];
  const acts: PopAct19[] = [];
  const mv = moving ? bs.find((b) => b.id === moving) : undefined;
  if (mv && free) {
    const c = moveCost19(s, mv, lot);
    acts.push({ id: 'moveHere', label: fmtL(l('Mudar {n} para cá', 'Move {n} here'), { n: mv.name }), cost: c, tone: 'primary', dis: canMove19(s, mv) ?? (s.player.cash < c ? l('Caixa insuficiente.', 'Not enough cash.') : undefined) });
    for (const x of synAt19(s, mv.kind, lot, bs.filter((b) => b.id !== mv.id))) notes.push({ t: fmtL(l('Aqui: {n} (com {w})', 'Here: {n} (with {w})'), { n: x.rule.name, w: x.with.name }), tone: x.rule.neg ? 'bad' : 'good' });
  }
  if (free && !mv) {
    for (const k of Object.keys(PROJ18) as CK[]) {
      const d = PROJ18[k], has = !!st.built[k] || st.proj.some((p) => p.kind === k);
      const cost = projCost18(s, k as PKind, lot, q), months = Math.max(1, d.months - (q === 0 ? 1 : 0));
      opts.push({ id: `p:${k}`, name: d.name, desc: d.desc, effect: d.effect, cost, months, icon: KIND18[k].icon, q: true,
        dis: has ? l('Você já tem (ou está construindo) um.', 'You already have (or are building) one.') : s.player.cash < Math.round(cost * 0.3) ? l('Caixa insuficiente para a entrada (30%).', 'Not enough cash for the 30% down payment.') : undefined,
        syn: synAt19(s, k, lot, bs).map((x) => fmtL(l('{s} {n} (com {w})', '{s} {n} (with {w})'), { s: x.rule.neg ? '−' : '+', n: x.rule.name, w: x.with.name })) });
    }
    const av = kindsAvailable(s);
    const own = new Set(ventures(s).list.filter((v) => v.owner === 'label' && v.city === s.config.homeCity).map((v) => v.kind));
    for (const k of LOTV19) {
      if (!av.includes(k)) continue; // nada do futuro: só o que já existe nesta época
      const bk: BKind = k === 'festival' ? 'fest' : k;
      const cost = foundCost(s, k);
      opts.push({ id: `v:${k}`, name: VKINDS[k].name, desc: VKINDS[k].desc, effect: fmtL(l('Novo negócio (nível 1) neste lote; obra de 3 meses. Manutenção a partir de {u}/mês.', 'New business (level 1) on this lot; 3-month build. Upkeep from {u}/mo.'), { u: $k(money(s, VKINDS[k].upkeep)) }),
        cost, months: 3, icon: KIND18[bk].icon,
        dis: own.has(k) ? l('Você já tem um desses na cidade (amplie o atual).', 'You already have one in town (expand it instead).') : s.player.cash < cost ? l('Caixa insuficiente.', 'Not enough cash.') : undefined,
        syn: synAt19(s, bk, lot, bs).map((x) => fmtL(l('{s} {n} (com {w})', '{s} {n} (with {w})'), { s: x.rule.neg ? '−' : '+', n: x.rule.name, w: x.with.name })) });
    }
  }
  return { kind: 'lot', id: `lot:${lot}`, title: L0.name.pt, icon: 'building', tags: [l('Lote vazio', 'Empty lot'), fmtL(l('{w}×{d} quadras', '{w}×{d} tiles'), { w: L0.w, d: L0.d })], rows, notes, acts, opts };
}

/** Executa uma ação de popup. Devolve erro (L) ou null. */
export function act19(s: GameState, target: string, act: string, arg: { q?: number; name?: string; lot?: number; moving?: string } = {}): L | null {
  const q = arg.q ?? 1;
  if (target.startsWith('lot:')) {
    const lot = +target.slice(4);
    if (act === 'moveHere') return arg.moving ? move19(s, arg.moving, lot) : l('Nada para mudar.', 'Nothing to move.');
    if (act.startsWith('p:')) { const k = act.slice(2) as CK; return PROJ18[k] ? startProjAt(s, k, lot, q) : l('Obra inválida.', 'Invalid project.'); }
    if (act.startsWith('v:')) return foundAt19(s, act.slice(2) as VKind, lot);
    return l('Ação inválida.', 'Invalid action.');
  }
  const b = ABS(s, target);
  if (!b) return l('Prédio não encontrado.', 'Building not found.');
  const st = campus18(s);
  const busy = st.proj.find((p) => p.target === target || `c:${p.kind}` === target);
  switch (act) {
    case 'rush': return busy ? rush(s, busy.id) : l('Nada a acelerar.', 'Nothing to speed up.');
    case 'cancel': return busy ? cancel(s, busy.id) : l('Sem obra.', 'No works.');
    case 'up':
      if (b.kind === 'hq') { const e = upgradeHq(s); if (!e) world19(s).wk.hq = { s: mIdx(s), m: 3, k: 'up' }; return e; }
      if (target.startsWith('v:')) { const e = upgradeVenture(s, target.slice(2)); if (!e) world19(s).wk[target] = { s: mIdx(s), m: 2, k: 'up' }; return e; }
      if (isC(target)) return startUp19(s, target.slice(2) as CK, q);
      return l('Amplie na página de gestão.', 'Expand it on its management page.');
    case 'reno': return startReno(s, target, q);
    case 'move': return arg.lot === undefined ? l('Escolha um lote.', 'Pick a lot.') : move19(s, target, arg.lot);
    case 'rename': return rename19(s, target, arg.name ?? '');
    case 'sell':
      if (isC(target)) return sellC19(s, target.slice(2) as CK);
      if (target.startsWith('v:')) return sellVenture(s, target.slice(2));
      if (target.startsWith('ve:')) return sellVenue17(s, target.slice(3));
      return l('Venda na página de gestão.', 'Sell it on its management page.');
  }
  return l('Ação inválida.', 'Invalid action.');
}
// importações tardias para manter o topo legível
import { cancelProj18 as cancel, rushProj18 as rush, startProj18 } from './campus18';
const startProjAt = (s: GameState, k: CK, lot: number, q: number) => startProj18(s, k, lot, q);
const startReno = (s: GameState, id: string, q: number) => startProj18(s, 'reno', -1, q, id);

// ---------------------------------------------------------------- efeitos mensais/anuais

registerSimHook('month', 'world19', (s) => {
  const w = world19(s), m = mIdx(s);
  for (const [id, k] of Object.entries(w.wk)) if (m - k.s >= k.m) delete w.wk[id];
  const sy = syn19(s);
  let store = false, dorm = 0;
  for (const x of sy) {
    switch (x.rule.id) {
      case 'studio-hq': bump(s, x.a, 0.25); break;
      case 'venue-fest': bump(s, x.a, 0.2); bump(s, x.b, 0.2); break;
      case 'pub-studio': bump(s, x.a, 0.2); break;
      case 'school-studio': bump(s, x.a, 0.2); break;
      case 'store-crowd': store = true; break;
      case 'dorm-studio': dorm -= 1; break;
      case 'plant-noise': dorm += 1; break;
    }
    const key = `${x.rule.id}|${x.a}|${x.b}`;
    if (!w.syn[key]) {
      w.syn[key] = s.year;
      const A = ABS(s, x.a)?.name ?? x.a, B = ABS(s, x.b)?.name ?? x.b;
      log18(s, fmtL(l('Vizinhança: {r} ({a} + {b}).', 'Neighbours: {r} ({a} + {b}).'), { r: x.rule.name, a: A, b: B }));
      if (!x.rule.neg) emitFact(s, { kind: 'campus_invest', actors: ['player'], place: s.config.homeCity, severity: 12, visibility: 'public', tags: ['good', 'campus', 'synergy', ...(x.rule.id === 'studio-hq' ? ['studio'] : [])], src: 'world19',
        text: fmtL(l('{c}: {r} — {a} e {b}.', '{c}: {r} — {a} and {b}.'), { c: s.config.companyName, r: x.rule.name, a: A, b: B }) });
    }
  }
  if (store) { const v = Math.round(storeIncome18(s) * 0.2); if (v) post(s, `world19:store:${m}`, v, 'merch', 'Loja: movimento da vizinhança'); }
  if (dorm) for (const pid of dormPeople(s)) addStress(s, pid, dorm, dorm < 0 ? l('Casa dos artistas perto do estúdio', 'Artists\' house near the studio') : l('Fábrica barulhenta ao lado', 'Noisy plant next door'));
  for (const k of ['sign', 'park', 'dorm'] as const) { const c = maint19(s, k); if (c) post(s, `world19:maint:${k}:${m}`, -c, 'hq', `Manutenção: ${PROJ18[k].name.pt}`); }
});
registerSimHook('year', 'world19y', (s) => {
  const sy = syn19(s);
  if (sy.some((x) => x.rule.id === 'park-stage')) s.player.reputation.commercial = clamp(s.player.reputation.commercial + 0.6, 0, 100);
  if (sy.some((x) => x.rule.id === 'media-hq')) s.player.reputation.commercial = clamp(s.player.reputation.commercial + 0.5, 0, 100);
});

// ---------------------------------------------------------------- por quê

registerExplain('w19.syn', (s, c) => {
  const id = String(c.id ?? ''), bs = buildings18(s), b = bs.find((x) => x.id === id);
  if (!b) return null;
  const act = syn19(s, bs).filter((x) => x.a === id || x.b === id);
  const parts: WhyPart[] = act.map((x) => ({ label: x.rule.name, value: (x.a === id ? bs.find((y) => y.id === x.b) : bs.find((y) => y.id === x.a))?.name ?? '?', fmt: 'text', tone: x.rule.neg ? 'bad' : 'good', note: x.rule.eff }));
  const could = ADJ19.filter((r) => (r.a.includes(b.kind) || r.b.includes(b.kind)) && !act.some((x) => x.rule === r));
  for (const r of could) parts.push({ label: r.name, value: '—', fmt: 'text', note: fmtL(l('Possível: {e} Precisa de {k} a até uma rua de distância.', 'Possible: {e} Needs {k} within one street.'), { e: r.eff, k: (r.a.includes(b.kind) ? r.b : r.a).map((k) => KIND18[k].name.pt).join(' / ') }) });
  return { title: l('Vizinhança', 'Neighbours'), value: act.length, fmt: 'num', parts,
    note: l('Lotes encostados ou do outro lado de uma rua contam como vizinhos. Mude prédios de lote para formar pares.', 'Lots that touch or face each other across one street count as neighbours. Move buildings to form pairs.') };
});
registerExplain('w19.upk', (s, c) => {
  const b = buildings18(s).find((x) => x.id === String(c.id ?? ''));
  const u = b && upkeep19(s, b);
  if (!u) return null;
  return { title: l('Custo mensal', 'Monthly cost'), value: u.v, fmt: 'money', parts: u.parts.map(([label, value]) => ({ label, value, fmt: 'money' as const, tone: value ? 'bad' as const : 'good' as const })),
    note: l('Sai do caixa todo mês; o resultado do negócio aparece na página de gestão.', 'Leaves your cash every month; the business result is on its management page.') };
});
registerExplain('w19.lot', (s, c) => {
  const n = Number(c.lot), L0 = LOTS18[n];
  if (!L0) return null;
  const near = LOTS18.map((_, i) => i).filter((i) => near19(n, i));
  const lots = layout18(s, buildings18(s)), who = new Map([...lots].map(([id, i]) => [i, id]));
  return { title: L0.name, value: `×${L0.pm}`, fmt: 'text', parts: [
    { label: l('Preço (multiplica obras e mudanças)', 'Price (multiplies works and moves)'), value: L0.pm, fmt: 'mult' },
    { label: l('Visibilidade (loja e letreiro rendem mais)', 'Visibility (store and sign earn more)'), value: L0.vis, fmt: 'mult' },
    ...near.map((i) => ({ label: fmtL(l('Vizinho: {n}', 'Neighbour: {n}'), { n: LOTS18[i].name }), value: who.get(i) ? (buildings18(s).find((b) => b.id === who.get(i))?.name ?? '—') : l('vazio', 'empty').pt, fmt: 'text' as const })),
  ], note: l('A esquina principal é da sede. Lotes de esquina custam mais e aparecem mais.', 'The main corner belongs to the HQ. Corner lots cost more and are seen more.') };
});

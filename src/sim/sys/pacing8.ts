// Ritmo e delegação (rodada 8): avançar até algo relevante com critérios configuráveis, resumo do
// período agrupado por categoria, delegação por carreira com prioridade, nível de atenção e teto de
// gasto, orçamento mensal da equipe e um registro do que a equipe decidiu e por quê.
//
// Com muitos artistas a pergunta muda: a equipe tem capacidade limitada (sede, empresários e
// administração). Carreiras além da capacidade ficam no mínimo; o jogador decide quem é foco.

import { clamp } from '../../core/rng';
import { agendaById } from '../../data/people';
import { l, type L } from '../../data/world';
import { freeCapacity, setDelegationHooks, slotCost, slotsFor, usedSlots } from '../agenda';
import { agendaLoad, monthIndex, planSlots, slotLoad } from '../capacity';
import { registerExt4 } from '../ext4';
import { maxVenueTier } from '../live';
import { actState } from '../people';
import { unrecorded, unreleasedRecorded } from '../production';
import { advanceWeek } from '../tick';
import type { Act, AgendaSlot, GameState } from '../types';
import { fmtL, money, playerActs, staffCount } from '../util';

export type Prio = 'auto' | 'develop' | 'commercial' | 'tour' | 'rest';
/** 0 = foco, 1 = normal, 2 = mínimo */
export type Tier = 0 | 1 | 2;

export interface ActPolicy { p: Prio; cap: number; tier: Tier }

export interface StopCriteria {
  decision: boolean;
  offer: boolean;
  cash: boolean;
  /** piso de caixa em dólares reais */
  cashFloor: number;
  crisis: boolean;
  release: boolean;
  chart: boolean;
  chartTop: number;
  maxMonths: number;
}

/** Entrada compacta do registro da equipe: x = o que foi feito, y = motivos (códigos). */
export interface TeamEntry { w: number; a?: string; k: 'ag' | 'rel' | 'cut' | 'min' | 'hold'; x: string; y: string }

export interface Pace8State {
  stop: StopCriteria;
  pol: Record<string, ActPolicy>;
  /** orçamento mensal da equipe para todas as carreiras delegadas (dólares reais; 0 = sem limite) */
  team: number;
  spent: Record<string, number>;
  spentMonth: number;
  log: TeamEntry[];
}

export const DEFAULT_STOP: StopCriteria = { decision: true, offer: true, cash: true, cashFloor: 5000, crisis: true, release: false, chart: true, chartTop: 10, maxMonths: 6 };

declare module '../ext4' { interface Ext4 { pace8: Pace8State } }
const fresh = (): Pace8State => ({ stop: { ...DEFAULT_STOP }, pol: {}, team: 0, spent: {}, spentMonth: -1, log: [] });
registerExt4('pace8', fresh);
export const pace8 = (s: GameState): Pace8State => {
  const x = s.x4 as unknown as { pace8?: Pace8State };
  x.pace8 ??= fresh();
  x.pace8.stop = { ...DEFAULT_STOP, ...x.pace8.stop };
  return x.pace8;
};

export const PRIOS: { id: Prio; name: L; desc: L }[] = [
  { id: 'auto', name: l('Automática', 'Automatic'), desc: l('A equipe segue o bom senso: descansa quando cansa, compõe, grava e faz shows.', 'The team uses common sense: rest when tired, write, record and gig.') },
  { id: 'develop', name: l('Desenvolver', 'Develop'), desc: l('Compor, oficinas, treino e ensaio; poucos shows.', 'Writing, workshops, training and rehearsal; few gigs.') },
  { id: 'commercial', name: l('Comercial', 'Commercial'), desc: l('Gravar logo, divulgar, lançar com mais frequência e mais marketing.', 'Record early, promote, release more often with more marketing.') },
  { id: 'tour', name: l('Turnê', 'Tour'), desc: l('Estrada: shows na maior casa possível, ensaio e contatos.', 'Road: gigs at the biggest possible venue, rehearsal and contacts.') },
  { id: 'rest', name: l('Descanso', 'Rest'), desc: l('Pausa e composição leve; nada pago, nenhum lançamento.', 'Rest and light writing; nothing paid, no releases.') },
];
export const TIERS: { id: Tier; name: L; desc: L }[] = [
  { id: 0, name: l('Foco', 'Focus'), desc: l('Primeira da fila para sessões e orçamento.', 'First in line for sessions and budget.') },
  { id: 1, name: l('Normal', 'Normal'), desc: l('Segue a ordem de fama.', 'Follows fame order.') },
  { id: 2, name: l('Mínimo', 'Minimum'), desc: l('Só ações gratuitas; lança apenas com repertório pronto.', 'Free actions only; releases only with a finished repertoire.') },
];

export function policyOf(s: GameState, actId: string): ActPolicy {
  return pace8(s).pol[actId] ?? { p: 'auto', cap: 0, tier: 1 };
}

export function setPolicy(s: GameState, actId: string, p: Partial<ActPolicy>): void {
  const st = pace8(s);
  const cur = { ...policyOf(s, actId), ...p };
  cur.cap = Math.max(0, Math.round(cur.cap));
  if (cur.p === 'auto' && cur.cap === 0 && cur.tier === 1) delete st.pol[actId];
  else st.pol[actId] = cur;
}

/** Quantas carreiras delegadas a equipe acompanha de verdade. */
export function teamCapacity(s: GameState): number {
  return 3 + s.player.hq * 2 + staffCount(s, 'manager') * 3 + staffCount(s, 'admin') * 2;
}

const isDelegated = (s: GameState, id: string) => s.delegated[id] !== false;

/** Ordem de atenção: foco → normal → mínimo; dentro do nível, por fama. */
export function attentionOrder(s: GameState, ids: string[]): string[] {
  return [...ids].sort((a, b) => policyOf(s, a).tier - policyOf(s, b).tier || (s.acts[b]?.fame ?? 0) - (s.acts[a]?.fame ?? 0) || a.localeCompare(b));
}

/** Carreiras delegadas que ficam além da capacidade da equipe (vão para o mínimo). */
export function overCapacity(s: GameState): Set<string> {
  const del = attentionOrder(s, playerActs(s).filter((id) => isDelegated(s, id) && !s.acts[id]?.playerBand));
  return new Set(del.slice(teamCapacity(s)));
}

// ---------------------------------------------------------------- registro

const LOG_MAX = 120;
function log(s: GameState, e: Omit<TeamEntry, 'w'>): void {
  const st = pace8(s);
  st.log.push({ w: s.week, ...e });
  if (st.log.length > LOG_MAX) st.log.splice(0, st.log.length - LOG_MAX);
}

const actionName = (id: string): L => agendaById[id]?.name ?? l(id);

/** Texto do registro: o que a equipe fez e por quê. */
export function describeEntry(s: GameState, e: TeamEntry): { what: L; why: L } {
  const act = e.a ? s.acts[e.a]?.name ?? '' : '';
  const parts = e.x.split(',').filter(Boolean);
  const list = (lang: 'pt' | 'en') => parts.map((p) => { const [id, v] = p.split(':'); const n = actionName(id)[lang]; return v ? `${n} (${v})` : n; }).join(', ');
  let what: L;
  if (e.k === 'ag') what = { pt: `${act}: ${list('pt') || 'agenda vazia'}`, en: `${act}: ${list('en') || 'empty agenda'}` };
  else if (e.k === 'rel') {
    const [type, budget, press] = parts;
    what = fmtL(l('{a}: lançamento automático ({t}), marketing {b}, prensagem {p}', '{a}: auto release ({t}), marketing {b}, pressing {p}'), { a: act, t: type === 'lp' ? 'LP' : 'single', b: `$${budget}`, p: press });
  } else if (e.k === 'cut') what = fmtL(l('{a}: {x} cortado pelo teto de gasto', '{a}: {x} cut by the spending cap'), { a: act, x: { pt: list('pt'), en: list('en') } });
  else if (e.k === 'hold') what = fmtL(l('{a}: lançamento segurado', '{a}: release held back'), { a: act });
  else what = fmtL(l('{a}: no mínimo este mês', '{a}: on minimum this month'), { a: act });
  const why = e.y.split('|').filter(Boolean).map((c) => reasonText(c));
  return { what, why: { pt: why.map((x) => x.pt).join('; '), en: why.map((x) => x.en).join('; ') } };
}

function reasonText(code: string): L {
  const [k, v] = code.split(':');
  const prio = PRIOS.find((p) => p.id === v)?.name;
  switch (k) {
    case 'p': return fmtL(l('prioridade {p}', 'priority {p}'), { p: prio ?? l(v) });
    case 'fat': return fmtL(l('fadiga {v}%', 'fatigue {v}%'), { v });
    case 'str': return fmtL(l('estresse {v}%', 'stress {v}%'), { v });
    case 'unrec': return fmtL(l('{v} música(s) por gravar', '{v} song(s) to record'), { v });
    case 'ready': return fmtL(l('{v} gravada(s) inéditas', '{v} unreleased recording(s)'), { v });
    case 'cap': return fmtL(l('teto da carreira {v}/mês', 'career cap {v}/mo'), { v: `$${v}` });
    case 'team': return fmtL(l('orçamento da equipe {v}/mês', 'team budget {v}/mo'), { v: `$${v}` });
    case 'over': return fmtL(l('equipe no limite ({v} carreiras delegadas)', 'team at capacity ({v} delegated careers)'), { v });
    case 'tier': return fmtL(l('nível de atenção: {v}', 'attention tier: {v}'), { v: TIERS[Number(v)]?.name ?? l(v) });
    case 'gap': return fmtL(l('{v} semanas desde o último disco', '{v} weeks since the last record'), { v });
    case 'cash': return l('caixa curto', 'cash is short');
    case 'err': return l('a gravadora não conseguiu marcar', 'the label could not schedule it');
    default: return l(code);
  }
}

// ---------------------------------------------------------------- orçamento

function resetSpent(s: GameState): void {
  const st = pace8(s);
  const m = monthIndex(s);
  if (st.spentMonth !== m) { st.spent = {}; st.spentMonth = m; }
}

/** Quanto a equipe ainda pode gastar nesta carreira neste mês (centavos; Infinity = sem limite). */
export function budgetLeft(s: GameState, actId: string): number {
  resetSpent(s);
  const st = pace8(s);
  const pol = policyOf(s, actId);
  let left = Infinity;
  if (pol.cap > 0) left = money(s, pol.cap) - (st.spent[actId] ?? 0);
  if (st.team > 0) left = Math.min(left, money(s, st.team) - Object.values(st.spent).reduce((a, b) => a + b, 0));
  return Math.max(0, left);
}

function addSpent(s: GameState, actId: string, cost: number): void {
  resetSpent(s);
  const st = pace8(s);
  st.spent[actId] = (st.spent[actId] ?? 0) + cost;
}

// ---------------------------------------------------------------- agenda delegada

function fits(s: GameState, act: Act, out: AgendaSlot[], a: AgendaSlot, cap: number, paidLeft: { v: number }): boolean {
  if (usedSlots(out) + slotCost(a.action) > slotsFor(act)) return false;
  if (agendaLoad(out) + slotLoad(a) > cap) return false;
  const cost = money(s, agendaById[a.action]?.cost ?? 0);
  if (cost > paidLeft.v) return false;
  paidLeft.v -= cost;
  return true;
}

/** Agenda conforme a prioridade (sem efeitos colaterais). */
export function priorityAgenda(s: GameState, act: Act, prio: Prio, base: AgendaSlot[], budget = Infinity): AgendaSlot[] {
  if (prio === 'auto' && budget === Infinity) return base;
  const st = actState(s, act);
  const cap = Math.min(100, freeCapacity(s, act) - agendaLoad(planSlots(s, act.id)));
  const unrec = unrecorded(s, act).length;
  const tier = Math.min(maxVenueTier(s, act), 3);
  const out: AgendaSlot[] = [];
  const left = { v: budget };
  const add = (a: AgendaSlot | null | false) => { if (a && fits(s, act, out, a, cap, left)) out.push(a); };
  const rec: AgendaSlot = { action: 'record', params: { tier: s.player.hq >= 1 ? 0 : 1, approach: 'balanced' } };
  switch (prio) {
    case 'auto':
      for (const x of base) add(x);
      break;
    case 'develop':
      add(st.fatigue > 60 || st.stress > 70 ? { action: 'rest' } : null);
      add({ action: 'compose' });
      add({ action: 'workshop' });
      add(unrec >= 3 && rec);
      add(act.rehearsed < 10 && { action: 'rehearse' });
      add({ action: 'train' });
      add({ action: 'networking' });
      break;
    case 'commercial':
      add(st.fatigue > 70 || st.stress > 80 ? { action: 'rest' } : null);
      add(unrec >= 2 && rec);
      add(st.fatigue < 60 && { action: 'gigs', params: { tier, dates: 4 } });
      add({ action: 'interview' });
      add(act.fame > 8 && { action: 'feat' });
      add(unrec < 3 && { action: 'compose' });
      add({ action: 'social' });
      break;
    case 'tour':
      add(st.fatigue > 55 || st.stress > 70 ? { action: 'rest' } : null);
      add({ action: 'gigs', params: { tier: Math.min(maxVenueTier(s, act), 4), dates: st.fatigue < 35 ? 8 : 5 } });
      add(act.rehearsed < 10 && { action: 'rehearse' });
      add({ action: act.fame < 20 ? 'opening' : 'interview' });
      add({ action: 'networking' });
      break;
    case 'rest':
      add({ action: 'rest' });
      add({ action: 'compose' });
      break;
  }
  return out;
}

const enc = (slots: AgendaSlot[]) => slots.map((x) => (x.action === 'gigs' ? `gigs:${x.params?.dates ?? ''}` : x.action)).join(',');

function delegatedAgenda(s: GameState, act: Act, base: AgendaSlot[]): AgendaSlot[] {
  if (act.playerBand && s.config.role === 'artist') return base;
  const pol = policyOf(s, act.id);
  const st = actState(s, act);
  const over = overCapacity(s);
  const why: string[] = [];
  let slots: AgendaSlot[];
  if (pol.tier === 2 || over.has(act.id)) {
    // mínimo: só ações gratuitas e no máximo três
    slots = priorityAgenda(s, act, pol.p === 'auto' ? 'auto' : pol.p, base, 0).slice(0, 3);
    why.push(pol.tier === 2 ? 'tier:2' : `over:${playerActs(s).filter((id) => isDelegated(s, id)).length}`);
    log(s, { a: act.id, k: 'min', x: enc(slots), y: why.join('|') });
    return slots;
  }
  const left = budgetLeft(s, act.id);
  slots = priorityAgenda(s, act, pol.p, base, left);
  if (pol.p !== 'auto') why.push(`p:${pol.p}`);
  if (st.fatigue > 55) why.push(`fat:${Math.round(st.fatigue)}`);
  if (st.stress > 65) why.push(`str:${Math.round(st.stress)}`);
  const unrec = unrecorded(s, act).length;
  if (unrec) why.push(`unrec:${unrec}`);
  if (pol.cap > 0) why.push(`cap:${pol.cap}`);
  if (pace8(s).team > 0) why.push(`team:${pace8(s).team}`);
  if (pol.tier === 0) why.push('tier:0');
  log(s, { a: act.id, k: 'ag', x: enc(slots), y: why.join('|') });
  return slots;
}

setDelegationHooks({
  order: (s, ids) => attentionOrder(s, ids),
  agenda: delegatedAgenda,
  canSpend: (s, act, cost, what) => {
    const ok = cost <= budgetLeft(s, act.id);
    if (!ok) {
      const pol = policyOf(s, act.id);
      log(s, { a: act.id, k: 'cut', x: what, y: [pol.cap > 0 ? `cap:${pol.cap}` : '', pace8(s).team > 0 ? `team:${pace8(s).team}` : ''].filter(Boolean).join('|') });
    }
    return ok;
  },
  spent: (s, act, cost) => addSpent(s, act.id, cost),
  release: (s, act) => {
    const pol = policyOf(s, act.id);
    const left = budgetLeft(s, act.id);
    const ready = unreleasedRecorded(s, act).length;
    const gap = pol.p === 'commercial' ? 14 : pol.p === 'develop' ? 30 : 22;
    let ok = pol.p !== 'rest' && (pol.tier !== 2 && !overCapacity(s).has(act.id) ? true : ready >= 8);
    if (left < money(s, 800)) ok = false;
    if (!ok && ready && s.week - act.lastRelease >= gap && s.week % 4 === 0) {
      log(s, { a: act.id, k: 'hold', x: '', y: [pol.p === 'rest' ? 'p:rest' : '', pol.tier === 2 ? 'tier:2' : '', left < money(s, 800) ? (pol.cap > 0 ? `cap:${pol.cap}` : `team:${pace8(s).team}`) : '', `ready:${ready}`].filter(Boolean).join('|') });
    }
    return { ok, minGap: gap, budgetMult: pol.p === 'commercial' ? 1.4 : pol.p === 'develop' ? 0.7 : 1, maxSpend: left === Infinity ? Number.MAX_SAFE_INTEGER : left };
  },
  released: (s, act, info) => {
    if (info.error) { log(s, { a: act.id, k: 'hold', x: '', y: 'err' }); return; }
    if (info.cost > 0) addSpent(s, act.id, info.cost);
    const pol = policyOf(s, act.id);
    const real = Math.round(info.budget / Math.max(1, money(s, 1)));
    log(s, { a: act.id, k: 'rel', x: `${info.type},${real},${info.press}`, y: [pol.p !== 'auto' ? `p:${pol.p}` : '', `ready:${unreleasedRecorded(s, act).length + (info.type === 'lp' ? 8 : 1)}`, `gap:${s.week - act.lastRelease}`].filter(Boolean).join('|') });
  },
});

// ---------------------------------------------------------------- avançar até…

export type StopKind = 'decision' | 'offer' | 'cash' | 'crisis' | 'release' | 'chart' | 'limit' | 'end';

export interface DigestGroup { id: string; name: L; icon: string; items: L[]; n: number }
export interface Digest {
  fromWeek: number;
  toWeek: number;
  months: number;
  cashDelta: number;
  cats: { cat: string; delta: number }[];
  groups: DigestGroup[];
  team: TeamEntry[];
}

export interface DigestSnap { week: number; cash: number; totals: Record<string, number>; mem: number; memId: string; notes: number; logLen: number; logWeek: number }

export function digestStart(s: GameState): DigestSnap {
  return { week: s.week, cash: s.player.cash, totals: { ...s.player.totals }, mem: s.memory.length, memId: s.memory[s.memory.length - 1]?.id ?? '', notes: s.notifications.length, logLen: pace8(s).log.length, logWeek: s.week };
}

const GROUPS: { id: string; name: L; icon: string; re: RegExp }[] = [
  { id: 'crisis', name: l('Crises e escândalos', 'Crises and scandals'), icon: 'fire', re: /scandal|lawsuit|exposed|backlash|censor|cancel|scheme|leak|payola|spy|blackmail|seizure|verdict|hearing|incident|accident/ },
  { id: 'charts', name: l('Paradas e prêmios', 'Charts and awards'), icon: 'chart-up', re: /number1|no1|chart|cert|award|hall_of_fame|legend|viral|breakthrough/ },
  { id: 'releases', name: l('Discos e estúdio', 'Records and studio'), icon: 'disc', re: /release|rollout|record|session|demo|sample|cover|posthumous|songsale|catalog|pack|reissue/ },
  { id: 'shows', name: l('Shows e turnês', 'Shows and tours'), icon: 'tour-bus', re: /tour|gig|festival|show|venue|residency|liveaid|hologram|club|rave|mega_event/ },
  { id: 'people', name: l('Pessoas', 'People'), icon: 'heart', re: /death|addict|rehab|treatment|stress|injury|romance|birth|split|solo|member|lineup|breakup|hiatus|retired|reunion|separation|life|vice|party|voice_nodes|breakdown|heir|dynasty|travel|training|stress_alert/ },
  { id: 'deals', name: l('Contratos e negócios', 'Contracts and deals'), icon: 'contract', re: /signed|sniped|left|renewal|renegotiation|option|contract|promise|poach|rival_sign|auction|buyout|scene_sign|contest|fired|staff|deal|partner|investor|branch|hq|territory|sublabel|jv|acquisition/ },
  { id: 'world', name: l('Mundo e mercado', 'World and market'), icon: 'globe', re: /tech|era|divergence|revival|recession|recovery|law|genre|movement|streaming|piracy|drm|label_|merger|ipo|strike|union|industry|hist_scene|scene|year/ },
];
const OTHER = { id: 'other', name: l('Outros', 'Other'), icon: 'newspaper' };

/** Resumo do período desde o retrato: dinheiro por categoria e acontecimentos agrupados. */
export function digestEnd(s: GameState, snap: DigestSnap, months: number): Digest {
  const cats = Object.keys({ ...snap.totals, ...s.player.totals }).map((cat) => ({ cat, delta: (s.player.totals[cat] ?? 0) - (snap.totals[cat] ?? 0) })).filter((x) => x.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const start = s.memory.findIndex((m) => m.id === snap.memId);
  const mems = s.memory.slice(start >= 0 ? start + 1 : 0).filter((m) => m.week >= snap.week);
  const groups: DigestGroup[] = [...GROUPS.map((g) => ({ id: g.id, name: g.name, icon: g.icon, items: [] as L[], n: 0 })), { ...OTHER, items: [] as L[], n: 0 }];
  const seen = new Set<string>();
  const put = (kind: string, text: L) => {
    if (seen.has(text.pt)) return;
    seen.add(text.pt);
    const gi = GROUPS.findIndex((g) => g.re.test(kind));
    const g = groups[gi >= 0 ? gi : groups.length - 1];
    g.n += 1;
    if (g.items.length < 6) g.items.push(text);
  };
  // fatos importantes primeiro, depois rotina
  for (const m of [...mems.filter((m) => m.important), ...mems.filter((m) => !m.important)]) put(m.kind, m.text);
  for (const n of s.notifications.filter((x) => x.week > snap.week || (x.week === snap.week && s.week > snap.week))) put(n.kind === 'bad' ? 'incident' : 'note', n.text);
  const team = pace8(s).log.filter((e) => e.w >= snap.week && (e.k !== 'ag' || e.w > snap.week));
  return { fromWeek: snap.week, toWeek: s.week, months, cashDelta: s.player.cash - snap.cash, cats: cats.slice(0, 10), groups: groups.filter((g) => g.n > 0), team: team.slice(-40) };
}

export interface UntilResult { weeks: number; months: number; stop: StopKind; reason: L; digest: Digest }

const STOP_TEXT: Record<StopKind, L> = {
  decision: l('Há uma decisão nova na mesa.', 'A new decision is on the desk.'),
  offer: l('Chegou uma proposta importante.', 'An important offer arrived.'),
  cash: l('O caixa ficou abaixo do limite.', 'Cash fell below the threshold.'),
  crisis: l('Uma crise começou.', 'A crisis started.'),
  release: l('Semana de lançamento.', 'Release week.'),
  chart: l('Um disco seu entrou nas paradas.', 'One of your records entered the charts.'),
  limit: l('Fim do período máximo.', 'Maximum period reached.'),
  end: l('Fim da run.', 'Run ended.'),
};

const playerRel = (s: GameState, relId: string) => {
  const r = s.releases[relId];
  return !!r && (r.owner === 'player' || !!s.acts[r.actId]?.playerBand);
};

/** Verifica os critérios de parada depois de uma semana. */
export function checkStop(s: GameState, crit: StopCriteria, base: { decisions: Set<string>; crises: Set<string>; counters: Set<string>; releases: number; insolvency: number; cashBelow: boolean; cashNeg: boolean }): StopKind | null {
  if (s.ended && !s.flags.sandbox) return 'end';
  const fresh = s.decisions.filter((d) => !base.decisions.has(d.id));
  if (crit.offer && (fresh.some((d) => d.cat === 'contract' || d.cat === 'business') || s.offers.some((o) => o.status === 'counter' && !base.counters.has(o.id)))) return 'offer';
  if (crit.crisis && (s.crises.some((c) => !c.resolved && !base.crises.has(c.id)) || s.player.insolvencyMonths > base.insolvency || fresh.some((d) => d.cat === 'scandal'))) return 'crisis';
  if (crit.decision && fresh.length) return 'decision';
  if (crit.cash && ((!base.cashBelow && s.player.cash < money(s, crit.cashFloor)) || (!base.cashNeg && s.player.cash < 0))) return 'cash';
  if (crit.release && s.player.stats.releases > base.releases) return 'release';
  if (crit.chart && [...s.charts.singles, ...s.charts.albums].some((e) => e.weeks === 1 && e.pos <= crit.chartTop && playerRel(s, e.releaseId))) return 'chart';
  return null;
}

/** Avança semana a semana até um critério de parada (ou o limite de meses). */
export function advanceUntil(s: GameState, crit: StopCriteria = pace8(s).stop): UntilResult {
  const snap = digestStart(s);
  const base = {
    decisions: new Set(s.decisions.map((d) => d.id)),
    crises: new Set(s.crises.filter((c) => !c.resolved).map((c) => c.id)),
    counters: new Set(s.offers.filter((o) => o.status === 'counter').map((o) => o.id)),
    releases: s.player.stats.releases,
    insolvency: s.player.insolvencyMonths,
    cashBelow: s.player.cash < money(s, crit.cashFloor),
    cashNeg: s.player.cash < 0,
  };
  const maxMonths = clamp(Math.round(crit.maxMonths), 1, 24);
  let weeks = 0;
  let months = 0;
  let stop: StopKind = 'limit';
  for (let i = 0; i < maxMonths * 6; i++) {
    const closed = advanceWeek(s);
    weeks += 1;
    if (closed) months += 1;
    const why = checkStop(s, crit, base);
    if (why) { stop = why; break; }
    if (months >= maxMonths) break;
  }
  return { weeks, months, stop, reason: STOP_TEXT[stop], digest: digestEnd(s, snap, months) };
}

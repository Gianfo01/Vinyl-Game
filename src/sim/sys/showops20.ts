// Rodada 20b (Z) — operação de shows depois de marcar.
//  Z1  Incidente ↔ notícia: todo show tem um id estável `${tourId}:${dia}` (o mesmo do show ao vivo, liveLog20 e do
//      acerto do live18). Os fatos sobre o show levam `data.show`; a notícia (media17) aponta para o fato
//      (`story.fact`), então dá para ir do show às notícias e da notícia de volta ao show/incidente.
//  Z2  Alterar a turnê depois de marcar: kit (transporte, hospedagem, diárias, equipamento, seguro, segurança,
//      ensaio só antes da estrada), equipe e preço do ingresso valem só para as datas FUTURAS ainda não jogadas.
//      A prévia usa as mesmas contas do planejamento (custo por data de estimateTour + TOUR18.kit/effectiveKit18), e
//      aplicar lança exatamente a prévia. Reduzir serviços já contratados devolve só metade (a outra metade é a
//      multa de cancelamento, a mesma regra de cancelTour). Datas jogadas são imutáveis; o promotor é contrato.
import { VENUE_TIERS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { facts17, type Fact } from '../facts17';
import { KIT0, type Kit18, type KitInfo } from '../tourhook18';
import { PRODUCTION_COST, TICKET, cityDemand } from '../tours';
import { legInfo } from '../travelAdapter';
import { activeMembers } from '../capacity';
import type { GameState } from '../types';
import type { Tour, TourStop } from '../xtypes';
import { fmtL, money, post, staffSkill } from '../util';
import { freeCash20 } from '../oblig20';
import { effectiveKit18, kitCost18, tourPM18 } from './live18';
import { m17, type Story } from './media17';
import { liveOf } from './live/state';

// ================================================================ Z1 — show ↔ notícia

export const showKey20 = (tourId: string, day: number): string => `${tourId}:${day}`;
export function parseShowKey20(key: string): { tourId: string; day: number } | null {
  const i = key.lastIndexOf(':');
  if (i <= 0) return null;
  const day = Number(key.slice(i + 1));
  return Number.isFinite(day) ? { tourId: key.slice(0, i), day } : null;
}
/** Turnê e data de um id de show (se ainda existirem). */
export function showOf20(s: GameState, key: string): { tour: Tour; stop: TourStop } | null {
  const k = parseShowKey20(key);
  const tour = k ? s.tours.find((x) => x.id === k.tourId) : undefined;
  const stop = tour?.stops.find((x) => x.day === k!.day);
  return tour && stop ? { tour, stop } : null;
}
/** Fatos (incidente de público, briga na estrada, show ao vivo) sobre este show. */
export const showFacts20 = (s: GameState, key: string): Fact[] => facts17(s).f.filter((f) => f.data?.show === key);
/** Notícias do feed (media17) nascidas desses fatos. */
export function showStories20(s: GameState, key: string): Story[] {
  const ids = new Set(showFacts20(s, key).map((f) => f.id));
  return ids.size ? m17(s).st.filter((x) => !!x.fact && ids.has(x.fact)) : [];
}
/** Id do show de um fato (ou null). */
export const factShow20 = (f: Pick<Fact, 'data'> | undefined): string | null => (f?.data?.show ? String(f.data.show) : null);
/** Id do show de uma notícia (via o fato que a originou). */
export function storyShow20(s: GameState, x: Pick<Story, 'fact'>): string | null {
  if (!x.fact) return null;
  return factShow20(facts17(s).f.find((f) => f.id === x.fact));
}
/** Resumo do show para a sala de controle: incidentes do show ao vivo (liveLog20), fatos e notícias ligados. */
export function showLinks20(s: GameState, key: string): { live: { i: string; ok: boolean; d: number }[]; facts: Fact[]; stories: Story[] } {
  const live = (liveOf(s).liveLog20?.[key] ?? []).filter(Boolean).map((x) => ({ i: x.i, ok: x.ok, d: x.d }));
  return { live, facts: showFacts20(s, key), stories: showStories20(s, key) };
}

// ================================================================ Z2 — alterar a turnê depois de marcar

export interface TourChange20 { kit?: Partial<Kit18>; crew?: number; priceMult?: number }
export interface TourChangeQuote20 {
  ok: boolean; why?: L;
  /** datas futuras afetadas */
  stops: number;
  /** logística das datas futuras: antes, depois e diferença (+ = mais caro) */
  before: number; after: number; delta: number;
  /** multa de cancelamento (metade da economia ao reduzir serviços) */
  fee: number;
  /** caixa: negativo = sai do caixa; positivo = volta */
  cash: number;
  /** receita prevista de bilheteria das datas futuras (mesma fórmula do planejamento) */
  revBefore: number; revAfter: number;
  kit: Kit18; crew: number; priceMult?: number;
  parts: [L, number][]; warn: L[];
}

const today = (s: GameState) => s.day + s.clock.dayInMonth;
const PB = [0, 0.06, 0.14, 0.25];
/** Datas ainda não jogadas e no futuro (hoje já está em jogo). */
export const futureStops20 = (s: GameState, t: Tour): TourStop[] => t.stops.filter((x) => x.status === 'scheduled' && x.day > today(s));

function soldEst(s: GameState, t: Tour, st: TourStop, price: number): number {
  const act = s.acts[t.actId];
  if (!act) return 0;
  const demand = cityDemand(s, act, st.cityId) * (t.role === 'opening' ? 0.3 : t.role === 'co' ? 1.2 : 1);
  const pm = price / Math.max(1, money(s, TICKET[st.tier]));
  return Math.min(st.capacity, Math.round(demand * (1 + PB[t.production]) / Math.pow(pm, 1.2)));
}

/** Logística das datas futuras com equipe/kit/preços dados — as mesmas parcelas de estimateTour. */
function restLogistics(s: GameState, t: Tour, stops: TourStop[], crew: number, kit: Kit18, prices: number[]): { total: number; kit: ReturnType<typeof kitCost18>; gross: number } {
  const act = s.acts[t.actId]!;
  const people = activeMembers(s, act).length + Math.max(1, crew);
  const i0 = t.stops.indexOf(stops[0]);
  let prev = i0 > 0 ? t.stops[i0 - 1].cityId : s.location[act.id] ?? act.city;
  let total = 0, km = 0, travel = 0, gross = 0;
  const tiers: number[] = [];
  stops.forEach((st, i) => {
    const leg = legInfo(s, prev, st.cityId, people);
    km += leg.km; travel += leg.cost;
    if (leg.visa?.needed) total += leg.visa.cost;
    const v = VENUE_TIERS[st.tier];
    total += leg.cost + money(s, (v.cost + 90 * people + PRODUCTION_COST[t.production]) * (1 - staffSkill(s, 'tour_manager') / 400));
    gross += soldEst(s, t, st, prices[i]) * prices[i];
    tiers.push(st.tier);
    prev = st.cityId;
  });
  const days = stops.length ? stops[stops.length - 1].day - stops[0].day + 1 : 0;
  const info: KitInfo = { people, km, travel, shows: stops.length, days, tiers, gross, fame: act.fame, members: activeMembers(s, act).length };
  const k = kitCost18(s, kit, info);
  return { total: Math.round(total + k.total), kit: k, gross };
}

/** Prévia de uma alteração (não muda nada). */
export function tourChangeQuote20(s: GameState, tourId: string, ch: TourChange20): TourChangeQuote20 {
  const t = s.tours.find((x) => x.id === tourId);
  const kit0: Kit18 = { ...KIT0, ...(t?.kit18 ?? {}) };
  const empty = (why: L): TourChangeQuote20 => ({ ok: false, why, stops: 0, before: 0, after: 0, delta: 0, fee: 0, cash: 0, revBefore: 0, revAfter: 0, kit: kit0, crew: t?.crew ?? 0, parts: [], warn: [] });
  if (!t || (t.status !== 'planned' && t.status !== 'running')) return empty(l('Turnê encerrada ou cancelada: nada a alterar.', 'Tour finished or cancelled: nothing to change.'));
  const act = s.acts[t.actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return empty(l('Ato não é seu.', 'Not your act.'));
  const fut = futureStops20(s, t);
  if (!fut.length) return empty(l('Não há datas futuras: shows já jogados não mudam.', 'No future dates: played shows cannot change.'));
  const want = { ...(ch.kit ?? {}) };
  if (want.prom && want.prom !== kit0.prom) return empty(l('O promotor é contrato: não muda depois de marcar.', 'The promoter is a contract: it cannot change after booking.'));
  if (want.reh !== undefined && want.reh !== kit0.reh && t.status === 'running') return empty(l('O ensaio acontece antes da estrada: a turnê já começou.', 'Rehearsal happens before the road: the tour has already started.'));
  const crew = Math.max(1, Math.round(ch.crew ?? t.crew));
  const people = activeMembers(s, act).length + crew;
  const kit = effectiveKit18(s, { ...kit0, ...want, prom: kit0.prom }, people);
  const oldP = fut.map((x) => x.price);
  const newP = ch.priceMult !== undefined ? fut.map((x) => money(s, TICKET[x.tier] * Math.max(0.3, Math.min(3, ch.priceMult!)))) : oldP;
  const a = restLogistics(s, t, fut, t.crew, kit0, oldP);
  const b = restLogistics(s, t, fut, crew, kit, newP);
  const delta = b.total - a.total;
  const fee = delta < 0 ? Math.round(-delta / 2) : 0;
  const cash = delta > 0 ? -delta : -delta - fee;
  const parts: [L, number][] = [];
  if (crew !== t.crew) parts.push([fmtL(l('Equipe {a} → {b}', 'Crew {a} → {b}'), { a: t.crew, b: crew }), 0]);
  const kd = b.kit.total - a.kit.total;
  if (kd) parts.push([l('Logística do kit (datas futuras)', 'Kit logistics (future dates)'), kd]);
  if (delta - kd) parts.push([l('Pessoas na estrada (viagem, diárias da casa)', 'People on the road (travel, venue per-head)'), delta - kd]);
  if (fee) parts.push([l('Multa de cancelamento (metade da economia)', 'Cancellation fee (half the savings)'), fee]);
  const q: TourChangeQuote20 = { ok: true, stops: fut.length, before: a.total, after: b.total, delta, fee, cash, revBefore: Math.round(a.gross), revAfter: Math.round(b.gross), kit, crew, priceMult: ch.priceMult, parts, warn: b.kit.warn };
  if (cash < 0 && freeCash20(s) < -cash) return { ...q, ok: false, why: fmtL(l('Caixa livre insuficiente: a alteração custa {c}.', 'Not enough free cash: the change costs {c}.'), { c: `$${Math.round(-cash / 100).toLocaleString('en-US')}` }) };
  return q;
}

/** Aplica a alteração — revalida a prévia e lança exatamente o que ela mostrou. Erro = nada muda. */
export function changeTour20(s: GameState, tourId: string, ch: TourChange20): L | TourChangeQuote20 {
  const q = tourChangeQuote20(s, tourId, ch);
  if (!q.ok) return q.why ?? l('Alteração inválida.', 'Invalid change.');
  const t = s.tours.find((x) => x.id === tourId)!;
  const fut = futureStops20(s, t);
  const n = t.log.length;
  if (q.cash && !post(s, `tourchg:${t.id}:${n}`, q.cash, 'live_costs', `Alteração ${t.name}`)) return l('Alteração já lançada nesta semana.', 'Change already posted this week.');
  t.costReserved += -q.cash; t.costs += -q.cash;
  t.kit18 = q.kit; t.crew = q.crew;
  if (q.priceMult !== undefined) for (const st of fut) st.price = money(s, TICKET[st.tier] * Math.max(0.3, Math.min(3, q.priceMult)));
  // post-mortem: o kit vigente e a previsão das datas que mudaram
  const pm = tourPM18(s, t.id);
  if (pm) {
    pm.kit = q.kit; pm.logistics = t.costReserved;
    pm.cost.push([l('Alteração depois de marcar', 'Change after booking'), -q.cash]);
    for (const st of fut) { const ps = pm.shows.find((x) => x.d === st.day && x.c === st.cityId); if (ps) ps.e = soldEst(s, t, st, st.price); }
  }
  t.log.push(fmtL(l('Alterada: {n} data(s) futura(s), logística {d}.', 'Changed: {n} future date(s), logistics {d}.'), { n: fut.length, d: `${q.delta >= 0 ? '+' : '−'}$${Math.round(Math.abs(q.delta) / 100).toLocaleString('en-US')}` }));
  return q;
}

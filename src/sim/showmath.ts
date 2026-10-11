// Rodada 21 (F-1/F-2/F-8) — UMA conta de show. A previsão do planejador, o post-mortem, a alteração depois de
// marcar e o acerto do dia chamam as mesmas funções: público esperado = exatamente a fórmula do acerto com ruído 1
// (qualidade do setlist/palco/clube/clima, papel, preço por mercado via TOUR18.q e todos os modificadores
// 'showRevenue' em modo determinístico). Também centraliza o papel (headline/co/abertura), o cachê base
// (inclusive o cachê fixo da abertura) e a banca de merch, que vende do estoque do merch17 (sem lote, não vende).
// Sem imports de runtime de tours.ts: tours.ts importa daqui (TICKET, cityDemand) e reexporta.

import { clamp } from '../core/rng';
import { VENUE_TIERS } from '../data/rules';
import { cityById } from '../data/world';
import { actTalent } from './people';
import type { Act, GameState } from './types';
import type { Tour, TourStop } from './xtypes';
import { dateOfDay, money, staffSkill } from './util';
import { climateInfo } from './travelAdapter';
import { clubBonus } from './culture';
import { branchCityBonus } from './branches';
import { applyMods } from './ext4';
import { TOUR18 } from './tourhook18';
import { m17, unitPrice } from './sys/merch17';

export const TICKET = [12, 25, 45, 70, 95];
export const PRODUCTION_COST = [0, 400, 1500, 6000]; // por show
export const PRODUCTION_BONUS = [0, 0.06, 0.14, 0.25];

/** Público potencial numa cidade: fãs locais + regionais, saturação de visitas recentes. */
export function cityDemand(s: GameState, act: Act, cityId: string): number {
  const city = cityById[cityId];
  if (!city) return 0;
  const home = cityById[act.city];
  const total = act.fans.core * 0.9 + act.fans.active * 0.35 + act.fans.casual * 0.03;
  let share = 0.05;
  if (cityId === act.city) share = 0.35;
  else if (home && city.market === home.market) share = 0.14;
  else if (s.player.territories.includes(city.market)) share = 0.06;
  const scene = s.scenes[`${cityId}:${act.genre}`] ?? 0;
  const last = s.flags[`played:${act.id}:${cityId}`];
  const sat = last !== undefined ? clamp((s.week - last) / 26, 0.35, 1) : 1;
  return Math.round(applyMods(s, 'cityDemand', total * share * (1 + act.fame / 70) * (1 + Math.min(0.4, scene / 30)) * sat * branchCityBonus(s, cityId), { act, cityId }).value);
}

export function autoTier(s: GameState, act: Act, demand: number): number {
  let t = 0;
  for (const v of VENUE_TIERS) if (demand >= v.cap[0] * 0.6 && act.fame + staffSkill(s, 'booking') / 12 >= v.fameMin) t = v.id;
  return t;
}

/** Papel na noite: fração do próprio público e fração do público do parceiro que vem ao show (F-2: abertura = metade). */
export function roleFactor(role: Tour['role']): { self: number; partner: number } {
  return role === 'opening' ? { self: 0.3, partner: 0.5 } : role === 'co' ? { self: 1, partner: 0.4 } : { self: 1, partner: 0 };
}

export function setlistQuality(s: GameState, setlist: string[], minutes: number): { q: number; coverPenalty: number } {
  const songs = setlist.map((id) => s.songs[id]).filter((x) => x?.recorded);
  const need = Math.ceil(minutes / 4);
  const q = songs.length ? songs.reduce((x, y) => x + y.q, 0) / songs.length : 35;
  const coverPenalty = songs.length >= need ? 1 : 0.75 + 0.25 * (songs.length / need);
  return { q, coverPenalty };
}

export interface ShowCalc {
  /** público próprio (já com o papel) */
  demand: number;
  /** público emprestado do parceiro (já com a fração do papel) */
  partnerDraw: number;
  /** fração do público que é "seu" (o resto veio pelo parceiro) */
  ownShare: number;
  quality: number;
  priceMult: number;
  q: number;
  cover: number;
  clim: ReturnType<typeof climateInfo>;
}

/** Vista da turnê como ela estará no dia da parada `i`: as datas anteriores ainda marcadas terão sido tocadas. */
function viewAt(t: Tour, i: number): Tour {
  if (i <= 0 || !t.stops.slice(0, i).some((x) => x.status === 'scheduled')) return t;
  return { ...t, stops: t.stops.map((x, j) => (j < i && x.status === 'scheduled' ? { ...x, status: 'played' as const } : x)) };
}

/** Os fatores do acerto de uma parada (determinísticos: tudo é conhecido ao planejar). */
export function showCalc(s: GameState, act: Act, t: Tour, st: TourStop): ShowCalc {
  const i = t.stops.indexOf(st);
  const tv = viewAt(t, i);
  const { q, coverPenalty } = setlistQuality(s, t.setlist, t.minutes);
  const rf = roleFactor(t.role);
  const month = dateOfDay(s.config.startYear, st.day).month;
  const clim = climateInfo(s, st.cityId, month);
  const t2 = actTalent(s, act);
  const demand = cityDemand(s, act, st.cityId) * rf.self;
  const partner = t.partnerActId ? s.acts[t.partnerActId] : undefined;
  const partnerDraw = partner && rf.partner ? cityDemand(s, partner, st.cityId) * rf.partner : 0;
  const quality = clubBonus(s, st.cityId) * (0.75 + q / 200 + t2.stage / 250) * coverPenalty * (1 + PRODUCTION_BONUS[t.production]) * clim.outdoorFactor * (TOUR18.q?.(s, tv, st) ?? 1);
  const priceMult = st.price / Math.max(1, money(s, TICKET[st.tier]));
  const ownShare = demand + partnerDraw > 0 ? demand / (demand + partnerDraw) : 1;
  return { demand, partnerDraw, ownShare, quality, priceMult, q, cover: coverPenalty, clim };
}

/** Público de uma noite a partir dos fatores (ruído = 1 na previsão; sorte da noite no acerto). */
export function soldFrom(capacity: number, demand: number, quality: number, priceMult: number, noise = 1): number {
  return Math.max(0, Math.min(capacity, Math.round((demand * quality) / Math.pow(Math.max(0.01, priceMult), 1.2) * noise)));
}

/** Público esperado = a conta do acerto com ruído 1. */
export function expectedSold(s: GameState, act: Act, t: Tour, st: TourStop, noise = 1): number {
  const c = showCalc(s, act, t, st);
  return soldFrom(st.capacity, c.demand + c.partnerDraw, c.quality, c.priceMult, noise);
}

/** Bilheteria depois de todos os modificadores 'showRevenue', em modo determinístico (dia e política de ingressos da parada). */
export function expectedGross(s: GameState, act: Act, t: Tour, st: TourStop, sold: number): number {
  const ratio = st.capacity ? cityDemand(s, act, st.cityId) / st.capacity : 0;
  const gross = sold * st.price;
  if (TOUR18.revenue) return TOUR18.revenue(s, act.id, st.cityId, st.tier, ratio, gross, st.day);
  return Math.round(applyMods(s, 'showRevenue', gross, { act, cityId: st.cityId, day: st.day }).value);
}

/** Cachê base do acordo (porta 65% / cachê fixo / garantia + 45% / o maior dos dois); abertura = cachê fixo; co = metade. */
export function basePay(s: GameState, act: Act, t: Tour, st: TourStop, gross: number, demand: number): number {
  const forecast = Math.round(Math.min(st.capacity, demand) * st.price * 0.5);
  let pay = t.pay === 'door' ? Math.round(gross * 0.65)
    : t.pay === 'guarantee' ? Math.round(forecast * 0.8)
    : t.pay === 'versus' ? Math.max(Math.round(forecast * 0.55), Math.round(gross * 0.6))
    : Math.round(forecast * 0.4 + gross * 0.45);
  if (t.role === 'opening') pay = Math.round(money(s, 150 + act.fame * 20));
  if (t.role === 'co') pay = Math.round(pay * 0.5);
  return pay;
}

/** Previsão completa de uma parada (público, bilheteria e cachê) — o que o post-mortem guarda e a UI mostra. */
export function expectedStop(s: GameState, act: Act, t: Tour, st: TourStop): { sold: number; gross: number; pay: number; demand: number } {
  const c = showCalc(s, act, t, st);
  const sold = soldFrom(st.capacity, c.demand + c.partnerDraw, c.quality, c.priceMult, 1);
  const gross = expectedGross(s, act, t, st, sold);
  return { sold, gross, pay: basePay(s, act, t, st, gross, c.demand), demand: c.demand };
}

/** Banca de merch do show: vende do estoque das linhas do merch17 (sem lote = nada). `consume` baixa o estoque. */
export function merchStand(s: GameState, act: Act, sold: number, consume: boolean): number {
  const lines = m17(s).lines.filter((ln) => ln.act === act.id && ln.stock > 0);
  if (!lines.length || sold <= 0) return 0;
  let rev = 0;
  for (const ln of lines) {
    const u = Math.min(ln.stock, Math.round((sold * 0.12 * (0.5 + ln.design / 100) * (ln.drop ? 0.5 : 1)) / lines.length));
    if (u <= 0) continue;
    const v = u * unitPrice(s, ln);
    rev += v;
    if (consume) { ln.stock -= u; ln.sold += u; ln.rev += v; }
  }
  return rev;
}

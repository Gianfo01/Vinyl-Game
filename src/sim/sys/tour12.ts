// Rodada 12: agente de shows x promotor. Dois papéis explícitos (o jogador pode exercer os dois):
// o AGENTE negocia datas para artistas e ganha comissão (risco: perder clientes); o PROMOTOR banca
// os shows e fica com a bilheteria (risco: prejuízo com casa vazia). Rotas respeitam a agenda real
// de casas e artistas; cachê fixo x porcentagem da porta; cidades novas x conquistadas; relação com
// promotores locais; cansaço (viagem, folga, dias de show); capacidade cresce pela força LOCAL.

import { Rng, clamp } from '../../core/rng';
import { VENUE_TIERS } from '../../data/rules';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { TICKET, cityDemand } from '../tours';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { ventures } from './ventures9';
import { clash17 } from './clash17';

export type Deal = 'guarantee' | 'door' | 'versus';
export type Role = 'agent' | 'promoter';
export interface Stop { city: string; week: number; tier: number; deal: Deal; fee: number; pct: number; pmult: number; promo: number; opener?: string; ask?: number }
export interface Result { att: number; cap: number; gross: number; artist: number; comm: number; prom: number; why: L[]; cancelled?: boolean }
export interface Show extends Stop { id: string; actId: string; by: Role; vid?: string; rate: number; status: 'booked' | 'played' | 'cancelled'; deposit: number; res?: Result }
export interface Offer12 { id: string; actId: string; vid: string; until: number; city: string; a: Stop[]; b: Stop[] }
export interface Career12 {
  shows: Show[]; heat: Record<string, { v: number; w: number }>; rel: Record<string, number>; fat: Record<string, { v: number; w: number; city: string }>;
  sat: Record<string, number>; offers: Offer12[]; promoter: { on: boolean; rep: number; total: number; n: number }; log: { w: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { tour12: Career12 } }
const fresh = (): Career12 => ({ shows: [], heat: {}, rel: {}, fat: {}, sat: {}, offers: [], promoter: { on: false, rep: 20, total: 0, n: 0 }, log: [] });
registerExt4('tour12', fresh);
export const c12 = (s: GameState): Career12 => {
  const x = s.x4 as unknown as { tour12?: Career12 };
  x.tour12 ??= fresh();
  return x.tour12;
};
const activeAct = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && a.members.length > 0;
const logit = (s: GameState, t: L) => { const c = c12(s); c.log.push({ w: s.week, t }); if (c.log.length > 30) c.log.shift(); };

export const DEAL_NAME: Record<Deal, L> = { guarantee: l('Cachê fixo', 'Flat guarantee'), door: l('Porcentagem da porta', 'Door split'), versus: l('Cachê ou porta (o maior)', 'Guarantee vs door (higher)') };
/** Portes liberados por época (casas grandes só existem depois). */
export const TIER_FROM = [0, 0, 1925, 1966, 1972];
export const tiersOpen = (s: GameState): number[] => VENUE_TIERS.filter((v) => s.year >= TIER_FROM[v.id]).map((v) => v.id);
export const tierCap = (t: number): number => Math.round((VENUE_TIERS[t].cap[0] + VENUE_TIERS[t].cap[1]) / 2);
export const rel = (s: GameState, city: string): number => c12(s).rel[city] ?? 30;
export const PROMOTER_LICENSE = 8000;
export const WEEKS_AHEAD = 16;

// ---------------------------------------------------------------- força local

export function baseDraw(s: GameState, act: Act, city: string): number {
  return cityDemand(s, act, city) / (1 + act.fame / 70) * (1 + act.fame / 200);
}
export const isNewMarket = (s: GameState, actId: string, city: string): boolean => !c12(s).heat[`${actId}:${city}`];
/** Público que o artista puxa NESTA cidade: pesa o histórico local, não a fama global. */
export function localDraw(s: GameState, act: Act, city: string, week = s.week): number {
  const h = c12(s).heat[`${act.id}:${city}`];
  const b = baseDraw(s, act, city);
  if (!h) return b;
  const sat = clamp((week - h.w) / 20, 0.55, 1);
  return 0.3 * b + 0.7 * h.v * sat;
}
/** Maior porte que a força local sustenta (lotar teatro vale mais que arena vazia). */
export function suggestTier(s: GameState, act: Act, city: string): number {
  const d = localDraw(s, act, city);
  let t = 0;
  for (const id of tiersOpen(s)) if (d >= tierCap(id) * 0.7) t = id;
  return t;
}

// ---------------------------------------------------------------- agenda

export function venueFree(s: GameState, city: string, tier: number, week: number): boolean {
  const busy = 0.2 + tier * 0.06 - rel(s, city) / 500;
  return Rng.fromSeed(`${s.config.seed}:av12:${city}:${tier}:${week}`).next() > busy;
}
export function actBusy(s: GameState, act: Act, week: number, extra: Stop[] = []): L | null {
  if ((act.hiatusUntil ?? 0) > week) return l('Artista em hiato.', 'Act on hiatus.');
  const n = c12(s).shows.filter((x) => x.actId === act.id && x.status === 'booked' && x.week === week).length + extra.filter((x) => x.week === week).length;
  if (n >= 2) return l('Já tem dois shows nessa semana.', 'Already two shows that week.');
  for (const t of s.tours ?? []) if (t.actId === act.id && (t.status === 'planned' || t.status === 'running') && t.stops.some((p) => Math.abs(p.day - week * 7) < 4)) return l('Em turnê própria nessa data.', 'On its own tour that date.');
  return null;
}
export function km(a: string, b: string): number {
  const x = cityById[a], y = cityById[b];
  if (!x || !y || a === b) return 0;
  const R = Math.PI / 180, dl = (y.lat - x.lat) * R, dn = (y.lon - x.lon) * R;
  const q = Math.sin(dl / 2) ** 2 + Math.cos(x.lat * R) * Math.cos(y.lat * R) * Math.sin(dn / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(q));
}
function fatStep(f: { v: number; w: number; city: string } | undefined, st: { city: string; week: number }): { v: number; w: number; city: string } {
  const gap = f ? Math.max(0, st.week - f.w) : 4;
  let v = f ? Math.max(0, f.v - 0.18 * Math.max(0, gap - 1)) : 0;
  v += 0.14 + (f ? Math.min(0.5, km(f.city, st.city) / 9000) * (gap <= 1 ? 1 : 0.5) : 0);
  return { v: Math.min(1.5, v), w: st.week, city: st.city };
}
/** Cansaço projetado em cada data, somando shows já marcados e os do rascunho. */
export function fatigueTrack(s: GameState, actId: string, draft: Stop[]): Map<Stop, number> {
  const c = c12(s);
  const all = [...c.shows.filter((x) => x.actId === actId && x.status === 'booked'), ...draft].sort((a, b) => a.week - b.week);
  let f = c.fat[actId];
  const out = new Map<Stop, number>();
  for (const st of all) { f = fatStep(f, st); out.set(st, f.v); }
  return out;
}

// ---------------------------------------------------------------- previsão

export interface Pred {
  demand: number; cap: number; att: [number, number, number]; pSell: number; price: number; house: number; fat: number; isNew: boolean;
  take: [number, number, number]; comm: number; prom: [number, number, number]; warn: L[]; ok: boolean; offer: number; ask: number;
}
function houseCost(s: GameState, st: Stop): number {
  const rent = money(s, VENUE_TIERS[st.tier].cost);
  return Math.round(rent * 1.25 + money(s, 150 * Math.pow(st.tier + 1, 1.7) * st.promo));
}
const price = (s: GameState, st: Stop): number => Math.round(money(s, TICKET[st.tier]) * st.pmult);
function settle(s: GameState, st: Stop, att: number): { artist: number; prom: number; gross: number } {
  const gross = att * price(s, st), house = houseCost(s, st), door = st.pct * Math.max(0, gross - house);
  const artist = Math.round(st.deal === 'guarantee' ? st.fee : st.deal === 'door' ? door : Math.max(st.fee, door));
  return { artist, gross, prom: Math.round(gross + att * money(s, 3 + st.tier * 1.5) - house - artist) };
}
export function demandOf(s: GameState, act: Act, st: Stop, fat = 0): number {
  let d = localDraw(s, act, st.city, st.week);
  const op = st.opener ? s.acts[st.opener] : undefined;
  if (op) {
    const sc = cityById[st.city]?.scenes ?? [];
    const compat = op.genre === act.genre ? 1 : sc.includes(op.genre) && sc.includes(act.genre) ? 0.7 : 0.35;
    d += localDraw(s, op, st.city, st.week) * compat * 0.3;
  }
  const isNew = isNewMarket(s, act.id, st.city);
  d *= 1 + st.promo * 0.1 * (isNew ? 1.6 : 1);
  d *= Math.pow(st.pmult, -0.9);
  d *= 0.8 + Math.min(0.2, Math.max(0, st.week - s.week) * 0.025);
  d *= 1 - 0.18 * Math.max(0, fat - 0.5);
  d *= clash17(s, act, st.city, st.week); // r17: concorrência na agenda
  return d;
}
/** Oferta do promotor local (modo agente): ~60% do lucro líquido esperado, corrigido pela relação. */
export function npcOffer(s: GameState, act: Act, st: Stop): number {
  const d = demandOf(s, act, st);
  const att = Math.min(tierCap(st.tier), d * 0.9);
  const net = Math.max(0, att * price(s, st) - houseCost(s, st));
  return Math.max(money(s, 100), Math.round(net * 0.6 * (0.85 + rel(s, st.city) / 330)));
}
export function askFee(s: GameState, act: Act, tier: number): number {
  return Math.round(money(s, 300 + act.fame * act.fame * 9) * (1 + tier * 0.25));
}
export function predict(s: GameState, role: Role, act: Act, st: Stop, fat: number, rate = 0.1): Pred {
  const d = demandOf(s, act, st, fat), cap = tierCap(st.tier);
  const at = (k: number) => Math.min(cap, Math.round(d * k));
  const att: [number, number, number] = [at(0.72), at(1), at(1.28)];
  const sd = 0.22, z = (Math.log(cap / Math.max(1, d))) / sd;
  const pSell = clamp(1 - 0.5 * (1 + erf(z / Math.SQRT2)), 0, 1);
  const T = att.map((a) => settle(s, st, a)), warn: L[] = [];
  const isNew = isNewMarket(s, act.id, st.city);
  if (d < cap * 0.35) warn.push(l('Casa grande demais para a força local: risco de sala vazia.', 'House too big for local strength: empty-room risk.'));
  if (d > cap * 1.4 && st.tier < Math.max(...tiersOpen(s))) warn.push(l('Sobra demanda: um porte maior ou segunda noite rende mais.', 'Excess demand: a bigger house or a second night pays more.'));
  if (fat > 0.9) warn.push(l('Artista exausto nesta data: público e desempenho caem, risco de cancelamento.', 'Exhausted act on this date: draw and performance drop, cancellation risk.'));
  if (isNew) warn.push(l('Mercado novo: público incerto, mas cada show constrói base local.', 'New market: uncertain draw, but every show builds a local base.'));
  const ok = !venueFree(s, st.city, st.tier, st.week) ? (warn.push(l('Casa ocupada nesta data.', 'Venue booked that date.')), false) : true;
  return { demand: d, cap, att, pSell, price: price(s, st), house: houseCost(s, st), fat, isNew, take: [T[0].artist, T[1].artist, T[2].artist], comm: role === 'agent' ? Math.round(T[1].artist * rate) : 0,
    prom: [T[0].prom, T[1].prom, T[2].prom], warn, ok, offer: npcOffer(s, act, st), ask: askFee(s, act, st.tier) };
}
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
export const defaultStop = (s: GameState, act: Act, city: string, week: number): Stop => {
  const tier = suggestTier(s, act, city), st: Stop = { city, week, tier, deal: 'guarantee', fee: 0, pct: 0.85, pmult: 1, promo: 1 };
  st.fee = npcOffer(s, act, st);
  return st;
};

// ---------------------------------------------------------------- marcar a rota

export const hasAgency = (s: GameState): Venture | undefined => ventures(s).list.find((v) => v.kind === 'booking');
type Venture = ReturnType<typeof ventures>['list'][number];
export const clientsOf = (s: GameState): Act[] => (hasAgency(s)?.clients ?? []).map((c) => s.acts[c.actId]).filter(activeAct);

export function openPromoter(s: GameState): L | null {
  const c = c12(s);
  if (c.promoter.on) return null;
  const cost = money(s, PROMOTER_LICENSE);
  if (s.player.cash < cost) return l('Sem caixa para a licença e as relações iniciais.', 'Not enough cash for the license and starting relations.');
  post(s, 'p12:license', -cost, 'business', 'Promotora de shows');
  c.promoter.on = true;
  remember(s, 'venture', l('O selo abre uma promotora de shows: agora o risco da bilheteria é seu.', 'The label opens a concert promotion arm: box-office risk is now yours.'));
  return null;
}

export function validate(s: GameState, role: Role, actId: string, stops: Stop[]): { reasons: L[][]; preds: Pred[]; fats: number[] } {
  const act = s.acts[actId], tr = fatigueTrack(s, actId, stops);
  const v = hasAgency(s), rate = v?.clients?.find((c) => c.actId === actId)?.rate ?? 0.1;
  const reasons: L[][] = [], preds: Pred[] = [], fats: number[] = [];
  stops.forEach((st) => {
    const r: L[] = [];
    const busy = actBusy(s, act, st.week, stops.filter((x) => x !== st));
    if (busy) r.push(busy);
    if (st.week < s.week + 2) r.push(l('Data muito próxima (mínimo 2 semanas).', 'Date too close (2 weeks minimum).'));
    if (!tiersOpen(s).includes(st.tier)) r.push(l('Esse porte de casa ainda não existe na época.', 'That venue size does not exist yet.'));
    const p = predict(s, role, act, st, tr.get(st) ?? 0, rate);
    if (!p.ok) r.push(l('Casa ocupada nesta data.', 'Venue booked that date.'));
    if (role === 'promoter') {
      const exp = p.take[1] * (st.deal === 'guarantee' ? 1 : 0.8);
      if (exp < 0.75 * p.ask) r.push(fmtL(l('O artista recusa: vale menos que o mínimo que pede (~{x}).', 'The act refuses: worth less than its minimum ask (~{x}).'), { x: fmtMoney(p.ask) }));
    }
    reasons.push(r); preds.push(p); fats.push(tr.get(st) ?? 0);
  });
  return { reasons, preds, fats };
}
const fmtMoney = (c: number): string => `${Math.round(c / 100).toLocaleString()}`;

/** Negocia a cláusula com o promotor local (modo agente). */
function negotiate(s: GameState, r: Rng, act: Act, st: Stop): { st: Stop; note: L } {
  const o = npcOffer(s, act, st), ask = st.ask ?? 1, rl = rel(s, st.city), out = { ...st };
  if (st.deal === 'door') { out.pct = rl >= 15 ? 0.85 : 0.8; return { st: out, note: l('Porta fechada.', 'Door deal agreed.') }; }
  if (st.deal === 'versus') {
    if (rl < 30) { out.deal = 'guarantee'; out.fee = Math.round(o * 0.9); return { st: out, note: l('O promotor não confia o bastante para "o maior dos dois": só cachê fixo, menor.', 'The promoter does not trust you enough for "the higher of two": flat fee only, lower.') }; }
    out.fee = Math.round(o * 0.7 * Math.max(1, ask)); out.pct = 0.8; return { st: out, note: l('Cachê menor com piso na porta.', 'Lower guarantee with a door floor.') };
  }
  if (ask <= 1) { out.fee = Math.round(o * ask); return { st: out, note: l('Aceito sem discussão.', 'Accepted outright.') }; }
  const p = clamp(0.8 - (ask - 1) * 2 + (rl - 30) / 200 + (isNewMarket(s, act.id, st.city) ? -0.1 : 0.05), 0.05, 0.95);
  if (r.chance(p)) { out.fee = Math.round(o * ask); return { st: out, note: l('O promotor topou o cachê pedido.', 'The promoter met your ask.') }; }
  c12(s).rel[st.city] = clamp(rel(s, st.city) - 2, 0, 100);
  out.fee = o; return { st: out, note: l('O promotor recusou o aumento; ficou a oferta original.', 'The promoter refused the raise; the original offer stands.') };
}
export const acceptChance = (s: GameState, st: Stop, actId: string): number => {
  if ((st.ask ?? 1) <= 1 || st.deal !== 'guarantee') return 1;
  return clamp(0.8 - ((st.ask ?? 1) - 1) * 2 + (rel(s, st.city) - 30) / 200 + (isNewMarket(s, actId, st.city) ? -0.1 : 0.05), 0.05, 0.95);
};

export function bookRoute(s: GameState, r: Rng, role: Role, actId: string, stops: Stop[]): { ok: boolean; text: L[] } {
  const c = c12(s), act = s.acts[actId];
  if (!activeAct(act) || !stops.length) return { ok: false, text: [l('Rota vazia.', 'Empty route.')] };
  if (role === 'agent' && !clientsOf(s).some((a) => a.id === actId)) return { ok: false, text: [l('Não é cliente da sua agência.', 'Not a client of your agency.')] };
  if (role === 'promoter' && !c.promoter.on) return { ok: false, text: [l('Abra a promotora primeiro.', 'Open the promotion arm first.')] };
  const v = validate(s, role, actId, stops), bad = v.reasons.flat();
  if (bad.length) return { ok: false, text: bad };
  const v0 = hasAgency(s), rate = v0?.clients?.find((x) => x.actId === actId)?.rate ?? 0.1, notes: L[] = [];
  const deposits = stops.reduce((t, st) => t + (role === 'promoter' ? houseCost(s, st) : 0), 0);
  if (role === 'promoter' && s.player.cash < deposits) return { ok: false, text: [l('Sem caixa para os depósitos das casas.', 'Not enough cash for venue deposits.')] };
  for (const st0 of stops) {
    let st = st0;
    if (role === 'agent') { const n = negotiate(s, r, act, st0); st = n.st; notes.push(fmtL(l('{c}: {n}', '{c}: {n}'), { c: cityById[st.city].name, n: n.note })); }
    const dep = role === 'promoter' ? houseCost(s, st) : 0;
    if (dep) post(s, `p12:dep:${actId}:${st.city}:${st.week}`, -dep, 'business', `Depósito: ${act.name}`);
    c.shows.push({ ...st, id: nextId(s, 'sh'), actId, by: role, vid: v0?.id, rate: role === 'agent' ? rate : 0, status: 'booked', deposit: dep });
  }
  notes.push(fmtL(l('{n} datas marcadas para {a}.', '{n} dates booked for {a}.'), { n: stops.length, a: act.name }));
  return { ok: true, text: notes };
}
export function cancelShow(s: GameState, id: string): L | null {
  const c = c12(s), sh = c.shows.find((x) => x.id === id);
  if (!sh || sh.status !== 'booked') return l('Inválido.', 'Invalid.');
  if (sh.week - s.week < 2) return l('Tarde demais para cancelar.', 'Too late to cancel.');
  sh.status = 'cancelled';
  if (sh.deposit) post(s, `p12:refund:${sh.id}`, Math.round(sh.deposit * 0.5), 'business', 'Depósito parcial devolvido');
  c.rel[sh.city] = clamp(rel(s, sh.city) - 3, 0, 100);
  return null;
}

// ---------------------------------------------------------------- liquidação

function resolve(s: GameState, r: Rng, sh: Show): void {
  const c = c12(s), act = s.acts[sh.actId];
  const key = `${sh.actId}:${sh.city}`;
  if (!activeAct(act)) { sh.status = 'cancelled'; return; }
  const fat = fatStep(c.fat[sh.actId], sh);
  c.fat[sh.actId] = fat;
  const why: L[] = [];
  const cancel = r.chance(0.02 + Math.max(0, fat.v - 0.8) * 0.25);
  let res: Result;
  if (cancel) {
    res = { att: 0, cap: tierCap(sh.tier), gross: 0, artist: 0, comm: 0, prom: -sh.deposit, cancelled: true, why: [l('O artista cancelou por exaustão/doença; a casa fica com o depósito.', 'The act cancelled from exhaustion/illness; the venue keeps the deposit.')] };
    c.rel[sh.city] = clamp(rel(s, sh.city) - 6, 0, 100);
    if (sh.by === 'agent') c.sat[sh.actId] = (c.sat[sh.actId] ?? 60) - 8;
    act.momentum = clamp(act.momentum - 2, 0, 100);
  } else {
    const d = demandOf(s, act, sh, fat.v) * Math.exp(r.normal(0, 0.2));
    const cap = tierCap(sh.tier), att = Math.max(0, Math.round(Math.min(cap, d)));
    const T = settle(s, sh, att), comm = sh.by === 'agent' ? Math.round(T.artist * sh.rate) : 0;
    const full = att / cap;
    res = { att, cap, gross: T.gross, artist: T.artist, comm, prom: T.prom, why };
    why.push(fmtL(l('Público {a} de {c} ({p}%). Força local estimada: {d}.', 'Crowd {a} of {c} ({p}%). Estimated local draw: {d}.'), { a: att, c: cap, p: Math.round(full * 100), d: Math.round(demandOf(s, act, sh)) }));
    if (isNewMarket(s, sh.actId, sh.city)) why.push(l('Mercado novo: o público presente vira base local para a próxima visita.', 'New market: this crowd becomes a local base for the next visit.'));
    if (fat.v > 0.7) why.push(l('Cansaço derrubou o desempenho.', 'Fatigue dragged the performance down.'));
    // força local: lotado cresce (escassez), vazio encolhe
    c.heat[key] = { v: full >= 0.95 ? cap * 1.15 : att, w: sh.week };
    act.fans.active += Math.round(att * (full >= 0.95 ? 0.05 : 0.03));
    act.fame = clamp(act.fame + (full >= 0.95 ? 0.25 : 0), 0, 100);
    s.flags[`played:${act.id}:${sh.city}`] = s.week;
    if (full >= 0.95) why.push(l('Lotou: sinal de que o próximo porte já cabe.', 'Sold out: the next size up now fits.'));
    if (sh.tier >= 2 && full < 0.35) {
      act.momentum = clamp(act.momentum - 2, 0, 100); act.fame = clamp(act.fame - 0.5, 0, 100);
      why.push(l('Casa grande vazia: a imprensa local comenta e o artista perde moral.', 'Big room, empty seats: local press notices and the act loses morale.'));
      remember(s, 'show', fmtL(l('{a} tocou para uma {t} vazia em {c}.', '{a} played to an empty {t} in {c}.'), { a: act.name, t: VENUE_TIERS[sh.tier].name, c: cityById[sh.city].name }));
    }
    // relação com o promotor local
    const loss = T.prom < -0.15 * houseCost(s, sh);
    if (sh.by === 'agent') {
      c.rel[sh.city] = clamp(rel(s, sh.city) + (T.prom > 0 ? 2.5 : loss ? -6 : -1), 0, 100);
      why.push(T.prom > 0 ? l('O promotor local lucrou: a relação com a cidade melhora.', 'The local promoter profited: relations with the city improve.') : l('O promotor local perdeu dinheiro: a relação azedou.', 'The local promoter lost money: relations soured.'));
    } else {
      c.promoter.rep = clamp(c.promoter.rep + (T.prom > 0 ? 1.5 : -1) + (full >= 0.95 ? 1 : 0), 0, 100);
      c.promoter.total += T.prom; c.promoter.n++;
      c.rel[sh.city] = clamp(rel(s, sh.city) + (T.prom > 0 ? 1.5 : 0), 0, 100);
    }
    const sat = sh.by === 'agent' ? c.sat : undefined;
    if (sat) {
      const fair = 0.6 * Math.max(0, T.gross - houseCost(s, sh));
      let dlt = (full >= 0.9 ? 3 : full < 0.4 ? -4 : 0) + (T.artist >= fair ? 1.5 : -1.5) - (fat.v > 1 ? 4 : 0);
      if (c12(s).promoter.on && T.artist < fair * 0.6) { dlt -= 4; why.push(l('Conflito de interesses: você é agente e promotor e o cliente saiu com pouco.', 'Conflict of interest: you are agent and promoter and the client got little.')); }
      sat[sh.actId] = clamp((sat[sh.actId] ?? 60) + dlt, 0, 100);
    }
  }
  sh.res = res; sh.status = 'played';
  if (sh.by === 'agent' && !cancel) {
    post(s, `p12:comm:${sh.id}`, res.comm, 'business', `Comissão: ${act.name}`);
    act.cash += Math.round(res.artist - res.comm);
    const v = ventures(s).list.find((x) => x.id === sh.vid); if (v) v.rep = clamp(v.rep + (res.att / res.cap >= 0.9 ? 1 : 0.2), 0, 100);
  } else if (sh.by === 'promoter') {
    if (!cancel) { post(s, `p12:rev:${sh.id}`, res.gross + res.att * money(s, 3 + sh.tier * 1.5) - res.artist, 'business', `Bilheteria: ${act.name}`); act.cash += res.artist; }
  }
  logit(s, fmtL(l('{a} em {c}: {p}% da casa, {r}.', '{a} in {c}: {p}% full, {r}.'), { a: act.name, c: cityById[sh.city].name, p: Math.round((res.att / res.cap) * 100), r: sh.by === 'promoter' ? `${res.prom >= 0 ? '+' : ''}${fmtMoney(res.prom)}` : `${fmtMoney(res.comm)}` }));
}

// ---------------------------------------------------------------- oferta arena x casa menor

export function buildOffer(s: GameState, r: Rng, v: Venture, act: Act): Offer12 | null {
  const open = tiersOpen(s);
  const arena = [...open].reverse().find((t) => t >= 2 && act.fame >= VENUE_TIERS[t].fameMin - 8);
  if (arena === undefined || arena < 3) return null;
  const city = r.pick(Object.keys(cityById).filter((c) => cityDemand(s, act, c) > 0));
  if (!city) return null;
  const week = s.week + 8 + r.int(0, 2), small = Math.max(1, arena - 1);
  const A: Stop = { city, week, tier: arena, deal: 'guarantee', fee: 0, pct: 0.85, pmult: 1, promo: 1 };
  // o promotor da arena paga com base na FAMA global (otimista), não na força local
  const loud = money(s, 800 + act.fame * act.fame * 14);
  A.fee = Math.round(Math.max(loud, houseCost(s, A) * 0.9));
  const mk = (w: number): Stop => ({ city, week: w, tier: small, deal: 'versus', fee: Math.round(money(s, 600 + act.fame * 20)), pct: 0.85, pmult: 1, promo: 1 });
  return { id: nextId(s, 'of'), actId: act.id, vid: v.id, until: s.week + 6, city, a: [A], b: [mk(week), mk(week + 0)] };
}
export function acceptOffer(s: GameState, r: Rng, id: string, pick: 'a' | 'b' | 'no'): { ok: boolean; text: L[] } {
  const c = c12(s), o = c.offers.find((x) => x.id === id);
  if (!o) return { ok: false, text: [l('Oferta expirada.', 'Offer expired.')] };
  const act = s.acts[o.actId], v = hasAgency(s);
  if (pick === 'no') { c.offers = c.offers.filter((x) => x !== o); c.rel[o.city] = clamp(rel(s, o.city) - 1, 0, 100); return { ok: true, text: [l('Oferta recusada.', 'Offer declined.')] }; }
  const stops = (pick === 'a' ? o.a : o.b).map((x) => ({ ...x }));
  const v2 = validate(s, 'agent', o.actId, stops), bad = v2.reasons.flat();
  if (bad.length) return { ok: false, text: bad };
  const rate = v?.clients?.find((x) => x.actId === o.actId)?.rate ?? 0.1;
  for (const st of stops) c.shows.push({ ...st, id: nextId(s, 'sh'), actId: o.actId, by: 'agent', vid: v?.id, rate, status: 'booked', deposit: 0 });
  c.offers = c.offers.filter((x) => x !== o);
  logit(s, fmtL(l('{a} fecha {n} em {c}.', '{a} takes {n} in {c}.'), { a: act.name, n: pick === 'a' ? VENUE_TIERS[stops[0].tier].name : l('duas noites', 'two nights'), c: cityById[o.city].name }));
  return { ok: true, text: [l('Oferta aceita e datas na agenda.', 'Offer accepted and dates on the calendar.')] };
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'tour12', (s) => {
  const c = c12(s), r = Rng.fromSeed(`${s.config.seed}:tour12:${s.year}:${s.month}`);
  const due = c.shows.filter((x) => x.status === 'booked' && x.week <= s.week).sort((a, b) => a.week - b.week);
  for (const sh of due) resolve(s, r, sh);
  c.shows = c.shows.filter((x) => x.status === 'booked' || s.week - x.week < 80);
  c.offers = c.offers.filter((o) => o.until > s.week);
  for (const k of Object.keys(c.rel)) c.rel[k] += (30 - c.rel[k]) * 0.01;
  const v = hasAgency(s);
  if (v?.clients) {
    for (const cl of [...v.clients]) {
      const a = s.acts[cl.actId];
      c.sat[cl.actId] = clamp((c.sat[cl.actId] ?? 60) - 0.4 + (due.some((x) => x.actId === cl.actId && x.status === 'played') ? 0 : -0.6), 0, 100);
      if (c.sat[cl.actId] < 22 && r.chance(0.35) && a) {
        v.clients = v.clients.filter((x) => x !== cl); v.rep = clamp(v.rep - 4, 0, 100);
        notify(s, fmtL(l('{a} deixou a sua agência: faltaram datas boas e confiança.', '{a} left your agency: not enough good dates and trust.'), { a: a.name }), 'bad');
      }
    }
    if (!c.offers.length && r.chance(0.3)) {
      const pool = v.clients.map((x) => s.acts[x.actId]).filter(activeAct).filter((a) => a.fame >= 45);
      if (pool.length) { const o = buildOffer(s, r, v, r.pick(pool)); if (o && !c.offers.some((x) => x.actId === o.actId)) { c.offers.push(o); notify(s, fmtL(l('Oferta de show para {a}: arena com cachê alto ou duas noites em casa menor.', 'Show offer for {a}: arena with a big guarantee or two nights in a smaller house.'), { a: s.acts[o.actId].name }), 'info'); } }
    }
  }
});

// Rodada 16 — agentes de shows e promotores: contratar do mercado de profissionais e DELEGAR com ordens permanentes.
// Cada ordem roda uma vez por mês, dentro da capacidade do profissional (3 ordens cada, capacity14); o resultado é
// explicado (o que foi marcado/gasto, por quê). A qualidade vem de habilidade + atributos (persona13) + notoriedade;
// o profissional erra (dupla marcação, casa grande demais, campanha jogada fora) e pode ser roubado por selos rivais.
// Aleatoriedade: gerador próprio (semente + ano + mês).

import { Rng, clamp } from '../../core/rng';
import { CITIES, cityById, l, type L, type MarketId } from '../../data/world';
import { VENUE_TIERS } from '../../data/rules';
import { registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState, StaffMember } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember } from '../util';
import { genStaff } from '../worldgen';
import { per13, staffAdj13 } from './persona13';
import { c12, clientsOf, defaultStop, hasAgency, localDraw, npcOffer, rel, suggestTier, tierCap, tiersOpen, validate, type Show } from './tour12';
import { ask12, offer12, stagesOf, f12, wantTime } from './fest12';
import { addHype } from './hype12';
import { liveOf } from './live/state';
import { notoTier } from './notoriety14';

export type OrderKind = 'tour' | 'fees' | 'festival' | 'promo' | 'radio' | 'labelnight';
export interface Order16 { id: string; staffId: string; kind: OrderKind; actId?: string; market: MarketId | ''; tier: number; floor: number; budget: number; per: number; on: boolean; since: number }
export interface Log16 { w: number; staffId: string; orderId?: string; actId?: string; kind: OrderKind | 'sys'; t: L; tone: 'good' | 'bad' | 'info' }
export interface Pend16 { staffId: string; lb: string; raise: number; until: number }
export interface D16 { orders: Order16[]; log: Log16[]; tracked: { show: string; order: string; staff: string }[]; pend: Pend16[]; seen: Record<string, number>; lost: number }
declare module '../ext4' { interface Ext4 { deleg16: D16 } }
const fresh = (): D16 => ({ orders: [], log: [], tracked: [], pend: [], seen: {}, lost: 0 });
registerExt4('deleg16', fresh);
export const d16 = (s: GameState): D16 => {
  const x = s.x4 as unknown as { deleg16?: D16 };
  x.deleg16 ??= fresh();
  return x.deleg16;
};

export const DELEG_ROLES = ['booking_agent', 'promoter'] as const;
export const ORDER_CAP = 3;
export const KINDS: Record<OrderKind, { role: 'booking_agent' | 'promoter'; name: L; desc: L }> = {
  tour: { role: 'booking_agent', name: l('Marcar turnê', 'Book a tour'), desc: l('Marca shows para um ato no porte e na região alvo, respeitando o piso de cachê.', 'Books shows for an act at the target size and region, respecting the fee floor.') },
  fees: { role: 'booking_agent', name: l('Negociar cachês', 'Negotiate fees'), desc: l('Tenta subir o cachê dos shows já marcados (arrisca irritar o promotor local).', 'Tries to raise the fee on shows already booked (risks upsetting the local promoter).') },
  festival: { role: 'booking_agent', name: l('Preencher festival', 'Fill festival slots'), desc: l('Contrata atrações para os seus festivais, até o teto de cachê por atração.', 'Signs acts for your own festivals, up to a per-act fee ceiling.') },
  promo: { role: 'promoter', name: l('Divulgar shows', 'Promote shows'), desc: l('Gasta o orçamento em divulgação dos próximos shows na região (mais público).', 'Spends the budget promoting upcoming shows in the region (bigger crowds).') },
  radio: { role: 'promoter', name: l('Rádio e clubes', 'Radio and club promo'), desc: l('Trabalha o ato em rádios/clubes: sobe o hype (decai com o tempo).', 'Works the act at radio/clubs: raises hype (decays over time).') },
  labelnight: { role: 'promoter', name: l('Noite do selo', 'Label night'), desc: l('Organiza uma noite do selo com o ato em destaque: custa o orçamento, pode se pagar e dá visibilidade.', 'Throws a label night featuring the act: costs the budget, may pay for itself and builds visibility.') },
};
export const kindsOf = (role: string): OrderKind[] => (Object.keys(KINDS) as OrderKind[]).filter((k) => KINDS[k].role === role);
const usd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const cat = (a: L, b: L): L => l(a.pt + b.pt, a.en + b.en);
const cityN = (id: string): L => cityById[id]?.name ?? l(id, id);
const activeAct = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && a.members.length > 0;

/** Atos que podem receber ordens: elenco do selo e clientes da agência. */
export function eligibleActs(s: GameState): Act[] {
  const ids = new Set([...playerActs(s), ...clientsOf(s).map((a) => a.id)]);
  return [...ids].map((id) => s.acts[id]).filter(activeAct);
}
export const staffOf = (s: GameState, id: string): StaffMember | undefined => s.player.staff.find((x) => x.id === id);
export const delegates = (s: GameState): StaffMember[] => s.player.staff.filter((x) => (DELEG_ROLES as readonly string[]).includes(x.role));
export const ordersOf = (s: GameState, staffId: string): Order16[] => d16(s).orders.filter((o) => o.staffId === staffId);
/** Quem cuida do ato (agente/promotor com ordem ativa para ele). */
export function handlersOf(s: GameState, actId: string): { st: StaffMember; kinds: OrderKind[] }[] {
  const m = new Map<string, OrderKind[]>();
  for (const o of d16(s).orders) if (o.on && (o.actId === actId || (!o.actId && (o.kind === 'fees' || o.kind === 'promo')))) { if (!staffOf(s, o.staffId)) continue; (m.get(o.staffId) ?? m.set(o.staffId, []).get(o.staffId)!).push(o.kind); }
  return [...m.entries()].map(([id, kinds]) => ({ st: staffOf(s, id)!, kinds }));
}

function logD(s: GameState, staffId: string, o: Order16 | undefined, kind: OrderKind | 'sys', t: L, tone: 'good' | 'bad' | 'info' = 'info', actId?: string): void {
  const d = d16(s);
  d.log.unshift({ w: s.week, staffId, orderId: o?.id, actId: actId ?? o?.actId, kind, t, tone });
  if (d.log.length > 80) d.log.length = 80;
}

// ---------------------------------------------------------------- ordens

export function addOrder(s: GameState, staffId: string, kind: OrderKind, o: Partial<Pick<Order16, 'actId' | 'market' | 'tier' | 'floor' | 'budget' | 'per'>>): L | null {
  const st = staffOf(s, staffId);
  if (!st || KINDS[kind].role !== st.role) return l('Essa função não executa essa ordem.', 'That role does not run this order.');
  const needAct = kind !== 'fees' && kind !== 'festival' && kind !== 'promo';
  if (needAct && !o.actId) return l('Escolha o ato.', 'Pick the act.');
  if (kind === 'tour' && o.actId && !eligibleActs(s).some((a) => a.id === o.actId)) return l('Ato fora do seu elenco/agência.', 'Act is not on your roster/agency.');
  if (kind === 'festival' && !liveOf(s).fests.length) return l('Você não tem festival próprio para preencher.', 'You have no festival of your own to fill.');
  if (ordersOf(s, staffId).length >= ORDER_CAP + 2) return l('Ordens demais para uma pessoa: remova alguma.', 'Too many orders for one person: remove one.');
  const d = d16(s);
  d.orders.push({ id: nextId(s, 'od'), staffId, kind, actId: o.actId, market: o.market ?? '', tier: o.tier ?? -1, floor: Math.max(0, o.floor ?? 0), budget: Math.max(0, o.budget ?? 0), per: clamp(o.per ?? 1, 1, 3), on: true, since: s.week });
  return null;
}
export function removeOrder(s: GameState, id: string): void { const d = d16(s); d.orders = d.orders.filter((o) => o.id !== id); }
export function toggleOrder(s: GameState, id: string): void { const o = d16(s).orders.find((x) => x.id === id); if (o) o.on = !o.on; }

// ---------------------------------------------------------------- qualidade

export interface Qual { q: number; err: number; why: L[] }
export function quality(s: GameState, st: StaffMember): Qual {
  const P = per13(s, `s:${st.id}`);
  const adj = staffAdj13(s, st).v;
  const agent = st.role === 'booking_agent';
  const attr = P ? (agent ? P.attrs.neg * 0.6 + P.attrs.cha * 0.4 : P.attrs.cha * 0.6 + P.attrs.img * 0.4) : 50;
  let notoB = 0;
  try { notoB = notoTier(s, agent ? 'booking' : 'label') * 0.02; } catch { notoB = 0; }
  const q = clamp((st.skill + adj) / 100 + (attr - 50) / 250 + notoB, 0.1, 1.1);
  const why: L[] = [fmtL(l('habilidade {k}{a}', 'skill {k}{a}'), { k: st.skill, a: adj ? ` (${adj > 0 ? '+' : ''}${adj})` : '' }), fmtL(l('{n} {v}', '{n} {v}'), { n: agent ? l('negociação/carisma', 'negotiation/charisma') : l('carisma/imagem', 'charisma/image'), v: Math.round(attr) })];
  if (notoB) why.push(fmtL(l('notoriedade do selo +{n}%', 'label notoriety +{n}%'), { n: Math.round(notoB * 100) }));
  if (st.trait === 'lazy') { why.push(l('preguiçoso(a)', 'lazy')); return { q: q * 0.92, err: clamp(0.4 - q * 0.33, 0.04, 0.34), why }; }
  if (st.trait === 'perfectionist') why.push(l('perfeccionista (erra menos)', 'perfectionist (fewer mistakes)'));
  return { q, err: clamp((0.4 - q * 0.33) * (st.trait === 'perfectionist' ? 0.7 : 1), 0.03, 0.32), why };
}
export const qLabel = (q: number): L => (q >= 0.8 ? l('excelente', 'excellent') : q >= 0.6 ? l('bom', 'good') : q >= 0.4 ? l('regular', 'average') : l('fraco', 'weak'));

// ---------------------------------------------------------------- execução

interface Ctx { s: GameState; r: Rng; st: StaffMember; o: Order16; q: Qual }
const say = (c: Ctx, t: L, tone: 'good' | 'bad' | 'info' = 'info', actId?: string) => logD(c.s, c.st.id, c.o, c.o.kind, t, tone, actId);
const pay = (c: Ctx, usdN: number, memo: string): boolean => {
  const amt = money(c.s, Math.round(usdN * 100));
  if (c.s.player.cash < amt) return false;
  post(c.s, `d16:${c.o.id}:${c.s.year}:${c.s.month}:${memo.length}`, -amt, 'business', memo);
  return true;
};

function runTour(c: Ctx): void {
  const { s, r, o, q } = c;
  const act = s.acts[o.actId ?? ''];
  if (!activeAct(act) || !eligibleActs(s).some((a) => a.id === act.id)) return say(c, l('O ato da ordem não está mais disponível.', 'The order\'s act is no longer available.'), 'bad');
  const cs = CITIES.filter((x) => !o.market || x.market === o.market);
  if (!cs.length) return;
  const used = new Set<string>();
  let booked = 0;
  for (let i = 0; i < o.per; i++) {
    const ranked = cs.filter((x) => !used.has(x.id)).map((x) => ({ x, v: localDraw(s, act, x.id) * (0.8 + r.next() * 0.4) })).sort((a, b) => b.v - a.v);
    const pick = ranked.slice(0, Math.max(2, Math.round(5 - q.q * 3)))[Math.floor(r.next() * Math.min(ranked.length, Math.max(2, Math.round(5 - q.q * 3))))];
    if (!pick) break;
    const city = pick.x.id;
    used.add(city);
    const open = tiersOpen(s), sug = suggestTier(s, act, city);
    let tier = o.tier >= 0 && open.includes(o.tier) ? o.tier : sug;
    const notes: L[] = [];
    if (tier > sug && q.q >= 0.6) { notes.push(fmtL(l('segurei o porte em {t}: a força local de {c} só sustenta isso', 'held the size at {t}: {c} local draw only supports that'), { t: VENUE_TIERS[sug].name, c: cityN(city) })); tier = sug; }
    else if (tier > sug) notes.push(l('aceitei o porte pedido mesmo acima da força local (risco de sala vazia)', 'took the requested size even above local draw (empty-room risk)'));
    if (r.chance(q.err * 0.8) && open.includes(Math.min(Math.max(...open), tier + 1)) && tier + 1 > sug) { tier = Math.min(Math.max(...open), tier + 1); notes.push(l('ERRO: contratou uma casa maior do que o público aguenta', 'MISTAKE: booked a venue bigger than the crowd can fill')); }
    const floorN = money(s, o.floor * 100);
    let done = false;
    for (let w = s.week + 3; w <= s.week + 12 && !done; w++) {
      if (q.q >= 0.5 && c12(s).shows.some((x) => x.actId === act.id && x.status === 'booked' && Math.abs(x.week - w) < 2)) continue;
      const st0 = defaultStop(s, act, city, w);
      const st = { ...st0, tier };
      st.fee = Math.round(npcOffer(s, act, st) * (0.85 + q.q * 0.3));
      const v = validate(s, 'agent', act.id, [st]);
      if (v.reasons[0].length) continue;
      if (st.fee < floorN) { say(c, fmtL(l('{c}: recusei a data — a oferta de {f} fica abaixo do piso de {p}.', '{c}: passed — the {f} offer is under the {p} floor.'), { c: cityN(city), f: usd(st.fee), p: usd(floorN) }), 'info', act.id); done = true; break; }
      const p = v.preds[0];
      const sh: Show = { ...st, id: nextId(s, 'sh'), actId: act.id, by: 'agent', vid: hasAgency(s)?.id, rate: 0.1, status: 'booked', deposit: 0 };
      c12(s).shows.push(sh);
      d16(s).tracked.push({ show: sh.id, order: o.id, staff: c.st.id });
      booked++; done = true;
      const nt: L = notes.reduce<L>((acc, n) => cat(acc, l(` ${n.pt}.`, ` ${n.en}.`)), l('', ''));
      say(c, cat(fmtL(l('Marcou {a} em {c} ({t}, semana {w}): cachê {f}, público esperado ~{x} de {k} ({p}% de chance de lotar).', 'Booked {a} in {c} ({t}, week {w}): fee {f}, expected crowd ~{x} of {k} ({p}% to sell out).'), { a: act.name, c: cityN(city), t: VENUE_TIERS[tier].name, w, f: usd(st.fee), x: p.att[1], k: tierCap(tier), p: Math.round(p.pSell * 100) }), nt), notes.some((n) => n.pt.startsWith('ERRO')) ? 'bad' : 'good', act.id);
      // erro: dupla marcação na mesma semana — desfaz uma e paga a conta
      if (r.chance(q.err * 0.7)) {
        const alt = cs.find((x) => x.id !== city && !used.has(x.id));
        if (alt) {
          const fine = money(s, 15000);
          post(s, `d16:dbl:${sh.id}`, -fine, 'business', 'Multa: dupla marcação');
          c12(s).rel[alt.id] = clamp(rel(s, alt.id) - 5, 0, 100);
          say(c, fmtL(l('ERRO: {n} marcou {c} na mesma semana por engano e teve de desmarcar: multa de {f} e relação com a cidade −5.', 'MISTAKE: {n} double-booked {c} the same week and had to cancel: {f} fine and city relation −5.'), { n: c.st.name, c: cityN(alt.id), f: usd(fine) }), 'bad', act.id);
        }
      }
    }
    if (!done) say(c, fmtL(l('{c}: sem data livre nas próximas semanas (casas ocupadas ou agenda do ato cheia).', '{c}: no free date in the coming weeks (venues taken or the act\'s calendar full).'), { c: cityN(city) }), 'info', act.id);
  }
  if (!booked) logD(s, c.st.id, o, 'tour', l('Nenhum show novo este mês para esta ordem.', 'No new shows this month for this order.'), 'info', act.id);
}

function runFees(c: Ctx): void {
  const { s, r, o, q } = c;
  const d = d16(s), floorN = money(s, o.floor * 100);
  const mineAct = (id: string) => s.acts[id]?.owner === 'player' || clientsOf(s).some((a) => a.id === id);
  const list = c12(s).shows.filter((x) => x.status === 'booked' && x.by === 'agent' && x.deal === 'guarantee' && x.week - s.week >= 3 && !d.seen[x.id] && (!o.actId || x.actId === o.actId) && mineAct(x.actId))
    .sort((a, b) => a.fee - b.fee).slice(0, o.per);
  if (!list.length) return say(c, l('Nenhum show marcado e ainda negociável (precisa de 3+ semanas).', 'No booked show left to negotiate (needs 3+ weeks).'));
  for (const sh of list) {
    const act = s.acts[sh.actId];
    d.seen[sh.id] = s.week;
    const aim = Math.max(floorN, Math.round(sh.fee * (1.1 + q.q * 0.15)));
    const cap = npcOffer(s, act, sh) * 1.7;
    const p = clamp(0.25 + q.q * 0.45 + (rel(s, sh.city) - 30) / 300 - (aim / Math.max(1, sh.fee) - 1.15), 0.05, 0.9);
    if (aim > cap) { say(c, fmtL(l('{a} em {c}: o piso de {p} é irreal para o público ({f} hoje); nem tentou.', '{a} in {c}: the {p} floor is unrealistic for the crowd ({f} now); did not try.'), { a: act.name, c: cityN(sh.city), p: usd(aim), f: usd(sh.fee) }), 'info', act.id); continue; }
    if (r.chance(q.err * 0.4)) {
      sh.status = 'cancelled'; c12(s).rel[sh.city] = clamp(rel(s, sh.city) - 4, 0, 100);
      say(c, fmtL(l('ERRO: {n} apertou demais o promotor de {c} pelo show de {a} e ele desistiu. Show cancelado, relação −4.', 'MISTAKE: {n} pushed {c}\'s promoter too hard over {a}\'s show and he walked. Show cancelled, relation −4.'), { n: c.st.name, c: cityN(sh.city), a: act.name }), 'bad', act.id); continue;
    }
    if (r.chance(p)) { const old = sh.fee; sh.fee = aim; say(c, fmtL(l('{a} em {c}: cachê de {o} para {n} (+{p}%).', '{a} in {c}: fee {o} to {n} (+{p}%).'), { a: act.name, c: cityN(sh.city), o: usd(old), n: usd(aim), p: Math.round((aim / Math.max(1, old) - 1) * 100) }), 'good', act.id); }
    else { c12(s).rel[sh.city] = clamp(rel(s, sh.city) - 2, 0, 100); say(c, fmtL(l('{a} em {c}: o promotor recusou subir de {o}; relação −2 (chance era {p}%).', '{a} in {c}: the promoter refused to move off {o}; relation −2 (odds were {p}%).'), { a: act.name, c: cityN(sh.city), o: usd(sh.fee), p: Math.round(p * 100) }), 'bad', act.id); }
  }
}

function runFestival(c: Ctx): void {
  const { s, r, o, q } = c;
  const fests = liveOf(s).fests.filter((f) => (f.nextYear * 12 + f.month) - (s.year * 12 + s.month) <= 12);
  if (!fests.length) return say(c, l('Sem festival próprio com edição nos próximos 12 meses.', 'No own festival with an edition in the next 12 months.'));
  const f = fests.sort((a, b) => (a.nextYear * 12 + a.month) - (b.nextYear * 12 + b.month))[0];
  const x = f12(s, f), cap = o.budget;
  let signed = 0;
  const pool = Object.values(s.acts).filter((a) => activeAct(a) && a.owner !== 'player' && a.fame >= (o.tier >= 0 ? o.tier * 15 : 10) && !f.lineup.some((y) => y.actId === a.id) && !x.deals[a.id]).sort((a, b) => b.fame - a.fame + (r.next() - 0.5) * 20);
  for (const a of pool) {
    if (signed >= o.per) break;
    const want = wantTime(a);
    let slot: { stage: number; time: number } | null = null;
    for (let t = want; t >= 0 && !slot; t--) for (let st = 0; st < stagesOf(f) && !slot; st++) if (!Object.values(x.deals).some((d) => d.stage === st && d.time === t)) slot = { stage: st, time: t };
    if (!slot) { say(c, fmtL(l('{f}: sem horário livre nos palcos.', '{f}: no free slot on the stages.'), { f: f.name })); break; }
    const k = ask12(s, f, a, { time: slot.time, len: 60, excl: false });
    if (k.refuse) continue;
    const feeReal = Math.round(money(s, k.fee) / 100);
    if (cap && feeReal > cap) continue;
    const over = r.chance(q.err * 0.6);
    const res = offer12(s, f.id, a.id, { ...slot, len: 60, excl: false, fee: over ? Math.round(k.fee * 1.18) : k.fee });
    if (res.res === 'yes') {
      signed++;
      const paid = usd(money(s, over ? k.fee * 1.18 : k.fee));
      const base = fmtL(l('{f}: fechou {a} (fama {m}) por {p}.', '{f}: signed {a} (fame {m}) for {p}.'), { f: f.name, a: a.name, m: Math.round(a.fame), p: paid });
      say(c, over ? cat(base, l(' ERRO: pagou 18% acima do pedido por pressa.', ' MISTAKE: overpaid 18% over the ask in a rush.')) : base, over ? 'bad' : 'good', a.id);
    }
  }
  if (!signed) say(c, fmtL(l('{f}: ninguém serviu — sem atração dentro do teto de {c} por atração (ou o festival não tem prestígio).', '{f}: no one fit — no act under the {c} per-act ceiling (or the festival lacks prestige).'), { f: f.name, c: cap ? usd(cap * 100) : '—' }));
}

function runPromo(c: Ctx): void {
  const { s, r, o, q } = c;
  const shows = c12(s).shows.filter((x) => x.status === 'booked' && x.week - s.week >= 2 && x.promo < 3 && (!o.actId || x.actId === o.actId) && (!o.market || cityById[x.city]?.market === o.market) && eligibleActs(s).some((a) => a.id === x.actId)).sort((a, b) => a.week - b.week);
  if (!shows.length) return say(c, l('Nenhum show a promover na região: nada gasto.', 'No show to promote in the region: nothing spent.'));
  let spent = 0;
  for (const sh of shows.slice(0, o.per + 1)) {
    const step = Math.round(60 * Math.pow(sh.tier + 1, 1.5));
    if (o.budget && spent + step > o.budget) { say(c, fmtL(l('Orçamento de {b} esgotado; faltaram shows.', 'Budget of {b} used up; shows left out.'), { b: usd(o.budget * 100) })); break; }
    if (!pay(c, step, `Divulgação: ${s.acts[sh.actId]?.name}`)) { say(c, l('Sem caixa para a divulgação.', 'No cash for the promo.'), 'bad'); break; }
    spent += step;
    const act = s.acts[sh.actId];
    if (r.chance(q.err * 0.8)) { say(c, fmtL(l('ERRO: a campanha de {a} em {c} foi pro público errado ({s} gastos, sem efeito).', 'MISTAKE: the {a} campaign in {c} hit the wrong audience ({s} spent, no effect).'), { a: act?.name ?? '', c: cityN(sh.city), s: usd(money(s, step * 100)) }), 'bad', sh.actId); continue; }
    sh.promo += 1;
    say(c, fmtL(l('Divulgou {a} em {c} (semana {w}): nível de promo {p}, custo {s}. Mais público esperado (cada nível ≈ +10%).', 'Promoted {a} in {c} (week {w}): promo level {p}, cost {s}. Bigger expected crowd (each level ≈ +10%).'), { a: act?.name ?? '', c: cityN(sh.city), w: sh.week, p: sh.promo, s: usd(money(s, step * 100)) }), 'good', sh.actId);
  }
}

function runRadio(c: Ctx): void {
  const { s, r, o, q } = c;
  const act = s.acts[o.actId ?? ''];
  if (!activeAct(act)) return say(c, l('O ato da ordem não está mais disponível.', 'The order\'s act is no longer available.'), 'bad');
  const cost = Math.max(100, o.budget);
  const bad = r.chance(q.err);
  const real = bad ? cost * 1.5 : cost;
  if (!pay(c, real, `Rádio e clubes: ${act.name}`)) return say(c, l('Sem caixa para a rodada de rádio/clubes.', 'No cash for the radio/club round.'), 'bad');
  const v = clamp(1.5 * q.q * Math.sqrt(cost / 200) * (bad ? 0.3 : 1), 0, 8);
  addHype(s, `a:${act.id}`, 'deleg16:radio', l('Rádio e clubes (promotor)', 'Radio and clubs (promoter)'), v);
  act.fame = clamp(act.fame + 0.04 * q.q, 0, 100);
  say(c, bad ? fmtL(l('ERRO: {a} ficou fora da playlist e a rodada saiu {x}% mais cara: hype +{v} só.', 'MISTAKE: {a} missed the playlist and the round cost {x}% more: hype +{v} only.'), { a: act.name, x: 50, v: v.toFixed(1) }) : fmtL(l('Rodada de rádio/clubes para {a}: {c} gastos, hype +{v}.', 'Radio/club round for {a}: {c} spent, hype +{v}.'), { a: act.name, c: usd(money(s, real * 100)), v: v.toFixed(1) }), bad ? 'bad' : 'good', act.id);
}

function runNight(c: Ctx): void {
  const { s, r, o, q } = c;
  const act = s.acts[o.actId ?? ''];
  if (!activeAct(act)) return say(c, l('O ato da ordem não está mais disponível.', 'The order\'s act is no longer available.'), 'bad');
  const cost = Math.max(200, o.budget);
  if (s.player.cash < money(s, cost * 100) * 2) return say(c, l('Noite do selo adiada: o caixa não cobre o orçamento com folga.', 'Label night postponed: cash does not cover the budget with margin.'));
  if (!pay(c, cost, `Noite do selo: ${act.name}`)) return;
  const bad = r.chance(q.err * 0.7);
  const att = Math.round((60 + act.fame * 7) * (0.6 + q.q * 0.6) * (0.75 + r.next() * 0.5) * (bad ? 0.45 : 1));
  const rev = Math.round(att * 9 * (1 + Math.min(1, cost / 2000)));
  post(s, `d16:night:${c.o.id}:${s.year}:${s.month}`, money(s, rev * 100), 'business', `Noite do selo: bilheteria`);
  act.fans.active += Math.round(att * 0.06);
  addHype(s, `a:${act.id}`, 'deleg16:night', l('Noite do selo', 'Label night'), bad ? 0.5 : 2.5 * q.q);
  const net = rev - cost;
  const base = fmtL(l('Noite do selo com {a}: {x} pessoas, bilheteria {r} para {k} de custo ({n}).', 'Label night with {a}: {x} people, gate {r} against {k} cost ({n}).'), { a: act.name, x: att, r: usd(money(s, rev * 100)), k: usd(money(s, cost * 100)), n: `${net >= 0 ? '+' : ''}${usd(money(s, net * 100))}` });
  say(c, bad ? cat(base, l(' ERRO: bateu com outra festa na cidade.', ' MISTAKE: clashed with another party in town.')) : base, bad || net < 0 ? 'bad' : 'good', act.id);
}

const RUN: Record<OrderKind, (c: Ctx) => void> = { tour: runTour, fees: runFees, festival: runFestival, promo: runPromo, radio: runRadio, labelnight: runNight };

/** Executa as ordens de um profissional dentro da capacidade (uma vez por mês). */
export function runStaff(s: GameState, r: Rng, st: StaffMember): void {
  const d = d16(s);
  const mine = d.orders.filter((o) => o.staffId === st.id && o.on);
  const q = quality(s, st);
  mine.forEach((o, i) => {
    if (i >= ORDER_CAP) { logD(s, st.id, o, o.kind, fmtL(l('{n} não deu conta: já tem {c} ordens no mês. Esta ficou parada (contrate mais gente ou pause outra).', '{n} could not cope: already {c} orders this month. This one sat idle (hire more or pause another).'), { n: st.name, c: ORDER_CAP }), 'bad'); return; }
    RUN[o.kind]({ s, r, st, o, q });
  });
}

/** Relata o que aconteceu com os shows marcados pelos agentes (público, cachê, por quê). */
function reportPlayed(s: GameState): void {
  const d = d16(s), c = c12(s);
  d.tracked = d.tracked.filter((t) => {
    const sh = c.shows.find((x) => x.id === t.show);
    if (!sh) return false;
    const o = d.orders.find((x) => x.id === t.order);
    const act = s.acts[sh.actId];
    if (sh.status === 'cancelled') { logD(s, t.staff, o, 'tour', fmtL(l('O show de {a} em {c} foi cancelado.', 'The {a} show in {c} was cancelled.'), { a: act?.name ?? '', c: cityN(sh.city) }), 'bad', sh.actId); return false; }
    if (sh.status !== 'played' || !sh.res) return true;
    const res = sh.res, full = res.cap ? Math.round((res.att / res.cap) * 100) : 0;
    logD(s, t.staff, o, 'tour', fmtL(l('Resultado — {a} em {c}: {x} de {k} ({p}% da casa), cachê pago {f}, sua comissão {m}. {w}', 'Result — {a} in {c}: {x} of {k} ({p}% full), fee paid {f}, your cut {m}. {w}'), { a: act?.name ?? '', c: cityN(sh.city), x: res.att, k: res.cap, p: full, f: usd(res.artist), m: usd(res.comm), w: res.why[0] ?? l('', '') }), res.cancelled || full < 35 ? 'bad' : 'good', sh.actId);
    return false;
  });
}

// ---------------------------------------------------------------- mercado e rivais

const ERA_NAMES: { from: number; to: number; role: 'booking_agent' | 'promoter'; n: string }[] = [
  { from: 1935, to: 1965, role: 'booking_agent', n: 'Sol Weissman' }, { from: 1935, to: 1965, role: 'booking_agent', n: 'Harry Lombardi' }, { from: 1945, to: 1975, role: 'booking_agent', n: 'Irving Kessler' },
  { from: 1935, to: 1965, role: 'promoter', n: 'Morris Feldstein' }, { from: 1945, to: 1975, role: 'promoter', n: 'Big Eddie Marlowe' }, { from: 1950, to: 1980, role: 'promoter', n: 'Carlos Villa Nova' },
  { from: 1960, to: 1990, role: 'booking_agent', n: 'Lenny Sachs' }, { from: 1965, to: 2000, role: 'booking_agent', n: 'Doris McAllister' }, { from: 1970, to: 2005, role: 'promoter', n: 'Frank Delmonico' },
  { from: 1970, to: 2000, role: 'promoter', n: 'Wanda Pritchard' }, { from: 1985, to: 2015, role: 'booking_agent', n: 'Marcos Teixeira' }, { from: 1990, to: 2030, role: 'booking_agent', n: 'Priya Ramanathan' },
  { from: 1990, to: 2030, role: 'promoter', n: 'Jonas Albrecht' }, { from: 1995, to: 2030, role: 'promoter', n: 'Luana Cavalcanti' }, { from: 2005, to: 2040, role: 'booking_agent', n: 'Tobias Nakamura' }, { from: 2005, to: 2040, role: 'promoter', n: 'Zoe Hargreaves' },
];

function topUp(s: GameState, r: Rng): void {
  if (s.year < 1935) return;
  const want: ['booking_agent' | 'promoter', number][] = [['booking_agent', 2], ['promoter', 2]];
  for (const [role, n] of want) {
    let have = s.professionals.filter((x) => x.role === role).length;
    while (have < n) {
      const st = genStaff(s, r, role, clamp(Math.round(r.normal(52, 17)), 20, 92));
      const era = ERA_NAMES.filter((e) => e.role === role && s.year >= e.from && s.year <= e.to && !s.professionals.some((x) => x.name === e.n) && !s.player.staff.some((x) => x.name === e.n));
      if (era.length && r.chance(0.4)) st.name = r.pick(era).n;
      s.professionals.push(st);
      have++;
    }
  }
}

function poach(s: GameState, r: Rng): void {
  const d = d16(s), mk = s.year * 12 + s.month;
  // propostas pendentes do mês passado: sem resposta, a pessoa vai embora
  d.pend = d.pend.filter((p) => {
    const st = staffOf(s, p.staffId);
    if (!st) return false;
    if (p.until > mk) return true;
    s.player.staff = s.player.staff.filter((x) => x !== st);
    d.orders = d.orders.filter((o) => o.staffId !== st.id);
    d.lost++;
    const t = fmtL(l('{n} aceitou a proposta de {lb} e saiu. As ordens delegadas foram encerradas.', '{n} took {lb}\'s offer and left. Delegated orders were closed.'), { n: st.name, lb: s.labels[p.lb]?.name ?? '—' });
    notify(s, t, 'bad'); logD(s, st.id, undefined, 'sys', t, 'bad'); remember(s, 'staff', t);
    return false;
  });
  const rivals = Object.values(s.labels).filter((x) => x.active && x.id !== 'player');
  if (!rivals.length) return;
  for (const st of delegates(s)) {
    if (d.pend.some((p) => p.staffId === st.id)) continue;
    const loyal = st.trait === 'loyal' ? 0.4 : st.trait === 'opportunist' || st.trait === 'ambitious' ? 1.6 : 1;
    const p = clamp((0.012 + Math.max(0, st.skill - 55) / 900) * loyal, 0, 0.1);
    if (!r.chance(p)) continue;
    const lb = r.pick(rivals);
    const raise = Math.round(st.salary * 0.25);
    d.pend.push({ staffId: st.id, lb: lb.id, raise, until: mk + 1 });
    const t = fmtL(l('{lb} quer levar {n} ({r}) com +{x} de salário por mês. Cubra a oferta ou deixe ir (decida até o próximo mês).', '{lb} wants to hire away {n} ({r}) at +{x}/month. Match the offer or let go (decide by next month).'), { lb: lb.name, n: st.name, r: st.role === 'promoter' ? l('promotor', 'promoter') : l('agente de shows', 'booking agent'), x: usd(raise) });
    notify(s, t, 'bad'); logD(s, st.id, undefined, 'sys', t, 'bad');
  }
}
export function matchOffer(s: GameState, staffId: string): L | null {
  const d = d16(s), p = d.pend.find((x) => x.staffId === staffId), st = staffOf(s, staffId);
  if (!p || !st) return l('Sem proposta pendente.', 'No pending offer.');
  st.salary += p.raise;
  d.pend = d.pend.filter((x) => x !== p);
  logD(s, st.id, undefined, 'sys', fmtL(l('Você cobriu a oferta: salário de {n} sobe {x}/mês e ele fica.', 'You matched the offer: {n}\'s salary rises {x}/month and they stay.'), { n: st.name, x: usd(p.raise) }), 'good');
  return null;
}
export function letGo(s: GameState, staffId: string): void { const d = d16(s), p = d.pend.find((x) => x.staffId === staffId); if (p) p.until = 0; }

registerSimHook('month', 'deleg16', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}|deleg16|${s.year}|${s.month}`);
  const d = d16(s);
  d.orders = d.orders.filter((o) => staffOf(s, o.staffId));
  topUp(s, r);
  reportPlayed(s);
  for (const st of delegates(s)) runStaff(s, r, st);
  poach(s, r);
  // vencidas: pede para o mês seguinte o que ficou sem resposta
});

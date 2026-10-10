// Rodada 18 (long18, feedback #14) — DELEGAÇÃO POR POLÍTICAS. O jogador define regras (teto de gasto por ordem,
// reserva mínima de caixa, descanso obrigatório, condições de renovação, objetivo por artista); a equipe delegada
// (agentes/promotores do deleg16 e o jurídico/empresário/A&R nas renovações) segue as regras sozinha e só sobe para a
// Caixa as EXCEÇÕES (uma carta por mês com o que travou, e o botão "liberar uma vez"). Padrão: tudo desligado
// (o comportamento antigo não muda até o jogador escrever uma política).

import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { expectedAdvance } from '../contracts';
import { monthlyCosts } from '../economy';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerInboxKind, registerAdvisorTip } from '../inbox18';
import { registerExplain } from '../explain18';
import { stressOf } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs } from '../util';
import { D16_GATES, D16_PAY, type Order16 } from './deleg16';
import { renewChance, renewWithReading } from './explain12';
import { c12 } from './tour12';

export type Goal18 = 'grow' | 'profit' | 'rest' | 'catalog' | 'free';
export const GOAL18: Record<Goal18, { name: L; desc: L }> = {
  grow: { name: l('Crescer', 'Grow'), desc: l('Sem restrição extra: a equipe investe para crescer (descanso e reserva ainda valem).', 'No extra limits: staff invests to grow (rest and reserve still apply).') },
  profit: { name: l('Dar lucro', 'Turn a profit'), desc: l('Divulgação com metade do teto de gasto; turnês só se a força local sustentar.', 'Promotion at half the spending cap; tours only if local draw supports them.') },
  rest: { name: l('Descansar', 'Rest'), desc: l('Nada de turnê, divulgação ou rádio delegados para este artista.', 'No delegated tours, promotion or radio for this act.') },
  catalog: { name: l('Cuidar do catálogo', 'Nurture the catalog'), desc: l('Sem turnê delegada; divulgação liberada (catálogo e relançamentos).', 'No delegated tours; promotion allowed (catalog and reissues).') },
  free: { name: l('Sem política', 'No policy'), desc: l('As regras gerais não valem para este artista.', 'General rules do not apply to this act.') },
};
export interface Exc18 { w: number; k: 'spend' | 'reserve' | 'rest' | 'goal' | 'renew'; act?: string; t: L }
export interface Pol18 {
  /** teto por gasto de ordem (US$ reais; 0 = sem teto) */
  cap: number;
  /** reserva mínima em meses de custo fixo (0 = sem reserva) */
  reserve: number;
  /** descanso: estresse (curto) a partir do qual a turnê delegada para; 0 = desligado */
  rest: number;
  /** máximo de shows em 13 semanas por artista (0 = sem limite) */
  maxShows: number;
  /** renovação delegada: liga, bônus máximo (fração do adiantamento esperado), meses, confiança mínima */
  renew: boolean; renewMax: number; renewMonths: number; minTrust: number;
  goals: Record<string, Goal18>;
  exc: Exc18[];
  /** liberações pontuais (chave → semana até quando vale) */
  once: Record<string, number>;
  tried: Record<string, number>;
  n: { blocked: number; renewed: number };
}
declare module '../ext4' { interface Ext4 { policy18: Pol18 } }
const fresh = (): Pol18 => ({ cap: 0, reserve: 0, rest: 0, maxShows: 0, renew: false, renewMax: 0.3, renewMonths: 24, minTrust: 40, goals: {}, exc: [], once: {}, tried: {}, n: { blocked: 0, renewed: 0 } });
registerExt4('policy18', fresh);
export const pol18 = (s: GameState): Pol18 => {
  const x = s.x4 as unknown as { policy18?: Pol18 };
  return (x.policy18 ??= fresh());
};
export const goalOf18 = (s: GameState, actId?: string): Goal18 => (actId ? pol18(s).goals[actId] ?? 'grow' : 'grow');
/** custo fixo mensal (aluguel, salários, terceiros, parcelas, equipamento) */
export const burn18 = (s: GameState): number => { const c = monthlyCosts(s); return c.rent + c.salaries + c.outsourcing + c.loans + c.equipment; };
export const reserveCents18 = (s: GameState): number => Math.round(pol18(s).reserve * burn18(s));

function exc(s: GameState, k: Exc18['k'], t: L, act?: string): void {
  const P = pol18(s);
  P.n.blocked++;
  if (P.exc.some((e) => e.w >= s.week - 3 && e.k === k && e.act === act)) return;
  P.exc.unshift({ w: s.week, k, act, t });
  if (P.exc.length > 40) P.exc.length = 40;
}
const onceOk = (s: GameState, key: string): boolean => (pol18(s).once[key] ?? -1) >= s.week;

/** Shows (tocados ou marcados) do ato nas últimas/próximas 13 semanas. */
export function showsNear18(s: GameState, actId: string): number {
  const a = c12(s).shows.filter((x) => x.actId === actId && x.status !== 'cancelled' && Math.abs(x.week - s.week) <= 13).length;
  const b = s.tours.filter((t) => t.actId === actId).reduce((n, t) => n + t.stops.filter((x) => x.status !== 'cancelled' && Math.abs(x.day - s.day) <= 91).length, 0);
  return a + b;
}
/** O ato precisa de descanso? (maior estresse curto dos integrantes e cansaço) */
export function tired18(s: GameState, act: Act): { v: number; who: string } {
  let v = 0, who = '';
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    const x = Math.max(stressOf(s, id).short, p.fatigue);
    if (x > v) { v = x; who = p.name; }
  }
  return { v, who };
}

/** Portão por ordem (deleg16): objetivo do artista e descanso obrigatório. */
export function gate18(s: GameState, o: Pick<Order16, 'kind' | 'actId'>): L | null {
  const P = pol18(s), act = o.actId ? s.acts[o.actId] : undefined;
  const g = goalOf18(s, o.actId);
  if (!act || g === 'free' || onceOk(s, `${o.actId}`)) return null;
  const live = o.kind === 'tour' || o.kind === 'fees';
  if (g === 'rest' && (live || o.kind === 'promo' || o.kind === 'radio')) { exc(s, 'goal', fmtL(l('{a} está em "Descansar": ordem de {k} parada.', '{a} is set to "Rest": {k} order held.'), { a: act.name, k: o.kind }), act.id); return l('Política: o artista está em descanso.', 'Policy: the act is resting.'); }
  if (g === 'catalog' && o.kind === 'tour') { exc(s, 'goal', fmtL(l('{a} está em "Cuidar do catálogo": turnê delegada não sai.', '{a} is set to "Nurture the catalog": no delegated tour.'), { a: act.name }), act.id); return l('Política: catálogo, sem turnê.', 'Policy: catalog, no tour.'); }
  if (o.kind === 'tour' && P.rest > 0) {
    const t = tired18(s, act);
    if (t.v >= P.rest) { exc(s, 'rest', fmtL(l('Descanso obrigatório: {p} ({a}) está em {v} de estresse/cansaço (limite {x}). Turnê delegada adiada.', 'Mandatory rest: {p} ({a}) is at {v} stress/fatigue (limit {x}). Delegated tour postponed.'), { p: t.who, a: act.name, v: Math.round(t.v), x: P.rest }), act.id); return fmtL(l('Política de descanso: {p} precisa parar.', 'Rest policy: {p} needs a break.'), { p: t.who }); }
  }
  if (o.kind === 'tour' && P.maxShows > 0) {
    const n = showsNear18(s, act.id);
    if (n >= P.maxShows) { exc(s, 'rest', fmtL(l('{a} já tem {n} shows em 13 semanas (limite {x}). Turnê delegada não marcou mais.', '{a} already has {n} shows within 13 weeks (limit {x}). Delegated tour booked no more.'), { a: act.name, n, x: P.maxShows }), act.id); return l('Política: limite de shows.', 'Policy: show limit.'); }
  }
  return null;
}
/** Portão de gasto (deleg16): teto por ordem e reserva mínima. */
export function payGate18(s: GameState, o: Pick<Order16, 'kind' | 'actId'>, amt: number): L | null {
  const P = pol18(s);
  const g = goalOf18(s, o.actId);
  if (g === 'free' || onceOk(s, `${o.actId ?? ''}`) || onceOk(s, 'all')) return null;
  const cap = P.cap * (g === 'profit' && (o.kind === 'promo' || o.kind === 'radio') ? 0.5 : 1);
  const real = toReal(amt, s.year);
  if (cap > 0 && real > cap) { exc(s, 'spend', fmtL(l('Gasto de {v} ({k}) acima do teto de {c}: precisa da sua autorização.', 'Spend of {v} ({k}) above the {c} cap: needs your approval.'), { v: `$${Math.round(real)}`, k: o.kind, c: `$${Math.round(cap)}` }), o.actId); return fmtL(l('Política: acima do teto de {c}.', 'Policy: above the {c} cap.'), { c: `$${Math.round(cap)}` }); }
  const res = reserveCents18(s);
  if (res > 0 && s.player.cash - amt < res) { exc(s, 'reserve', fmtL(l('Reserva mínima ({m} meses de custo fixo) protegida: {k} não gastou.', 'Minimum reserve ({m} months of fixed costs) protected: {k} did not spend.'), { m: P.reserve, k: o.kind }), o.actId); return l('Política: reserva mínima de caixa.', 'Policy: minimum cash reserve.'); }
  return null;
}
D16_GATES.push((s, o) => gate18(s, o));
D16_PAY.push((s, o, amt) => payGate18(s, o, amt));

const lawyer = (s: GameState) => s.player.staff.find((x) => x.role === 'legal' || x.role === 'manager' || x.role === 'anr');

/** Renovação delegada: contratos que vencem em até 9 semanas, dentro das condições. */
function renewals(s: GameState): void {
  const P = pol18(s);
  if (!P.renew) return;
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    const c = act?.contractId ? s.contracts[act.contractId] : undefined;
    if (!act || !c || c.party !== 'player' || act.playerBand) continue;
    const left = c.endWeek - s.week;
    if (left <= 0 || left > 9 || (P.tried[c.id] ?? -99) >= c.endWeek - 12) continue;
    if (goalOf18(s, id) === 'free') continue;
    P.tried[c.id] = s.week;
    const st = lawyer(s);
    const bonus = money(s, Math.round(expectedAdvance(s, act) * P.renewMax));
    if (!st) { exc(s, 'renew', fmtL(l('O contrato de {a} vence em {w} semanas e ninguém da equipe negocia renovações (jurídico, empresário ou A&R).', '{a}\'s contract ends in {w} weeks and no one on staff negotiates renewals (legal, manager or A&R).'), { a: act.name, w: left }), id); continue; }
    if (act.trust < P.minTrust) { exc(s, 'renew', fmtL(l('{a} vence em {w} semanas, mas a confiança ({t}) está abaixo do mínimo da política ({m}): renovar fica com você.', '{a} ends in {w} weeks, but trust ({t}) is below the policy minimum ({m}): renewing is up to you.'), { a: act.name, w: left, t: Math.round(act.trust), m: P.minTrust }), id); continue; }
    if (s.player.cash - bonus < reserveCents18(s)) { exc(s, 'renew', fmtL(l('Renovar {a} custaria {b} e furaria a reserva mínima.', 'Renewing {a} would cost {b} and break the minimum reserve.'), { a: act.name, b: `$${Math.round(toReal(bonus, s.year))}` }), id); continue; }
    const p = renewChance(s, act, bonus);
    if (renewWithReading(s, id, P.renewMonths, bonus)) {
      P.n.renewed++;
      emitFact(s, { kind: 'deal', actors: [id, 'player'], severity: 15, visibility: 'public', tags: ['good'], text: fmtL(l('{n} renovou o contrato de {a} por {m} meses dentro da política (bônus {b}, chance {p}%).', '{n} renewed {a}\'s deal for {m} months within policy (bonus {b}, {p}% chance).'), { n: st.name, a: act.name, m: P.renewMonths, b: `$${Math.round(toReal(bonus, s.year))}`, p: Math.round(p * 100) }), src: 'policy18' });
    } else exc(s, 'renew', fmtL(l('{a} recusou a renovação nas condições da política ({p}% de chance). Ofereça mais você mesmo ou deixe ir.', '{a} declined renewal on policy terms ({p}% chance). Offer more yourself or let go.'), { a: act.name, p: Math.round(p * 100) }), id);
  }
}

registerSimHook('month', 'policy18', (s) => {
  const P = pol18(s);
  renewals(s);
  for (const k of Object.keys(P.once)) if (P.once[k] < s.week) delete P.once[k];
  for (const k of Object.keys(P.tried)) if (!s.contracts[k]) delete P.tried[k];
  const fresh = P.exc.filter((e) => e.w > s.week - 5);
  if (!fresh.length) return;
  pushInbox18(s, 'policy18', {
    from: l('Equipe', 'Staff').pt, tone: 'bad',
    subject: fmtL(l('{n} exceção(ões) às suas políticas', '{n} exception(s) to your policies'), { n: fresh.length }),
    body: fresh.slice(0, 4).map((e) => e.t).reduce((a, b) => ({ pt: `${a.pt} • ${b.pt}`, en: `${a.en} • ${b.en}` }), l('', '')),
    actions: [{ id: 'once', label: l('Liberar uma vez (próximo mês)', 'Allow once (next month)') }, { id: 'keep', label: l('Manter a política', 'Keep the policy') }],
    ref: { acts: fresh.map((e) => e.act ?? '').join(',') }, weeks: 4,
  });
});
registerInboxKind('policy18', {
  label: l('Políticas', 'Policies'), cat: 'staff', icon: 'shield', prio: 2,
  goto: () => ({ area: 'long18', tab: ['long18', 'policy'], label: l('Abrir políticas', 'Open policies') }),
  handle: (s, m, action) => {
    if (action !== 'once') return l('A equipe segue a política.', 'Staff keeps following the policy.');
    const P = pol18(s);
    for (const a of String(m.ref?.acts ?? '').split(',')) P.once[a || 'all'] = s.week + 5;
    P.once.all = s.week + 5;
    return l('Liberado: no próximo mês a equipe ignora os limites que travaram.', 'Allowed: next month staff ignores the limits that blocked.');
  },
});
registerAdvisorTip('policy18', (s) => {
  const P = pol18(s);
  if (P.cap || P.reserve || P.rest || P.renew) return [];
  const n = s.player.staff.filter((x) => x.role === 'booking_agent' || x.role === 'promoter').length;
  if (!n) return [];
  return [{ id: 'pol18-none', level: 'info', cat: 'other', score: 35, text: l('Sua equipe delegada trabalha sem políticas.', 'Your delegated staff works without policies.'),
    why: [l('Sem teto de gasto, reserva mínima ou descanso obrigatório, os agentes gastam e marcam shows sem limite.', 'With no spending cap, minimum reserve or mandatory rest, agents spend and book without limits.')],
    effect: l('Reserva de 3 meses + descanso a partir de 65: você só decide as exceções.', 'A 3-month reserve + rest from 65: you only decide the exceptions.'),
    goto: { area: 'long18', tab: ['long18', 'policy'] },
    run: { label: l('Aplicar política sensata', 'Apply a sensible policy'), fn: (st) => { const Q = pol18(st); Q.reserve = 3; Q.rest = 65; Q.maxShows = 14; return l('Política aplicada: reserva de 3 meses, descanso a partir de 65, até 14 shows por trimestre.', 'Policy applied: 3-month reserve, rest from 65, up to 14 shows per quarter.'); } } }];
});
registerExplain('policy18.reserve', (s) => ({
  title: l('Reserva mínima de caixa', 'Minimum cash reserve'), value: reserveCents18(s), fmt: 'money',
  parts: [{ label: l('Meses de custo fixo', 'Months of fixed costs'), value: pol18(s).reserve, fmt: 'num' }, { label: l('Custo fixo mensal', 'Monthly fixed cost'), value: burn18(s), fmt: 'money' }],
  note: l('A equipe delegada não gasta abaixo dessa linha; o que travar vira exceção na Caixa.', 'Delegated staff will not spend below this line; anything blocked becomes an inbox exception.'),
}));

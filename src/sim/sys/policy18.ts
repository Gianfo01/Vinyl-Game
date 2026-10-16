// Rodada 18 (long18, feedback #14) — DELEGAÇÃO POR POLÍTICAS (r31 Q: estado na delegação única, sim/deleg31.ts). O jogador define regras (teto de gasto por ordem,
// reserva mínima de caixa, descanso obrigatório, condições de renovação, objetivo por artista); a equipe delegada
// (agentes/promotores do deleg16 e o jurídico/empresário/A&R nas renovações) segue as regras sozinha e só sobe para a
// Caixa as EXCEÇÕES (uma carta por mês com o que travou, e o botão "liberar uma vez"). Padrão: tudo desligado
// (o comportamento antigo não muda até o jogador escrever uma política).

import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { expectedAdvance } from '../contracts';
import { monthlyCosts } from '../economy';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerInboxKind, registerAdvisorTip } from '../inbox18';
import { registerExplain } from '../explain18';
import { stressOf } from '../stress17';
import type { Act, GameState, StaffMember } from '../types';
import { ASK31, allowOnce31, askFor31, d31, dirOf31, exc31, excs31, goalOf31, logAuto31, modeOf31, onceOk31, rule31, setDir31, staffFor31, tidy31, type Goal31, type Resp31 } from '../deleg31';
import { fmtL, money, playerActs } from '../util';
import { D16_GATES, D16_PAY, respOf16, type Order16 } from './deleg16';
import { renewChance, renewWithReading } from './explain12';
import { c12 } from './tour12';

// r31 (Q): o estado das políticas (`x4.policy18`) foi fundido na delegação única (sim/deleg31.ts): teto e reserva são
// diretrizes de "Gastos da equipe", descanso e shows de "Descanso do elenco", renovação é a responsabilidade
// "Renovações", o objetivo por artista mora na diretriz por artista e as exceções são entradas do registro de automação.
// Este módulo ficou como EXECUTOR: portões das ordens (deleg16), renovação delegada, carta mensal de exceções.

export type Goal18 = Goal31;
export const GOAL18: Record<Goal18, { name: L; desc: L }> = {
  grow: { name: l('Crescer', 'Grow'), desc: l('Sem restrição extra: a equipe investe para crescer (descanso e reserva ainda valem).', 'No extra limits: staff invests to grow (rest and reserve still apply).') },
  profit: { name: l('Dar lucro', 'Turn a profit'), desc: l('Divulgação com metade do teto de gasto; turnês só se a força local sustentar.', 'Promotion at half the spending cap; tours only if local draw supports them.') },
  rest: { name: l('Descansar', 'Rest'), desc: l('Nada de turnê, divulgação ou rádio delegados para este artista.', 'No delegated tours, promotion or radio for this act.') },
  catalog: { name: l('Cuidar do catálogo', 'Nurture the catalog'), desc: l('Sem turnê delegada; divulgação liberada (catálogo e relançamentos).', 'No delegated tours; promotion allowed (catalog and reissues).') },
  free: { name: l('Sem política', 'No policy'), desc: l('As regras gerais não valem para este artista.', 'General rules do not apply to this act.') },
};
export const goalOf18 = goalOf31;
/** custo fixo mensal (aluguel, salários, terceiros, parcelas, equipamento) */
export const burn18 = (s: GameState): number => { const c = monthlyCosts(s); return c.rent + c.salaries + c.outsourcing + c.loans + c.equipment; };
export const reserveCents18 = (s: GameState): number => Math.round(rule31(s, 'finance', 'reserve') * burn18(s));

type ExcK = 'spend' | 'reserve' | 'rest' | 'goal' | 'renew';
const EXC_R: Record<ExcK, Resp31> = { spend: 'finance', reserve: 'finance', rest: 'rest', goal: 'tour', renew: 'renew' };
function exc(s: GameState, k: ExcK, t: L, act?: string, who?: StaffMember, r?: Resp31): void {
  exc31(s, r ?? EXC_R[k], k, t, act, who);
}

const onceOk = onceOk31;

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
  const act = o.actId ? s.acts[o.actId] : undefined;
  const rest = rule31(s, 'rest', 'rest'), maxShows = rule31(s, 'rest', 'maxShows');
  const g = goalOf18(s, o.actId);
  if (!act || g === 'free' || onceOk(s, `${o.actId}`)) return null;
  const live = o.kind === 'tour' || o.kind === 'fees';
  if (g === 'rest' && (live || o.kind === 'promo' || o.kind === 'radio')) { exc(s, 'goal', fmtL(l('{a} está em "Descansar": ordem de {k} parada.', '{a} is set to "Rest": {k} order held.'), { a: act.name, k: o.kind }), act.id, undefined, respOf16(o.kind)); return l('Política: o artista está em descanso.', 'Policy: the act is resting.'); }
  if (g === 'catalog' && o.kind === 'tour') { exc(s, 'goal', fmtL(l('{a} está em "Cuidar do catálogo": turnê delegada não sai.', '{a} is set to "Nurture the catalog": no delegated tour.'), { a: act.name }), act.id, undefined, 'tour'); return l('Política: catálogo, sem turnê.', 'Policy: catalog, no tour.'); }
  if (o.kind === 'tour' && rest > 0) {
    const t = tired18(s, act);
    if (t.v >= rest) { exc(s, 'rest', fmtL(l('Descanso obrigatório: {p} ({a}) está em {v} de estresse/cansaço (limite {x}). Turnê delegada adiada.', 'Mandatory rest: {p} ({a}) is at {v} stress/fatigue (limit {x}). Delegated tour postponed.'), { p: t.who, a: act.name, v: Math.round(t.v), x: rest }), act.id); return fmtL(l('Política de descanso: {p} precisa parar.', 'Rest policy: {p} needs a break.'), { p: t.who }); }
  }
  if (o.kind === 'tour' && maxShows > 0) {
    const n = showsNear18(s, act.id);
    if (n >= maxShows) { exc(s, 'rest', fmtL(l('{a} já tem {n} shows em 13 semanas (limite {x}). Turnê delegada não marcou mais.', '{a} already has {n} shows within 13 weeks (limit {x}). Delegated tour booked no more.'), { a: act.name, n, x: maxShows }), act.id); return l('Política: limite de shows.', 'Policy: show limit.'); }
  }
  return null;
}
/** Portão de gasto (deleg16): teto por ordem e reserva mínima. */
export function payGate18(s: GameState, o: Pick<Order16, 'kind' | 'actId'>, amt: number): L | null {
  const g = goalOf18(s, o.actId);
  if (g === 'free' || onceOk(s, `${o.actId ?? ''}`) || onceOk(s, 'all')) return null;
  const cap = rule31(s, 'finance', 'cap') * (g === 'profit' && (o.kind === 'promo' || o.kind === 'radio') ? 0.5 : 1);
  const real = toReal(amt, s.year);
  if (cap > 0 && real > cap) { exc(s, 'spend', fmtL(l('Gasto de {v} ({k}) acima do teto de {c}: precisa da sua autorização.', 'Spend of {v} ({k}) above the {c} cap: needs your approval.'), { v: `$${Math.round(real)}`, k: o.kind, c: `$${Math.round(cap)}` }), o.actId); return fmtL(l('Política: acima do teto de {c}.', 'Policy: above the {c} cap.'), { c: `$${Math.round(cap)}` }); }
  const res = reserveCents18(s);
  if (res > 0 && s.player.cash - amt < res) { exc(s, 'reserve', fmtL(l('Reserva mínima ({m} meses de custo fixo) protegida: {k} não gastou.', 'Minimum reserve ({m} months of fixed costs) protected: {k} did not spend.'), { m: rule31(s, 'finance', 'reserve'), k: o.kind }), o.actId); return l('Política: reserva mínima de caixa.', 'Policy: minimum cash reserve.'); }
  return null;
}
D16_GATES.push((s, o) => gate18(s, o));
D16_PAY.push((s, o, amt) => payGate18(s, o, amt));

/** Renovação delegada: contratos que vencem em até 9 semanas, dentro das diretrizes (responsabilidade "Renovações"). */
function renewals(s: GameState): void {
  const m = modeOf31(s, 'renew');
  if (m === 'me') return;
  const D = dirOf31(s, 'renew'), tried = d31(s).tried;
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    const c = act?.contractId ? s.contracts[act.contractId] : undefined;
    if (!act || !c || c.party !== 'player' || act.playerBand) continue;
    const left = c.endWeek - s.week;
    if (left <= 0 || left > 9 || (tried[c.id] ?? -99) >= c.endWeek - 12) continue;
    if (goalOf18(s, id) === 'free') continue;
    tried[c.id] = s.week;
    const st = staffFor31(s, 'renew');
    const months = D.months ?? 24, minTrust = D.minTrust ?? 40;
    const bonus = money(s, Math.round(expectedAdvance(s, act) * (D.frac ?? 0.3)));
    if (!st) { exc(s, 'renew', fmtL(l('O contrato de {a} vence em {w} semanas e ninguém da equipe negocia renovações (jurídico, empresário ou A&R).', '{a}\'s contract ends in {w} weeks and no one on staff negotiates renewals (legal, manager or A&R).'), { a: act.name, w: left }), id); continue; }
    if (act.trust < minTrust) { exc(s, 'renew', fmtL(l('{a} vence em {w} semanas, mas a confiança ({t}) está abaixo do mínimo da política ({m}): renovar fica com você.', '{a} ends in {w} weeks, but trust ({t}) is below the policy minimum ({m}): renewing is up to you.'), { a: act.name, w: left, t: Math.round(act.trust), m: minTrust }), id, st); continue; }
    if (s.player.cash - bonus < reserveCents18(s)) { exc(s, 'renew', fmtL(l('Renovar {a} custaria {b} e furaria a reserva mínima.', 'Renewing {a} would cost {b} and break the minimum reserve.'), { a: act.name, b: `$${Math.round(toReal(bonus, s.year))}` }), id, st); continue; }
    if (m === 'partial' && (D.ask ?? 0) > 0 && toReal(bonus, s.year) > (D.ask ?? 0)) {
      askFor31(s, { r: 'renew', who: st.id, until: s.week + Math.max(1, left - 1), amt: bonus, act: id, k: 'renew',
        t: fmtL(l('{n} quer renovar {a} por {m} meses com bônus de {b} (acima do seu limite de {x}).', '{n} wants to renew {a} for {m} months with a {b} bonus (above your {x} limit).'), { n: st.name, a: act.name, m: months, b: `$${Math.round(toReal(bonus, s.year))}`, x: `$${Math.round(D.ask ?? 0)}` }),
        data: { months, bonus } });
      continue;
    }
    const p = renewChance(s, act, bonus);
    if (renewWithReading(s, id, months, bonus)) {
      const t = fmtL(l('{n} renovou o contrato de {a} por {m} meses dentro da política (bônus {b}, chance {p}%).', '{n} renewed {a}\'s deal for {m} months within policy (bonus {b}, {p}% chance).'), { n: st.name, a: act.name, m: months, b: `$${Math.round(toReal(bonus, s.year))}`, p: Math.round(p * 100) });
      logAuto31(s, { r: 'renew', who: st.id, t, tone: 'good', act: id, amt: -bonus, why: fmtL(l('vence em {w} semanas; confiança {c} (mínimo {m})', 'ends in {w} weeks; trust {c} (minimum {m})'), { w: left, c: Math.round(act.trust), m: minTrust }) });
      emitFact(s, { kind: 'deal', actors: [id, 'player'], severity: 15, visibility: 'public', tags: ['good'], text: t, src: 'policy18' });
    } else exc(s, 'renew', fmtL(l('{a} recusou a renovação nas condições da política ({p}% de chance). Ofereça mais você mesmo ou deixe ir.', '{a} declined renewal on policy terms ({p}% chance). Offer more yourself or let go.'), { a: act.name, p: Math.round(p * 100) }), id, st);
  }
}
ASK31.renew = (s, a) => {
  const act = a.act ? s.acts[a.act] : undefined;
  if (!act) return l('O artista já não está no selo.', 'The act is no longer with the label.');
  const bonus = Number(a.data.bonus) || 0;
  if (s.player.cash < bonus) return l('Caixa insuficiente para o bônus.', 'Not enough cash for the bonus.');
  return renewWithReading(s, act.id, Number(a.data.months) || 24, bonus) ? null : fmtL(l('{a} recusou a renovação.', '{a} declined the renewal.'), { a: act.name });
};

registerSimHook('month', 'policy18', (s) => {
  renewals(s);
  tidy31(s);
  const fresh = excs31(s, s.week - 5);
  if (!fresh.length) return;
  pushInbox18(s, 'deleg31', {
    from: l('Equipe', 'Staff').pt, tone: 'bad',
    subject: fmtL(l('{n} exceção(ões) à sua delegação', '{n} exception(s) to your delegation'), { n: fresh.length }),
    body: fresh.slice(0, 4).map((e) => e.t).reduce((a, b) => ({ pt: `${a.pt} • ${b.pt}`, en: `${a.en} • ${b.en}` }), l('', '')),
    actions: [{ id: 'once', label: l('Liberar uma vez (próximo mês)', 'Allow once (next month)') }, { id: 'keep', label: l('Manter as diretrizes', 'Keep the directives') }],
    ref: { acts: fresh.map((e) => e.act ?? '').join(','), rs: [...new Set(fresh.map((e) => e.r))].join(',') }, weeks: 4,
  });
});
registerInboxKind('deleg31', {
  label: l('Delegação', 'Delegation'), cat: 'staff', icon: 'shield', prio: 2,
  goto: () => ({ area: 'deleg31', label: l('Abrir a delegação', 'Open delegation') }),
  handle: (s, m, action) => {
    if (action !== 'once') return l('A equipe segue as diretrizes.', 'Staff keeps following the directives.');
    for (const a of String(m.ref?.acts ?? '').split(',')) allowOnce31(s, a || 'all');
    for (const r of String(m.ref?.rs ?? '').split(',').filter(Boolean)) allowOnce31(s, `${r as Resp31}:all`);
    allowOnce31(s, 'all');
    return l('Liberado: no próximo mês a equipe ignora os limites que travaram.', 'Allowed: next month staff ignores the limits that blocked.');
  },
});
registerAdvisorTip('policy18', (s) => {
  if (rule31(s, 'finance', 'cap') || rule31(s, 'finance', 'reserve') || rule31(s, 'rest', 'rest') || modeOf31(s, 'renew') !== 'me') return [];
  const n = s.player.staff.filter((x) => x.role === 'booking_agent' || x.role === 'promoter').length;
  if (!n) return [];
  return [{ id: 'pol18-none', level: 'info', cat: 'other', score: 35, text: l('Sua equipe delegada trabalha sem políticas.', 'Your delegated staff works without policies.'),
    why: [l('Sem teto de gasto, reserva mínima ou descanso obrigatório, os agentes gastam e marcam shows sem limite.', 'With no spending cap, minimum reserve or mandatory rest, agents spend and book without limits.')],
    effect: l('Reserva de 3 meses + descanso a partir de 65: você só decide as exceções.', 'A 3-month reserve + rest from 65: you only decide the exceptions.'),
    goto: { area: 'deleg31' },
    run: { label: l('Aplicar política sensata', 'Apply a sensible policy'), fn: (st) => { setDir31(st, 'finance', { reserve: 3 }); setDir31(st, 'rest', { rest: 65, maxShows: 14 }); return l('Política aplicada: reserva de 3 meses, descanso a partir de 65, até 14 shows por trimestre.', 'Policy applied: 3-month reserve, rest from 65, up to 14 shows per quarter.'); } } }];
});
registerExplain('policy18.reserve', (s) => ({
  title: l('Reserva mínima de caixa', 'Minimum cash reserve'), value: reserveCents18(s), fmt: 'money',
  parts: [{ label: l('Meses de custo fixo', 'Months of fixed costs'), value: rule31(s, 'finance', 'reserve'), fmt: 'num' }, { label: l('Custo fixo mensal', 'Monthly fixed cost'), value: burn18(s), fmt: 'money' }],
  note: l('A equipe delegada não gasta abaixo dessa linha; o que travar vira exceção na Caixa.', 'Delegated staff will not spend below this line; anything blocked becomes an inbox exception.'),
}));

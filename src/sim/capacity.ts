// Calendário com capacidade de 100% por pessoa (GDD §45.4) e agenda futura (§46.1):
// reservas até 12 meses à frente, sem custo até começar; conflito explica pessoa, mês e carga.

import type { Rng } from '../core/rng';
import { actionMeta } from '../data/actions';
import { cityById, l, type L } from '../data/world';
import type { Act, AgendaSlot, GameState } from './types';
import type { Plan } from './xtypes';
import { fmtL, nextId, notify, remember } from './util';

export function monthIndex(s: GameState): number {
  return s.year * 12 + s.month;
}

export function monthLabel(idx: number): L {
  const y = Math.floor(idx / 12);
  const m = idx % 12;
  const pt = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m];
  const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];
  return l(`${pt}/${y}`, `${en} ${y}`);
}

export function activeMembers(s: GameState, act: Act): string[] {
  return act.members.filter((id) => s.persons[id]?.alive);
}

/** Atos (banda + carreiras solo) de que a pessoa participa. */
export function actsOfPerson(s: GameState, personId: string): Act[] {
  return Object.values(s.acts).filter((a) => a.members.includes(personId) && a.status !== 'retired' && a.status !== 'split');
}

export function slotLoad(slot: AgendaSlot): number {
  if (slot.action === 'gigs') {
    const dates = Number(slot.params?.dates ?? 4);
    return Math.min(100, Math.round(((dates + Math.ceil(dates / 2) + 2) / 28) * 100));
  }
  return actionMeta(slot.action).load;
}

export function agendaLoad(slots: AgendaSlot[]): number {
  return slots.reduce((t, x) => t + slotLoad(x), 0);
}

/** Dias de turnê de um ato num mês absoluto (shows + viagem). */
export function tourDaysInMonth(s: GameState, actId: string, idx: number): number {
  let days = 0;
  for (const t of s.tours) {
    if (t.actId !== actId && t.partnerActId !== actId) continue;
    if (t.status === 'cancelled' || t.status === 'done') continue;
    for (const st of t.stops) {
      if (st.status === 'cancelled') continue;
      const d = new Date(Date.UTC(s.config.startYear, 0, 1) + st.day * 86400000);
      if (d.getUTCFullYear() * 12 + d.getUTCMonth() === idx) days += 1 + st.travelDays;
    }
  }
  return days;
}

/** Carga de uma pessoa num mês absoluto: planos + agenda (mês atual) + turnês. */
export function personLoad(s: GameState, personId: string, idx: number, excludePlan?: string): { total: number; parts: { label: L; load: number }[] } {
  const parts: { label: L; load: number }[] = [];
  for (const p of s.plans) {
    if (p.id === excludePlan || p.status === 'cancelled' || p.status === 'done' || p.status === 'blocked') continue;
    if (!p.personIds.includes(personId)) continue;
    if (idx < p.startMonth || idx >= p.startMonth + p.months) continue;
    // plano já iniciado no mês atual entra pela agenda
    if (p.status === 'started' && idx === monthIndex(s)) continue;
    parts.push({ label: fmtL(l('Plano: {a}', 'Plan: {a}'), { a: actionName(p.action) }), load: p.load });
  }
  for (const act of actsOfPerson(s, personId)) {
    if (idx === monthIndex(s)) {
      const slots = s.agenda[act.id] ?? [];
      const ld = slots.reduce((t, x) => {
        const m = actionMeta(x.action);
        if (m.scope === 'person' && x.params?.person && x.params.person !== personId) return t;
        return t + slotLoad(x);
      }, 0);
      if (ld) parts.push({ label: fmtL(l('Agenda de {a}', '{a} agenda'), { a: act.name }), load: ld });
    }
    const td = tourDaysInMonth(s, act.id, idx);
    if (td) parts.push({ label: fmtL(l('Turnê de {a}', '{a} tour'), { a: act.name }), load: Math.min(100, Math.round(((td + 4) / 28) * 100)) });
  }
  return { total: parts.reduce((t, x) => t + x.load, 0), parts };
}

let nameLookup: (id: string) => L = (id) => l(id);
export function setActionNameLookup(f: (id: string) => L): void {
  nameLookup = f;
}
export function actionName(id: string): L {
  return nameLookup(id);
}

export interface Conflict {
  personId: string;
  monthIdx: number;
  existing: number;
  requested: number;
  text: L;
}

export function checkCapacity(s: GameState, personIds: string[], startMonth: number, months: number, load: number, excludePlan?: string): Conflict | null {
  for (let m = startMonth; m < startMonth + months; m++) {
    for (const pid of personIds) {
      const cur = personLoad(s, pid, m, excludePlan);
      if (cur.total + load > 100) {
        const p = s.persons[pid];
        const rel = m - monthIndex(s);
        return {
          personId: pid,
          monthIdx: m,
          existing: cur.total,
          requested: load,
          text: fmtL(l('{p} já tem {e}% reservado em {m} ({rel}); pedido de {q}% passa de 100%. Reservas: {list}.', '{p} already has {e}% booked in {m} ({rel}); asking {q}% exceeds 100%. Bookings: {list}.'), {
            p: p?.name ?? pid,
            e: cur.total,
            m: monthLabel(m),
            rel: rel === 0 ? l('este mês', 'this month') : fmtL(l('+{n} mês(es)', '+{n} month(s)'), { n: rel }),
            q: load,
            list: cur.parts.map((x) => `${x.label.pt.replace(/^.*: /, '')} ${x.load}%`).join(', ') || '—',
          }),
        };
      }
    }
  }
  return null;
}

/** Reserva futura: não cobra, só ocupa a agenda e prevê custo (GDD §46.1). */
export function reservePlan(s: GameState, actId: string, action: string, startMonth: number, opts: { personId?: string; months?: number; costEst?: number; params?: Plan['params'] } = {}): Plan | L {
  const act = s.acts[actId];
  if (!act) return l('Carreira inexistente.', 'Unknown career.');
  const meta = actionMeta(action);
  const months = opts.months ?? meta.months ?? 1;
  const now = monthIndex(s);
  if (startMonth < now) return l('Não dá para reservar no passado.', 'Cannot book in the past.');
  if (startMonth > now + 12) return l('Horizonte máximo: 12 meses.', 'Maximum horizon: 12 months.');
  const personIds = meta.scope === 'person' ? [opts.personId ?? act.members[0]] : activeMembers(s, act);
  if (!personIds.length) return l('Formação sem integrantes ativos.', 'No active members.');
  const c = checkCapacity(s, personIds, startMonth, months, meta.load);
  if (c) return c.text;
  const plan: Plan = { id: nextId(s, 'pl'), actId, personIds, action, startMonth, months, load: meta.load, status: 'planned', costEst: opts.costEst ?? 0, params: opts.params };
  s.plans.push(plan);
  return plan;
}

export function cancelPlan(s: GameState, planId: string): boolean {
  const p = s.plans.find((x) => x.id === planId);
  if (!p || p.status === 'done') return false;
  // começado: libera meses futuros, o atual não volta (GDD §45.4)
  if (p.status === 'started') {
    const now = monthIndex(s);
    p.months = Math.max(1, now - p.startMonth + 1);
    p.status = 'done';
    return true;
  }
  p.status = 'cancelled';
  return true;
}

export function movePlan(s: GameState, planId: string, newStart: number): L | null {
  const p = s.plans.find((x) => x.id === planId);
  if (!p || p.status !== 'planned') return l('Só planos ainda não iniciados podem mudar.', 'Only plans not yet started can move.');
  if (newStart < monthIndex(s) || newStart > monthIndex(s) + 12) return l('Fora do horizonte.', 'Out of range.');
  const c = checkCapacity(s, p.personIds, newStart, p.months, p.load, p.id);
  if (c) return c.text;
  p.startMonth = newStart;
  return null;
}

/** Slots extras deste mês vindos de planos iniciados. */
export function planSlots(s: GameState, actId: string): AgendaSlot[] {
  const now = monthIndex(s);
  return s.plans
    .filter((p) => p.actId === actId && p.status === 'started' && now >= p.startMonth && now < p.startMonth + p.months)
    .map((p) => ({ action: p.action, params: { ...(p.params ?? {}), person: p.personIds.length === 1 ? p.personIds[0] : '', plan: p.id } }));
}

/** Início de mês: reavalia tudo (contrato, formação, saúde, dinheiro) antes de começar. */
export function startPlans(s: GameState, _r: Rng): void {
  const now = monthIndex(s);
  for (const p of s.plans) {
    if (p.status === 'started' && now >= p.startMonth + p.months) {
      p.status = 'done';
      continue;
    }
    if (p.status !== 'planned' || p.startMonth > now) continue;
    const act = s.acts[p.actId];
    let why: L | null = null;
    if (!act || act.owner !== 'player') why = l('a carreira não é mais sua', 'the career is no longer yours');
    else if (act.hiatusUntil && act.hiatusUntil > s.week) why = l('afastamento em curso', 'on leave');
    else if (p.personIds.some((id) => !s.persons[id]?.alive || !act.members.includes(id))) why = l('formação mudou', 'line-up changed');
    else if (p.costEst > 0 && s.player.cash < p.costEst) why = l('caixa insuficiente', 'not enough cash');
    if (why) {
      p.status = 'blocked';
      p.reason = why;
      notify(s, fmtL(l('Plano bloqueado ({a}): {w}. Reagende.', 'Plan blocked ({a}): {w}. Reschedule it.'), { a: actionName(p.action), w: why }), 'bad');
      continue;
    }
    p.status = 'started';
  }
  // limpeza
  if (s.plans.length > 200) s.plans = s.plans.filter((p) => p.status === 'planned' || p.status === 'started' || now - p.startMonth < 12);
}

/** Deslocamento: gravar exige estar na cidade da sede; mudar de cidade custa dias. */
export function moveAct(s: GameState, actId: string, cityId: string, why: L): void {
  const from = s.location[actId];
  if (from === cityId) return;
  s.location[actId] = cityId;
  if (from) remember(s, 'travel', fmtL(l('{a} viaja de {f} para {t} ({w}).', '{a} travels from {f} to {t} ({w}).'), { a: s.acts[actId]?.name ?? '', f: cityById[from]?.name ?? from, t: cityById[cityId]?.name ?? cityId, w: why }), { actId });
}

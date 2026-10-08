// Central de decisões (GDD §46.1, §46.7): agenda futura com carga por pessoa, reservas sem custo,
// caixa comprometido, sessões de estúdio take a take, crises com prazo, histórias em curso,
// votações da banda e relatório dos rivais.

import { agendaById } from '../../data/people';
import { EXTRA_ACTIONS, actionMeta } from '../../data/actions';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { cancelPlan, monthIndex, monthLabel, movePlan, personLoad, reservePlan, setActionNameLookup } from '../../sim/capacity';
import { resolveVote } from '../../sim/dynasty';
import { respondCrisis } from '../../sim/media';
import { resolveTake, PRODUCERS } from '../../sim/studio';
import type { GameState } from '../../sim/types';
import type { Crisis } from '../../sim/xtypes';
import { money, playerActs, rngOf } from '../../sim/util';
import { $, actLink, labelLink, logo, modal, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { chips, countdown, dailyTimeline, ic, loadBar, portrait, stat } from '../vis';

setActionNameLookup((id) => agendaById[id]?.name ?? EXTRA_ACTIONS.find((x) => x.id === id)?.name ?? l(id));

export function actionLabel(id: string): string {
  return t(agendaById[id]?.name ?? EXTRA_ACTIONS.find((x) => x.id === id)?.name ?? l(id));
}

const PLANNABLE = ['train', 'workshop', 'rehearse', 'networking', 'interview', 'residency_art', 'rest', 'social', 'reposition', 'compose', 'record', ...EXTRA_ACTIONS.map((x) => x.id)];

function reserveDialog(s: GameState, actId: string): void {
  const act = s.acts[actId];
  const now = monthIndex(s);
  const state = { action: 'workshop', start: now + 1, person: act.members[0] };
  const info = h('div', { class: 'small' });
  const refresh = () => {
    const m = actionMeta(state.action);
    const def = agendaById[state.action] ?? EXTRA_ACTIONS.find((x) => x.id === state.action);
    info.replaceChildren(
      chips(stat('clock', `${m.load}%`, l('Carga mensal por pessoa', 'Monthly load per person')), stat('calendar', `${m.months ?? 1}`, l('Meses', 'Months')), stat('money', def?.cost ? $(money(s, def.cost)) : '—', l('Custo previsto (cobrado ao começar)', 'Expected cost (charged when it starts)'))),
      h('p', { class: 'muted' }, t(def?.desc)),
    );
  };
  let close = () => {};
  const body = h('div', { class: 'form' },
    h('label', null, t(l('Atividade', 'Activity')), select(state.action, PLANNABLE.map((id) => ({ value: id, label: actionLabel(id) })), (v) => { state.action = v; refresh(); })),
    h('label', null, t(l('Começa em', 'Starts in')), select(state.start, Array.from({ length: 13 }, (_, i) => ({ value: now + i, label: t(monthLabel(now + i)) })), (v) => { state.start = v; })),
    h('label', null, t(l('Pessoa (atividades individuais)', 'Person (individual activities)')), select(state.person, act.members.filter((id) => s.persons[id]?.alive).map((id) => ({ value: id, label: s.persons[id].name })), (v) => { state.person = v; })),
    info,
    h('button', { class: 'btn primary', onclick: () => {
      const def = agendaById[state.action] ?? EXTRA_ACTIONS.find((x) => x.id === state.action);
      const res = reservePlan(s, actId, state.action, state.start, { personId: state.person, costEst: def?.cost ? money(s, def.cost) : 0 });
      if ('pt' in res) toast(t(res), 'bad');
      else {
        toast(t(l('Reservado. Nada foi cobrado ainda.', 'Booked. Nothing charged yet.')), 'good');
        close();
        rerender();
      }
    } }, ic('calendar'), ' ', t(l('Reservar', 'Book'))),
  );
  refresh();
  close = modal(`${t(l('Reservar agenda', 'Book schedule'))} — ${act.name}`, body);
}

function calendarFor(s: GameState, actId: string, months: number): HTMLElement {
  const act = s.acts[actId];
  const now = monthIndex(s);
  const cols = Array.from({ length: months }, (_, i) => now + i);
  return h('div', { class: 'calendar', style: `--cols:${months}` },
    h('div', { class: 'cal-head' }, h('span'), cols.map((m) => h('span', null, t(monthLabel(m))))),
    act.members.filter((id) => s.persons[id]?.alive).map((pid) => {
      const p = s.persons[pid];
      return h('div', { class: 'cal-row' },
        h('span', { class: 'cal-who' }, portrait(p, 24), h('span', null, p.name.split(' ')[0])),
        cols.map((m) => {
          const ld = personLoad(s, pid, m);
          return h('span', { class: 'cal-cell' }, loadBar(ld.parts.map((x) => ({ label: t(x.label), load: x.load }))));
        }),
      );
    }),
  );
}

const CRISIS_RESP: { id: NonNullable<Crisis['response']>; label: L; icon: string }[] = [
  { id: 'apologize', label: l('Pedir desculpas', 'Apologize'), icon: 'heart' },
  { id: 'deny', label: l('Negar', 'Deny'), icon: 'lock' },
  { id: 'silence', label: l('Silêncio', 'Stay silent'), icon: 'sleep' },
  { id: 'counter', label: l('Contra-atacar', 'Counter-attack'), icon: 'fire' },
  { id: 'charity', label: l('Gesto público (doação)', 'Public gesture (donation)'), icon: 'handshake' },
];

export function centralPanel(s: GameState): HTMLElement {
  const ids = playerActs(s);
  const now = monthIndex(s);
  const committed = s.plans.filter((p) => p.status === "planned").reduce((x, p) => x + p.costEst, 0);
  const receivables = Math.round(s.flags.receivables ?? 0);
  const day = s.day + s.clock.dayInMonth;
  const crises = s.crises.filter((c) => !c.resolved);
  const sessions = s.sessions.filter((x) => !x.done);
  const arcs = s.arcs.filter((a) => !a.done);
  const r = rngOf(s);

  const cashRow = chips(
    stat('money', $(s.player.cash), l('Caixa atual', 'Current cash'), s.player.cash < 0 ? 'bad' : ''),
    stat('chart-up', $(Math.round(Object.values(s.lastMonthLedger).reduce((a, b) => a + b, 0))), l('Resultado do último mês', 'Last month result')),
    stat('bank', $(receivables), l('A receber (não financia gastos)', 'Receivables (cannot fund spending)')),
    stat('calendar', $(s.player.cash - committed), l('Caixa após planos', 'Cash after plans')),
  );

  return h('div', { class: 'panel central' },
    h('div', { class: 'col-main' },
      section(t(l('Caixa e compromissos', 'Cash and commitments')), cashRow),
      crises.length ? section(t(l('Crises abertas', 'Open crises')), h('div', { class: 'cards' }, crises.map((c) => h('article', { class: 'crisis' },
        h('header', null, ic('newspaper', 2), h('b', null, s.acts[c.actId]?.name ?? ''), countdown(c.deadlineDay - day)),
        h('p', null, t(c.text)), h('div', { class: 'sev' }, t(l('Gravidade', 'Severity')), ' ', h('span', { class: 'meter-bar bad' }, h('span', { style: `width:${c.severity}%` }))),
        h('div', { class: 'row wrap' }, CRISIS_RESP.map((o) => h('button', { class: 'btn small', onclick: () => { toast(t(respondCrisis(s, r, c.id, o.id)), 'info'); rerender(); } }, ic(o.icon), ' ', t(o.label)))),
      )))) : null,
      sessions.length ? section(t(l('Estúdio — sessões em andamento', 'Studio — sessions in progress')), sessions.map((ss) => {
        const act = s.acts[ss.actId];
        const pr = PRODUCERS.find((x) => x.id === ss.producerId);
        return h('div', { class: 'session' },
          h('header', null, act ? logo(act, 28) : null, h('b', null, act?.name ?? ''), pr ? pill(pr.name) : null, h('span', { class: 'muted small' }, ` ${ss.dayDone}/${ss.days} ${t(l('dias', 'days'))}`)),
          h('ul', { class: 'takes' }, ss.songIds.map((sid) => {
            const song = s.songs[sid];
            const takes = ss.takes[sid] ?? [];
            return h('li', null, ic(song?.recorded ? 'disc' : 'mic'), h('b', null, song?.title ?? ''),
              h('span', { class: 'take-dots' }, takes.map((tk) => h('span', { class: `take ${tk.quality > 70 ? 'good' : tk.quality < 40 ? 'bad' : ''}`, title: `${t(l('Take', 'Take'))} ${tk.n}: ${tk.quality} — ${t(tk.note)}` }, String(tk.quality)))),
              song?.recorded ? pill(`Q ${Math.round(song.q)}`, 'good') : null,
            );
          })),
          ss.decision ? h('div', { class: 'row wrap' },
            h('span', { class: 'small' }, t(l('Decisão do take:', 'Take decision:'))),
            h('button', { class: 'btn small primary', onclick: () => { resolveTake(s, r, ss.id, 'keep'); rerender(); } }, t(l('Manter o melhor', 'Keep the best'))),
            h('button', { class: 'btn small', onclick: () => { resolveTake(s, r, ss.id, 'another'); rerender(); } }, t(l('Mais um take (+1 dia, cansa)', 'One more take (+1 day, tiring)'))),
            ss.decision.options.includes('comp') ? h('button', { class: 'btn small', onclick: () => { resolveTake(s, r, ss.id, 'comp'); rerender(); } }, t(l('Montar dos melhores (comp)', 'Comp the best takes'))) : null,
          ) : h('p', { class: 'muted small' }, t(l('Avance a semana para gravar os próximos takes.', 'Advance the week to record the next takes.'))),
        );
      })) : null,
      s.votes.length ? section(t(l('A banda quer votar', 'The band wants a vote')), s.votes.map((v) => h('div', { class: 'vote' },
        h('p', null, actLink(s, v.actId), ': ', t(v.topic)),
        h('div', { class: 'row wrap' }, v.options.map((o) => h('div', { class: 'vote-opt' },
          h('div', { class: 'voters' }, Object.entries(v.votes).filter(([, x]) => x === o.id).map(([pid]) => portrait(s.persons[pid], 22))),
          h('button', { class: 'btn small', onclick: () => { toast(t(resolveVote(s, v.id, o.id)), 'info'); rerender(); } }, t(o.label)),
        ))),
      ))) : null,
      section(t(l('Agenda das carreiras (100% por pessoa)', 'Career schedules (100% per person)')),
        ids.length ? ids.map((id) => {
          const a = s.acts[id];
          return h('div', { class: 'plan-act' },
            h('header', null, logo(a, 28), h('b', null, a.name), h('button', { class: 'btn small', onclick: () => reserveDialog(s, id) }, ic('calendar'), ' ', t(l('Reservar', 'Book')))),
            calendarFor(s, id, 6),
          );
        }) : h('p', { class: 'muted' }, t(l('Sem carreiras.', 'No careers.'))),
      ),
      section(t(l('Planos', 'Plans')),
        s.plans.filter((p) => p.status !== 'done' && p.status !== 'cancelled').length ? h('table', { class: 'table' },
          h('tbody', null, s.plans.filter((p) => p.status !== 'done' && p.status !== 'cancelled').sort((a, b) => a.startMonth - b.startMonth).map((p) => h('tr', null,
            h('td', null, actLink(s, p.actId)),
            h('td', null, actionLabel(p.action)),
            h('td', null, t(monthLabel(p.startMonth)), p.months > 1 ? ` +${p.months - 1}` : ''),
            h('td', null, pill(t({ planned: l('planejado', 'planned'), started: l('iniciado', 'started'), blocked: l('bloqueado', 'blocked'), done: l('feito', 'done'), cancelled: l('cancelado', 'cancelled') }[p.status]), p.status === 'blocked' ? 'bad' : p.status === 'started' ? 'good' : ''), p.reason ? h('small', { class: 'muted' }, ' ', t(p.reason)) : null),
            h('td', null, `${p.load}%`),
            h('td', null,
              p.status === 'planned' || p.status === 'blocked' ? h('button', { class: 'btn small ghost', title: t(l('Adiar um mês', 'Postpone one month')), onclick: () => { if (p.status === 'blocked') p.status = 'planned'; const e = movePlan(s, p.id, Math.max(now, p.startMonth + 1)); if (e) toast(t(e), 'bad'); rerender(); } }, '→') : null,
              h('button', { class: 'btn small ghost', onclick: () => { cancelPlan(s, p.id); rerender(); } }, '✕'),
            ),
          ))),
        ) : h('p', { class: 'muted small' }, t(l('Nenhuma reserva futura. Reservas não cobram até começar.', 'No future bookings. Bookings are not charged until they start.'))),
      ),
    ),
    h('aside', { class: 'col-side' },
      arcs.length ? section(t(l('Histórias em andamento', 'Stories in progress')), arcs.map((a) => h('div', { class: 'arc' },
        h('b', null, t(a.title)),
        h('div', { class: 'arc-steps' }, Array.from({ length: a.stages }, (_, i) => h('span', { class: i < a.stage ? 'done' : i === a.stage ? 'now' : '' }))),
        a.outcome ? h('p', { class: 'small muted' }, t(a.outcome)) : null,
      ))) : null,
      section(t(l('Dia a dia', 'Day by day')), dailyTimeline(s)),
      section(t(l('O que os rivais fizeram', 'What rivals did')),
        s.rivalReport.items.length ? h('ul', { class: 'small rival-report' }, s.rivalReport.items.map((it) => h('li', null, labelLink(s, it.labelId), ' — ', t(it.text)))) : h('p', { class: 'muted small' }, t(l('Nada público no último mês.', 'Nothing public last month.'))),
      ),
    ),
  );
}

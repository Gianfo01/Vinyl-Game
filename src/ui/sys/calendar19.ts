// Rodada 19 (Frente 8, P2) — interface do CALENDÁRIO ÚNICO: a faixa de 6 semanas do Cockpit (que substitui a linha do
// tempo do home18 — a faixa É o calendário) e a página "Calendário" com 26 semanas, filtros por tipo e "só o que pede ação".

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { CAL19_ICON, calendar19, crunch19, type CalKind19, type Deadline19 } from '../../sim/calendar19';
import type { GameState } from '../../sim/types';
import { dateOfDay } from '../../sim/util';
import { monthName, rerender } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { calendarLayout29 } from '../ps/screens29'; // r29 REORG (S03): calendário + "Revisar período" (Atlas)
import { store } from '../store';
import { ic } from '../vis';
import { go18 } from './inbox18';
import './calendar19.css';

const KIND_NAME: Record<CalKind19, L> = {
  decision: l('Cartões', 'Cards'), echo: l('Ecos', 'Echoes'), msg: l('Mensagens', 'Messages'), contract: l('Contratos', 'Contracts'), clause: l('Cláusulas', 'Clauses'), money: l('Dinheiro', 'Money'),
  release: l('Lançamentos', 'Releases'), supply: l('Fábrica', 'Plant'), tour: l('Turnês', 'Tours'), festival: l('Festivais', 'Festivals'), build: l('Obras', 'Works'), court: l('Tribunal', 'Court'), award: l('Prêmios', 'Awards'), other: l('Outros', 'Other'),
};
const ui = { kind: 'all' as CalKind19 | 'all', act: false };
const open = (d: Deadline19) => () => { if (d.goto) go18(d.goto); };
const dateL = (s: GameState, w: number) => { const d = dateOfDay(s.config.startYear, w * 7); return `${d.dom} ${monthName(d.month).slice(0, 3)}`; };
const evBtn = (d: Deadline19, s: GameState) => h('button', {
  class: `hm18-ev c19-ev k-${d.kind} ${d.tone ?? 'info'} ${d.act ? 'act' : ''} ${d.w0 !== undefined ? 'win' : ''}`,
  title: `${t(d.t)}${d.d ? ` — ${t(d.d)}` : ''}${d.w0 !== undefined ? ` (${dateL(s, d.w0)}–${dateL(s, d.w)})` : ''}`, onclick: open(d),
}, `${CAL19_ICON[d.kind]} ${t(d.t)}`);

/** Faixa de 6 semanas (o próprio calendário, recortado). */
export function calStrip19(s: GameState, weeks = 6): HTMLElement {
  const xs = calendar19(s, { weeks: weeks - 1 });
  const cols = Array.from({ length: weeks }, (_, i) => s.week + i);
  const col = (d: Deadline19) => Math.min(weeks - 1, Math.max(0, (d.w0 !== undefined ? Math.max(d.w0, s.week) : d.w) - s.week));
  const cr = crunch19(s, weeks, 3);
  return h('section', { class: 'card hm18-tl c19-strip' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('calendar'), ' ', t(l('Calendário — próximas 6 semanas', 'Calendar — next 6 weeks'))),
      h('button', { class: 'btn small ghost', onclick: () => { store.area = 'calendar19' as typeof store.area; rerender(); } }, t(l('Ver tudo', 'See all')), ` (${calendar19(s).length})`)),
    h('div', { class: 'hm18-weeks c19-weeks' }, cols.map((w, i) => {
      const here = xs.filter((d) => col(d) === i);
      const hot = cr.some((c) => c.w === w);
      return h('div', { class: `hm18-wk ${i === 0 ? 'now' : ''} ${hot ? 'c19-hot' : ''}` },
        why18(s, 'cal19.week', { w }, h('small', null, i === 0 ? t(l('agora', 'now')) : dateL(s, w), hot ? ' 🔥' : '')),
        here.slice(0, 3).map((d) => evBtn(d, s)),
        here.length > 3 ? h('button', { class: 'link small', onclick: () => { store.area = 'calendar19' as typeof store.area; rerender(); } }, `+${here.length - 3}`) : null);
    })),
    xs.length ? null : h('p', { class: 'muted small' }, t(l('Agenda livre: um bom momento para gravar ou lançar algo.', 'Clear schedule: a good time to record or release something.'))));
}

function page(s: GameState): HTMLElement {
  const all = calendar19(s, { weeks: 26 });
  const kinds = [...new Set(all.map((d) => d.kind))];
  const xs = all.filter((d) => (ui.kind === 'all' || d.kind === ui.kind) && (!ui.act || d.act));
  const byM = new Map<string, Deadline19[]>();
  for (const d of xs) { const dt = dateOfDay(s.config.startYear, d.w * 7); const k = `${dt.year}-${String(dt.month).padStart(2, '0')}`; byM.set(k, [...(byM.get(k) ?? []), d]); }
  const chip = (k: CalKind19 | 'all', lb: string, n: number) => h('button', { class: `btn small ${ui.kind === k ? 'primary' : 'ghost'}`, 'aria-pressed': String(ui.kind === k), onclick: () => { ui.kind = k; rerender(); } }, lb, ` (${n})`);
  return calendarLayout29(h('div', { class: 'c19-page' },
    h('h2', null, ic('calendar'), ' ', t(l('Calendário', 'Calendar'))),
    h('p', { class: 'muted small' }, t(l('Tudo o que tem data, num só lugar: cartões com prazo, ecos que podem voltar, mensagens que vencem, contratos e cláusulas, prestação de contas, lançamentos e fábrica, turnês, festivais, obras, tribunal, empréstimos e prêmios. Passe o mouse na semana para o resumo.', 'Everything with a date, in one place: timed cards, echoes that may return, expiring messages, contracts and clauses, royalty statements, releases and the plant, tours, festivals, works, court, loans and awards. Hover a week for the summary.'))),
    calStrip19(s),
    h('div', { class: 'c19-filters', role: 'toolbar', 'aria-label': t(l('Filtros', 'Filters')) },
      chip('all', t(l('Tudo', 'All')), all.length), kinds.map((k) => chip(k, `${CAL19_ICON[k]} ${t(KIND_NAME[k])}`, all.filter((d) => d.kind === k).length)),
      h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: ui.act, onchange: () => { ui.act = !ui.act; rerender(); } }), ' ', t(l('Só o que pede ação', 'Only what needs action')))),
    xs.length ? [...byM.entries()].map(([k, ds]) => {
      const [y, m] = k.split('-').map(Number);
      return h('section', { class: 'card c19-month' }, h('h3', null, `${monthName(m)} ${y}`),
        h('ul', { class: 'c19-list' }, ds.map((d) => h('li', { class: `${d.tone ?? 'info'} ${d.act ? 'act' : ''}` },
          h('span', { class: 'c19-date' }, d.w0 !== undefined ? `${dateL(s, Math.max(s.week, d.w0))}–${dateL(s, d.w)}` : dateL(s, d.w)),
          h('span', { class: 'c19-ic', 'aria-hidden': 'true' }, CAL19_ICON[d.kind]),
          h('span', { class: 'c19-tx' }, h('b', null, t(d.t)), d.d ? h('small', { class: 'muted' }, ' — ', t(d.d)) : null, d.act ? h('small', { class: 'c19-need' }, ' ', t(l('pede ação', 'needs action'))) : null),
          d.goto ? h('button', { class: 'btn small ghost', onclick: open(d) }, '›') : null))));
    }) : h('p', { class: 'muted' }, t(l('Nada com data nos próximos 6 meses com esse filtro.', 'Nothing dated in the next 6 months with this filter.')))), s);
}

registerArea({ id: 'calendar19', label: l('Calendário', 'Calendar'), icon: 'calendar', key: '', render: page,
  badge: (s) => calendar19(s, { weeks: 1 }).filter((d) => d.act && d.w0 === undefined).length || undefined });

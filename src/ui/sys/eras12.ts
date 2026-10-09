// Interface da estrutura da empresa x era (rodada 12): encaixe, o que a era exige x como a equipe está
// dividida, o efeito de cada departamento agora, remanejamento e histórico das viradas.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  CHOICE_NAME, DEPTS, DEPT_FX, DEPT_NAME, MOVE_STEP, SHIFT_WHY, coverage, demandNow, deptK, fitOf, moveCost, moveStaff, org12, platformDependence, type Dept,
} from '../../sim/sys/eras12';
import { currentEra, eraById } from '../../sim/sys/eras8';
import type { GameState } from '../../sim/types';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerSection, registerTab } from '../registry';
import { meter } from '../vis';

const pct = (x: number) => `${Math.round(x * 100)}%`;

function orgPanel(s: GameState): HTMLElement {
  const o = org12(s);
  const e = currentEra(s);
  const dem = demandNow(s);
  const fit = fitOf(s);
  let from: Dept = DEPTS.slice().sort((a, b) => o.alloc[b] - dem[b] - (o.alloc[a] - dem[a]))[0];
  let to: Dept = DEPTS.slice().sort((a, b) => dem[b] - o.alloc[b] - (dem[a] - o.alloc[a]))[0];
  const pending = s.decisions.some((d) => d.eventId === `org12_${e.id}`);
  return h('div', { class: 'panel org12' },
    section(`${t(l('Estrutura da empresa', 'Company structure'))} — ${t(e.name)}`,
      h('p', { class: 'lead' }, t(SHIFT_WHY[e.id])),
      meter('building', l('Encaixe com a era', 'Fit with the era'), fit * 100),
      h('p', { class: 'small muted' }, t(l('Encaixe muda o apelo de todos os seus discos (de −8% a +5%) e, abaixo de 90%, custa retrabalho todo mês. Quando a era vira, o encaixe cai sozinho: a equipe que era eficiente fica no lugar errado.', 'Fit shifts the appeal of all your records (−8% to +5%) and, below 90%, costs rework every month. When the era turns, fit drops by itself: the staff that was efficient is in the wrong place.'))),
      pending ? h('p', { class: 'small warn' }, t(l('A decisão de reorganização está na sua mesa.', 'The reorganization decision is on your desk.'))) : null,
      o.target ? h('p', { class: 'small' }, pill(t(l('transição em curso', 'transition under way')), 'warn'), ' ', t(l('A equipe migra ~20% por mês rumo à era.', 'Staff migrate ~20% a month toward the era.'))) : null,
      s.week < o.disrupt ? h('p', { class: 'small' }, pill(t(l('caos interno', 'internal chaos')), 'bad'), ' ', t(l('Reestruturação: −5% de apelo até a semana {w}.', 'Restructuring: −5% appeal until week {w}.'), { w: o.disrupt })) : null,
      s.week < o.legacy ? h('p', { class: 'small' }, pill(t(l('especialista do passado', 'old-era specialist')), 'good'), ' ', t(l('Catálogo +8% até a semana {w}.', 'Catalog +8% until week {w}.'), { w: o.legacy })) : null,
      platformDependence(s) ? h('p', { class: 'small warn' }, t(l('Dependência de plataforma: com mais de 60% da equipe em dados e digital, as plataformas espremem seus repasses (−4% vendas).', 'Platform dependence: with over 60% of staff in data and digital, platforms squeeze your payouts (−4% sales).'))) : null,
      h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, ...[l('Departamento', 'Department'), l('A era pede', 'Era demands'), l('Você tem', 'You have'), l('Efeito agora', 'Effect now')].map((x) => h('th', null, t(x))))),
        h('tbody', null, DEPTS.map((d) => {
          const c = coverage(s, d);
          const k = deptK(s, d);
          return h('tr', null, h('td', null, h('b', null, t(DEPT_NAME[d])), h('div', { class: 'small muted' }, t(DEPT_FX[d]))), h('td', null, pct(dem[d])), h('td', null, pct(o.alloc[d])),
            h('td', null, c === null ? h('span', { class: 'muted' }, t(l('irrelevante nesta era', 'irrelevant this era'))) : pill(`${k >= 0 ? '+' : ''}${Math.round(k * 100)}%`, k >= 0 ? 'good' : 'bad')));
        }))),
      h('div', { class: 'row wrap small' },
        t(l('Remanejar {p} da equipe de', 'Move {p} of staff from'), { p: pct(MOVE_STEP) }), ' ',
        select<Dept>(from, DEPTS.map((d) => ({ value: d, label: t(DEPT_NAME[d]) })), (v) => (from = v)), ' ', t(l('para', 'to')), ' ',
        select<Dept>(to, DEPTS.map((d) => ({ value: d, label: t(DEPT_NAME[d]) })), (v) => (to = v)), ' ',
        h('button', { class: 'btn small', onclick: () => { const er = moveStaff(s, from, to); toast(t(er ?? l('Equipe remanejada.', 'Staff moved.')), er ? 'bad' : 'good'); rerender(); } }, `${t(l('Remanejar', 'Move'))} (${$(moveCost(s))})`)),
    ),
    o.log.length ? section(t(l('Viradas e reorganizações', 'Shifts and reorganizations')),
      h('ul', { class: 'small' }, o.log.slice().reverse().map((x) => h('li', null, `${x.y} — `, h('b', null, t(eraById[x.era].name)), ': ', t(l('encaixe caiu para {f}%', 'fit dropped to {f}%'), { f: x.fit }), x.choice ? [' → ', t(CHOICE_NAME[x.choice])] : null)))) : null,
  );
}

registerTab('business', { id: 'org12', label: l('Estrutura x era', 'Structure vs era'), icon: 'building', order: 2, render: orgPanel, badge: (s) => (s.decisions.some((d) => d.eventId.startsWith('org12_')) ? 1 : undefined) });

registerSection('desk', { id: 'org12', order: 31, render: (s) => {
  const f = fitOf(s);
  return f >= 0.8 ? null : section(t(l('Estrutura desalinhada com a era', 'Structure misaligned with the era')), h('p', { class: 'small' }, t(l('Encaixe {f}%: veja Negócios → Estrutura x era.', 'Fit {f}%: see Business → Structure vs era.'), { f: Math.round(f * 100) })));
} });

// Mercado: rivais e profissionais (GDD §10, §19). r27 (AUD1): o painel antigo de scouting e pipeline (graus, pedido
// de scout, aprofundar na hora) saiu — a tela Talentos (talentos23) é a única, sobre o motor único scout23.

import { STAFF_ROLES } from '../../data/rules';
import { l } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { hireStaff } from '../../sim/economy';
import type { GameState } from '../../sim/types';
import { $, cityLink, labelLink, rerender, section, toast } from '../common';
import { h } from '../dom';
import { hqCaps } from '../../sim/branches';
import { crewProfileCell } from '../sys/crew8';
import { staffStars18 } from '../ab18stars';
import { ent27 } from '../ps/ent27'; // r27 (CTX)
import { a29 } from '../art29ui'; // r29 (arte)
import { labelMarkImg28 } from '../pixel/extras28';

export function rivals(s: GameState): HTMLElement {
  const labels = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.revenueLastYear - a.revenueLastYear);
  const famName: Record<string, string> = { A: t(l('Estrelas e escala', 'Stars & scale')), B: t(l('Descoberta e cenas', 'Discovery & scenes')), C: t(l('Hits e comunicação', 'Hits & publicity')), D: t(l('Patrimônio e catálogo', 'Heritage & catalog')) };
  return section(t(S.rivals),
    h('p', { class: 'muted small' }, t(l('A IA dos rivais segue regras e observa só informação pública. Receita mostrada é a do último ano fechado.', 'Rival AI follows rules and only sees public information. Revenue shown is for the last closed year.'))),
    h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, h('th', null, t(l('Selo', 'Label'))), h('th', null, t(l('Família', 'Family'))), h('th', null, t(S.city)), h('th', null, t(S.roster)), h('th', null, t(S.revenue)), h('th', null, t(S.territories)), h('th', null, t(l('Última decisão', 'Last decision'))))),
      h('tbody', null, labels.map((lb) => h('tr', null,
        h('td', null, a29(labelMarkImg28(lb.id, lb.name, lb.founded, 20)), labelLink(s, lb.id)), // r29: marca do selo
        h('td', null, `${lb.family} · ${famName[lb.family]}`),
        h('td', null, cityLink(lb.city)),
        h('td', null, lb.roster.length),
        h('td', null, $(lb.revenueLastYear)),
        h('td', null, lb.territories.length),
        h('td', { class: 'muted small' }, t(lb.lastDecision) || '—'),
      ))),
    ),
  );
}

export function professionals(s: GameState): HTMLElement {
  const cap = hqCaps(s).staff;
  return section(`${t(S.professionals)} — ${t(S.staff)} ${s.player.staff.length}/${cap}`,
    h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, h('th', null, t(l('Nome', 'Name'))), h('th', null, t(l('Função', 'Role'))), h('th', null, t(l('Habilidade', 'Skill'))), h('th', null, t(l('Salário/mês', 'Salary/mo'))), h('th', null, ''))),
      h('tbody', null, s.professionals.map((p) => {
        const role = STAFF_ROLES.find((r) => r.id === p.role);
        return h('tr', null,
          h('td', null, h('span', { class: 'ent27', tabindex: '0', ...ent27('person', `s:${p.id}`) }, p.name)),
          h('td', { title: t(role?.desc) }, t(role?.name), h('div', null, crewProfileCell(s, p))),
          h('td', null, p.skill, ' ', staffStars18(s, p)),
          h('td', null, $(p.salary)),
          h('td', null, h('button', { class: 'btn small', disabled: s.player.staff.length >= cap, onclick: () => { const e = hireStaff(s, p.id); if (e) toast(t(e), 'bad'); rerender(); } }, t(S.hire))),
        );
      })),
    ),
    h('p', { class: 'muted small' }, t(l('A lista muda a cada trimestre.', 'The list changes every quarter.'))),
  );
}

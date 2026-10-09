// Rodada 14 — barras de capacidade: mesa do mês, equipe (Empresa › Equipe), página do ato e ficha do rival.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { actCapacity, busyWhy, cap14, deskLines, overbookedActs, playerTime, roleLoads, rivalSignCap, rivalSignsLeft, scoutInPerson, staffRows } from '../../sim/sys/capacity14';
import { scoutActionsPerMonth } from '../../sim/scouting';
import type { GameState } from '../../sim/types';
import { actLink, pill, rerender, section, toast } from '../common';
import { bar, h } from '../dom';
import { registerPageTab, registerSection } from '../registry';
import { store } from '../store';
import { loadBar } from '../vis';

const tone = (pct: number) => (pct > 100 ? 'bad' : pct >= 85 ? 'warn' : 'good');
const row = (label: string, used: number, max: number, why?: L, cls = '') =>
  h('div', { class: 'cap14-row', title: why ? t(why) : '' },
    h('div', { class: 'row' }, h('b', { class: cls }, label), h('span', { class: `small ${tone((used / Math.max(1, max)) * 100)}` }, ` ${used}/${max}`)),
    bar(used, Math.max(1, max), tone((used / Math.max(1, max)) * 100)),
    why ? h('div', { class: 'muted small' }, t(why)) : null);

function scoutBtn(s: GameState): HTMLElement | null {
  if (s.scoutActionsUsed < scoutActionsPerMonth(s)) return null;
  return h('button', { class: 'btn small', title: t(l('Gasta 1 do seu tempo livre e devolve 1 ação de scouting neste mês.', 'Spends 1 of your free time and gives back 1 scouting action this month.')), onclick: () => { const e = scoutInPerson(s); toast(t(e ?? l('Você vai pessoalmente: +1 ação de scouting.', 'You go in person: +1 scouting action.')), e ? 'bad' : 'good'); rerender(); } }, t(l('Ir em pessoa (1 ⏱)', 'Go in person (1 ⏱)')));
}

// ---------------------------------------------------------------- mesa do mês

registerSection('desk', {
  id: 'cap14', order: 30,
  render: (s) => {
    const pt = playerTime(s);
    const over = overbookedActs(s);
    const roles = roleLoads(s).filter((r) => r.load > 100);
    const c = cap14(s);
    return section(t(l('Quem tem tempo este mês', 'Who has time this month')),
      h('p', { class: 'muted small' }, t(l('Cada um tem o seu tempo: suas bolinhas pagam só o que é seu; as bandas gastam as horas dos membros; a equipe tem horas por função. Mais artistas cabem no catálogo enquanto houver gente para fazer o trabalho.', 'Everyone has their own time: your dots pay only for what is yours; bands spend their members\' hours; staff have hours per role. More acts fit the roster as long as someone is there to do the work.'))),
      deskLines(s).map((x) => row(t(x.label), x.used, x.max, x.why, x.tone ?? '')),
      pt.uses.length ? h('p', { class: 'small' }, `${t(l('Seu tempo foi para', 'Your time went to'))}: `, pt.uses.map((u) => `${t(u.label)} ×${u.n}`).join(' · ')) : null,
      scoutBtn(s),
      over.length ? h('div', null, h('h4', { class: 'bad' }, t(l('Bandas acima do limite', 'Acts over the limit'))),
        h('ul', { class: 'small' }, over.map(({ act, cap }) => h('li', null, actLink(s, act.id), ` ${cap.max}% — `, t(busyWhy(s, act, 0) ?? l('', '')))))) : null,
      roles.length ? h('div', null, h('h4', { class: 'warn' }, t(l('Equipe sobrecarregada', 'Overloaded staff'))),
        h('ul', { class: 'small' }, roles.map((r) => h('li', null, h('b', null, t(r.name)), ` ${r.load}% — ${r.demand} ${t(r.unit)} / ${r.supply}${r.strain ? ` · ${t(l('{n} mês(es) seguidos', '{n} month(s) in a row'), { n: r.strain })}` : ''}`)))) : null,
      c.log.length ? h('details', null, h('summary', { class: 'small' }, t(l('Registro de capacidade', 'Capacity log'))), h('ul', { class: 'small' }, c.log.slice(0, 8).map((x) => h('li', { class: x.tone === 'bad' ? 'bad' : '' }, t(x.t))))) : null,
    );
  },
});

// ---------------------------------------------------------------- scouting em pessoa (Mercado)

registerSection('market', {
  id: 'cap14', order: 20,
  render: (s) => {
    const b = scoutBtn(s);
    if (!b) return null;
    return h('div', { class: 'panel small' }, t(l('A equipe esgotou as ações de scouting do mês.', 'The team used up this month\'s scouting actions.')), ' ', b);
  },
});

// ---------------------------------------------------------------- equipe

registerSection('company', {
  id: 'cap14', order: 20,
  render: (s) => {
    if (store.companyTab !== 'staff' || !s.player.staff.length) return null;
    const rows = staffRows(s);
    return section(t(l('Carga da equipe neste mês', 'Staff workload this month')),
      h('p', { class: 'muted small' }, t(l('Trabalho delegado gasta as horas de quem foi contratado para ele. Acima de 115% por três meses seguidos, alguém se esgota: perde rendimento ou pede as contas.', 'Delegated work spends the hours of whoever was hired for it. Above 115% for three months in a row, someone burns out: loses skill or quits.'))),
      roleLoads(s).map((r) => row(`${t(r.name)} (${r.staff.length})`, r.demand, r.supply, l(`${r.demand} ${r.unit.pt}`, `${r.demand} ${r.unit.en}`))),
      h('table', { class: 'tbl compact' }, h('tbody', null, rows.map((x) => h('tr', null, h('td', null, x.m.name), h('td', { style: 'min-width:120px' }, bar(x.load, 100, tone(x.load)), h('small', { class: tone(x.load) }, ` ${x.load}%`)), h('td', { class: 'muted small' }, t(x.task)))))));
  },
});

// ---------------------------------------------------------------- página do ato

registerPageTab('act', {
  id: 'cap14', label: l('Tempo da banda', 'Band time'), icon: 'clock', order: 40,
  when: (s, id) => s.acts[id]?.owner === 'player',
  render: (s, id) => {
    const act = s.acts[id];
    if (!act) return null;
    const c = actCapacity(s, act);
    const why = busyWhy(s, act, 0);
    return h('div', null,
      h('p', { class: 'small' }, t(l('Livre para novas ações este mês: {f}% (o membro mais ocupado define). Gravar, compor, ensaiar, divulgar e excursionar disputam as mesmas horas — e nada disso tira o seu tempo.', 'Free for new actions this month: {f}% (the busiest member sets it). Recording, writing, rehearsing, promo and touring compete for the same hours — and none of it takes your time.'), { f: c.free }), ' ', pill(`${c.free}%`, tone(100 - c.free))),
      c.members.map((m) => h('div', { class: 'cap14-row' }, h('b', null, m.name), loadBar(m.parts.map((p) => ({ label: t(p.label), load: p.load }))))),
      why ? h('p', { class: c.max > 100 ? 'bad small' : 'warn small' }, t(why)) : null,
      c.max > 100 ? h('p', { class: 'muted small' }, t(l('Acima de 100%: cansaço e estresse no fim do mês; dois meses acima de 125% podem virar esgotamento.', 'Above 100%: fatigue and stress at month end; two months above 125% can become burnout.'))) : null);
  },
});

// ---------------------------------------------------------------- selo rival

registerPageTab('label', {
  id: 'cap14', label: l('Capacidade', 'Capacity'), icon: 'clock', order: 12,
  when: (s, id) => !!s.labels[id]?.active,
  render: (s, id) => {
    const lb = s.labels[id];
    if (!lb) return null;
    const cap = rivalSignCap(lb), left = rivalSignsLeft(s, lb);
    return h('div', null, row(t(l('Contratações neste mês', 'Signings this month')), cap - left, cap,
      l('O A&R deles também é gente: um selo só fecha alguns contratos por mês, por mais dinheiro que tenha. Se esgotou, os artistas livres ficam ao seu alcance até o mês virar.', 'Their A&R are people too: a label can close only a few deals a month, however rich. When they are out, free acts stay within your reach until the month turns.')));
  },
});

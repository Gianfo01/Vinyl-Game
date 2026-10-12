// Rodada 19 (Frente 8, P1) — topo do Cockpit: "Hoje / Ameaças / Andamento". Junta as três perguntas do saga18
// (que eram uma seção perdida no meio da Mesa) com o calendário único: contagem, ordem por risco (ruim primeiro) e
// "ir para" em cada linha. A seção antiga 'long18-3q' sai da Mesa (mesmo conteúdo, agora no topo).

import { allClear23, badge23 } from '../../sim/counters23';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { calendar19, crunch19 } from '../../sim/calendar19';
import { cockpit18, type Q18 } from '../../sim/sys/saga18';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { rerender } from '../common';
import { h } from '../dom';
import { hideSection } from '../registry';
import { ic } from '../vis';
import { go18 } from './inbox18';

hideSection((host, id) => host === 'desk' && id === 'long18-3q');

const RANK: Record<string, number> = { bad: 0, warn: 1, info: 2, good: 3 };
const ui = { more: '' };
export interface Head19 { today: Q18[]; threats: Q18[]; going: Q18[] }
/** As três listas, já com o calendário (prazos desta semana em "Hoje"; semanas apertadas e prazos ruins em "Ameaças"). */
export function head19(s: GameState): Head19 {
  const c = cockpit18(s);
  const today = [...c.now], threats = [...c.threats];
  const nothing = today.length === 1 && today[0].tone === 'good';
  const cal = calendar19(s, { weeks: 1 }).filter((d) => d.act && d.w0 === undefined && d.kind !== 'decision' && d.kind !== 'msg');
  if (cal.length && nothing) today.length = 0;
  for (const d of cal.slice(0, 3)) today.push({ tone: 'bad', t: fmtL(l('Vence esta semana: {t}', 'Due this week: {t}'), { t: d.t }), goto: d.goto });
  for (const x of crunch19(s, 6, 3).slice(0, 1)) threats.unshift({ tone: 'bad', t: fmtL(l('Semana apertada daqui a {w} semana(s): {n} prazos juntos.', 'Crunch week in {w} week(s): {n} deadlines together.'), { w: Math.max(0, x.w - s.week), n: x.items.length }), goto: { area: 'calendar19' } });
  for (const d of calendar19(s, { weeks: 6 }).filter((x) => x.tone === 'bad' && x.w0 === undefined && x.w - s.week >= 2 && (x.kind === 'contract' || x.kind === 'clause' || x.kind === 'court' || x.kind === 'supply')).slice(0, 2)) threats.push({ tone: 'info', t: fmtL(l('Em {w} semanas: {t}', 'In {w} weeks: {t}'), { w: d.w - s.week, t: d.t }), goto: d.goto });
  const sort = (xs: Q18[]) => xs.sort((a, b) => (RANK[a.tone] ?? 2) - (RANK[b.tone] ?? 2));
  return { today: sort(today), threats: sort(threats), going: sort([...c.works]) };
}

function col(id: string, title: L, icon: string, qs: Q18[], empty: L): HTMLElement {
  // r23 (B): número só conta problema real; informativo = ponto neutro; "tudo bem" some (sem selo, mostra o texto vazio)
  if (allClear23(qs)) qs = [];
  const b = badge23(qs);
  const all = ui.more === id;
  return h('section', { class: 'h19-col', 'aria-label': t(title) },
    h('h3', null, ic(icon), ' ', t(title), ' ', b.n ? h('span', { class: 'h19-n bad', title: t(l('{n} pedem atenção', '{n} need attention'), { n: b.n }) }, String(b.n)) : b.dot ? h('span', { class: 'h19-dot', title: t(l('Só informação', 'Information only')), 'aria-label': t(l('Só informação', 'Information only')) }, '•') : null),
    qs.length ? h('ul', null, qs.slice(0, all ? 12 : 3).map((q) => h('li', { class: q.tone }, h('span', null, t(q.t)), q.goto ? h('button', { class: 'btn small ghost', 'aria-label': t(l('Ir', 'Go')), onclick: () => go18(q.goto!) }, '›') : null)))
      : h('p', { class: 'muted small' }, t(empty)),
    qs.length > 3 ? h('button', { class: 'link small', onclick: () => { ui.more = all ? '' : id; rerender(); } }, all ? t(l('menos', 'less')) : t(l('+{n} mais', '+{n} more'), { n: qs.length - 3 })) : null);
}
/** Cabeçalho fixo do Cockpit. */
export function head19View(s: GameState): HTMLElement {
  const x = head19(s);
  return h('div', { class: 'h19', role: 'region', 'aria-label': t(l('Resumo: hoje, ameaças e andamento', 'Summary: today, threats and progress')) },
    col('today', l('Hoje', 'Today'), 'calendar', x.today, l('Nada exige você agora.', 'Nothing needs you now.')),
    col('threats', l('Ameaças', 'Threats'), 'skull', x.threats, l('Nenhuma ameaça à vista.', 'No threats in sight.')),
    col('going', l('Andamento', 'Progress'), 'chart-up', x.going, l('Ainda sem leitura de resultado.', 'No results to read yet.')));
}

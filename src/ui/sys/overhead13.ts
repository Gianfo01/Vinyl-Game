// Rodada 13 — Empresa › Finanças: quebra das despesas gerais com o "porquê" de cada linha.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { eraName, launchPromo, oh, overheadPlan, realAnnual, capRate } from '../../sim/sys/overhead13';
import type { GameState } from '../../sim/types';
import { $ } from '../common';
import { h } from '../dom';
import { registerSection } from '../registry';

const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n)));

registerSection('company', {
  id: 'overhead13',
  order: 60,
  render: (s: GameState) => {
    const R = realAnnual(s);
    const p = overheadPlan(s, R);
    const last = oh(s).last;
    const lines = last && last.lines.length ? last.lines : p.lines;
    const total = lines.reduce((x, y) => x + y.amount, 0);
    const o = oh(s);
    const pct = last && last.rate ? `${(last.rate * 100).toFixed(1)}%` : '0%';
    return h('section', { class: 'panel' },
      h('h3', null, t(l('Despesas gerais por porte e época', 'Overhead by size and era'))),
      h('p', { class: 'small' },
        h('b', null, t(p.tier.name)), ` · ${t(eraName(s.year))} · ${t(l('faturamento anual (média)', 'annual revenue (avg)'))} ~US$ ${short(R)} (${t(l('dólares de 2020', '2020 dollars'))}) · ${t(l('teto', 'cap'))} ${(capRate(R) * 100).toFixed(0)}% ${t(l('da receita', 'of revenue'))}`),
      lines.length
        ? h('table', { class: 'tbl compact' }, h('tbody', null,
          lines.map((x) => h('tr', null, h('td', null, t(x.label), h('div', { class: 'muted small' }, t(x.why))), h('td', { class: 'bad' }, $(-x.amount)))),
          h('tr', null, h('td', null, h('b', null, `${t(l('Total por mês', 'Total per month'))} (${pct} ${t(l('da receita', 'of revenue'))})`)), h('td', { class: 'bad' }, $(-total)))))
        : h('p', { class: 'muted small' }, t(l('Operação pequena: sem estrutura extra por enquanto. Burocracia, jurídico e equipes aparecem quando o selo cresce.', 'Small operation: no extra structure yet. Bureaucracy, legal and teams appear as the label grows.'))),
      last?.capped ? h('p', { class: 'muted small' }, t(l('O teto de despesas limitou o total neste mês: a conta foi reduzida proporcionalmente.', 'The overhead cap limited the total this month: every line was scaled down.'))) : null,
      h('p', { class: 'small' }, `${t(l('Promoção mínima por lançamento', 'Baseline promo per release'))}: ${t(l('single', 'single'))} ${$(launchPromo(s, { type: 'single', territories: s.player.territories }, R).amount)} · LP ${$(launchPromo(s, { type: 'lp', territories: s.player.territories }, R).amount)}`,
        h('span', { class: 'muted' }, ` — ${t(launchPromo(s, { type: 'lp', territories: s.player.territories }, R).why)}${o.promoN ? ` · ${t(l('pago até agora', 'paid so far'))}: ${$(-o.promo)} (${o.promoN})` : ''}`)));
  },
});

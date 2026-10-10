// Rodada 18 (econ18): eras que coexistem (adoção por mercado e idade do público) e futuro especulativo revelado ano a ano.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { adoptionTable18, specShown18 } from '../../sim/sys/eras18';
import type { GameState } from '../../sim/types';
import { pill, section } from '../common';
import { h } from '../dom';
import { registerTab } from '../registry';

const pct = (x: number) => `${Math.round(x * 100)}%`;

function render(s: GameState): HTMLElement {
  const rows = adoptionTable18(s);
  const spec = specShown18(s);
  return h('div', null,
    section(t(l('Eras que coexistem: como cada mercado ouve em {y}', 'Coexisting eras: how each market listens in {y}'), { y: s.year }),
      h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Mercado', 'Market'))), h('th', null, t(l('Físico — público jovem', 'Physical — young audience'))), h('th', null, t(l('Físico — público maduro', 'Physical — older audience'))), h('th', null, t(l('Streaming', 'Streaming'))))),
        h('tbody', null, rows.map((r) => h('tr', null, h('td', null, t(r.name)), h('td', null, pct(r.young)), h('td', null, pct(r.old)), h('td', null, r.stream ? pct(r.stream) : '—'))))),
      h('p', { class: 'muted small' }, t(l('A tecnologia não muda no mundo todo de uma vez: cada país chega ao digital com seu atraso, e o público mais velho (jazz, sacro, folk) segue no disco e no rádio por mais tempo. Cada lançamento vende físico conforme os mercados e o público do gênero — o que muda a prensagem, o estoque e o prazo de pagamento.', 'Technology does not switch worldwide at once: each country reaches digital with its own lag, and older audiences (jazz, sacred, folk) stay with records and radio longer. Each release sells physical according to its markets and its genre\'s audience — which changes pressing, stock and payment terms.')))),
    s.year >= 2027 ? section(t(l('Futuro especulativo (2027–2040)', 'Speculative future (2027–2040)')),
      spec.length ? h('ul', null, spec.map((x) => h('li', null, pill(t(l('especulativo', 'speculative')), 'warn'), ' ', h('b', null, t(x.name)), ` (${x.y}) — `, t(x.text)))) : h('p', { class: 'muted small' }, t(l('Nenhum caminho decidido ainda.', 'No path decided yet.'))),
      h('p', { class: 'muted small' }, t(l('Depois de 2026 a partida segue cenários inventados, sorteados por jogo: outra partida pode tomar outro caminho.', 'After 2026 the game follows invented scenarios drawn per run: another game may take a different path.')))) : null,
  );
}

registerTab('business', { id: 'eras18', label: l('Adoção e futuro', 'Adoption and future'), icon: 'clock', render });

// Rodada 12 — interface do "Por que deu nisso?" ampliado: caixa de previsão (antes) e leituras (depois)
// para contratações, renovações, turnês e festivais.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { ex12, forecastFestival, type Debrief12, type Forecast12 } from '../../sim/sys/explain12';
import type { FestTier } from '../../sim/sys/fests8';
import type { GameState } from '../../sim/types';
import { N, actLink, pill } from '../common';
import { h } from '../dom';
import { registerPageTab, registerTab } from '../registry';
import { ic } from '../vis';

const pctR = (x: number) => `${Math.round(x * 100)}%`;
const KIND: Record<Debrief12['kind'], L> = { signing: l('Contratação', 'Signing'), renewal: l('Renovação', 'Renewal'), tour: l('Turnê', 'Tour'), festival: l('Festival', 'Festival') };

/** Caixa "antes da decisão": faixa provável, riscos e qualidade da informação. */
export function forecastBox(fc: Forecast12): HTMLElement {
  const range = fc.unit === 'chance' ? `${pctR(fc.lo)}–${pctR(fc.hi)}` : `${N(Math.round(fc.lo))}–${N(Math.round(fc.hi))}`;
  const qc = fc.info.q < 0.35 ? 'bad' : fc.info.q < 0.55 ? 'warn' : 'good';
  return h('div', { class: 'eval x12-fc' },
    h('div', null, ic('chart-up'), ' ', h('b', null, t(fc.headline)), ': ', pill(range, fc.unit === 'chance' ? (fc.lo > 0.6 ? 'good' : fc.hi < 0.35 ? 'bad' : 'warn') : ''),
      ' ', h('small', { class: 'muted' }, t(l('informação', 'information')), ' '), pill(t(fc.info.label), qc)),
    fc.risks.length ? h('ul', { class: 'small' }, fc.risks.slice(0, 4).map((r) => h('li', null, ic('warning'), ' ', t(r)))) : null,
    fc.info.why.length ? h('p', { class: 'muted small' }, fc.info.why.map((w) => t(w)).join(' ')) : null,
    h('p', { class: 'muted small' }, t(l('Faixa, não promessa: humor, mercado e acaso ainda mexem no resultado. Informação ruim também pode enganar o centro da faixa.', 'A range, not a promise: mood, market and chance still move the outcome. Poor information can also skew the center of the range.'))),
  );
}

/** Previsão para o formulário de festival (lê o formulário na hora do clique). */
export function festForecast12(s: GameState, fi: number, form: { actId: string; tier: FestTier; fee: number }): HTMLElement {
  const box = h('div');
  const btn = h('button', { class: 'btn small ghost', onclick: () => box.replaceChildren(form.actId ? forecastBox(forecastFestival(s, fi, form.actId, form.tier, form.fee)) : h('span')) }, ic('chart-up'), ' ', t(l('Ler as chances antes', 'Read the odds first')));
  return h('div', null, btn, box);
}

export function debriefCard(s: GameState, d: Debrief12): HTMLElement {
  const col = (title: L, items: L[], cls: string) => h('div', null, h('b', { class: cls }, t(title)), items.length ? h('ul', { class: 'small' }, items.map((x) => h('li', null, t(x)))) : h('p', { class: 'muted small' }, '—'));
  return h('div', { class: `pj-explain x12-card ${d.tone}` },
    h('h4', null, pill(t(KIND[d.kind]), d.tone === 'good' ? 'good' : d.tone === 'bad' ? 'bad' : ''), ' ', t(d.title), ' ', h('small', { class: 'muted' }, `${d.month + 1}/${d.year}`), ' ', actLink(s, d.actId)),
    h('div', { class: 'grid2' },
      col(l('O que sua escolha influenciou', 'What your choice influenced'), d.influenced, ''),
      col(l('O que aconteceu no mercado', 'What happened in the market'), d.market, ''),
    ),
    d.surprise.length ? col(l('O que surpreendeu a equipe', 'What surprised the team'), d.surprise, 'warn') : null,
  );
}

function whyTab(s: GameState): HTMLElement {
  const log = ex12(s).log;
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Leituras das suas decisões de contratação, renovação, turnê e festival. Os lançamentos têm a própria leitura na ficha do disco.', 'Readings of your signing, renewal, tour and festival decisions. Releases have their own reading on the record page.'))),
    log.length ? h('div', null, log.map((d) => debriefCard(s, d))) : h('p', { class: 'muted' }, t(l('Nada ainda: as leituras aparecem depois das decisões.', 'Nothing yet: readings appear after decisions.'))),
  );
}

registerTab('business', { id: 'why12', label: l('Por que deu nisso?', 'Why did this happen?'), icon: 'bulb', render: whyTab });
registerPageTab('act', {
  id: 'why12', label: l('Por que deu nisso?', 'Why did this happen?'), icon: 'bulb', order: 80,
  when: (s, id) => ex12(s).log.some((d) => d.actId === id),
  render: (s, id) => h('div', null, ex12(s).log.filter((d) => d.actId === id).map((d) => debriefCard(s, d))),
});

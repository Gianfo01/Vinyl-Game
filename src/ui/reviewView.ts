// Exibição das críticas completas (rodada 5): cabeçalho, estrelas, manchete, texto, notas por
// aspecto e nota dos fãs. Usada na cena de lançamento, na ficha do lançamento e na Mídia.

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { ASPECTS, ASPECT_NAMES, fanScore, reviewBody, stars } from '../sim/reviews';
import type { GameState, Release } from '../sim/types';
import type { Review } from '../sim/xtypes';
import { h } from './dom';
import { scoreBadge } from './vis';

export function reviewCard(s: GameState, rel: Release, rv: Review, opts: { open?: boolean } = {}): HTMLElement {
  const body = reviewBody(s, rel, rv);
  return h('article', { class: 'rv-card' },
    h('header', { class: 'rv-head' }, scoreBadge(rv.score), h('div', null, h('b', null, rv.outlet), h('small', { class: 'muted' }, ` — ${rv.critic}`), h('div', { class: 'rv-stars', 'aria-label': `${rv.score}/10` }, stars(rv.score)))),
    h('p', { class: 'rv-quote' }, `“${t(rv.quote)}”`),
    body.length ? h('details', { open: opts.open !== false }, h('summary', null, t(l('Ler a crítica', 'Read the review'))), ...body.map((p) => h('p', null, t(p)))) : null,
    rv.aspects ? h('ul', { class: 'rv-aspects' }, ASPECTS.filter((k) => rel.songs.length > 1 || k !== 'cohesion').map((k) => {
      const v = rv.aspects![k];
      return h('li', null, h('span', null, t(ASPECT_NAMES[k])), h('span', { class: 'bar' }, h('span', { style: `width:${v * 10}%` })), h('b', null, v.toFixed(1)));
    })) : null,
  );
}

export function reviewSummary(s: GameState, rel: Release): HTMLElement | null {
  const rv = s.reviews[rel.id];
  if (!rv?.length) return null;
  const avg = rv.reduce((a, x) => a + x.score, 0) / rv.length;
  const fans = fanScore(s, rel);
  return h('div', { class: 'rv-summary' },
    h('span', null, t(l('Crítica', 'Critics')), ' ', scoreBadge(avg)),
    h('span', null, t(l('Fãs', 'Fans')), ' ', scoreBadge(fans)),
    Math.abs(avg - fans) >= 2 ? h('small', { class: 'muted' }, t(avg > fans ? l('A crítica gostou mais que o público.', 'Critics liked it more than the public.') : l('O público gostou mais que a crítica.', 'The public liked it more than the critics.'))) : null,
  );
}

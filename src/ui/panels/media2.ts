// Imprensa: resenhas com nota por crítico (viés), TV, capas de revista, assessoria de imprensa,
// crises abertas e lançamentos censurados (com recurso).

import { MARKETS, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { CRITICS, PR_AGENCIES, activeCritics, appealBan, avgReview, hirePrAgency, magazineCover, tvAppearance } from '../../sim/media';
import type { GameState } from '../../sim/types';
import { money, playerActs, rngOf } from '../../sim/util';
import { $, actLink, cover, logo, pill, releaseLink, rerender, section, toast } from '../common';
import { h } from '../dom';
import { chips, ic, scoreBadge, stat, tile } from '../vis';

export function pressSection(s: GameState): HTMLElement {
  const r = rngOf(s);
  const mine = Object.values(s.releases).filter((x) => (x.owner === 'player' || s.acts[x.actId]?.playerBand) && s.reviews[x.id]).sort((a, b) => b.week - a.week).slice(0, 8);
  return h('div', null,
    section(t(l('Resenhas', 'Reviews')), mine.length ? h('div', { class: 'reviews' }, mine.map((rel) => h('article', { class: 'review-card' },
      h('header', null, cover(s, rel, 48), h('div', null, releaseLink(s, rel.id), h('small', null, ' — ', actLink(s, rel.actId))), scoreBadge(avgReview(s, rel.id) ?? 0)),
      h('ul', null, s.reviews[rel.id].map((rv) => h('li', null, scoreBadge(rv.score), ' ', h('b', null, rv.critic), h('small', { class: 'muted' }, ` (${rv.outlet})`), ' — ', h('i', null, t(rv.quote))))),
    ))) : h('p', { class: 'muted small' }, t(l('Lançamentos recebem 3–4 resenhas de críticos com gostos próprios.', 'Releases get 3–4 reviews from critics with their own tastes.')))),
    section(t(l('Aparições e assessoria', 'Appearances and PR')),
      h('div', { class: 'cards' }, playerActs(s).map((id) => {
        const a = s.acts[id];
        return h('div', { class: 'tile' }, h('div', { class: 'tile-ic' }, logo(a, 40)), h('div', { class: 'tile-body' }, h('b', null, a.name),
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn small', onclick: () => { const e = tvAppearance(s, id); toast(t(e ?? l('No ar!', 'On air!')), e ? 'bad' : 'good'); rerender(); } }, ic('tv'), ' TV'),
            h('button', { class: 'btn small', onclick: () => { const e = magazineCover(s, r, id); toast(t(e ?? l('Capa garantida!', 'Cover secured!')), e ? 'info' : 'good'); rerender(); } }, ic('newspaper'), ' ', t(l('Capa de revista', 'Magazine cover'))),
          ),
          a.cancelledUntil && a.cancelledUntil > s.week ? pill(t(l('cancelado pelo público', 'cancelled by the public')), 'bad') : null,
        ));
      })),
      h('h4', null, t(l('Assessoria de imprensa', 'PR agency'))),
      h('div', { class: 'row wrap' },
        [{ tier: 0, name: t(l('Nenhuma', 'None')), monthly: 0 }, ...PR_AGENCIES].map((a) => h('button', { class: `btn small ${(s.prAgency?.tier ?? 0) === a.tier ? 'primary' : 'ghost'}`, onclick: () => { hirePrAgency(s, a.tier); rerender(); } }, `${a.name}${a.monthly ? ` · ${$(money(s, a.monthly))}/${t(l('mês', 'mo'))}` : ''}`)),
      ),
      h('p', { class: 'muted small' }, t(l('Assessoria melhora respostas a crises e chances de capa.', 'A PR agency improves crisis responses and cover odds.'))),
    ),
    s.bans.length ? section(t(l('Censura', 'Censorship')), h('ul', null, s.bans.slice(-8).reverse().map((b) => h('li', null, ic('lock'), ' ', releaseLink(s, b.releaseId), ` — ${t(MARKETS.find((m) => m.id === b.market)!.name)}: `, t(b.reason), ' ',
      s.releases[b.releaseId]?.owner === 'player' ? h('button', { class: 'btn small ghost', onclick: () => { toast(t(appealBan(s, r, b.releaseId, b.market)), 'info'); rerender(); } }, t(l('Recorrer', 'Appeal'))) : null)))) : null,
    section(t(l('Críticos em atividade', 'Active critics')), h('div', { class: 'cards' }, activeCritics(s).map((c) => tile('newspaper', c.name, [
      h('small', null, c.outlet, c.realRef ? h('span', { class: 'muted' }, ` (≈ ${c.realRef})`) : null),
      chips(stat('trophy', c.prestige, l('Prestígio', 'Prestige')), stat('skull', Math.round(c.harsh * 100), l('Rigor', 'Harshness')), stat('globe', c.mainstream > 0.3 ? 'mainstream' : c.mainstream < -0.3 ? 'underground' : '—', l('Preferência', 'Preference'))),
      h('small', { class: 'muted' }, t(l('Gosta de: ', 'Likes: ')), c.favors.join(', ') || '—'),
    ])))),
  );
}

void CRITICS;

// Política e religião nas telas (rodada 10): linha de visão de mundo em páginas de pessoa/elenco e no perfil do jogador.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { POL_HINT, compatOf, playerViews, relById, viewsLabel, viewsOf, polById } from '../../sim/beliefs';
import type { GameState } from '../../sim/types';
import { pill } from '../common';
import { h } from '../dom';

const compatWord = (c: number): { w: L; tone: 'good' | 'bad' | '' } =>
  c > 0.4 ? { w: l('afinidade com você', 'sympathetic to you'), tone: 'good' } : c > 0.12 ? { w: l('simpatiza com você', 'leans your way'), tone: 'good' }
  : c < -0.4 ? { w: l('atrito com você', 'clashes with you'), tone: 'bad' } : c < -0.12 ? { w: l('discorda de você', 'disagrees with you'), tone: 'bad' } : { w: l('neutro com você', 'neutral with you'), tone: '' };

/** Linha curta: "Centro (40) · Católica (62) — simpatiza com você". */
export function viewsLine(s: GameState, personId: string): HTMLElement {
  const v = viewsOf(s, personId);
  const me = playerViews(s);
  const c = personId === 'player' ? 1 : compatOf(v, me);
  const w = compatWord(c);
  return h('span', null, t(viewsLabel(v)), personId === 'player' ? null : [' ', pill(t(w.w), w.tone || undefined)]);
}

/** Bloco do perfil do jogador com o efeito de cada escolha. */
export function playerViewsBlock(s: GameState): HTMLElement {
  const v = playerViews(s);
  return h('div', { class: 'small' },
    h('p', null, h('b', null, t(l('Política: ', 'Politics: '))), t(polById[v.pol].name), v.pol === 'apolitical' ? '' : ` (${t(l('engajamento', 'engagement'))} ${v.eng})`, ' — ', h('span', { class: 'muted' }, t(POL_HINT[v.pol]))),
    h('p', null, h('b', null, t(l('Religião: ', 'Religion: '))), t(relById[v.rel].name), v.rel === 'none' || v.rel === 'atheist' ? '' : ` (${t(l('devoção', 'devotion'))} ${v.dev})`, ' — ', h('span', { class: 'muted' }, t(relById[v.rel].hint))),
    h('p', { class: 'muted' }, t(l('Visões parecidas aproximam artistas, equipe e parceiros; opostas criam atrito. Eventos pessoais, a censura e lançamentos provocativos também dependem disso.', 'Similar views bring artists, staff and partners closer; opposed ones create friction. Personal events, censorship and provocative releases depend on it too.'))),
  );
}

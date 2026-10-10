// Rodada 17 — estilo em todo cartão de música e "gêneros em alta" correlacionados às paradas; alcance mundial do
// ato (exceções globais reais, hit viral, one-hit wonder) na página do ato.

import { l } from '../../data/world';
import { stylePill17 } from './style17';
import { t } from '../../i18n/strings';
import { hotList17 } from '../../sim/sys/trends17';
import { actReach17, reach17 } from '../../sim/sys/reach17';
import { heritageLine17 } from '../../sim/sys/heritage17';
import type { GameState, Song } from '../../sim/types';
import { pill, section } from '../common';
import { bar, h } from '../dom';
import { RELEASE_SONG_EXTRAS } from '../ficha';
import { REP_SONG_EXTRAS } from '../panels/repertoire';
import { registerPageTab } from '../registry';

const songStyle = (_s: GameState, so: Song) => stylePill17(so.genre);
REP_SONG_EXTRAS.push(songStyle);
RELEASE_SONG_EXTRAS.push(songStyle);

/** Gêneros em alta = estilos das músicas em alta (fatia nas paradas), com tendência e popularidade. */
export function hotGenres17(s: GameState): HTMLElement {
  const rows = hotList17(s, 10);
  return section(t(l('Gêneros em alta', 'Hot genres')),
    h('p', { class: 'muted small' }, t(l('Medido pelas músicas nas paradas (posição pesa). Estilo em alta dá apelo a quem lança nele; estilo sem músicas nas paradas esfria.', 'Measured from the songs on the charts (position matters). A hot style boosts whoever releases in it; a style with no charting songs cools off.'))),
    rows.length ? h('ul', null, rows.map((x) => h('li', null, stylePill17(x.g), ' ', bar(x.share * 100, 30), ' ',
      h('small', null, `${Math.round(x.share * 100)}% · ${x.n} ${t(l('nas paradas', 'charting'))} `),
      h('small', { class: x.d > 0.01 ? 'good' : x.d < -0.01 ? 'bad' : 'muted' }, x.d > 0.01 ? '▲' : x.d < -0.01 ? '▼' : '='),
      h('small', { class: 'muted', title: t(l('Popularidade do gênero (entra no apelo)', 'Genre popularity (feeds appeal)')) }, ` ×${x.pop.toFixed(2)}`))))
      : h('p', { class: 'muted small' }, '—'));
}

function reachTab(s: GameState, id: string): HTMLElement | null {
  const a = s.acts[id];
  if (!a) return null;
  const r = actReach17(s, a);
  const st = reach17(s);
  const v = st.viral[id];
  const o = st.ohw[id];
  return h('div', null,
    section(t(l('Alcance mundial', 'Global reach')),
      h('p', null, t(l('Peso mundial', 'Global weight')), ': ', bar(r.v * 100, 100), ` ${Math.round(r.v * 100)} `, h('small', { class: 'muted' }, `(${t(l('país', 'country'))} ${Math.round(r.base * 100)})`)),
      h('p', { class: 'small' }, t(r.why)),
      heritageLine17(s, a) ? h('p', null, pill(t(heritageLine17(s, a)!), 'gold')) : null,
      v ? h('p', null, pill(t(l('Hit viral global', 'Global viral hit')), 'gold'), ' ', `"${v.hit}" — ${t(l('vale até a semana {w}. Outro nº 1 antes disso evita o rótulo de one-hit wonder.', 'lasts until week {w}. Another No. 1 before then avoids the one-hit-wonder label.'), { w: v.until })}`) : null,
      o ? h('p', null, pill('one-hit wonder', 'bad'), ' ', t(l('Lembrado só por "{h}" ({y}). Um novo nº 1 apaga o rótulo.', 'Remembered only for "{h}" ({y}). A new No. 1 erases the label.'), { h: o.hit, y: o.y })) : null,
      h('p', { class: 'muted small' }, t(l('Americanos viajam mais pelo mundo. Fora dos EUA, só carreiras globais consolidadas (Shakira, ABBA, BTS) ou um hit planetário (Gangnam Style, Despacito) chegam lá: nº 1 em 4+ países fora de casa dá 18 meses de alcance de astro americano.', 'Americans travel further. Outside the US, only consolidated global careers (Shakira, ABBA, BTS) or a planet-wide hit (Gangnam Style, Despacito) get there: No. 1 in 4+ countries abroad gives 18 months of US-star reach.')))),
  );
}
registerPageTab('act', { id: 'reach17', label: l('Alcance mundial', 'Global reach'), icon: 'globe', order: 62, render: reachTab });

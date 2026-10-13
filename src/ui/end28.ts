// Rodada 28 (F4) — fim com peso, na interface:
//  · "Rumo a: <final> (x/100)" no painel do Cockpit, com o prazo escolhido na Nova run (ou "sandbox") e os capítulos;
//  · capítulos por década: ao virar a década abre uma cena curta com o epitáfio parcial da década que fechou
//    (enfileirada pela interface depois do avanço — o headless nunca a vê, então os valores-ouro não mudam);
//  · fim de partida com storyboard: álbum de cenas, as 3 maiores cadeias de eco e o epitáfio. Abre no fim do prazo
//    (substitui a cena 'run17Result'), oferece "Continuar em sandbox" e também abre pela tela de fim.
// Modelo puro em src/sim/sys/end28.ts.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { queueCutscene } from '../sim/ext4';
import { runDone17, runEnd17 } from '../sim/sys/start17';
import { chapters28, closedChapter28, rumo28, storyboard28, type Chapter28, type Story28 } from '../sim/sys/end28';
import type { GameState } from '../sim/types';
import { modal } from './common';
import { h } from './dom';
import { AFTER_ADVANCE, registerCutscene } from './registry';
import { runCard17body } from './newgame17';
import { monthName } from './common';
import './end28.css';

const T = (x: L): string => t(x);

// ---------------------------------------------------------------- rumo (Cockpit)

/** Linha "Rumo a" do Cockpit: final provável (x/100), prazo e atalhos para capítulos e storyboard. */
export function rumoView28(s: GameState): HTMLElement | null {
  const r = rumo28(s);
  if (!r) return null;
  const end = runEnd17(s);
  const left = end !== null ? end - s.year : null;
  const deadline = s.flags.sandbox
    ? T(l('modo sandbox (sem prazo)', 'sandbox mode (no deadline)'))
    : end === null ? T(l('sem prazo', 'no deadline'))
      : runDone17(s) ? t(l('prazo encerrado em {y}', 'deadline ended in {y}'), { y: end })
        : t(l('fim em dezembro de {y} · faltam {n} anos', 'ends December {y} · {n} years left'), { y: end, n: Math.max(0, left ?? 0) });
  return h('section', { class: 'rumo28', 'aria-label': T(l('Rumo da partida', 'Where the run is heading')) },
    h('div', { class: 'rumo28-main' },
      h('span', { class: 'rumo28-k' }, T(l('Rumo a', 'Heading to')), ':'),
      h('b', { class: 'rumo28-f' }, T(r.name)),
      h('span', { class: 'rumo28-x', title: T(l('Quanto o seu jeito de jogar hoje combina com este final (0–100). Muda com o que você fizer.', 'How well your play today fits this ending (0–100). It changes with what you do.')) }, `(${r.score}/100)`),
      h('span', { class: 'rumo28-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${r.score}%` }))),
    h('div', { class: 'rumo28-sub small muted' },
      r.next ? h('span', null, t(l('depois: {f} ({x})', 'next: {f} ({x})'), { f: T(r.next.name), x: r.next.score }), ' · ') : null,
      h('span', null, deadline), ' · ',
      h('button', { type: 'button', class: 'link', onclick: () => openChapters28(s) }, T(l('Capítulos', 'Chapters'))), ' · ',
      h('button', { type: 'button', class: 'link', onclick: () => openStory28(s) }, T(l('Storyboard até aqui', 'Storyboard so far')))));
}

/** Põe a linha "Rumo a" logo abaixo do "Agora" no painel do Cockpit. */
export function rumoInto28(panel: HTMLElement, s: GameState): HTMLElement {
  try { const r = rumoView28(s); if (r) panel.insertBefore(r, panel.children[1] ?? null); } catch { /* o painel nunca cai por causa do rumo */ }
  return panel;
}

// ---------------------------------------------------------------- capítulos

function chapterView(c: Chapter28): HTMLElement {
  return h('article', { class: `ch28 ${c.open ? 'open' : ''}` },
    h('h4', null, t(l('Capítulo: anos {d}', 'Chapter: the {d}s'), { d: c.decade }), c.open ? h('small', { class: 'muted' }, ' — ', T(l('em andamento', 'in progress'))) : null),
    h('p', { class: 'ch28-ep' }, T(c.epitaph)),
    c.facts.length ? h('ul', { class: 'small' }, c.facts.map((f) => h('li', null, T(f)))) : null);
}

export function openChapters28(s: GameState): void {
  const xs = chapters28(s);
  modal(T(l('Capítulos da sua história', 'Chapters of your story')), h('div', { class: 'ch28-list' },
    h('p', { class: 'small muted' }, T(l('Um capítulo por década jogada. O epitáfio parcial muda até a década fechar.', 'One chapter per decade played. The partial epitaph changes until the decade closes.'))),
    ...xs.map(chapterView)), { wide: true });
}

registerCutscene('chapter28', (s, cs, close) => {
  const d = cs.data as { decade: number };
  const c = closedChapter28(s, d.decade);
  return h('div', { class: 'ch28-scene' },
    h('p', { class: 'h27-kicker gold' }, t(l('FIM DO CAPÍTULO · ANOS {d}', 'END OF CHAPTER · THE {d}s'), { d: d.decade })),
    c ? chapterView(c) : h('p', null, T(l('Uma década termina.', 'A decade ends.'))),
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: () => { close(); openChapters28(s); } }, T(l('Todos os capítulos', 'All chapters'))),
      h('button', { class: 'btn primary', onclick: close }, T(l('Começar a próxima década', 'Start the next decade')))));
}, { interrupt: 'milestone' });

/** Virada de década (janeiro de um ano terminado em 0, depois do 1º ano): enfileira a cena do capítulo, uma vez. */
export function chapterDue28(s: GameState): number | null {
  const dec = Math.floor(s.year / 10) * 10;
  const prev = dec - 10;
  if (s.year !== dec || s.month > 1 || prev + 9 < s.config.startYear) return null;
  if ((s.flags.ch28 ?? 0) >= prev) return null;
  return prev;
}
AFTER_ADVANCE.push((s) => {
  try {
    const prev = chapterDue28(s);
    if (prev === null) return;
    s.flags.ch28 = prev; // marca de interface (a simulação não lê)
    queueCutscene(s, 'chapter28', { title: l(`Anos ${prev}`, `The ${prev}s`), decade: prev, int23: 'milestone' });
  } catch (e) { console.warn('chapter28', e); }
});

// ---------------------------------------------------------------- storyboard do fim

function storyView(st: Story28, s: GameState): HTMLElement {
  return h('div', { class: 'sb28' },
    h('p', { class: 'sb28-ep' }, T(st.epitaph)),
    st.rumo ? h('p', { class: 'small' }, t(l('Final: {f} ({x}/100).', 'Ending: {f} ({x}/100).'), { f: T(st.rumo.name), x: st.rumo.score })) : null,
    h('h4', null, T(l('Álbum de cenas', 'Scene album'))),
    st.album.length ? h('ol', { class: 'sb28-album' }, st.album.map((a) => h('li', null,
      h('span', { class: 'sb28-frame', 'aria-hidden': 'true' }, String(a.year).slice(-2)),
      h('b', null, T(a.title ?? l('Cena', 'Scene'))), h('small', { class: 'muted' }, ` ${a.year}`))))
      : h('p', { class: 'small muted' }, T(l('Nenhuma cena guardada ainda.', 'No scenes stored yet.'))),
    h('h4', null, T(l('As 3 maiores cadeias de eco', 'The 3 biggest echo chains'))),
    st.chains.length ? h('ol', { class: 'sb28-chains' }, st.chains.map((c) => h('li', null,
      h('b', null, T(c.title)), c.choice.pt ? h('span', null, ' — ', T(c.choice)) : null,
      h('small', { class: 'muted' }, ' · ', t(l('{n} ecos ({g} bons, {b} ruins)', '{n} echoes ({g} good, {b} bad)'), { n: c.n, g: c.good, b: c.bad })),
      c.last ? h('div', { class: 'small' }, '↳ ', T(c.last)) : null)))
      : h('p', { class: 'small muted' }, T(l('Nenhuma decisão ecoou ainda.', 'No decision has echoed yet.'))),
    h('h4', null, T(l('Capítulos', 'Chapters'))),
    h('div', { class: 'ch28-list' }, ...st.chapters.map(chapterView)),
    runDone17(s) ? runCard17body(s) : null);
}

export function openStory28(s: GameState): void {
  modal(t(l('Storyboard — {c}', 'Storyboard — {c}'), { c: s.config.companyName }), storyView(storyboard28(s), s), { wide: true });
}

/** Fim do prazo: storyboard + "Continuar em sandbox" (substitui a cena simples da r17). */
registerCutscene('run17Result', (s, cs, close) => {
  const d = cs.data as { score: number; years: number; year: number };
  return h('div', { class: 'sb28-end' },
    h('p', { class: 'h27-kicker gold' }, t(l('FIM DO PRAZO · {m} DE {y}', 'END OF THE RUN · {m} {y}'), { m: monthName(11).toUpperCase(), y: d.year ?? s.year })),
    storyView(storyboard28(s), s),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => { s.flags.sandbox = 1; close(); } }, T(l('Continuar em sandbox', 'Keep playing in sandbox'))),
      h('button', { class: 'btn ghost', onclick: () => { close(); window.dispatchEvent(new Event('vtn-menu28')); } }, T(l('Encerrar e voltar ao menu', 'Finish and return to menu')))));
}, { interrupt: 'always' });

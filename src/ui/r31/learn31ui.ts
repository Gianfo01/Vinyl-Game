// R31 · onda 4 (R) — TELAS DE RESULTADOS E APRENDIZADOS (RN-13), em Finanças › "Aprendizados":
//   • Por projeto: cada lançamento seu com a leitura de 10 semanas — vendeu × previsão, pico, crítica, margem atual
//     (results31) e os traços da decisão; o nome leva ao resultado do projeto.
//   • Coortes: por ano, década, tipo ou gênero — quantos, média × previsão, quantos passaram da previsão, top 10 e a
//     margem somada (quando o projeto já tem resultado).
//   • Biblioteca: um aprendizado por traço — com × sem, tamanho de cada amostra, contexto (anos, gêneros, tipos) e
//     exemplos; SEMPRE rotulado como correlação. Amostra pequena é dita como tal.
// Só lê o estado (sim/r31/learn31).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { cohorts31, genreName31, lessons31, LEARN_MIN31, ratio31, samples31, traitName31, type CohortBy31, type Lesson31 } from '../../sim/r31/learn31';
import { projectResult31 } from '../../sim/r31/results31';
import type { GameState } from '../../sim/types';
import { pill, rerender, section } from '../common';
import { h } from '../dom';
import { registerTab } from '../registry';
import { goResults31, money31 } from './results31mini';
import './res31.css';

/** Filtros (estado só da interface). */
export const LRN31 = { by: 'decade' as CohortBy31, genre: '', type: '' };

const num = (x: number, d = 1): string => x.toLocaleString(t(l('pt-BR', 'en-US')), { minimumFractionDigits: d, maximumFractionDigits: d });
/** "1,4× a previsão" */
export const timesL31 = (r: number): string => t(l('{x}× a previsão', '{x}× the forecast'), { x: num(r) });
const TYPE: Record<string, L> = { single: l('single', 'single'), ep: l('EP', 'EP'), lp: l('álbum', 'album') };
const CORR: L = l('Correlação, não causa: os lançamentos com e sem este traço também diferem em outras coisas (artista, época, sorte). Use como pista, não como regra.',
  'Correlation, not cause: releases with and without this trait also differ in other ways (act, era, luck). Use it as a hint, not a rule.');

function projectsView(s: GameState): HTMLElement {
  const xs = [...samples31(s)].reverse().slice(0, 30);
  if (!xs.length) return h('p', { class: 'muted small' }, t(l('Ainda nenhum lançamento seu com a leitura de 10 semanas. Cada disco entra aqui quando a leitura fica pronta.', 'None of your releases has the 10-week reading yet. Each record joins here once the reading is ready.')));
  return h('table', { class: 'tbl compact res31' },
    h('thead', null, h('tr', null, ...[l('Lançamento', 'Release'), l('Vendeu', 'Sold'), l('Pico', 'Peak'), l('Margem hoje', 'Margin today'), l('Traços da decisão', 'Decision traits')].map((x) => h('th', null, t(x))))),
    h('tbody', null, xs.map((x) => {
      const r = projectResult31(s, x.id);
      const k = ratio31(x);
      return h('tr', null,
        h('td', null, h('button', { type: 'button', class: 'linklike', title: t(l('Ver o resultado do projeto', 'See the project result')), onclick: () => goResults31('project', x.id) }, h('b', null, x.n || '—')),
          h('div', { class: 'muted small' }, `${x.an} · ${t(TYPE[x.t] ?? l(x.t))} · ${x.y}`)),
        h('td', null, pill(timesL31(k), k >= 1.12 ? 'good' : k < 0.88 ? 'bad' : '')),
        h('td', null, x.pk > 0 && x.pk < 99 ? `#${x.pk}` : '—'),
        h('td', null, r ? money31(r.margin) : h('span', { class: 'muted small' }, '—')),
        h('td', { class: 'small', style: 'text-align:left;white-space:normal' }, x.f.length ? x.f.map((f) => t(traitName31(f))).join(' · ') : '—'));
    })));
}

function cohortsView(s: GameState): HTMLElement {
  const by = LRN31.by;
  const cs = cohorts31(s, by);
  const BY: Record<CohortBy31, L> = { year: l('Ano', 'Year'), decade: l('Década', 'Decade'), type: l('Tipo', 'Type'), genre: l('Gênero', 'Genre') };
  return h('div', null,
    h('div', { class: 'layer-bar', role: 'group', 'aria-label': t(l('Agrupar por', 'Group by')) },
      (Object.keys(BY) as CohortBy31[]).map((k) => h('button', { type: 'button', class: `chip-btn ${by === k ? 'on' : ''}`, 'aria-pressed': by === k ? 'true' : 'false', onclick: () => { LRN31.by = k; rerender(); } }, t(BY[k])))),
    cs.length ? h('table', { class: 'tbl compact res31' },
      h('thead', null, h('tr', null, ...[BY[by], l('Lançamentos', 'Releases'), l('Média', 'Average'), l('Passaram da previsão', 'Beat the forecast'), l('Top 10', 'Top 10'), l('Margem somada', 'Summed margin')].map((x) => h('th', null, t(x))))),
      h('tbody', null, cs.map((c) => h('tr', null,
        h('td', null, h('b', null, t(c.label))), h('td', null, String(c.n)), h('td', null, timesL31(c.ratio)),
        h('td', null, `${c.hits}/${c.n}`), h('td', null, String(c.top10)),
        h('td', null, c.margin !== undefined ? h('span', null, money31(c.margin), c.mN < c.n ? h('small', { class: 'muted' }, ` (${c.mN}/${c.n})`) : null) : '—')))))
      : h('p', { class: 'muted small' }, '—'));
}

function lessonCard(x: Lesson31): HTMLElement {
  const up = x.diff >= 0;
  const ctx = [`${x.years[0]}${x.years[1] !== x.years[0] ? `–${x.years[1]}` : ''}`, x.genres.map((g) => t(genreName31(g))).join(', '), x.types.map((k) => t(TYPE[k] ?? l(k))).join(', ')].filter(Boolean).join(' · ');
  return h('div', { class: 'card lrn31', 'data-trait31': x.trait },
    h('div', { class: 'row wrap' }, h('b', null, t(x.name)), pill(t(l('correlação', 'correlation')), 'info'), x.small ? pill(t(l('amostra pequena', 'small sample')), 'warn') : null),
    h('p', { class: 'small' }, t(up
      ? l('Com este traço seus lançamentos venderam em média {a}; sem ele, {b} — {p}% a mais.', 'With this trait your releases sold on average {a}; without it, {b} — {p}% more.')
      : l('Com este traço seus lançamentos venderam em média {a}; sem ele, {b} — {p}% a menos.', 'With this trait your releases sold on average {a}; without it, {b} — {p}% less.'),
    { a: timesL31(x.withR), b: timesL31(x.withoutR), p: Math.round(Math.abs(x.diff) * 100) })),
    h('p', { class: 'muted small' }, t(l('Amostra: {n} com, {m} sem · contexto: {c}', 'Sample: {n} with, {m} without · context: {c}'), { n: x.nWith, m: x.nWithout, c: ctx })),
    x.ex.length ? h('p', { class: 'muted small' }, t(l('Exemplos: {e}', 'Examples: {e}'), { e: x.ex.map((e) => `"${e}"`).join(', ') })) : null);
}

function libraryView(s: GameState): HTMLElement {
  const all = samples31(s);
  const genres = [...new Set(all.map((x) => x.g))].filter(Boolean).sort();
  const ls = lessons31(s, { genre: LRN31.genre || undefined, type: LRN31.type || undefined });
  const sel = (v: string, opts: { value: string; label: string }[], set: (v: string) => void, aria: L) =>
    h('select', { 'aria-label': t(aria), onchange: (e: Event) => { set((e.target as HTMLSelectElement).value); rerender(); } }, opts.map((o) => h('option', { value: o.value, selected: o.value === v }, o.label)));
  return h('div', null,
    h('p', { class: 'small', role: 'note' }, '⚠ ', t(CORR)),
    h('div', { class: 'row wrap' },
      sel(LRN31.genre, [{ value: '', label: t(l('Todos os gêneros', 'All genres')) }, ...genres.map((g) => ({ value: g, label: t(genreName31(g)) }))], (v) => { LRN31.genre = v; }, l('Gênero', 'Genre')),
      sel(LRN31.type, [{ value: '', label: t(l('Todos os tipos', 'All types')) }, ...['single', 'ep', 'lp'].map((k) => ({ value: k, label: t(TYPE[k]) }))], (v) => { LRN31.type = v; }, l('Tipo', 'Type'))),
    ls.length ? h('div', { class: 'grid2' }, ls.slice(0, 16).map(lessonCard))
      : h('p', { class: 'muted small' }, t(l('Ainda não há aprendizado: um traço precisa de pelo menos {n} lançamentos com ele e {n} sem ele (você tem {k} amostra(s)).', 'No learning yet: a trait needs at least {n} releases with it and {n} without (you have {k} sample(s)).'), { n: LEARN_MIN31.n, k: all.length })));
}

export function learnView31(s: GameState): HTMLElement {
  return h('div', { class: 'lrn31-view' },
    section(t(l('Biblioteca de aprendizados', 'Learning library')), libraryView(s)),
    section(t(l('Coortes', 'Cohorts')), h('p', { class: 'muted small' }, t(l('"× a previsão" desconta o tamanho do artista: 1,0× é vender o que a previsão do lançamento dizia.', '"× the forecast" discounts the act\'s size: 1.0× means selling what the release forecast said.'))), cohortsView(s)),
    section(t(l('Por projeto', 'By project')), projectsView(s)));
}

registerTab('business', { id: 'learn31', label: l('Aprendizados', 'Learnings'), icon: 'book', render: learnView31 });

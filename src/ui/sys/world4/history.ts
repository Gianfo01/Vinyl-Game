// Linha do tempo da indústria, cenas históricas (arco, visual, assinar a cena), reações culturais
// e mercados com regras próprias (inclui o sistema de trainees).

import { genreById, l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { MILESTONES, milestoneDue, type Milestone } from '../../../sim/sys/world4/milestones';
import { BACKLASH_NAME, HIST_SCENES, STAGE_NAME, TRAINEE_WEEKS, actInScene, enrollTrainee, sceneStage, signCost, signScene } from '../../../sim/sys/world4/scenes';
import { liveMine } from '../../../sim/sys/world4/common';
import { w4 } from '../../../sim/sys/world4/state';
import type { GameState } from '../../../sim/types';
import { fmtL } from '../../../sim/util';
import { $, actLink, cityName, genreName, monthName, pill, rerender, section } from '../../common';
import { h } from '../../dom';
import { ic } from '../../vis';
import { act, btn, note } from './util';

let filter: 'all' | 'done' | 'world' | 'next' = 'done';

function msStatus(s: GameState, m: Milestone): 'done' | 'before' | 'next' {
  const y = w4(s).ms[m.id];
  if (y === undefined) return 'next';
  return y < 0 ? 'before' : 'done';
}

export function timelineSection(s: GameState): HTMLElement {
  const list = MILESTONES.slice().sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0)).filter((m) => {
    const st = msStatus(s, m);
    if (filter === 'done') return st !== 'next';
    if (filter === 'next') return st === 'next';
    if (filter === 'world') return !!m.world;
    return true;
  });
  const done = MILESTONES.filter((m) => msStatus(s, m) !== 'next').length;
  const filters: [typeof filter, string][] = [['done', t(l('Já aconteceu', 'Happened'))], ['next', t(l('Por vir', 'Upcoming'))], ['world', t(l('Mercados mundiais', 'World markets'))], ['all', t(l('Tudo', 'All'))]];
  let decade = 0;
  const items: HTMLElement[] = [];
  for (const m of list) {
    const d = Math.floor(m.year / 10) * 10;
    if (d !== decade) { decade = d; items.push(h('li', { class: 'w4-decade', 'aria-hidden': 'true' }, `${d}s`)); }
    const st = msStatus(s, m);
    const fired = w4(s).ms[m.id];
    const active = st !== 'next' && (m.until === undefined || s.year <= m.until);
    items.push(h('li', { class: `w4-ms ${st}` },
      h('span', { class: 'w4-year' }, st === 'next' && m.tech && !milestoneDue(s, { ...m, tech: undefined }) ? `≈${m.year}` : `${m.month !== undefined ? monthName(m.month) + ' ' : ''}${st === 'done' ? fired : m.year}`),
      h('div', { class: 'w4-ms-body' },
        h('b', null, t(m.title), m.world ? ' ' : null, m.world ? pill(t(l('mundo', 'world')), 'gold') : null),
        st !== 'next' ? h('p', { class: 'small' }, t(m.text)) : null,
        h('div', { class: 'row' }, ic('bulb'), h('span', { class: 'small' }, t(m.mech)),
          st === 'before' ? pill(t(l('antes do início', 'before your start')), '') : null,
          active && m.until ? pill(t(fmtL(l('vigora até {y}', 'until {y}'), { y: m.until })), 'good') : null,
          st !== 'next' && m.until !== undefined && s.year > m.until ? pill(t(l('encerrado', 'ended')), '') : null),
        m.realRef ? h('small', { class: 'muted' }, `${t(l('Referência real', 'Real reference'))}: ${m.realRef}`) : null,
      )));
  }
  return section(t(l('Linha do tempo da indústria', 'Industry timeline')),
    h('div', { class: 'row between' },
      h('span', { class: 'small muted' }, t(fmtL(l('{n} de {m} marcos', '{n} of {m} milestones'), { n: done, m: MILESTONES.length }))),
      h('div', { class: 'row', role: 'group', 'aria-label': t(l('Filtro', 'Filter')) }, filters.map(([id, label]) => btn(label, () => { filter = id; rerender(); }, { cls: filter === id ? 'primary' : 'ghost', pressed: filter === id })))),
    items.length ? h('ol', { class: 'w4-timeline' }, items) : note(l('Nada aqui ainda.', 'Nothing here yet.')),
  );
}

function arcBar(s: GameState, from: number, peak: number, to: number): HTMLElement {
  const span = Math.max(1, to - from);
  const pos = Math.max(0, Math.min(1, (s.year - from) / span));
  const pk = (peak - from) / span;
  return h('div', { class: 'w4-arc', role: 'img', 'aria-label': `${from}–${to}` },
    h('span', { class: 'w4-arc-peak', style: `left:${pk * 100}%` }),
    s.year >= from && s.year <= to ? h('span', { class: 'w4-arc-now', style: `left:${pos * 100}%` }) : null,
    h('small', { class: 'w4-arc-a' }, String(from)), h('small', { class: 'w4-arc-b' }, String(to)));
}

export function scenesSection(s: GameState): HTMLElement {
  const w = w4(s);
  const mine = liveMine(s);
  const cards = HIST_SCENES.slice().sort((a, b) => {
    const order = { rise: 0, peak: 1, decline: 2, future: 3, over: 4 } as const;
    return order[sceneStage(s, a)] - order[sceneStage(s, b)] || a.from - b.from;
  }).map((sc) => {
    const st = sceneStage(s, sc);
    const phase = st === 'rise' ? 0 : st === 'peak' ? 1 : st === 'future' ? -1 : 2;
    const signed = w.scenes[sc.id]?.signed;
    const myActs = mine.filter((a) => actInScene(s, a, sc));
    const mvs = s.movements.filter((m) => m.city === sc.city && sc.genres.includes(m.parent));
    const canSign = (st === 'rise' || st === 'peak') && !signed;
    return h('article', { class: `tile w4-scene ${st}` },
      h('div', { class: 'tile-body' },
        h('div', { class: 'row between' }, h('b', null, t(sc.name)), pill(t(STAGE_NAME[st]), st === 'rise' ? 'good' : st === 'peak' ? 'gold' : st === 'over' ? '' : 'warn')),
        h('small', { class: 'muted' }, `${cityName(sc.city)} · ${sc.genres.filter((g) => genreById[g]).map(genreName).join(', ')}`),
        arcBar(s, sc.from, sc.peak, sc.to),
        phase >= 0 ? h('p', { class: 'small' }, t(sc.arc[phase as 0 | 1 | 2])) : note(fmtL(l('Começa por volta de {y}.', 'Starts around {y}.'), { y: sc.from })),
        h('div', { class: 'w4-look' },
          h('span', { class: 'w4-swatches', 'aria-hidden': 'true' }, sc.look.palette.map((c) => h('span', { style: `background:${c}` }))),
          h('small', null, `${t(l('Visual', 'Look'))}: ${t(sc.look.label)}`)),
        mvs.length ? h('small', null, `${t(l('Movimentos', 'Movements'))}: ${mvs.map((m) => t(m.name)).join(', ')}`) : null,
        myActs.length ? h('div', { class: 'row' }, h('small', null, t(l('Seus artistas:', 'Your acts:'))), myActs.slice(0, 4).map((a) => actLink(s, a.id))) : null,
        signed ? pill(signed < 0 ? t(l('assinada cedo: +20%', 'signed early: +20%')) : t(l('assinada: +10%', 'signed: +10%')), 'good') : null,
        canSign ? btn(`${t(l('Assinar a cena', 'Sign the scene'))} · ${$(signCost(s, sc))}`, () => act(() => signScene(s, sc.id), l('Você bancou a cena: clubes, fanzines e um talento local.', 'You backed the scene: clubs, fanzines and a local talent.')), { cls: 'primary', title: t(l('Chegar cedo (nascendo) custa menos e rende +20% aos seus artistas da cena; no auge, +10%.', 'Arriving early (rising) costs less and gives +20% to your scene acts; at the peak, +10%.')) }) : null,
      ));
  });
  const bl = w.backlash.filter((b) => s.year <= b.until);
  return section(t(l('Cenas históricas', 'Historic scenes')),
    note(l('Cenas nascem, chegam ao auge e acabam. Quem chega cedo e "assina a cena" leva o bônus maior.', 'Scenes are born, peak and end. Whoever arrives early and "signs the scene" gets the bigger bonus.')),
    h('div', { class: 'cards' }, cards),
    h('h4', null, t(l('Reações culturais', 'Cultural backlash'))),
    bl.length ? h('ul', { class: 'w4-list' }, bl.map((b) => h('li', null, ic('fire'), ' ', h('b', null, t(BACKLASH_NAME[b.kind])), ` — ${genreName(b.genre)} (${b.from}–${b.until}): −15%`)))
      : note(l('Nenhum gênero saturado sofrendo reação agora. Quando um gênero domina demais as paradas, vem o refluxo.', 'No saturated genre is under backlash now. When a genre dominates the charts for too long, the backlash comes.')),
  );
}

export function marketsSection(s: GameState): HTMLElement {
  const w = w4(s);
  const world = MILESTONES.filter((m) => m.world);
  const trainOpen = w.ms.trainees !== undefined;
  return section(t(l('Mercados com regras próprias', 'Markets with their own rules')),
    h('div', { class: 'cards' }, world.map((m) => {
      const st = msStatus(s, m);
      const on = st !== 'next' && (m.until === undefined || s.year <= m.until);
      return h('div', { class: `tile ${on ? '' : 'muted'}` }, h('div', { class: 'tile-body' },
        h('div', { class: 'row between' }, h('b', null, t(m.title)), pill(on ? t(l('em vigor', 'in force')) : st === 'next' ? `${m.year}` : t(l('passou', 'past')), on ? 'good' : '')),
        h('small', null, t(m.mech))));
    })),
    trainOpen ? h('div', null,
      h('h4', null, t(l('Sistema de trainees', 'Trainee system'))),
      note(fmtL(l('Dois anos de treino ({w} semanas): o ato rende menos enquanto treina e sai com voz e palco melhores e +25% em pop asiático.', 'Two years of training ({w} weeks): the act earns less while training and comes out with better voice and stage and +25% in Asian pop.'), { w: TRAINEE_WEEKS })),
      h('div', { class: 'row' }, liveMine(s).map((a) => {
        const tr = w.trainees[a.id];
        if (tr) return pill(`${a.name}: ${s.week < tr.until ? t(fmtL(l('treinando ({n} sem.)', 'training ({n} wk)'), { n: tr.until - s.week })) : t(l('formado', 'graduated'))}`, s.week < tr.until ? 'warn' : 'good');
        return btn(`${t(l('Matricular', 'Enroll'))} ${a.name}`, () => act(() => enrollTrainee(s, a.id)));
      }))) : null,
  );
}

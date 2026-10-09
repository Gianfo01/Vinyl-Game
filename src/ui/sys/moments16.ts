// Rodada 16 — cartão do momento: a cena em pixel art aparece quando algo acontece (show, mídia,
// premiação, sessão, lançamento, contrato) e pode ser revista pelo botão "ver cena" do diário.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { momentOfMemory16, mo16, type MomentRec16 } from '../../sim/sys/moments16';
import type { GameState, MemoryEntry } from '../../sim/types';
import './moments16.css';
import { monthName, section } from '../common';
import { h } from '../dom';
import { momentSpec16 } from '../pixel/moment16';
import { scene14 } from '../pixel/scenes14';
import { openScene, registerCutscene, registerSection } from '../registry';

function card16(rec: Pick<MomentRec16, 'ev' | 'text' | 'why'>, close: () => void): HTMLElement {
  const sp = momentSpec16(rec.ev);
  return h('div', { class: 'mo16' },
    scene14(sp.scene, { ...sp.opts, size: 'card', spots: false }),
    h('p', { class: 'mo16-text' }, t(rec.text)),
    rec.why.length ? h('ul', { class: 'mo16-why small' }, rec.why.map((w) => h('li', null, t(w)))) : null,
    h('button', { class: 'btn primary', onclick: close }, t(l('Continuar', 'Continue'))));
}

registerCutscene('moment16', (s, cs, close) => {
  const rec = mo16(s).log.find((x) => x.id === cs.data.rec);
  return rec ? card16(rec, close) : h('div', null, h('button', { class: 'btn', onclick: close }, t(l('Continuar', 'Continue'))));
});

function replay(rec: Pick<MomentRec16, 'ev' | 'text' | 'why' | 'title'>): void {
  openScene(momentSpec16(rec.ev).title as L, (close) => card16(rec, close));
}

/** Botão discreto "ver cena" para um fato do diário (null quando o fato não tem cena). */
export function replayBtn16(s: GameState, m: MemoryEntry): HTMLElement | null {
  const rec = mo16(s).log.find((x) => x.mem === m.id);
  const ev = rec?.ev ?? momentOfMemory16(m.kind, m.year);
  if (!ev) return null;
  return h('button', { class: 'link mo16-btn small', type: 'button', title: t(l('Rever a cena deste momento', 'Replay this moment\'s scene')),
    onclick: () => replay(rec ?? { ev, text: m.text, why: [], title: l('', '') }) }, t(l('ver cena', 'view scene')));
}

registerSection('diary', { id: 'moments16', order: 60, render: (s) => {
  const list = mo16(s).log.slice(-15).reverse();
  if (!list.length) return null;
  return section(t(l('Momentos ilustrados', 'Illustrated moments')),
    h('p', { class: 'muted small' }, t(l('As cenas aparecem só quando algo acontece: shows marcantes, mídia, prêmios, sessões, lançamentos e contratos. Reveja aqui.', 'Scenes only appear when something happens: landmark shows, media, awards, sessions, releases and contracts. Replay them here.'))),
    h('ul', { class: 'mo16-log' }, list.map((r) => h('li', null,
      h('span', { class: 'muted' }, `${monthName(r.month)} ${r.year} · `), h('b', null, t(momentSpec16(r.ev).title)), ' — ', t(r.text), ' ',
      h('button', { class: 'link mo16-btn small', type: 'button', onclick: () => replay(r) }, t(l('ver cena', 'view scene')))))));
} });

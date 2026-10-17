// R31 · onda 4 (VIT) — VITRINE DO MÊS na interface (DOM). Lê o modelo puro (vit31model) e traduz cada botão para a
// função que já existe: as ações do motor passam por `runVit31` (comprar na loja, comprar no beco, radar, conhecer, ação
// do lugar, lance, grampo, denúncia); as de interface (ouvir, abrir tela, ficha, painel rápido, entrar na loja) são
// resolvidas aqui. O motivo do bloqueio aparece antes do clique (lockBtn31). Abrir o painel ou a lista não muda nada.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { runVit31, vitItems31, type VitBtn31, type VitPlace31, type VitRun31 } from '../../sim/r31/vitrine31';
import { audioAvailable, nowPlaying, play, stopAll } from '../../audio/engine';
import { buildSongSpec } from '../../audio/spec';
import { inspect, modal, rerender, toast } from '../common';
import { fmtL } from '../../sim/util';
import { nav5On } from '../../sim/r31/exp5';
import type { Spot31 } from './scene31model';
import { h } from '../dom';
import { go18 } from '../sys/inbox18';
import { openFicha13 } from '../sys/persona13';
import { lockBtn31, quickBtn31, quickHook31 } from './lock31';
import { listenLock31 } from './art31';
import { drawVit31 } from '../pixel/vit31px';
import { geom27 } from '../pixel/interior27';
import type { G31 } from '../pixel/props31';
import type { Ctx27 } from '../ps/hqpx27';
import { vitList31, vitPanel31, type VitPanel31 } from './vit31model';
import type { InsideM31, InsideT31 } from './inside31model';

/** Pinta a prateleira do mês (gancho `extra` do drawInterior27, depois dos adereços novos). */
export const paintVit31 = (m: InsideM31) => (g: Ctx27): void => drawVit31(g, m.vit, geom27(m.W) as G31);

function done(r: { ok: boolean; text: L }): void { toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); }

/** Roda o botão: motor (função que já existe) ou interface. */
export function runVitBtn31(s: GameState, run: VitRun31, show: (p?: string) => void, back: () => void): void {
  const r = runVit31(s, run);
  if ('ok' in r) { done(r); return; }
  const u = r.ui;
  switch (u.k) {
    case 'listen': {
      if (nowPlaying()) { stopAll(); toast(t(l('Prévia parada.', 'Preview stopped.'))); return; }
      const so = s.songs[u.song];
      if (!so) return;
      const ok = audioAvailable() && play(buildSongSpec(s, so));
      toast(ok ? `♪ ${so.title} — ${t(l('clique de novo para parar', 'click again to stop'))}` : t(l('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.')), ok ? 'info' : 'bad');
      return;
    }
    case 'go': back(); go18({ area: u.area, tab: u.tab }); return;
    case 'ficha': openFicha13(u.key); return;
    case 'person': inspect.person(u.pid); return;
    case 'quick': quickHook31.open?.({ kind: 'act', id: u.act }); return;
    case 'enter': if (u.place === 'instruments') show('go:shop'); else show(); return;
    default: return;
  }
}

const btnEl = (s: GameState, b: VitBtn31, show: (p?: string) => void, back: () => void): HTMLElement => {
  const lock = b.run.k === 'listen' ? listenLock31() : b.lock ?? null;
  const el = lockBtn31(t(b.label), lock, () => runVitBtn31(s, b.run, show, back), { cls: `btn small${b.main ? ' primary' : ''}` });
  return b.run.k === 'quick' ? h('span', { class: 'row' }, el, quickBtn31({ kind: 'act', id: b.run.act }, t(b.label))) : el;
};

function card(s: GameState, m: VitPanel31, show: (p?: string) => void, back: () => void, head = false): HTMLElement {
  return h('div', { class: 'in31-act vit31-card', 'data-vit31': m.id },
    head ? h('b', null, t(m.title)) : null,
    h('p', { class: 'small' }, t(m.note)),
    h('p', { class: 'small muted' }, m.meta.map((x) => t(x)).join(' · ')),
    m.btns.length ? h('div', { class: 'row wrap' }, m.btns.map((b) => btnEl(s, b, show, back))) : null);
}

/** Painel rápido de um item (dentro da cena). */
export function vitPanelEl31(s: GameState, id: string, show: (p?: string) => void, back: () => void): HTMLElement {
  const m = vitPanel31(s, id);
  if (!m) return h('div', { class: 'in31-pn' }, h('p', { class: 'small muted' }, t(l('Isso já saiu da vitrine.', 'That has left the showcase.'))));
  // R31 onda 5 (CENAS5): no jogo explorável não há "ver como lista" (a vitrine inteira é o objeto "Vitrine do mês" da cena)
  return h('div', { class: 'in31-pn vit31' }, card(s, m, show, back),
    nav5On(s) ? null : h('button', { type: 'button', class: 'btn small ghost', onclick: () => show('vitlist') }, t(l('Ver como lista', 'See as a list'))));
}

/** "Ver como lista": tudo o que o interior tem no mês, com as ações. */
export function vitListEl31(s: GameState, x: Pick<InsideT31, 'k' | 'vit'>, show: (p?: string) => void, back: () => void): HTMLElement {
  const xs = vitList31(s, x);
  return h('div', { class: 'in31-pn vit31' },
    h('p', { class: 'small muted' }, t(l('Vitrine do mês: sorteada na virada do mês; olhar não muda nada.', 'Showcase of the month: drawn at the month turn; looking changes nothing.'))),
    xs.length ? h('div', null, xs.map((m) => card(s, m, show, back, true))) : h('p', { class: 'small muted' }, t(l('Nada neste mês. Volte na virada.', 'Nothing this month. Come back at the turn.'))));
}

/** Faixa da vitrine para as telas que não são interiores (aeroporto, casa de leilões). */
export function vitStrip31(s: GameState, p: VitPlace31): HTMLElement | null {
  if (nav5On(s)) return null; // R31 onda 5 (CENAS5): no jogo explorável a vitrine é um objeto da cena (vitSpot5)
  const ids = vitItems31(s, p).map((it) => it.id);
  if (!ids.length) return null;
  const noop = (): void => rerender();
  return h('details', { class: 'vit31-strip', open: true },
    h('summary', null, t(l('Vitrine do mês', 'Showcase of the month')), ` (${ids.length})`),
    h('div', null, ids.map((id) => vitPanel31(s, id)).filter((m): m is VitPanel31 => !!m).map((m) => card(s, m, noop, noop, true))));
}

// ---------------------------------------------------------------- R31 onda 5 (CENAS5): a vitrine como objeto da cena

/** No jogo explorável (exp5.nav), a vitrine do mês do aeroporto/leilões é uma placa no canto da cena (nada de faixa em lista). */
export function vitSpot5(s: GameState, p: VitPlace31, W: number): Spot31[] {
  if (!nav5On(s)) return [];
  const n = vitItems31(s, p).length;
  if (!n) return [];
  return [{ id: 'vit5', x: W - 50, y: 14, w: 46, h: 12, label: l('Vitrine do mês', 'Showcase of the month'),
    tip: fmtL(l('O que o lugar tem neste mês ({n}); some na virada.', 'What the place has this month ({n}); gone at the month turn.'), { n }),
    go: { panel: 'vit5' }, badge: { text: fmtL(l('{n} no mês', '{n} this month'), { n }), level: 'info', sym: '✦' } }];
}
/** Abre a vitrine do mês (os mesmos cartões e botões da faixa de hoje) numa janela por cima da cena. */
export function vitOpen5(s: GameState, p: VitPlace31): void {
  const xs = vitItems31(s, p).map((it) => vitPanel31(s, it.id)).filter((m): m is VitPanel31 => !!m);
  let close = (): void => {};
  const again = (): void => { close(); rerender(); };
  close = modal(t(l('Vitrine do mês', 'Showcase of the month')), h('div', { class: 'in31-pn vit31' },
    h('p', { class: 'small muted' }, t(l('Vitrine do mês: sorteada na virada do mês; olhar não muda nada.', 'Showcase of the month: drawn at the month turn; looking changes nothing.'))),
    ...xs.map((m) => card(s, m, again, again, true))), { wide: true });
}

// Peças comuns da interface do sistema "music": botão de tocar, moldura de mini-jogo (medidores,
// ouvir, resolver automático, confirmar) e exibição dos bônus.

import { play, nowPlaying, onPlayChange, stopAll } from '../../../audio/engine';
import type { PlaySpec } from '../../../audio/spec';
import { l, type L } from '../../../data/world';
import { t } from '../../../i18n/strings';
import type { Deltas } from '../../../sim/sys/music';
import { rerender, toast } from '../../common';
import { h } from '../../dom';
import { store } from '../../store';
import { ic } from '../../vis';
import { openScene } from '../../registry';

export const isAuto = (): boolean => store.prefs.minigames === 'auto';

const ATTR_NAMES: Record<string, L> = {
  melody: l('Melodia', 'Melody'), lyrics: l('Letra', 'Lyrics'), originality: l('Originalidade', 'Originality'),
  performance: l('Performance', 'Performance'), production: l('Produção', 'Production'),
};

export function deltaText(d: Deltas): string {
  const parts = Object.entries(d).filter(([, v]) => v && Math.abs(v) >= 0.1).map(([k, v]) => `${t(ATTR_NAMES[k] ?? l(k, k))} ${v! > 0 ? '+' : ''}${(Math.round(v! * 10) / 10).toString()}`);
  return parts.length ? parts.join(' · ') : t(l('sem efeito', 'no effect'));
}

export function isErr(x: unknown): x is L {
  return !!x && typeof x === 'object' && 'pt' in (x as object) && 'en' in (x as object) && !('score' in (x as object));
}

/** Botão ▶/■ que monta a partitura só no clique (o som nunca começa sozinho). */
export function playBtn(make: () => PlaySpec | null, opts: { label?: L; small?: boolean; onEnd?: () => void } = {}): HTMLElement {
  const btn = h('button', { class: `btn ${opts.small !== false ? 'small' : ''} mu-play`, type: 'button' }) as HTMLButtonElement;
  let mine: number | null = null;
  const paint = () => {
    const np = nowPlaying();
    const on = !!np && np.id === mine;
    btn.replaceChildren(on ? '■' : '▶', opts.label ? ` ${t(opts.label)}` : '');
    btn.setAttribute('aria-label', t(on ? l('Parar', 'Stop') : opts.label ?? l('Ouvir', 'Listen')));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('on', on);
  };
  btn.onclick = () => {
    const np = nowPlaying();
    if (np && np.id === mine) { stopAll(); paint(); return; }
    const spec = make();
    if (!spec) return;
    const hd = play(spec, { onEnd: opts.onEnd });
    if (!hd) { toast(t(l('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.')), 'bad'); return; }
    mine = hd.id;
    paint();
  };
  const off = onPlayChange(() => { if (!btn.isConnected) { off(); return; } paint(); });
  paint();
  return btn;
}

export interface GameFrame {
  title: L;
  intro: L;
  /** medidores ao vivo (redesenhados a cada mudança) */
  meters: () => HTMLElement;
  board: () => HTMLElement;
  listen?: () => PlaySpec | null;
  auto: () => unknown;
  confirm: () => unknown;
  done?: (res: unknown) => void;
}

/** Abre o mini-jogo em tela cheia; com mini-jogos em "auto" resolve direto. */
export function openGame(f: GameFrame): void {
  if (isAuto()) {
    finish(f, f.auto());
    return;
  }
  openScene(f.title, (close) => {
    const meters = h('div', { class: 'mu-meters', 'aria-live': 'polite' });
    const board = h('div', { class: 'mu-board' });
    const redraw = () => { meters.replaceChildren(f.meters()); board.replaceChildren(f.board()); };
    (f as GameFrame & { redraw?: () => void }).redraw = redraw;
    redraw();
    return h('div', { class: 'mu-game' },
      h('p', { class: 'muted small' }, t(f.intro)),
      meters,
      board,
      h('div', { class: 'row wrap mu-actions' },
        f.listen ? playBtn(f.listen, { label: l('Ouvir', 'Listen'), small: false }) : null,
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { stopAll(); const res = f.auto(); if (finish(f, res)) close(); } }, ic('sparkle'), ' ', t(l('Resolver automático', 'Auto-resolve'))),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { stopAll(); const res = f.confirm(); if (finish(f, res)) close(); } }, ic('star'), ' ', t(l('Confirmar', 'Confirm'))),
      ),
    );
  }, { onClose: () => { stopAll(); rerender(); } });
}

function finish(f: GameFrame, res: unknown): boolean {
  if (isErr(res)) { toast(t(res), 'bad'); return false; }
  const r = res as { score?: number; deltas?: Deltas } | null;
  if (r && typeof r === 'object' && 'score' in r) toast(`${t(f.title)}: ${r.score}/100 — ${r.deltas ? deltaText(r.deltas) : ''}`, (r.score ?? 0) >= 50 ? 'good' : 'info');
  f.done?.(res);
  rerender();
  return true;
}

/** Redesenha medidores e tabuleiro de um mini-jogo aberto. */
export function redrawGame(f: GameFrame): void {
  (f as GameFrame & { redraw?: () => void }).redraw?.();
}

export function gauge(label: L, value: number, hint?: L): HTMLElement {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return h('div', { class: 'mu-gauge', title: hint ? t(hint) : undefined },
    h('span', null, t(label)),
    h('span', { class: `mu-gbar ${v >= 65 ? 'good' : v < 35 ? 'bad' : 'mid'}`, role: 'meter', 'aria-label': t(label), 'aria-valuenow': v, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${v}%` })),
    h('b', null, String(v)));
}

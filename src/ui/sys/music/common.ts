// Peças comuns da interface do sistema "music": botão de tocar.

import { play, nowPlaying, onPlayChange, stopAll } from '../../../audio/engine';
import type { PlaySpec } from '../../../audio/spec';
import { l, type L } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { toast } from '../../common';
import { h } from '../../dom';

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


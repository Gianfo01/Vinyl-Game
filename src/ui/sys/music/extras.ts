// Rádio do jogo: toca em sequência o topo das paradas com o som da época.

import { nowPlaying, onPlayChange, play, stopAll } from '../../../audio/engine';
import { buildSongSpec } from '../../../audio/spec';
import { l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { ERA_NAMES, broadcastSound } from '../../../sim/sys/music';
import type { GameState, Song } from '../../../sim/types';
import { actLink, pill, section, toast } from '../../common';
import { h } from '../../dom';
import { ic } from '../../vis';

// ------------------------------------------------------------------ rádio do jogo

const radio = { idx: 0, on: false };

function playlist(s: GameState): { song: Song; pos: number; mine: boolean }[] {
  const out: { song: Song; pos: number; mine: boolean }[] = [];
  for (const e of s.charts.singles.slice(0, 12)) {
    const rel = s.releases[e.releaseId];
    const so = rel ? s.songs[rel.songs[0]] : undefined;
    if (so) out.push({ song: so, pos: e.pos, mine: rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand });
  }
  if (!out.length) for (const e of s.charts.albums.slice(0, 8)) {
    const rel = s.releases[e.releaseId];
    const so = rel ? s.songs[rel.songs[0]] : undefined;
    if (so) out.push({ song: so, pos: e.pos, mine: rel.owner === 'player' });
  }
  return out;
}

function radioPlay(s: GameState): void {
  const list = playlist(s);
  if (!list.length) { radio.on = false; return; }
  radio.idx = ((radio.idx % list.length) + list.length) % list.length;
  const it = list[radio.idx];
  const spec = buildSongSpec(s, it.song, { era: broadcastSound(s), seconds: 15, chorusFirst: true });
  radio.on = true;
  const hd = play(spec, { onEnd: () => { if (!radio.on) return; radio.idx += 1; radioPlay(s); } });
  if (!hd) { radio.on = false; toast(t(l('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.')), 'bad'); }
}

export function radioSection(s: GameState): HTMLElement | null {
  const list = playlist(s);
  if (!list.length) return null;
  const era = broadcastSound(s);
  const now = h('div', { class: 'mu-radio-now', 'aria-live': 'polite' });
  const paint = () => {
    const np = nowPlaying();
    const cur = radio.on && np ? list.find((x) => x.song.id === np.spec.seed) : undefined;
    now.replaceChildren(cur ? h('span', null, ic('radio'), ` #${cur.pos} `, h('b', null, cur.song.title), ' — ', actLink(s, cur.song.actId), cur.mine ? pill(t(l('seu selo', 'your label')), 'good') : null) : h('span', { class: 'muted' }, t(l('Rádio desligada.', 'Radio off.'))));
  };
  const off = onPlayChange(() => { if (!now.isConnected) { off(); return; } paint(); });
  paint();
  return section(t(l('Rádio do jogo', 'In-game radio')),
    h('p', { class: 'muted small' }, t(l('Toca em sequência o topo das paradas (suas e dos rivais), com o som do meio de transmissão da época: {e}.', 'Plays the top of the charts in sequence (yours and rivals\'), with the era\'s broadcast sound: {e}.'), { e: t(ERA_NAMES[era]) })),
    h('div', { class: 'mu-radio' },
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', 'aria-label': t(l('Anterior', 'Previous')), onclick: () => { radio.idx -= 1; radioPlay(s); } }, '⏮'),
        h('button', { class: 'btn small primary', onclick: () => { if (radio.on && nowPlaying()) { radio.on = false; stopAll(); } else radioPlay(s); paint(); } }, radio.on && nowPlaying() ? '■ ' : '▶ ', t(radio.on && nowPlaying() ? l('Desligar', 'Turn off') : l('Ligar a rádio', 'Turn the radio on'))),
        h('button', { class: 'btn small', 'aria-label': t(l('Próxima', 'Next')), onclick: () => { radio.idx += 1; radioPlay(s); } }, '⏭')),
      now,
      h('ol', { class: 'mu-playlist' }, list.map((x, i) => h('li', { class: x.mine ? 'mine' : '' }, h('button', { class: 'link', onclick: () => { radio.idx = i; radioPlay(s); } }, `#${x.pos} ${x.song.title}`), h('small', { class: 'muted' }, ` ${s.acts[x.song.actId]?.name ?? ''}`)))),
    ));
}


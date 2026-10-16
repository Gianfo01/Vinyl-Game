// R31 · onda 4 (ART2) — painel dos assets novos dos interiores (DOM). Lê o modelo puro (art31model) e traduz cada botão
// para a função do jogo que já existe: ação do lugar (doPlace27), arrematar relíquia (buyRelic), advogado (lawyer31),
// prévia de áudio (motor de som, só com o som ligado nas Opções), ficha, painel rápido ou uma tela. O motivo do bloqueio
// aparece antes do clique (lockBtn31). Abrir o painel não muda nada.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { doPlace27 } from '../../sim/sys/place27';
import { lawyer31 } from '../../sim/sys/under31';
import { buyRelic } from '../../sim/sys/relics9';
import { audioAvailable, nowPlaying, play, stopAll } from '../../audio/engine';
import { buildSongSpec } from '../../audio/spec';
import { audioOn28 } from '../audio28';
import { inspect, rerender, toast } from '../common';
import { h } from '../dom';
import { go18 } from '../sys/inbox18';
import { openFicha13 } from '../sys/persona13';
import { lockBtn31, quickBtn31, quickHook31 } from './lock31';
import { drawProps31, type G31 } from '../pixel/props31';
import { geom27 } from '../pixel/interior27';
import type { Ctx27 } from '../ps/hqpx27';
import { artPanel31, type ArtBtn31, type ArtRun31 } from './art31model';
import type { InsideM31, InsideT31 } from './inside31model';

/** Pinta os adereços novos na camada de adereços do interior (gancho `extra` do drawInterior27). */
export const paintArt31 = (m: InsideM31) => (g: Ctx27, seed: number): void => drawProps31(g, m.art, geom27(m.W) as G31, seed);

/** Motivo de não tocar (antes do clique): som desligado ou navegador sem áudio. */
export function listenLock31(): L | null {
  if (!audioAvailable()) return l('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.');
  if (!audioOn28()) return l('Som desligado: ligue em Opções › Som.', 'Sound is off: turn it on in Options › Sound.');
  return null;
}

function result(r: { ok: boolean; text: L } | L | null, ok: L): void {
  if (r && 'ok' in r) toast(t(r.text), r.ok ? 'good' : 'bad');
  else toast(t(r ?? ok), r ? 'bad' : 'good');
  rerender();
}

/** Roda a ação descrita pelo modelo (só funções que já existem no jogo). */
export function runArt31(s: GameState, x: InsideT31, r: ArtRun31, show: (panel?: string) => void, back: () => void): void {
  switch (r.k) {
    case 'place': if (x.place) result(doPlace27(s, x.place, r.act), l('Feito.', 'Done.')); return;
    case 'go': back(); go18({ area: r.area, tab: r.tab }); return;
    case 'panel': show(r.panel); return;
    case 'listen': {
      if (nowPlaying()) { stopAll(); toast(t(l('Prévia parada.', 'Preview stopped.'))); return; }
      const so = s.songs[r.song];
      if (!so) return;
      const ok = play(buildSongSpec(s, so));
      toast(ok ? `♪ ${so.title} — ${t(l('clique de novo para parar', 'click again to stop'))}` : t(l('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.')), ok ? 'info' : 'bad');
      return;
    }
    case 'relic': result(buyRelic(s, r.id), l('Arrematada: a peça foi para o seu acervo.', 'Won: the piece went to your collection.')); return;
    case 'lawyer': result(lawyer31(s, r.pid), l('Feito.', 'Done.')); return;
    case 'quick': quickHook31.open?.({ kind: 'act', id: r.act }); return;
    case 'person': inspect.person(r.pid); return;
    case 'ficha': openFicha13(r.key); return;
  }
}

const btnOf = (s: GameState, x: InsideT31, b: ArtBtn31, show: (p?: string) => void, back: () => void): HTMLElement => {
  const lock = b.run.k === 'listen' ? listenLock31() : b.lock ?? null;
  const el = lockBtn31(t(b.label), lock, () => runArt31(s, x, b.run, show, back), { cls: `btn small${b.main ? ' primary' : ''}` });
  if (b.run.k === 'quick') return h('span', { class: 'row' }, el, quickBtn31({ kind: 'act', id: b.run.act }, t(b.label)));
  return el;
};

/** Painel curto do asset dentro da cena. */
export function artPanelEl31(s: GameState, x: InsideT31, id: string, show: (p?: string) => void, back: () => void): HTMLElement | null {
  const m = artPanel31(s, x, id);
  if (!m) return null;
  return h('div', { class: 'in31-pn in31-art' },
    h('ul', { class: 'in31-lines' }, m.lines.map((y) => h('li', null, t(y)))),
    m.btns.length ? h('div', { class: 'row wrap' }, m.btns.map((b) => btnOf(s, x, b, show, back))) : null);
}

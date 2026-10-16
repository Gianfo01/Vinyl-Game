// R31 · onda 2 (V) — o PALCO das cenas de mecânica: a sala em pixel art, os bonecos (avatares reais) e um balão por
// pessoa com o gesto (humor) — que também é o ponto clicável/focável dela. A lista acessível dos pontos sai do mesmo
// elenco que desenha a cena (camada de clareza). Sem regra de jogo aqui: só desenha o modelo (scene31core).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { drawScene27, type Who27 } from '../act27/scene27';
import { h } from '../dom';
import { store } from '../store';
import type { Cast31, Mood31, SceneModel31 } from './scene31core';
import { paintRoom31, spots31 } from './scene31px';
import './mech31.css';

const W = 200, H = 92;

/** Rótulos curtos nos balões: sempre nos dois primeiros anos da partida; depois, só se a pessoa ligar. */
export const labels31 = (s: GameState): boolean => (store.prefs.sceneLabels31 ?? 'auto') === 'on' || ((store.prefs.sceneLabels31 ?? 'auto') === 'auto' && s.year - s.config.startYear < 2);
/** "Mostrar tudo que é clicável" (opção persistente). */
export const hot31 = (): boolean => !!store.prefs.sceneHot31;

export interface StageOpts31 {
  /** gesto novo de alguém (depois da decisão): id do elenco → humor */
  react?: Record<string, Mood31>;
  /** clique/Enter num ponto (pessoa) */
  onPick?: (c: Cast31) => void;
}

function bubbleText(c: Cast31, m: Mood31): string {
  const amb = m.clear ? '' : ` — ${t(l('leitura ambígua: você conhece pouco esta pessoa', 'ambiguous read: you know this person little'))}`;
  return `${c.name} · ${t(c.part ?? l('', ''))} · ${m.icon} ${t(m.label)}${amb}`;
}

/** Desenha a sala com o elenco e os balões (pontos clicáveis). */
export function stage31(s: GameState, m: SceneModel31, o: StageOpts31 = {}): HTMLElement {
  const watchers = m.cast.some((c) => c.side === 'watch');
  const spots = spots31(m.room, m.cast.map((c) => c.side));
  const cv = h('canvas', { class: 'a27-scene mc31-canvas', role: 'img', 'aria-label': t(m.title) }) as HTMLCanvasElement;
  const who: Who27[] = m.cast.map((c, i) => ({
    p: { id: c.lookId, role: c.role ?? 'producer', look: c.look, born: c.born ?? s.year - 35 },
    x: spots[i].x, y: spots[i].y, pose: spots[i].pose, dir: spots[i].dir,
  }));
  try { drawScene27(cv, paintRoom31(m.room, s.year, watchers), s.year, who); } catch { /* canvas indisponível (testes) */ }
  const showLabels = labels31(s);
  let k = 0;
  const pts = m.cast.map((c, i) => {
    const md = o.react?.[c.id] ?? c.mood;
    const sp = spots[i];
    const lift = c.side === 'them' ? (k++ % 2) * 11 : 0; // balões vizinhos em alturas alternadas (não se cobrem)
    const reacted = !!o.react?.[c.id];
    return h('button', {
      type: 'button', class: `mc31-pt tone-${md.tone} side-${c.side}${reacted ? ' mc31-react' : ''}`,
      style: `left:${(sp.x / W) * 100}%;top:${Math.max(8, ((sp.y - (sp.pose === 'sit' ? 34 : 40)) / H) * 100 - lift)}%`,
      title: bubbleText(c, md), 'aria-label': bubbleText(c, md), 'data-mc31': c.id,
      onclick: () => o.onPick?.(c),
    }, h('span', { class: 'mc31-ico', 'aria-hidden': 'true' }, md.icon), (showLabels && c.side !== 'watch') || reacted ? h('span', { class: 'mc31-lbl' }, c.side === 'you' ? t(l('Você', 'You')) : t(md.label)) : null);
  });
  return h('div', { class: `mc31-stage${hot31() ? ' mc31-hot' : ''}` }, cv, ...pts);
}

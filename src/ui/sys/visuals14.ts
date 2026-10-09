// Rodada 14 — cenas ilustradas ligadas ao estado do jogo (cabeçalhos das telas e miniaturas de eventos).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Decision, GameState } from '../../sim/types';
import { scene14, sceneOfCat14, type Scene14, type SceneView14 } from '../pixel/scenes14';

/** Último show tocado pelo jogador (público, capacidade, cidade) para desenhar a casa certa. */
export function lastGig14(s: GameState): { attendance: number; capacity: number; cityId: string } | null {
  let best: { attendance: number; capacity: number; cityId: string; day: number } | null = null;
  for (const tr of s.tours ?? []) for (const st of tr.stops ?? []) {
    if (st.status !== 'played') continue;
    if (!best || st.day > best.day) best = { attendance: st.sold, capacity: st.capacity, cityId: st.cityId, day: st.day };
  }
  return best;
}

/** Cabeçalho de casa de show: o porte e a plateia vêm do último show (ou de um bar vazio no começo). */
export function venueBanner14(s: GameState, size: SceneView14['size'] = 'banner'): HTMLElement {
  const g = lastGig14(s);
  const note = g ? t(l(`Último show: ${g.attendance} de ${g.capacity} lugares.`, `Last show: ${g.attendance} of ${g.capacity} seats.`)) : t(l('Ainda sem shows: comece pelos bares e clubes.', 'No shows yet: start with bars and clubs.'));
  return scene14('venue', { year: s.year, attendance: g?.attendance ?? 40, capacity: g?.capacity ?? 200, cityId: g?.cityId, size, note });
}

export function banner14(s: GameState, kind: Scene14, extra: Partial<SceneView14> = {}): HTMLElement {
  return scene14(kind, { year: s.year, cityId: s.config.homeCity, ...extra });
}

/** Miniatura que ilustra uma decisão (clique amplia a cena). */
export function decisionThumb14(s: GameState, d: Decision): HTMLElement {
  const k = sceneOfCat14(d.cat);
  if (k === 'venue') return venueBanner14(s, 'thumb');
  return scene14(k, { year: s.year, cityId: s.config.homeCity, size: 'thumb', variant: d.week % 2 });
}

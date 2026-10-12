// r27 — atividades jogáveis: preferência global (Opções) "Atividades: jogáveis / só importantes / sempre rápido".
// Cada mecânica tem dois modos: Rápido (o de sempre, que bots/testes/autoplay usam) e Jogável (atividade com
// decisões). O botão "Jogar" aparece ao lado da ação de sempre, a não ser em "sempre rápido".

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { h, select } from '../dom';
import { savePrefs, store } from '../store';

export type ActMode27 = 'play' | 'key' | 'quick';
export const ACT_MODES27: { value: ActMode27; label: L }[] = [
  { value: 'play', label: l('Jogáveis (oferecidas ao avançar e nas telas)', 'Playable (offered on advance and on screens)') },
  { value: 'key', label: l('Só as importantes (gravar, shows grandes, contratos)', 'Key ones only (recording, big shows, contracts)') },
  { value: 'quick', label: l('Sempre rápido (resolve sozinho)', 'Always quick (resolves on its own)') },
];

export const actMode27 = (): ActMode27 => store.prefs.activities27 ?? 'play';
(globalThis as { actMode27?: () => ActMode27 }).actMode27 = actMode27; // r27: o Submundo jogável (M3) lê daqui
/** O botão "Jogar" aparece? `key`: a atividade é das importantes (gravação, por exemplo). */
export const showPlay27 = (key = false): boolean => { const m = actMode27(); return m === 'play' || (m === 'key' && key); };

/** Linha das Opções. */
export function settings27(): HTMLElement {
  return h('label', null, t(l('Atividades', 'Activities')),
    select(actMode27(), ACT_MODES27.map((x) => ({ value: x.value, label: t(x.label) })), (v) => { store.prefs.activities27 = v; savePrefs(); }));
}

/** Gancho opcional do Agente K (cenas animadas): chama se existir, nunca depende dele. */
export function cutscene27(id: string, ctx?: Record<string, unknown>): void {
  try {
    const g = globalThis as { playCutscene27?: (id: string, ctx?: Record<string, unknown>) => unknown };
    if (!store.prefs.reducedMotion) g.playCutscene27?.(id, ctx);
  } catch { /* cena opcional */ }
}

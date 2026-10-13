// r27 — atividades jogáveis: preferência global (Opções) "Atividades: jogáveis / só importantes / sempre rápido".
// Cada mecânica tem dois modos: Rápido (o de sempre, que bots/testes/autoplay usam) e Jogável (atividade com
// decisões). r27 FLOW2: a atividade chega no fluxo (cartão no Avançar ou a própria tela da ação, com o rápido dentro);
// o padrão é "só as importantes" (quem já escolheu outra opção mantém a escolha).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { h, select } from '../dom';
import { savePrefs, store } from '../store';

export type ActMode27 = 'play' | 'key' | 'quick';
export const ACT_MODES27: { value: ActMode27; label: L }[] = [
  { value: 'play', label: l('Todas jogáveis (oferecidas ao avançar e nas telas)', 'All playable (offered on advance and on screens)') },
  { value: 'key', label: l('Só as importantes — padrão (gravação, shows grandes, contratos, crises, reunião, coletivas)', 'Key ones only — default (recording, big shows, contracts, crises, board, press conferences)') },
  { value: 'quick', label: l('Sempre rápido (resolve sozinho)', 'Always quick (resolves on its own)') },
];

/** Padrão das atividades para perfis/preferências novos (a escolha explícita da pessoa sempre vale). */
export const ACT_DEFAULT27: ActMode27 = 'key';
export const actMode27 = (): ActMode27 => store.prefs.activities27 ?? ACT_DEFAULT27;
(globalThis as { actMode27?: () => ActMode27 }).actMode27 = actMode27; // r27: o Submundo jogável (M3) lê daqui
/** O botão "Jogar" aparece? `key`: a atividade é das importantes (gravação, por exemplo). */
export const showPlay27 = (key = false): boolean => { const m = actMode27(); return m === 'play' || (m === 'key' && key); };

export const ACT_HELP27: L = l('Cada ação tem um caminho só: a atividade aparece como cartão ao Avançar (Jogar / Resolver rápido) ou na própria tela da ação, com o rápido dentro. Até 3 por mês.', 'Each action has a single path: the activity shows up as a card on Advance (Play / Resolve quickly) or on the action\'s own screen, with the quick path inside. Up to 3 a month.');

/** Linha das Opções. */
export function settings27(): HTMLElement {
  return h('label', { title: t(ACT_HELP27) }, t(l('Atividades', 'Activities')),
    select(actMode27(), ACT_MODES27.map((x) => ({ value: x.value, label: t(x.label) })), (v) => { store.prefs.activities27 = v; savePrefs(); }),
    h('small', { class: 'muted', style: 'display:block;white-space:normal;max-width:60ch' }, t(ACT_HELP27)));
}

/** Gancho opcional do Agente K (cenas animadas): chama se existir, nunca depende dele. */
export function cutscene27(id: string, ctx?: Record<string, unknown>): void {
  try {
    const g = globalThis as { playCutscene27?: (id: string, ctx?: Record<string, unknown>) => unknown };
    if (!store.prefs.reducedMotion) g.playCutscene27?.(id, ctx);
  } catch { /* cena opcional */ }
}

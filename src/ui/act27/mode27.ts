// r27 — modo das atividades: "Jogável" (abre a atividade interativa) × "Rápido" (o comportamento de sempre).
// Padrão global em Opções ("Atividades: jogáveis / só importantes / sempre rápido") e, em cada ação, um botão
// "Jogar" ao lado da ação existente. Bots, testes e autoplay nunca passam por aqui (usam a API do motor).

import { type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { h } from '../dom';
import { store } from '../store';

// r27: uma preferência só para todas as atividades (prefs27.ts: activities27 = 'play' | 'key' | 'quick')
import { actMode27 as modeOf27 } from './prefs27';
export type ActMode27 = 'play' | 'important' | 'quick';
export const actMode27 = (): ActMode27 => { const m = modeOf27(); return m === 'key' ? 'important' : m; };

/** O botão "Jogar" aparece? (`important`: esta ação conta como importante — show grande, artista disputado…) */
export const offerPlay27 = (important: boolean): boolean => { const m = actMode27(); return m === 'play' || (m === 'important' && important); };


/** Botão "Jogar" padrão (ou nada, se o modo esconde). */
export function playBtn27(label: L, onclick: () => void, important = true, title?: L): HTMLElement | null {
  if (!offerPlay27(important)) return null;
  return h('button', { class: 'btn small act27-play', title: title ? t(title) : undefined, onclick }, '▶ ', t(label));
}

/** Gancho opcional de cutscene do agente K (art27/cine). Nunca depende dele. */
export function cutscene27(id: string, ctx: Record<string, unknown>): void {
  try { (globalThis as unknown as { playCutscene27?: (id: string, ctx: unknown) => void }).playCutscene27?.(id, ctx); } catch { /* opcional */ }
}

export const reduced27 = (): boolean => !!store.prefs.reducedMotion || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
